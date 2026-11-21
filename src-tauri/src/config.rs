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
        // Android: app ki private writable directory (crash fix)
        let base_dir = if cfg!(target_os = "android") {
            PathBuf::from("/data/data/com.mohdzaid.ytz/files/.ytz")
        } else {
            let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
            home.join(".ytz")
        };
        let downloads_dir = base_dir.join("downloads");
        let cache_dir = base_dir.join("cache");
        let db_path = base_dir.join("ytz.db");

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
