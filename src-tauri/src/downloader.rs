use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadItem {
    pub id: String,
    pub url: String,
    pub title: String,
    pub artist: String,
    pub thumbnail: String,
    #[serde(rename = "downloadType")]
    pub download_type: String, // "audio" | "video"
    pub format: String,        // "mp3" | "mp4" | "flac"
    pub quality: String,       // "320k" | "1080p" | "best"
    pub status: String,        // "queued" | "downloading" | "completed" | "error"
    pub progress: f64,
    pub error: Option<String>,
}

#[derive(Clone)]
pub struct DownloaderEngine {
    downloads_dir: PathBuf,
    queue: Arc<Mutex<Vec<DownloadItem>>>,
    history: Arc<Mutex<Vec<DownloadItem>>>,
}

impl DownloaderEngine {
    pub fn new(downloads_dir: PathBuf) -> Self {
        Self {
            downloads_dir,
            queue: Arc::new(Mutex::new(Vec::new())),
            history: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn get_queue(&self) -> Vec<DownloadItem> {
        self.queue.lock().unwrap().clone()
    }

    pub fn get_history(&self) -> Vec<DownloadItem> {
        self.history.lock().unwrap().clone()
    }

    pub fn enqueue(
        &self,
        url: &str,
        title: &str,
        artist: &str,
        thumbnail: &str,
        download_type: &str,
        format: &str,
        quality: &str,
    ) -> String {
        let id = format!("dl_{}", chrono::Utc::now().timestamp_millis());
        let item = DownloadItem {
            id: id.clone(),
            url: url.to_string(),
            title: title.to_string(),
            artist: artist.to_string(),
            thumbnail: thumbnail.to_string(),
            download_type: download_type.to_string(),
            format: format.to_string(),
            quality: quality.to_string(),
            status: "queued".to_string(),
            progress: 0.0,
            error: None,
        };

        {
            let mut q = self.queue.lock().unwrap();
            q.push(item.clone());
        }

        // Spawn background worker for download execution
        let self_clone = self.clone();
        let item_clone = item.clone();
        tokio::spawn(async move {
            self_clone.process_download(item_clone).await;
        });

        id
    }

    async fn process_download(&self, mut item: DownloadItem) {
        // Update status to downloading
        {
            let mut q = self.queue.lock().unwrap();
            if let Some(it) = q.iter_mut().find(|i| i.id == item.id) {
                it.status = "downloading".to_string();
                it.progress = 10.0;
            }
        }

        let out_template = self.downloads_dir.join("%(title)s.%(ext)s");
        let out_str = out_template.to_string_lossy().to_string();

        let mut cmd = tokio::process::Command::new("yt-dlp");
        if item.download_type == "audio" {
            cmd.args(&[
                "-x",
                "--audio-format",
                &item.format,
                "--audio-quality",
                if item.quality.is_empty() { "0" } else { &item.quality },
                "--embed-thumbnail",
                "--add-metadata",
                "-o",
                &out_str,
                &item.url,
            ]);
        } else {
            cmd.args(&[
                "-f",
                "bestvideo+bestaudio/best",
                "--merge-output-format",
                "mp4",
                "-o",
                &out_str,
                &item.url,
            ]);
        }

        let res = cmd.output().await;

        let mut q = self.queue.lock().unwrap();
        let mut h = self.history.lock().unwrap();

        // Remove from queue
        q.retain(|it| it.id != item.id);

        match res {
            Ok(output) if output.status.success() => {
                item.status = "completed".to_string();
                item.progress = 100.0;
                h.insert(0, item);
            }
            Ok(output) => {
                let err = String::from_utf8_lossy(&output.stderr).to_string();
                item.status = "error".to_string();
                item.error = Some(err);
                h.insert(0, item);
            }
            Err(e) => {
                item.status = "error".to_string();
                item.error = Some(format!("yt-dlp execution error: {}", e));
                h.insert(0, item);
            }
        }
    }
}
