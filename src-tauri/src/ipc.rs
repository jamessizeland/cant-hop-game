use anyhow::anyhow;
use rand::random;

use crate::state::{GameState, GameStateMutex, SettingsState};

#[tauri::command]
pub fn start_game(
    settings: SettingsState,
    state: tauri::State<GameStateMutex>,
) -> tauri::Result<()> {
    let mut game_state = state.lock().unwrap();
    *game_state = Default::default();
    game_state.settings = settings;
    println!("Starting New Game");
    println!("{:?}", game_state);
    Ok(())
}

#[tauri::command]
pub fn stop_game() -> tauri::Result<()> {
    // Here you would stop your game logic
    // For example, you could signal the game thread or process to stop
    // This is just a placeholder for demonstration purposes
    println!("Game stopped!");
    Ok(())
}

#[tauri::command]
/// Rolls 4 dice and returns their values
/// The values are random numbers between 1 and 6 (inclusive)
pub fn roll_dice() -> [u8; 4] {
    const DICE_SIDES: u8 = 6;
    const DICE_COUNT: usize = 4;
    let mut dice: [u8; DICE_COUNT] = [0; DICE_COUNT];
    for i in 0..DICE_COUNT {
        dice[i] = random::<u8>() % DICE_SIDES + 1;
    }
    dice
}

#[tauri::command]
/// Choose columns to risk
pub fn choose_columns(
    first: usize,
    second: Option<usize>,
    state: tauri::State<GameStateMutex>,
) -> tauri::Result<GameState> {
    let mut game_state = state.lock().unwrap();
    let Some(col1) = game_state.columns.get_mut(first) else {
        return Err(anyhow!("Invalid column index {}", first).into());
    };
    col1.risked += 1;
    let Some(second) = second else {
        return Ok(game_state.clone());
    };

    let Some(col2) = game_state.columns.get_mut(second) else {
        return Err(anyhow!("Invalid column index {}", second).into());
    };
    col2.risked += 1;
    Ok(game_state.clone())
}

#[tauri::command]
/// Player has chosen to end their turn
pub fn end_turn(state: tauri::State<GameStateMutex>) -> GameState {
    let mut game_state = state.lock().unwrap();
    game_state.next_player();
    game_state.check_is_over();
    game_state.clone()
}
