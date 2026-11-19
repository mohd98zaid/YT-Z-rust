use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct DatabaseManager {
    conn: Arc<Mutex<Connection>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TrackItem {
    pub id: String,
    #[serde(rename = "videoId")]
    pub video_id: String,
    pub title: String,
    pub artist: String,
    #[serde(default)]
    pub album: Option<String>,
    #[serde(default)]
    pub duration: Option<String>,
    #[serde(default)]
    pub thumbnail: Option<String>,
    #[serde(rename = "addedAt", default)]
    pub added_at: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlaylistItem {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(default)]
    pub thumbnail: Option<String>,
    #[serde(rename = "isCustomThumbnail", default)]
    pub is_custom_thumbnail: Option<bool>,
    #[serde(rename = "createdAt")]
    pub created_at: f64,
    #[serde(rename = "updatedAt")]
    pub updated_at: f64,
    #[serde(rename = "trackCount", default)]
    pub track_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadRecord {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub url: String,
    pub format: String,
    pub quality: String,
    pub download_type: String,
    pub status: String,
    pub progress: f64,
    pub file_path: Option<String>,
    pub file_size: Option<i64>,
    pub error: Option<String>,
    pub created_at: String,
}

impl DatabaseManager {
    pub fn new(db_path: &PathBuf) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        let mgr = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        mgr.init_tables()?;
        Ok(mgr)
    }

    fn init_tables(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // 1. Favorites Table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS favorites (
                id TEXT PRIMARY KEY,
                video_id TEXT NOT NULL,
                title TEXT NOT NULL,
                artist TEXT,
                album TEXT,
                duration TEXT,
                thumbnail TEXT,
                added_at REAL
            )",
            [],
        )?;

        // 2. Downloads Table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS downloads (
                id TEXT PRIMARY KEY,
                title TEXT,
                artist TEXT,
                url TEXT,
                format TEXT,
                quality TEXT,
                download_type TEXT,
                status TEXT,
                progress REAL DEFAULT 0,
                file_path TEXT,
                file_size INTEGER,
                error TEXT,
                created_at TEXT,
                completed_at TEXT
            )",
            [],
        )?;

        // 3. Search History Table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS search_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query TEXT UNIQUE NOT NULL,
                timestamp REAL NOT NULL
            )",
            [],
        )?;

        // 4. Playback History Table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS playback_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                video_id TEXT NOT NULL,
                title TEXT NOT NULL,
                artist TEXT,
                album TEXT,
                duration TEXT,
                thumbnail TEXT,
                played_at REAL NOT NULL
            )",
            [],
        )?;

        // 5. Custom Playlists Table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS custom_playlists (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                thumbnail TEXT,
                is_custom_thumbnail INTEGER DEFAULT 0,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            )",
            [],
        )?;
        let _ = conn.execute("ALTER TABLE custom_playlists ADD COLUMN thumbnail TEXT", []);
        let _ = conn.execute("ALTER TABLE custom_playlists ADD COLUMN is_custom_thumbnail INTEGER DEFAULT 0", []);

        // 6. Custom Playlist Tracks Table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS custom_playlist_tracks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                playlist_id TEXT NOT NULL,
                track_id TEXT NOT NULL,
                title TEXT,
                artist TEXT,
                album TEXT,
                duration TEXT,
                thumbnail TEXT,
                position INTEGER DEFAULT 0,
                added_at REAL NOT NULL,
                FOREIGN KEY (playlist_id) REFERENCES custom_playlists(id) ON DELETE CASCADE
            )",
            [],
        )?;

        Ok(())
    }

    // --- Search History ---
    pub fn get_search_history(&self, limit: usize) -> Result<Vec<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT query FROM search_history ORDER BY timestamp DESC LIMIT ?")?;
        let rows = stmt.query_map(params![limit as i64], |row| row.get(0))?;
        let mut res = Vec::new();
        for r in rows {
            res.push(r?);
        }
        Ok(res)
    }

    pub fn save_search_query(&self, query: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp_millis() as f64 / 1000.0;
        conn.execute(
            "INSERT INTO search_history (query, timestamp) VALUES (?1, ?2)
             ON CONFLICT(query) DO UPDATE SET timestamp = ?2",
            params![query, now],
        )?;
        Ok(())
    }

    pub fn delete_search_query(&self, query: Option<&str>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        if let Some(q) = query {
            conn.execute("DELETE FROM search_history WHERE query = ?", params![q])?;
        } else {
            conn.execute("DELETE FROM search_history", [])?;
        }
        Ok(())
    }

    // --- Playback History ---
    pub fn get_playback_history(&self, limit: usize) -> Result<Vec<TrackItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT video_id, title, artist, album, duration, thumbnail, played_at 
             FROM playback_history ORDER BY played_at DESC LIMIT ?",
        )?;
        let rows = stmt.query_map(params![limit as i64], |row| {
            let vid: String = row.get(0)?;
            Ok(TrackItem {
                id: vid.clone(),
                video_id: vid,
                title: row.get(1)?,
                artist: row.get(2).unwrap_or_default(),
                album: row.get(3).ok(),
                duration: row.get(4).ok(),
                thumbnail: row.get(5).ok(),
                added_at: row.get(6).ok(),
            })
        })?;
        let mut res = Vec::new();
        for r in rows {
            res.push(r?);
        }
        Ok(res)
    }

    pub fn record_playback(&self, track: &TrackItem) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp_millis() as f64 / 1000.0;
        conn.execute(
            "INSERT INTO playback_history (video_id, title, artist, album, duration, thumbnail, played_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                track.video_id,
                track.title,
                track.artist,
                track.album,
                track.duration,
                track.thumbnail,
                now
            ],
        )?;
        Ok(())
    }

    pub fn clear_playback_history(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM playback_history", [])?;
        Ok(())
    }

    // --- Favorites ---
    pub fn get_favorites(&self) -> Result<Vec<TrackItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT video_id, title, artist, album, duration, thumbnail, added_at 
             FROM favorites ORDER BY added_at DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            let vid: String = row.get(0)?;
            Ok(TrackItem {
                id: vid.clone(),
                video_id: vid,
                title: row.get(1)?,
                artist: row.get(2).unwrap_or_default(),
                album: row.get(3).ok(),
                duration: row.get(4).ok(),
                thumbnail: row.get(5).ok(),
                added_at: row.get(6).ok(),
            })
        })?;
        let mut res = Vec::new();
        for r in rows {
            res.push(r?);
        }
        Ok(res)
    }

    pub fn is_favorite(&self, video_id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM favorites WHERE video_id = ?",
            params![video_id],
            |r| r.get(0),
        )?;
        Ok(count > 0)
    }

    pub fn toggle_favorite(&self, track: &TrackItem) -> Result<bool> {
        let is_fav = self.is_favorite(&track.video_id)?;
        let conn = self.conn.lock().unwrap();
        if is_fav {
            conn.execute("DELETE FROM favorites WHERE video_id = ?", params![track.video_id])?;
            Ok(false)
        } else {
            let now = chrono::Utc::now().timestamp_millis() as f64 / 1000.0;
            conn.execute(
                "INSERT INTO favorites (id, video_id, title, artist, album, duration, thumbnail, added_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    track.video_id,
                    track.video_id,
                    track.title,
                    track.artist,
                    track.album,
                    track.duration,
                    track.thumbnail,
                    now
                ],
            )?;
            Ok(true)
        }
    }

    // --- Custom Playlists ---
    pub fn get_playlists(&self) -> Result<Vec<PlaylistItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT p.id, p.name, p.description, p.created_at, p.updated_at, COUNT(t.id) as track_count,
                    COALESCE(NULLIF(p.thumbnail, ''), (
                        SELECT t2.thumbnail FROM custom_playlist_tracks t2 
                        WHERE t2.playlist_id = p.id AND t2.thumbnail IS NOT NULL AND t2.thumbnail != '' 
                        ORDER BY t2.position ASC, t2.added_at ASC LIMIT 1
                    )) as resolved_thumb,
                    p.is_custom_thumbnail
             FROM custom_playlists p
             LEFT JOIN custom_playlist_tracks t ON p.id = t.playlist_id
             GROUP BY p.id
             ORDER BY p.updated_at DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            let is_custom_val: Option<i64> = row.get(7).ok();
            Ok(PlaylistItem {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2).ok(),
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                track_count: row.get(5)?,
                thumbnail: row.get(6).ok(),
                is_custom_thumbnail: Some(is_custom_val.unwrap_or(0) == 1),
            })
        })?;
        let mut res = Vec::new();
        for r in rows {
            res.push(r?);
        }
        Ok(res)
    }

    pub fn create_playlist(&self, name: &str, description: Option<&str>, thumbnail: Option<&str>) -> Result<PlaylistItem> {
        let id = format!("pl_{}", chrono::Utc::now().timestamp_millis());
        let now = chrono::Utc::now().timestamp_millis() as f64 / 1000.0;
        let is_custom = if thumbnail.map(|t| !t.trim().is_empty()).unwrap_or(false) { 1 } else { 0 };
        let thumb_val = thumbnail.map(|t| t.trim().to_string()).unwrap_or_default();
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO custom_playlists (id, name, description, thumbnail, is_custom_thumbnail, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, name, description, thumb_val, is_custom, now, now],
        )?;
        Ok(PlaylistItem {
            id,
            name: name.to_string(),
            description: description.map(|s| s.to_string()),
            thumbnail: if thumb_val.is_empty() { None } else { Some(thumb_val) },
            is_custom_thumbnail: Some(is_custom == 1),
            created_at: now,
            updated_at: now,
            track_count: 0,
        })
    }

    pub fn update_playlist(&self, playlist_id: &str, name: Option<&str>, description: Option<&str>, thumbnail: Option<&str>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp_millis() as f64 / 1000.0;
        if let Some(n) = name {
            conn.execute("UPDATE custom_playlists SET name = ?1, updated_at = ?2 WHERE id = ?3", params![n, now, playlist_id])?;
        }
        if let Some(d) = description {
            conn.execute("UPDATE custom_playlists SET description = ?1, updated_at = ?2 WHERE id = ?3", params![d, now, playlist_id])?;
        }
        if let Some(t) = thumbnail {
            let trimmed = t.trim();
            if trimmed.is_empty() {
                conn.execute("UPDATE custom_playlists SET thumbnail = '', is_custom_thumbnail = 0, updated_at = ?1 WHERE id = ?2", params![now, playlist_id])?;
            } else {
                conn.execute("UPDATE custom_playlists SET thumbnail = ?1, is_custom_thumbnail = 1, updated_at = ?2 WHERE id = ?3", params![trimmed, now, playlist_id])?;
            }
        }
        Ok(())
    }

    pub fn delete_playlist(&self, playlist_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM custom_playlist_tracks WHERE playlist_id = ?", params![playlist_id])?;
        conn.execute("DELETE FROM custom_playlists WHERE id = ?", params![playlist_id])?;
        Ok(())
    }

    pub fn get_playlist_tracks(&self, playlist_id: &str) -> Result<Vec<TrackItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT track_id, title, artist, album, duration, thumbnail, added_at
             FROM custom_playlist_tracks
             WHERE playlist_id = ?
             ORDER BY position ASC, added_at ASC",
        )?;
        let rows = stmt.query_map(params![playlist_id], |row| {
            let vid: String = row.get(0)?;
            Ok(TrackItem {
                id: vid.clone(),
                video_id: vid,
                title: row.get(1)?,
                artist: row.get(2).unwrap_or_default(),
                album: row.get(3).ok(),
                duration: row.get(4).ok(),
                thumbnail: row.get(5).ok(),
                added_at: row.get(6).ok(),
            })
        })?;
        let mut res = Vec::new();
        for r in rows {
            res.push(r?);
        }
        Ok(res)
    }

    pub fn add_track_to_playlist(&self, playlist_id: &str, track: &TrackItem) -> Result<()> {
        let now = chrono::Utc::now().timestamp_millis() as f64 / 1000.0;
        let conn = self.conn.lock().unwrap();
        let max_pos: i64 = conn.query_row(
            "SELECT COALESCE(MAX(position), 0) + 1 FROM custom_playlist_tracks WHERE playlist_id = ?",
            params![playlist_id],
            |r| r.get(0),
        ).unwrap_or(0);

        conn.execute(
            "INSERT INTO custom_playlist_tracks (playlist_id, track_id, title, artist, album, duration, thumbnail, position, added_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                playlist_id,
                track.video_id,
                track.title,
                track.artist,
                track.album,
                track.duration,
                track.thumbnail,
                max_pos,
                now
            ],
        )?;

        // Update playlist updated_at
        conn.execute(
            "UPDATE custom_playlists SET updated_at = ? WHERE id = ?",
            params![now, playlist_id],
        )?;
        Ok(())
    }

    pub fn remove_track_from_playlist(&self, playlist_id: &str, track_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM custom_playlist_tracks WHERE playlist_id = ? AND track_id = ?",
            params![playlist_id, track_id],
        )?;
        let now = chrono::Utc::now().timestamp_millis() as f64 / 1000.0;
        conn.execute(
            "UPDATE custom_playlists SET updated_at = ? WHERE id = ?",
            params![now, playlist_id],
        )?;
        Ok(())
    }
}
