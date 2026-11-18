import { create } from 'zustand';
import { TabType } from '../components/Sidebar';

interface NavigationState {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  youtubeSelectedVideo: { id: string; title: string; artist: string } | null;
  navigateToYouTube: (video?: { id: string; title: string; artist: string }) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),
  youtubeSelectedVideo: null,
  navigateToYouTube: (video) =>
    set({
      activeTab: 'youtube',
      youtubeSelectedVideo: video || null,
    }),
}));
