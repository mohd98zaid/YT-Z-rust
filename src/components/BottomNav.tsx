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
      {/* Slide-Up "More" Sheet on Mobile */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-[600] md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={() => setIsMoreOpen(false)}
          />

          {/* Sheet Body */}
          <div className="relative bg-surface border-t border-border rounded-t-3xl p-5 shadow-2xl z-10 space-y-4 animate-slideUp max-h-[85vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-extrabold text-sm text-foreground">More Channels & Tools</span>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-1 rounded-full text-foreground-muted hover:text-foreground hover:bg-surface-elevated"
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
                    className={`flex items-center justify-between p-3 rounded-2xl text-left transition-all border ${
                      isSelected
                        ? 'bg-primary/15 border-primary/40 text-primary shadow-sm'
                        : 'bg-surface-elevated/60 hover:bg-surface-elevated border-border/40 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          isSelected ? 'bg-primary text-white' : 'bg-surface text-foreground-muted border border-border/60'
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
                        <p className="text-[10px] text-foreground-muted">{item.desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (md:hidden) */}
      <nav className="md:hidden flex items-center justify-around h-15 bg-surface/95 backdrop-blur-xl border-t border-border/80 shrink-0 z-40 select-none px-2 pb-[env(safe-area-inset-bottom,0px)]">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
                isSelected ? 'text-primary font-bold' : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${isSelected ? 'scale-110' : ''}`} />
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}

        {/* More Tab */}
        <button
          onClick={() => setIsMoreOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-all active:scale-95 ${
            isMoreActive ? 'text-primary font-bold' : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          <div className="relative">
            <Menu className={`w-5 h-5 transition-transform ${isMoreActive ? 'scale-110' : ''}`} />
            {activeDownloadsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-surface" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">More</span>
        </button>
      </nav>
    </>
  );
};
