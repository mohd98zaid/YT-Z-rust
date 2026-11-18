use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE, USER_AGENT};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StreamInfo {
    #[serde(rename = "videoId")]
    pub video_id: String,
    #[serde(rename = "streamUrl")]
    pub stream_url: String,
    pub codec: String,
    pub format: String,
    pub bitrate: i64,
    #[serde(rename = "sampleRate")]
    pub sample_rate: i64,
    #[serde(rename = "bitDepth")]
    pub bit_depth: i64,
    #[serde(rename = "isLossless")]
    pub is_lossless: bool,
    #[serde(rename = "qualityTier")]
    pub quality_tier: String,
    pub source: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SponsorBlockSegment {
    pub category: String,
    pub action_type: String,
    pub segment: (f64, f64),
}

#[derive(Clone)]
struct CachedStream {
    info: StreamInfo,
    cached_at: Instant,
}

#[derive(Clone)]
pub struct StreamResolver {
    client: reqwest::Client,
    cache: Arc<Mutex<HashMap<String, CachedStream>>>,
}

impl StreamResolver {
    pub fn new() -> Self {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert(
            USER_AGENT,
            HeaderValue::from_static("com.google.android.apps.youtube.music/6.40.52 (Linux; U; Android 14; en_US) gzip"),
        );
        let client = reqwest::Client::builder()
            .default_headers(headers)
            .build()
            .unwrap_or_default();

        Self {
            client,
            cache: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn resolve_audio(&self, video_id: &str) -> Result<StreamInfo, String> {
        // 1. Check in-memory cache (valid for 3 hours)
        {
            let cache = self.cache.lock().unwrap();
            if let Some(cached) = cache.get(video_id) {
                if cached.cached_at.elapsed() < Duration::from_secs(3600 * 3) {
                    return Ok(cached.info.clone());
                }
            }
        }

        // 2. Query InnerTube Player API using ANDROID_MUSIC client
        let player_body = json!({
            "context": {
                "client": {
                    "clientName": "ANDROID_MUSIC",
                    "clientVersion": "6.40.52",
                    "androidSdkVersion": 34,
                    "hl": "en",
                    "gl": "US"
                }
            },
            "videoId": video_id
        });

        let resp = self
            .client
            .post("https://music.youtube.com/youtubei/v1/player")
            .json(&player_body)
            .send()
            .await
            .map_err(|e| format!("Player API network error: {}", e))?;

        let res_json: Value = resp.json().await.map_err(|e| format!("JSON parse error: {}", e))?;

        // 3. Extract highest quality audio stream from adaptiveFormats
        if let Some(adaptive) = res_json
            .pointer("/streamingData/adaptiveFormats")
            .and_then(|a| a.as_array())
        {
            let mut audio_formats: Vec<&Value> = adaptive
                .iter()
                .filter(|f| {
                    f.get("mimeType")
                        .and_then(|m| m.as_str())
                        .map(|m| m.starts_with("audio/"))
                        .unwrap_or(false)
                        && f.get("url").is_some()
                })
                .collect();

            // Sort by bitrate descending
            audio_formats.sort_by(|a, b| {
                let abr_a = a.get("bitrate").and_then(|b| b.as_i64()).unwrap_or(0);
                let abr_b = b.get("bitrate").and_then(|b| b.as_i64()).unwrap_or(0);
                abr_b.cmp(&abr_a)
            });

            if let Some(best) = audio_formats.first() {
                let stream_url = best.get("url").and_then(|u| u.as_str()).unwrap_or_default();
                let bitrate = best.get("bitrate").and_then(|b| b.as_i64()).unwrap_or(160000);
                let mime = best.get("mimeType").and_then(|m| m.as_str()).unwrap_or("audio/webm");
                let is_opus = mime.contains("opus");
                let codec = if is_opus { "opus" } else { "aac" };
                let format = if is_opus { "webm" } else { "m4a" };

                let info = StreamInfo {
                    video_id: video_id.to_string(),
                    stream_url: stream_url.to_string(),
                    codec: codec.to_string(),
                    format: format.to_string(),
                    bitrate: bitrate / 1000,
                    sample_rate: 48000,
                    bit_depth: 16,
                    is_lossless: false,
                    quality_tier: "high".to_string(),
                    source: "YouTube Music (Opus)".to_string(),
                };

                let mut cache = self.cache.lock().unwrap();
                cache.insert(
                    video_id.to_string(),
                    CachedStream {
                        info: info.clone(),
                        cached_at: Instant::now(),
                    },
                );

                return Ok(info);
            }
        }

        // 4. Subprocess fallback via yt-dlp if installed
        if let Ok(output) = tokio::process::Command::new("yt-dlp")
            .args(&[
                "-g",
                "-f",
                "bestaudio",
                &format!("https://www.youtube.com/watch?v={}", video_id),
            ])
            .output()
            .await
        {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let stream_url = stdout.lines().next().unwrap_or("").trim();
                if !stream_url.is_empty() {
                    let info = StreamInfo {
                        video_id: video_id.to_string(),
                        stream_url: stream_url.to_string(),
                        codec: "opus".to_string(),
                        format: "webm".to_string(),
                        bitrate: 160,
                        sample_rate: 48000,
                        bit_depth: 16,
                        is_lossless: false,
                        quality_tier: "high".to_string(),
                        source: "yt-dlp fallback".to_string(),
                    };
                    return Ok(info);
                }
            }
        }

        Err("Failed to resolve audio stream for track".to_string())
    }

    pub async fn get_sponsor_block_segments(&self, video_id: &str) -> Vec<SponsorBlockSegment> {
        let url = format!(
            "https://sponsor.ajay.app/api/skipSegments?videoID={}&categories=[\"sponsor\",\"selfpromo\",\"interaction\",\"intro\",\"outro\"]",
            video_id
        );

        if let Ok(resp) = self.client.get(&url).send().await {
            if resp.status().is_success() {
                if let Ok(items) = resp.json::<Vec<Value>>().await {
                    let mut segments = Vec::new();
                    for it in items {
                        if let (Some(cat), Some(seg)) = (
                            it.get("category").and_then(|c| c.as_str()),
                            it.get("segment").and_then(|s| s.as_array()),
                        ) {
                            if seg.len() >= 2 {
                                let start = seg[0].as_f64().unwrap_or(0.0);
                                let end = seg[1].as_f64().unwrap_or(0.0);
                                segments.push(SponsorBlockSegment {
                                    category: cat.to_string(),
                                    action_type: "skip".to_string(),
                                    segment: (start, end),
                                });
                            }
                        }
                    }
                    return segments;
                }
            }
        }
        Vec::new()
    }
}
