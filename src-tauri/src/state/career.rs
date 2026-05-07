use std::{
    collections::{HashMap, HashSet},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tauri_plugin_store::Store;

use super::{
    ColumnID, GameState,
    player::{Player, PlayerMode},
    stats::{History, StatsSummary},
};
use crate::state::calculate_croak_chance;

pub type CareerStatsMutex = Mutex<CareerStats>;

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct CareerStats {
    pub games_played: usize,
    pub human_games_played: usize,
    pub total_croaks: usize,
    pub total_banks: usize,
    pub longest_successful_run: usize,
    pub columns_won_most_often: HashMap<ColumnID, usize>,
    pub player_totals: Vec<PlayerCareerStats>,
    pub achievements: Vec<AchievementRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerCareerStats {
    pub player_name: String,
    pub games_played: usize,
    pub wins: usize,
    pub croaks: usize,
    pub banks: usize,
    pub longest_successful_run: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AchievementRecord {
    pub kind: AchievementKind,
    pub title: String,
    pub message: String,
    pub player_name: String,
    pub achieved_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AchievementKind {
    ThreeHopHero,
    StillStanding,
    NoSplash,
    LeapOfFaith,
    CloseCall,
    ColumnToppedMilestone,
    FirstUp2,
    FirstUp3,
    FirstUp4,
    FirstUp5,
    FirstUp6,
    FirstUp7,
    FirstUp8,
    FirstUp9,
    FirstUp10,
    FirstUp11,
    FirstUp12,
    Shutout,
    SnatchedAtTheTop,
    Bookends,
    AgainstTheOdds,
    CenterPerch,
    HighWireWin,
    FiveHopFlex,
    SevenHopShowoff,
    PerfectLanding,
    ComebackCroaker,
    Bankroll,
    TripleCrown,
}

const COLUMN_TOP_MILESTONES: [usize; 7] = [10, 25, 50, 100, 250, 500, 1000];

impl CareerStats {
    pub fn update_from_store<R: tauri::Runtime>(&mut self, store: &Store<R>) {
        if let Some(career_stats) = store.get("career_stats") {
            *self = serde_json::from_value(career_stats).unwrap_or_default();
        } else {
            *self = Self::default();
        }
    }

    pub fn write_to_store<R: tauri::Runtime>(&self, store: &Store<R>) -> anyhow::Result<()> {
        let career_stats = serde_json::to_value(self.clone())?;
        store.set("career_stats", career_stats);
        Ok(())
    }

    pub fn reset_achievements(&mut self) {
        self.achievements.clear();
    }

    pub fn record_completed_game(
        &mut self,
        game_state: &GameState,
        history: &History,
    ) -> Vec<AchievementRecord> {
        let summary = history.calculate_summary();
        let achieved_at_ms = now_ms();
        self.record_completed_game_at(game_state, history, &summary, achieved_at_ms)
    }

    fn record_completed_game_at(
        &mut self,
        game_state: &GameState,
        history: &History,
        summary: &StatsSummary,
        achieved_at_ms: u64,
    ) -> Vec<AchievementRecord> {
        self.games_played += 1;

        let human_players: HashSet<usize> = game_state
            .settings
            .players
            .iter()
            .enumerate()
            .filter_map(|(index, player)| player.is_human().then_some(index))
            .collect();

        if !human_players.is_empty() {
            self.human_games_played += 1;
        }

        let winner_id = game_state.winner.as_ref().map(|player| player.id);
        let mut new_achievements = Vec::new();
        let previous_column_wins = self.columns_won_most_often.clone();

        for (index, player) in game_state.settings.players.iter().enumerate() {
            if !human_players.contains(&index) {
                continue;
            }

            let Some(player_stats) = summary.player_stats.get(index) else {
                continue;
            };

            let did_win = winner_id == Some(player.id);
            self.total_croaks += player_stats.croaked;
            self.total_banks += player_stats.banked;
            self.longest_successful_run = self.longest_successful_run.max(player_stats.longest_run);

            for column in &player.won_cols {
                *self.columns_won_most_often.entry(*column).or_insert(0) += 1;
            }

            let player_total = self.player_total_mut(&player.name);
            player_total.games_played += 1;
            player_total.croaks += player_stats.croaked;
            player_total.banks += player_stats.banked;
            player_total.longest_successful_run = player_total
                .longest_successful_run
                .max(player_stats.longest_run);
            if did_win {
                player_total.wins += 1;
            }

            new_achievements.extend(achievements_for_player(
                player,
                index,
                did_win,
                player_stats,
                game_state,
                history,
                summary,
                &previous_column_wins,
                achieved_at_ms,
            ));
        }

        self.achievements.extend(new_achievements.clone());
        new_achievements
    }

    fn player_total_mut(&mut self, player_name: &str) -> &mut PlayerCareerStats {
        if let Some(index) = self
            .player_totals
            .iter()
            .position(|total| total.player_name == player_name)
        {
            return &mut self.player_totals[index];
        }

        self.player_totals.push(PlayerCareerStats {
            player_name: player_name.to_string(),
            games_played: 0,
            wins: 0,
            croaks: 0,
            banks: 0,
            longest_successful_run: 0,
        });
        self.player_totals
            .last_mut()
            .expect("player total was just added")
    }
}

impl Player {
    fn is_human(&self) -> bool {
        self.mode == PlayerMode::Human
    }
}

fn achievements_for_player(
    player: &Player,
    index: usize,
    did_win: bool,
    player_stats: &super::player::PlayerStats,
    game_state: &GameState,
    history: &History,
    summary: &StatsSummary,
    previous_column_wins: &HashMap<ColumnID, usize>,
    achieved_at_ms: u64,
) -> Vec<AchievementRecord> {
    let mut records = Vec::new();
    let risk = risk_profile(history, index);
    let name = &player.name;

    if player_stats.longest_run >= 6 {
        records.push(record(
            AchievementKind::ThreeHopHero,
            "Six-Hop Hero",
            format!(
                "{name} banked a run of {} hops. Bold, tidy, slightly alarming.",
                player_stats.longest_run
            ),
            name,
            achieved_at_ms,
        ));
    }

    if risk.survived_very_high_risk {
        records.push(record(
            AchievementKind::StillStanding,
            "Still Standing",
            format!("{name} survived a very scary roll and made the pond blink first."),
            name,
            achieved_at_ms,
        ));
    }

    if did_win && player_stats.croaked == 0 && player_stats.total_rolls >= 12 {
        records.push(record(
            AchievementKind::NoSplash,
            "No Splash",
            format!("{name} won a long game without croaking once. Clean feet, loud scoreboard."),
            name,
            achieved_at_ms,
        ));
    }

    if did_win && player_stats.croaked == 0 && player_stats.total_rolls >= 18 {
        records.push(record(
            AchievementKind::PerfectLanding,
            "Perfect Landing",
            format!("{name} won a marathon without a single croak. Suspiciously dry."),
            name,
            achieved_at_ms,
        ));
    }

    if did_win && risk.average_risk >= 0.38 {
        records.push(record(
            AchievementKind::LeapOfFaith,
            "Leap of Faith",
            format!("{name} won while flirting with danger. Brave, or just poorly supervised."),
            name,
            achieved_at_ms,
        ));
    }

    if did_win && risk.average_risk >= 0.45 {
        records.push(record(
            AchievementKind::HighWireWin,
            "High-Wire Win",
            format!("{name} won with danger under every footstep. Absolutely not a recommended lifestyle."),
            name,
            achieved_at_ms,
        ));
    }

    if !did_win && player_stats.luck >= 0.15 && player_stats.total_rolls >= 10 {
        records.push(record(
            AchievementKind::CloseCall,
            "Close Call",
            format!("{name} lost despite friendly rolls. The dice offered a hand; the columns had other plans."),
            name,
            achieved_at_ms,
        ));
    }

    if did_win
        && player_stats.luck <= -0.1
        && summary
            .player_stats
            .iter()
            .enumerate()
            .any(|(other_index, stats)| other_index != index && stats.luck >= 0.1)
    {
        records.push(record(
            AchievementKind::AgainstTheOdds,
            "Against the Odds",
            format!("{name} won with unlucky rolls while an opponent got the friendly dice. Petty? No. Historic."),
            name,
            achieved_at_ms,
        ));
    }

    if did_win
        && player_stats.total_rolls >= 10
        && game_state
            .settings
            .players
            .iter()
            .enumerate()
            .all(|(other_index, other)| other_index == index || other.won_cols.is_empty())
    {
        records.push(record(
            AchievementKind::Shutout,
            "Clean Sweep",
            format!("{name} won before any opponent scored a column. Rude, efficient, memorable."),
            name,
            achieved_at_ms,
        ));
    }

    if did_win && player_stats.croaked >= 4 {
        records.push(record(
            AchievementKind::ComebackCroaker,
            "Comeback Croaker",
            format!(
                "{name} croaked {} times and still won. Apparently consequences were optional.",
                player_stats.croaked
            ),
            name,
            achieved_at_ms,
        ));
    }

    if player_stats.banked >= 8 {
        records.push(record(
            AchievementKind::Bankroll,
            "Bankroll",
            format!(
                "{name} banked {} runs. Sensible behavior, somehow exciting.",
                player_stats.banked
            ),
            name,
            achieved_at_ms,
        ));
    }

    if did_win && player.won_cols.len() >= 4 {
        records.push(record(
            AchievementKind::TripleCrown,
            "Four-Column Finish",
            format!("{name} sealed four columns in one game. The board had paperwork to file."),
            name,
            achieved_at_ms,
        ));
    }

    if player_stats.longest_run >= 8 {
        records.push(record(
            AchievementKind::FiveHopFlex,
            "Eight-Hop Flex",
            format!(
                "{name} banked a {} hop run. Elegant. Unnecessary. Excellent.",
                player_stats.longest_run
            ),
            name,
            achieved_at_ms,
        ));
    }

    if player_stats.longest_run >= 10 {
        records.push(record(
            AchievementKind::SevenHopShowoff,
            "Ten-Hop Showoff",
            format!(
                "{name} banked a {} hop run. At that point it becomes performance art.",
                player_stats.longest_run
            ),
            name,
            achieved_at_ms,
        ));
    }

    if did_win && player.won_cols.contains(&7) && player_stats.luck <= -0.08 {
        records.push(record(
            AchievementKind::CenterPerch,
            "Center Perch",
            format!("{name} claimed column 7 while the dice were being difficult."),
            name,
            achieved_at_ms,
        ));
    }

    if player.won_cols.contains(&2) && player.won_cols.contains(&12) {
        records.push(record(
            AchievementKind::Bookends,
            "Bookends",
            format!("{name} grabbed both 2 and 12 in one game. Tiny columns, maximum drama."),
            name,
            achieved_at_ms,
        ));
    }

    records.extend(column_milestone_achievements(
        player,
        previous_column_wins,
        game_state,
        achieved_at_ms,
    ));

    if beat_opponent_one_away(game_state, index) {
        records.push(record(
            AchievementKind::SnatchedAtTheTop,
            "Snatched at the Top",
            format!("{name} won a column while an opponent was one hop away. Courteous? No. Legal? Painfully."),
            name,
            achieved_at_ms,
        ));
    }

    records
}

fn column_milestone_achievements(
    player: &Player,
    previous_column_wins: &HashMap<ColumnID, usize>,
    game_state: &GameState,
    achieved_at_ms: u64,
) -> Vec<AchievementRecord> {
    let mut records = Vec::new();

    for column in &player.won_cols {
        let previous = previous_column_wins.get(column).copied().unwrap_or(0);
        let current = game_state
            .settings
            .players
            .iter()
            .filter(|player| player.mode == PlayerMode::Human)
            .flat_map(|player| player.won_cols.iter())
            .filter(|won_column| *won_column == column)
            .count()
            + previous;

        for milestone in COLUMN_TOP_MILESTONES {
            if previous < milestone && current >= milestone {
                records.push(record(
                    AchievementKind::ColumnToppedMilestone,
                    &format!("Column {column}: {milestone} Tops"),
                    format!(
                        "{} pushed the device-wide column {column} total to {milestone}. Persistence, but with hops.",
                        player.name
                    ),
                    &player.name,
                    achieved_at_ms,
                ));
            }
        }
    }

    records
}

fn beat_opponent_one_away(game_state: &GameState, player_index: usize) -> bool {
    game_state.columns.iter().any(|column| {
        column.locked == Some(player_index)
            && column.hops.iter().enumerate().any(|(other_index, hops)| {
                other_index != player_index && *hops + 1 == column.height
            })
    })
}

fn record(
    kind: AchievementKind,
    title: &str,
    message: String,
    player_name: &str,
    achieved_at_ms: u64,
) -> AchievementRecord {
    AchievementRecord {
        kind,
        title: title.to_string(),
        message,
        player_name: player_name.to_string(),
        achieved_at_ms,
    }
}

#[derive(Default)]
struct RiskProfile {
    average_risk: f64,
    survived_very_high_risk: bool,
}

fn risk_profile(history: &History, player_index: usize) -> RiskProfile {
    let Some(player_history) = history.players.get(player_index) else {
        return RiskProfile::default();
    };

    let mut total_risk = 0.0;
    let mut total_turns = 0;
    let mut survived_very_high_risk = false;

    for run in &player_history.0 {
        for turn in &run.turns {
            let risk = calculate_croak_chance(&turn.active_cols, &run.inactive_cols);
            total_risk += risk;
            total_turns += 1;
            if risk >= 0.5 && turn.outcome != super::player::RunOutcome::Croaked {
                survived_very_high_risk = true;
            }
        }
    }

    RiskProfile {
        average_risk: if total_turns == 0 {
            0.0
        } else {
            total_risk / total_turns as f64
        },
        survived_very_high_risk,
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::{
        SettingsState,
        player::{Player, PlayerMode, RunOutcome},
    };

    fn player(id: usize, name: &str, mode: PlayerMode) -> Player {
        Player {
            mode,
            id,
            name: name.to_string(),
            won_cols: vec![],
        }
    }

    fn game_state(players: Vec<Player>, winner: Option<Player>) -> GameState {
        let mut game_state = GameState::default();
        game_state.settings = SettingsState {
            players,
            win_cols: 3,
        };
        game_state.winner = winner;
        game_state
    }

    fn dice_result() -> crate::state::DiceResult {
        crate::state::DiceResult {
            dice: [1, 1, 1, 1],
            choices: HashSet::new(),
        }
    }

    #[test]
    fn records_only_human_achievements_and_totals() {
        let human = player(0, "Ada", PlayerMode::Human);
        let bot = player(1, "Bot", PlayerMode::Risky);
        let mut game_state = game_state(vec![human.clone(), bot.clone()], Some(human.clone()));
        game_state.settings.players[0].won_cols = vec![2, 5, 7];
        game_state.settings.players[1].won_cols = vec![3, 4, 6];

        let mut history = History::default();
        history.new_game(2).unwrap();
        history
            .player_mut()
            .record_roll(&dice_result(), &HashSet::new());
        history.player_mut().record_choice(0, None);
        history
            .player_mut()
            .record_roll(&dice_result(), &HashSet::new());
        history.player_mut().record_choice(1, None);
        history
            .player_mut()
            .record_roll(&dice_result(), &HashSet::new());
        history.player_mut().record_choice(2, None);
        history.next_player(RunOutcome::Banked, HashSet::new());
        history
            .player_mut()
            .record_roll(&dice_result(), &HashSet::new());
        history.next_player(RunOutcome::Croaked, HashSet::new());

        let summary = history.calculate_summary();
        let mut career = CareerStats::default();
        let achievements =
            career.record_completed_game_at(&game_state, &history, &summary, 1_700_000_000_000);

        assert_eq!(career.games_played, 1);
        assert_eq!(career.human_games_played, 1);
        assert_eq!(career.total_banks, 1);
        assert_eq!(career.total_croaks, 0);
        assert_eq!(career.player_totals.len(), 1);
        assert_eq!(career.player_totals[0].player_name, "Ada");
        assert!(
            achievements
                .iter()
                .all(|record| record.player_name == "Ada")
        );
        assert!(achievements.is_empty());
    }
}
