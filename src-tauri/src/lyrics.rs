use reqwest::header::{HeaderMap, HeaderValue, USER_AGENT};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LyricsResponse {
    pub found: bool,
    #[serde(rename = "isSynced")]
    pub is_synced: bool,
    pub lyrics: String,
    pub title: String,
    pub artist: String,
    pub source: String,
}

#[derive(Clone)]
pub struct LyricsEngine {
    client: reqwest::Client,
}

impl LyricsEngine {
    pub fn new() -> Self {
        let mut headers = HeaderMap::new();
        headers.insert(
            USER_AGENT,
            HeaderValue::from_static("YT-Z-Music/2.0 (https://github.com/mohd98zaid/YT-Z)"),
        );
        let client = reqwest::Client::builder()
            .default_headers(headers)
            .build()
            .unwrap_or_default();
        Self { client }
    }

    pub async fn fetch_lyrics(
        &self,
        title: &str,
        artist: &str,
        duration: Option<i64>,
    ) -> LyricsResponse {
        let clean_title = title.split('(').next().unwrap_or(title).trim();
        let clean_artist = artist.split(',').next().unwrap_or(artist).trim();

        // 1. Try exact get
        let mut url = format!(
            "https://lrclib.net/api/get?track_name={}&artist_name={}",
            urlencoding::encode(clean_title),
            urlencoding::encode(clean_artist)
        );
        if let Some(dur) = duration {
            if dur > 0 {
                url.push_str(&format!("&duration={}", dur));
            }
        }

        if let Ok(resp) = self.client.get(&url).send().await {
            if resp.status().is_success() {
                if let Ok(data) = resp.json::<Value>().await {
                    if let Some(synced) = data.get("syncedLyrics").and_then(|s| s.as_str()) {
                        if !synced.is_empty() {
                            return LyricsResponse {
                                found: true,
                                is_synced: true,
                                lyrics: synced.to_string(),
                                title: title.to_string(),
                                artist: artist.to_string(),
                                source: "LRCLIB (Synced)".to_string(),
                            };
                        }
                    }
                    if let Some(plain) = data.get("plainLyrics").and_then(|p| p.as_str()) {
                        if !plain.is_empty() {
                            return LyricsResponse {
                                found: true,
                                is_synced: false,
                                lyrics: plain.to_string(),
                                title: title.to_string(),
                                artist: artist.to_string(),
                                source: "LRCLIB (Plain)".to_string(),
                            };
                        }
                    }
                }
            }
        }

        // 2. Search fallback
        let search_url = format!(
            "https://lrclib.net/api/search?q={}",
            urlencoding::encode(&format!("{} {}", clean_title, clean_artist))
        );

        if let Ok(resp) = self.client.get(&search_url).send().await {
            if resp.status().is_success() {
                if let Ok(items) = resp.json::<Vec<Value>>().await {
                    if let Some(first) = items.first() {
                        if let Some(synced) = first.get("syncedLyrics").and_then(|s| s.as_str()) {
                            if !synced.is_empty() {
                                return LyricsResponse {
                                    found: true,
                                    is_synced: true,
                                    lyrics: synced.to_string(),
                                    title: title.to_string(),
                                    artist: artist.to_string(),
                                    source: "LRCLIB (Search Synced)".to_string(),
                                };
                            }
                        }
                        if let Some(plain) = first.get("plainLyrics").and_then(|p| p.as_str()) {
                            if !plain.is_empty() {
                                return LyricsResponse {
                                    found: true,
                                    is_synced: false,
                                    lyrics: plain.to_string(),
                                    title: title.to_string(),
                                    artist: artist.to_string(),
                                    source: "LRCLIB (Search Plain)".to_string(),
                                };
                            }
                        }
                    }
                }
            }
        }

        LyricsResponse {
            found: false,
            is_synced: false,
            lyrics: "No synchronized lyrics found for this track.".to_string(),
            title: title.to_string(),
            artist: artist.to_string(),
            source: "None".to_string(),
        }
    }
}
