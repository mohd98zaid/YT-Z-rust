import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X, Expand, PictureInPicture2, ShieldCheck, Play, Tv, ChevronDown, Check } from 'lucide-react';
import { useVideoStore } from '../../stores/useVideoStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useNavigationStore } from '../../stores/useNavigationStore';

const qualityOptions = [
  { id: 'hd2160', label: '4K Ultra HD (2160p)' },
  { id: 'hd1440', label: '1440p Quad HD' },
  { id: 'hd1080', label: '1080p Full HD' },
  { id: 'hd720', label: '720p HD' },
  { id: 'large', label: '480p SD' },
  { id: 'medium', label: '360p Data Saver' },
  { id: 'auto', label: 'Auto (Adaptive)' },
];

const getQualityLabel = (q?: string) => {
  if (q === 'hd2160') return '4K';
  if (q === 'hd1440') return '1440p';
  if (q === 'hd720') return '720p';
  if (q === 'large') return '480p';
  if (q === 'medium') return '360p';
  if (q === 'auto') return 'Auto';
  return '1080p';
};

export const PersistentVideoPlayer: React.FC = () => {
  const {
    activeVideo,
    isPiP,
    isFullscreen,
    isTheaterMode,
    reloadKey,
    videoQuality,
    useDirectVideo,
    setUseDirectVideo,
    closeVideo,
    togglePiP,
    setIsFullscreen,
    toggleTheaterMode,
    setVideoQuality,
    restoreCinema,
  } = useVideoStore();

  const activeTab = useNavigationStore((s) => s.activeTab);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasPlaybackStarted, setHasPlaybackStarted] = useState(false);
  const [showDirectPrompt, setShowDirectPrompt] = useState(false);
  const [showPlayerQualityMenu, setShowPlayerQualityMenu] = useState(false);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHasPlaybackStarted(false);
    setShowDirectPrompt(false);

    // If iframe fails to start playback within 2.5s (e.g. YouTube Error 150/152 blocked embed),
    // automatically switch to Direct Video player so the video ALWAYS plays
    const timer = setTimeout(() => {
      if (!useDirectVideo) {
        console.warn('YouTube embed did not start playback within 2.5s (likely Error 152 restriction). Auto-activating Direct Video...');
        setUseDirectVideo(true);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [activeVideo?.id, reloadKey, useDirectVideo, setUseDirectVideo]);

  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        // Strictly trigger direct video on verified YouTube embed restrictions (codes 150, 152, 153, 101 or onError event)
        const code = typeof data?.info?.errorCode === 'number' ? data.info.errorCode : (typeof data?.data === 'number' ? data.data : 0);
        if (code === 150 || code === 152 || code === 153 || code === 101 || (data?.event === 'onError' && code > 0)) {
          console.warn('Persistent video player embed restriction (code ' + code + '), enabling direct video fallback:', data);
          setUseDirectVideo(true);
        }
        // YouTube embed playback confirmation (infoDelivery with playing state or time progress)
        if (data?.event === 'infoDelivery' && data?.info) {
          if (data.info.playerState === 1 || data.info.currentTime > 0) {
            setHasPlaybackStarted(true);
            setShowDirectPrompt(false);
            usePlayerStore.setState({ isPlaying: true, isVideoMode: true, activeVideoSource: 'youtube_video' });
          } else if (data.info.playerState === 2) {
            usePlayerStore.setState({ isPlaying: false });
          }
          if (typeof data.info.currentTime === 'number') {
            usePlayerStore.setState({
              currentTime: data.info.currentTime,
              ...(typeof data.info.duration === 'number' && data.info.duration > 0 ? { duration: data.info.duration } : {}),
            });
          }
        }
        // Auto-advance to next video when current video ends
        if (data?.info?.playerState === 0) {
          useVideoStore.getState().nextVideo();
        }
      } catch {}
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [setUseDirectVideo]);

  // Determine portal mount target without any JS scroll tracking
  useEffect(() => {
    if (!activeVideo) {
      setMountNode(null);
      return;
    }

    const resolveMount = () => {
      if (isFullscreen) {
        setMountNode(document.body);
        return;
      }

      const isCinema = !isPiP && activeTab === 'youtube';
      if (isCinema) {
        const cinemaAnchor = document.getElementById('youtube-cinema-anchor');
        if (cinemaAnchor) {
          setMountNode(cinemaAnchor);
          return;
        }
      }

      // Sidebar PiP target
      const sidebarAnchor = document.getElementById('sidebar-pip-anchor');
      if (sidebarAnchor && sidebarAnchor.clientHeight > 0) {
        setMountNode(sidebarAnchor);
        return;
      }

      // Mobile or fallback floating PiP
      setMountNode(document.body);
    };

    resolveMount();
    const t1 = setTimeout(resolveMount, 30);
    const t2 = setTimeout(resolveMount, 100);
    const t3 = setTimeout(resolveMount, 300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [activeVideo?.id, isFullscreen, isPiP, activeTab]);

  // Handle Fullscreen state change events
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [setIsFullscreen]);

  const handleToggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if ((el as any).webkitRequestFullscreen) {
        (el as any).webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  if (!activeVideo || !mountNode) return null;

  const isCinema = mountNode.id === 'youtube-cinema-anchor';
  const isSidebarPiP = mountNode.id === 'sidebar-pip-anchor';
  const isFloatingPiP = !isFullscreen && !isCinema && !isSidebarPiP;

  // Build embed URL with origin and target quality (defaulting to 1080p Full HD)
  const qTarget = videoQuality || 'hd1080';
  const embedUrl = `https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&enablejsapi=1&rel=0&iv_load_policy=3&vq=${qTarget}&origin=${window.location.origin}`;

  let containerClasses = '';
  if (isFullscreen) {
    containerClasses = 'fixed inset-0 z-[9999] w-screen h-screen bg-black overflow-hidden';
  } else if (isCinema) {
    containerClasses = 'relative w-full h-full bg-black overflow-hidden rounded-none md:rounded-2xl shadow-2xl group';
  } else if (isSidebarPiP) {
    containerClasses = 'relative w-full h-full bg-black overflow-hidden rounded-xl group cursor-pointer';
  } else {
    // Floating PiP
    containerClasses = 'fixed bottom-20 right-4 z-[60] w-64 sm:w-72 aspect-video bg-black rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-white/20 overflow-hidden group cursor-pointer animate-fadeIn';
  }

  const videoElement = (
    <div
      ref={containerRef}
      className={containerClasses}
      onClick={() => {
        if (isSidebarPiP || isFloatingPiP) {
          restoreCinema();
        }
      }}
    >
      {useDirectVideo ? (
        <video
          ref={videoRef}
          key={`direct-${activeVideo.id}-${reloadKey}`}
          src={`/api/stream/${activeVideo.id}/video`}
          controls
          autoPlay
          playsInline
          className="w-full h-full object-contain rounded-none md:rounded-2xl bg-black pointer-events-auto"
          onPlaying={() => {
            setHasPlaybackStarted(true);
            setShowDirectPrompt(false);
            usePlayerStore.setState({ isPlaying: true, isVideoMode: true, activeVideoSource: 'youtube_video' });
          }}
          onPause={() => {
            usePlayerStore.setState({ isPlaying: false });
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v && v.duration) {
              usePlayerStore.setState({ currentTime: v.currentTime, duration: v.duration });
            }
          }}
          onEnded={() => {
            useVideoStore.getState().nextVideo();
          }}
        />
      ) : (
        <iframe
          ref={iframeRef}
          key={`${activeVideo.id}-${reloadKey}`}
          src={embedUrl}
          title={activeVideo.title}
          referrerPolicy="no-referrer"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          className="w-full h-full border-0 rounded-none md:rounded-2xl pointer-events-auto"
          onLoad={() => {
            try {
              iframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: 'listening' }),
                '*'
              );
              const q = videoQuality || 'hd1080';
              iframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: 'command', func: 'setPlaybackQuality', args: [q] }),
                '*'
              );
              iframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: 'command', func: 'setPlaybackQualityRange', args: [q, q] }),
                '*'
              );
            } catch {}
          }}
        />
      )}

      {/* Top-Right Player Controls (Cinema & Fullscreen modes) */}
      {(isCinema || isFullscreen) && (
        <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5 pointer-events-auto select-none">
          {/* Quality Pill Button & Dropdown (Fullscreen mode only to avoid duplicating action bar quality on page) */}
          {isFullscreen && (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPlayerQualityMenu(!showPlayerQualityMenu);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full liquid-glass-control text-white text-xs font-bold shadow-lg transition-all active:scale-95 cursor-pointer"
                title="Change Video Quality (4K, 1080p, 720p, etc.)"
              >
                <Tv className="w-3.5 h-3.5 text-primary" />
                <span>{getQualityLabel(videoQuality)}</span>
                <ChevronDown className="w-3 h-3 text-white/70" />
              </button>

              {showPlayerQualityMenu && (
                <div
                  className="absolute right-0 top-9 w-52 liquid-glass-card rounded-2xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 text-white space-y-0.5 animate-fadeIn border border-white/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold text-white/60 uppercase tracking-wider border-b border-white/10 mb-1">
                    Playback Quality
                  </div>
                  {qualityOptions.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => {
                        setVideoQuality(q.id);
                        setShowPlayerQualityMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        (videoQuality || 'hd1080') === q.id
                          ? 'liquid-glass-prominent font-bold'
                          : 'hover:bg-white/10 text-white/80'
                      }`}
                    >
                      <span>{q.label}</span>
                      {(videoQuality || 'hd1080') === q.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Theater Mode Button (Desktop Cinema mode only) */}
          {isCinema && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleTheaterMode();
              }}
              className={`p-1.5 rounded-full transition-all hidden md:flex ${
                isTheaterMode ? 'liquid-glass-prominent' : 'liquid-glass-control text-white/90 hover:text-white'
              }`}
              title={isTheaterMode ? "Exit Theater Mode" : "Theater Mode (Cinema Width)"}
            >
              <Expand className="w-4 h-4" />
            </button>
          )}

          {/* Picture-in-Picture Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePiP();
            }}
            className="hidden sm:flex p-1.5 rounded-full liquid-glass-control text-white/90 hover:text-white hover:scale-105 transition-all shadow-md"
            title="Picture-in-Picture (Sidebar PiP)"
          >
            <PictureInPicture2 className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFullscreen(e);
            }}
            className="p-1.5 rounded-full liquid-glass-control text-white/90 hover:text-white hover:scale-105 transition-all shadow-md"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Close Video Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeVideo();
            }}
            className="p-1.5 rounded-full liquid-glass-control hover:bg-red-600/80 text-white/90 hover:text-white hover:scale-105 transition-all shadow-md"
            title="Close Video"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Direct Video Active Badge */}
      {useDirectVideo && (isCinema || isFullscreen) && (
        <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1.5 animate-fadeIn pointer-events-auto">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shadow-md">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Direct 1080p</span>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setUseDirectVideo(false);
            }}
            className="px-2 py-0.5 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white text-[10px] border border-white/20 transition-all shadow-sm"
            title="Switch back to standard YouTube Embed Player"
          >
            Embed
          </button>
        </div>
      )}

      {/* Floating Direct Video Bypass Button (when in iframe mode) */}
      {!useDirectVideo && (isCinema || isFullscreen) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setUseDirectVideo(true);
          }}
          className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 hover:bg-emerald-600 text-white text-xs font-bold border border-white/20 backdrop-blur-md shadow-lg transition-all hover:scale-105 active:scale-95 pointer-events-auto"
          title="Switch to Direct Video Player to bypass YouTube embed restrictions (Error 150/152)"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Direct Player (Bypass Blocks)</span>
        </button>
      )}

      {/* Direct Video Bypass Overlay Prompt */}
      {showDirectPrompt && !useDirectVideo && !hasPlaybackStarted && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fadeIn z-30 pointer-events-auto">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/10">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-white mb-1">
            YouTube Embed Unavailable or Restricted?
          </p>
          <p className="text-xs text-white/70 max-w-md mb-4 leading-relaxed">
            Content owners block external embeds (Error 150/152). Play directly via our HTML5 stream without restrictions.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setUseDirectVideo(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Video Directly (Bypass Block)</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDirectPrompt(false);
              }}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 text-xs font-semibold transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Docked Sidebar or Floating PiP Overlay Controls */}
      {(isSidebarPiP || isFloatingPiP) && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5 pointer-events-auto select-none">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1 shadow-md shadow-red-600/40">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              PiP
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  restoreCinema();
                }}
                title="Expand to Cinema Screen"
                className="p-1.5 rounded-lg bg-black/80 hover:bg-red-600 text-white border border-white/20 transition-all hover:scale-110 active:scale-95"
              >
                <Maximize2 className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={handleToggleFullscreen}
                title="Fullscreen"
                className="p-1.5 rounded-lg bg-black/80 hover:bg-red-600 text-white border border-white/20 transition-all hover:scale-110 active:scale-95"
              >
                <Expand className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeVideo();
                }}
                title="Close Video"
                className="p-1.5 rounded-lg bg-black/80 hover:bg-red-600 text-white border border-white/20 transition-all hover:scale-110 active:scale-95"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-bold text-white truncate drop-shadow">{activeVideo.title}</p>
            <p className="text-[9px] text-zinc-300 truncate">{activeVideo.artist || 'YouTube'}</p>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(videoElement, mountNode);
};
