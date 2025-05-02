use std::{collections::HashSet, fmt::Debug};

use serde::{Deserialize, Serialize};

use super::DiceResult;

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

/// Represents the outcome of a player's run.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum RunOutcome {
    /// Player ran out of options and went bust.
    Croaked,
    /// Player chose to stop voluntarily.
    Banked,
}

impl From<bool> for RunOutcome {
    fn from(value: bool) -> Self {
        if value {
            RunOutcome::Croaked
        } else {
            RunOutcome::Banked
        }
    }
}

/// A player has multiple turns in a run
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PlayerTurn {
    /// Columns chosen this turn.
    pub chosen: Option<(usize, Option<usize>)>,
    /// Dice-rolls this turn, if they chose to hop.
    pub options: DiceResult,
}

#[derive(Hash, Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct HopSelection {
    /// How many hops we've made this turn in this column.
    pub distance: usize,
    /// starting position in this column this turn.
    pub start: usize,
}

/// Track of a player's options and decisions.
/// Each turn a player gets to decide to hop or stop
/// They then see the dice result and decide what to select.
/// Each run is made up of multiple turns, until the player
/// chooses to Bank or is Croaked.
#[derive(Clone, Default, Debug, Serialize, Deserialize)]
pub struct PlayerRun {
    pub turns: Vec<PlayerTurn>,
    /// Columns that are no longer accessible.
    pub inactive_cols: HashSet<usize>,
    /// How the turn ended (None if run still in progress).
    pub outcome: Option<RunOutcome>,
}

impl PlayerRun {
    pub fn turn_mut(&mut self) -> &mut PlayerTurn {
        let Some(turn) = self.turns.last_mut() else {
            panic!("There should be at least one turn started. Check start/end turn logic.");
        };
        turn
    }
    /// Start a new run for this player.
    pub fn start(inactive_cols: HashSet<usize>) -> Self {
        Self {
            turns: vec![],
            inactive_cols,
            outcome: None,
        }
    }
    /// Starts a new turn for the player.  Multiple turns happen sequentially
    /// until a player banks or croaks.
    pub fn start_turn(&mut self, options: DiceResult) {
        self.turns.push(PlayerTurn {
            chosen: None,
            options,
        });
    }
}
