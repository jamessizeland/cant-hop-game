use super::{logic::calculate_croak_chance, Choice, ColumnID, DiceResult, PlayerID};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    fmt::{Debug, Display},
};

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
    pub id: PlayerID,
    /// The player's name
    /// This is used to display the player's name in the UI
    pub name: String,
    /// The number of columns the player has won
    /// This is used to determine if the player has won
    pub won_cols: Vec<ColumnID>,
}

/// Represents the outcome of a player's run.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum RunOutcome {
    #[default]
    /// Turn unfinished.
    InProgress,
    /// Player ran out of options and went bust.
    Croaked,
    /// Player chose to stop voluntarily.
    Banked,
}

impl Display for RunOutcome {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let outcome = match self {
            RunOutcome::InProgress => "In Progress",
            RunOutcome::Croaked => "Croaked",
            RunOutcome::Banked => "Banked",
        };
        write!(f, "{outcome}")
    }
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
    /// Columns that have been chosen before this run (max 3).
    pub active_cols: HashSet<ColumnID>,
    /// Dice-rolls this turn, if they chose to hop.
    pub options: DiceResult,
    /// Columns chosen this turn.
    pub chosen: Option<Choice>,
    /// Record the outcome of this particular turn within the run.
    pub outcome: RunOutcome,
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
    pub inactive_cols: HashSet<ColumnID>,
    /// How the turn ended (None if run still in progress).
    pub outcome: RunOutcome,
}

impl Display for PlayerRun {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{} | {:?} >> ", self.outcome, self.inactive_cols)?;
        for turn in &self.turns {
            let dice = turn.options.dice;
            let choice = match turn.chosen {
                Some((first, Some(second))) => format!("({first} & {second})"),
                Some((first, None)) => format!("({first})"),
                None => "()".to_string(),
            };
            let bust_chance =
                calculate_croak_chance(&turn.active_cols, &self.inactive_cols) * 100.0;
            write!(
                f,
                "{:.1}%->{:?}{:?}{} ",
                bust_chance, dice, turn.active_cols, choice
            )?;
        }
        Ok(())
    }
}

impl PlayerRun {
    pub fn turn_mut(&mut self) -> &mut PlayerTurn {
        let Some(turn) = self.turns.last_mut() else {
            panic!("There should be at least one turn started. Check start/end turn logic.");
        };
        turn
    }
    /// Start a new run for this player.
    pub fn start(inactive_cols: HashSet<ColumnID>) -> Self {
        Self {
            turns: vec![],
            inactive_cols,
            outcome: RunOutcome::InProgress,
        }
    }
    /// Starts a new turn for the player.  Multiple turns happen sequentially
    /// until a player banks or croaks.
    pub fn start_turn(&mut self, options: DiceResult, active_cols: HashSet<ColumnID>) {
        self.turns.push(PlayerTurn {
            active_cols,
            chosen: None,
            options,
            outcome: RunOutcome::InProgress,
        });
    }
}

/// End game statistics for this player.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerStats {
    /// Longest successful run
    pub longest_run: usize,
    /// Total turns unsuccessfully ended
    pub croaked: usize,
    /// Total turns successfully ended
    pub banked: usize,
    /// Calculated success rate compared to likelihood
    pub luck: f64,
}
