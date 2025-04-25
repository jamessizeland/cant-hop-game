mod columns;
mod game;
mod player;

pub use game::{GameState, GameStateMutex};
use player::Player;
use serde::{Deserialize, Serialize};
use std::{collections::HashSet, fmt::Debug};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsState {
    /// The number of players in the game
    pub players: Vec<Player>,
    /// Number of columns required to win
    win_cols: usize,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct DiceResult {
    pub dice: [usize; 4],
    pub choices: HashSet<(usize, Option<usize>)>,
}
