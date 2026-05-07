use crate::state::{columns::HEIGHTS, logic::calculate_croak_chance};

use super::{
    ColumnID, DiceResult, PlayerID,
    player::{PlayerRun, PlayerStats, RunOutcome},
};
use anyhow::anyhow;
use core::panic;
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    fmt::Display,
    sync::Mutex,
};
use tauri_plugin_store::Store;

pub type HistoryMutex = Mutex<History>;

/// A player's total runs (gos) for this game. A 'run' is made up of multiple 'turns'
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct PlayerHistory(pub(crate) Vec<PlayerRun>);

impl PlayerHistory {
    /// Register the start of a new turn for this player.
    pub fn record_start_run(&mut self, inactive_cols: HashSet<ColumnID>) {
        self.0.push(PlayerRun::start(inactive_cols));
    }
    /// Get a reference to the current players' active run.
    fn run_mut(&mut self) -> &mut PlayerRun {
        let Some(run) = self.0.last_mut() else {
            panic!("There should be at least one run started. Check start/end run logic.");
        };
        run
    }
    /// Record the dice roll and options for the active player's latest turn.
    /// This includes starting a new turn as this is the first thing a player does each turn.
    pub fn record_roll(&mut self, dice: &DiceResult, active_cols: &HashSet<ColumnID>) {
        let run = self.run_mut();
        run.start_turn(dice.to_owned(), active_cols.to_owned());
    }
    /// Record the choice from the dice roll and options for the active player's latest turn.
    pub fn record_choice(&mut self, first: ColumnID, second: Option<ColumnID>) {
        self.run_mut().turn_mut().chosen = Some((first, second));
    }
    /// Record the outcome of this run when it ends for any reason.
    fn record_end_run(&mut self, outcome: RunOutcome) {
        self.run_mut().outcome = outcome;
        self.run_mut().turn_mut().outcome = outcome;
    }
}

/// Tracks history for all players in the current game.
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct History {
    /// Vector of players participating in this game
    pub players: Vec<PlayerHistory>,
    /// index of current player
    pub current_player: PlayerID,
}

impl History {
    /// Reset game history.
    pub fn clear(&mut self) {
        *self = Default::default();
    }
    /// Resets the history for all players and sets up run 1 for first player.
    pub fn new_game(&mut self, num_players: usize) -> anyhow::Result<()> {
        if num_players <= 1 {
            return Err(anyhow!("Number of players must be greater than 1"));
        }
        if num_players > 4 {
            return Err(anyhow!("Number of players must be less than or equal to 4"));
        }
        self.players = vec![PlayerHistory::default(); num_players];
        self.current_player = 0;
        // Start the first player's turn in history
        let player = self.player_mut();
        player.record_start_run(HashSet::new());
        Ok(())
    }

    /// Gets a mutable reference to the history of the specified player.
    pub fn player_mut(&mut self) -> &mut PlayerHistory {
        self.players
            .get_mut(self.current_player)
            .expect("current player should always exist.")
    }

    /// Record the turn outcome and update the current player
    pub fn next_player(&mut self, outcome: RunOutcome, inactive_cols: HashSet<ColumnID>) {
        self.player_mut().record_end_run(outcome);
        self.current_player = (self.current_player + 1) % self.players.len();
        self.player_mut().record_start_run(inactive_cols);
    }

    /// Update game history from disk
    pub fn update_from_store<R: tauri::Runtime>(&mut self, store: &Store<R>) {
        if let Some(history) = store.get("history") {
            *self = serde_json::from_value(history).unwrap_or_default();
        } else {
            println!("'history' missing from store");
            *self = Self::default();
        }
    }
    /// Save game history to disk
    pub fn write_to_store<R: tauri::Runtime>(&self, store: &Store<R>) -> anyhow::Result<()> {
        let history = serde_json::to_value(self.clone())?;
        store.set("history", history);
        Ok(())
    }

