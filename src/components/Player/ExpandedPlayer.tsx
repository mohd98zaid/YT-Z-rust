import React, { useState, useRef } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Mic2,
  ListMusic,
  Sliders,
  Download,
  Info,
  Clock,
  Gauge,
  Video,
  Disc,
  Timer,
  Radio,
  ExternalLink,
  RefreshCw,
  Tv,
  Sparkles,
  Activity,
  ChevronRight,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Zap,
  Leaf,
  Check,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useDownloadStore } from '../../stores/useDownloadStore';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { api } from '../../services/api';
import { LyricsView } from '../Lyrics/LyricsView';
import { AudioPipelineModal } from './AudioPipelineModal';

export const ExpandedPlayer: React.FC = () => {
  const {
    currentTrack,
    queue,
    queueIndex,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackSpeed,
    shuffle,
    repeatMode,
    isExpanded,
    showStatsForNerds,
    audioStats,
    audioQuality,
    setAudioQuality,
    setExpanded,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    setPlaybackSpeed,
    toggleShuffle,
    cycleRepeat,
    toggleEqualizer,
    isEqualizerOpen,
    toggleStatsForNerds,
    playTrack,
    pause,
    pauseAudio,
    play,
    setActiveVideoSource,
    removeFromQueue,
    isVideoMode,
    setVideoMode,
    sleepTimerRemaining,
    sleepTimerStopAfterTrack,
    toggleSleepTimer,
    startRadio,
    skipSilence,
    toggleSkipSilence,
    volumeNormalization,
    toggleVolumeNormalization,
    enableStatsForNerds,
    lyricsEnabled,
    lyricsLayoutMode,
    setLyricsLayoutMode,
    showAudiophileSpecs,
    showAudioQualityBadge,
    showAudioPipelineCard,
  } = usePlayerStore();

  const { queueDownload } = useDownloadStore();
  const { navigateToYouTube } = useNavigationStore();
  const [activeTab, setActiveTab] = useState<'lyrics' | 'queue'>('lyrics');
  const [downloadQueued, setDownloadQueued] = useState(false);
  const [matchedVideos, setMatchedVideos] = useState<string[]>([]);
  const [matchedIndex, setMatchedIndex] = useState(0);
  const [resolvingVideo, setResolvingVideo] = useState(false);
  const [useDirectVideo, setUseDirectVideo] = useState(false);
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
  const qualityMenuRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const matchedVideosRef = useRef<string[]>([]);
  matchedVideosRef.current = matchedVideos;

  // Close quality dropdown when clicking outside
  React.useEffect(() => {
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

  const qualityOptions: {
    id: 'lossless' | 'high' | 'standard' | 'data_saver' | 'auto';
    label: string;
    badge: string;
    desc: string;
    icon: any;
    color: string;
  }[] = [
    {
      id: 'lossless',
      label: 'Lossless / Hi-Res',
      badge: 'FLAC 24-bit',
      desc: 'Bit-perfect audiophile stream up to 96kHz / 1411k+',
      icon: Sparkles,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
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
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    },
    {
      id: 'data_saver',
      label: 'Data Saver',
      badge: '48k–70k',
      desc: 'Uses 70%+ less data — ideal for mobile & metered data',
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
  ];

  // Automatically resolve official embeddable public video when entering Watch Video mode
  // and switch video immediately when track changes without waiting for search
  React.useEffect(() => {
    let isCancelled = false;

    if (isVideoMode && currentTrack && !currentTrack.isLocal) {
      const rawId = currentTrack.videoId || currentTrack.id;
      // Immediately reset and switch to the new track's video ID
      setMatchedVideos(rawId ? [rawId] : []);
      setMatchedIndex(0);
      setUseDirectVideo(false);
      setResolvingVideo(true);

      api.searchYouTubeVideos(`${currentTrack.title} ${currentTrack.artist} official video`, 6)
        .then((vids) => {
          if (isCancelled) return;
          if (vids && vids.length > 0) {
            // Filter out non-music tutorial, lesson, karaoke, or app promo videos
            const filtered = vids.filter((v) => {
              const t = (v.title || '').toLowerCase();
              return !t.includes('tutorial') && !t.includes('lesson') && !t.includes('how to play') && !t.includes('padhanisa') && !t.includes('reaction');
            });
            const validVids = filtered.length > 0 ? filtered : vids;
            const officialMatch = validVids[0].videoId || validVids[0].id;
            const rest = validVids.slice(1).map((v) => v.videoId || v.id).filter(Boolean);
            // Place top official public music video first (embed-permissible), then rawId, then alternates
            const combined = Array.from(new Set([officialMatch, rawId, ...rest].filter(Boolean)));
            setMatchedVideos(combined);
            setMatchedIndex(0);
          }
        })
        .catch(() => {
          if (isCancelled) return;
          setMatchedVideos(rawId ? [rawId] : []);
          setMatchedIndex(0);
        })
        .finally(() => {
          if (!isCancelled) setResolvingVideo(false);
        });
    } else {
      setMatchedVideos([]);
      setMatchedIndex(0);
      setUseDirectVideo(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [isVideoMode, currentTrack?.id, currentTrack?.videoId]);

  // Listen for YouTube embed events to sync currentTime, duration, play/pause, and track completion
  React.useEffect(() => {
    if (!isVideoMode) return;

    let playbackStarted = false;
    const directFallbackTimer = setTimeout(() => {
      if (!playbackStarted) {
        console.warn('Expanded player video embed timed out (likely Error 152). Activating direct video...');
        setUseDirectVideo(true);
      }
    }, 2800);

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data) return;

        // Auto-recover from video embed restrictions (code 150/152 = restricted embed by owner)
        const errCode = typeof data?.info?.errorCode === 'number' ? data.info.errorCode : (typeof data?.data === 'number' ? data.data : 0);
        if (errCode === 150 || errCode === 152 || errCode === 101) {
          console.warn('YouTube embed restriction detected (code ' + errCode + '), activating Direct Video Player fallback:', data);
          setUseDirectVideo(true);
          return;
        }

        // YouTube IFrame API posts 'infoDelivery' and 'initialDelivery'
        if ((data.event === 'infoDelivery' || data.event === 'initialDelivery') && data.info) {
          const info = data.info;
          if (info.playerState === 1 || info.currentTime > 0) {
            playbackStarted = true;
            clearTimeout(directFallbackTimer);
          }

          // Sync current playback time in real-time -> drives Synced Lyrics & bottom timeline scrubber
          if (typeof info.currentTime === 'number' && !isNaN(info.currentTime)) {
            usePlayerStore.setState({ currentTime: info.currentTime });
          }

          // Sync video duration if available
          if (typeof info.duration === 'number' && info.duration > 0 && !isNaN(info.duration)) {
            usePlayerStore.setState({ duration: info.duration });
          }

          // State synchronization: 1 = playing, 2 = paused, 0 = ended
          if (info.playerState === 1) {
            pauseAudio();
            setActiveVideoSource('expanded_video');
            usePlayerStore.setState({ isPlaying: true });
          } else if (info.playerState === 2) {
            usePlayerStore.setState({ isPlaying: false });
          } else if (info.playerState === 0) {
            // Video ended: advance to next track smoothly in video mode
            usePlayerStore.getState().next();
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);

    // Heartbeat to request continuous infoDelivery time updates from YouTube embed iframe
    const pingInterval = setInterval(() => {
      try {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'listening' }),
            '*'
          );
        }
      } catch {}
    }, 500);

    return () => {
      clearTimeout(directFallbackTimer);
      clearInterval(pingInterval);
      window.removeEventListener('message', handleMessage);
    };
  }, [isVideoMode, pause, setActiveVideoSource]);

  const currentVideoId =
    matchedVideos[matchedIndex] || (currentTrack ? currentTrack.videoId || currentTrack.id : '');

  const handleRedirectToInternalYouTube = () => {
    if (!currentTrack) return;
    setVideoMode(false);
    setActiveVideoSource(null);
    setExpanded(false);
    navigateToYouTube({
      id: currentVideoId,
      title: currentTrack.title,
      artist: currentTrack.artist,
    });
  };

  const handleCycleAlternateVideo = () => {
    if (matchedVideos.length > 1) {
      setMatchedIndex((prev) => (prev + 1) % matchedVideos.length);
    }
  };

  if (!isExpanded || !currentTrack) return null;

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
      setDownloadQueued(true);
      setTimeout(() => setDownloadQueued(false), 3000);
    } catch (err) {
      console.error('Failed to queue download', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex flex-col bg-background select-none overflow-hidden animate-fadeIn">
      {/* Apple Music Fluid Ambient Mesh Visualizer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {/* Layer 1: Blurred Album Cover Base */}
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-30 scale-125 transition-all duration-1000"
          style={{ backgroundImage: `url(${currentTrack.thumbnail})` }}
        />
        {/* Layer 2: Floating Organic Mesh Orbs */}
        <div className="absolute inset-0 filter blur-[90px] opacity-45 mix-blend-screen">
          <div className="absolute top-[10%] left-[15%] w-[45vw] h-[45vw] max-w-[550px] max-h-[550px] rounded-full bg-primary/40 animate-mesh-1" />
          <div className="absolute top-[40%] right-[10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full bg-rose-600/35 animate-mesh-2" />
          <div className="absolute bottom-[10%] left-[30%] w-[35vw] h-[35vw] max-w-[450px] max-h-[450px] rounded-full bg-violet-600/30 animate-mesh-3" />
        </div>
        {/* Layer 3: Glass Scrim */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-50 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b border-border/40 shrink-0">
        <button
          onClick={() => {
            setExpanded(false);
            if (isVideoMode) {
              setVideoMode(false);
              setActiveVideoSource(null);
            }
          }}
          className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-full bg-surface-elevated hover:bg-surface border border-border text-foreground hover:text-primary text-xs font-semibold transition-all hover:scale-105 shadow-sm"
          title="Minimize player"
        >
          <ChevronDown className="w-4 h-4" />
          <span className="hidden sm:inline">Minimize</span>
        </button>

        {/* Tab Selector: Lyrics vs Up Next */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-surface-elevated border border-border shadow-sm">
          {lyricsEnabled && (
            <button
              onClick={() => {
                if (lyricsLayoutMode === 'off') {
                  setLyricsLayoutMode('split');
                  setActiveTab('lyrics');
                } else if (activeTab !== 'lyrics') {
                  setActiveTab('lyrics');
                } else {
                  setLyricsLayoutMode(lyricsLayoutMode === 'fullscreen' ? 'split' : 'fullscreen');
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold transition-all ${
                activeTab === 'lyrics' && lyricsLayoutMode !== 'off'
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-foreground/80 hover:text-foreground'
              }`}
            >
              <Mic2 className="w-3.5 h-3.5" />
              <span>
                {lyricsLayoutMode === 'fullscreen' && activeTab === 'lyrics'
                  ? 'Fullscreen Lyrics'
                  : lyricsLayoutMode === 'off' && activeTab === 'lyrics'
                  ? 'Lyrics (Off)'
                  : 'Synced Lyrics'}
              </span>
            </button>
          )}
          <button
            onClick={() => {
              setActiveTab('queue');
              if (lyricsLayoutMode === 'fullscreen') {
                setLyricsLayoutMode('split');
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold transition-all ${
              activeTab === 'queue'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-foreground/80 hover:text-foreground'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Up Next ({queue.length})</span>
          </button>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          {/* Quick Lyrics View Mode Toggle */}
          {lyricsEnabled && (
            <button
              onClick={() => {
                if (lyricsLayoutMode === 'off') {
                  setLyricsLayoutMode('split');
                  setActiveTab('lyrics');
                } else if (lyricsLayoutMode === 'split') {
                  setLyricsLayoutMode('fullscreen');
                  setActiveTab('lyrics');
                } else {
                  setLyricsLayoutMode('off');
                }
              }}
              title={
                lyricsLayoutMode === 'fullscreen' && activeTab === 'lyrics'
                  ? 'Fullscreen Lyrics (Click to hide lyrics)'
                  : lyricsLayoutMode === 'split' && activeTab === 'lyrics'
                  ? 'Split Lyrics (Click for Fullscreen)'
                  : 'Lyrics hidden (Click to show lyrics)'
              }
              className={`p-1.5 sm:p-2 rounded-full border transition-all shadow-sm ${
                lyricsLayoutMode !== 'off' && activeTab === 'lyrics'
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/30'
                  : 'bg-surface-elevated hover:bg-surface text-foreground border-border hover:text-primary hover:border-primary/50'
              }`}
            >
              <Mic2 className="w-4 h-4" />
            </button>
          )}
          {/* Endless Song Radio */}
          {!currentTrack.isLocal && (
            <button
              onClick={() => startRadio()}
              title="Start Endless Song Radio"
              className="hidden sm:inline-flex p-1.5 sm:p-2 rounded-full bg-surface-elevated hover:bg-surface border border-border text-foreground hover:text-primary hover:border-primary/50 transition-all hover:scale-105 shadow-sm"
            >
              <Radio className="w-4 h-4" />
            </button>
          )}

          {/* Sleep Timer */}
          <button
            onClick={toggleSleepTimer}
            title="Sleep Timer"
            className={`p-1.5 sm:p-2 rounded-full border transition-all hover:scale-105 relative shadow-sm ${
              sleepTimerRemaining !== null || sleepTimerStopAfterTrack
                ? 'bg-primary text-white border-primary shadow-md shadow-primary/30'
                : 'bg-surface-elevated hover:bg-surface text-foreground border-border hover:text-primary hover:border-primary/50'
            }`}
          >
            <Timer className="w-4 h-4" />
            {(sleepTimerRemaining !== null || sleepTimerStopAfterTrack) && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-ping" />
            )}
          </button>

          {/* Stats for nerds toggle */}
          {enableStatsForNerds && (
            <button
              onClick={toggleStatsForNerds}
              title="Stats for Nerds"
              className={`hidden sm:inline-flex p-1.5 sm:p-2 rounded-full border transition-all shadow-sm ${
                showStatsForNerds
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/30'
                  : 'bg-surface-elevated hover:bg-surface text-foreground border-border hover:text-primary hover:border-primary/50'
              }`}
            >
              <Info className="w-4 h-4" />
            </button>
          )}

          {/* Equalizer toggle */}
          <button
            onClick={toggleEqualizer}
            title="Studio Equalizer"
            className={`p-1.5 sm:p-2 rounded-full border transition-all hover:scale-105 shadow-sm ${
              isEqualizerOpen
                ? 'bg-primary text-white border-primary shadow-md shadow-primary/30'
                : 'bg-surface-elevated hover:bg-surface border border-border text-foreground hover:text-primary hover:border-primary/50'
            }`}
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Audio Quality & Data Saver Dropdown */}
          <div className="relative z-50" ref={qualityMenuRef}>
            <button
              onClick={() => setQualityMenuOpen(!qualityMenuOpen)}
              title={`Streaming Quality: ${audioQuality.replace('_', ' ').toUpperCase()}`}
              className={`flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-full border transition-all hover:scale-105 shadow-sm backdrop-blur-md ${
                qualityMenuOpen
                  ? 'bg-primary/20 text-primary border-primary shadow-sm shadow-primary/20'
                  : audioQuality === 'lossless'
                  ? 'bg-amber-500/20 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/50 dark:border-amber-500/40 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : audioQuality === 'data_saver'
                  ? 'bg-emerald-500/20 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/50 dark:border-emerald-500/40 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : audioQuality === 'high'
                  ? 'bg-primary/15 text-primary border-primary/40 font-bold'
                  : 'bg-surface-elevated hover:bg-surface text-foreground border-border hover:text-primary hover:border-primary/50'
              }`}
            >
              {audioQuality === 'lossless' ? (
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              ) : audioQuality === 'data_saver' ? (
                <Leaf className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : audioQuality === 'high' ? (
                <Zap className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Gauge className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              )}
              <span className="text-[11px] font-bold tracking-wider uppercase">
                {audioQuality === 'lossless'
                  ? 'Hi-Res'
                  : audioQuality === 'data_saver'
                  ? 'Data Saver'
                  : audioQuality === 'high'
                  ? 'High'
                  : audioQuality === 'standard'
                  ? 'Standard'
                  : 'Auto'}
              </span>
              <ChevronDown className={`w-3 h-3 opacity-70 transition-transform ${qualityMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {qualityMenuOpen && (
              <div 
                style={{ backgroundColor: 'var(--bg-surface)' }}
                className="absolute right-0 top-full mt-2 w-84 bg-surface border border-border/80 rounded-2xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 animate-fadeIn space-y-1.5 ring-1 ring-black/10 dark:ring-white/10"
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
                  {qualityOptions.map((opt) => {
                    const isSelected = audioQuality === opt.id;
                    const OptIcon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setAudioQuality(opt.id);
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
        </div>
      </header>

      {/* Main Center Area: Split vs Fullscreen Lyrics vs Centered Artwork */}
      <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center px-6 py-2 md:px-10 gap-4 md:gap-8 overflow-hidden">
        {lyricsEnabled && lyricsLayoutMode === 'fullscreen' && activeTab === 'lyrics' ? (
          <div className="w-full max-w-4xl h-full min-h-0 flex flex-col bg-surface-glass border border-border-glass rounded-3xl backdrop-blur-xl overflow-hidden relative shadow-2xl mx-auto animate-fadeIn">
            <LyricsView
              isFullScreen={true}
              onToggleFullscreen={() => setLyricsLayoutMode('split')}
              onClose={() => setLyricsLayoutMode('off')}
            />
          </div>
        ) : (
          <div className="w-full h-full min-h-0 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8 overflow-hidden">
            {/* Left: Album Artwork with Vinyl Animation OR Embedded YouTube Video */}
            <div className={`h-full min-h-0 flex flex-col items-center justify-center mx-auto overflow-hidden py-1 transition-all duration-300 ${
              lyricsLayoutMode === 'off' && activeTab === 'lyrics'
                ? 'w-full max-w-xl'
                : 'w-full md:w-1/2 max-w-xl'
            }`}>
              {/* Song vs Video Mode Toggle Pill */}
              {!currentTrack.isLocal && (
                <div className="flex items-center gap-1 p-1 rounded-full bg-surface-elevated/80 border border-border mb-2 backdrop-blur-md shadow-lg shrink-0">
                  <button
                    onClick={() => {
                      setVideoMode(false);
                      setActiveVideoSource(null);
                      pause();
                      play();
                    }}
                    className={`flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold transition-all ${
                      !isVideoMode
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    <Disc className="w-3.5 h-3.5" />
                    <span>Song & Vinyl</span>
                  </button>
                  <button
                    onClick={() => {
                      setVideoMode(true);
                      pauseAudio();
                      setActiveVideoSource('expanded_video');
                    }}
                    className={`flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold transition-all ${
                      isVideoMode
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Watch Video</span>
                  </button>
                </div>
              )}

              {isVideoMode && !currentTrack.isLocal ? (
                <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-center gap-2">
                  <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black animate-fadeIn max-h-[38vh]">
                    {useDirectVideo ? (
                      <video
                        ref={videoElementRef}
                        key={`direct-${currentVideoId}`}
                        src={`/api/stream/${currentVideoId}/video`}
                        controls
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain bg-black"
                        onTimeUpdate={(e) => {
                          const ct = e.currentTarget.currentTime;
                          if (!isNaN(ct)) {
                            usePlayerStore.setState({ currentTime: ct });
                          }
                        }}
                        onDurationChange={(e) => {
                          const dur = e.currentTarget.duration;
                          if (!isNaN(dur) && dur > 0) {
                            usePlayerStore.setState({ duration: dur });
                          }
                        }}
                        onPlay={() => {
                          pauseAudio();
                          setActiveVideoSource('expanded_video');
                          usePlayerStore.setState({ isPlaying: true });
                        }}
                        onPause={() => {
                          usePlayerStore.setState({ isPlaying: false });
                        }}
                        onEnded={() => {
                          usePlayerStore.getState().next();
                        }}
                      />
                    ) : (
                      <iframe
                        ref={iframeRef}
                        key={currentVideoId}
                        src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&enablejsapi=1&rel=0&iv_load_policy=3&vq=hd1080&origin=${window.location.origin}`}
                        title={currentTrack.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                        onLoad={() => {
                          try {
                            iframeRef.current?.contentWindow?.postMessage(
                              JSON.stringify({ event: 'listening' }),
                              '*'
                            );
                          } catch {}
                        }}
                      />
                    )}
                  </div>

                  {/* Fallback & Internal YouTube Redirect Actions Toolbar */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1 animate-fadeIn shrink-0">
                    {/* Switch between Direct Video and Iframe Embed */}
                    <button
                      onClick={() => setUseDirectVideo(!useDirectVideo)}
                      title={useDirectVideo ? "Switch to standard YouTube Embed Player" : "Switch to Direct HTML5 Video Player (bypasses restrictions)"}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all hover:scale-105 active:scale-95 ${
                        useDirectVideo
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                          : 'bg-surface-elevated hover:bg-border/60 text-foreground border border-border'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                      <span>{useDirectVideo ? 'Direct Player Active' : 'Direct Video (Bypass Blocks)'}</span>
                    </button>

                    {/* Redirect to Internal YouTube Theater */}
                    <button
                      onClick={handleRedirectToInternalYouTube}
                      title="Watch inside internal YouTube Video Theater"
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold shadow-md shadow-red-600/25 transition-all hover:scale-105 active:scale-95"
                    >
                      <Tv className="w-3.5 h-3.5" />
                      <span>Open in YouTube Theater</span>
                    </button>

                    {/* Try Alternate YouTube Video from Search */}
                    {matchedVideos.length > 1 && (
                      <button
                        onClick={handleCycleAlternateVideo}
                        title="Switch to alternative YouTube video source"
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated hover:bg-border/60 text-foreground text-[11px] font-bold border border-border transition-all hover:scale-105 active:scale-95"
                      >
                        <RefreshCw className={`w-3 h-3 text-primary ${resolvingVideo ? 'animate-spin' : ''}`} />
                        <span>Try Alternate Video ({matchedIndex + 1}/{matchedVideos.length})</span>
                      </button>
                    )}

                    {/* Return to Song Artwork */}
                    <button
                      onClick={() => {
                        setVideoMode(false);
                        setActiveVideoSource(null);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated/70 hover:bg-surface-elevated text-foreground-muted hover:text-foreground text-[11px] font-bold transition-all"
                    >
                      <Disc className="w-3.5 h-3.5" />
                      <span>Song Deck</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative group flex-1 min-h-0 flex items-center justify-center my-auto w-full">
                  <div className="relative aspect-square h-full max-h-[30vh] sm:max-h-[34vh] max-w-[34vh] w-auto">
                    {/* Spinning Vinyl Record Layer Behind Artwork */}
                    <div
                      className={`absolute -right-7 top-1/2 -translate-y-1/2 w-[90%] h-[90%] rounded-full bg-zinc-950 border-4 border-zinc-800 shadow-2xl flex items-center justify-center ${
                        isPlaying ? 'animate-spin-slow' : ''
                      }`}
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-zinc-700/80 bg-zinc-900 flex items-center justify-center">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/80" />
                      </div>
                    </div>

                    {/* High-res Full-bleed Cover Artwork */}
                    <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-white/10 z-10 bg-surface">
                      <img
                        src={currentTrack.thumbnail || '/placeholder.png'}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Below Artwork: Audiophile Specs Line */}
              {showAudiophileSpecs && (
                <div className="mt-1.5 text-center shrink-0">
                  {isVideoMode ? (
                    <button
                      onClick={toggleStatsForNerds}
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono text-amber-700 dark:text-amber-400 hover:underline transition-colors tracking-wide cursor-pointer"
                      title="Click to view Audio Pipeline info"
                    >
                      <Video className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>YouTube Video Sync</span>
                      <span>·</span>
                      <span>AAC 160k</span>
                      <span>·</span>
                      <span>44.1 kHz</span>
                      <span>·</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-sans font-semibold">
                        Audio Reduced for Video
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={toggleStatsForNerds}
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono text-foreground-muted hover:text-foreground transition-colors tracking-wide cursor-pointer"
                      title="Click to view Audio Pipeline & Hardware Signal Path"
                    >
                      <span>{audioStats?.format || (audioStats?.isLossless ? 'FLAC' : 'OPUS')}</span>
                      <span>·</span>
                      <span>{audioStats?.bitDepth || (audioStats?.isLossless ? 24 : 16)}-bit</span>
                      <span>·</span>
                      <span>{((audioStats?.sampleRate || 48000) / 1000).toFixed(1)} kHz</span>
                      <span>·</span>
                      <span>{audioStats?.bitrate || (audioStats?.isLossless ? 2144 : 160)} kbps</span>
                      <span>·</span>
                      <span>Stereo</span>
                    </button>
                  )}
                </div>
              )}

              {/* Track Details */}
              <div className="mt-1 text-center w-full px-4 shrink-0">
                <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight truncate">
                  {currentTrack.title}
                </h2>
                <p className="text-sm text-foreground-muted font-medium mt-0.5 truncate">
                  {currentTrack.artist}
                </p>
                {currentTrack.album && (
                  <p className="text-[11px] text-foreground-subtle mt-0.5 truncate">{currentTrack.album}</p>
                )}

                {/* Lyrics Opener Pills when Lyrics is Off / Hidden */}
                {lyricsEnabled && lyricsLayoutMode === 'off' && activeTab === 'lyrics' && (
                  <div className="mt-2.5 flex items-center justify-center gap-2 animate-fadeIn">
                    <button
                      onClick={() => {
                        setLyricsLayoutMode('split');
                        setActiveTab('lyrics');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-surface-elevated/90 hover:bg-surface-elevated text-primary hover:text-primary-hover border border-primary/25 text-xs font-bold transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <Mic2 className="w-3.5 h-3.5" />
                      <span>Synced Lyrics &gt;</span>
                    </button>
                    <button
                      onClick={() => {
                        setLyricsLayoutMode('fullscreen');
                        setActiveTab('lyrics');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-surface-elevated/90 hover:bg-surface-elevated text-foreground-muted hover:text-foreground border border-border text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      title="Fullscreen Karaoke Lyrics"
                    >
                      <Maximize2 className="w-3 h-3 text-primary" />
                      <span>Fullscreen Lyrics</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Synced Lyrics View or Up Next Queue */}
            {(lyricsLayoutMode !== 'off' || activeTab !== 'lyrics') && (
              <div className="w-full md:w-1/2 h-full min-h-0 flex flex-col bg-surface-glass border border-border-glass rounded-3xl backdrop-blur-xl overflow-hidden relative shadow-2xl animate-fadeIn">
                {activeTab === 'lyrics' ? (
                  <LyricsView
                    isFullScreen={false}
                    onToggleFullscreen={() => setLyricsLayoutMode('fullscreen')}
                    onClose={() => setLyricsLayoutMode('off')}
                  />
                ) : (
                  <div className="h-full min-h-0 flex flex-col p-4 overflow-hidden">
                    <div className="px-3 py-1.5 text-xs font-bold text-foreground-muted uppercase tracking-wider shrink-0">
                      Up Next Queue
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
                      {queue.map((t, idx) => {
                        const isCurrent = idx === queueIndex;
                        return (
                          <div
                            key={`${t.id}_${idx}`}
                            onClick={() => playTrack(t)}
                            className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                              isCurrent
                                ? 'bg-primary/20 border border-primary/30 text-primary'
                                : 'hover:bg-surface-elevated/60 text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={t.thumbnail}
                                alt=""
                                className="w-9 h-9 rounded-xl object-cover shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate">{t.title}</p>
                                <p className="text-[11px] text-foreground-muted truncate">{t.artist}</p>
                              </div>
                            </div>
                            <span className="text-xs font-mono text-foreground-subtle ml-2">
                              {t.duration}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Expanded Controls Bar */}
      <footer 
        style={{ backgroundColor: 'var(--bg-surface)' }}
        className="relative z-10 px-6 py-2.5 sm:py-3 bg-surface border-t border-border flex flex-col items-center gap-2 shrink-0"
      >
        {/* Progress Bar with Timers */}
        <div className="w-full max-w-2xl flex items-center gap-3">
          <span className="text-xs font-mono text-foreground-subtle w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <div
            className="flex-1 h-2 bg-surface-elevated rounded-full cursor-pointer relative group overflow-hidden"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = (e.clientX - rect.left) / rect.width;
              seek(pos * duration);
            }}
          >
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-mono text-foreground-subtle w-12 text-left">
            {duration > 0 && currentTime <= duration ? `-${formatTime(duration - currentTime)}` : formatTime(duration)}
          </span>
        </div>

        {/* Audio Quality / Pipeline Pill directly under progress bar */}
        {showAudioQualityBadge && (
          <div className="flex items-center justify-center -mt-1.5">
            {isVideoMode ? (
              <button
                onClick={toggleStatsForNerds}
                className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer bg-amber-500/20 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/50 dark:border-amber-500/30 shadow-sm"
                title="Video Mode: Audio reduced to YouTube stream (~160 kbps)"
              >
                <Video className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>YouTube Audio (Reduced · 160k)</span>
              </button>
            ) : (
              <button
                onClick={toggleStatsForNerds}
                className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm ${
                  audioStats?.isLossless
                    ? 'bg-amber-500/20 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/50 dark:border-amber-500/30'
                    : 'bg-surface-elevated hover:bg-border/60 text-foreground border border-border'
                }`}
                title="Click to inspect live Audio Pipeline signal path"
              >
                <Activity className="w-3 h-3 text-primary" />
                <span>
                  {audioStats?.isLossless
                    ? (audioStats?.qualityTier === 'hi-res' ? 'Hi-Res Lossless' : 'Lossless')
                    : 'Standard Opus'}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Quick Audio Pipeline Diagnostics Card (Tablet & Desktop) */}
        {showAudioPipelineCard && (
          <div className="hidden sm:block w-full max-w-sm mx-auto px-2 mt-1 mb-1">
            <button
              onClick={toggleStatsForNerds}
              style={{ backgroundColor: 'var(--bg-surface)' }}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl bg-surface hover:bg-surface-elevated border border-border text-foreground transition-all hover:scale-[1.01] shadow-sm cursor-pointer group"
              title="Inspect live signal path, decoder and output"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div className="text-left truncate">
                  <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    Audio Pipeline
                  </div>
                  <div className="text-[10px] text-foreground-muted font-mono truncate">
                    {isVideoMode
                      ? '16-bit AAC Sync • 44.1 kHz'
                      : audioStats?.isLossless
                      ? `Bit-Perfect Lossless • ${((audioStats.sampleRate || 44100) / 1000).toFixed(1)} kHz ${audioStats.bitDepth || 24}-bit`
                      : `Hardware WebAudio • 48.0 kHz 160 kbps`}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-foreground-muted group-hover:text-foreground transition-colors shrink-0" />
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between w-full max-w-2xl px-1 sm:px-2">
          {/* Playback speed selector (hidden on small mobile to give primary buttons room) */}
          <div className="hidden sm:flex items-center gap-1">
            {[0.75, 1.0, 1.25, 1.5].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                  playbackSpeed === spd
                    ? 'bg-primary text-white'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Primary Buttons */}
          <div className="flex items-center gap-4 sm:gap-6 mx-auto sm:mx-0">
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded-full ${
                shuffle ? 'text-primary' : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button onClick={previous} className="text-foreground hover:scale-110 active:scale-95 transition-transform">
              <SkipBack className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
            </button>

            <button
              onClick={togglePlay}
              disabled={isLoading}
              className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>

            <button onClick={next} className="text-foreground hover:scale-110 active:scale-95 transition-transform">
              <SkipForward className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
            </button>

            <button
              onClick={cycleRepeat}
              className={`p-1.5 rounded-full ${
                repeatMode !== 'off' ? 'text-primary' : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>

          {/* 1-Click Download in Expanded Player */}
          {/* Desktop full button with label */}
          <button
            onClick={handleDownloadCurrent}
            className={`hidden sm:flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
              downloadQueued
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : audioStats?.isLossless
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:scale-105 shadow-sm'
                : 'bg-surface-elevated text-foreground-muted border-border hover:text-foreground hover:scale-105'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {downloadQueued
                ? 'Queued!'
                : audioStats?.isLossless
                ? 'Download Original FLAC'
                : 'Download Original Audio'}
            </span>
          </button>
          {/* Mobile compact icon button */}
          <button
            onClick={handleDownloadCurrent}
            title="Download song"
            className={`flex sm:hidden p-2 rounded-full border transition-all ${
              downloadQueued
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : audioStats?.isLossless
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-surface-elevated text-foreground-muted border-border hover:text-foreground'
            }`}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Live Signal Path, Decoder to Output Modal */}
      <AudioPipelineModal isOpen={enableStatsForNerds && showStatsForNerds} onClose={toggleStatsForNerds} />
    </div>
  );
};
