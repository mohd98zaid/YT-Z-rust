import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Maximize2,
  Mic2,
  Sliders,
  ListMusic,
  Download,
  Heart,
  Video,
  Timer,
  Radio,
  Sparkles,
  Zap,
  Leaf,
  Gauge,
  Check,
  RefreshCw,
  MoreHorizontal,
  Activity,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useDownloadStore } from '../../stores/useDownloadStore';
import { api } from '../../services/api';

interface MiniPlayerProps {
  mode?: 'desktop' | 'mobile' | 'both';
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ mode = 'both' }) => {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeatMode,
    isExpanded,
    isVideoMode,
    isLyricsOpen,
    isEqualizerOpen,
    isQueueOpen,
    lastSkippedNotice,
    audioStats,
    showMiniPlayerCodecBadge,
    twoSongCache,
    activeVideoSource,
    sleepTimerRemaining,
    sleepTimerStopAfterTrack,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    setExpanded,
    setVideoMode,
    toggleLyrics,
    toggleEqualizer,
    toggleQueue,
    toggleStatsForNerds,
    toggleSleepTimer,
    startRadio,
    audioQuality,
    setAudioQuality,
  } = usePlayerStore();

  const { queueDownload } = useDownloadStore();
  const [isLiked, setIsLiked] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const qualityMenuRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentTrack) return;
    api.getFavorites()
      .then((favs) => {
        if (Array.isArray(favs)) {
          setIsLiked(favs.some((f) => f.id === currentTrack.id || (f.videoId && f.videoId === currentTrack.videoId)));
        }
      })
      .catch(() => {});
  }, [currentTrack?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setMoreMenuOpen(false);
      }
      if (qualityMenuRef.current && !qualityMenuRef.current.contains(target)) {
        setQualityMenuOpen(false);
      }
    };
    if (moreMenuOpen || qualityMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [moreMenuOpen, qualityMenuOpen]);

  if (!currentTrack) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    seek(ratio * duration);
  };

  const handleDownloadCurrent = async () => {
    if (!currentTrack) return;
    try {
      const isLossless = Boolean(audioStats?.isLossless || audioQuality === 'lossless');
      const playingFormat = isLossless ? 'flac' : 'mp3';
      const playingQuality = isLossless ? 'lossless' : (audioStats?.bitrate ? String(audioStats.bitrate) : '320');

      const url = currentTrack.isLocal
        ? currentTrack.filePath || ''
        : `https://www.youtube.com/watch?v=${currentTrack.videoId || currentTrack.id}`;
      await queueDownload({
        url,
        download_type: 'audio',
        format: playingFormat,
        quality: playingQuality,
        title: currentTrack.title,
        artist: currentTrack.artist,
        thumbnail: currentTrack.thumbnail,
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to queue current song download', err);
    }
  };

  const handleToggleFavorite = async () => {
    if (!currentTrack) return;
    try {
      if (isLiked) {
        await api.removeFavorite(currentTrack.id);
        setIsLiked(false);
      } else {
        await api.addFavorite(currentTrack);
        setIsLiked(true);
      }
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    }
  };

  if (mode === 'mobile') {
    return (
      <div 
        className="relative w-full liquid-glass rounded-2xl p-2 select-none overflow-hidden active:scale-[0.99] transition-transform shadow-2xl"
      >
        {/* Micro Progress Bar along bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden rounded-b-2xl pointer-events-none">
          {/* Two-Song Cache Slot 1 Buffer Progress */}
          <div
            className="absolute top-0 left-0 h-full bg-white/25 rounded-full transition-all duration-300 pointer-events-none"
            style={{ width: `${twoSongCache?.currentLoaded ? 100 : (twoSongCache?.currentBufferPercent || 0)}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-200 relative z-10"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between w-full gap-2.5">
          {/* Artwork + Track Details (Tap to Expand Fullscreen Player) */}
          <div
            onClick={() => setExpanded(true)}
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer py-0.5"
          >
            <div className="relative shrink-0">
              <img
                src={currentTrack.thumbnail || '/placeholder.png'}
                alt={currentTrack.title}
                className="w-11 h-11 rounded-xl object-cover shadow-md border border-white/15"
              />
              {isPlaying && (
                <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-primary flex items-center justify-center ring-2 ring-[#14151b]">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 pr-1">
              <h4 className="font-bold text-xs text-white truncate drop-shadow-sm">{currentTrack.title}</h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-[11px] text-white/80 truncate">{currentTrack.artist}</p>
                {audioStats?.isLossless ? (
                  <span className="shrink-0 px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono tracking-wider">
                    {audioStats?.codec?.toUpperCase() || 'FLAC'} {audioStats?.bitDepth || 24}-bit
                  </span>
                ) : audioStats?.bitrate && audioStats.bitrate >= 320 ? (
                  <span className="shrink-0 px-1.5 py-0.2 rounded text-[8px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 font-mono tracking-wider">
                    320k HQ
                  </span>
                ) : (
                  <span className="shrink-0 px-1 py-0.2 rounded text-[8px] font-mono text-white/70 bg-white/10 border border-white/15">
                    {audioStats?.codec?.toUpperCase() || 'OPUS'} {audioStats?.bitrate ? `${audioStats.bitrate}k` : '160k'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Play/Pause & Skip Controls */}
          <div className="flex items-center gap-1 shrink-0 pr-1">
            <button
              onClick={previous}
              className="p-1.5 text-white/80 hover:text-white active:scale-90 transition-transform"
              title="Previous track"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white text-zinc-950 flex items-center justify-center active:scale-90 transition-transform shadow-lg cursor-pointer hover:bg-zinc-100"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={next}
              className="p-1.5 text-white/80 hover:text-white active:scale-90 transition-transform"
              title="Next track"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="hidden md:flex h-20 bg-[#121216]/95 backdrop-blur-2xl border-t border-white/10 px-6 items-center justify-between shrink-0 select-none z-30 relative shadow-[0_-8px_32px_rgba(0,0,0,0.6)] overflow-hidden"
    >
      {/* SponsorBlock Auto-Skip Notice Toast */}
      {lastSkippedNotice && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900/95 border border-primary/40 text-primary text-xs font-semibold px-3 py-1 rounded-full shadow-lg backdrop-blur-md animate-bounce z-40">
          ⚡ {lastSkippedNotice}
        </div>
      )}

      {/* Desktop 3-Column Control Center */}
      <div className="flex items-center justify-between w-full h-full gap-4">
        {/* Left: Track Information */}
        <div className="flex items-center gap-3 w-[28%] min-w-[200px] max-w-[320px] overflow-hidden">
          <div
            className="relative w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-xl overflow-hidden shadow-md border border-white/15 shrink-0 cursor-pointer group bg-zinc-900"
            onClick={() => setExpanded(true)}
          >
            <img
              src={currentTrack.thumbnail || '/placeholder.png'}
              alt={currentTrack.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="min-w-0 flex-1 pr-1">
            <h4
              className="font-semibold text-sm text-white truncate cursor-pointer hover:underline"
              onClick={() => setExpanded(true)}
            >
              {currentTrack.title}
            </h4>
            <div className="flex items-center gap-2 mt-0.5 truncate">
              <p className="text-xs text-zinc-400 truncate hover:text-zinc-200 transition-colors">
                {currentTrack.artist}
              </p>
              {activeVideoSource || isVideoMode ? (
                <span
                  className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-600/20 text-red-400 border border-red-500/30"
                  title="Watching Cinema Video"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  VIDEO
                </span>
              ) : showMiniPlayerCodecBadge && (
                audioQuality === 'data_saver' ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatsForNerds();
                    }}
                    className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-pointer hover:bg-emerald-500/30 transition-all"
                    title="Data Saver Active - Click to view Audio Pipeline"
                  >
                    SAVER
                  </button>
                ) : audioStats?.isLossless ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatsForNerds();
                    }}
                    className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 cursor-pointer hover:bg-amber-500/25 transition-all shadow-xs"
                    title={`Bit-Perfect Lossless ${audioStats?.codec?.toUpperCase() || 'FLAC'} (${audioStats?.bitDepth || 24}-bit/${Math.round((audioStats?.sampleRate || 48000)/1000)}kHz) - Click for Signal Path`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    {audioStats?.sampleRate && audioStats.sampleRate > 48000 ? 'HI-RES' : 'LOSSLESS'}
                  </button>
                ) : audioStats?.bitrate && audioStats.bitrate >= 320 ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatsForNerds();
                    }}
                    className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 cursor-pointer hover:bg-cyan-500/25 transition-all shadow-xs"
                    title="High Quality Lossy Stream (320 kbps AAC) - Click for Signal Path"
                  >
                    320k HQ
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatsForNerds();
                    }}
                    className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-400 bg-white/5 border border-white/10 cursor-pointer hover:text-white transition-colors"
                    title="Click for Signal Path"
                  >
                    {audioStats?.codec?.toUpperCase() || 'AAC'} {audioStats?.bitrate ? `${audioStats.bitrate}k` : '160k'}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Favorite Heart Button */}
          <button
            onClick={handleToggleFavorite}
            className={`p-1.5 rounded-full hover:bg-white/5 active:scale-90 transition-all ${
              isLiked ? 'text-primary' : 'text-zinc-400 hover:text-white'
            }`}
            title={isLiked ? 'Remove from Liked' : 'Save to Liked'}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-primary' : ''}`} />
          </button>
        </div>

        {/* Center: Main Controls & Unified Scrubber Bar */}
        <div className="flex flex-col items-center justify-center gap-1.5 flex-1 max-w-xl px-2">
          {/* Transport Buttons */}
          <div className="flex items-center gap-3">
            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded-full hover:bg-white/5 transition-colors ${
                shuffle ? 'text-primary' : 'text-zinc-400 hover:text-white'
              }`}
              title={shuffle ? 'Shuffle on' : 'Shuffle off'}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Previous */}
            <button
              onClick={previous}
              className="p-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
              title="Previous track"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            {/* Play / Pause Button - Solid High-Contrast White Circle */}
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-white text-zinc-950 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md hover:bg-zinc-100"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={next}
              className="p-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
              title="Next track"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            {/* Repeat */}
            <button
              onClick={cycleRepeat}
              className={`p-1.5 rounded-full hover:bg-white/5 transition-colors ${
                repeatMode !== 'off' ? 'text-primary' : 'text-zinc-400 hover:text-white'
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          {/* Time Scrubber Timeline */}
          <div className="flex items-center gap-3 w-full">
            <span className="text-[11px] font-mono text-zinc-400 tabular-nums w-10 text-right select-none">
              {formatTime(currentTime)}
            </span>

            {/* Interactive Progress Bar */}
            <div
              ref={progressBarRef}
              onClick={handleSeek}
              className="relative flex-1 h-3 flex items-center cursor-pointer group select-none py-1"
            >
              {/* Slider Track */}
              <div className="w-full h-1 group-hover:h-1.5 bg-zinc-700/70 rounded-full overflow-hidden transition-all relative border border-white/5">
                {/* Buffer Line */}
                <div
                  className="absolute top-0 left-0 h-full bg-white/25 transition-all duration-300"
                  style={{ width: `${twoSongCache?.currentLoaded ? 100 : (twoSongCache?.currentBufferPercent || 0)}%` }}
                />
                {/* Current Playhead */}
                <div
                  className="h-full bg-white group-hover:bg-primary transition-colors relative rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Scrubber Knob Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -ml-1.5"
                style={{ left: `${progressPercent}%` }}
              />
            </div>

            <span className="text-[11px] font-mono text-zinc-400 tabular-nums w-10 select-none">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right: Quick Features & Volume */}
        <div className="flex items-center justify-end gap-1.5 w-[28%] min-w-[200px] max-w-[320px]">
          {/* Audio Pipeline Pill */}
          <button
            onClick={toggleStatsForNerds}
            title="Inspect Live Bit-Perfect Audio Pipeline Signal Path"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs ${
              audioStats?.isLossless
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                : audioStats?.bitrate && audioStats.bitrate >= 320
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25'
                : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-primary" />
            <span>{audioStats?.isLossless ? 'LOSSLESS' : audioStats?.bitrate && audioStats.bitrate >= 320 ? '320k HQ' : 'PIPELINE'}</span>
          </button>

          {/* Synced Lyrics Toggle */}
          <button
            onClick={toggleLyrics}
            title="Synced Karaoke Lyrics"
            className={`p-2 rounded-xl transition-all ${
              isLyricsOpen
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Mic2 className="w-4 h-4" />
          </button>

          {/* Up Next Queue Toggle */}
          <button
            onClick={toggleQueue}
            title="Queue / Up Next"
            className={`p-2 rounded-xl transition-all ${
              isQueueOpen
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ListMusic className="w-4 h-4" />
          </button>

          {/* More Options Popover Menu */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              title="More Options (Equalizer, Download, Timer, Radio, Video, Quality)"
              className={`p-2 rounded-xl transition-all ${
                moreMenuOpen
                  ? 'bg-white/15 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {moreMenuOpen && (
              <div className="absolute right-0 bottom-full mb-3 w-64 bg-zinc-900/95 border border-white/15 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl z-50 animate-fadeIn space-y-1">
                {/* 1-Click Download Current Song */}
                <button
                  onClick={() => {
                    handleDownloadCurrent();
                    setMoreMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Download className={`w-4 h-4 ${downloadSuccess ? 'text-emerald-400' : 'text-primary'}`} />
                  <span>
                    {downloadSuccess
                      ? 'Queued for Download!'
                      : audioStats?.isLossless
                      ? `Download Lossless FLAC (${audioStats.bitDepth || 24}-bit)`
                      : 'Download Audio Track'}
                  </span>
                </button>

                {/* Graphic Equalizer */}
                <button
                  onClick={() => {
                    toggleEqualizer();
                    setMoreMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-colors ${
                    isEqualizerOpen
                      ? 'bg-primary/20 text-primary'
                      : 'text-zinc-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Sliders className="w-4 h-4 text-primary" />
                  <span>10-Band Studio Equalizer</span>
                </button>

                {/* Sleep Timer */}
                <button
                  onClick={() => {
                    toggleSleepTimer();
                    setMoreMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold transition-colors ${
                    sleepTimerRemaining !== null || sleepTimerStopAfterTrack
                      ? 'bg-primary/20 text-primary'
                      : 'text-zinc-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Timer className="w-4 h-4 text-primary" />
                    <span>Sleep Timer</span>
                  </div>
                  {(sleepTimerRemaining !== null || sleepTimerStopAfterTrack) && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                      Active
                    </span>
                  )}
                </button>

                {/* Start Song Radio */}
                {!currentTrack.isLocal && (
                  <button
                    onClick={() => {
                      startRadio();
                      setMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Radio className="w-4 h-4 text-primary" />
                    <span>Start Endless Radio</span>
                  </button>
                )}

                {/* Watch Music Video */}
                {!currentTrack.isLocal && (
                  <button
                    onClick={() => {
                      setVideoMode(true);
                      setExpanded(true);
                      setMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Video className="w-4 h-4 text-primary" />
                    <span>Watch Music Video</span>
                  </button>
                )}

                <div className="border-t border-white/10 pt-1 mt-1">
                  {/* Streaming Quality Selector trigger */}
                  <button
                    onClick={() => {
                      setQualityMenuOpen(true);
                      setMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Audio Quality</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-white/10 text-white">
                      {audioQuality.replace('_', ' ')}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quality Picker Dropdown (when triggered) */}
          {qualityMenuOpen && (
            <div 
              ref={qualityMenuRef}
              className="absolute right-6 bottom-full mb-3 w-80 bg-zinc-900/95 border border-white/15 rounded-2xl p-3 shadow-2xl backdrop-blur-2xl z-50 animate-fadeIn space-y-1.5"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                <div>
                  <p className="text-xs font-extrabold text-white tracking-tight">Streaming Quality</p>
                  <p className="text-[10px] text-zinc-400">Select audio fidelity mode</p>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  {audioQuality.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-1.5">
                {[
                  {
                    id: 'lossless',
                    label: 'Lossless / Hi-Res',
                    badge: 'FLAC Master',
                    desc: 'Plays bit-perfect FLAC when available with 320k HQ fallback',
                    icon: Sparkles,
                    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
                  },
                  {
                    id: 'high',
                    label: 'High Quality',
                    badge: '320k AAC',
                    desc: '320 kbps AAC / 256k Opus maximum streaming fidelity',
                    icon: Zap,
                    color: 'text-primary bg-primary/10 border-primary/30',
                  },
                  {
                    id: 'standard',
                    label: 'Standard',
                    badge: '128k–160k',
                    desc: 'Balanced audio fidelity with smooth buffering',
                    icon: Gauge,
                    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
                  },
                  {
                    id: 'data_saver',
                    label: 'Data Saver',
                    badge: '48k–70k',
                    desc: 'Uses 70%+ less data — ideal for mobile connections',
                    icon: Leaf,
                    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                  },
                  {
                    id: 'auto',
                    label: 'Auto (Adaptive)',
                    badge: 'Auto',
                    desc: 'Optimized dynamically based on track and connection',
                    icon: RefreshCw,
                    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
                  },
                ].map((opt) => {
                  const isSelected = audioQuality === opt.id;
                  const OptIcon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setAudioQuality(opt.id as any);
                        setQualityMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all border ${
                        isSelected
                          ? 'bg-primary/15 border-primary/50 text-white shadow-sm'
                          : 'bg-white/5 hover:bg-white/10 border-white/5 text-zinc-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                        <div className={`p-1.5 rounded-lg shrink-0 border ${opt.color}`}>
                          <OptIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold truncate ${isSelected ? 'text-primary' : 'text-white'}`}>
                              {opt.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </div>
                          <p className="text-[10px] text-zinc-400 truncate leading-tight mt-0.5">{opt.desc}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-white shrink-0">
                        {opt.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Volume Control */}
          <div className="flex items-center gap-1.5 ml-1">
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-16 h-1 bg-white/20 hover:bg-white/30 rounded-full appearance-none cursor-pointer accent-white transition-colors"
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>

          {/* Fullscreen Expand */}
          <button
            onClick={() => setExpanded(true)}
            title="Expand Fullscreen Player"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors ml-0.5"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
