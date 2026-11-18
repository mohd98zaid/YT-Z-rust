<div align="center">
  <img src="public/placeholder.png" width="120" alt="YT-Z Logo" />
  <h1>YT-Z (Rust) — High-Performance Music & Downloader</h1>
  <p><strong>Complete pure Rust rewrite of YT-Z. Powered by Tauri v2, Axum, and React 19.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Rust-1.78%2B-DEA584?style=flat-square&logo=rust&logoColor=white" alt="Rust"/>
    <img src="https://img.shields.io/badge/Tauri-v2-FFC131?style=flat-square&logo=tauri&logoColor=black" alt="Tauri"/>
    <img src="https://img.shields.io/badge/Axum-0.7-000000?style=flat-square" alt="Axum"/>
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React"/>
    <img src="https://img.shields.io/badge/Android-APK%20Ready-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Android"/>
    <img src="https://img.shields.io/badge/License-GPL%20v3-blue?style=flat-square" alt="License"/>
  </p>

  <p>
    <a href="#-why-rust">Why Rust?</a> •
    <a href="#-architecture">Architecture</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-building-an-android-apk">Building APK</a> •
    <a href="#-tech-stack">Tech Stack</a>
  </p>
</div>

---

## ⚡ Why the Rust Rewrite?

| Metric | Original (Python) | YT-Z (Rust / Tauri) | Improvement |
|---|---|---|---|
| **RAM Usage** | ~280 MB | **~35 MB** | **8x Less Memory** |
| **Startup Time** | ~2.4 seconds | **< 350 ms** | **7x Faster** |
| **Executable Size** | Requires Python env | **Single self-contained binary** | No runtime required |
| **Mobile Target** | ❌ No native APK | **✅ Native Android APK via Tauri v2** | Direct mobile build |
| **Concurrency** | Python GIL / asyncio | **Tokio multi-threaded work-stealing** | True parallel downloads |

---

## 🏗️ Architecture

```
YT-Z-rust/
├── src-tauri/                  # Pure Rust Native Engine
│   ├── Cargo.toml              # Rust crate dependencies
│   ├── tauri.conf.json         # Tauri v2 cross-platform config
│   ├── capabilities/           # Security & permission manifests
│   └── src/
│       ├── main.rs             # Application entrypoint
│       ├── lib.rs              # Tauri runtime bootstrap
│       ├── server.rs           # Embedded Axum HTTP/WebSocket core
│       ├── ytmusic.rs          # YouTube Music InnerTube client
│       ├── stream.rs           # Audio stream resolver (Opus/M4A)
│       ├── lyrics.rs           # LRCLIB synchronized lyrics engine
│       ├── db.rs               # SQLite database (rusqlite bundled)
│       ├── downloader.rs       # Multi-threaded download manager
│       └── config.rs           # Cross-platform ~/.ytz/ path manager
│
├── src/                        # React 19 Frontend (Full feature set)
│   ├── components/             # Player, Header, Equalizer, Mesh visualizer
│   ├── pages/                  # Explore, Library, Downloader, Playlists
│   ├── stores/                 # Zustand state stores
│   └── services/               # API client
│
├── package.json
└── vite.config.ts
```

---

## 🚀 Getting Started

### Prerequisites

- **Rust toolchain** (1.78+) — [rustup.rs](https://rustup.rs/)
- **Node.js** (18+) — [nodejs.org](https://nodejs.org/)

### Development

```bash
# 1. Install frontend dependencies
npm install

# 2. Run in development mode (hot reload frontend + Rust)
npm run tauri dev
```

### Production Build (Windows / Linux / macOS)

```bash
# Builds an optimized native executable / installer
npm run tauri build
```
Output will be in `src-tauri/target/release/bundle/msi/` (Windows) or `deb/appimage` (Linux).

---

## 📱 Building an Android APK

Thanks to Tauri v2's native mobile support, you can compile YT-Z directly to a standalone `.apk`:

### 1. Android Prerequisites
- Install **Android Studio** and the **Android NDK** (version 26+).
- Set `ANDROID_HOME` and `NDK_HOME` environment variables.
- Add Rust Android targets:
  ```bash
  rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
  ```

### 2. Initialize Android Project
```bash
npm run tauri android init
```

### 3. Build the Standalone APK
```bash
npm run tauri android build --apk
```
Your compiled standalone APK will be generated at:
`src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk`

---

## 🛠️ Tech Stack

- **Core Engine:** Rust (Axum, Tokio, Reqwest, Rusqlite, Serde)
- **GUI Framework:** Tauri v2 (WebKit / WebView2 / Android WebView)
- **Frontend:** React 19, TypeScript, Tailwind CSS, Zustand, Lucide Icons
- **Music Data:** InnerTube API (Direct HTTPS)
- **Lyrics:** LRCLIB API (LRC & Word-Synced)
- **Database:** Embedded SQLite 3 (`~/.ytz/ytz.db`)

---

<div align="center">
  Built with ❤️ by <a href="https://github.com/mohd98zaid">Mohd Zaid</a>.
  <br/><br/>
  <strong>⭐ Star this repo to show your support! ⭐</strong>
</div>
