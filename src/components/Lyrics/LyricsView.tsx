import React, { useEffect, useRef } from 'react';
import { Mic2, Sparkles, Maximize2, Minimize2, X } from 'lucide-react';
import { usePlayerStore } from '../../stores/usePlayerStore';

interface LyricsViewProps {
  isFullScreen?: boolean;
  onToggleFullscreen?: () => void;
  onClose?: () => void;
}

export const LyricsView: React.FC<LyricsViewProps> = ({
  isFullScreen = false,
  onToggleFullscreen,
  onClose,
}) => {
  const { currentTrack, lyrics, isLyricsLoading, currentTime, seek } = usePlayerStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  const lines = lyrics?.lines || [];

  // Determine active lyric line index based on currentTime
  let activeIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (currentTime >= lines[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // Smooth auto-scroll active lyric line to center of container
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  if (isLyricsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-foreground-muted gap-3 py-16">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Fetching synchronized lyrics...</span>
      </div>
    );
  }

  if (!lines || lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-foreground-muted gap-3 py-16 relative">
        <Mic2 className="w-10 h-10 opacity-40 text-primary" />
        <p className="text-sm font-medium">No synchronized lyrics found for this track.</p>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs px-3 py-1 rounded-full bg-surface-elevated hover:bg-border text-foreground-muted hover:text-foreground transition-all"
          >
            Close Lyrics
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col relative select-none ${isFullScreen ? 'px-4 sm:px-12 md:px-20 py-2' : ''}`}>
      {/* Top Header / Actions Bar */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2.5">
          {isFullScreen && currentTrack?.thumbnail ? (
            <div className="flex items-center gap-2.5">
              <img
                src={currentTrack.thumbnail}
                alt=""
                className="w-8 h-8 rounded-lg object-cover shadow-md"
              />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-white truncate max-w-[200px] md:max-w-xs">
                  {currentTrack.title}
                </div>
                <div className="text-[10px] text-foreground-muted truncate">
                  {currentTrack.artist}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-foreground-muted font-medium">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Synced Lyrics</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {lyrics?.provider && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
              {lyrics.provider}
            </span>
          )}

          {/* Fullscreen Lyrics Toggle */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              title={isFullScreen ? 'Exit Fullscreen (Split View)' : 'Enter Fullscreen Lyrics'}
              className="p-1.5 rounded-full hover:bg-surface-elevated text-foreground-muted hover:text-foreground transition-all hover:scale-105 active:scale-95"
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4 text-primary" />}
            </button>
          )}

          {/* Close / Hide Lyrics Button */}
          {onClose && (
            <button
              onClick={onClose}
              title="Close Lyrics (Return to Centered Artwork)"
              className="p-1.5 rounded-full hover:bg-surface-elevated text-foreground-muted hover:text-foreground transition-all hover:scale-105 active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Lyrics Auto-scrolling List */}
      <div
        ref={containerRef}
        className={`flex-1 min-h-0 overflow-y-auto px-6 py-6 text-center scroll-smooth ${
          isFullScreen ? 'space-y-6 md:space-y-8' : 'space-y-4'
        }`}
      >
        {lines.map((line, idx) => {
          const isActive = idx === activeIndex;
          const isPassed = idx < activeIndex;

          return (
            <div
              key={idx}
              ref={isActive ? activeLineRef : null}
              onClick={() => seek(line.time)}
              className={`cursor-pointer transition-all duration-300 py-1.5 px-4 rounded-2xl ${
                isActive
                  ? isFullScreen
                    ? 'text-white text-3xl sm:text-4xl md:text-5xl font-black scale-105 tracking-tight'
                    : 'text-white text-xl md:text-2xl font-extrabold scale-105 tracking-tight'
                  : isPassed
                  ? isFullScreen
                    ? 'text-foreground-muted/40 text-xl sm:text-2xl font-medium hover:text-foreground-muted'
                    : 'text-foreground-muted/50 text-base md:text-lg font-medium hover:text-foreground-muted'
                  : isFullScreen
                  ? 'text-foreground-subtle text-xl sm:text-2xl font-medium hover:text-foreground'
                  : 'text-foreground-subtle text-base md:text-lg font-medium hover:text-foreground'
              }`}
              style={{
                textShadow: isActive ? '0 0 30px rgba(250, 45, 72, 0.5)' : 'none',
              }}
            >
              {/* Syllable / word-level timings if available */}
              {line.words && line.words.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-x-2">
                  {line.words.map((word, wIdx) => {
                    const isWordActive = currentTime >= word.time;
                    return (
                      <span
                        key={wIdx}
                        className={`transition-all duration-150 ${
                          isWordActive
                            ? 'text-white font-extrabold'
                            : 'text-foreground-muted/40 font-semibold'
                        }`}
                      >
                        {word.text}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span>{line.text}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
