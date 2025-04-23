use std::{
    collections::HashSet,
    fmt::Debug,
    sync::{Arc, Mutex},
};

use serde::{Deserialize, Serialize};
use tauri_plugin_store::Store;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsState {
    /// The number of players in the game
    pub players: Vec<Player>,
    /// Number of columns required to win
    win_cols: usize,
}

/// The type of player
#[derive(Default, Debug, Clone, Copy, Serialize, Deserialize)]
pub enum PlayerMode {
    #[default]
    /// A human player
    Human,
    /// A safe AI player
    /// This player will play safe and not risk any columns
    Safe,
    /// A normal AI player
    /// This player will play normally and risk columns
    /// This player will risk columns based on the current game state
    Normal,
    /// A risky AI player
    /// This player will play risky and risk columns
    /// This player will risk columns based on the current game state
    Risky,
}

/// A player in the game
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    /// The player's mode
    /// This is used to determine how the player will play
    /// The player can be a human, a safe AI, a normal AI, or a risky AI
    mode: PlayerMode,
    /// The player's ID
    id: usize,
    /// The player's name
    /// This is used to display the player's name in the UI
    name: String,
    /// The number of columns the player has won
    /// This is used to determine if the player has won
    won_cols: Vec<usize>,
}

#[derive(Default, Copy, Clone, Serialize, Deserialize)]
pub struct Column {
    /// The dice number of the column
    pub col: usize,
    /// The height of the column, which is the number of hops in the column
    pub height: usize,
    /// The current position of each player in the column
    pub hops: [usize; 4],
    /// The number of hops the current player has risked in the column
    /// This is relative to their current position in the column.
    pub risked: usize,
    /// Whether the column has been won by a player
    pub locked: Option<usize>,
}

impl Debug for Column {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let locked = match self.locked {
            Some(_) => '🔒',
            None => '🔓',
        };
        writeln!(
            f,
            "{} {}|{},{},{},{}| {}",
            self.col, locked, self.hops[0], self.hops[1], self.hops[2], self.hops[3], self.risked
        )
    }
}

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct DiceResult {
    pub dice: [usize; 4],
    pub choices: HashSet<(usize, Option<usize>)>,
}

pub type GameStateMutex = Arc<Mutex<GameState>>;

#[derive(Clone, Serialize, Deserialize)]
/// Game state information
pub struct GameState {
    pub in_progress: bool,
    pub settings: SettingsState,
    pub current_player: usize,
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
        for column in &self.columns {
            write!(f, "{:?}", column)?;
        }
        Ok(())
    }
}

impl GameState {
    /// Lock in any risked moves for the current player and
    /// set to next player, unless they were forced to end their turn.
    /// in which case, we don't lock in the risked moves.
    pub fn next_player(&mut self, forced: bool) {
        let player = self.current_player;
        for column in self.columns.as_mut() {
            if !forced {
                // player banked their risked moves, so we add them to each column.
                column.hops[player] = (column.hops[player] + column.risked).clamp(0, column.height);
            }
            column.risked = 0;
        }
        if !forced {
            self.check_completed_columns();
            self.check_is_over();
        }
        if self.winner.is_none() {
            self.current_player = (self.current_player + 1) % self.settings.players.len();
        }
    }

    /// Check if the game is over
    pub fn check_is_over(&mut self) {
        for player in &self.settings.players {
            if player.won_cols.len() >= self.settings.win_cols {
                self.winner = Some(player.clone());
            }
        }
        if let Some(winner) = self.winner.as_ref() {
            println!("Game Over! Player {} wins!", winner.name);
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
    pub fn read_from_store<R: tauri::Runtime>(&mut self, store: &Store<R>) {
        *self = serde_json::from_value(store.get("state").unwrap_or_default()).unwrap_or_default();
    }
    /// Save game state to disk
    pub fn write_to_store<R: tauri::Runtime>(&self, store: &Store<R>) -> anyhow::Result<()> {
        let state = serde_json::to_value(self.clone())?;
        store.set("state", state);
        Ok(())
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
            columns: generate_columns(),
            winner: None,
        }
    }
}

const fn generate_columns() -> [Column; 11] {
    const HEIGHTS: [usize; 11] = [3, 5, 7, 9, 11, 13, 11, 9, 7, 5, 3];
    [
        Column {
            col: 2,
            height: HEIGHTS[0],
            hops: [0; 4],
            risked: 0,
            locked: None,
        },
        Column {
            col: 3,
            height: HEIGHTS[1],
            hops: [0; 4],
            risked: 0,
            locked: None,
        },
        Column {
            col: 4,
            height: HEIGHTS[2],
            hops: [0; 4],
            risked: 0,
            locked: None,
        },
        Column {
            col: 5,
            height: HEIGHTS[3],
            hops: [0; 4],
            risked: 0,
            locked: None,
        },
        Column {
            col: 6,
            height: HEIGHTS[4],
            hops: [0; 4],
            risked: 0,
            locked: None,
        },
        Column {
            col: 7,
            height: HEIGHTS[5],
            hops: [0; 4],
            risked: 0,
            locked: None,
        },
        Column {
            col: 8,
            height: HEIGHTS[6],
            hops: [0; 4],
            risked: 0,
            locked: None,
        },
        Column {
            col: 9,
            height: HEIGHTS[7],
            hops: [0; 4],
            risked: 0,
            locked: None,
        },
        Column {
            col: 10,
            height: HEIGHTS[8],
            hops: [0; 4],
            risked: 0,
            locked: None,
        },
        Column {
            col: 11,
            height: HEIGHTS[9],
            hops: [0; 4],
            risked: 0,
            locked: None,
        },
        Column {
            col: 12,
            height: HEIGHTS[10],
            hops: [0; 4],
            risked: 0,
            locked: None,
        },
    ]
}
