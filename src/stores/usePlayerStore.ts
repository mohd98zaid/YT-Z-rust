import { create } from 'zustand';
import { Track, SponsorBlockSegment, LyricsResponse } from '../types';
import { api, API_BASE } from '../services/api';

export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [6, 5, 4, 2, 0, 0, 0, 1, 2, 3],
  'Vocal Booster': [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1],
  Rock: [4, 3, 2, 0, -1, 0, 2, 3, 4, 4],
  Electronic: [5, 4, 2, 0, -2, 2, 1, 2, 4, 4],
  'Hip Hop': [6, 5, 2, 1, -1, -1, 1, 0, 2, 3],
  Acoustic: [3, 2, 1, 1, 2, 2, 3, 3, 3, 2],
  Classical: [4, 3, 2, 2, -1, -1, 0, 2, 3, 3],
  Pop: [-1, 1, 3, 4, 4, 2, -1, -1, 2, 3],
};

interface AudioStats {
  codec: string;
  format?: string;
  bitrate: number;
  duration: number;
  provider: string;
  isLossless?: boolean;
  sampleRate?: number;
  bitDepth?: number;
  qualityTier?: string;
  addonName?: string;
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackSpeed: number;
  shuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  crossfadeSeconds: number;
  sponsorBlockEnabled: boolean;
  skipSegments: SponsorBlockSegment[];
  lastSkippedNotice: string | null;
  lyrics: LyricsResponse | null;
  isLyricsLoading: boolean;

  // Hi-Res Lossless & Data Saver Audio
  audioQuality: 'lossless' | 'high' | 'standard' | 'data_saver' | 'auto';
  setAudioQuality: (quality: 'lossless' | 'high' | 'standard' | 'data_saver' | 'auto') => void;

  // Equalizer
  eqEnabled: boolean;
  eqPreset: string;
  eqBands: number[]; // 10 gain values (-12 to +12 dB)

  // Modals & Panels
  isExpanded: boolean;
  isVideoMode: boolean;
  isLyricsOpen: boolean;
  isEqualizerOpen: boolean;
  isQueueOpen: boolean;
  showStatsForNerds: boolean;
  audioStats: AudioStats | null;

  // Sleep Timer & Audio Tweaks
  sleepTimerMinutes: number | null;
  sleepTimerRemaining: number | null;
  sleepTimerStopAfterTrack: boolean;
  isSleepTimerOpen: boolean;
  skipSilence: boolean;
  volumeNormalization: boolean;

  // Video vs Audio Mutually Exclusive Playback Control
  activeVideoSource: string | null;
  setActiveVideoSource: (source: string | null) => void;
  pause: () => void;
  pauseAudio: () => void;
  stopAudio: () => void;
  play: () => void;

  // Lyrics Preferences
  lyricsEnabled: boolean;
  setLyricsEnabled: (enabled: boolean) => void;
  lyricsLayoutMode: 'split' | 'fullscreen' | 'off';
  setLyricsLayoutMode: (mode: 'split' | 'fullscreen' | 'off') => void;

  // Stats for Nerds & Audiophile Display Preferences
  enableStatsForNerds: boolean;
  setEnableStatsForNerds: (enabled: boolean) => void;
  showAudiophileSpecs: boolean;
  setShowAudiophileSpecs: (enabled: boolean) => void;
  showAudioQualityBadge: boolean;
  setShowAudioQualityBadge: (enabled: boolean) => void;
  showAudioPipelineCard: boolean;
  setShowAudioPipelineCard: (enabled: boolean) => void;
  showMiniPlayerCodecBadge: boolean;
  setShowMiniPlayerCodecBadge: (enabled: boolean) => void;

  // Actions
  playTrack: (track: Track, newQueue?: Track[], seekTime?: number) => Promise<void>;
  togglePlay: () => void;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setCrossfade: (seconds: number) => void;
  setEqBand: (index: number, gain: number) => void;
  setEqPreset: (presetName: string) => void;
  toggleEq: () => void;
  setExpanded: (expanded: boolean) => void;
  setVideoMode: (video: boolean) => void;
  toggleLyrics: () => void;
  toggleEqualizer: () => void;
  toggleQueue: () => void;
  toggleStatsForNerds: () => void;
  toggleSleepTimer: () => void;
  setSleepTimer: (minutes: number | null, stopAfterTrack?: boolean) => void;
  toggleSkipSilence: () => void;
  toggleVolumeNormalization: () => void;
  startRadio: (track?: Track) => Promise<void>;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  loadLyrics: (track: Track) => Promise<void>;
  restoreSessionFromConfig: (cfg: any, autoPlay?: boolean) => void;
  autoPlayLastTrack: (track?: Track, queue?: Track[], seekTime?: number) => Promise<void>;
}

// Global Audio Element and Web Audio Context
let audioElement: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
export const getAudioContext = (): AudioContext | null => audioContext;
export const getAudioElement = (): HTMLAudioElement | null => audioElement;
let sourceNode: MediaElementAudioSourceNode | null = null;
let eqFilterNodes: BiquadFilterNode[] = [];
let gainNode: GainNode | null = null;
let currentTrackResolutionId = 0;
let registeredVideoStopper: (() => void) | null = null;
let registeredVideoNext: (() => void) | null = null;
let registeredVideoPrevious: (() => void) | null = null;

export const registerVideoControls = (handlers: { stop: () => void; next: () => void; previous: () => void }) => {
  registeredVideoStopper = handlers.stop;
  registeredVideoNext = handlers.next;
  registeredVideoPrevious = handlers.previous;
};

