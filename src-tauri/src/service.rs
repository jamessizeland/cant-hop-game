use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::{sync::Mutex, thread};
use tauri::{async_runtime::Receiver, Emitter as _, Manager as _, WebviewWindow}; // mutual exclusion wrapper

/// queue handler
pub type QueueHandler = Mutex<tauri::async_runtime::Sender<Message>>;

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Message {
    pub event: &'static str,
    pub payload: String,
}
impl Message {
    pub fn new<T: Serialize>(event: &'static str, payload: &T) -> Result<Self> {
        Ok(Self {
            event,
            payload: serde_json::to_string(payload)?,
        })
    }
}

pub fn bot_service(
    app: &mut tauri::App,
    mut rx: Receiver<Message>,
) -> Result<(), Box<dyn std::error::Error>> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| anyhow::anyhow!("Failed to get the window"))?;
    thread::spawn(move || {
        println!("spawning a new thread to handle unprompted events from Rust to the UI");
        loop {
            if let Err(error) = queue_handler(&window, &mut rx) {
                eprintln!("error while handling queue: {:?}", error);
                break;
            }
        }
    });
    Ok(())
}

/// Handler event data from Rust -> Frontend
pub fn queue_handler(window: &WebviewWindow, rx: &mut Receiver<Message>) -> Result<()> {
    if let Some(res) = rx.blocking_recv() {
        match res.event {
            "board" => {
                // let board: BoardState = serde_json::from_str(&res.payload)?;
                // window.emit("board", board)?;
            }
            other => {
                println!("{}, {}", other, res.payload);
                window.emit(other, res.payload)?;
            }
        }
    }
    Ok(())
}
