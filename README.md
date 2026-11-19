<div align="center">
  <img src="public/placeholder.png" width="128" alt="YT-Z Rust Logo" />
  <h1>YT-Z (Rust) — Native Hi-Fi Music Player & Cinema Downloader</h1>
  <p><strong>Pure Rust Desktop & Android Engine • Tauri v2 • Axum • React 19 • Bit-Perfect Hi-Res FLAC • 4K Cinema</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Rust-1.78%2B-DEA584?style=flat-square&logo=rust&logoColor=white" alt="Rust"/>
    <img src="https://img.shields.io/badge/Tauri-v2-FFC131?style=flat-square&logo=tauri&logoColor=black" alt="Tauri v2"/>
    <img src="https://img.shields.io/badge/Axum-0.7-000000?style=flat-square" alt="Axum"/>
    <img src="https://img.shields.io/badge/Tokio-Async-red?style=flat-square" alt="Tokio"/>
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19"/>
    <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
    <img src="https://img.shields.io/badge/Android-APK%20Ready-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Android APK"/>
    <img src="https://img.shields.io/badge/License-GPL%20v3-blue?style=flat-square" alt="License"/>
  </p>

  <p>
    <a href="#-why-rust">Why Rust?</a> •
    <a href="#-key-pillars">Key Pillars</a> •
    <a href="#-architecture">Architecture</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-building-an-android-apk">Android APK</a> •
    <a href="#-keyboard-shortcuts">Shortcuts</a> •
    <a href="#-tech-stack">Tech Stack</a>
  </p>
</div>

---

> **YT-Z (Rust)** is a ground-up native desktop and mobile rewrite of the YT-Z audiophile music and cinema platform. Engineered in pure **Rust (Tauri v2 + Axum + Tokio)** with a modern **React 19 & Tailwind CSS** interface, it delivers single-binary distribution, instant cold starts (<350ms), an ultra-lean memory footprint (~35MB RAM), and cross-compilation for Windows, Linux, macOS, and native Android APKs.

---

## ⚡ Why the Rust Rewrite?

| Metric | Python Backend | YT-Z Native Rust (Tauri v2) | Impact |
|---|---|---|---|
| **RAM Consumption** | ~280 MB | **~35 MB** | **8x Less Memory** |
| **Cold Startup Time** | ~2.4 seconds | **< 350 ms** | **7x Faster Launch** |
| **Binary Distribution** | Requires Python env & venv | **Single standalone executable** | Zero runtime dependencies |
| **Concurrency Model** | Python GIL / asyncio threads | **Tokio multi-threaded work-stealing** | High-throughput async I/O |
| **Database Driver** | SQLite via Python C-bindings | **Embedded `rusqlite` bundled in binary** | Sub-millisecond queries |
| **Mobile Compilation** | ❌ Desktop/browser only | **✅ Native Android APK via Tauri v2 CLI** | Direct phone/tablet support |

---

## 🌟 Key Pillars

### 🎼 1. Hi-Res Lossless Audio Architecture (FLAC 24-bit / 96kHz)
- **Multi-Source Audio Resolver**: Resolves high-fidelity FLAC audio and high-bitrate Opus streams directly from YouTube Music InnerTube and decentralized lossless mirror nodes.
- **Hardware WebAudio Pipeline**: Inspect the full signal path from input stream to hardware DAC:
  $$\text{Master Stream (FLAC 24-bit)} \longrightarrow \text{WebAudio Decoder} \longrightarrow \text{Passthrough Resampler} \longrightarrow \text{10-Band EQ DSP} \longrightarrow \text{System DAC}$$
- **Data Saver Mode**: One-click toggling down to 48k–70k Opus for mobile or metered data connections.

### 🔬 2. Real-Time Audio Pipeline Diagnostics ("Stats for Nerds")
- Instant HUD modal showing source provider, audio codec, bit depth (16-bit / 24-bit float), sample rate (44.1 kHz / 96.0 kHz), bitrate, resampler state, and 10-band DSP gain curves.

