use std::fmt::Debug;

use serde::{Deserialize, Serialize};

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
    pub mode: PlayerMode,
    /// The player's ID
    pub id: usize,
    /// The player's name
    /// This is used to display the player's name in the UI
    pub name: String,
    /// The number of columns the player has won
    /// This is used to determine if the player has won
    pub won_cols: Vec<usize>,
}
