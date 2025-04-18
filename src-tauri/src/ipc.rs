use std::collections::HashSet;

use anyhow::anyhow;
use rand::random;

use crate::{
    state::{DiceResult, GameState, GameStateMutex, SettingsState},
    utils::generate_name,
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
    println!("Starting New Game");
    println!("{:?}", game_state);
    Ok(())
}

#[tauri::command]
pub fn get_game_state(state: tauri::State<GameStateMutex>) -> GameState {
    let game_state = state.lock().unwrap();
    println!("Getting game state: {:?}", game_state);
    game_state.clone()
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
    let mut dice: [usize; DICE_COUNT] = [0; DICE_COUNT];
    for i in 0..DICE_COUNT {
        dice[i] = (random::<u8>() % DICE_SIDES + 1) as usize;
    }
    println!("Rolled dice: {:?}", dice);
    let game_state = state.lock().unwrap();

    // I want to know what columns I have currently risked
    let selected: HashSet<usize> = game_state
        .columns
        .iter()
        .filter(|col| col.risked != 0)
        .map(|col| col.col)
        .collect();
    println!("Selected columns: {:?}", selected);
    let choices = evaluate_moves(dice, selected);
    println!("Available moves: {:?}", choices);
    DiceResult { dice, choices }
}

/// Evaluate the available moves from the four dice.
/// - They must be paired up and cannot be reused.
/// - `selected` is the list of columns already selected (0–3 of them).
/// - You can select at most 3 distinct columns total per round,
///   so any move that would introduce more than 3 is dropped.
/// - if a “double” move (both sums) is legal, you must take it,
///   and you must *not* offer either single move from that pairing.
/// - you can still offer moves that are already selected.
fn evaluate_moves(dice: [usize; 4], selected: HashSet<usize>) -> HashSet<(usize, Option<usize>)> {
    let mut moves = HashSet::new();

    let used = selected.len();
    // how many *new* columns we can still add:
    let cap = 3usize.saturating_sub(used);

    // the three ways to pair up 4 dice:
    for &(i, j, k, l) in &[(0, 1, 2, 3), (0, 2, 1, 3), (0, 3, 1, 2)] {
        let first = dice[i] + dice[j];
        let second = dice[k] + dice[l];

        let first_new = !selected.contains(&first);
        let second_new = !selected.contains(&second);
        let new_needed = (first_new as usize) + (second_new as usize);

        // If taking *both* would fit under the cap of new columns, force the double…
        if new_needed <= cap {
            // canonical order:
            let (a, b) = if first <= second {
                (first, second)
            } else {
                (second, first)
            };
            moves.insert((a, Some(b)));
            continue;
        }

        // …otherwise offer any “single” move that’s either already selected or fits in the cap
        for &col in &[first, second] {
            if selected.contains(&col) || cap >= 1 {
                moves.insert((col, None));
            }
        }
    }

    moves
}

#[tauri::command]
/// Choose columns to risk
pub fn choose_columns(
    first: usize,
    second: Option<usize>,
    state: tauri::State<GameStateMutex>,
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
    Ok(game_state.clone())
}

#[tauri::command]
/// Player has chosen to end their turn, or has been forced to end it by
/// pushing their luck too far, and running out of options.
pub fn end_turn(forced: bool, state: tauri::State<GameStateMutex>) -> GameState {
    let mut game_state = state.lock().unwrap();
    game_state.next_player(forced);
    if !forced {
        game_state.check_is_over();
    }
    game_state.clone()
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_evaluate_moves_no_selected_columns() {
        let dice = [1, 2, 3, 4];
        let selected = HashSet::new();
        let moves = evaluate_moves(dice, selected);

        let expected_moves: HashSet<(usize, Option<usize>)> =
            [(4, Some(6)), (5, Some(5)), (3, Some(7))]
                .iter()
                .cloned()
                .collect();

        assert_eq!(moves, expected_moves);
    }

    #[test]
    fn test_evaluate_moves_with_selected_columns() {
        let dice = [1, 2, 3, 4];
        let mut selected = HashSet::new();
        selected.insert(3); // Column 3 is already selected
        let moves = evaluate_moves(dice, selected);

        let expected_moves: HashSet<(usize, Option<usize>)> =
            [(4, Some(6)), (5, Some(5)), (3, Some(7))]
                .iter()
                .cloned()
                .collect();

        assert_eq!(moves, expected_moves);
    }

    #[test]
    fn test_evaluate_moves_with_full_selected_columns() {
        let dice = [1, 2, 3, 4];
        let mut selected = HashSet::new();
        selected.insert(3);
        selected.insert(7);
        selected.insert(6); // Already selected 3 columns
        let moves = evaluate_moves(dice, selected);

        let expected_moves: HashSet<(usize, Option<usize>)> =
            [(6, None), (3, Some(7))].iter().cloned().collect();

        assert_eq!(moves, expected_moves);
    }

    #[test]
    fn test_evaluate_moves_with_two_selected_columns() {
        let dice = [1, 2, 3, 4];
        let mut selected = HashSet::new();
        selected.insert(3); // Column 3 is already selected
        selected.insert(9); // Column 4 is already selected
        let moves = evaluate_moves(dice, selected);

        let expected_moves: HashSet<(usize, Option<usize>)> =
            [(6, None), (4, None), (3, Some(7)), (5, None)]
                .iter()
                .cloned()
                .collect();
        assert_eq!(moves, expected_moves);
    }
}
