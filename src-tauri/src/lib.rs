#[cfg(debug_assertions)] // only include this code on debug builds
use tauri::Manager;

mod download;
mod ipc;
mod state;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_apk_installer::init())
        .manage(state::AppContext::default())
        .setup(|_app| {
            #[cfg(desktop)]
            _app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            #[cfg(debug_assertions)] // only include this code on debug builds
            _app.get_webview_window("main").unwrap().open_devtools();
            Ok(())
        })
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
            download::download_file,
            ipc::ai::check_continue,
            ipc::ai::choose_column,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