### 🎬 3. YouTube Cinema Player & Error 150/152 Auto-Bypass
- **4K Cinema Theater**: Watch full-resolution official music videos and live performances with Picture-in-Picture sidebar docking.
- **Auto-Bypass for Restricted Embeds**: When record labels restrict iframe embedding (Error 150/152), the embedded Rust Axum streaming proxy serves progressive video streams with full HTTP 206 Partial Content range support.
- **Strict Mutual Exclusion**: Audio and video streams are strictly decoupled—launching video playback stops and unloads all audio, and playing songs closes active cinema sessions.

### 📥 4. Bit-Perfect Original Stream Downloader
- **Original Quality Priority**: When a lossless FLAC or high-bitrate Opus track is playing, the 1-click download button resolves and saves the exact bit-perfect stream rather than re-encoding.
- **Multi-Format Studio Converter**: Export to FLAC, MP3 (320k), M4A, Opus, WAV, and 4K MP4.
- **ID3 Tagging & Album Artwork**: Automatically writes title, artist, album, and high-resolution cover art into output metadata.

### 🎤 5. Apple Music Synced Karaoke Lyrics
- Syllable-level and word-by-word synced scrolling powered by LRCLIB.
- Dual-mode presentation: **Split View** (side-by-side with album art) and **Fullscreen Mode** with responsive fluid ambient backgrounds.

### 🎨 6. 30+ Curated Themes & Ambient Mesh
- Includes Apple Music Light & Dark, OLED Pitch Black, Cyberpunk Neon, Tokyo Twilight, Purple Velvet, and Sunset Glow.
- High-contrast, solid UI elements guaranteed to render cleanly across all color schemes.

---

## 🏗️ Architecture

```
YT-Z-rust/
├── src-tauri/                  # Pure Rust Native Core
│   ├── Cargo.toml              # Rust crate dependencies (Tauri v2, Axum, Tokio)
│   ├── tauri.conf.json         # Window geometry, CSP, permissions & bundle config
│   ├── build.rs                # Tauri build orchestrator
│   ├── capabilities/           # Security manifests (fs, shell, window policies)
│   └── src/
│       ├── main.rs             # Native application entrypoint
│       ├── lib.rs              # Tauri runtime bootstrap & plugin initializers
│       ├── server.rs           # Embedded Axum HTTP/WebSocket streaming server (port 47892)
│       ├── ytmusic.rs          # YouTube Music InnerTube API client
│       ├── stream.rs           # Multi-engine audio & progressive video stream resolver
│       ├── lyrics.rs           # LRCLIB synchronized lyrics engine
│       ├── db.rs               # SQLite embedded database manager (rusqlite)
│       ├── downloader.rs       # Parallel multi-part download engine
│       └── config.rs           # Cross-platform ~/.ytz/ path manager
│
├── src/                        # React 19 Desktop UI
│   ├── components/
│   │   ├── Header.tsx          # Omnibar search, theme picker, shortcuts modal trigger
│   │   ├── Sidebar.tsx         # Navigation & sidebar PiP cinema anchor
│   │   ├── Lyrics/             # Synced karaoke lyrics renderer
│   │   └── Player/
│   │       ├── MiniPlayer.tsx            # Bottom player bar & quality selector
│   │       ├── ExpandedPlayer.tsx        # Apple Music ambient visualizer
│   │       ├── PersistentVideoPlayer.tsx # Direct-bypass video player
│   │       ├── AudioPipelineModal.tsx    # Live hardware signal path diagnostics
│   │       └── EqualizerModal.tsx        # 10-Band studio equalizer
│   ├── pages/                  # Home, Explore, YouTube, Downloader, Library, Settings
│   ├── stores/                 # Zustand stores (Player, Video, Navigation, Download, Theme)
│   ├── services/               # REST client connecting to embedded Axum backend
│   └── themes/presets.ts       # 30+ curated color themes
│
├── .gitignore                  # Comprehensive build & target exclusion rules
├── package.json                # Frontend toolchain dependencies
├── vite.config.ts              # Vite bundling config
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Rust toolchain** (1.78+) — [rustup.rs](https://rustup.rs/)
- **Node.js** (18+) & **npm** — [nodejs.org](https://nodejs.org/)
- **C++ Build Tools**:
  - *Windows*: Visual Studio C++ Build Tools (MSVC)
  - *Linux*: `libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libayatana-appindicator3-dev librsvg2-dev`
  - *macOS*: Xcode Command Line Tools

---

### Development Mode

```bash
# 1. Install frontend dependencies
npm install

