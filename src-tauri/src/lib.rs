pub mod config;
pub mod db;
pub mod downloader;
pub mod lyrics;
pub mod server;
pub mod stream;
pub mod ytmusic;

use config::AppConfig;
use db::DatabaseManager;
use downloader::DownloaderEngine;
use lyrics::LyricsEngine;
use server::{start_server, AppState};
use stream::StreamResolver;
use ytmusic::YTMusicClient;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let config = AppConfig::new();
    let db = DatabaseManager::new(&config.db_path).expect("Failed to initialize SQLite database");
    let ytmusic = YTMusicClient::new("IN", "en");
    let stream = StreamResolver::new();
    let lyrics = LyricsEngine::new();
    let downloader = DownloaderEngine::new(config.downloads_dir.clone());

    let state = AppState {
        config: config.clone(),
        db,
        ytmusic,
        stream,
        lyrics,
        downloader,
    };

    // Spawn embedded Axum HTTP + WebSocket core engine in Tokio background
    let state_clone = state.clone();
    tauri::async_runtime::spawn(async move {
        start_server(state_clone, 47892).await;
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|_app| {
            println!("YT-Z Tauri Core Engine initialized successfully!");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
