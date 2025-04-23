use service::{bot_service, Message, QueueHandler};
use tauri::async_runtime::channel;
use tauri_plugin_store::StoreExt as _;

mod ipc;
mod logic;
mod service;
mod state;
mod utils;

pub const STORE: &str = "store.json";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let (tx, rx) = channel::<Message>(5);
    let game_state = state::GameStateMutex::default();
    let game_state_clone = game_state.clone();
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let store = app.store(STORE)?;
            game_state_clone.lock().unwrap().read_from_store(&store);
            bot_service(app, rx, game_state_clone)?;
            store.close_resource();
            Ok(())
        })
        .manage(game_state)
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
