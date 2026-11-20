import React from 'react';
import {
  Home,
  Compass,
  Search,
  Download,
  FolderHeart,
  ListMusic,
  Settings,
  Radio,
  Sparkles,
  Puzzle,
  Video,
} from 'lucide-react';
import { useDownloadStore } from '../stores/useDownloadStore';
import { useVideoStore } from '../stores/useVideoStore';

export type TabType =
  | 'home'
  | 'explore'
  | 'search'
  | 'youtube'
  | 'downloader'
  | 'spotify'
  | 'library'
  | 'plugins'
  | 'settings';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { activeVideo, isPiP } = useVideoStore();
  const queue = useDownloadStore((s) => s.queue);
  const activeDownloadsCount = queue.filter(
    (item) => item.status === 'downloading' || item.status === 'pending' || item.status === 'processing'
  ).length;

  const navItems: { id: TabType; label: string; icon: any; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'explore', label: 'Explore & Charts', icon: Compass },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'youtube', label: 'YouTube Videos', icon: Video },
    { id: 'downloader', label: 'Downloader', icon: Download, badge: activeDownloadsCount },
    { id: 'spotify', label: 'Spotify Importer', icon: ListMusic },
    { id: 'library', label: 'My Library', icon: FolderHeart },
    { id: 'plugins', label: 'Plugins & Sources', icon: Puzzle },
    { id: 'settings', label: 'Settings & Themes', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col justify-between shrink-0 select-none z-20 backdrop-blur-xl">
      {/* App Branding */}
      <div>
        <div className="p-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/app-icon.webp"
              alt="YT-Z Logo"
              className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-primary/25 border border-white/10"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-foreground font-sans">
                  YT<span className="text-primary">-Z</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                  ULTIMATE
                </span>
              </div>
              <p className="text-[11px] text-foreground-muted">Music & 4K Downloader</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 mt-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/25 font-semibold'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-elevated'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-foreground-muted'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white text-primary'
                        : 'bg-primary text-white animate-pulse'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Docked PiP Video Slot in Sidebar */}
      <div className="px-3 py-2 shrink-0">
        <div
          id="sidebar-pip-anchor"
          className={`w-full transition-all duration-300 rounded-2xl ${
            activeVideo && (isPiP || activeTab !== 'youtube')
              ? 'aspect-video bg-black/40 border border-white/10 shadow-lg'
              : 'h-0 opacity-0 overflow-hidden'
          }`}
        />
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-border/50 text-[11px] text-foreground-subtle space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-foreground-muted font-medium">Core Engine</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated text-foreground-muted font-mono">
            {typeof window !== 'undefined' && window.location.hostname ? `${window.location.hostname}:${window.location.port || '47892'}` : '127.0.0.1:47892'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-foreground-muted">
          <Sparkles className="w-3 h-3 text-primary" />
          <span>High-Fidelity Audio & 4K Engine</span>
        </div>
      </div>
    </aside>
  );
};
