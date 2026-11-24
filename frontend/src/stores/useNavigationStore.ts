import { create } from 'zustand';
import { TabType } from '../components/Sidebar';
import { api } from '../services/api';

interface NavigationState {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  initNavigation: () => Promise<void>;
  youtubeSelectedVideo: { id: string; title: string; artist: string } | null;
  youtubeSearchQuery: string;
  setYouTubeSearchQuery: (q: string) => void;
  navigateToYouTube: (video?: { id: string; title: string; artist: string }) => void;
  isSidebarCollapsed: boolean;
  toggleSidebarCollapse: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const savedTab: TabType = 'home';
const savedCollapsed = typeof window !== 'undefined' && localStorage.getItem('ytz_sidebar_collapsed') === 'true';

export const useNavigationStore = create<NavigationState>((set) => ({
  activeTab: 'home',
  isSidebarCollapsed: savedCollapsed,
  toggleSidebarCollapse: () => {
    set((state) => {
      const next = !state.isSidebarCollapsed;
      try {
        localStorage.setItem('ytz_sidebar_collapsed', String(next));
      } catch {}
      return { isSidebarCollapsed: next };
    });
  },
  setSidebarCollapsed: (collapsed: boolean) => {
    try {
      localStorage.setItem('ytz_sidebar_collapsed', String(collapsed));
    } catch {}
    set({ isSidebarCollapsed: collapsed });
  },
  setActiveTab: (tab) => {
    try {
      localStorage.setItem('ytz_active_tab', tab);
    } catch {}
    set({ activeTab: tab });
    api.updateConfig({ active_tab: tab }).catch(() => {});
  },
  initNavigation: async () => {
    // Default screen is strictly Home screen on launch
    set({ activeTab: 'home' });
    try {
      localStorage.setItem('ytz_active_tab', 'home');
    } catch {}
  },
  youtubeSelectedVideo: null,
  youtubeSearchQuery: '',
  setYouTubeSearchQuery: (q: string) => set({ youtubeSearchQuery: q }),
  navigateToYouTube: (video) => {
    try {
      localStorage.setItem('ytz_active_tab', 'youtube');
    } catch {}
    api.updateConfig({ active_tab: 'youtube' }).catch(() => {});
    set({
      activeTab: 'youtube',
      youtubeSelectedVideo: video || null,
    });
  },
}));
