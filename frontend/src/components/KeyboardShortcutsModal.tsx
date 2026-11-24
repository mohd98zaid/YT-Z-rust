import React, { useEffect, useState } from 'react';
import { Keyboard, X, Play, SkipForward, SkipBack, Volume2, Maximize, Mic2, Sliders, Timer, Search } from 'lucide-react';
import { usePlayerStore } from '../stores/usePlayerStore';

export const KeyboardShortcutsModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    togglePlay,
    seek,
    currentTime,
    duration,
    next,
    previous,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    setExpanded,
    isExpanded,
    toggleLyrics,
    toggleEqualizer,
    toggleSleepTimer,
  } = usePlayerStore();

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when focused in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'j':
        case 'arrowleft':
          e.preventDefault();
          seek(Math.max(0, currentTime - 10));
          break;
        case 'l':
        case 'arrowright':
          e.preventDefault();
          seek(Math.min(duration, currentTime + 10));
          break;
        case 'n':
          e.preventDefault();
          next();
          break;
        case 'p':
          e.preventDefault();
          previous();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 's':
          e.preventDefault();
          toggleShuffle();
          break;
        case 'r':
          e.preventDefault();
          cycleRepeat();
          break;
        case 'f':
          e.preventDefault();
          setExpanded(!isExpanded);
          break;
        case 'c':
          e.preventDefault();
          toggleLyrics();
          break;
        case 'e':
          e.preventDefault();
          toggleEqualizer();
          break;
        case 't':
          e.preventDefault();
          toggleSleepTimer();
          break;
        case '/':
          e.preventDefault();
          const searchInput = document.querySelector('header input') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, currentTime, duration, isExpanded, togglePlay, seek, next, previous, toggleMute, toggleShuffle, cycleRepeat, setExpanded, toggleLyrics, toggleEqualizer, toggleSleepTimer]);

  if (!isOpen) return null;

  const shortcutGroups = [
    {
      category: 'Playback Controls',
      items: [
        { key: 'Space / K', desc: 'Play / Pause', icon: Play },
        { key: 'J / ←', desc: 'Seek backwards 10s', icon: SkipBack },
        { key: 'L / →', desc: 'Seek forwards 10s', icon: SkipForward },
        { key: 'N', desc: 'Next track', icon: SkipForward },
        { key: 'P', desc: 'Previous track', icon: SkipBack },
        { key: 'M', desc: 'Mute / Unmute', icon: Volume2 },
      ],
    },
    {
      category: 'Views & Panels',
      items: [
        { key: 'F', desc: 'Toggle Expanded / Fullscreen', icon: Maximize },
        { key: 'C', desc: 'Toggle Synced Lyrics', icon: Mic2 },
        { key: 'E', desc: '10-Band Studio Equalizer', icon: Sliders },
        { key: 'T', desc: 'Sleep Timer Dialog', icon: Timer },
        { key: '/', desc: 'Quick Focus Search Bar', icon: Search },
        { key: '?', desc: 'Open / Close Shortcuts', icon: Keyboard },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none animate-fadeIn"
      onClick={() => setIsOpen(false)}
    >
      <div
        style={{ backgroundColor: 'var(--bg-surface)' }}
        className="bg-surface border-2 border-border/80 rounded-3xl p-6 w-full max-w-xl shadow-[0_20px_50px_rgba(0,0,0,0.65)] relative overflow-hidden space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Keyboard Shortcuts</h3>
              <p className="text-xs text-foreground-muted">Pro studio control at your fingertips</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full hover:bg-surface-elevated text-foreground-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {shortcutGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2.5">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                {group.category}
              </span>
              <div className="space-y-1.5">
                {group.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    className="flex items-center justify-between p-2 rounded-xl bg-surface-elevated/50 border border-border/40 text-xs"
                  >
                    <span className="text-foreground-muted flex items-center gap-2">
                      <item.icon className="w-3.5 h-3.5 text-foreground-subtle" />
                      <span>{item.desc}</span>
                    </span>
                    <kbd className="px-2 py-0.5 rounded-lg bg-surface border border-white/10 font-mono font-bold text-[11px] text-foreground shadow-sm">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs text-foreground-subtle">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border font-mono text-[10px]">?</kbd> anywhere to open</span>
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
