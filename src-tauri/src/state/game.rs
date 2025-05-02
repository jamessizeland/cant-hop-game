use std::{collections::HashSet, fmt::Debug, sync::Mutex};

use serde::{Deserialize, Serialize};
use tauri_plugin_store::Store;

use super::{
    columns::{generate_columns, Column},
    player::{Player, PlayerMode, RunOutcome},
    SettingsState,
};

pub type GameStateMutex = Mutex<GameState>;

#[derive(Clone, Serialize, Deserialize)]
/// Game state information used to update the Frontend.
pub struct GameState {
    pub in_progress: bool,
    pub settings: SettingsState,
    pub current_player: usize,
    /// Hops made in current run by current player
    pub hops: usize,
    /// Columns selected in the current hop sequence (indices into `columns`)
    pub columns: [Column; 11],
    pub winner: Option<Player>,
}

impl Debug for GameState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "Settings: {:?}", self.settings)?;
        writeln!(f, "Winner: {:?}", self.winner)?;
        writeln!(
            f,
            "Current Player: {} | {}",
            self.current_player, self.settings.players[self.current_player].name
        )?;
        writeln!(
            f,
            "Game In Progress? {:?}",
            if self.in_progress { "yes" } else { "no" }
        )?;
        for column in &self.columns {
            write!(f, "{:?}", column)?;
        }
        Ok(())
    }
}

impl GameState {
    /// Reset the gamestate. But keep the settings to allow rematches.
    pub fn clear(&mut self) {
        *self = Self {
            in_progress: false,
            settings: self.settings.to_owned(),
            current_player: 0,
            hops: 0,
            columns: generate_columns(),
            winner: None,
        }
    }
    /// Lock in any risked moves for the current player and
    /// set to next player, unless they were forced to end their turn.
    /// in which case, we don't lock in the risked moves.
    pub fn next_player(&mut self, outcome: RunOutcome) {
        let player = self.current_player;

        for column in self.columns.as_mut() {
            if outcome == RunOutcome::Banked {
                // Add banked hops to each column. Clamp to bounds of the column.
                let new_position = (column.hops[player] + column.risked).clamp(0, column.height);
                column.hops[player] = new_position;
            }
            column.risked = 0;
        }
        if outcome == RunOutcome::Banked {
            // check for win conditions
            self.check_completed_columns();
            if self.is_over() {
                return; // someone has won!
            }
        }
        self.hops = 0;
        self.current_player = (self.current_player + 1) % self.settings.players.len();
    }
    /// Return a list of the selected columns this run.
    pub fn get_selected(&self) -> HashSet<usize> {
        self.columns
            .iter()
            .filter(|col| col.risked != 0)
            .map(|col| col.col)
            .collect()
    }
    /// Return a list of the columns that have been won and are therefore
    /// no longer accessible.
    pub fn get_unavailable(&self) -> HashSet<usize> {
        self.columns
            .iter()
            .filter(|col| col.locked.is_some())
            .map(|col| col.col)
            .collect()
    }
    /// Check if the game is over
    pub fn is_over(&mut self) -> bool {
        for player in &self.settings.players {
            if player.won_cols.len() >= self.settings.win_cols {
                self.winner = Some(player.clone());
            }
        }
        match self.winner.as_ref() {
            Some(winner) => {
                println!("Game Over! Player {} wins!", winner.name);
                true
            }
            None => false,
        }
    }
    /// Check if a player is sat at the top of an unlocked column.
    /// If so they win the column and it is locked.
    /// Add it to their won columns.
    pub fn check_completed_columns(&mut self) {
        for column in self.columns.iter_mut() {
            if column.hops[self.current_player] >= column.height && column.locked.is_none() {
                column.locked = Some(self.current_player);
                self.settings.players[self.current_player]
                    .won_cols
                    .push(column.col);
            }
        }
    }
    /// Update game state from disk
    pub fn update_from_store<R: tauri::Runtime>(&mut self, store: &Store<R>) {
        if let Some(state) = store.get("state") {
            *self = serde_json::from_value(state).unwrap_or_default();
        } else {
            println!("'state' missing from store");
            *self = Self::default();
        }
    }
    /// Save game state to disk
    pub fn write_to_store<R: tauri::Runtime>(&self, store: &Store<R>) -> anyhow::Result<()> {
        let state = serde_json::to_value(self.clone())?;
        store.set("state", state);
        Ok(())
    }
    /// Set up a new game state
    pub fn new_game(&mut self, settings: SettingsState) {
        *self = Self::default();
        self.settings = settings;
        self.in_progress = true;
    }
}

impl Default for GameState {
    fn default() -> Self {
        Self {
            in_progress: false,
            settings: SettingsState {
                players: vec![
                    Player {
                        mode: PlayerMode::Human,
                        id: 0,
                        name: "Player 1".to_string(),
                        won_cols: vec![],
                    },
                    Player {
                        mode: PlayerMode::Human,
                        id: 1,
                        name: "Player 2".to_string(),
                        won_cols: vec![],
                    },
                ],
                win_cols: 3,
            },
            current_player: 0,
            hops: 0,
            columns: generate_columns(),
            winner: None,
        }
    }
}
