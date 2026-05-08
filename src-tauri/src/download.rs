use futures_util::TryStreamExt;
use serde::Serialize;
use tauri::{command, ipc::Channel};
use tokio::{
    fs::{File, create_dir_all},
    io::{AsyncWriteExt, BufWriter},
};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    progress: u64,
    total: u64,
}

#[command]
pub async fn download_file(
    url: &str,
    file_path: &str,
    on_progress: Channel<DownloadProgress>,
) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(file_path).parent() {
        create_dir_all(parent)
            .await
            .map_err(|error| error.to_string())?;
    }

    let response = reqwest::Client::new()
        .get(url)
        .header(reqwest::header::USER_AGENT, "cant-hop-updater")
        .send()
        .await
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Download failed with status {}", response.status()));
    }

    let total = response.content_length().unwrap_or(0);
    let mut progress = 0;
    let mut file = BufWriter::new(
        File::create(file_path)
            .await
            .map_err(|error| error.to_string())?,
    );
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.try_next().await.map_err(|error| error.to_string())? {
        file.write_all(&chunk)
            .await
            .map_err(|error| error.to_string())?;
        progress += chunk.len() as u64;
        let _ = on_progress.send(DownloadProgress { progress, total });
    }

    file.flush().await.map_err(|error| error.to_string())?;
    Ok(())
}

#[command]
pub async fn fetch_text(url: &str) -> Result<String, String> {
    let response = reqwest::Client::new()
        .get(url)
        .header(reqwest::header::USER_AGENT, "cant-hop-updater")
        .send()
        .await
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Request failed with status {}", response.status()));
    }

    response.text().await.map_err(|error| error.to_string())
}
