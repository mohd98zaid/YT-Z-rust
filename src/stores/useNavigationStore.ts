import { create } from 'zustand';
import { TabType } from '../components/Sidebar';

interface NavigationState {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  youtubeSelectedVideo: { id: string; title: string; artist: string } | null;
  navigateToYouTube: (video?: { id: string; title: string; artist: string }) => void;
}

const savedTab = (typeof window !== 'undefined' && localStorage.getItem('ytz_active_tab') as TabType) || 'home';

export const useNavigationStore = create<NavigationState>((set) => ({
  activeTab: savedTab,
  setActiveTab: (tab) => {
    try {
      localStorage.setItem('ytz_active_tab', tab);
    } catch {}
    set({ activeTab: tab });
  },
  youtubeSelectedVideo: null,
  navigateToYouTube: (video) => {
    try {
      localStorage.setItem('ytz_active_tab', 'youtube');
    } catch {}
    set({
      activeTab: 'youtube',
      youtubeSelectedVideo: video || null,
    });
  },
}));
