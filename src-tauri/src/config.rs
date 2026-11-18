use std::path::PathBuf;
use std::fs;

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub base_dir: PathBuf,
    pub db_path: PathBuf,
    pub downloads_dir: PathBuf,
    pub cache_dir: PathBuf,
}

impl AppConfig {
    pub fn new() -> Self {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        let base_dir = home.join(".ytz");
        let downloads_dir = base_dir.join("downloads");
        let cache_dir = base_dir.join("cache");
        let db_path = base_dir.join("ytz.db");

        // Ensure directories exist
        let _ = fs::create_dir_all(&base_dir);
        let _ = fs::create_dir_all(&downloads_dir);
        let _ = fs::create_dir_all(&cache_dir);

        Self {
            base_dir,
            db_path,
            downloads_dir,
            cache_dir,
        }
    }
}
