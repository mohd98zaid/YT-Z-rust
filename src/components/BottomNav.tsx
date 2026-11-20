import React, { useState } from 'react';
import {
  Home,
  Compass,
  Search,
  FolderHeart,
  Menu,
  Download,
  Video,
  ListMusic,
  Puzzle,
  Settings,
  X,
  Sparkles,
} from 'lucide-react';
import { TabType } from './Sidebar';
import { useDownloadStore } from '../stores/useDownloadStore';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const queue = useDownloadStore((s) => s.queue);
  const activeDownloadsCount = queue.filter(
    (item) => item.status === 'downloading' || item.status === 'pending' || item.status === 'processing'
  ).length;

  const primaryTabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Library', icon: FolderHeart },
  ];

  const moreTabs: { id: TabType; label: string; icon: any; badge?: number; desc: string }[] = [
    { id: 'youtube', label: 'YouTube Cinema', icon: Video, desc: 'Watch HD videos & concerts' },
    { id: 'downloader', label: 'Downloader', icon: Download, badge: activeDownloadsCount, desc: '4K video & FLAC offline audio' },
    { id: 'spotify', label: 'Spotify Importer', icon: ListMusic, desc: 'Import playlists & liked songs' },
    { id: 'plugins', label: 'Plugins & Addons', icon: Puzzle, desc: 'FLAC sources, lyrics & scrobblers' },
    { id: 'settings', label: 'Settings & Themes', icon: Settings, desc: 'Audio engine, EQ & custom styling' },
  ];

  const isMoreActive = moreTabs.some((t) => t.id === activeTab);

  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    setIsMoreOpen(false);
  };

  return (
    <>
      {/* BitChord Frosted Slide-Up "More" Sheet on Mobile */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-[600] md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={() => setIsMoreOpen(false)}
          />

          {/* Sheet Body */}
          <div className="relative bg-[#14151b]/95 dark:bg-[#0c0d12]/95 backdrop-blur-2xl border-t border-x border-white/15 rounded-t-[32px] p-5 shadow-[0_-12px_48px_rgba(0,0,0,0.6)] z-10 space-y-4 animate-slideUp max-h-[85vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
            {/* Grab Handle */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto -mt-1 mb-2" />

            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-extrabold text-sm text-foreground">More Channels & Tools</span>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-1 rounded-full text-foreground-muted hover:text-foreground hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {moreTabs.map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl text-left transition-all border active:scale-[0.98] ${
                      isSelected
                        ? 'bg-primary/20 border-primary/50 text-primary shadow-sm'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          isSelected ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-surface text-foreground-muted border border-white/10'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs flex items-center gap-2">
                          <span>{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-primary text-white font-mono">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-foreground-muted mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* BitChord Authentic Floating Liquid Glass Bottom Bar */}
      <nav className="w-full bg-[#121318]/85 dark:bg-[#0a0a0e]/85 backdrop-blur-2xl border border-white/15 dark:border-white/10 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.55)] p-1.5 flex items-center justify-between select-none">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              className={`relative flex items-center justify-center gap-1.5 py-2 px-3 rounded-full transition-all duration-200 active:scale-90 ${
                isSelected
                  ? 'bg-primary text-white shadow-md shadow-primary/35 font-bold'
                  : 'text-foreground-muted hover:text-foreground hover:bg-white/5 font-medium'
              }`}
            >
              <Icon className={`w-4 h-4 transition-transform duration-200 ${isSelected ? 'scale-110' : ''}`} />
              <span className={`text-[11px] tracking-tight transition-all duration-200 ${isSelected ? 'inline-block' : 'hidden sm:inline-block'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* More Tab */}
        <button
          onClick={() => setIsMoreOpen(true)}
          className={`relative flex items-center justify-center gap-1.5 py-2 px-3 rounded-full transition-all duration-200 active:scale-90 ${
            isMoreActive
              ? 'bg-primary text-white shadow-md shadow-primary/35 font-bold'
              : 'text-foreground-muted hover:text-foreground hover:bg-white/5 font-medium'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <Menu className={`w-4 h-4 transition-transform duration-200 ${isMoreActive ? 'scale-110' : ''}`} />
            {activeDownloadsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary ring-2 ring-surface animate-pulse" />
            )}
          </div>
          <span className={`text-[11px] tracking-tight transition-all duration-200 ${isMoreActive ? 'inline-block' : 'hidden sm:inline-block'}`}>
            More
          </span>
        </button>
      </nav>
    </>
  );
};
