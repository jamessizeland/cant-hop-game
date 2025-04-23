use service::{bot_service, Message, QueueHandler};
use tauri::async_runtime::channel;

mod ipc;
mod logic;
mod service;
mod state;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let (tx, rx) = channel::<Message>(5);
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| bot_service(app, rx))
        .manage(state::GameStateMutex::default())
        .manage(QueueHandler::new(tx))
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