function initAudioEngine(state: PlayerState) {
  if (audioElement) return;

  audioElement = new Audio();
  audioElement.crossOrigin = 'anonymous';
  audioElement.preload = 'auto';
  audioElement.volume = state.isMuted ? 0 : state.volume;
  audioElement.playbackRate = state.playbackSpeed || 1.0;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      audioContext = new AudioCtx();
      sourceNode = audioContext.createMediaElementSource(audioElement);
      gainNode = audioContext.createGain();

      // Build 10-band graphic equalizer
      eqFilterNodes = EQ_FREQUENCIES.map((freq, i) => {
        const filter = audioContext!.createBiquadFilter();
        if (i === 0) {
          filter.type = 'lowshelf';
        } else if (i === EQ_FREQUENCIES.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1.4;
        }
        filter.frequency.value = freq;
        filter.gain.value = state.eqEnabled ? (state.eqBands[i] || 0) : 0;
        return filter;
      });

      // Chain: source -> eq[0] -> eq[1] ... -> gain -> destination
      let lastNode: AudioNode = sourceNode;
      for (const filter of eqFilterNodes) {
        lastNode.connect(filter);
        lastNode = filter;
      }
      lastNode.connect(gainNode);
      gainNode.connect(audioContext.destination);
    }
  } catch (err) {
    console.warn('Web Audio API EQ not available, falling back to direct playback', err);
  }

  // Audio Event Listeners
  let lastTimeSave = 0;
  audioElement.addEventListener('timeupdate', () => {
    if (!audioElement) return;
    const { isVideoMode, activeVideoSource } = usePlayerStore.getState();
    if (isVideoMode || activeVideoSource === 'youtube_video') return;
    const time = audioElement.currentTime;
    usePlayerStore.setState({ currentTime: time });

    const now = Date.now();
    if (now - lastTimeSave > 1500) {
      lastTimeSave = now;
      try {
        localStorage.setItem('ytz_persisted_current_time', String(Math.floor(time)));
      } catch {}
    }

    // Update Windows / OS MediaSession playback position
    if (
      typeof window !== 'undefined' &&
      'mediaSession' in navigator &&
      'setPositionState' in navigator.mediaSession &&
      audioElement.duration
    ) {
      try {
        navigator.mediaSession.setPositionState({
          duration: audioElement.duration,
          playbackRate: audioElement.playbackRate || 1.0,
          position: time,
        });
      } catch {}
    }

    // Gapless Smart Pre-buffering: ensure next track is pre-cached in RAM as early as possible
    const { queue, queueIndex } = usePlayerStore.getState();
    const nextIdx = queueIndex + 1 < queue.length ? queueIndex + 1 : -1;
    if (nextIdx !== -1 && queue[nextIdx] && !preloadedAudioBlobs.has(queue[nextIdx].id) && !currentPreloadingTrackId) {
      preloadNextTrack();
    }

    // Check SponsorBlock skip segments
    const { sponsorBlockEnabled, skipSegments } = usePlayerStore.getState();
    if (sponsorBlockEnabled && skipSegments.length > 0) {
      for (const seg of skipSegments) {
        if (time >= seg.start && time < seg.end - 0.5) {
          audioElement.currentTime = seg.end;
          usePlayerStore.setState({
            lastSkippedNotice: `Auto-skipped ${seg.category.replace('_', ' ')}`,
          });
          setTimeout(() => {
            usePlayerStore.setState({ lastSkippedNotice: null });
          }, 3000);
          break;
        }
      }
    }
  });

  audioElement.addEventListener('loadedmetadata', () => {
    if (audioElement) {
      usePlayerStore.setState({ duration: audioElement.duration || 0, isLoading: false });
    }
  });

  audioElement.addEventListener('ended', () => {
    const { repeatMode, next, sleepTimerStopAfterTrack } = usePlayerStore.getState();
    if (sleepTimerStopAfterTrack) {
      usePlayerStore.setState({ isPlaying: false, sleepTimerStopAfterTrack: false });
      return;
    }
    if (repeatMode === 'one' && audioElement) {
      audioElement.currentTime = 0;
      audioElement.play();
    } else {
      next();
    }
  });

  audioElement.addEventListener('waiting', () => {
    usePlayerStore.setState({ isLoading: true });
  });

  audioElement.addEventListener('playing', () => {
    const { isVideoMode, activeVideoSource } = usePlayerStore.getState();
    if (isVideoMode || activeVideoSource === 'youtube_video') {
      if (audioElement) {
        try {
          audioElement.pause();
          audioElement.currentTime = 0;
        } catch {}
      }
      return;
    }
    usePlayerStore.setState({ isPlaying: true, isLoading: false });
  });

  audioElement.addEventListener('pause', () => {
    const { isVideoMode, activeVideoSource } = usePlayerStore.getState();
    if (isVideoMode || activeVideoSource === 'youtube_video') return;
    if (audioElement && !isNaN(audioElement.currentTime)) {
      try {
        localStorage.setItem('ytz_persisted_current_time', String(Math.floor(audioElement.currentTime)));
      } catch {}
    }
    usePlayerStore.setState({ isPlaying: false });
  });
}

// In-Memory Preload & Gapless Cache Manager
const preloadedAudioBlobs = new Map<string, string>(); // trackId -> blobUrl
const preloadedStatsMap = new Map<string, AudioStats>();
const preloadedLyricsMap = new Map<string, any>();
const preloadedSegmentsMap = new Map<string, any[]>();
let currentPreloadAbortController: AbortController | null = null;
let currentPreloadingTrackId: string | null = null;

