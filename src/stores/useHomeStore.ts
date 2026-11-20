import { create } from 'zustand';
import { api } from '../services/api';

interface HomeState {
  sections: any[];
  loading: boolean;
  isRefreshing: boolean;
  hasLoaded: boolean;
  quickPicksMood: string;
  loadHome: (forceRefresh?: boolean) => Promise<void>;
  refreshQuickPicks: (mood?: string) => Promise<void>;
  setQuickPicksMood: (mood: string) => void;
}

export const useHomeStore = create<HomeState>((set, get) => ({
  sections: [],
  loading: false,
  isRefreshing: false,
  hasLoaded: false,
  quickPicksMood: 'all',

  loadHome: async (forceRefresh = false) => {
    // If already loaded once and not forcing a refresh, keep exact same feed
    if (get().hasLoaded && !forceRefresh && get().sections.length > 0) {
      return;
    }

    if (forceRefresh) {
      set({ isRefreshing: true });
    } else {
      set({ loading: true });
    }

    try {
      const data = await api.getHome();
      set({
        sections: data || [],
        hasLoaded: true,
        loading: false,
        isRefreshing: false,
      });
    } catch (err) {
      console.error('Failed to load home feed', err);
      set({ loading: false, isRefreshing: false });
    }
  },

  refreshQuickPicks: async (mood?: string) => {
    const targetMood = mood || get().quickPicksMood;
    set({ isRefreshing: true, quickPicksMood: targetMood });
    try {
      const freshPicks = await api.getQuickPicks(true, targetMood, 10);
      if (freshPicks && freshPicks.length > 0) {
        set((state) => ({
          sections: state.sections.map((sec) =>
            sec.title.toLowerCase().includes('quick')
              ? { ...sec, items: freshPicks }
              : sec
          ),
          isRefreshing: false,
        }));
      } else {
        set({ isRefreshing: false });
      }
    } catch (err) {
      console.error('Failed to refresh quick picks', err);
      set({ isRefreshing: false });
    }
  },

  setQuickPicksMood: (mood: string) => set({ quickPicksMood: mood }),
}));
