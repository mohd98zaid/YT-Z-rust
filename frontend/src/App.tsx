import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { Header } from './components/Header';
import { MiniPlayer } from './components/Player/MiniPlayer';
import { ExpandedPlayer } from './components/Player/ExpandedPlayer';
import { EqualizerModal } from './components/Player/EqualizerModal';
import { AudioPipelineModal } from './components/Player/AudioPipelineModal';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { SearchPage } from './pages/SearchPage';
import { DownloaderPage } from './pages/DownloaderPage';
import { SpotifyImporterPage } from './pages/SpotifyImporterPage';
import { LibraryPage } from './pages/LibraryPage';
import { SettingsPage } from './pages/SettingsPage';
import { PluginsPage } from './pages/PluginsPage';
import { YouTubePage } from './pages/YouTubePage';
import { SleepTimerModal } from './components/Player/SleepTimerModal';
import { PersistentVideoPlayer } from './components/Player/PersistentVideoPlayer';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useThemeStore } from './stores/useThemeStore';
import { useDownloadStore } from './stores/useDownloadStore';
import { usePlayerStore } from './stores/usePlayerStore';
import { useNavigationStore } from './stores/useNavigationStore';
import { useVideoStore } from './stores/useVideoStore';
import { api } from './services/api';

export const App: React.FC = () => {
  const { activeTab, setActiveTab, initNavigation } = useNavigationStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [allTabsMounted, setAllTabsMounted] = useState(false);
  const { initTheme } = useThemeStore();
  const { restoreSessionFromConfig } = usePlayerStore();
  const { initWebSocket } = useDownloadStore();
  const {
    isExpanded,
    currentTrack,
    enableStatsForNerds,
    showStatsForNerds,
    toggleStatsForNerds,
  } = usePlayerStore();
  const { activeVideo, isPiP } = useVideoStore();
  const isWatchingVideoInPage = Boolean(activeVideo && activeTab === 'youtube' && !isPiP);

  useEffect(() => {
    initTheme();
    // Default screen is strictly home screen
    setActiveTab('home');
    initNavigation();

    // Priority 1: Resume only the current playing song on launch (clean single-call)
    let sessionResumed = false;
    const resumeCurrentSong = (trackToPlay?: any, timeToSeek?: number) => {
      if (sessionResumed) return;
      sessionResumed = true;
      const state = usePlayerStore.getState();
      const trk = trackToPlay || state.currentTrack;
      if (trk) {
        const seek = typeof timeToSeek === 'number' ? timeToSeek : state.currentTime;
        state.autoPlayLastTrack(trk, [trk], seek);
      }
    };

    api.getConfig().then((cfg) => {
      if (cfg) {
        restoreSessionFromConfig(cfg, false);
        const trk = cfg.current_track || usePlayerStore.getState().currentTrack;
        const seek = typeof cfg.current_time === 'number' ? cfg.current_time : usePlayerStore.getState().currentTime;
        resumeCurrentSong(trk, seek);
      } else {
        resumeCurrentSong();
      }
    }).catch(() => {
      resumeCurrentSong();
    });

    const fallbackResume = setTimeout(() => {
      resumeCurrentSong();
    }, 250);

    // Priority 2: Preload complete UI for all tabs in background after Home page & Song priority load
    const tabPreloadTimer = setTimeout(() => {
      setAllTabsMounted(true);
    }, 120);

    const cleanupWs = initWebSocket();

    // Global F11 key shortcut for full-screen toggle
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Native Windows Taskbar Thumbnail Toolbar Action Listener (Previous / Play-Pause / Next)
    const handleTaskbarAction = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const action = customEvent.detail;
      const player = usePlayerStore.getState();
      if (action === 'previous') {
        player.previous().catch(() => {});
      } else if (action === 'togglePlay') {
        player.togglePlay();
      } else if (action === 'next') {
        player.next().catch(() => {});
      }
    };
    window.addEventListener('ytz-taskbar-action', handleTaskbarAction);

    return () => {
      clearTimeout(fallbackResume);
      clearTimeout(tabPreloadTimer);
      cleanupWs();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('ytz-taskbar-action', handleTaskbarAction);
    };
  }, [initTheme, initWebSocket, setActiveTab, initNavigation, restoreSessionFromConfig]);

  // Synchronize playback state & metadata with Windows Taskbar thumbnail controls & tooltip
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  useEffect(() => {
    api.updateTaskbarState(
      isPlaying,
      currentTrack?.title || 'YT-Z',
      currentTrack?.artist || 'Ultimate YouTube Music'
    ).catch(() => {});
  }, [isPlaying, currentTrack?.id, currentTrack?.title, currentTrack?.artist]);

  const handleSearchSubmit = (query: string) => {
    setSearchQuery(query);
    setActiveTab('search');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground select-none">
      {/* Left Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Top Header */}
        <Header
          onSearchSubmit={handleSearchSubmit}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Scrollable Page Body */}
        <main id="main-content" className="flex-1 overflow-y-auto scroll-smooth">
          <ErrorBoundary fallbackTitle="Something went wrong while rendering this section">
            {/* Priority 1: Home page UI loads first immediately */}
            <div className={activeTab === 'home' ? 'min-h-full' : 'hidden'}>
              <HomePage />
            </div>

            {/* Complete UI loaded across all tabs with background preloading */}
            {(allTabsMounted || activeTab === 'explore') && (
              <div className={activeTab === 'explore' ? 'min-h-full' : 'hidden'}>
                <ExplorePage />
              </div>
            )}
            {(allTabsMounted || activeTab === 'search') && (
              <div className={activeTab === 'search' ? 'min-h-full' : 'hidden'}>
                <SearchPage initialQuery={searchQuery} />
              </div>
            )}
            {(allTabsMounted || activeTab === 'youtube') && (
              <div className={activeTab === 'youtube' ? 'min-h-full' : 'hidden'}>
                <YouTubePage />
              </div>
            )}
            {(allTabsMounted || activeTab === 'downloader') && (
              <div className={activeTab === 'downloader' ? 'min-h-full' : 'hidden'}>
                <DownloaderPage />
              </div>
            )}
            {(allTabsMounted || activeTab === 'spotify') && (
              <div className={activeTab === 'spotify' ? 'min-h-full' : 'hidden'}>
                <SpotifyImporterPage />
              </div>
            )}
            {(allTabsMounted || activeTab === 'library') && (
              <div className={activeTab === 'library' ? 'min-h-full' : 'hidden'}>
                <LibraryPage />
              </div>
            )}
            {(allTabsMounted || activeTab === 'plugins') && (
              <div className={activeTab === 'plugins' ? 'min-h-full' : 'hidden'}>
                <PluginsPage />
              </div>
            )}
            {(allTabsMounted || activeTab === 'settings') && (
              <div className={activeTab === 'settings' ? 'min-h-full' : 'hidden'}>
                <SettingsPage />
              </div>
            )}
          </ErrorBoundary>
        </main>

        {/* Desktop Docked Mini Player (Hidden when watching a video in YouTube page or on Mobile) */}
        {!isExpanded && !isWatchingVideoInPage && (
          <div className="hidden md:block">
            <MiniPlayer mode="desktop" />
          </div>
        )}

        {/* BitChord Mobile Floating Glass Stack (md:hidden) */}
        <div className="fixed bottom-0 inset-x-0 z-40 md:hidden pointer-events-none pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] px-3.5 space-y-2">
          {/* Floating Glass MiniPlayer (Hidden when watching video) */}
          {currentTrack && !isExpanded && !isWatchingVideoInPage && (
            <div className="pointer-events-auto max-w-md mx-auto animate-fadeIn">
              <MiniPlayer mode="mobile" />
            </div>
          )}
          {/* Floating Glass Bottom Nav */}
          <div className="pointer-events-auto max-w-md mx-auto">
            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
        </div>
      </div>

      {/* Expanded Fullscreen Player Overlay */}
      <ExpandedPlayer />

      {/* BitChord / Apple Music Live Audio Pipeline Modal */}
      <AudioPipelineModal isOpen={Boolean(enableStatsForNerds && showStatsForNerds)} onClose={toggleStatsForNerds} />

      {/* Studio Graphic Equalizer Modal */}
      <EqualizerModal />

      {/* Sleep Timer Modal */}
      <SleepTimerModal />

      {/* Global Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal />

      {/* Global Persistent Video Player (Cinema + Sidebar PiP) */}
      <PersistentVideoPlayer />
    </div>
  );
};
