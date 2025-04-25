use crate::state::GameStateMutex;

#[tauri::command]
/// Decide bot action, hop or stop
pub fn check_continue(state: tauri::State<GameStateMutex>) -> bool {
    // todo add real logic here.
    false
}
