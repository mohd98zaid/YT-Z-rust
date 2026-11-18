use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE, USER_AGENT};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Clone)]
pub struct YTMusicClient {
    client: reqwest::Client,
    base_url: String,
    gl: String,
    hl: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SectionItem {
    pub title: String,
    pub items: Vec<Value>,
}

impl YTMusicClient {
    pub fn new(country: &str, language: &str) -> Self {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert(
            USER_AGENT,
            HeaderValue::from_static("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),
        );
        headers.insert("X-YouTube-Client-Name", HeaderValue::from_static("67"));
        headers.insert("X-YouTube-Client-Version", HeaderValue::from_static("1.20240101.01.00"));

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .build()
            .unwrap_or_default();

        Self {
            client,
            base_url: "https://music.youtube.com/youtubei/v1".to_string(),
            gl: country.to_string(),
            hl: language.to_string(),
        }
    }

    fn context(&self) -> Value {
        json!({
            "context": {
                "client": {
                    "clientName": "WEB_REMIX",
                    "clientVersion": "1.20240101.01.00",
                    "hl": self.hl,
                    "gl": self.gl
                }
            }
        })
    }

    // Helper: Normalize thumbnail URL
    fn normalize_thumbnail(thumbnails: &Value) -> String {
        if let Some(arr) = thumbnails.as_array() {
            if let Some(last) = arr.last() {
                if let Some(url) = last.get("url").and_then(|u| u.as_str()) {
                    let mut s = url.to_string();
                    if s.contains("=w") && s.contains("-h") {
                        if let Some(idx) = s.find('=') {
                            s.truncate(idx);
                            s.push_str("=w500-h500-l90-rj");
                        }
                    }
                    return s;
                }
            }
        }
        "".to_string()
    }

    // Helper: Extract runs text
    fn extract_runs(val: &Value) -> String {
        if let Some(text) = val.get("simpleText").and_then(|s| s.as_str()) {
            return text.to_string();
        }
        if let Some(runs) = val.get("runs").and_then(|r| r.as_array()) {
            let mut parts = Vec::new();
            for r in runs {
                if let Some(t) = r.get("text").and_then(|s| s.as_str()) {
                    parts.push(t);
                }
            }
            return parts.join("");
        }
        "".to_string()
    }

    // Helper: Parse track from MusicResponsiveListItemRenderer
    fn parse_responsive_item(item: &Value) -> Option<Value> {
        let renderer = item.get("musicResponsiveListItemRenderer")?;
        let video_id = renderer
            .get("playlistItemData")
            .and_then(|d| d.get("videoId"))
            .and_then(|v| v.as_str())
            .or_else(|| {
                renderer
                    .get("navigationEndpoint")
                    .and_then(|n| n.get("watchEndpoint"))
                    .and_then(|w| w.get("videoId"))
                    .and_then(|v| v.as_str())
            })?;

        let flex_cols = renderer.get("flexColumns")?.as_array()?;
        let title_col = flex_cols.get(0)?.get("musicResponsiveListItemFlexColumnRenderer")?.get("text")?;
        let title = Self::extract_runs(title_col);

        let mut artist = "Unknown Artist".to_string();
        let mut album = String::new();
        let mut duration = "3:30".to_string();

        if let Some(sub_col) = flex_cols.get(1).and_then(|c| c.get("musicResponsiveListItemFlexColumnRenderer")).and_then(|r| r.get("text")) {
            if let Some(runs) = sub_col.get("runs").and_then(|r| r.as_array()) {
                let texts: Vec<&str> = runs.iter().filter_map(|r| r.get("text").and_then(|t| t.as_str())).filter(|t| *t != " • ").collect();
                if let Some(a) = texts.get(0) {
                    artist = a.to_string();
                }
                if let Some(al) = texts.get(1) {
                    if al.contains(':') {
                        duration = al.to_string();
                    } else {
                        album = al.to_string();
                    }
                }
                if let Some(d) = texts.get(2) {
                    duration = d.to_string();
                }
            }
        }

        let thumbnail = renderer
            .get("thumbnail")
            .and_then(|t| t.get("musicThumbnailRenderer"))
            .and_then(|m| m.get("thumbnail"))
            .and_then(|th| th.get("thumbnails"))
            .map(|th| Self::normalize_thumbnail(th))
            .unwrap_or_default();

        Some(json!({
            "id": video_id,
            "videoId": video_id,
            "title": title,
            "artist": artist,
            "album": album,
            "duration": duration,
            "thumbnail": thumbnail,
            "isExplicit": false
        }))
    }

    // --- Search ---
    pub async fn search(&self, query: &str, filter: Option<&str>) -> Result<Vec<Value>, String> {
        let mut body = self.context();
        body["query"] = json!(query);

        // Filter parameter for songs vs videos
        if let Some(f) = filter {
            match f {
                "songs" => {
                    body["params"] = json!("egWKAQIIAWoQEAMQBBAJEAoQBRAREBAQFQ%3D%3D");
                }
                "videos" => {
                    body["params"] = json!("egWKAQIIAmoQEAMQBBAJEAoQBRAREBAQFQ%3D%3D");
                }
                _ => {}
            }
        }

        let resp = self
            .client
            .post(format!("{}/search", self.base_url))
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let res_json: Value = resp.json().await.map_err(|e| e.to_string())?;

        let mut tracks = Vec::new();
        // Traverse InnerTube search response
        if let Some(sections) = res_json
            .pointer("/contents/tabbedSearchResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents")
            .and_then(|c| c.as_array())
        {
            for sec in sections {
                if let Some(items) = sec
                    .pointer("/musicShelfRenderer/contents")
                    .or_else(|| sec.pointer("/musicCardShelfRenderer/contents"))
                    .and_then(|i| i.as_array())
                {
                    for it in items {
                        if let Some(t) = Self::parse_responsive_item(it) {
                            tracks.push(t);
                        }
                    }
                }
            }
        }

        Ok(tracks)
    }

    // --- Suggestions ---
    pub async fn get_suggestions(&self, query: &str) -> Result<Vec<String>, String> {
        let mut body = self.context();
        body["input"] = json!(query);

        let resp = self
            .client
            .post(format!("{}/music/get_search_suggestions", self.base_url))
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let res_json: Value = resp.json().await.map_err(|e| e.to_string())?;

        let mut suggestions = Vec::new();
        if let Some(contents) = res_json
            .pointer("/contents/0/searchSuggestionsSectionRenderer/contents")
            .and_then(|c| c.as_array())
        {
            for item in contents {
                if let Some(runs) = item
                    .pointer("/searchSuggestionRenderer/navigationEndpoint/searchEndpoint/query")
                    .and_then(|q| q.as_str())
                {
                    suggestions.push(runs.to_string());
                } else if let Some(runs) = item
                    .pointer("/searchSuggestionRenderer/suggestion/runs")
                    .and_then(|r| r.as_array())
                {
                    let full: String = runs
                        .iter()
                        .filter_map(|r| r.get("text").and_then(|t| t.as_str()))
                        .collect();
                    if !full.is_empty() {
                        suggestions.push(full);
                    }
                }
            }
        }

        Ok(suggestions)
    }

    // --- Home Feed ---
    pub async fn get_home(&self) -> Result<Vec<Value>, String> {
        let mut body = self.context();
        body["browseId"] = json!("FEmusic_home");

        let resp = self
            .client
            .post(format!("{}/browse", self.base_url))
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let res_json: Value = resp.json().await.map_err(|e| e.to_string())?;

        let mut sections = Vec::new();

        if let Some(sec_list) = res_json
            .pointer("/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents")
            .and_then(|c| c.as_array())
        {
            for sec in sec_list {
                if let Some(shelf) = sec.get("musicCarouselShelfRenderer") {
                    let title = shelf
                        .pointer("/header/musicCarouselShelfBasicHeaderRenderer/title")
                        .map(|t| Self::extract_runs(t))
                        .unwrap_or_else(|| "Featured".to_string());

                    let mut items = Vec::new();
                    if let Some(contents) = shelf.get("contents").and_then(|c| c.as_array()) {
                        for item in contents {
                            if let Some(t) = Self::parse_responsive_item(item) {
                                items.push(t);
                            } else if let Some(two_row) = item.get("musicTwoRowItemRenderer") {
                                let item_title = two_row
                                    .get("title")
                                    .map(|t| Self::extract_runs(t))
                                    .unwrap_or_default();
                                let item_subtitle = two_row
                                    .get("subtitle")
                                    .map(|s| Self::extract_runs(s))
                                    .unwrap_or_default();
                                let thumb = two_row
                                    .pointer("/thumbnailRenderer/musicThumbnailRenderer/thumbnail/thumbnails")
                                    .map(|th| Self::normalize_thumbnail(th))
                                    .unwrap_or_default();

                                let browse_id = two_row
                                    .pointer("/navigationEndpoint/browseEndpoint/browseId")
                                    .and_then(|b| b.as_str())
                                    .unwrap_or_default();

                                items.push(json!({
                                    "id": browse_id,
                                    "browseId": browse_id,
                                    "title": item_title,
                                    "subtitle": item_subtitle,
                                    "thumbnail": thumb,
                                    "type": if browse_id.starts_with("VL") || browse_id.starts_with("PL") { "playlist" } else { "album" }
                                }));
                            }
                        }
                    }

                    if !items.is_empty() {
                        sections.push(json!({
                            "title": title,
                            "items": items
                        }));
                    }
                }
            }
        }

        Ok(sections)
    }

    // --- Radio / Up Next ---
    pub async fn get_radio(&self, video_id: &str) -> Result<Vec<Value>, String> {
        let mut body = self.context();
        body["videoId"] = json!(video_id);

        let resp = self
            .client
            .post(format!("{}/next", self.base_url))
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let res_json: Value = resp.json().await.map_err(|e| e.to_string())?;

        let mut tracks = Vec::new();
        if let Some(tabs) = res_json
            .pointer("/contents/singleColumnMusicWatchNextResultsRenderer/tabbedRenderer/watchNextTabbedResultsRenderer/tabs")
            .and_then(|t| t.as_array())
        {
            if let Some(first_tab) = tabs.get(0) {
                if let Some(items) = first_tab
                    .pointer("/tabRenderer/content/musicQueueRenderer/content/playlistPanelRenderer/contents")
                    .and_then(|c| c.as_array())
                {
                    for it in items {
                        if let Some(panel_item) = it.get("playlistPanelVideoRenderer") {
                            let vid = panel_item.get("videoId").and_then(|v| v.as_str()).unwrap_or_default();
                            let title = panel_item.get("title").map(|t| Self::extract_runs(t)).unwrap_or_default();
                            let artist = panel_item.get("shortBylineText").map(|b| Self::extract_runs(b)).unwrap_or_default();
                            let duration = panel_item.get("lengthText").map(|l| Self::extract_runs(l)).unwrap_or_default();
                            let thumb = panel_item
                                .pointer("/thumbnail/thumbnails")
                                .map(|th| Self::normalize_thumbnail(th))
                                .unwrap_or_default();

                            if !vid.is_empty() {
                                tracks.push(json!({
                                    "id": vid,
                                    "videoId": vid,
                                    "title": title,
                                    "artist": artist,
                                    "duration": duration,
                                    "thumbnail": thumb
                                }));
                            }
                        }
                    }
                }
            }
        }

        Ok(tracks)
    }
}
