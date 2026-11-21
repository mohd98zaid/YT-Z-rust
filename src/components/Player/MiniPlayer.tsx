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
  Info,
  Video,
  Timer,
  Radio,
  Sparkles,
  Zap,
  Leaf,
  Gauge,
  Check,
  RefreshCw,
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
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
  const qualityMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (qualityMenuRef.current && !qualityMenuRef.current.contains(e.target as Node)) {
        setQualityMenuOpen(false);
      }
    };
    if (qualityMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [qualityMenuOpen]);

  if (!currentTrack) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

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
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-200"
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
                    FLAC 24-bit
                  </span>
                ) : (
                  <span className="shrink-0 px-1 py-0.2 rounded text-[8px] font-mono text-white/70 bg-white/10 border border-white/15">
                    OPUS
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
              disabled={isLoading}
              className="w-9 h-9 rounded-full liquid-glass-prominent flex items-center justify-center active:scale-90 transition-transform shadow-lg"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
      className="hidden md:flex h-20 liquid-glass border-t border-white/15 px-6 items-center justify-between shrink-0 select-none z-30 relative shadow-[0_-12px_48px_rgba(0,0,0,0.6)]"
    >
      {/* Top Thin Progress Bar (Clickable) */}
      <div
        className="absolute top-0 left-0 right-0 h-1 bg-border/60 cursor-pointer group hover:h-1.5 transition-all"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickPos = (e.clientX - rect.left) / rect.width;
          seek(clickPos * duration);
        }}
      >
        <div
          className="h-full bg-gradient-to-r from-primary to-accent relative transition-all"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* SponsorBlock Auto-Skip Notice Toast */}
      {lastSkippedNotice && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-surface-elevated/90 border border-primary/40 text-primary text-xs font-semibold px-3 py-1 rounded-full shadow-lg backdrop-blur-md animate-bounce">
          ⚡ {lastSkippedNotice}
        </div>
      )}

      {/* Desktop 3-Column Control Center (hidden md:flex) */}
      <div className="hidden md:flex items-center justify-between w-full h-full">
        {/* Left: Track Information */}
        <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
        <div
          className="relative w-14 h-14 rounded-xl overflow-hidden shadow-lg border border-border shrink-0 cursor-pointer group"
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

        <div className="min-w-0 pr-2">
          <h4
            className="font-semibold text-sm text-foreground truncate cursor-pointer hover:underline"
            onClick={() => setExpanded(true)}
          >
            {currentTrack.title}
          </h4>
          <div className="flex items-center gap-1.5 truncate">
            <p className="text-xs text-foreground-muted truncate">{currentTrack.artist}</p>
            {activeVideoSource || isVideoMode ? (
              <span
                className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-600/20 text-red-400 border border-red-500/30"
                title="Watching YouTube Cinema Video"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                VIDEO • 1080p
              </span>
            ) : showMiniPlayerCodecBadge && (
              audioQuality === 'data_saver' ? (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setQualityMenuOpen(true);
                  }}
                  className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-black tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.25)] cursor-pointer hover:scale-105 transition-transform"
                  title="Data Saver Active (~48k-70k Opus) - Click to change quality"
                >
                  SAVER
                </span>
              ) : (audioStats?.isLossless || audioQuality === 'lossless') ? (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setQualityMenuOpen(true);
                  }}
                  className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-black tracking-wider bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.25)] cursor-pointer hover:scale-105 transition-transform"
                  title={`Bit-Perfect Lossless FLAC (${audioStats?.bitDepth || 24}-bit/${Math.round((audioStats?.sampleRate || 96000)/1000)}kHz) - Click to change quality`}
                >
                  LOSSLESS
                </span>
              ) : (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setQualityMenuOpen(true);
                  }}
                  className="shrink-0 inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium bg-surface-elevated text-foreground-subtle border border-border cursor-pointer hover:text-foreground"
                  title="Click to change streaming quality"
                >
                  {audioStats?.codec?.toUpperCase() || 'OPUS'}
                </span>
              )
            )}
          </div>
        </div>

        {/* Favorite Heart Button */}
        <button
          onClick={handleToggleFavorite}
          className={`p-1.5 rounded-full hover:bg-surface-elevated transition-colors ${
            isLiked ? 'text-primary' : 'text-foreground-muted hover:text-foreground'
          }`}
          title={isLiked ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-primary' : ''}`} />
        </button>
      </div>

      {/* Center: Main Controls & Time */}
      <div className="flex flex-col items-center justify-center gap-1.5 max-w-md w-2/4">
        <div className="flex items-center gap-3">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            className={`p-1.5 rounded-full hover:bg-surface-elevated transition-colors ${
              shuffle ? 'text-primary' : 'text-foreground-muted hover:text-foreground'
            }`}
            title={shuffle ? 'Shuffle on' : 'Shuffle off'}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Previous */}
          <button
            onClick={previous}
            className="p-1.5 rounded-full text-foreground hover:bg-surface-elevated transition-colors"
            title="Previous track"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-11 h-11 rounded-full liquid-glass-prominent flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={next}
            className="p-1.5 rounded-full text-foreground hover:bg-surface-elevated transition-colors"
            title="Next track"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={cycleRepeat}
            className={`p-1.5 rounded-full hover:bg-surface-elevated transition-colors ${
              repeatMode !== 'off' ? 'text-primary' : 'text-foreground-muted hover:text-foreground'
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>

        {/* Time Progress Indicator */}
        <div className="flex items-center gap-2 text-[11px] text-foreground-subtle font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Quick Features & Volume */}
      <div className="flex items-center justify-end gap-2 w-1/4 min-w-[220px]">
        {/* 1-Click Download Current Song at Playing Quality */}
        <button
          onClick={handleDownloadCurrent}
          title={
            downloadSuccess
              ? 'Queued for Download!'
              : audioStats?.isLossless
              ? `Download Original Lossless FLAC (${audioStats.bitDepth || 24}-bit/${Math.round((audioStats.sampleRate || 44100)/1000)}kHz)`
              : 'Download Original Audio'
          }
          className={`p-2 rounded-xl transition-all ${
            downloadSuccess
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : audioStats?.isLossless
              ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
              : 'text-foreground-muted hover:text-foreground hover:bg-surface-elevated'
          }`}
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Watch Music Video */}
        {!currentTrack.isLocal && (
          <button
            onClick={() => {
              setVideoMode(true);
              setExpanded(true);
            }}
            title="Watch Music Video"
            className="p-2 rounded-xl text-foreground-muted hover:text-primary hover:bg-surface-elevated transition-all"
          >
            <Video className="w-4 h-4" />
          </button>
        )}

        {/* Synced Lyrics Toggle */}
        <button
          onClick={toggleLyrics}
          title="Synced Karaoke Lyrics"
          className={`p-2 rounded-xl transition-all ${
            isLyricsOpen
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'text-foreground-muted hover:text-foreground hover:bg-surface-elevated'
          }`}
        >
          <Mic2 className="w-4 h-4" />
        </button>

        {/* Equalizer Toggle */}
        <button
          onClick={toggleEqualizer}
          title="Graphic Equalizer"
          className={`p-2 rounded-xl transition-all ${
            isEqualizerOpen
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'text-foreground-muted hover:text-foreground hover:bg-surface-elevated'
          }`}
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Up Next Queue Toggle */}
        <button
          onClick={toggleQueue}
          title="Queue / Up Next"
          className={`p-2 rounded-xl transition-all ${
            isQueueOpen
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'text-foreground-muted hover:text-foreground hover:bg-surface-elevated'
          }`}
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Start Song Radio */}
        {!currentTrack.isLocal && (
          <button
            onClick={() => startRadio()}
            title="Start Endless Song Radio"
            className="p-2 rounded-xl text-foreground-muted hover:text-primary hover:bg-surface-elevated transition-all"
          >
            <Radio className="w-4 h-4" />
          </button>
        )}

        {/* Sleep Timer */}
        <button
          onClick={toggleSleepTimer}
          title="Sleep Timer"
          className={`p-2 rounded-xl transition-all relative ${
            sleepTimerRemaining !== null || sleepTimerStopAfterTrack
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'text-foreground-muted hover:text-foreground hover:bg-surface-elevated'
          }`}
        >
          <Timer className="w-4 h-4" />
          {(sleepTimerRemaining !== null || sleepTimerStopAfterTrack) && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary animate-ping" />
          )}
        </button>

        {/* Streaming Audio Quality & Data Saver */}
        <div className="relative" ref={qualityMenuRef}>
          <button
            onClick={() => setQualityMenuOpen(!qualityMenuOpen)}
            title={`Streaming Quality: ${audioQuality.replace('_', ' ').toUpperCase()} (Click to change)`}
            className={`p-2 rounded-xl border flex items-center gap-1 transition-all ${
              qualityMenuOpen
                ? 'bg-primary/20 text-primary border-primary shadow-sm shadow-primary/20'
                : audioQuality === 'lossless'
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                : audioQuality === 'data_saver'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface-elevated border-transparent'
            }`}
          >
            {audioQuality === 'lossless' ? (
              <Sparkles className="w-4 h-4 text-amber-400" />
            ) : audioQuality === 'data_saver' ? (
              <Leaf className="w-4 h-4 text-emerald-400" />
            ) : audioQuality === 'high' ? (
              <Zap className="w-4 h-4 text-primary" />
            ) : (
              <Gauge className="w-4 h-4" />
            )}
          </button>

          {qualityMenuOpen && (
            <div 
              style={{ backgroundColor: 'var(--bg-surface)' }}
              className="absolute right-0 bottom-full mb-3 w-84 bg-surface border border-border/80 rounded-2xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 animate-fadeIn space-y-1.5 ring-1 ring-black/10 dark:ring-white/10"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-2">
                <div>
                  <p className="text-xs font-extrabold text-foreground tracking-tight">Streaming Quality</p>
                  <p className="text-[10px] text-foreground-muted">Select audio fidelity or data saver</p>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                  {audioQuality.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-1.5">
                {[
                  {
                    id: 'lossless',
                    label: 'Lossless / Hi-Res',
                    badge: 'FLAC 24-bit',
                    desc: 'Bit-perfect audiophile stream up to 96kHz / 1411k+',
                    icon: Sparkles,
                    color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
                  },
                  {
                    id: 'high',
                    label: 'High Quality',
                    badge: '256k–320k',
                    desc: 'Maximum YouTube Music Opus fidelity & clarity',
                    icon: Zap,
                    color: 'text-primary bg-primary/10 border-primary/30',
                  },
                  {
                    id: 'standard',
                    label: 'Standard',
                    badge: '128k–160k',
                    desc: 'Balanced audio fidelity with smooth buffering',
                    icon: Gauge,
                    color: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
                  },
                  {
                    id: 'data_saver',
                    label: 'Data Saver',
                    badge: '48k–70k',
                    desc: 'Uses 70%+ less data — ideal for mobile & metered data',
                    icon: Leaf,
                    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
                  },
                  {
                    id: 'auto',
                    label: 'Auto (Adaptive)',
                    badge: 'Auto',
                    desc: 'Optimized dynamically based on track and connection',
                    icon: RefreshCw,
                    color: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
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
                          ? 'bg-primary/15 border-primary/50 text-foreground shadow-sm shadow-primary/10'
                          : 'bg-surface-elevated/60 hover:bg-surface-elevated border-border/40 hover:border-border text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                        <div className={`p-1.5 rounded-lg shrink-0 border ${opt.color}`}>
                          <OptIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                              {opt.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </div>
                          <p className="text-[10px] text-foreground-muted truncate leading-tight mt-0.5">{opt.desc}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-surface border border-border/70 text-foreground shrink-0 shadow-xs">
                        {opt.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Volume Slider */}
        <div className="flex items-center gap-1.5 ml-1">
          <button onClick={toggleMute} className="text-foreground-muted hover:text-foreground">
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-16 h-1 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>

        {/* Fullscreen Expand */}
        <button
          onClick={() => setExpanded(true)}
          title="Expand Player"
          className="p-2 rounded-xl text-foreground-muted hover:text-foreground hover:bg-surface-elevated transition-colors ml-1"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
);
};
