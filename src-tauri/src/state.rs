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
    Human,
    Safe,
    Normal,
    Risky,
}

/// A player in the game
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    mode: PlayerMode,
    id: usize,
    name: String,
}

#[derive(Default, Debug, Copy, Clone, Serialize, Deserialize)]
pub struct Column {
    pub col: usize,
    pub height: usize,
    pub hops: [usize; 4],
    pub risked: usize,
}

pub type GameStateMutex = std::sync::Mutex<GameState>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameState {
    pub settings: SettingsState,
    pub current_player: usize,
    pub columns: [Column; 11],
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
                    },
                    Player {
                        mode: PlayerMode::Normal,
                        id: 1,
                        name: "Player 2".to_string(),
                    },
                ],
                win_cols: 3,
            },
            current_player: 0,
            columns: generate_columns(),
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
