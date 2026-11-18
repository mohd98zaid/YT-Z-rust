import React, { useState } from 'react';
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
} from 'lucide-react';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useDownloadStore } from '../../stores/useDownloadStore';
import { api } from '../../services/api';

export const MiniPlayer: React.FC = () => {
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
  } = usePlayerStore();

  const { queueDownload } = useDownloadStore();
  const [isLiked, setIsLiked] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

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
      const url = currentTrack.isLocal
        ? currentTrack.filePath || ''
        : `https://www.youtube.com/watch?v=${currentTrack.videoId || currentTrack.id}`;
      await queueDownload({
        url,
        download_type: 'audio',
        format: 'mp3',
        quality: '320',
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

  return (
    <div className="h-20 bg-surface/95 border-t border-border backdrop-blur-2xl px-4 flex items-center justify-between shrink-0 select-none z-30 relative shadow-2xl">
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
            {showMiniPlayerCodecBadge && (
              audioStats?.isLossless ? (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(true);
                    toggleStatsForNerds();
                  }}
                  className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-black tracking-wider bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.25)] cursor-pointer hover:scale-105 transition-transform"
                  title={`Bit-Perfect Lossless FLAC (${audioStats.bitDepth || 16}-bit/${Math.round((audioStats.sampleRate || 44100)/1000)}kHz)`}
                >
                  LOSSLESS
                </span>
              ) : (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(true);
                    toggleStatsForNerds();
                  }}
                  className="shrink-0 inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium bg-surface-elevated text-foreground-subtle border border-border/50 cursor-pointer hover:text-foreground"
                  title="Standard YouTube Music Opus stream (160-256kbps)"
                >
                  {audioStats?.codec?.toUpperCase() || 'OPUS'}
                </span>
              )
            )}
            {activeVideoSource && (
              <span
                className="shrink-0 inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-600/20 text-red-400 border border-red-500/30 animate-pulse"
                title="Audio playback is paused while video is active"
              >
                Video Active
              </span>
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
            className="w-10 h-10 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
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
        {/* 1-Click Download Current Song */}
        <button
          onClick={handleDownloadCurrent}
          title={downloadSuccess ? 'Queued for Download!' : 'Download this song (320k MP3)'}
          className={`p-2 rounded-xl transition-all ${
            downloadSuccess
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
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
  );
};
