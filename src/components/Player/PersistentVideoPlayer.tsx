import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Maximize2, X, Expand, RefreshCw, PictureInPicture2, ShieldCheck } from 'lucide-react';
import { useVideoStore } from '../../stores/useVideoStore';
import { useNavigationStore } from '../../stores/useNavigationStore';

export const PersistentVideoPlayer: React.FC = () => {
  const {
    activeVideo,
    isPiP,
    isFullscreen,
    reloadKey,
    closeVideo,
    togglePiP,
    setIsFullscreen,
    restoreCinema,
    reloadVideo,
  } = useVideoStore();

  const activeTab = useNavigationStore((s) => s.activeTab);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [useDirectVideo, setUseDirectVideo] = useState(false);

  useEffect(() => {
    setUseDirectVideo(false);
  }, [activeVideo?.id]);

  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data?.event === 'onError' || typeof data?.info?.errorCode === 'number') {
          console.warn('Persistent video player embed restriction, enabling direct video stream:', data);
          setUseDirectVideo(true);
        }
      } catch {}
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, []);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const isCinemaMode = !isPiP && activeTab === 'youtube' && !isFullscreen;

  // Measure target container position on screen
  const updatePosition = useCallback(() => {
    if (isFullscreen) return;

    const targetId = isCinemaMode ? 'youtube-cinema-anchor' : 'sidebar-pip-anchor';
    const el = document.getElementById(targetId);

    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCoords({
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    }
  }, [isCinemaMode, isFullscreen]);

  // Keep coordinates synced across resize, scroll, and tab switches
  useEffect(() => {
    if (!activeVideo) return;

    updatePosition();

    const handleSync = () => updatePosition();
    window.addEventListener('resize', handleSync);
    window.addEventListener('scroll', handleSync, true);

    // Keep measuring for brief duration right after state change for silky animation
    let frameId: number;
    let count = 0;
    const animateSync = () => {
      updatePosition();
      count++;
      if (count < 35) {
        frameId = requestAnimationFrame(animateSync);
      }
    };
    frameId = requestAnimationFrame(animateSync);

    return () => {
      window.removeEventListener('resize', handleSync);
      window.removeEventListener('scroll', handleSync, true);
      cancelAnimationFrame(frameId);
    };
  }, [activeVideo, isCinemaMode, activeTab, isPiP, updatePosition]);

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

  if (!activeVideo) return null;

  // Build embed URL with origin to enable YouTube IFrame API communication
  const embedUrl = `https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&enablejsapi=1&rel=0&iv_load_policy=3&origin=${window.location.origin}`;

  // Compute container inline styles
  let containerStyle: React.CSSProperties;

  if (isFullscreen) {
    containerStyle = {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 9999,
      borderRadius: 0,
    };
  } else if (coords) {
    containerStyle = {
      position: 'fixed',
      top: `${coords.top}px`,
      left: `${coords.left}px`,
      width: `${coords.width}px`,
      height: `${coords.height}px`,
      zIndex: isCinemaMode ? 10 : 35,
      transition: 'top 0.35s cubic-bezier(0.16, 1, 0.3, 1), left 0.35s cubic-bezier(0.16, 1, 0.3, 1), width 0.35s cubic-bezier(0.16, 1, 0.3, 1), height 0.35s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.35s ease',
    };
  } else {
    // Initial fallback if target rect not yet computed
    containerStyle = {
      position: 'fixed',
      bottom: '90px',
      left: '12px',
      width: '232px',
      height: '130px',
      zIndex: 35,
    };
  }

  const isDockedInSidebar = !isCinemaMode && !isFullscreen;

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      onClick={() => {
        if (isDockedInSidebar) {
          restoreCinema();
        }
      }}
      className={`group overflow-hidden bg-black shadow-2xl transition-all duration-300 ${
        isFullscreen
          ? 'rounded-0'
          : isDockedInSidebar
          ? 'rounded-2xl border-2 border-white/20 hover:border-red-500/70 shadow-[0_15px_35px_rgba(0,0,0,0.85),0_0_20px_rgba(239,68,68,0.25)] cursor-pointer'
          : 'rounded-2xl border border-white/10'
      }`}
    >
      {useDirectVideo ? (
        <video
          ref={videoRef}
          key={`direct-${activeVideo.id}-${reloadKey}`}
          src={`/api/stream/${activeVideo.id}/video`}
          controls
          autoPlay
          playsInline
          className="w-full h-full object-contain rounded-2xl bg-black pointer-events-auto"
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
          className="w-full h-full border-0 rounded-2xl pointer-events-auto"
        />
      )}

      {/* Docked Sidebar PiP Overlay Controls (visible on hover when in sidebar) */}
      {isDockedInSidebar && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5 pointer-events-auto select-none">
          {/* Top Row: PiP Badge & Quick Action Buttons */}
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

          {/* Bottom Row: Video Title & Artist */}
          <div className="text-white drop-shadow space-y-0.5">
            <p className="text-[11px] font-bold truncate leading-tight">{activeVideo.title}</p>
            <p className="text-[10px] text-white/70 truncate">{activeVideo.artist}</p>
          </div>
        </div>
      )}

      {/* Fullscreen Overlay Close Button (hover at top right in fullscreen mode) */}
      {isFullscreen && (
        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleToggleFullscreen}
            title="Exit Fullscreen"
            className="px-3 py-1.5 rounded-xl bg-black/80 hover:bg-red-600 text-white text-xs font-bold border border-white/20 transition-all"
          >
            Exit Fullscreen (Esc)
          </button>
        </div>
      )}
    </div>
  );
};