# 2. Launch live development environment (hot-reloads both Rust and React UI)
npm run tauri dev
```

---

### Production Build (Standalone Desktop Installers)

To compile a native, highly optimized single binary for your operating system:

```bash
npm run tauri build
```

Generated installer packages:
- **Windows**: `src-tauri/target/release/bundle/msi/` or `bundle/nsis/` (`.exe` / `.msi`)
- **Linux**: `src-tauri/target/release/bundle/deb/` or `bundle/appimage/` (`.deb` / `.AppImage`)
- **macOS**: `src-tauri/target/release/bundle/dmg/` (`.dmg` / `.app`)

---

## 📱 Building an Android APK

With Tauri v2's native mobile architecture, YT-Z can compile directly to a standalone Android APK:

### 1. Android Prerequisites
1. Install **Android Studio** and the **Android NDK** (version 26+).
2. Set environment variables:
   ```bash
   export ANDROID_HOME="$HOME/AppData/Local/Android/Sdk"
   export NDK_HOME="$ANDROID_HOME/ndk/<version>"
   ```
3. Install Rust Android compilation targets:
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

Your compiled APK will be output to:
```
src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk
```

---

## 🎹 Keyboard Shortcuts

Press `?` anywhere in the app to display the live shortcut overlay:

| Key | Action |
|---|---|
| `Space` | Play / Pause active stream |
| `→` | Seek 10 seconds forward |
| `←` | Rewind 10 seconds backward |
| `Shift + →` | Next track in queue |
| `Shift + ←` | Previous track |
| `↑` / `↓` | Increase / Decrease volume |
| `M` | Mute / Unmute audio |
| `L` | Toggle Synced Lyrics panel |
| `F` | Toggle Fullscreen Mode |
| `S` | Toggle Shuffle |
| `R` | Cycle Repeat (Off / All / One) |
| `D` | 1-Click Download currently playing song |
| `?` | Open Keyboard Shortcuts HUD |
| `Esc` | Close modal / collapse player |

---

## ⚙️ Configuration & Data Storage

YT-Z stores all configuration, local caches, and database files in your user home directory:

```
~/.ytz/
├── ytz.db           # SQLite database (playlists, listening history, favorites)
├── cache/           # Stream cache & album art cache (auto-managed)
└── downloads/       # Downloaded FLAC/MP3 audio and 4K video files
```

The database schema and directories are shared between both Python and Rust versions, ensuring seamless transition between engines.

---

## 🛠️ Tech Stack

- **Core Engine:** Pure Rust 2021 Edition
- **Async Runtime:** Tokio
- **Embedded Web Framework:** Axum 0.7 + Tower HTTP
- **Desktop & Mobile Shell:** Tauri v2
- **Database:** Embedded SQLite via bundled `rusqlite`
- **HTTP Client:** Reqwest (streaming range proxy)
- **Frontend UI:** React 19, TypeScript, Vite, Tailwind CSS, Zustand, Lucide Icons
- **Audio Pipeline:** WebAudio API (Bit-perfect passthrough, 10-Band Biquad Filter EQ)

---

## 📜 License

This project is licensed under the **GNU General Public License v3.0**. See the [LICENSE](LICENSE) file for complete details.

---

<div align="center">
  Built with ❤️ by <a href="https://github.com/mohd98zaid">Mohd Zaid</a>.
  <br/><br/>
  <strong>⭐ Star this repo on GitHub if you enjoy using YT-Z! ⭐</strong>
</div>
