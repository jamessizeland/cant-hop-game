use super::{ColumnID, PlayerID};
use serde::{Deserialize, Serialize};
use std::fmt::Debug;

pub const HEIGHTS: [usize; 11] = [3, 5, 7, 9, 11, 13, 11, 9, 7, 5, 3];

#[derive(Default, Copy, Clone, Serialize, Deserialize)]
pub struct Column {
    /// The dice number of the column
    pub col: ColumnID,
    /// The height of the column, which is the number of hops in the column
    pub height: usize,
    /// The current position of each player in the column
    pub hops: [usize; 4],
    /// The number of hops the current player has risked in the column
    /// This is relative to their current position in the column.
    pub risked: usize,
    /// Whether the column has been won by a player
    pub locked: Option<PlayerID>,
}

impl Debug for Column {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let locked = match self.locked {
            Some(_) => '🔒',
            None => '🔓',
        };
        writeln!(
            f,
            "{:2} {}|{},{},{},{}| {}",
            self.col, locked, self.hops[0], self.hops[1], self.hops[2], self.hops[3], self.risked
        )
    }
}

pub const fn generate_columns() -> [Column; 11] {
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
