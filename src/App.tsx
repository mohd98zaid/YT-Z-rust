import React, { useState, useEffect } from 'react';
import { Sidebar, TabType } from './components/Sidebar';
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
    initNavigation();

    // Start playing the last song immediately when starting the app
    const initialPlayerState = usePlayerStore.getState();
    if (initialPlayerState.currentTrack && !initialPlayerState.isPlaying) {
      initialPlayerState.autoPlayLastTrack();
    }

    api.getConfig().then((cfg) => {
      if (cfg) {
        restoreSessionFromConfig(cfg, true);
      } else {
        usePlayerStore.getState().autoPlayLastTrack();
      }
    }).catch(() => {
      usePlayerStore.getState().autoPlayLastTrack();
    });

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

    return () => {
      cleanupWs();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [initTheme, initWebSocket]);

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
            {activeTab === 'home' && <HomePage />}
            {activeTab === 'explore' && <ExplorePage />}
            {activeTab === 'search' && <SearchPage initialQuery={searchQuery} />}
            {activeTab === 'youtube' && <YouTubePage />}
            {activeTab === 'downloader' && <DownloaderPage />}
            {activeTab === 'spotify' && <SpotifyImporterPage />}
            {activeTab === 'library' && <LibraryPage />}
            {activeTab === 'plugins' && <PluginsPage />}
            {activeTab === 'settings' && <SettingsPage />}
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