export const preloadNextTrack = async () => {
  const { queue, queueIndex, repeatMode, shuffle, audioQuality } = usePlayerStore.getState();
  if (queue.length === 0 || queueIndex < 0) return;

  let nextIndex = queueIndex + 1;
  if (shuffle) {
    nextIndex = (queueIndex + 1) % queue.length;
  } else if (nextIndex >= queue.length) {
    nextIndex = repeatMode === 'all' ? 0 : -1;
  }

  if (nextIndex === -1 || !queue[nextIndex]) return;
  const nextTrack = queue[nextIndex];
  const nextId = nextTrack.id;

  // Already cached in memory
  if (preloadedAudioBlobs.has(nextId)) {
    return;
  }

  // Already in-flight
  if (currentPreloadingTrackId === nextId) {
    return;
  }

  // Abort previous in-flight preload if queue changed
  if (currentPreloadAbortController) {
    currentPreloadAbortController.abort();
    currentPreloadAbortController = null;
  }

  currentPreloadingTrackId = nextId;
  const controller = new AbortController();
  currentPreloadAbortController = controller;

  const videoId = nextTrack.videoId || nextTrack.id;
  const quality = audioQuality || 'lossless';
  const durParam = nextTrack.durationSeconds || 0;

  // 1. Pre-warm stream metadata & backend resolution in background
  if (!nextTrack.isLocal) {
    api.getAudioStream(videoId, nextTrack.title, nextTrack.artist, durParam, quality)
      .then((streamInfo) => {
        if (streamInfo) {
          preloadedStatsMap.set(nextId, {
            codec: streamInfo.codec,
            bitrate: streamInfo.bitrate,
            duration: nextTrack.durationSeconds || 0,
            provider: streamInfo.addonName || (streamInfo.isLossless ? 'Hi-Res Lossless Module' : 'YouTube Music 256k'),
            isLossless: streamInfo.isLossless,
            sampleRate: streamInfo.sampleRate,
            bitDepth: streamInfo.bitDepth,
            qualityTier: streamInfo.qualityTier,
            addonName: streamInfo.addonName,
          });
        }
      })
      .catch(() => {});

    api.getSkipSegments(videoId)
      .then((segs) => {
        if (segs) preloadedSegmentsMap.set(nextId, segs);
      })
      .catch(() => {});
  }

  // 2. Pre-cache lyrics for instant display
  api.getLyrics(nextTrack.title, nextTrack.artist, durParam)
    .then((lyrics) => {
      if (lyrics) preloadedLyricsMap.set(nextId, lyrics);
    })
    .catch(() => {});

  // 3. Preload full audio stream into client-side RAM Blob
  const nextUrl =
    nextTrack.isLocal && nextTrack.filePath
      ? `${API_BASE}/api/library/stream?path=${encodeURIComponent(nextTrack.filePath)}`
      : `${API_BASE}/api/stream/${encodeURIComponent(videoId)}/audio?title=${encodeURIComponent(nextTrack.title || '')}&artist=${encodeURIComponent(nextTrack.artist || '')}&duration=${durParam}&quality=${quality}`;

  try {
    const response = await fetch(nextUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Preload HTTP error ${response.status}`);
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    // Keep cache size bounded to prevent unbounded memory growth
    if (preloadedAudioBlobs.size >= 3) {
      for (const [oldId, oldUrl] of preloadedAudioBlobs.entries()) {
        URL.revokeObjectURL(oldUrl);
        preloadedAudioBlobs.delete(oldId);
        preloadedStatsMap.delete(oldId);
        preloadedLyricsMap.delete(oldId);
        preloadedSegmentsMap.delete(oldId);
        break;
      }
    }

    preloadedAudioBlobs.set(nextId, blobUrl);
    console.log(`[Cache] Next track preloaded in RAM: "${nextTrack.title}" (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.log(`[Cache] Preload aborted for track change: ${nextTrack.title}`);
    } else {
      console.warn(`[Cache] Preload failed for ${nextTrack.title}:`, err);
    }
  } finally {
    if (currentPreloadingTrackId === nextId) {
      currentPreloadingTrackId = null;
    }
  }
};

// Helper to load persisted player session from previous runs
const loadPersistedSession = () => {
  try {
    const rawTrack = localStorage.getItem('ytz_persisted_current_track');
    const rawQueue = localStorage.getItem('ytz_persisted_queue');
    const rawQueueIndex = localStorage.getItem('ytz_persisted_queue_index');
    const rawCurrentTime = localStorage.getItem('ytz_persisted_current_time');
    const rawVolume = localStorage.getItem('ytz_persisted_volume');
    const rawIsMuted = localStorage.getItem('ytz_is_muted');
    const rawRepeat = localStorage.getItem('ytz_persisted_repeat_mode');
    const rawShuffle = localStorage.getItem('ytz_persisted_shuffle');
    const rawSpeed = localStorage.getItem('ytz_playback_speed');
    const rawEqEnabled = localStorage.getItem('ytz_eq_enabled');
    const rawEqPreset = localStorage.getItem('ytz_eq_preset');
    const rawEqBands = localStorage.getItem('ytz_eq_bands');
    const rawSkipSilence = localStorage.getItem('ytz_skip_silence');
    const rawVolNorm = localStorage.getItem('ytz_volume_normalization');
    const rawAudioStats = localStorage.getItem('ytz_persisted_audio_stats');

    return {
      currentTrack: rawTrack ? (JSON.parse(rawTrack) as Track) : null,
      queue: rawQueue ? (JSON.parse(rawQueue) as Track[]) : [],
      queueIndex: rawQueueIndex !== null ? parseInt(rawQueueIndex, 10) : -1,
      currentTime: rawCurrentTime !== null ? parseFloat(rawCurrentTime) : 0,
      volume: rawVolume !== null ? parseFloat(rawVolume) : 0.85,
      isMuted: rawIsMuted === 'true',
      repeatMode: (rawRepeat as 'off' | 'all' | 'one') || 'off',
      shuffle: rawShuffle === 'true',
      playbackSpeed: rawSpeed !== null ? parseFloat(rawSpeed) : 1.0,
      eqEnabled: rawEqEnabled !== 'false',
      eqPreset: rawEqPreset || 'Flat',
      eqBands: rawEqBands ? (JSON.parse(rawEqBands) as number[]) : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      skipSilence: rawSkipSilence === 'true',
      volumeNormalization: rawVolNorm === 'true',
      audioStats: rawAudioStats ? (JSON.parse(rawAudioStats) as AudioStats) : null,
    };
  } catch {
    return {
      currentTrack: null,
      queue: [],
      queueIndex: -1,
      currentTime: 0,
      volume: 0.85,
      isMuted: false,
      repeatMode: 'off' as const,
      shuffle: false,
      playbackSpeed: 1.0,
      eqEnabled: true,
      eqPreset: 'Flat',
      eqBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      skipSilence: false,
      volumeNormalization: false,
      audioStats: null,
    };
  }
};

let sessionSyncTimer: any = null;
export const syncSessionToBackend = (partial?: Record<string, any>) => {
  if (sessionSyncTimer) clearTimeout(sessionSyncTimer);
  sessionSyncTimer = setTimeout(() => {
    try {
      const state = usePlayerStore.getState();
      const curTime = audioElement && !isNaN(audioElement.currentTime) && audioElement.currentTime > 0
        ? Math.floor(audioElement.currentTime)
        : state.currentTime;

      const payload = {
        current_track: state.currentTrack,
        queue: state.queue,
        queue_index: state.queueIndex,
        current_time: curTime,
        volume: state.volume,
        is_muted: state.isMuted,
        repeat_mode: state.repeatMode,
        shuffle: state.shuffle,
        playback_speed: state.playbackSpeed,
        audio_quality: state.audioQuality,
        eq_enabled: state.eqEnabled,
        eq_preset: state.eqPreset,
        eq_bands: state.eqBands,
        skip_silence: state.skipSilence,
        volume_normalization: state.volumeNormalization,
        audio_stats: state.audioStats,
        ...partial,
      };
      api.updateConfig(payload).catch(() => {});
    } catch {}
  }, 1000);
};

const initialSession = loadPersistedSession();

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: initialSession.currentTrack,
  queue: initialSession.queue,
  queueIndex: initialSession.queueIndex,
  isPlaying: false,
  isLoading: false,
  currentTime: initialSession.currentTime,
  duration: initialSession.currentTrack ? (initialSession.currentTrack.durationSeconds || 0) : 0,
  volume: initialSession.volume,
  isMuted: initialSession.isMuted,
  playbackSpeed: initialSession.playbackSpeed,
  shuffle: initialSession.shuffle,
  repeatMode: initialSession.repeatMode,
  crossfadeSeconds: 3,
  sponsorBlockEnabled: true,
  skipSegments: [],
  lastSkippedNotice: null,
  lyrics: null,
  isLyricsLoading: false,

  // Hi-Res Lossless & Data Saver Audio
  audioQuality: ((localStorage.getItem('ytz_audio_quality') as any) || 'lossless') as 'lossless' | 'high' | 'standard' | 'data_saver' | 'auto',
  setAudioQuality: (quality: 'lossless' | 'high' | 'standard' | 'data_saver' | 'auto') => {
    localStorage.setItem('ytz_audio_quality', quality);
    set({ audioQuality: quality });
    syncSessionToBackend({ audio_quality: quality });
    const { currentTrack, playTrack, currentTime } = get();
    if (currentTrack) {
      const currentPos = audioElement && !isNaN(audioElement.currentTime) ? audioElement.currentTime : currentTime;
      playTrack(currentTrack, undefined, currentPos);
    }
  },

  eqEnabled: initialSession.eqEnabled,
  eqPreset: initialSession.eqPreset,
  eqBands: initialSession.eqBands,

  isExpanded: false,
  isVideoMode: false,
  isLyricsOpen: false,
  isEqualizerOpen: false,
  isQueueOpen: false,
  showStatsForNerds: false,
  audioStats: initialSession.audioStats,

  sleepTimerMinutes: null,
  sleepTimerRemaining: null,
  sleepTimerStopAfterTrack: false,
  isSleepTimerOpen: false,
  skipSilence: initialSession.skipSilence,
  volumeNormalization: initialSession.volumeNormalization,

  // Lyrics Preferences
  lyricsEnabled: localStorage.getItem('ytz_lyrics_enabled') !== 'false',
  setLyricsEnabled: (enabled: boolean) => {
    localStorage.setItem('ytz_lyrics_enabled', String(enabled));
    set({ lyricsEnabled: enabled });
  },
  lyricsLayoutMode: ((localStorage.getItem('ytz_lyrics_layout_mode') as any) || 'split') as 'split' | 'fullscreen' | 'off',
  setLyricsLayoutMode: (mode: 'split' | 'fullscreen' | 'off') => {
    localStorage.setItem('ytz_lyrics_layout_mode', mode);
    set({ lyricsLayoutMode: mode });
  },

  // Stats for Nerds & Audiophile Display Preferences
  enableStatsForNerds: localStorage.getItem('ytz_enable_stats_for_nerds') !== 'false',
  showAudiophileSpecs: localStorage.getItem('ytz_show_audiophile_specs') !== 'false',
  showAudioQualityBadge: localStorage.getItem('ytz_show_audio_quality_badge') !== 'false',
  showAudioPipelineCard: localStorage.getItem('ytz_show_audio_pipeline_card') !== 'false',
  showMiniPlayerCodecBadge: localStorage.getItem('ytz_show_miniplayer_codec_badge') !== 'false',

  setEnableStatsForNerds: (enabled: boolean) => {
    localStorage.setItem('ytz_enable_stats_for_nerds', String(enabled));
    set({
      enableStatsForNerds: enabled,
      showStatsForNerds: enabled ? get().showStatsForNerds : false,
    });
  },
  setShowAudiophileSpecs: (enabled: boolean) => {
    localStorage.setItem('ytz_show_audiophile_specs', String(enabled));
    set({ showAudiophileSpecs: enabled });
  },
  setShowAudioQualityBadge: (enabled: boolean) => {
    localStorage.setItem('ytz_show_audio_quality_badge', String(enabled));
    set({ showAudioQualityBadge: enabled });
  },
  setShowAudioPipelineCard: (enabled: boolean) => {
    localStorage.setItem('ytz_show_audio_pipeline_card', String(enabled));
    set({ showAudioPipelineCard: enabled });
  },
  setShowMiniPlayerCodecBadge: (enabled: boolean) => {
    localStorage.setItem('ytz_show_miniplayer_codec_badge', String(enabled));
    set({ showMiniPlayerCodecBadge: enabled });
  },

  // Video vs Audio Mutually Exclusive Playback Control
  activeVideoSource: null,
  setActiveVideoSource: (source: string | null) => {
    if (source) {
      if (audioElement && !audioElement.paused) {
        audioElement.pause();
      }
      set({ activeVideoSource: source, isPlaying: false });
    } else {
      set({ activeVideoSource: null });
    }
  },

  pause: () => {
    if (get().isVideoMode) {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo' }), '*');
        }
      });
      const videos = document.querySelectorAll('video');
      videos.forEach((video) => {
        try { video.pause(); } catch {}
      });
    }
    if (audioElement && !audioElement.paused) {
      audioElement.pause();
    }
    set({ isPlaying: false });
  },

  pauseAudio: () => {
    if (audioElement && !audioElement.paused) {
      audioElement.pause();
    }
  },

  stopAudio: () => {
    currentTrackResolutionId++;
    if (audioElement) {
      try {
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.removeAttribute('src');
        audioElement.load();
      } catch {}
    }
    set({ isPlaying: false });
  },

  play: () => {
    initAudioEngine(get());
    if (get().isVideoMode) {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo' }), '*');
        }
      });
      const videos = document.querySelectorAll('video');
      videos.forEach((video) => {
        try { video.play().catch(() => {}); } catch {}
      });
      set({ isPlaying: true });
      return;
    }
    if (!audioElement || !get().currentTrack) return;
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    set({ activeVideoSource: null });
    if (!audioElement.src || audioElement.src === '' || audioElement.src === window.location.href) {
      const { currentTrack, queue, currentTime } = get();
      if (currentTrack) {
        get().playTrack(currentTrack, queue.length > 0 ? queue : [currentTrack], currentTime);
        return;
      }
    }
    audioElement.play().catch(() => {});
    set({ isPlaying: true });
  },

  playTrack: async (track: Track, newQueue?: Track[], seekTime?: number) => {
    initAudioEngine(get());
    const resolutionId = ++currentTrackResolutionId;

    // Immediately stop and close any active video so audio and video never overlap
    if (registeredVideoStopper) {
      try { registeredVideoStopper(); } catch {}
    }
    if (typeof document !== 'undefined') {
      document.querySelectorAll('video').forEach((v) => {
        try {
          v.pause();
          v.currentTime = 0;
          v.removeAttribute('src');
          v.load();
        } catch {}
      });
      document.querySelectorAll('iframe').forEach((iframe) => {
        try {
          iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'stopVideo' }), '*');
          iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo' }), '*');
        } catch {}
      });
    }

    set({ isVideoMode: false, activeVideoSource: null });

    let queue = get().queue;
    let queueIndex = get().queueIndex;

    if (newQueue) {
      queue = newQueue;
      queueIndex = newQueue.findIndex((t) => t.id === track.id);
      if (queueIndex === -1) {
        queue = [track, ...newQueue];
        queueIndex = 0;
      }
    } else {
      const idx = queue.findIndex((t) => t.id === track.id);
      if (idx !== -1) {
        queueIndex = idx;
      } else {
        queue = [...queue, track];
        queueIndex = queue.length - 1;
      }
    }

    set({
      currentTrack: track,
      queue,
      queueIndex,
      isLoading: true,
      currentTime: seekTime !== undefined ? seekTime : 0,
      skipSegments: [],
      lyrics: null,
    });

    // Persist session to localStorage
    try {
      localStorage.setItem('ytz_persisted_current_track', JSON.stringify(track));
      localStorage.setItem('ytz_persisted_queue', JSON.stringify(queue));
      localStorage.setItem('ytz_persisted_queue_index', String(queueIndex));
    } catch {}

    // Record playback in SQLite history
    api.recordPlayback(track).catch(() => {});

    // Resume AudioContext if suspended
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }

    try {
      let streamUrl = '';
      let codec = 'opus';
      let bitrate = 160;

      // 1. Instant RAM Cache Hit Check
      const cachedBlobUrl = preloadedAudioBlobs.get(track.id);
      const cachedStats = preloadedStatsMap.get(track.id);
      const cachedSegments = preloadedSegmentsMap.get(track.id);

      if (cachedStats) {
        set({ audioStats: cachedStats });
      }
      if (cachedSegments) {
        set({ skipSegments: cachedSegments });
      }

      if (cachedBlobUrl) {
        streamUrl = cachedBlobUrl;
        console.log(`[Playback] Instant 0ms playback from pre-cached RAM blob: "${track.title}"`);
      } else if (track.isLocal && track.filePath) {
        streamUrl = `${API_BASE}/api/library/stream?path=${encodeURIComponent(track.filePath)}`;
        codec = track.filePath.split('.').pop() || 'mp3';
        set({
          audioStats: {
            codec,
            bitrate,
            duration: track.durationSeconds || 0,
            provider: 'Local Storage',
          },
        });
      } else {
        const videoId = track.videoId || track.id;
        const quality = get().audioQuality || 'lossless';
        const titleParam = encodeURIComponent(track.title || '');
        const artistParam = encodeURIComponent(track.artist || '');
        const durParam = track.durationSeconds || 0;

        // Use range-aware audio streaming proxy with lossless resolution
        streamUrl = `${API_BASE}/api/stream/${encodeURIComponent(videoId)}/audio?title=${titleParam}&artist=${artistParam}&duration=${durParam}&quality=${quality}`;

        // Fetch stream metadata with Lossless Addon details in background
        if (!cachedStats) {
          api.getAudioStream(videoId, track.title, track.artist, durParam, quality).then((streamInfo) => {
            set({
              audioStats: {
                codec: streamInfo.codec,
                bitrate: streamInfo.bitrate,
                duration: track.durationSeconds || 0,
                provider: streamInfo.addonName || (streamInfo.isLossless ? 'Hi-Res Lossless Module' : 'YouTube Music 256k'),
                isLossless: streamInfo.isLossless,
                sampleRate: streamInfo.sampleRate,
                bitDepth: streamInfo.bitDepth,
                qualityTier: streamInfo.qualityTier,
                addonName: streamInfo.addonName,
              },
            });
          }).catch(() => {
            set({
              audioStats: {
                codec: 'opus',
                bitrate: 160,
                duration: track.durationSeconds || 0,
                provider: 'YouTube Music Engine',
                isLossless: false,
                sampleRate: 48000,
                bitDepth: 16,
                qualityTier: 'standard',
              },
            });
          });
        }

        // Fetch SponsorBlock skip segments in background
        if (!cachedSegments) {
          api.getSkipSegments(videoId).then((segs) => {
            set({ skipSegments: segs || [] });
          }).catch(() => {});
        }
      }

      // If user opened a video or switched tracks while resolving, strictly abort audio
      if (resolutionId !== currentTrackResolutionId || get().isVideoMode || get().activeVideoSource === 'youtube_video') {
        console.log('Discarding stale audio stream resolution');
        return;
      }

      if (audioElement) {
        audioElement.src = streamUrl;
        audioElement.playbackRate = get().playbackSpeed;
        audioElement.volume = get().isMuted ? 0 : get().volume;
        if (seekTime !== undefined && seekTime > 0) {
          audioElement.currentTime = seekTime;
        }
        if (get().isVideoMode || get().activeVideoSource === 'youtube_video') {
          audioElement.pause();
          set({ isLoading: false });
        } else {
          try {
            await audioElement.play();
            set({ isPlaying: true, isLoading: false });
          } catch (playErr) {
            console.warn('Playback deferred or blocked by browser autoplay policy', playErr);
            set({ isPlaying: false, isLoading: false });
          }
        }
      }

      // Fetch Lyrics in background
      get().loadLyrics(track);

      // Pre-cache NEXT track in queue immediately for gapless instant handover
      setTimeout(() => {
        preloadNextTrack();
      }, 300);

      // Update OS / Windows MediaSession metadata & hardware keys
      if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist || 'YT-Z Artist',
            album: track.album || 'YT-Z Lossless Stream',
            artwork: track.thumbnail
              ? [
                  { src: track.thumbnail, sizes: '96x96', type: 'image/jpeg' },
                  { src: track.thumbnail, sizes: '256x256', type: 'image/jpeg' },
                  { src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' },
                ]
              : [],
          });

          navigator.mediaSession.setActionHandler('play', () => get().play());
          navigator.mediaSession.setActionHandler('pause', () => get().pause());
          navigator.mediaSession.setActionHandler('previoustrack', () => get().previous());
          navigator.mediaSession.setActionHandler('nexttrack', () => get().next());
          navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime !== undefined) get().seek(details.seekTime);
          });
          navigator.mediaSession.setActionHandler('seekbackward', (details) => {
            get().seek(Math.max(0, (audioElement?.currentTime || 0) - (details.seekOffset || 10)));
          });
          navigator.mediaSession.setActionHandler('seekforward', (details) => {
            get().seek((audioElement?.currentTime || 0) + (details.seekOffset || 10));
          });
        } catch {}
      }

      // Auto radio recommendation if queue is nearing end
      if (queueIndex >= queue.length - 2 && !track.isLocal) {
        api.getRadio(track.videoId || track.id).then((radioTracks) => {
          if (radioTracks && radioTracks.length > 0) {
            const currentQ = get().queue;
            const existingIds = new Set(currentQ.map((t) => t.id));
            const fresh = radioTracks.filter((t) => !existingIds.has(t.id));
            set({ queue: [...currentQ, ...fresh] });
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to play track', err);
      set({ isLoading: false, isPlaying: false });
    }
  },

  togglePlay: () => {
    initAudioEngine(get());
    if (get().isVideoMode) {
      const isPlaying = get().isPlaying;
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            JSON.stringify({
              event: 'command',
              func: isPlaying ? 'pauseVideo' : 'playVideo',
            }),
            '*'
          );
        }
      });
      const videos = document.querySelectorAll('video');
      videos.forEach((video) => {
        try {
          if (isPlaying) {
            video.pause();
          } else {
            video.play().catch(() => {});
          }
        } catch {}
      });
      set({ isPlaying: !isPlaying });
      return;
    }
    if (!audioElement || !get().currentTrack) return;
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    if (!audioElement.src || audioElement.src === '' || audioElement.src === window.location.href) {
      const { currentTrack, queue, currentTime } = get();
      if (currentTrack) {
        get().playTrack(currentTrack, queue.length > 0 ? queue : [currentTrack], currentTime);
        return;
      }
    }
    if (audioElement.paused) {
      set({ activeVideoSource: null });
      audioElement.play().catch(() => {});
      set({ isPlaying: true });
    } else {
      audioElement.pause();
      set({ isPlaying: false });
    }
  },

  next: async () => {
    const { activeVideoSource } = get();
    // If a persistent YouTube video is actively playing, advance the video queue
    if (activeVideoSource === 'youtube_video' && registeredVideoNext) {
      registeredVideoNext();
      return;
    }

    const { queue, queueIndex, shuffle, repeatMode } = get();
    if (queue.length === 0) return;

    let nextIndex = queueIndex + 1;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        return;
      }
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      await get().playTrack(nextTrack);
    }
  },

  previous: async () => {
    const { activeVideoSource } = get();
    // If a persistent YouTube video is actively playing, rewind to previous video
    if (activeVideoSource === 'youtube_video' && registeredVideoPrevious) {
      registeredVideoPrevious();
      return;
    }

    const { queue, queueIndex, currentTime, isVideoMode } = get();
    if (currentTime > 3) {
      get().seek(0);
      return;
    }

    if (queue.length === 0 || queueIndex <= 0) return;
    const prevTrack = queue[queueIndex - 1];
    if (prevTrack) {
      await get().playTrack(prevTrack);
    }
  },

  seek: (seconds: number) => {
    if (get().isVideoMode) {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'seekTo',
              args: [seconds, true],
            }),
            '*'
          );
        }
      });
      const videos = document.querySelectorAll('video');
      videos.forEach((video) => {
        try {
          video.currentTime = seconds;
        } catch {}
      });
    }
    if (audioElement) {
      audioElement.currentTime = seconds;
    }
    try {
      localStorage.setItem('ytz_persisted_current_time', String(Math.floor(seconds)));
    } catch {}
    set({ currentTime: seconds });
  },

  setVolume: (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    if (audioElement) {
      audioElement.volume = clamped;
    }
    try {
      localStorage.setItem('ytz_persisted_volume', String(clamped));
    } catch {}
    set({ volume: clamped, isMuted: clamped === 0 });
  },

  toggleMute: () => {
    const { isMuted, volume } = get();
    const nextMuted = !isMuted;
    if (audioElement) {
      audioElement.volume = nextMuted ? 0 : volume;
    }
    try {
      localStorage.setItem('ytz_is_muted', String(nextMuted));
    } catch {}
    set({ isMuted: nextMuted });
  },

  setPlaybackSpeed: (speed: number) => {
    if (audioElement) {
      audioElement.playbackRate = speed;
    }
    try {
      localStorage.setItem('ytz_playback_speed', String(speed));
    } catch {}
    set({ playbackSpeed: speed });
  },

  toggleShuffle: () => {
    const nextShuffle = !get().shuffle;
    try {
      localStorage.setItem('ytz_persisted_shuffle', String(nextShuffle));
    } catch {}
    set({ shuffle: nextShuffle });
    setTimeout(preloadNextTrack, 200);
  },

  cycleRepeat: () => {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const current = get().repeatMode;
    const nextMode = modes[(modes.indexOf(current) + 1) % modes.length];
    try {
      localStorage.setItem('ytz_persisted_repeat_mode', nextMode);
    } catch {}
    set({ repeatMode: nextMode });
  },

  setCrossfade: (seconds: number) => {
    set({ crossfadeSeconds: Math.max(0, Math.min(12, seconds)) });
    api.updateConfig({ crossfade_seconds: seconds }).catch(() => {});
  },

  setEqBand: (index: number, gain: number) => {
    const bands = [...get().eqBands];
    bands[index] = gain;
    if (eqFilterNodes[index]) {
      eqFilterNodes[index].gain.value = gain;
    }
    try {
      localStorage.setItem('ytz_eq_bands', JSON.stringify(bands));
      localStorage.setItem('ytz_eq_preset', 'Custom');
    } catch {}
    set({ eqBands: bands, eqPreset: 'Custom' });
  },

  setEqPreset: (presetName: string) => {
    const preset = EQ_PRESETS[presetName];
    if (!preset) return;
    preset.forEach((gain, i) => {
      if (eqFilterNodes[i]) {
        eqFilterNodes[i].gain.value = gain;
      }
    });
    try {
      localStorage.setItem('ytz_eq_preset', presetName);
      localStorage.setItem('ytz_eq_bands', JSON.stringify(preset));
    } catch {}
    set({ eqPreset: presetName, eqBands: [...preset] });
  },

  toggleEq: () => {
    const enabled = !get().eqEnabled;
    eqFilterNodes.forEach((filter, i) => {
      filter.gain.value = enabled ? get().eqBands[i] : 0;
    });
    try {
      localStorage.setItem('ytz_eq_enabled', String(enabled));
    } catch {}
    set({ eqEnabled: enabled });
  },

  setExpanded: (expanded: boolean) => set({ isExpanded: expanded }),
  setVideoMode: (video: boolean) => set({ isVideoMode: video }),
  toggleLyrics: () => {
    const cur = get().lyricsLayoutMode;
    const next = cur === 'off' ? 'split' : 'off';
    get().setLyricsLayoutMode(next);
    set({ isLyricsOpen: next !== 'off' });
  },
  toggleEqualizer: () => set((s) => ({ isEqualizerOpen: !s.isEqualizerOpen })),
  toggleQueue: () => set((s) => ({ isQueueOpen: !s.isQueueOpen })),
  toggleStatsForNerds: () => {
    if (!get().enableStatsForNerds && !get().showStatsForNerds) return;
    set((s) => ({ showStatsForNerds: !s.showStatsForNerds }));
  },
  toggleSleepTimer: () => set((s) => ({ isSleepTimerOpen: !s.isSleepTimerOpen })),

  setSleepTimer: (minutes: number | null, stopAfterTrack = false) => {
    if ((window as any).__ytz_sleep_interval) {
      clearInterval((window as any).__ytz_sleep_interval);
      (window as any).__ytz_sleep_interval = null;
    }

    if (minutes === null && !stopAfterTrack) {
      set({ sleepTimerMinutes: null, sleepTimerRemaining: null, sleepTimerStopAfterTrack: false });
      return;
    }

    if (stopAfterTrack) {
      set({ sleepTimerMinutes: null, sleepTimerRemaining: null, sleepTimerStopAfterTrack: true });
      return;
    }

    const totalSeconds = (minutes || 15) * 60;
    set({
      sleepTimerMinutes: minutes,
      sleepTimerRemaining: totalSeconds,
      sleepTimerStopAfterTrack: false,
    });

    (window as any).__ytz_sleep_interval = setInterval(() => {
      const remaining = get().sleepTimerRemaining;
      if (remaining === null || remaining <= 1) {
        clearInterval((window as any).__ytz_sleep_interval);
        (window as any).__ytz_sleep_interval = null;
        // Fade out gently
        if (audioElement) {
          let v = audioElement.volume;
          const fade = setInterval(() => {
            v = Math.max(0, v - 0.1);
            if (audioElement) audioElement.volume = v;
            if (v <= 0.05) {
              clearInterval(fade);
              audioElement?.pause();
              set({ isPlaying: false, sleepTimerMinutes: null, sleepTimerRemaining: null });
              if (audioElement) audioElement.volume = get().volume;
            }
          }, 150);
        } else {
          set({ isPlaying: false, sleepTimerMinutes: null, sleepTimerRemaining: null });
        }
      } else {
        set({ sleepTimerRemaining: remaining - 1 });
      }
    }, 1000);
  },

  toggleSkipSilence: () => {
    const next = !get().skipSilence;
    try {
      localStorage.setItem('ytz_skip_silence', String(next));
    } catch {}
    set({ skipSilence: next });
  },
  toggleVolumeNormalization: () => {
    const next = !get().volumeNormalization;
    try {
      localStorage.setItem('ytz_volume_normalization', String(next));
    } catch {}
    set({ volumeNormalization: next });
  },

  startRadio: async (track?: Track) => {
    const target = track || get().currentTrack;
    if (!target) return;
    const videoId = target.videoId || target.id;
    try {
      const radioTracks = await api.getRadio(videoId);
      if (radioTracks && radioTracks.length > 0) {
        set({
          queue: [target, ...radioTracks],
          queueIndex: 0,
        });
        if (!get().isPlaying) {
          await get().playTrack(target);
        }
      }
    } catch (err) {
      console.error('Failed to start radio stream', err);
    }
  },

  addToQueue: (track: Track) => {
    set((s) => ({ queue: [...s.queue, track] }));
  },

  removeFromQueue: (index: number) => {
    const q = [...get().queue];
    q.splice(index, 1);
    set({ queue: q });
  },

  clearQueue: () => {
    const current = get().currentTrack;
    set({ queue: current ? [current] : [], queueIndex: current ? 0 : -1 });
  },

  loadLyrics: async (track: Track) => {
    if (!get().lyricsEnabled) {
      set({ lyrics: null, isLyricsLoading: false });
      return;
    }
    const cached = preloadedLyricsMap.get(track.id);
    if (cached) {
      set({ lyrics: cached, isLyricsLoading: false });
      return;
    }
    set({ isLyricsLoading: true });
    try {
      const res = await api.getLyrics(track.title, track.artist, track.durationSeconds || 0);
      set({ lyrics: res, isLyricsLoading: false });
    } catch {
      set({ lyrics: null, isLyricsLoading: false });
    }
  },

  restoreSessionFromConfig: (cfg: any, autoPlay: boolean = true) => {
    if (!cfg) return;
    const current = get().currentTrack;
    const targetTrack = cfg.current_track || current || initialSession.currentTrack;
    if (targetTrack) {
      const restoredQueue = cfg.queue && cfg.queue.length > 0
        ? cfg.queue
        : (get().queue.length > 0 ? get().queue : [targetTrack]);
      const restoredIndex = typeof cfg.queue_index === 'number'
        ? cfg.queue_index
        : (get().queueIndex >= 0 ? get().queueIndex : 0);
      const restoredTime = typeof cfg.current_time === 'number'
        ? cfg.current_time
        : (get().currentTime || initialSession.currentTime || 0);

      const wasPlaying = get().isPlaying;

      const restored: Partial<PlayerState> = {
        currentTrack: targetTrack,
        queue: restoredQueue,
        queueIndex: restoredIndex,
        currentTime: wasPlaying ? get().currentTime : restoredTime,
        volume: typeof cfg.volume === 'number' ? cfg.volume : (get().volume || 0.85),
        isMuted: Boolean(cfg.is_muted ?? get().isMuted),
        repeatMode: (cfg.repeat_mode as any) || get().repeatMode || 'off',
        shuffle: Boolean(cfg.shuffle ?? get().shuffle),
        playbackSpeed: typeof cfg.playback_speed === 'number' ? cfg.playback_speed : (get().playbackSpeed || 1.0),
        audioQuality: cfg.audio_quality || get().audioQuality || 'lossless',
        eqEnabled: cfg.eq_enabled !== undefined ? cfg.eq_enabled : get().eqEnabled,
        eqPreset: cfg.eq_preset || get().eqPreset || 'Flat',
        eqBands: cfg.eq_bands || get().eqBands || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        skipSilence: Boolean(cfg.skip_silence ?? get().skipSilence),
        volumeNormalization: Boolean(cfg.volume_normalization ?? get().volumeNormalization),
        audioStats: cfg.audio_stats || get().audioStats || null,
        duration: targetTrack.durationSeconds || get().duration || 0,
      };
      set(restored);

      try {
        localStorage.setItem('ytz_persisted_current_track', JSON.stringify(targetTrack));
        localStorage.setItem('ytz_persisted_queue', JSON.stringify(restoredQueue));
        localStorage.setItem('ytz_persisted_queue_index', String(restoredIndex));
        localStorage.setItem('ytz_persisted_current_time', String(restoredTime));
        localStorage.setItem('ytz_persisted_volume', String(restored.volume));
        localStorage.setItem('ytz_is_muted', String(restored.isMuted));
        localStorage.setItem('ytz_persisted_repeat_mode', restored.repeatMode || 'off');
        localStorage.setItem('ytz_persisted_shuffle', String(restored.shuffle));
        localStorage.setItem('ytz_playback_speed', String(restored.playbackSpeed));
        localStorage.setItem('ytz_audio_quality', restored.audioQuality || 'lossless');
        localStorage.setItem('ytz_eq_enabled', String(restored.eqEnabled));
        localStorage.setItem('ytz_eq_preset', restored.eqPreset || 'Flat');
        localStorage.setItem('ytz_eq_bands', JSON.stringify(restored.eqBands));
        localStorage.setItem('ytz_skip_silence', String(restored.skipSilence));
        localStorage.setItem('ytz_volume_normalization', String(restored.volumeNormalization));
        if (restored.audioStats) {
          localStorage.setItem('ytz_persisted_audio_stats', JSON.stringify(restored.audioStats));
        }
      } catch {}

      if (autoPlay && !wasPlaying) {
        get().autoPlayLastTrack(targetTrack, restoredQueue, restoredTime);
      }
    }
  },

  autoPlayLastTrack: async (track?: Track, queue?: Track[], seekTime?: number) => {
    const state = get();
    if (state.isPlaying) return;

    const targetTrack = track || state.currentTrack || initialSession.currentTrack;
    if (!targetTrack) return;

    const targetQueue = queue || state.queue || initialSession.queue || [targetTrack];
    const targetTime = typeof seekTime === 'number'
      ? seekTime
      : (state.currentTime || initialSession.currentTime || 0);

    const startPlayback = () => {
      get().playTrack(targetTrack, targetQueue, targetTime).catch((err) => {
        console.warn('Browser autoplay policy prevented direct start; waiting for first interaction...', err);
        const onFirstGesture = () => {
          if (!get().isPlaying) {
            get().playTrack(targetTrack, targetQueue, targetTime).catch(() => {});
          }
          window.removeEventListener('click', onFirstGesture);
          window.removeEventListener('keydown', onFirstGesture);
          window.removeEventListener('touchstart', onFirstGesture);
          window.removeEventListener('pointerdown', onFirstGesture);
        };
        window.addEventListener('click', onFirstGesture, { once: true });
        window.addEventListener('keydown', onFirstGesture, { once: true });
        window.addEventListener('touchstart', onFirstGesture, { once: true });
        window.addEventListener('pointerdown', onFirstGesture, { once: true });
      });
    };

    startPlayback();
  },
}));

