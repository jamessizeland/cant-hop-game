mod ipc;
mod state;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .manage(state::AppContext::default())
        .invoke_handler(tauri::generate_handler![
            ipc::init_store,
            ipc::start_game,
            ipc::stop_game,
            ipc::roll_dice,
            ipc::choose_columns,
            ipc::end_run,
            ipc::get_game_state,
            ipc::get_name,
            ipc::get_game_statistics,
            ipc::ai::check_continue,
            ipc::ai::choose_column,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
