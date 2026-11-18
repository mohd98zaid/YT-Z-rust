import React, { useState, useEffect } from 'react';
import { Sidebar, TabType } from './components/Sidebar';
import { Header } from './components/Header';
import { MiniPlayer } from './components/Player/MiniPlayer';
import { ExpandedPlayer } from './components/Player/ExpandedPlayer';
import { EqualizerModal } from './components/Player/EqualizerModal';
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
import { useThemeStore } from './stores/useThemeStore';
import { useDownloadStore } from './stores/useDownloadStore';
import { usePlayerStore } from './stores/usePlayerStore';
import { useNavigationStore } from './stores/useNavigationStore';

export const App: React.FC = () => {
  const { activeTab, setActiveTab } = useNavigationStore();
  const [searchQuery, setSearchQuery] = useState('');
  const { initTheme } = useThemeStore();
  const { initWebSocket } = useDownloadStore();
  const isExpanded = usePlayerStore((s) => s.isExpanded);

  useEffect(() => {
    initTheme();
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
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'home' && <HomePage />}
          {activeTab === 'explore' && <ExplorePage />}
          {activeTab === 'search' && <SearchPage initialQuery={searchQuery} />}
          {activeTab === 'youtube' && <YouTubePage />}
          {activeTab === 'downloader' && <DownloaderPage />}
          {activeTab === 'spotify' && <SpotifyImporterPage />}
          {activeTab === 'library' && <LibraryPage />}
          {activeTab === 'plugins' && <PluginsPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>

        {/* Docked Mini Player */}
        {!isExpanded && <MiniPlayer />}
      </div>

      {/* Expanded Fullscreen Player Overlay */}
      <ExpandedPlayer />

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
