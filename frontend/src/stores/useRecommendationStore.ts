import { create } from 'zustand';

interface BlockedItem {
  type: 'video' | 'artist';
  id?: string;
  name?: string;
  title?: string;
}

interface RecommendationState {
  blockedVideoIds: Set<string>;
  blockedArtists: Set<string>;
  lastBlockedItem: BlockedItem | null;

  blockVideo: (videoId: string, title?: string) => void;
  blockArtist: (artistName: string) => void;
  unblockVideo: (videoId: string) => void;
  unblockArtist: (artistName: string) => void;
  undoLastBlock: () => void;
  isBlocked: (videoId?: string, artistName?: string) => boolean;
  clearAllBlocked: () => void;
}

const loadBlockedVideos = (): Set<string> => {
  try {
    const raw = localStorage.getItem('ytz_blocked_videos');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
};

const loadBlockedArtists = (): Set<string> => {
  try {
    const raw = localStorage.getItem('ytz_blocked_artists');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr.map((a: string) => a.trim().toLowerCase()));
    }
  } catch {}
  return new Set();
};

const saveBlockedVideos = (videos: Set<string>) => {
  try {
    localStorage.setItem('ytz_blocked_videos', JSON.stringify(Array.from(videos)));
  } catch {}
};

const saveBlockedArtists = (artists: Set<string>) => {
  try {
    localStorage.setItem('ytz_blocked_artists', JSON.stringify(Array.from(artists)));
  } catch {}
};

export const useRecommendationStore = create<RecommendationState>((set, get) => ({
  blockedVideoIds: loadBlockedVideos(),
  blockedArtists: loadBlockedArtists(),
  lastBlockedItem: null,

  blockVideo: (videoId: string, title?: string) => {
    if (!videoId) return;
    const cleanId = videoId.trim();
    const newBlocked = new Set(get().blockedVideoIds);
    newBlocked.add(cleanId);
    saveBlockedVideos(newBlocked);
    set({
      blockedVideoIds: newBlocked,
      lastBlockedItem: { type: 'video', id: cleanId, title: title || cleanId },
    });
  },

  blockArtist: (artistName: string) => {
    if (!artistName) return;
    const cleanArtist = artistName.trim().toLowerCase();
    if (!cleanArtist) return;
    const newBlocked = new Set(get().blockedArtists);
    newBlocked.add(cleanArtist);
    saveBlockedArtists(newBlocked);
    set({
      blockedArtists: newBlocked,
      lastBlockedItem: { type: 'artist', name: cleanArtist, title: artistName },
    });
  },

  unblockVideo: (videoId: string) => {
    if (!videoId) return;
    const newBlocked = new Set(get().blockedVideoIds);
    newBlocked.delete(videoId.trim());
    saveBlockedVideos(newBlocked);
    set({ blockedVideoIds: newBlocked });
  },

  unblockArtist: (artistName: string) => {
    if (!artistName) return;
    const cleanArtist = artistName.trim().toLowerCase();
    const newBlocked = new Set(get().blockedArtists);
    newBlocked.delete(cleanArtist);
    saveBlockedArtists(newBlocked);
    set({ blockedArtists: newBlocked });
  },

  undoLastBlock: () => {
    const last = get().lastBlockedItem;
    if (!last) return;
    if (last.type === 'video' && last.id) {
      get().unblockVideo(last.id);
    } else if (last.type === 'artist' && last.name) {
      get().unblockArtist(last.name);
    }
    set({ lastBlockedItem: null });
  },

  isBlocked: (videoId?: string, artistName?: string): boolean => {
    const { blockedVideoIds, blockedArtists } = get();
    if (videoId && blockedVideoIds.has(videoId.trim())) {
      return true;
    }
    if (artistName) {
      const lower = artistName.trim().toLowerCase();
      if (blockedArtists.has(lower)) return true;
      // Also check if any blocked artist is contained in composite artist string e.g. "Pritam, KK"
      for (const blocked of blockedArtists) {
        if (lower === blocked || lower.includes(blocked)) {
          return true;
        }
      }
    }
    return false;
  },

  clearAllBlocked: () => {
    localStorage.removeItem('ytz_blocked_videos');
    localStorage.removeItem('ytz_blocked_artists');
    set({
      blockedVideoIds: new Set(),
      blockedArtists: new Set(),
      lastBlockedItem: null,
    });
  },
}));
