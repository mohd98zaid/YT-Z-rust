use axum::{
    extract::{ws::WebSocketUpgrade, Path, Query, State},
    http::{Method, StatusCode},
    response::{IntoResponse, Json},
    routing::{delete, get, post},
    Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};

use crate::config::AppConfig;
use crate::db::{DatabaseManager, TrackItem};
use crate::downloader::DownloaderEngine;
use crate::lyrics::LyricsEngine;
use crate::stream::StreamResolver;
use crate::ytmusic::YTMusicClient;

#[derive(Clone)]
pub struct AppState {
    pub config: AppConfig,
    pub db: DatabaseManager,
    pub ytmusic: YTMusicClient,
    pub stream: StreamResolver,
    pub lyrics: LyricsEngine,
    pub downloader: DownloaderEngine,
}

#[derive(Deserialize)]
pub struct SearchQuery {
    pub query: String,
    pub filter: Option<String>,
}

#[derive(Deserialize)]
pub struct SuggestionsQuery {
    pub query: String,
}

#[derive(Deserialize)]
pub struct LyricsQuery {
    pub title: String,
    #[serde(default)]
    pub artist: String,
    #[serde(default)]
    pub duration: Option<i64>,
}

#[derive(Deserialize)]
pub struct QuickPicksQuery {
    #[serde(default)]
    pub mood: Option<String>,
    #[serde(default)]
    pub limit: Option<usize>,
}

#[derive(Deserialize)]
pub struct HistoryDeleteQuery {
    pub query: Option<String>,
}

#[derive(Deserialize)]
pub struct EnqueueRequest {
    pub url: String,
    #[serde(rename = "download_type", default)]
    pub download_type: Option<String>,
    #[serde(default)]
    pub format: Option<String>,
    #[serde(default)]
    pub quality: Option<String>,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub artist: Option<String>,
    #[serde(default)]
    pub thumbnail: Option<String>,
}

#[derive(Deserialize)]
pub struct CreatePlaylistRequest {
    pub name: String,
    pub description: Option<String>,
}

pub fn create_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::DELETE, Method::PUT, Method::OPTIONS])
        .allow_headers(Any);

    Router::new()
        // Discovery & Search
        .route("/api/ytm/home", get(handle_home))
        .route("/api/ytm/quick-picks", get(handle_quick_picks))
        .route("/api/ytm/charts", get(handle_charts))
        .route("/api/ytm/search", get(handle_search))
        .route("/api/ytm/suggestions", get(handle_suggestions))
        .route("/api/youtube/search", get(handle_youtube_search))
        .route("/api/ytm/radio/:video_id", get(handle_radio))
        // Stream & Lyrics
        .route("/api/stream/:video_id", get(handle_stream))
        .route("/api/stream/:video_id/segments", get(handle_segments))
        .route("/api/lyrics", get(handle_lyrics))
        // Downloader
        .route("/api/downloader/queue", get(handle_get_queue).post(handle_enqueue))
        .route("/api/downloader/history", get(handle_get_download_history))
        // Library: Favorites
        .route("/api/library/favorites", get(handle_get_favorites))
        .route("/api/library/favorites/:id", post(handle_toggle_favorite))
        // Library: Search History
        .route(
            "/api/library/search-history",
            get(handle_get_search_history)
                .post(handle_save_search_query)
                .delete(handle_delete_search_history),
        )
        // Library: Playback History
        .route(
            "/api/library/playback-history",
            get(handle_get_playback_history)
                .post(handle_record_playback)
                .delete(handle_clear_playback_history),
        )
        // Library: Custom Playlists
        .route(
            "/api/library/playlists",
            get(handle_get_playlists).post(handle_create_playlist),
        )
        .route("/api/library/playlists/:id", delete(handle_delete_playlist))
        .route(
            "/api/library/playlists/:id/tracks",
            get(handle_get_playlist_tracks).post(handle_add_playlist_track),
        )
        .route(
            "/api/library/playlists/:id/tracks/:track_id",
            delete(handle_remove_playlist_track),
        )
        // System / Storage / Cache
        .route("/api/system/storage", get(handle_get_storage))
        .route("/api/system/cache", delete(handle_purge_cache))
        // WebSocket
        .route("/ws", get(handle_ws))
        .layer(cors)
        .with_state(state)
}