    /// Calculates and returns the end-of-game statistics summary.
    pub fn calculate_summary(&self) -> StatsSummary {
        println!("Calculating summary...");
        let mut col_activity: HashMap<ColumnID, usize> = HashMap::new(); // most active column
        let mut total_turns = 0;
        let player_stats: Vec<PlayerStats> = self
            .players
            .iter()
            .map(|player: &PlayerHistory| {
                let mut longest_run = 0;
                let mut croaked = 0;
                let mut banked = 0;
                let mut luck = 0.0;
                let mut player_rolls = 0;
                player.0.iter().for_each(|run| {
                    let run_luck: f64 = run
                        .turns
                        .iter()
                        .map(|turn| {
                            total_turns += 1;
                            player_rolls += 1;
                            match turn.chosen {
                                Some((first, Some(second))) => {
                                    *col_activity.entry(first).or_insert(0) += 1;
                                    *col_activity.entry(second).or_insert(0) += 1;
                                }
                                Some((first, None)) => {
                                    *col_activity.entry(first).or_insert(0) += 1;
                                }
                                None => (),
                            }
                            let p_croak =
                                calculate_croak_chance(&turn.active_cols, &run.inactive_cols);
                            p_croak
                                - if turn.outcome == RunOutcome::Croaked {
                                    1.0 // negative luck if croaked
                                } else {
                                    0.0 // positive luck if not bust
                                }
                        })
                        .sum();
                    luck += run_luck;
                    match run.outcome {
                        RunOutcome::InProgress => (),
                        RunOutcome::Croaked => croaked += 1,
                        RunOutcome::Banked => {
                            banked += 1;
                            longest_run = longest_run.max(run.turns.len());
                        }
                    }
                });
                PlayerStats {
                    longest_run,
                    croaked,
                    banked,
                    total_rolls: player_rolls,
                    luck: if player_rolls == 0 {
                        0.0
                    } else {
                        luck / player_rolls as f64
                    },
                }
            })
            .collect();
        println!("col activity: {:?}", col_activity);
        let mut most_contested_columm: (ColumnID, f32) = (0, 0.0);
        col_activity.iter().for_each(|(col, count)| {
            let normalized_count = *count as f32 / HEIGHTS[*col] as f32;
            if normalized_count > most_contested_columm.1 {
                most_contested_columm = (*col, normalized_count);
            }
        });
        println!("most contested column: {:?}", most_contested_columm);
        StatsSummary {
            player_stats,
            most_contested_column: if most_contested_columm.1 == 0.0 {
                0
            } else {
                most_contested_columm.0 + 2
            },
            total_turns,
        }
    }
}

impl Display for History {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let mut run = 0;
        writeln!(f, "run {}", run + 1)?;
        'outer: loop {
            // iterate through each run until we hit the end.
            for player in &self.players {
                let Some(player_run) = player.0.get(run) else {
                    break 'outer;
                };
                writeln!(f, "{}", player_run)?;
                if player_run.outcome == RunOutcome::InProgress {
                    break 'outer;
                }
            }
            run += 1;
            writeln!(f, "----------")?;
            writeln!(f, "run {}", run + 1)?;
        }
        Ok(())
    }
}

/// End game statistics for a specific player
///
/// Holds the calculated statistics for a completed game.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatsSummary {
    /// Stats of individual players
    pub player_stats: Vec<PlayerStats>,
    /// Column that had the most total hops, normalized for column height
    pub most_contested_column: ColumnID,
    pub total_turns: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dice_result() -> DiceResult {
        DiceResult {
            dice: [1, 1, 1, 1],
            choices: HashSet::new(),
        }
    }

    fn columns(values: &[ColumnID]) -> HashSet<ColumnID> {
        values.iter().copied().collect()
    }

    fn assert_approx_eq(left: f64, right: f64) {
        let diff = (left - right).abs();
        assert!(
            diff < 1e-8,
            "expected {left:?} to approximately equal {right:?}; diff was {diff:?}"
        );
    }

    #[test]
    fn summary_averages_luck_per_player() {
        let mut history = History::default();
        history.new_game(2).unwrap();

        history
            .player_mut()
            .record_roll(&dice_result(), &HashSet::new());
        history.player_mut().record_choice(5, None);

        let player_one_active = columns(&[6, 7, 8]);
        history
            .player_mut()
            .record_roll(&dice_result(), &player_one_active);
        history.player_mut().record_choice(5, Some(6));
        history.next_player(RunOutcome::Banked, HashSet::new());

        history
            .player_mut()
            .record_roll(&dice_result(), &HashSet::new());

        let player_two_active = columns(&[2, 3, 12]);
        history
            .player_mut()
            .record_roll(&dice_result(), &player_two_active);
        history.next_player(RunOutcome::Croaked, HashSet::new());

        let summary = history.calculate_summary();
        let player_one_chance = calculate_croak_chance(&player_one_active, &HashSet::new());
        let player_two_chance = calculate_croak_chance(&player_two_active, &HashSet::new());

        assert_eq!(summary.total_turns, 4);
        assert_eq!(summary.player_stats[0].total_rolls, 2);
        assert_eq!(summary.player_stats[1].total_rolls, 2);
        assert_approx_eq(summary.player_stats[0].luck, player_one_chance / 2.0);
        assert_approx_eq(
            summary.player_stats[1].luck,
            (player_two_chance - 1.0) / 2.0,
        );
    }

    #[test]
    fn summary_returns_display_column_not_backend_index() {
        let mut history = History::default();
        history.new_game(2).unwrap();

        history
            .player_mut()
            .record_roll(&dice_result(), &HashSet::new());
        history.player_mut().record_choice(5, None);
        history
            .player_mut()
            .record_roll(&dice_result(), &columns(&[7]));
        history.player_mut().record_choice(5, Some(6));
        history.next_player(RunOutcome::Banked, HashSet::new());

        let summary = history.calculate_summary();

        assert_eq!(summary.most_contested_column, 7);
    }
}
