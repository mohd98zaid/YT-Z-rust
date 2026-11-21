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
  MoreHorizontal,
  Heart,
  Share2,
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
    twoSongCache,
  } = usePlayerStore();

  const { queueDownload } = useDownloadStore();
  const { navigateToYouTube } = useNavigationStore();
  const [activeTab, setActiveTab] = useState<'lyrics' | 'queue'>('lyrics');
  const [mobileView, setMobileView] = useState<'artwork' | 'lyrics' | 'queue'>('artwork');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  React.useEffect(() => {
    if (!currentTrack) return;
    api.getFavorites()
      .then((favs) => {
        if (Array.isArray(favs)) {
          setIsLiked(favs.some((f) => f.id === currentTrack.id || (f.videoId && f.videoId === currentTrack.videoId)));
        }
      })
      .catch(() => {});
  }, [currentTrack?.id]);

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

  const handleShare = () => {
    if (!currentTrack) return;
    const url = currentTrack.isLocal
      ? window.location.href
      : `https://www.youtube.com/watch?v=${currentTrack.videoId || currentTrack.id}`;
    navigator.clipboard?.writeText?.(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };
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
      badge: 'FLAC Master',
      desc: 'Plays FLAC when available (local library or lossless bridge), with 320k HQ fallback',
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

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Touch & Pointer Scrubber Dragging
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const mobileScrubberRef = useRef<HTMLDivElement>(null);
  const desktopScrubberRef = useRef<HTMLDivElement>(null);

  const calculateScrubTime = (clientX: number, target: HTMLDivElement | null) => {
    if (!target || duration <= 0) return 0;
    const rect = target.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  const handlePointerDownScrub = (e: React.PointerEvent<HTMLDivElement>, ref: React.RefObject<HTMLDivElement | null>) => {
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setIsScrubbing(true);
    const t = calculateScrubTime(e.clientX, ref.current);
    setScrubTime(t);
  };

  const handlePointerMoveScrub = (e: React.PointerEvent<HTMLDivElement>, ref: React.RefObject<HTMLDivElement | null>) => {
    if (!isScrubbing) return;
    const t = calculateScrubTime(e.clientX, ref.current);
    setScrubTime(t);
  };

  const handlePointerUpScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    setIsScrubbing(false);
    seek(scrubTime);
  };

  // Touch & Pointer Volume Dragging
  const [isVolumeDragging, setIsVolumeDragging] = useState(false);
  const mobileVolumeBarRef = useRef<HTMLDivElement>(null);

  const calculateVolumeRatio = (clientX: number, target: HTMLDivElement | null) => {
    if (!target) return volume;
    const rect = target.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handlePointerDownVolume = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setIsVolumeDragging(true);
    const v = calculateVolumeRatio(e.clientX, mobileVolumeBarRef.current);
    setVolume(v);
    if (isMuted && v > 0) toggleMute();
  };

  const handlePointerMoveVolume = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isVolumeDragging) return;
    const v = calculateVolumeRatio(e.clientX, mobileVolumeBarRef.current);
    setVolume(v);
  };

  const handlePointerUpVolume = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isVolumeDragging) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    setIsVolumeDragging(false);
  };

  // Swipe Down to Minimize Gesture (Mobile)
  const [sheetTranslateY, setSheetTranslateY] = useState(0);
  const [isSwipingSheet, setIsSwipingSheet] = useState(false);
  const swipeStartY = useRef(0);

  const handleSheetTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    swipeStartY.current = e.touches[0].clientY;
    setIsSwipingSheet(true);
  };

  const handleSheetTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isSwipingSheet) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - swipeStartY.current;
    if (delta > 0) {
      setSheetTranslateY(delta);
    } else {
      setSheetTranslateY(0);
    }
  };

  const handleSheetTouchEnd = () => {
    if (!isSwipingSheet) return;
    setIsSwipingSheet(false);
    if (sheetTranslateY > 80) {
      setExpanded(false);
      if (isVideoMode) {
        setVideoMode(false);
        setActiveVideoSource(null);
      }
    }
    setSheetTranslateY(0);
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
      setDownloadQueued(true);
      setTimeout(() => setDownloadQueued(false), 3000);
    } catch (err) {
      console.error('Failed to queue download', err);
    }
  };

  if (!isExpanded || !currentTrack) return null;

  return (
    <div 
      style={{
        transform: sheetTranslateY > 0 ? `translate3d(0, ${sheetTranslateY}px, 0)` : undefined,
        transition: isSwipingSheet ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.9, 0.4, 1)',
      }}
      className="fixed inset-0 z-[500] flex flex-col bg-background select-none overflow-hidden animate-fadeIn pb-safe"
    >
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

      {/* BitChord / Apple Music Mobile Top Bar (flex md:hidden) */}
      <header 
        onTouchStart={handleSheetTouchStart}
        onTouchMove={handleSheetTouchMove}
        onTouchEnd={handleSheetTouchEnd}
        className="flex md:hidden relative z-50 flex-col px-4 pt-1.5 pb-2 border-b border-white/10 shrink-0 select-none touch-none liquid-glass"
      >
        {/* Top Grab Handle Pill for Swipe-down gesture */}
        <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mb-2 pointer-events-none" />

        <div className="flex items-center justify-between w-full">
          {/* Left: Minimize Button */}
          <button
            onClick={() => {
              setExpanded(false);
              if (isVideoMode) {
                setVideoMode(false);
                setActiveVideoSource(null);
              }
            }}
            className="w-10 h-10 rounded-full liquid-glass-control flex items-center justify-center text-foreground active:scale-90 transition-transform"
            title="Minimize player"
          >
            <ChevronDown className="w-5 h-5" />
          </button>

        {/* Center: Dynamic Mode Header Pill */}
        <div className="flex items-center justify-center min-w-0 px-2 flex-1">
          {mobileView === 'lyrics' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 animate-fadeIn">
              <Mic2 className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-foreground dark:text-white tracking-wide">Synced Lyrics</span>
            </div>
          ) : mobileView === 'queue' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 animate-fadeIn">
              <ListMusic className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-foreground dark:text-white tracking-wide">Up Next ({queue.length})</span>
            </div>
          ) : isVideoMode && !currentTrack.isLocal ? (
            <div className="flex items-center gap-1 p-0.5 rounded-full bg-white/10 border border-white/15">
              <button
                onClick={() => {
                  setVideoMode(false);
                  setActiveVideoSource(null);
                  pause();
                  play();
                }}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-foreground-muted"
              >
                <Disc className="w-3 h-3" />
                <span>Song</span>
              </button>
              <button
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary text-white shadow-sm"
              >
                <Video className="w-3 h-3" />
                <span>Video</span>
              </button>
            </div>
          ) : !currentTrack.isLocal ? (
            <div className="flex items-center gap-1 p-0.5 rounded-full bg-white/10 border border-white/15">
              <button
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary text-white shadow-sm"
              >
                <Disc className="w-3 h-3" />
                <span>Song</span>
              </button>
              <button
                onClick={() => {
                  setVideoMode(true);
                  pauseAudio();
                  setActiveVideoSource('expanded_video');
                }}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-foreground-muted hover:text-foreground"
              >
                <Video className="w-3 h-3" />
                <span>Video</span>
              </button>
            </div>
          ) : (
            <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted truncate">
              {currentTrack.album || 'Now Playing'}
            </span>
          )}
        </div>

        {/* Right: Quality Badge & More Options Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative" ref={qualityMenuRef}>
            <button
              onClick={() => setQualityMenuOpen(!qualityMenuOpen)}
              className={`px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wider uppercase transition-all backdrop-blur-md active:scale-95 flex items-center gap-1 ${
                audioQuality === 'lossless'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                  : audioQuality === 'data_saver'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-white/10 text-foreground dark:text-white border-white/15'
              }`}
            >
              {audioQuality === 'lossless' && <Sparkles className="w-2.5 h-2.5 text-amber-300" />}
              <span>{audioQuality === 'lossless' ? (audioStats?.isLossless ? 'Lossless' : '320k HQ') : audioQuality === 'data_saver' ? 'Saver' : '320k'}</span>
            </button>

            {qualityMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[#181920]/95 backdrop-blur-2xl border border-white/15 p-2 shadow-2xl z-50 animate-fadeIn">
                {qualityOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setAudioQuality(opt.id);
                      setQualityMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                      audioQuality === opt.id ? 'bg-primary/20 text-primary' : 'hover:bg-white/10 text-white'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{opt.label}</div>
                      <div className="text-[10px] text-white/50">{opt.badge}</div>
                    </div>
                    {audioQuality === opt.id && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-foreground active:scale-90 transition-transform"
            title="More Options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
        </div>
      </header>

      {/* Desktop Top Header Bar (hidden md:flex) */}
      <header className="hidden md:flex relative z-50 items-center justify-between px-6 py-3 border-b border-border/40 shrink-0">
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
                className="absolute right-0 top-full mt-2 w-84 liquid-glass-card rounded-2xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-50 animate-fadeIn space-y-1.5 border border-white/20"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                  <div>
                    <p className="text-xs font-extrabold text-foreground tracking-tight">Streaming Quality</p>
                    <p className="text-[10px] text-foreground-muted">Select audio fidelity or data saver</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full liquid-glass-prominent text-white">
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
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'liquid-glass-prominent'
                            : 'liquid-glass-control text-foreground-muted hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                          <div className={`p-1.5 rounded-lg shrink-0 border ${opt.color}`}>
                            <OptIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold truncate text-white">
                                {opt.label}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                            </div>
                            <p className="text-[10px] text-white/70 truncate leading-tight mt-0.5">{opt.desc}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-black/40 border border-white/20 text-white shrink-0 shadow-xs">
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

      {/* BitChord / Apple Music Mobile Center Canvas (flex md:hidden) */}
      <div className="flex md:hidden relative z-10 flex-1 min-h-0 w-full flex-col items-center justify-center px-4 py-1 overflow-hidden select-none">
        {/* VIEW 1: Large Artwork & Track Info (Default) */}
        {mobileView === 'artwork' && (
          <div className="flex-1 min-h-0 w-full max-w-sm flex flex-col items-center justify-between py-2 animate-fadeIn">
            {/* Embedded Video Mode OR Full-bleed Cover Artwork */}
            {isVideoMode && !currentTrack.isLocal ? (
              <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-center gap-2">
                <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black animate-fadeIn max-h-[36vh]">
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
                        if (!isNaN(ct)) usePlayerStore.setState({ currentTime: ct });
                      }}
                      onDurationChange={(e) => {
                        const dur = e.currentTarget.duration;
                        if (!isNaN(dur) && dur > 0) usePlayerStore.setState({ duration: dur });
                      }}
                      onPlay={() => {
                        pauseAudio();
                        setActiveVideoSource('expanded_video');
                        usePlayerStore.setState({ isPlaying: true });
                      }}
                      onPause={() => usePlayerStore.setState({ isPlaying: false })}
                      onEnded={() => usePlayerStore.getState().next()}
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
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="relative group flex items-center justify-center my-auto w-full py-2">
                <div className="relative aspect-square w-[72vw] max-w-[285px] max-h-[36vh] -translate-x-2.5 sm:-translate-x-3">
                  {/* Spinning Vinyl Record Layer Behind Artwork */}
                  <div
                    className={`absolute -right-5 sm:-right-6 top-1/2 -translate-y-1/2 w-[90%] h-[90%] rounded-full bg-zinc-950 border-4 border-zinc-800 shadow-2xl flex items-center justify-center pointer-events-none transition-transform duration-500 ${
                      isPlaying ? 'animate-spin-slow' : ''
                    }`}
                  >
                    <div className="w-16 h-16 rounded-full border-4 border-zinc-700/80 bg-zinc-900 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-primary/80" />
                    </div>
                  </div>

                  {/* High-res Full-bleed Cover Artwork */}
                  <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/15 z-10 bg-surface">
                    <img
                      src={currentTrack.thumbnail || '/placeholder.png'}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Below Artwork: Track Details + Apple Music Heart */}
            <div className="flex items-center justify-between w-full px-2 mt-3 mb-1 shrink-0">
              <div className="min-w-0 flex-1 text-left">
                <h2 className="text-xl font-black text-foreground tracking-tight truncate">
                  {currentTrack.title}
                </h2>
                <p className="text-sm text-foreground-muted font-medium truncate mt-0.5">
                  {currentTrack.artist}
                </p>
              </div>
              <button
                onClick={handleToggleFavorite}
                className="p-2.5 rounded-full hover:bg-white/10 active:scale-90 transition-transform ml-2 shrink-0"
                title={isLiked ? "Remove from Liked Songs" : "Save to Liked Songs"}
              >
                <Heart className={`w-6 h-6 transition-colors ${isLiked ? 'fill-primary text-primary' : 'text-foreground-muted hover:text-foreground'}`} />
              </button>
            </div>

            {/* Audiophile Specs Line */}
            {showAudiophileSpecs && (
              <div className="w-full text-left px-2 shrink-0">
                <button
                  onClick={toggleStatsForNerds}
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono text-foreground-muted hover:text-foreground tracking-wide transition-colors cursor-pointer"
                  title="Click to view Audio Pipeline signal path"
                >
                  <Activity className="w-3 h-3 text-primary" />
                  <span>{(audioStats?.codec || (isVideoMode ? 'aac' : 'opus')).toUpperCase()}</span>
                  <span>·</span>
                  <span>{audioStats?.bitDepth || 16}-bit</span>
                  <span>·</span>
                  <span>{((audioStats?.sampleRate || ((audioStats?.codec || '').toLowerCase() === 'opus' ? 48000 : 44100)) / 1000).toFixed(1)} kHz</span>
                  <span>·</span>
                  <span className={audioStats?.isLossless ? 'text-emerald-400 font-medium' : ''}>
                    {audioStats?.bitrate ? `${audioStats.bitrate.toLocaleString()} kbps` : (isVideoMode ? '160 kbps' : '320 kbps')}{audioStats?.isLossless ? ' Lossless' : ''}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: Fullscreen Apple Music Synced Lyrics */}
        {mobileView === 'lyrics' && (
          <div className="flex-1 min-h-0 w-full max-w-md mx-auto p-1 overflow-hidden animate-fadeIn flex flex-col">
            <div className="w-full h-full min-h-0 flex flex-col bg-black/35 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden relative shadow-2xl">
              <LyricsView
                isFullScreen={true}
                onToggleFullscreen={() => {}}
                onClose={() => setMobileView('artwork')}
              />
            </div>
          </div>
        )}

        {/* VIEW 3: Fullscreen Up Next Queue */}
        {mobileView === 'queue' && (
          <div className="flex-1 min-h-0 w-full max-w-md mx-auto p-1 overflow-hidden animate-fadeIn flex flex-col">
            <div className="w-full h-full min-h-0 flex flex-col bg-black/35 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden relative shadow-2xl p-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <ListMusic className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Up Next Queue ({queue.length})
                  </span>
                </div>
                <button
                  onClick={() => setMobileView('artwork')}
                  className="text-xs text-white/70 hover:text-white font-medium px-3 py-1 rounded-full bg-white/10 active:scale-95 transition-all"
                >
                  Done
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 py-3 pr-1">
                {queue.map((t, idx) => {
                  const isCurrent = idx === queueIndex;
                  return (
                    <div
                      key={`${t.id}_${idx}`}
                      onClick={() => playTrack(t)}
                      className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all active:scale-[0.98] ${
                        isCurrent
                          ? 'bg-primary/25 border border-primary/40 text-white font-bold shadow-sm'
                          : 'hover:bg-white/10 text-white/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={t.thumbnail}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-sm border border-white/10"
                        />
                        <div className="min-w-0">
                          <p className="text-xs truncate">{t.title}</p>
                          <p className="text-[11px] text-white/60 truncate">{t.artist}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-white/50 ml-2">
                        {t.duration}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Main Center Area: Split vs Fullscreen Lyrics vs Centered Artwork */}
      <div className="hidden md:flex relative z-10 flex-1 min-h-0 items-center justify-center px-6 py-2 md:px-10 gap-4 md:gap-8 overflow-hidden">
        {lyricsEnabled && lyricsLayoutMode === 'fullscreen' && activeTab === 'lyrics' ? (
          <div className="w-full max-w-4xl h-full min-h-0 flex flex-col bg-black/35 backdrop-blur-2xl border border-white/10 text-white rounded-3xl overflow-hidden relative shadow-2xl mx-auto animate-fadeIn">
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
                      <span>{(audioStats?.codec || (isVideoMode ? 'aac' : 'opus')).toUpperCase()}</span>
                      <span>·</span>
                      <span>{audioStats?.bitDepth || 16}-bit</span>
                      <span>·</span>
                      <span>{((audioStats?.sampleRate || ((audioStats?.codec || '').toLowerCase() === 'opus' ? 48000 : 44100)) / 1000).toFixed(1)} kHz</span>
                      <span>·</span>
                      <span className={audioStats?.isLossless ? 'text-emerald-400 font-medium' : ''}>
                        {audioStats?.bitrate ? `${audioStats.bitrate.toLocaleString()} kbps` : (isVideoMode ? '160 kbps' : '320 kbps')}
                      </span>
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
              <div className="w-full md:w-1/2 h-full min-h-0 flex flex-col bg-black/35 backdrop-blur-2xl border border-white/10 text-white rounded-3xl overflow-hidden relative shadow-2xl animate-fadeIn">
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

      {/* BitChord / Apple Music Mobile Bottom Deck (flex md:hidden) */}
      <footer className="flex md:hidden relative z-10 flex-col items-center gap-2.5 px-5 pt-2 pb-5 bg-black/40 backdrop-blur-2xl border-t border-white/10 shrink-0 w-full select-none">
        {/* Scrubber Timeline with Pointer-Capture Touch Dragging */}
        <div className="w-full max-w-sm flex items-center gap-2.5 px-1">
          <span className="text-[11px] font-mono text-foreground-muted w-9 text-right select-none">
            {formatTime(isScrubbing ? scrubTime : currentTime)}
          </span>
          <div
            ref={mobileScrubberRef}
            onPointerDown={(e) => handlePointerDownScrub(e, mobileScrubberRef)}
            onPointerMove={(e) => handlePointerMoveScrub(e, mobileScrubberRef)}
            onPointerUp={handlePointerUpScrub}
            onPointerCancel={handlePointerUpScrub}
            className="flex-1 h-6 flex items-center cursor-pointer relative touch-none select-none group"
          >
            {/* Scrubber Track */}
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden relative pointer-events-none">
              {/* Two-Song Cache Slot 1 Buffer Progress */}
              <div
                className="absolute top-0 left-0 h-full bg-white/30 rounded-full transition-all duration-300 pointer-events-none"
                style={{
                  width: `${twoSongCache?.currentLoaded ? 100 : (twoSongCache?.currentBufferPercent || 0)}%`,
                }}
              />
              <div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-none relative z-10"
                style={{
                  width: `${
                    duration > 0
                      ? Math.min(100, Math.max(0, ((isScrubbing ? scrubTime : currentTime) / duration) * 100))
                      : 0
                  }%`,
                }}
              />
            </div>
            {/* Scrubber Knob Thumb */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg pointer-events-none transition-transform ${
                isScrubbing ? 'scale-125 ring-4 ring-primary/40' : 'group-hover:scale-110'
              }`}
              style={{
                left: `calc(${
                  duration > 0
                    ? Math.min(100, Math.max(0, ((isScrubbing ? scrubTime : currentTime) / duration) * 100))
                    : 0
                }% - 8px)`,
              }}
            />
          </div>
          <span className="text-[11px] font-mono text-foreground-muted w-10 text-left select-none">
            {duration > 0 && currentTime <= duration
              ? `-${formatTime(duration - (isScrubbing ? scrubTime : currentTime))}`
              : formatTime(duration)}
          </span>
        </div>

        {/* Transport Buttons: Shuffle, Prev, Big Play/Pause, Next, Repeat */}
        <div className="flex items-center justify-between w-full max-w-sm px-3 pt-0.5">
          <button
            onClick={toggleShuffle}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors active:scale-90 ${
              shuffle ? 'text-primary' : 'text-foreground-muted hover:text-foreground'
            }`}
            title="Toggle shuffle"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button
            onClick={previous}
            className="w-11 h-11 flex items-center justify-center text-foreground active:scale-90 transition-transform"
            title="Previous track"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-14 h-14 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-xl shadow-primary/35 active:scale-90 transition-all"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={next}
            className="w-11 h-11 flex items-center justify-center text-foreground active:scale-90 transition-transform"
            title="Next track"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          <button
            onClick={cycleRepeat}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors active:scale-90 ${
              repeatMode !== 'off' ? 'text-primary' : 'text-foreground-muted hover:text-foreground'
            }`}
            title={`Repeat mode: ${repeatMode}`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
          </button>
        </div>

        {/* Touch-Friendly Volume Slider (Mobile) */}
        <div className="w-full max-w-sm flex items-center gap-2.5 px-2 select-none">
          <button
            onClick={toggleMute}
            className="w-8 h-8 flex items-center justify-center text-foreground-muted hover:text-foreground active:scale-90 transition-transform shrink-0"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-foreground-muted" />
            ) : (
              <Volume2 className="w-4 h-4 text-foreground-muted" />
            )}
          </button>
          <div
            ref={mobileVolumeBarRef}
            onPointerDown={handlePointerDownVolume}
            onPointerMove={handlePointerMoveVolume}
            onPointerUp={handlePointerUpVolume}
            onPointerCancel={handlePointerUpVolume}
            className="flex-1 h-6 flex items-center cursor-pointer relative touch-none group"
          >
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden relative pointer-events-none">
              <div
                className="h-full bg-white/80 group-hover:bg-primary rounded-full transition-none"
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              />
            </div>
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md pointer-events-none transition-transform ${
                isVolumeDragging ? 'scale-125 ring-2 ring-primary/40' : ''
              }`}
              style={{
                left: `calc(${(isMuted ? 0 : volume) * 100}% - 7px)`,
              }}
            />
          </div>
        </div>

        {/* BitChord Audio Pipeline Card (Mobile) */}
        {showAudioPipelineCard && (
          <button
            onClick={toggleStatsForNerds}
            className="w-full max-w-sm flex items-center justify-between px-3.5 py-2.5 rounded-2xl liquid-glass-card hover:bg-white/15 text-foreground transition-all active:scale-[0.98] group shadow-sm cursor-pointer border border-white/15"
            title="Inspect live signal path, decoder and output"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full liquid-glass-prominent text-white flex items-center justify-center shrink-0">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div className="text-left truncate">
                <div className="text-xs font-semibold text-white group-hover:text-primary transition-colors">
                  Audio Pipeline
                </div>
                <div className="text-[10px] text-white/70 truncate">
                  {isVideoMode
                    ? '16-bit AAC Sync · 44.1 kHz'
                    : audioStats?.isLossless
                    ? (typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
                        ? `16-bit fallback · ${((audioStats?.sampleRate || 48000) / 1000).toFixed(0)} kHz`
                        : `${(audioStats?.codec || 'FLAC').toUpperCase()} ${audioStats?.bitDepth || 24}-bit · ${((audioStats?.sampleRate || 48000) / 1000).toFixed(0)} kHz`)
                    : audioStats?.bitrate && audioStats.bitrate >= 320
                    ? `${(audioStats?.codec || 'AAC').toUpperCase()} 320 kbps HQ · ${((audioStats?.sampleRate || 44100) / 1000).toFixed(1)} kHz`
                    : `${(audioStats?.codec || 'OPUS').toUpperCase()} ${audioStats?.bitDepth || 16}-bit · ${((audioStats?.sampleRate || 48000) / 1000).toFixed(0)} kHz`}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-white transition-colors shrink-0" />
          </button>
        )}

        {/* Apple Music Bottom Action Bar: Lyrics, EQ, Pipeline, Queue, Download */}
        <div className="flex items-center justify-between w-full max-w-sm px-2 pt-1 border-t border-white/10">
          <button
            onClick={() => setMobileView(mobileView === 'lyrics' ? 'artwork' : 'lyrics')}
            title="Synced Lyrics"
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 ${
              mobileView === 'lyrics'
                ? 'liquid-glass-prominent shadow-md'
                : 'liquid-glass-control text-white/70 hover:text-white'
            }`}
          >
            <Mic2 className="w-5 h-5" />
          </button>

          <button
            onClick={toggleEqualizer}
            title="Graphic Equalizer"
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 ${
              isEqualizerOpen
                ? 'liquid-glass-prominent shadow-md'
                : 'liquid-glass-control text-white/70 hover:text-white'
            }`}
          >
            <Sliders className="w-5 h-5" />
          </button>

          <button
            onClick={toggleStatsForNerds}
            title="Inspect Audio Pipeline"
            className="w-10 h-10 flex items-center justify-center rounded-full liquid-glass-control text-white/70 hover:text-white transition-all active:scale-90"
          >
            <Activity className="w-5 h-5" />
          </button>

          <button
            onClick={() => setMobileView(mobileView === 'queue' ? 'artwork' : 'queue')}
            title="Up Next Queue"
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 relative ${
              mobileView === 'queue'
                ? 'liquid-glass-prominent shadow-md'
                : 'liquid-glass-control text-white/70 hover:text-white'
            }`}
          >
            <ListMusic className="w-5 h-5" />
            {queue.length > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-mono flex items-center justify-center font-bold shadow-sm">
                {queue.length > 99 ? '99+' : queue.length}
              </span>
            )}
          </button>

          <button
            onClick={handleDownloadCurrent}
            title="Download lossless audio"
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 ${
              downloadQueued
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : audioStats?.isLossless
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'liquid-glass-control text-white/70 hover:text-white'
            }`}
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* Desktop Bottom Expanded Controls Bar (hidden md:flex) */}
      <footer 
        className="hidden md:flex relative z-10 px-6 py-2.5 sm:py-3 liquid-glass border-t border-white/15 flex-col items-center gap-2 shrink-0 shadow-[0_-12px_36px_rgba(0,0,0,0.5)]"
      >
        {/* Progress Bar with Timers & Touch-Scrubbing */}
        <div className="w-full max-w-2xl flex items-center gap-3">
          <span className="text-xs font-mono text-foreground-subtle w-10 text-right select-none">
            {formatTime(isScrubbing ? scrubTime : currentTime)}
          </span>
          <div
            ref={desktopScrubberRef}
            onPointerDown={(e) => handlePointerDownScrub(e, desktopScrubberRef)}
            onPointerMove={(e) => handlePointerMoveScrub(e, desktopScrubberRef)}
            onPointerUp={handlePointerUpScrub}
            onPointerCancel={handlePointerUpScrub}
            className="flex-1 h-6 flex items-center cursor-pointer relative touch-none select-none group"
          >
            <div className="w-full h-2 bg-surface-elevated rounded-full overflow-hidden relative pointer-events-none">
              {/* Two-Song Cache Slot 1 Buffer Progress */}
              <div
                className="absolute top-0 left-0 h-full bg-white/20 rounded-full transition-all duration-300 pointer-events-none"
                style={{
                  width: `${twoSongCache?.currentLoaded ? 100 : (twoSongCache?.currentBufferPercent || 0)}%`,
                }}
              />
              <div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-none relative z-10"
                style={{
                  width: `${
                    duration > 0
                      ? Math.min(100, Math.max(0, ((isScrubbing ? scrubTime : currentTime) / duration) * 100))
                      : 0
                  }%`,
                }}
              />
            </div>
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md pointer-events-none transition-transform ${
                isScrubbing ? 'scale-125 ring-2 ring-primary/40' : 'opacity-0 group-hover:opacity-100'
              }`}
              style={{
                left: `calc(${
                  duration > 0
                    ? Math.min(100, Math.max(0, ((isScrubbing ? scrubTime : currentTime) / duration) * 100))
                    : 0
                }% - 7px)`,
              }}
            />
          </div>
          <span className="text-xs font-mono text-foreground-subtle w-12 text-left select-none">
            {duration > 0 && currentTime <= duration
              ? `-${formatTime(duration - (isScrubbing ? scrubTime : currentTime))}`
              : formatTime(duration)}
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
                    : audioStats?.bitrate && audioStats.bitrate >= 320
                    ? 'bg-cyan-500/15 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 dark:border-cyan-500/25'
                    : 'bg-surface-elevated hover:bg-border/60 text-foreground border border-border'
                }`}
                title="Click to inspect live Audio Pipeline signal path"
              >
                <Activity className="w-3 h-3 text-primary" />
                <span>
                  {audioStats?.isLossless
                    ? (audioStats?.qualityTier === 'hi-res' ? 'Hi-Res Lossless (24-bit FLAC)' : 'Lossless CD (16-bit FLAC)')
                    : audioStats?.bitrate && audioStats.bitrate >= 320
                    ? 'High Quality (320k AAC)'
                    : audioStats?.bitrate && audioStats.bitrate >= 256
                    ? 'High Quality (256k)'
                    : audioStats?.codec === 'opus'
                    ? 'YouTube HD (160k Opus)'
                    : 'Standard Audio'}
                </span>
              </button>
            )}
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

        {/* BitChord Signature: Volume Slider & Audio Pipeline Card */}
        <div className="w-full max-w-sm sm:max-w-md mx-auto px-2 sm:px-4 mt-2 sm:mt-3 space-y-2.5">
          {/* Volume Control */}
          <div className="flex items-center gap-3 w-full px-1">
            <button
              onClick={toggleMute}
              className="p-1 text-foreground-muted hover:text-foreground transition-colors shrink-0"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-foreground-muted" />
              ) : (
                <Volume2 className="w-4 h-4 text-foreground-muted hover:text-foreground" />
              )}
            </button>
            <div className="relative flex-1 flex items-center h-4">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-foreground/15 hover:bg-foreground/25 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Audio Pipeline Card */}
          {showAudioPipelineCard && (
            <button
              onClick={toggleStatsForNerds}
              className="w-full flex items-center justify-between p-3 rounded-2xl liquid-glass-card hover:bg-white/15 border border-white/15 text-foreground transition-all active:scale-[0.99] group shadow-sm cursor-pointer"
              title="Inspect live signal path, decoder and output"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full liquid-glass-prominent text-white flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="text-left truncate">
                  <div className="text-[13px] font-semibold text-white group-hover:text-primary transition-colors">
                    Audio Pipeline
                  </div>
                  <div className="text-[11px] text-white/70 truncate">
                    {isVideoMode
                      ? '16-bit AAC Sync · 44.1 kHz'
                      : audioStats?.isLossless
                      ? `${(audioStats?.codec || 'FLAC').toUpperCase()} ${audioStats?.bitDepth || 24}-bit Lossless · ${((audioStats?.sampleRate || 48000) / 1000).toFixed(0)} kHz · ${audioStats?.bitrate || 1411} kbps`
                      : audioStats?.bitrate && audioStats.bitrate >= 320
                      ? `${(audioStats?.codec || 'AAC').toUpperCase()} 320 kbps HQ · ${((audioStats?.sampleRate || 44100) / 1000).toFixed(1)} kHz`
                      : `${(audioStats?.codec || 'OPUS').toUpperCase()} ${audioStats?.bitDepth || 16}-bit · ${((audioStats?.sampleRate || 48000) / 1000).toFixed(0)} kHz · ${audioStats?.bitrate || 160} kbps`}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-white transition-colors shrink-0" />
            </button>
          )}
        </div>
      </footer>

      {/* BitChord / Apple Music Mobile "More Options" Sheet */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-[700] md:hidden flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fadeIn"
            onClick={() => setIsMoreMenuOpen(false)}
          />
          <div className="relative liquid-glass-card border-t border-white/20 rounded-t-[32px] p-5 shadow-2xl z-10 space-y-4 animate-slideUp pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
            <div className="w-10 h-1 bg-white/30 rounded-full mx-auto -mt-1 mb-2" />
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <img
                src={currentTrack.thumbnail || '/placeholder.png'}
                alt=""
                className="w-12 h-12 rounded-xl object-cover shadow-md border border-white/10"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-white truncate">{currentTrack.title}</h4>
                <p className="text-xs text-white/60 truncate">{currentTrack.artist}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              {!currentTrack.isLocal && (
                <button
                  onClick={() => {
                    startRadio();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all active:scale-[0.98]"
                >
                  <Radio className="w-4 h-4 text-primary" />
                  <span>Start Song Radio</span>
                </button>
              )}

              <button
                onClick={() => {
                  toggleSleepTimer();
                  setIsMoreMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <Timer className="w-4 h-4 text-amber-400" />
                  <span>Sleep Timer</span>
                </div>
                {sleepTimerRemaining !== null && (
                  <span className="text-[11px] font-mono text-amber-400">{sleepTimerRemaining}m left</span>
                )}
              </button>

              <button
                onClick={() => {
                  toggleEqualizer();
                  setIsMoreMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all active:scale-[0.98]"
              >
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>Graphic Equalizer</span>
              </button>

              <button
                onClick={() => {
                  toggleStatsForNerds();
                  setIsMoreMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all active:scale-[0.98]"
              >
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Audio Pipeline & Signal Path</span>
              </button>

              <button
                onClick={handleShare}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <Share2 className="w-4 h-4 text-blue-400" />
                  <span>Share Song Link</span>
                </div>
                {shareCopied && <span className="text-[10px] text-emerald-400 font-semibold">Copied!</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Signal Path, Decoder to Output Modal */}
      <AudioPipelineModal isOpen={enableStatsForNerds && showStatsForNerds} onClose={toggleStatsForNerds} />
    </div>
  );
};
