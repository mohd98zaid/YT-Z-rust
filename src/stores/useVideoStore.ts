import { create } from 'zustand';
import { usePlayerStore } from './usePlayerStore';
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
  reloadKey: number;

  playVideo: (video: ActiveVideo, queue?: ActiveVideo[]) => void;
  nextVideo: () => void;
  previousVideo: () => void;
  closeVideo: () => void;
  togglePiP: () => void;
  setPiP: (pip: boolean) => void;
  setIsFullscreen: (fs: boolean) => void;
  reloadVideo: () => void;
  restoreCinema: () => void;
}

export const useVideoStore = create<VideoState>((set, get) => ({
  activeVideo: null,
  videoQueue: [],
  videoQueueIndex: 0,
  isPiP: false,
  isFullscreen: false,
  reloadKey: 0,

  playVideo: (video, queue) => {
    // 1. Pause global music playback to prevent conflicting audio
    usePlayerStore.getState().pause();
    usePlayerStore.getState().setActiveVideoSource('youtube_video');

    const vQueue = queue && queue.length > 0 ? queue : [video];
    const qIdx = vQueue.findIndex((v) => v.id === video.id);

    // 2. Sync to PlayerStore so MiniPlayer metadata, timeline, and next/prev work seamlessly
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
      isPlaying: true,
      isVideoMode: true,
    });

    set({
      activeVideo: video,
      videoQueue: vQueue,
      videoQueueIndex: qIdx >= 0 ? qIdx : 0,
      isPiP: false,
      reloadKey: Date.now(),
    });
  },

  nextVideo: () => {
    const { videoQueue, videoQueueIndex } = get();
    if (videoQueue.length === 0) return;
    const nextIdx = (videoQueueIndex + 1) % videoQueue.length;
    const nextVid = videoQueue[nextIdx];
    if (nextVid) {
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
        isPlaying: true,
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
        isPlaying: true,
      });
      set({
        activeVideo: prevVid,
        videoQueueIndex: prevIdx,
        reloadKey: Date.now(),
      });
    }
  },

  closeVideo: () => {
    if (usePlayerStore.getState().activeVideoSource === 'youtube_video') {
      usePlayerStore.getState().setActiveVideoSource(null);
    }
    set({
      activeVideo: null,
      videoQueue: [],
      videoQueueIndex: 0,
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
