use std::{collections::HashSet, fmt::Debug};

use serde::{Deserialize, Serialize};

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
}

impl Debug for Column {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(
            f,
            "{} |{},{},{},{}| {}",
            self.col, self.hops[0], self.hops[1], self.hops[2], self.hops[3], self.risked
        )
    }
}

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct DiceResult {
    pub dice: [usize; 4],
    pub choices: HashSet<(usize, Option<usize>)>,
}

pub type GameStateMutex = std::sync::Mutex<GameState>;

#[derive(Clone, Serialize, Deserialize)]
/// Game state information
pub struct GameState {
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
    /// set to next player
    pub fn next_player(&mut self) {
        let player = self.current_player;
        for column in self.columns.as_mut() {
            column.hops[player] = (column.hops[player] + column.risked).clamp(0, column.height);
        }
        self.current_player = (self.current_player + 1) % self.settings.players.len();
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
}

impl Default for GameState {
    fn default() -> Self {
        Self {
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
        },
        Column {
            col: 3,
            height: HEIGHTS[1],
            hops: [0; 4],
            risked: 0,
        },
        Column {
            col: 4,
            height: HEIGHTS[2],
            hops: [0; 4],
            risked: 0,
        },
        Column {
            col: 5,
            height: HEIGHTS[3],
            hops: [0; 4],
            risked: 0,
        },
        Column {
            col: 6,
            height: HEIGHTS[4],
            hops: [0; 4],
            risked: 0,
        },
        Column {
            col: 7,
            height: HEIGHTS[5],
            hops: [0; 4],
            risked: 0,
        },
        Column {
            col: 8,
            height: HEIGHTS[6],
            hops: [0; 4],
            risked: 0,
        },
        Column {
            col: 9,
            height: HEIGHTS[7],
            hops: [0; 4],
            risked: 0,
        },
        Column {
            col: 10,
            height: HEIGHTS[8],
            hops: [0; 4],
            risked: 0,
        },
        Column {
            col: 11,
            height: HEIGHTS[9],
            hops: [0; 4],
            risked: 0,
        },
        Column {
            col: 12,
            height: HEIGHTS[10],
            hops: [0; 4],
            risked: 0,
        },
    ]
}
