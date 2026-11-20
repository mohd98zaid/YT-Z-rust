import React, { useEffect, useRef, useState } from 'react';
import { Mic2, Sparkles, Maximize2, Minimize2, X, Palette } from 'lucide-react';
import { usePlayerStore } from '../../stores/usePlayerStore';
import {
  useLyricsSettingsStore,
  FONT_OPTIONS,
  BACKGROUND_PRESETS,
} from '../../stores/useLyricsSettingsStore';
import { LyricsAppearanceModal } from './LyricsAppearanceModal';

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
  const [isAppearanceModalOpen, setIsAppearanceModalOpen] = useState(false);

  const {
    fontFamily,
    activeTextColor,
    glowColor,
    glowIntensity,
    backgroundStyle,
    alignment,
    fontSize,
    animationStyle,
    inactiveOpacity,
  } = useLyricsSettingsStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  const lines = lyrics?.lines || [];
  const isNoLyrics =
    !lines ||
    lines.length === 0 ||
    (lines.length === 1 && lines[0].text.toLowerCase().includes('no synchronized lyrics found'));

  // Determine active lyric line index based on currentTime
  let activeIndex = -1;
  if (!isNoLyrics) {
    for (let i = 0; i < lines.length; i++) {
      if (currentTime >= lines[i].time) {
        activeIndex = i;
      } else {
        break;
      }
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

  const currentFont =
    FONT_OPTIONS.find((f) => f.id === fontFamily)?.cssFamily || FONT_OPTIONS[0].cssFamily;
  const currentBgClass =
    BACKGROUND_PRESETS.find((b) => b.id === backgroundStyle)?.bgClass || '';

  const textAlignClass =
    alignment === 'left' ? 'text-left' : alignment === 'right' ? 'text-right' : 'text-center';

  const glowRadius =
    glowIntensity === 'none'
      ? '0px'
      : glowIntensity === 'subtle'
      ? '10px'
      : glowIntensity === 'radiant'
      ? '22px'
      : '36px';

  // Dynamic font sizing
  const activeSizeClass =
    fontSize === 'compact'
      ? 'text-lg sm:text-xl font-bold'
      : fontSize === 'standard'
      ? 'text-xl sm:text-2xl font-extrabold'
      : fontSize === 'large'
      ? isFullScreen
        ? 'text-2xl sm:text-4xl md:text-5xl font-black'
        : 'text-xl md:text-3xl font-black'
      : isFullScreen
      ? 'text-3xl sm:text-5xl md:text-6xl font-black'
      : 'text-2xl md:text-4xl font-black';

  const inactiveSizeClass =
    fontSize === 'compact'
      ? 'text-xs sm:text-sm font-medium'
      : fontSize === 'standard'
      ? 'text-sm sm:text-base font-medium'
      : fontSize === 'large'
      ? isFullScreen
        ? 'text-base sm:text-xl md:text-2xl font-medium'
        : 'text-sm md:text-lg font-medium'
      : isFullScreen
      ? 'text-lg sm:text-2xl md:text-3xl font-semibold'
      : 'text-base md:text-xl font-semibold';

  return (
    <div
      className={`h-full flex flex-col relative select-none transition-all duration-500 ${currentBgClass} ${
        isFullScreen ? 'px-4 sm:px-12 md:px-20 py-2' : ''
      }`}
      style={{ fontFamily: currentFont }}
    >
      {/* Top Header / Actions Bar */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-white/10 shrink-0 relative z-20 font-sans">
        <div className="flex items-center gap-2.5">
          {isFullScreen && currentTrack?.thumbnail ? (
            <div className="flex items-center gap-2.5">
              <img
                src={currentTrack.thumbnail}
                alt=""
                className="w-8 h-8 rounded-lg object-cover shadow-md border border-white/10"
              />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-foreground dark:text-white truncate max-w-[200px] md:max-w-xs">
                  {currentTrack.title}
                </div>
                <div className="text-[10px] text-foreground-muted dark:text-white/60 truncate">
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

          {/* Appearance Customizer Trigger */}
          <button
            onClick={() => setIsAppearanceModalOpen(true)}
            title="Customize Fonts, Colors & Background"
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 hover:bg-primary/30 text-white transition-all text-xs font-bold border border-primary/40 active:scale-95 shadow-sm"
          >
            <Palette className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px]">Style & Fonts</span>
          </button>

          {/* Fullscreen Lyrics Toggle */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              title={isFullScreen ? 'Exit Fullscreen (Split View)' : 'Enter Fullscreen Lyrics'}
              className="p-1.5 rounded-full hover:bg-white/10 text-foreground-muted dark:text-white/70 hover:text-foreground dark:hover:text-white transition-all hover:scale-105 active:scale-95"
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4 text-primary" />}
            </button>
          )}

          {/* Close / Hide Lyrics Button */}
          {onClose && (
            <button
              onClick={onClose}
              title="Close Lyrics (Return to Centered Artwork)"
              className="p-1.5 rounded-full hover:bg-white/10 text-foreground-muted dark:text-white/70 hover:text-foreground dark:hover:text-white transition-all hover:scale-105 active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Loading vs Empty vs Lyrics List */}
      {isLyricsLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-foreground-muted gap-3 py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Fetching synchronized lyrics...</span>
        </div>
      ) : isNoLyrics ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 relative animate-fadeIn font-sans">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-primary mb-4 shadow-lg shadow-primary/20">
            <Mic2 className="w-8 h-8 opacity-80" />
          </div>
          <h3 className="text-lg font-black text-foreground dark:text-white tracking-tight">
            No Synchronized Lyrics Found
          </h3>
          <p className="text-xs text-foreground-muted dark:text-white/60 max-w-xs mt-1 mb-6">
            Synchronized lyrics aren't available for this track yet, but you can customize fonts, colors, and styling anytime.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAppearanceModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-lg shadow-primary/30 active:scale-95 transition-all"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Customize Style & Fonts</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold border border-white/10 active:scale-95 transition-all"
              >
                Back to Cover
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Lyrics Auto-scrolling List */
        <div
          ref={containerRef}
          className={`flex-1 min-h-0 overflow-y-auto px-6 py-8 scroll-smooth ${textAlignClass} ${
            isFullScreen ? 'space-y-6 md:space-y-8' : 'space-y-4 md:space-y-5'
          }`}
        >
          {lines.map((line, idx) => {
            const isActive = idx === activeIndex;
            const isPassed = idx < activeIndex;

            const textShadow =
              glowIntensity !== 'none' && isActive
                ? `0 0 ${glowRadius} ${glowColor || activeTextColor}`
                : 'none';

            const scaleClass =
              animationStyle === 'kinetic' && isActive
                ? 'scale-105 origin-center'
                : animationStyle === 'karaoke' && isActive
                ? 'scale-[1.03] origin-center'
                : '';

            return (
              <div
                key={idx}
                ref={isActive ? activeLineRef : null}
                onClick={() => seek(line.time)}
                className={`cursor-pointer transition-all duration-300 py-1.5 px-4 rounded-2xl ${
                  isActive ? activeSizeClass : inactiveSizeClass
                } ${scaleClass}`}
                style={{
                  color: isActive ? activeTextColor : undefined,
                  opacity: isActive ? 1 : isPassed ? inactiveOpacity * 0.8 : inactiveOpacity,
                  textShadow,
                }}
              >
                {/* Syllable / word-level timings if available */}
                {line.words && line.words.length > 0 ? (
                  <div
                    className={`flex flex-wrap gap-x-2 ${
                      alignment === 'left'
                        ? 'justify-start'
                        : alignment === 'right'
                        ? 'justify-end'
                        : 'justify-center'
                    }`}
                  >
                    {line.words.map((word, wIdx) => {
                      const isWordActive = currentTime >= word.time;
                      return (
                        <span
                          key={wIdx}
                          className={`transition-all duration-150 ${
                            isWordActive ? 'font-extrabold' : 'font-semibold'
                          }`}
                          style={{
                            color: isWordActive ? activeTextColor : undefined,
                            opacity: isWordActive ? 1 : 0.6,
                            textShadow:
                              isWordActive && glowIntensity !== 'none'
                                ? `0 0 ${glowRadius} ${glowColor || activeTextColor}`
                                : 'none',
                          }}
                        >
                          {word.text}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="leading-relaxed tracking-tight">{line.text}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lyrics Appearance Modal */}
      <LyricsAppearanceModal
        isOpen={isAppearanceModalOpen}
        onClose={() => setIsAppearanceModalOpen(false)}
      />
    </div>
  );
};