pub async fn start_server(state: AppState, port: u16) {
    let app = create_router(state);
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    println!("YT-Z Rust Core Engine listening on http://{}", addr);

    if let Ok(listener) = tokio::net::TcpListener::bind(addr).await {
        let _ = axum::serve(listener, app).await;
    }
}

// --- Handler Functions ---

async fn handle_home(State(state): State<AppState>) -> impl IntoResponse {
    match state.ytmusic.get_home().await {
        Ok(sections) => Json(sections).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
    }
}

async fn handle_quick_picks(
    State(state): State<AppState>,
    Query(q): Query<QuickPicksQuery>,
) -> impl IntoResponse {
    let mood = q.mood.as_deref().unwrap_or("top");
    let query_str = format!("{} hits songs", mood);
    match state.ytmusic.search(&query_str, Some("songs")).await {
        Ok(tracks) => {
            let limit = q.limit.unwrap_or(12);
            let slice: Vec<Value> = tracks.into_iter().take(limit).collect();
            Json(slice).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
    }
}

async fn handle_charts(State(state): State<AppState>) -> impl IntoResponse {
    match state.ytmusic.search("trending songs top charts", Some("songs")).await {
        Ok(tracks) => Json(json!({
            "songs": tracks,
            "videos": [],
            "artists": []
        }))
        .into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
    }
}

async fn handle_search(
    State(state): State<AppState>,
    Query(q): Query<SearchQuery>,
) -> impl IntoResponse {
    match state.ytmusic.search(&q.query, q.filter.as_deref()).await {
        Ok(tracks) => Json(tracks).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
    }
}

async fn handle_youtube_search(
    State(state): State<AppState>,
    Query(q): Query<SearchQuery>,
) -> impl IntoResponse {
    match state.ytmusic.search(&q.query, Some("videos")).await {
        Ok(tracks) => Json(tracks).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
    }
}

async fn handle_suggestions(
    State(state): State<AppState>,
    Query(q): Query<SuggestionsQuery>,
) -> impl IntoResponse {
    match state.ytmusic.get_suggestions(&q.query).await {
        Ok(suggestions) => Json(suggestions).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
    }
}

async fn handle_radio(
    State(state): State<AppState>,
    Path(video_id): Path<String>,
) -> impl IntoResponse {
    match state.ytmusic.get_radio(&video_id).await {
        Ok(tracks) => Json(tracks).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
    }
}

async fn handle_stream(
    State(state): State<AppState>,
    Path(video_id): Path<String>,
) -> impl IntoResponse {
    match state.stream.resolve_audio(&video_id).await {
        Ok(info) => Json(info).into_response(),
        Err(e) => (StatusCode::NOT_FOUND, e).into_response(),
    }
}

async fn handle_segments(
    State(state): State<AppState>,
    Path(video_id): Path<String>,
) -> impl IntoResponse {
    let segs = state.stream.get_sponsor_block_segments(&video_id).await;
    Json(segs).into_response()
}

async fn handle_lyrics(
    State(state): State<AppState>,
    Query(q): Query<LyricsQuery>,
) -> impl IntoResponse {
    let resp = state
        .lyrics
        .fetch_lyrics(&q.title, &q.artist, q.duration)
        .await;
    Json(resp).into_response()
}

async fn handle_get_queue(State(state): State<AppState>) -> impl IntoResponse {
    Json(state.downloader.get_queue()).into_response()
}

async fn handle_get_download_history(State(state): State<AppState>) -> impl IntoResponse {
    Json(state.downloader.get_history()).into_response()
}

async fn handle_enqueue(
    State(state): State<AppState>,
    Json(req): Json<EnqueueRequest>,
) -> impl IntoResponse {
    let id = state.downloader.enqueue(
        &req.url,
        req.title.as_deref().unwrap_or("Track"),
        req.artist.as_deref().unwrap_or("Artist"),
        req.thumbnail.as_deref().unwrap_or(""),
        req.download_type.as_deref().unwrap_or("audio"),
        req.format.as_deref().unwrap_or("mp3"),
        req.quality.as_deref().unwrap_or("320k"),
    );
    Json(json!({ "status": "queued", "id": id })).into_response()
}

async fn handle_get_favorites(State(state): State<AppState>) -> impl IntoResponse {
    match state.db.get_favorites() {
        Ok(favs) => Json(favs).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn handle_toggle_favorite(
    State(state): State<AppState>,
    Path(_id): Path<String>,
    Json(track): Json<TrackItem>,
) -> impl IntoResponse {
    match state.db.toggle_favorite(&track) {
        Ok(is_fav) => Json(json!({ "status": "success", "isFavorite": is_fav })).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn handle_get_search_history(State(state): State<AppState>) -> impl IntoResponse {
    match state.db.get_search_history(20) {
        Ok(history) => Json(history).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn handle_save_search_query(
    State(state): State<AppState>,
    Json(body): Json<HashMap<String, String>>,
) -> impl IntoResponse {
    if let Some(q) = body.get("query") {
        let _ = state.db.save_search_query(q);
    }
    Json(json!({ "status": "success" })).into_response()
}

async fn handle_delete_search_history(
    State(state): State<AppState>,
    Query(q): Query<HistoryDeleteQuery>,
) -> impl IntoResponse {
    let _ = state.db.delete_search_query(q.query.as_deref());
    Json(json!({ "status": "success" })).into_response()
}

async fn handle_get_playback_history(State(state): State<AppState>) -> impl IntoResponse {
    match state.db.get_playback_history(50) {
        Ok(history) => Json(history).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn handle_record_playback(
    State(state): State<AppState>,
    Json(track): Json<TrackItem>,
) -> impl IntoResponse {
    let _ = state.db.record_playback(&track);
    Json(json!({ "status": "success" })).into_response()
}

async fn handle_clear_playback_history(State(state): State<AppState>) -> impl IntoResponse {
    let _ = state.db.clear_playback_history();
    Json(json!({ "status": "success" })).into_response()
}

async fn handle_get_playlists(State(state): State<AppState>) -> impl IntoResponse {
    match state.db.get_playlists() {
        Ok(pls) => Json(pls).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn handle_create_playlist(
    State(state): State<AppState>,
    Json(body): Json<CreatePlaylistRequest>,
) -> impl IntoResponse {
    match state.db.create_playlist(&body.name, body.description.as_deref()) {
        Ok(pl) => Json(pl).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn handle_delete_playlist(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let _ = state.db.delete_playlist(&id);
    Json(json!({ "status": "success" })).into_response()
}

async fn handle_get_playlist_tracks(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state.db.get_playlist_tracks(&id) {
        Ok(tracks) => Json(tracks).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn handle_add_playlist_track(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(track): Json<TrackItem>,
) -> impl IntoResponse {
    let _ = state.db.add_track_to_playlist(&id, &track);
    Json(json!({ "status": "success" })).into_response()
}

async fn handle_remove_playlist_track(
    State(state): State<AppState>,
    Path((id, track_id)): Path<(String, String)>,
) -> impl IntoResponse {
    let _ = state.db.remove_track_from_playlist(&id, &track_id);
    Json(json!({ "status": "success" })).into_response()
}

async fn handle_get_storage(State(state): State<AppState>) -> impl IntoResponse {
    let cache_dir = state.config.cache_dir;
    let downloads_dir = state.config.downloads_dir;

    let mut cache_bytes: u64 = 0;
    if let Ok(entries) = std::fs::read_dir(&cache_dir) {
        for e in entries.flatten() {
            if let Ok(meta) = e.metadata() {
                cache_bytes += meta.len();
            }
        }
    }

    let cache_mb = (cache_bytes as f64) / (1024.0 * 1024.0);

    Json(json!({
        "cacheSizeMb": format!("{:.1} MB", cache_mb),
        "downloadsDir": downloads_dir.to_string_lossy(),
        "cacheDir": cache_dir.to_string_lossy()
    }))
    .into_response()
}

async fn handle_purge_cache(State(state): State<AppState>) -> impl IntoResponse {
    let cache_dir = state.config.cache_dir;
    if let Ok(entries) = std::fs::read_dir(&cache_dir) {
        for e in entries.flatten() {
            let _ = std::fs::remove_file(e.path());
        }
    }
    Json(json!({ "status": "purged", "message": "Cache successfully cleared" })).into_response()
}

async fn handle_ws(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(|mut socket| async move {
        // Echo / heartbeat keep-alive
        while let Some(Ok(msg)) = socket.recv().await {
            if socket.send(msg).await.is_err() {
                break;
            }
        }
    })
}
