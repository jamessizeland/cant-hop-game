use std::collections::HashSet;

use anyhow::{anyhow, Context};
use rand::random;
use tauri::Manager;
use tauri_plugin_store::StoreExt;

use crate::{
    logic::evaluate_moves,
    state::{DiceResult, GameState, GameStateMutex, SettingsState},
    utils::generate_name,
    STORE,
};

#[tauri::command]
pub fn start_game(
    settings: SettingsState,
    state: tauri::State<GameStateMutex>,
) -> tauri::Result<()> {
    println!("Starting game with settings: {:?}", settings);
    let mut game_state = state.lock().unwrap();
    *game_state = Default::default();
    game_state.settings = settings;
    game_state.in_progress = true;
    println!("Starting New Game");
    println!("{:?}", game_state);
    Ok(())
}

#[tauri::command]
pub fn get_game_state(
    state: tauri::State<GameStateMutex>,
    app: tauri::AppHandle,
) -> tauri::Result<GameState> {
    let game_state = state.lock().unwrap();
    let store = app
        .app_handle()
        .store(STORE)
        .context("failed to open store when saving game state.")?;
    game_state.write_to_store(&store)?;
    println!("Getting game state: {:?}", game_state);
    Ok(game_state.clone())
}

#[tauri::command]
pub fn stop_game(state: tauri::State<GameStateMutex>) -> tauri::Result<()> {
    let mut game_state = state.lock().unwrap();
    *game_state = Default::default();
    println!("Game stopped!");
    Ok(())
}

#[tauri::command]
/// Return a random name for the player
pub fn get_name(seed: Option<u64>) -> String {
    generate_name(seed)
}

#[tauri::command]
/// Rolls 4 dice and returns their values
/// The values are random numbers between 1 and 6 (inclusive)
/// Evaluate the possible combinations of the dice
pub fn roll_dice(state: tauri::State<GameStateMutex>) -> DiceResult {
    const DICE_SIDES: u8 = 6;
    const DICE_COUNT: usize = 4;
    let dice = [0; DICE_COUNT].map(|_| (random::<u8>() % DICE_SIDES + 1) as usize);
    println!("Rolled dice: {:?}", dice);
    let game_state = state.lock().unwrap();

    // I want to know what columns I have currently risked
    let selected: HashSet<usize> = game_state
        .columns
        .iter()
        .filter(|col| col.risked != 0)
        .map(|col| col.col)
        .collect();
    let unavailable: HashSet<usize> = game_state
        .columns
        .iter()
        .filter(|col| col.locked.is_some())
        .map(|col| col.col)
        .collect();
    println!("Selected columns: {:?}", selected);
    let choices = evaluate_moves(dice, &selected, &unavailable);
    println!("Available moves: {:?}", choices);
    DiceResult { dice, choices }
}

#[tauri::command]
/// Choose columns to risk
pub fn choose_columns(
    first: usize,
    second: Option<usize>,
    state: tauri::State<GameStateMutex>,
    app: tauri::AppHandle,
) -> tauri::Result<GameState> {
    println!("Choosing columns: {} {:?}", first, second);
    let mut game_state = state.lock().unwrap();
    let Some(col1) = game_state.columns.get_mut(first) else {
        return Err(anyhow!("Invalid column index {}", first).into());
    };
    col1.risked += 1;
    if let Some(second) = second {
        let Some(col2) = game_state.columns.get_mut(second) else {
            return Err(anyhow!("Invalid column index {}", second).into());
        };
        col2.risked += 1;
    };
    println!("Risked columns: {:?}", game_state);
    let store = app
        .app_handle()
        .store(STORE)
        .context("failed to open store when saving game state.")?;
    game_state.write_to_store(&store)?;
    Ok(game_state.clone())
}

#[tauri::command]
/// Player has chosen to end their turn, or has been forced to end it by
/// pushing their luck too far, and running out of options.
pub fn end_turn(
    forced: bool,
    state: tauri::State<GameStateMutex>,
    app: tauri::AppHandle,
) -> tauri::Result<GameState> {
    let mut game_state = state.lock().unwrap();
    game_state.next_player(forced);
    let store = app
        .app_handle()
        .store(STORE)
        .context("failed to open store when saving game state.")?;
    game_state.write_to_store(&store)?;
    Ok(game_state.clone())
}
