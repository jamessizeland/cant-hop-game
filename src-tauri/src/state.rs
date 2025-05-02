// mod ai;
mod columns;
mod game;
mod logic;
mod player;
mod stats;

pub use game::{GameState, GameStateMutex};
pub use logic::evaluate_moves;
use player::Player;
use serde::{Deserialize, Serialize};
pub use stats::{HistoryMutex, StatsSummary};
use std::{collections::HashSet, fmt::Debug};

#[derive(Default)]
pub struct AppContext {
    pub game: GameStateMutex,
    pub hist: HistoryMutex,
}

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
