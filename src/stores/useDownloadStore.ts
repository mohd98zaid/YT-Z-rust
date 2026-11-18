import { create } from 'zustand';
import { DownloadItem } from '../types';
import { api } from '../services/api';

interface DownloadState {
  queue: DownloadItem[];
  history: DownloadItem[];
  isLoading: boolean;
  wsConnected: boolean;

  fetchQueue: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  queueDownload: (data: {
    url: string;
    download_type: 'audio' | 'video';
    format: string;
    quality: string;
    title?: string;
    artist?: string;
    thumbnail?: string;
  }) => Promise<string>;
  cancelDownload: (id: string) => Promise<void>;
  retryDownload: (id: string) => Promise<void>;
  deleteDownload: (id: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  initWebSocket: () => () => void;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  queue: [],
  history: [],
  isLoading: false,
  wsConnected: false,

  fetchQueue: async () => {
    try {
      const items = await api.getQueue();
      set({ queue: items });
    } catch (err) {
      console.error('Failed to fetch download queue', err);
    }
  },

  fetchHistory: async () => {
    try {
      const items = await api.getHistory();
      set({ history: items });
    } catch (err) {
      console.error('Failed to fetch download history', err);
    }
  },

  queueDownload: async (data) => {
    const res = await api.queueDownload(data);
    await get().fetchQueue();
    return res.id;
  },

  cancelDownload: async (id: string) => {
    await api.cancelDownload(id);
    await get().fetchQueue();
    await get().fetchHistory();
  },

  retryDownload: async (id: string) => {
    await api.retryDownload(id);
    await get().fetchQueue();
    await get().fetchHistory();
  },

  deleteDownload: async (id: string) => {
    await api.deleteDownload(id);
    set((s) => ({
      history: s.history.filter((item) => item.id !== id),
      queue: s.queue.filter((item) => item.id !== id),
    }));
  },

  clearCompleted: async () => {
    await api.clearCompleted();
    await get().fetchHistory();
  },

  initWebSocket: () => {
    const cleanup = api.createWebSocket((msg) => {
      set({ wsConnected: true });
      const { type, data } = msg;

      if (type === 'download_progress') {
        set((state) => {
          const updatedQueue = state.queue.map((item) => {
            if (item.id === data.id) {
              return { ...item, ...data };
            }
            return item;
          });
          return { queue: updatedQueue };
        });
      } else if (
        type === 'download_completed' ||
        type === 'download_failed' ||
        type === 'download_cancelled'
      ) {
        get().fetchQueue();
        get().fetchHistory();
      } else if (type === 'download_queued') {
        get().fetchQueue();
      }
    });

    return cleanup;
  },
}));