// Global window unload handler to flush the latest playback state immediately
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    try {
      const state = usePlayerStore.getState();
      const curTime = audioElement && !isNaN(audioElement.currentTime) && audioElement.currentTime > 0
        ? Math.floor(audioElement.currentTime)
        : state.currentTime;

      if (audioElement && !isNaN(audioElement.currentTime) && audioElement.currentTime > 0) {
        localStorage.setItem('ytz_persisted_current_time', String(curTime));
      }
      if (state.currentTrack) {
        localStorage.setItem('ytz_persisted_current_track', JSON.stringify(state.currentTrack));
      }
      if (state.queue && state.queue.length > 0) {
        localStorage.setItem('ytz_persisted_queue', JSON.stringify(state.queue));
        localStorage.setItem('ytz_persisted_queue_index', String(state.queueIndex));
      }
      if (state.audioStats) {
        localStorage.setItem('ytz_persisted_audio_stats', JSON.stringify(state.audioStats));
      }

      // Synchronous beacon to persist session in backend config.json
      const payload = {
        theme: localStorage.getItem('ytz_theme') || 'apple-music',
        active_tab: localStorage.getItem('ytz_active_tab') || 'home',
        current_track: state.currentTrack,
        queue: state.queue,
        queue_index: state.queueIndex,
        current_time: curTime,
        volume: state.volume,
        is_muted: state.isMuted,
        repeat_mode: state.repeatMode,
        shuffle: state.shuffle,
        playback_speed: state.playbackSpeed,
        audio_quality: state.audioQuality,
        eq_enabled: state.eqEnabled,
        eq_preset: state.eqPreset,
        eq_bands: state.eqBands,
        skip_silence: state.skipSilence,
        volume_normalization: state.volumeNormalization,
        audio_stats: state.audioStats,
      };
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon('/api/config', blob);
      }
    } catch {}
  });
}
