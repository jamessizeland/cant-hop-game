// pub mod ai;

use anyhow::anyhow;
use rand::random;

use crate::{
    state::{
        evaluate_moves, AppContext, ColumnID, DiceResult, GameState, SettingsState, StatsSummary,
    },
    utils::{generate_name, get_store},
};

#[tauri::command]
/// Initialize the GameState and Game History data from disk.
pub fn init_store(state: tauri::State<AppContext>, app: tauri::AppHandle) -> tauri::Result<()> {
    let mut game_state = state.game.lock().unwrap();
    let mut history = state.hist.lock().unwrap();
    let store = get_store(&app)?;
    game_state.update_from_store(&store);
    history.update_from_store(&store);
    Ok(())
}

#[tauri::command]
/// On Settings page, when starting a new game.
pub fn start_game(
    settings: SettingsState,
    state: tauri::State<AppContext>,
    app: tauri::AppHandle,
) -> tauri::Result<()> {
    println!("Starting game with settings: {:?}", settings);
    let mut game_state = state.game.lock().unwrap();
    let mut game_history = state.hist.lock().unwrap();
    game_history.new_game(settings.players.len())?;
    game_state.new_game(settings);

    let store = get_store(&app)?;
    game_state.write_to_store(&store)?;
    game_history.write_to_store(&store)?;
    Ok(())
}

#[tauri::command]
/// Return the current game state.
pub fn get_game_state(
    state: tauri::State<AppContext>,
    app: tauri::AppHandle,
) -> tauri::Result<GameState> {
    let mut game_state = state.game.lock().unwrap();
    println!("Game State: {:?}", game_state);
    if !game_state.in_progress {
        game_state.clear();
    }
    let store = get_store(&app)?;
    game_state.write_to_store(&store)?;
    println!("Getting game state: {:?}", game_state);
    Ok(game_state.clone())
}

#[tauri::command]
/// Return the end of game statistics summary.
pub fn get_game_statistics(state: tauri::State<AppContext>) -> StatsSummary {
    let history = state.hist.lock().unwrap();
    history.calculate_summary()
}

#[tauri::command]
/// Game over, reset the gamestate ready for a new game.
pub fn stop_game(state: tauri::State<AppContext>, app: tauri::AppHandle) -> tauri::Result<()> {
    let mut game_state = state.game.lock().unwrap();
    let mut history = state.hist.lock().unwrap();
    game_state.clear();
    history.clear();
    {
        let store = get_store(&app)?;
        game_state.write_to_store(&store)?;
        history.write_to_store(&store)?;
    }
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
pub fn roll_dice(
    state: tauri::State<AppContext>,
    app: tauri::AppHandle,
) -> tauri::Result<DiceResult> {
    const DICE_SIDES: u8 = 6;
    const DICE_COUNT: usize = 4;
    let dice = [0; DICE_COUNT].map(|_| (random::<u8>() % DICE_SIDES + 1) as usize);
    let game_state = state.game.lock().unwrap();

    let selected = game_state.get_selected();
    let unavailable = game_state.get_unavailable();

    let choices = evaluate_moves(dice, &selected, &unavailable);
    let result = DiceResult { dice, choices };
    {
        // update game history record
        let mut history = state.hist.lock().unwrap();
        history.player_mut().record_roll(&result, &selected);
        let store = get_store(&app)?;
        history.write_to_store(&store)?;
    }
    Ok(result)
}

#[tauri::command]
/// Choose columns to risk
pub fn choose_columns(
    first: ColumnID,
    second: Option<ColumnID>,
    state: tauri::State<AppContext>,
    app: tauri::AppHandle,
) -> tauri::Result<GameState> {
    let mut game_state = state.game.lock().unwrap();
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
    // println!("Risked columns: {:?}", game_state);
    game_state.hops += 1;
    {
        // record outcome
        let store = get_store(&app)?;
        game_state.write_to_store(&store)?;
        let mut history = state.hist.lock().unwrap();
        history.player_mut().record_choice(first, second);
        history.write_to_store(&store)?;
    }
    Ok(game_state.clone())
}

#[tauri::command]
/// Player has chosen to end their run, or has been forced to end it by
/// pushing their luck too far, and running out of options.
pub fn end_run(
    forced: bool,
    state: tauri::State<AppContext>,
    app: tauri::AppHandle,
) -> tauri::Result<GameState> {
    let mut game_state = state.game.lock().unwrap();
    let mut history = state.hist.lock().unwrap();
    let store = get_store(&app)?;
    let outcome = forced.into();

    game_state.next_player(outcome);
    history.next_player(outcome, game_state.get_unavailable());
    println!("{}", history);
    println!("{:?}", game_state);

    game_state.write_to_store(&store)?;
    history.write_to_store(&store)?;
    Ok(game_state.clone())
}
