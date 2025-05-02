use super::{
    player::{PlayerRun, RunOutcome},
    DiceResult,
};
use anyhow::anyhow;
use core::panic;
use serde::{Deserialize, Serialize};
use std::{collections::HashSet, fmt::Display, sync::Mutex};
use tauri_plugin_store::Store;

pub type HistoryMutex = Mutex<History>;

/// A player's total runs (gos) for this game. A 'run' is made up of multiple 'turns'
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct PlayerHistory(Vec<PlayerRun>);

impl PlayerHistory {
    /// Register the start of a new turn for this player.
    pub fn record_start_run(&mut self, inactive_cols: HashSet<usize>) {
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
    pub fn record_roll(&mut self, dice: &DiceResult) {
        self.run_mut().start_turn(dice.to_owned());
    }
    /// Record the choice from the dice roll and options for the active player's latest turn.
    pub fn record_choice(&mut self, first: usize, second: Option<usize>) {
        self.run_mut().turn_mut().chosen = Some((first, second));
    }
    /// Record the outcome of this run when it ends for any reason.
    fn record_end_run(&mut self, outcome: RunOutcome) {
        self.run_mut().outcome = outcome;
    }
}

/// Tracks history for all players in the current game.
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct History {
    /// Vector of players participating in this game
    pub players: Vec<PlayerHistory>,
    /// index of current player
    pub current_player: usize,
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
        if num_players >= 4 {
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
    pub fn next_player(&mut self, outcome: RunOutcome, inactive_cols: HashSet<usize>) {
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
        dbg!(self);
        StatsSummary { longest_run: 123 }
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

/// Holds the calculated statistics for a completed game.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatsSummary {
    pub longest_run: usize,
    // Add other stats fields like:
    // pub most_busts_player_id: Option<usize>,
    // pub luckiest_player_id: Option<usize>, // Define "luck" metric
    // pub total_turns: usize,
}
