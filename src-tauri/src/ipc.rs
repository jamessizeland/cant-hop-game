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
    columns: [usize; 2],
    state: tauri::State<GameStateMutex>,
) -> tauri::Result<GameState> {
    let mut game_state = state.lock().unwrap();
    for col in columns {
        game_state.columns[col].risked += 1;
    }
    println!("Columns chosen: {:?}", columns);
    Ok(game_state.clone())
}
