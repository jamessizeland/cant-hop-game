mod ipc;
mod state;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(state::GameStateMutex::default())
        .invoke_handler(tauri::generate_handler![
            ipc::start_game,
            ipc::stop_game,
            ipc::roll_dice,
            ipc::choose_columns,
            ipc::end_turn,
            ipc::get_game_state,
            ipc::get_name,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
