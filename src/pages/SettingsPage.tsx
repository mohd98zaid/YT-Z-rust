import React, { useState, useEffect } from 'react';
import {
  Palette,
  Volume2,
  Download,
  ShieldCheck,
  Check,
  Sparkles,
  Folder,
  Radio,
  Puzzle,
  Sliders,
  Moon,
  ChevronDown,
  ChevronUp,
  Search,
  Activity,
  Info,
  Mic2,
  HardDrive,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { THEME_PRESETS } from '../themes/presets';
import { useThemeStore } from '../stores/useThemeStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { currentThemeId, setTheme } = useThemeStore();
  const {
    crossfadeSeconds,
    setCrossfade,
    skipSilence,
    toggleSkipSilence,
    volumeNormalization,
    toggleVolumeNormalization,
    enableStatsForNerds,
    setEnableStatsForNerds,
    lyricsEnabled,
    setLyricsEnabled,
    lyricsLayoutMode,
    setLyricsLayoutMode,
    showAudiophileSpecs,
    setShowAudiophileSpecs,
    showAudioQualityBadge,
    setShowAudioQualityBadge,
    showAudioPipelineCard,
    setShowAudioPipelineCard,
    showMiniPlayerCodecBadge,
    setShowMiniPlayerCodecBadge,
    audioQuality,
    setAudioQuality,
  } = usePlayerStore();

  const [downloadDir, setDownloadDir] = useState('');
  const [concurrency, setConcurrency] = useState(3);
  const [sponsorblockEnabled, setSponsorblockEnabled] = useState(true);
  const [discordRpcEnabled, setDiscordRpcEnabled] = useState(true);
  const [lastfmUser, setLastfmUser] = useState('');
  const [embedThumbnail, setEmbedThumbnail] = useState(true);
  const [embedMetadata, setEmbedMetadata] = useState(true);
  const [embedSubtitles, setEmbedSubtitles] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [isThemesCollapsed, setIsThemesCollapsed] = useState(true);
  const [themeFilter, setThemeFilter] = useState('all');
  const [themeSearch, setThemeSearch] = useState('');
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheToast, setCacheToast] = useState('');
  const [cacheClearedSuccess, setCacheClearedSuccess] = useState(false);

  const loadStorage = () => {
    api.getStorageInfo().then(setStorageInfo).catch(() => {});
  };

  useEffect(() => {
    loadStorage();
    api.getConfig().then((cfg) => {
      if (cfg) {
        setDownloadDir(cfg.download_dir || '');
        setConcurrency(cfg.concurrent_downloads || 3);
        setSponsorblockEnabled(cfg.sponsorblock_enabled !== false);
        setEmbedThumbnail(cfg.embed_thumbnail !== false);
        setEmbedMetadata(cfg.embed_metadata !== false);
        setEmbedSubtitles(Boolean(cfg.embed_subtitles));
      }
    }).catch(() => {});
  }, []);

  const handleSaveConfig = async () => {
    await api.updateConfig({
      download_dir: downloadDir,
      concurrent_downloads: concurrency,
      sponsorblock_enabled: sponsorblockEnabled,
      embed_thumbnail: embedThumbnail,
      embed_metadata: embedMetadata,
      embed_subtitles: embedSubtitles,
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  return (
    <div className="p-8 space-y-10 max-w-7xl mx-auto pb-28">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Settings & Customization</h1>
          <p className="text-sm text-foreground-muted mt-1">
            Configure preset themes, audio DSP, SponsorBlock, and downloader paths.
          </p>
        </div>

        {savedToast && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold animate-fadeIn">
            <Check className="w-4 h-4" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      {/* 30+ Themes Grid Section (Collapsible) */}
      <section className="space-y-4">
        {(() => {
          const currentTheme = THEME_PRESETS.find((t) => t.id === currentThemeId) || THEME_PRESETS[0];
          const filteredThemes = THEME_PRESETS.filter((t) => {
            const matchesFilter = themeFilter === 'all' || t.category.toLowerCase() === themeFilter.toLowerCase();
            const matchesSearch =
              !themeSearch.trim() ||
              t.name.toLowerCase().includes(themeSearch.toLowerCase()) ||
              t.description.toLowerCase().includes(themeSearch.toLowerCase()) ||
              t.category.toLowerCase().includes(themeSearch.toLowerCase());
            return matchesFilter && matchesSearch;
          });

          return (
            <>
              {/* Collapsible Header Card */}
              <div
                onClick={() => setIsThemesCollapsed(!isThemesCollapsed)}
                className="flex items-center justify-between p-4 sm:p-5 rounded-3xl bg-surface border border-border hover:border-primary/40 cursor-pointer shadow-xl transition-all group select-none"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-surface-elevated flex items-center justify-center border border-border text-primary group-hover:scale-105 transition-transform shrink-0 shadow-inner">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-base sm:text-lg font-bold text-foreground">
                        Theme Presets
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-primary/15 text-primary border border-primary/25">
                        30+ Themes
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-foreground-muted truncate">
                      <span>Active: <strong className="text-foreground">{currentTheme.name}</strong></span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <div className="flex items-center gap-1">
                        <div
                          className="w-2.5 h-2.5 rounded-full border border-white/20"
                          style={{ backgroundColor: currentTheme.colors.primary }}
                        />
                        <div
                          className="w-2.5 h-2.5 rounded-full border border-white/20"
                          style={{ backgroundColor: currentTheme.colors.bgSurface }}
                        />
                      </div>
                      <span className="text-foreground-subtle hidden sm:inline">({currentTheme.category})</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-xs font-bold text-primary group-hover:underline hidden sm:inline">
                    {isThemesCollapsed ? 'Show Themes' : 'Collapse'}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-foreground-muted group-hover:text-foreground transition-all">
                    {isThemesCollapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Theme Browser */}
              {!isThemesCollapsed && (
                <div className="space-y-4 pt-2">
                  {/* Category Filter Pills & Search */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-surface border border-border/80">
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'all', label: 'All (30+)' },
                        { id: 'apple', label: 'Apple' },
                        { id: 'dark', label: 'Dark / OLED' },
                        { id: 'light', label: 'Light' },
                        { id: 'vibrant', label: 'Vibrant' },
                        { id: 'retro', label: 'Retro' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setThemeFilter(cat.id)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                            themeFilter === cat.id
                              ? 'bg-primary text-white shadow-sm shadow-primary/20'
                              : 'bg-surface-elevated text-foreground-muted hover:text-foreground border border-border/60'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-56">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
                      <input
                        type="text"
                        value={themeSearch}
                        onChange={(e) => setThemeSearch(e.target.value)}
                        placeholder="Search themes..."
                        className="w-full bg-surface-elevated border border-border focus:border-primary text-foreground placeholder:text-foreground-subtle text-xs rounded-xl pl-8 pr-3 py-1.5 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Themes Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredThemes.map((theme) => {
                      const isSelected = currentThemeId === theme.id;
                      return (
                        <div
                          key={theme.id}
                          onClick={() => setTheme(theme.id)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 relative group flex flex-col justify-between ${
                            isSelected
                              ? 'border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/20 bg-surface-elevated'
                              : 'border-border bg-surface hover:border-primary/40 hover:-translate-y-0.5'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-sm text-foreground">{theme.name}</span>
                              {isSelected && (
                                <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-foreground-muted line-clamp-2">{theme.description}</p>
                          </div>

                          {/* Color Swatches */}
                          <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border/40">
                            <div
                              className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                              style={{ backgroundColor: theme.colors.bgMain }}
                              title="Background"
                            />
                            <div
                              className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                              style={{ backgroundColor: theme.colors.bgSurface }}
                              title="Surface"
                            />
                            <div
                              className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                              style={{ backgroundColor: theme.colors.primary }}
                              title="Primary"
                            />
                            <div
                              className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                              style={{ backgroundColor: theme.colors.accent }}
                              title="Accent"
                            />
                            <span className="text-[10px] text-foreground-subtle ml-auto font-mono">
                              {theme.category}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </section>

      {/* Audio Engine Configuration */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Volume2 className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Audio Playback & SponsorBlock</h2>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-6 shadow-xl space-y-6">
          {/* Crossfade Slider */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm text-foreground">Gapless Playback & Crossfade</h4>
              <p className="text-xs text-foreground-muted">
                Smoothly blend track transitions from 0 to 12 seconds.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="12"
                step="1"
                value={crossfadeSeconds}
                onChange={(e) => setCrossfade(parseInt(e.target.value))}
                className="w-36 h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="font-mono text-xs font-bold text-primary w-8">
                {crossfadeSeconds}s
              </span>
            </div>
          </div>

          {/* SponsorBlock Auto-Skip */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div>
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>SponsorBlock Auto-Skipping</span>
              </h4>
              <p className="text-xs text-foreground-muted">
                Automatically skips non-music intros, music video dialog, sponsors, and outro banter.
              </p>
            </div>
            <input
              type="checkbox"
              checked={sponsorblockEnabled}
              onChange={(e) => {
                setSponsorblockEnabled(e.target.checked);
                api.updateConfig({ sponsorblock_enabled: e.target.checked });
              }}
              className="w-5 h-5 rounded accent-primary cursor-pointer"
            />
          </div>
        </div>
      </section>

      {/* Stats for Nerds & Audiophile Display Settings */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Stats for Nerds & Audiophile Display</h2>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-6 shadow-xl space-y-6">
          {/* Master Setting: Stats for Nerds (Audio Pipeline Modal) */}
          <div className="flex items-center justify-between pb-5 border-b border-border/50">
            <div>
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                <h4 className="font-bold text-sm text-foreground">Stats for Nerds</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">
                  Audio Pipeline Modal
                </span>
              </div>
              <p className="text-xs text-foreground-muted mt-1">
                Enable the Stats for Nerds button in the player header to inspect real-time signal path architecture (stream source, 24-bit/16-bit PCM data rate, hardware decoder, resampler, and DAC output).
              </p>
            </div>
            <input
              type="checkbox"
              checked={enableStatsForNerds}
              onChange={(e) => setEnableStatsForNerds(e.target.checked)}
              className="w-5 h-5 rounded accent-primary cursor-pointer shrink-0"
            />
          </div>

          {/* Audio Quality Target */}
          <div>
            <h4 className="font-bold text-sm text-foreground mb-1">Audio Quality Target</h4>
            <p className="text-xs text-foreground-muted mb-3">
              Preferred streaming format. Lossless queries enabled add-ons (Lossless Bridge) and falls back to YouTube Music Opus.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-w-2xl">
              {[
                { id: 'lossless', label: 'Lossless FLAC', desc: 'Bit-perfect 1411k+ / 24-bit 96kHz' },
                { id: 'high', label: 'High Quality', desc: 'Opus 256k–320k enhanced stream' },
                { id: 'standard', label: 'Standard', desc: 'Opus 128k–160k balanced stream' },
                { id: 'data_saver', label: 'Data Saver', desc: 'Opus 48k–70k (uses 70%+ less data)' },
                { id: 'auto', label: 'Auto (Adaptive)', desc: 'Optimized network stream' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setAudioQuality(mode.id as any)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    audioQuality === mode.id
                      ? 'bg-primary/20 border-primary text-primary shadow-sm shadow-primary/20 font-bold'
                      : 'bg-surface-elevated/70 border-border/70 text-foreground-muted hover:text-foreground hover:bg-surface-elevated'
                  }`}
                >
                  <div className="text-xs font-bold leading-tight">{mode.label}</div>
                  <div className="text-[10px] opacity-75 mt-0.5">{mode.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 1. Audiophile Specs line below artwork */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div>
              <h4 className="font-bold text-sm text-foreground">Audiophile Specs Under Artwork</h4>
              <p className="text-xs text-foreground-muted">
                Displays the subtle codec, bit depth, sample rate, bitrate and stereo line below the vinyl artwork (e.g. FLAC · 24-bit · 96.0 kHz · 2144 kbps · Stereo).
              </p>
            </div>
            <input
              type="checkbox"
              checked={showAudiophileSpecs}
              onChange={(e) => setShowAudiophileSpecs(e.target.checked)}
              className="w-5 h-5 rounded accent-primary cursor-pointer shrink-0"
            />
          </div>

          {/* 2. Audio Quality Pill under progress bar */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div>
              <h4 className="font-bold text-sm text-foreground">Lossless / Codec Pill Under Progress Bar</h4>
              <p className="text-xs text-foreground-muted">
                Displays the centered 〰 Hi-Res Lossless or Standard Opus badge under the playback slider.
              </p>
            </div>
            <input
              type="checkbox"
              checked={showAudioQualityBadge}
              onChange={(e) => setShowAudioQualityBadge(e.target.checked)}
              className="w-5 h-5 rounded accent-primary cursor-pointer shrink-0"
            />
          </div>

          {/* 3. Audio Pipeline Shortcut Card */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div>
              <h4 className="font-bold text-sm text-foreground">Audio Pipeline Diagnostics Card</h4>
              <p className="text-xs text-foreground-muted">
                Shows the quick-access Audio Pipeline shortcut row below the player controls to inspect live signal path, decoder and output.
              </p>
            </div>
            <input
              type="checkbox"
              checked={showAudioPipelineCard}
              onChange={(e) => setShowAudioPipelineCard(e.target.checked)}
              className="w-5 h-5 rounded accent-primary cursor-pointer shrink-0"
            />
          </div>

          {/* 4. MiniPlayer Codec Pill */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div>
              <h4 className="font-bold text-sm text-foreground">MiniPlayer Lossless / Codec Badge</h4>
              <p className="text-xs text-foreground-muted">
                Displays the amber LOSSLESS or OPUS pill beside the artist name in the bottom persistent MiniPlayer bar.
              </p>
            </div>
            <input
              type="checkbox"
              checked={showMiniPlayerCodecBadge}
              onChange={(e) => setShowMiniPlayerCodecBadge(e.target.checked)}
              className="w-5 h-5 rounded accent-primary cursor-pointer shrink-0"
            />
          </div>
        </div>
      </section>

      {/* Synced Lyrics & Fullscreen Karaoke Preferences */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Mic2 className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Synced Lyrics & Karaoke Display</h2>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-6 shadow-xl space-y-6">
          {/* Master Enable/Disable Lyrics Option */}
          <div className="flex items-center justify-between pb-4 border-b border-border/50">
            <div>
              <div className="flex items-center gap-2">
                <Mic2 className="w-4 h-4 text-primary" />
                <h4 className="font-bold text-sm text-foreground">Enable Synced Lyrics Engine</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">
                  Word-Sync & Auto-Scroll
                </span>
              </div>
              <p className="text-xs text-foreground-muted mt-1">
                Automatically retrieve and display synchronized lyrics with syllable highlights and auto-centering scroll.
              </p>
            </div>
            <input
              type="checkbox"
              checked={lyricsEnabled}
              onChange={(e) => setLyricsEnabled(e.target.checked)}
              className="w-5 h-5 rounded accent-primary cursor-pointer shrink-0"
            />
          </div>

          {/* Default Lyrics Layout in Expanded Player */}
          {lyricsEnabled && (
            <div>
              <h4 className="font-bold text-sm text-foreground mb-1">Default Lyrics Layout in Player</h4>
              <p className="text-xs text-foreground-muted mb-3">
                Choose the default presentation when opening the Expanded Player. You can always switch or toggle fullscreen anytime in the player.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-xl">
                {[
                  { id: 'split', label: 'Split View', desc: 'Side-by-side artwork & synced lyrics' },
                  { id: 'fullscreen', label: 'Fullscreen Lyrics', desc: 'Immersive full-screen karaoke view' },
                  { id: 'off', label: 'Artwork Only', desc: 'Centered vinyl with lyrics closed' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setLyricsLayoutMode(mode.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      lyricsLayoutMode === mode.id
                        ? 'bg-primary/20 border-primary text-primary shadow-sm shadow-primary/20 font-bold'
                        : 'bg-surface-elevated/70 border-border/70 text-foreground-muted hover:text-foreground hover:bg-surface-elevated'
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight">{mode.label}</div>
                    <div className="text-[10px] opacity-75 mt-0.5">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Downloader Settings */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Download className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Downloader Engine Settings</h2>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-6 shadow-xl space-y-6">
          {/* Download Directory Path */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground-muted uppercase tracking-wider block">
              Download Destination Directory
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={downloadDir}
                onChange={(e) => setDownloadDir(e.target.value)}
                className="flex-1 bg-surface-elevated border border-border focus:border-primary text-foreground text-sm rounded-2xl px-4 py-3 outline-none"
              />
              <button
                onClick={handleSaveConfig}
                className="px-5 py-3 rounded-2xl bg-primary text-white font-bold text-xs shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              >
                Save Path
              </button>
            </div>
          </div>

          {/* Concurrent Downloads Slider */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div>
              <h4 className="font-bold text-sm text-foreground">Concurrent Workers</h4>
              <p className="text-xs text-foreground-muted">
                Number of simultaneous downloads in thread pool (1 to 8 workers).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={concurrency}
                onChange={(e) => setConcurrency(parseInt(e.target.value))}
                className="w-32 h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="font-mono text-xs font-bold text-primary w-6 text-center">
                {concurrency}
              </span>
            </div>
          </div>

          {/* Embed Switches */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/50">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={embedThumbnail}
                onChange={(e) => setEmbedThumbnail(e.target.checked)}
                className="w-4 h-4 rounded accent-primary"
              />
              <span className="text-xs font-semibold text-foreground">Embed High-Res Cover Art</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={embedMetadata}
                onChange={(e) => setEmbedMetadata(e.target.checked)}
                className="w-4 h-4 rounded accent-primary"
              />
              <span className="text-xs font-semibold text-foreground">Embed ID3 Audio Metadata</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={embedSubtitles}
                onChange={(e) => setEmbedSubtitles(e.target.checked)}
                className="w-4 h-4 rounded accent-primary"
              />
              <span className="text-xs font-semibold text-foreground">Embed Video Subtitles</span>
            </label>
          </div>

          <div className="pt-2 text-right">
            <button
              onClick={handleSaveConfig}
              className="px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-lg shadow-primary/20 transition-all"
            >
              Apply All Settings
            </button>
          </div>
        </div>
      </section>

      {/* Connectivity & Audio DSP Tweaks */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Radio className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">
            Connectivity & Audio DSP Tweaks
          </h2>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-6 shadow-xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Skip Silence Switch */}
            <div className="p-4 rounded-2xl bg-surface-elevated border border-border/60 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Skip Silence</span>
                </h4>
                <p className="text-xs text-foreground-muted mt-1">
                  Truncate silent intros/outros and pauses between tracks automatically.
                </p>
              </div>
              <button
                onClick={toggleSkipSilence}
                className={`w-12 h-6 rounded-full p-1 transition-colors relative flex items-center ml-4 shrink-0 ${
                  skipSilence ? 'bg-primary' : 'bg-surface border border-border'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    skipSilence ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Volume Normalization Switch */}
            <div className="p-4 rounded-2xl bg-surface-elevated border border-border/60 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-primary" />
                  <span>ReplayGain Loudness Leveling</span>
                </h4>
                <p className="text-xs text-foreground-muted mt-1">
                  Normalize master loudness to -14 LUFS standard across all albums.
                </p>
              </div>
              <button
                onClick={toggleVolumeNormalization}
                className={`w-12 h-6 rounded-full p-1 transition-colors relative flex items-center ml-4 shrink-0 ${
                  volumeNormalization ? 'bg-primary' : 'bg-surface border border-border'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    volumeNormalization ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Discord RPC Switch */}
            <div className="p-4 rounded-2xl bg-surface-elevated border border-border/60 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Radio className="w-4 h-4 text-purple-400" />
                  <span>Discord Rich Presence</span>
                </h4>
                <p className="text-xs text-foreground-muted mt-1">
                  Display current track, cover art, and progress on your Discord profile.
                </p>
              </div>
              <button
                onClick={() => setDiscordRpcEnabled(!discordRpcEnabled)}
                className={`w-12 h-6 rounded-full p-1 transition-colors relative flex items-center ml-4 shrink-0 ${
                  discordRpcEnabled ? 'bg-primary' : 'bg-surface border border-border'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    discordRpcEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Pluggable Sources Quick Jump */}
            <div className="p-4 rounded-2xl bg-surface-elevated border border-border/60 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Puzzle className="w-4 h-4 text-pink-400" />
                  <span>Pluggable Module Sources</span>
                </h4>
                <p className="text-xs text-foreground-muted mt-1">
                  Manage Hi-Res FLAC modules, lyrics providers, and scrobblers.
                </p>
              </div>
              <span className="text-xs font-bold text-primary px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 shrink-0 ml-4">
                Active in Sidebar
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Storage & Cache Management */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <HardDrive className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Storage & Cache Management</h2>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-6 shadow-xl space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-surface-elevated/60 border border-border/50">
              <span className="text-xs text-foreground-muted block font-semibold">Active Cache Size</span>
              <span className="text-2xl font-bold font-mono text-foreground mt-1 block">
                {storageInfo?.cacheSizeMB || 0} MB
              </span>
              <span className="text-[11px] text-foreground-subtle mt-0.5 block">Audio streams & temporary buffers</span>
            </div>
            <div className="p-4 rounded-2xl bg-surface-elevated/60 border border-border/50">
              <span className="text-xs text-foreground-muted block font-semibold">Offline Downloads Folder</span>
              <span className="text-2xl font-bold font-mono text-foreground mt-1 block">
                {storageInfo?.downloadsSizeMB || 0} MB
              </span>
              <span className="text-[11px] text-foreground-subtle mt-0.5 block truncate" title={storageInfo?.downloadsPath}>
                {storageInfo?.downloadsPath}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div>
              <h4 className="font-bold text-sm text-foreground">Purge Temporary Audio Cache</h4>
              <p className="text-xs text-foreground-muted">Clears cached audio stream URLs, segment buffers, and thumbnail memory.</p>
            </div>
            <button
              onClick={async () => {
                setIsClearingCache(true);
                try {
                  const res = await api.clearCache();
                  setStorageInfo((prev: any) => ({ ...prev, cacheSizeBytes: 0, cacheSizeMB: 0 }));
                  setCacheClearedSuccess(true);
                  const msg = res?.freedMB ? `Cache Purged! Freed ${res.freedMB} MB` : 'Temporary Cache Successfully Purged!';
                  setCacheToast(msg);
                  setTimeout(() => setCacheToast(''), 3500);
                  setTimeout(() => setCacheClearedSuccess(false), 2500);
                  setTimeout(loadStorage, 1500);
                } catch {
                  setCacheToast('Failed to purge cache');
                  setTimeout(() => setCacheToast(''), 3000);
                }
                setIsClearingCache(false);
              }}
              disabled={isClearingCache}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                cacheClearedSuccess
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                  : 'bg-surface-elevated hover:bg-border/60 text-foreground border-border'
              }`}
            >
              {isClearingCache ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Purging...</span>
                </span>
              ) : cacheClearedSuccess ? (
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cache Cleared</span>
                </span>
              ) : (
                'Purge Cache'
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Cache Toast Notification */}
      {cacheToast && (
        <div className="fixed bottom-24 right-8 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold shadow-xl animate-fadeIn">
          <Check className="w-4 h-4" />
          <span>{cacheToast}</span>
        </div>
      )}
    </div>
  );
};
