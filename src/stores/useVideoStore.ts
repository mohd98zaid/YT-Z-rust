import { create } from 'zustand';
import { usePlayerStore } from './usePlayerStore';
import { useNavigationStore } from './useNavigationStore';

export interface ActiveVideo {
  id: string;
  title: string;
  artist: string;
  thumbnail?: string;
}

interface VideoState {
  activeVideo: ActiveVideo | null;
  isPiP: boolean;
  isFullscreen: boolean;
  reloadKey: number;

  playVideo: (video: ActiveVideo) => void;
  closeVideo: () => void;
  togglePiP: () => void;
  setPiP: (pip: boolean) => void;
  setIsFullscreen: (fs: boolean) => void;
  reloadVideo: () => void;
  restoreCinema: () => void;
}

export const useVideoStore = create<VideoState>((set, get) => ({
  activeVideo: null,
  isPiP: false,
  isFullscreen: false,
  reloadKey: 0,

  playVideo: (video) => {
    // 1. Pause global music playback to prevent conflicting audio
    usePlayerStore.getState().pause();
    usePlayerStore.getState().setActiveVideoSource('youtube_video');

    set({
      activeVideo: video,
      isPiP: false,
      reloadKey: Date.now(),
    });
  },

  closeVideo: () => {
    if (usePlayerStore.getState().activeVideoSource === 'youtube_video') {
      usePlayerStore.getState().setActiveVideoSource(null);
    }
    set({
      activeVideo: null,
      isPiP: false,
      isFullscreen: false,
    });
  },

  togglePiP: () => {
    set({ isPiP: !get().isPiP });
  },

  setPiP: (pip) => {
    set({ isPiP: pip });
  },

  setIsFullscreen: (fs) => {
    set({ isFullscreen: fs });
  },

  reloadVideo: () => {
    set({ reloadKey: Date.now() });
  },

  restoreCinema: () => {
    useNavigationStore.getState().setActiveTab('youtube');
    set({ isPiP: false });
    setTimeout(() => {
      const anchor = document.getElementById('youtube-cinema-anchor');
      anchor?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  },
}));
