import React from 'react';
import {
  Home,
  Compass,
  Search,
  Download,
  FolderHeart,
  ListMusic,
  Settings,
  Sparkles,
  Puzzle,
  Video,
  Menu,
} from 'lucide-react';
import { useDownloadStore } from '../stores/useDownloadStore';
import { useVideoStore } from '../stores/useVideoStore';
import { useNavigationStore } from '../stores/useNavigationStore';

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
  const { isSidebarCollapsed, toggleSidebarCollapse } = useNavigationStore();
  const queue = useDownloadStore((s) => s.queue);
  const activeDownloadsCount = queue.filter(
    (item) => item.status === 'downloading' || item.status === 'pending' || item.status === 'processing'
  ).length;

  const navItems: { id: TabType; label: string; short: string; icon: any; badge?: number }[] = [
    { id: 'home', label: 'Home', short: 'Home', icon: Home },
    { id: 'explore', label: 'Explore & Charts', short: 'Explore', icon: Compass },
    { id: 'search', label: 'Search', short: 'Search', icon: Search },
    { id: 'youtube', label: 'YouTube Videos', short: 'YouTube', icon: Video },
    { id: 'downloader', label: 'Downloader', short: 'Downloads', icon: Download, badge: activeDownloadsCount },
    { id: 'spotify', label: 'Spotify Importer', short: 'Spotify', icon: ListMusic },
    { id: 'library', label: 'My Library', short: 'Library', icon: FolderHeart },
    { id: 'plugins', label: 'Plugins & Sources', short: 'Plugins', icon: Puzzle },
    { id: 'settings', label: 'Settings & Themes', short: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`hidden md:flex liquid-glass border-r border-white/15 flex-col justify-between shrink-0 select-none z-20 transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'w-16 lg:w-[72px]' : 'w-60 lg:w-64'
      }`}
    >
      {/* Top Branding & Hamburger Toggle */}
      <div>
        {isSidebarCollapsed ? (
          /* Collapsed Mini Header */
          <div className="p-3 flex flex-col items-center gap-3">
            <button
              onClick={toggleSidebarCollapse}
              className="p-2 rounded-xl text-foreground-muted hover:text-foreground liquid-glass-control"
              title="Expand sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <img
              src="/app-icon.webp"
              alt="YT-Z"
              className="w-8 h-8 rounded-lg object-cover shadow-sm border border-white/20"
            />
          </div>
        ) : (
          /* Expanded Full Header */
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/app-icon.webp"
                alt="YT-Z Logo"
                className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-primary/25 border border-white/20 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg tracking-tight text-foreground font-sans">
                    YT<span className="text-primary">-Z</span>
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary/20 text-primary border border-primary/30">
                    ULTIMATE
                  </span>
                </div>
                <p className="text-[10px] text-foreground-muted truncate">Music & 4K Downloader</p>
              </div>
            </div>

            <button
              onClick={toggleSidebarCollapse}
              className="p-2 rounded-xl text-foreground-muted hover:text-foreground liquid-glass-control shrink-0"
              title="Collapse sidebar (Mini rail mode)"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Navigation Items (YouTube Web Style with Liquid Glass) */}
        <nav className={`mt-2 space-y-1 ${isSidebarCollapsed ? 'px-1.5' : 'px-3'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            if (isSidebarCollapsed) {
              /* Mini Icon + Small Label Stack */
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                  className={`w-full flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all duration-150 relative ${
                    isActive
                      ? 'liquid-glass-prominent font-bold'
                      : 'text-foreground-muted hover:text-foreground hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-white' : 'text-foreground-muted'}`} />
                  <span className="text-[10px] tracking-tight leading-none truncate max-w-full font-medium">
                    {item.short}
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-white/20 animate-pulse" />
                  )}
                </button>
              );
            }

            /* Full Horizontal Row */
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'liquid-glass-prominent font-semibold'
                    : 'text-foreground-muted hover:text-foreground hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-foreground-muted'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
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

      {/* Docked PiP Video Slot in Sidebar - Only dock when sidebar is expanded, otherwise float at bottom-right */}
      {!isSidebarCollapsed && (
        <div className="py-2 shrink-0 px-3">
          <div
            id="sidebar-pip-anchor"
            className={`w-full transition-all duration-300 rounded-2xl ${
              activeVideo && (isPiP || activeTab !== 'youtube')
                ? 'aspect-video bg-black/60 border border-white/20 shadow-xl'
                : 'h-0 opacity-0 overflow-hidden'
            }`}
          />
        </div>
      )}

      {/* Footer Info */}
      <div className={`border-t border-white/10 text-[11px] text-foreground-subtle transition-all ${isSidebarCollapsed ? 'p-2 flex justify-center' : 'p-4 space-y-2'}`}>
        {isSidebarCollapsed ? (
          <span
            className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"
            title="Core Engine Connected: 127.0.0.1:47892"
          />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-foreground-muted font-medium">Core Engine</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-foreground-muted font-mono">
                {typeof window !== 'undefined' && window.location.hostname ? `${window.location.hostname}:${window.location.port || '47892'}` : '127.0.0.1:47892'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-foreground-muted">
              <Sparkles className="w-3 h-3 text-primary" />
              <span>High-Fidelity Audio & 4K Engine</span>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
