import { create } from 'zustand';
import { usePlayerStore, registerVideoControls } from './usePlayerStore';
import { useNavigationStore } from './useNavigationStore';
import { Track } from '../types';

export interface ActiveVideo {
  id: string;
  title: string;
  artist: string;
  thumbnail?: string;
}

interface VideoState {
  activeVideo: ActiveVideo | null;
  videoQueue: ActiveVideo[];
  videoQueueIndex: number;
  isPiP: boolean;
  isFullscreen: boolean;
  isTheaterMode: boolean;
  reloadKey: number;
  videoQuality: string; // 'hd1080', 'hd720', 'hd1440', 'hd2160', 'large', 'medium', 'auto'
  useDirectVideo: boolean;

  playVideo: (video: ActiveVideo, queue?: ActiveVideo[]) => void;
  nextVideo: () => void;
  previousVideo: () => void;
  closeVideo: () => void;
  togglePiP: () => void;
  setPiP: (pip: boolean) => void;
  setIsFullscreen: (fs: boolean) => void;
  toggleTheaterMode: () => void;
  setVideoQuality: (q: string) => void;
  setUseDirectVideo: (direct: boolean) => void;
  toggleDirectVideo: () => void;
  reloadVideo: () => void;
  restoreCinema: () => void;
}

export const useVideoStore = create<VideoState>((set, get) => ({
  activeVideo: null,
  videoQueue: [],
  videoQueueIndex: 0,
  isPiP: false,
  isFullscreen: false,
  isTheaterMode: localStorage.getItem('ytz_theater_mode') === 'true',
  reloadKey: 0,
  videoQuality: localStorage.getItem('ytz_video_quality') || 'hd1080',
  useDirectVideo: false,

  toggleTheaterMode: () => {
    set((s) => {
      const next = !s.isTheaterMode;
      try {
        localStorage.setItem('ytz_theater_mode', String(next));
      } catch {}
      return { isTheaterMode: next };
    });
  },

  setUseDirectVideo: (direct: boolean) => set({ useDirectVideo: direct }),
  toggleDirectVideo: () => set((state) => ({ useDirectVideo: !state.useDirectVideo })),

  playVideo: (video, queue) => {
    // 1. Strictly stop all audio playback
    usePlayerStore.getState().stopAudio();
    usePlayerStore.getState().setActiveVideoSource('youtube_video');

    if (typeof document !== 'undefined') {
      const audios = document.querySelectorAll('audio');
      audios.forEach((a) => {
        try {
          a.pause();
          a.currentTime = 0;
          a.removeAttribute('src');
          a.load();
        } catch {}
      });
      // Stop and clear any existing HTML5 video element before switching
      const videos = document.querySelectorAll('video');
      videos.forEach((v) => {
        try {
          v.pause();
          v.currentTime = 0;
          v.removeAttribute('src');
          v.load();
        } catch {}
      });
      // Stop any existing iframe video
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        try {
          iframe.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'stopVideo' }),
            '*'
          );
          iframe.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'pauseVideo' }),
            '*'
          );
        } catch {}
      });
    }

    const vQueue = queue && queue.length > 0 ? queue : [video];
    const qIdx = vQueue.findIndex((v) => v.id === video.id);

    // 2. Sync to PlayerStore so MiniPlayer metadata displays the video track
    const trackItem: Track = {
      id: video.id,
      videoId: video.id,
      title: video.title,
      artist: video.artist || 'YouTube',
      thumbnail: video.thumbnail || '',
      duration: '0:00',
      durationSeconds: 0,
    };

    usePlayerStore.setState({
      currentTrack: trackItem,
      isPlaying: false,
      isVideoMode: true,
      activeVideoSource: 'youtube_video',
    });

    set({
      activeVideo: video,
      videoQueue: vQueue,
      videoQueueIndex: qIdx >= 0 ? qIdx : 0,
      isPiP: false,
      reloadKey: Date.now(),
      useDirectVideo: false,
    });
  },

  nextVideo: () => {
    const { videoQueue, videoQueueIndex } = get();
    if (videoQueue.length === 0) return;
    const nextIdx = (videoQueueIndex + 1) % videoQueue.length;
    const nextVid = videoQueue[nextIdx];
    if (nextVid) {
      if (typeof document !== 'undefined') {
        const videos = document.querySelectorAll('video');
        videos.forEach((v) => {
          try { v.pause(); v.currentTime = 0; v.removeAttribute('src'); v.load(); } catch {}
        });
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((iframe) => {
          try { iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'stopVideo' }), '*'); } catch {}
        });
      }
      const trackItem: Track = {
        id: nextVid.id,
        videoId: nextVid.id,
        title: nextVid.title,
        artist: nextVid.artist || 'YouTube',
        thumbnail: nextVid.thumbnail || '',
        duration: '0:00',
        durationSeconds: 0,
      };
      usePlayerStore.setState({
        currentTrack: trackItem,
        isPlaying: false,
        isVideoMode: true,
        activeVideoSource: 'youtube_video',
      });
      set({
        activeVideo: nextVid,
        videoQueueIndex: nextIdx,
        reloadKey: Date.now(),
      });
    }
  },

  previousVideo: () => {
    const { videoQueue, videoQueueIndex } = get();
    if (videoQueue.length === 0) return;
    const prevIdx = (videoQueueIndex - 1 + videoQueue.length) % videoQueue.length;
    const prevVid = videoQueue[prevIdx];
    if (prevVid) {
      if (typeof document !== 'undefined') {
        const videos = document.querySelectorAll('video');
        videos.forEach((v) => {
          try { v.pause(); v.currentTime = 0; v.removeAttribute('src'); v.load(); } catch {}
        });
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((iframe) => {
          try { iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'stopVideo' }), '*'); } catch {}
        });
      }
      const trackItem: Track = {
        id: prevVid.id,
        videoId: prevVid.id,
        title: prevVid.title,
        artist: prevVid.artist || 'YouTube',
        thumbnail: prevVid.thumbnail || '',
        duration: '0:00',
        durationSeconds: 0,
      };
      usePlayerStore.setState({
        currentTrack: trackItem,
        isPlaying: false,
        isVideoMode: true,
        activeVideoSource: 'youtube_video',
      });
      set({
        activeVideo: prevVid,
        videoQueueIndex: prevIdx,
        reloadKey: Date.now(),
      });
    }
  },

  closeVideo: () => {
    if (typeof document !== 'undefined') {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        try {
          iframe.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'stopVideo' }),
            '*'
          );
        } catch {}
      });
      const videos = document.querySelectorAll('video');
      videos.forEach((video) => {
        try {
          video.pause();
          video.currentTime = 0;
          video.src = '';
        } catch {}
      });
    }

    if (usePlayerStore.getState().activeVideoSource === 'youtube_video') {
      usePlayerStore.getState().setActiveVideoSource(null);
    }
    usePlayerStore.setState({ isVideoMode: false, isPlaying: false });

    set({
      activeVideo: null,
      videoQueue: [],
      videoQueueIndex: 0,
      isPiP: false,
      isFullscreen: false,
    });
  },

  setVideoQuality: (q: string) => {
    localStorage.setItem('ytz_video_quality', q);
    set({ videoQuality: q });
    if (typeof document !== 'undefined') {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        try {
          iframe.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'setPlaybackQuality', args: [q] }),
            '*'
          );
          iframe.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'setPlaybackQualityRange', args: [q, q] }),
            '*'
          );
        } catch {}
      });
    }
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

registerVideoControls({
  stop: () => useVideoStore.getState().closeVideo(),
  next: () => useVideoStore.getState().nextVideo(),
  previous: () => useVideoStore.getState().previousVideo(),
});
