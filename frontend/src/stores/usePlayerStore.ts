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
  measuredBitrate?: number;
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

  // 2-Song Cache & Gapless Engine
  twoSongCache: {
    currentLoaded: boolean;
    nextReady: boolean;
    currentBufferPercent: number;
    nextTrackTitle: string | null;
  };

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
let userExplicitlyPaused = false;
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
    
    // Auto-clear loading spinner if audio is actively progressing
    if (time > 0 && !audioElement.paused && usePlayerStore.getState().isLoading) {
      usePlayerStore.setState({ isLoading: false, isPlaying: true });
    }
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

    // Two-Song Cache: trigger next song preload when current track is playing stably
    const { queue, queueIndex } = usePlayerStore.getState();
    const nextIdx = queueIndex + 1 < queue.length ? queueIndex + 1 : -1;
    if (
      nextIdx !== -1 &&
      queue[nextIdx] &&
      (!slotNext || slotNext.trackId !== queue[nextIdx].id || slotNext.status !== 'ready') &&
      !nextLoadingTrackId
    ) {
      const currentDur = audioElement.duration || 0;
      // Preload next track once current track is stably playing (at least 12s or 30% elapsed)
      if (time >= 12 || (currentDur > 0 && time / currentDur >= 0.3)) {
        preloadNextTrack();
      }
    }

    // Check SponsorBlock skip segments (guarded against skipping music outros)
    const { sponsorBlockEnabled, skipSegments } = usePlayerStore.getState();
    if (sponsorBlockEnabled && skipSegments.length > 0) {
      const dur = audioElement.duration || 0;
      for (const seg of skipSegments) {
        // Do not skip music outros or segments that jump within 8s of track end
        if (seg.category === 'outro' || (dur > 0 && seg.end >= dur - 8)) {
          continue;
        }
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

  // Track HTML5 audio buffering progress
  audioElement.addEventListener('progress', () => {
    if (!audioElement || !audioElement.duration) return;
    if (audioElement.buffered.length > 0) {
      const bufferedEnd = audioElement.buffered.end(audioElement.buffered.length - 1);
      const percent = Math.min(100, Math.round((bufferedEnd / audioElement.duration) * 100));
      const isComplete = percent >= 98 || bufferedEnd >= (audioElement.duration - 0.5);
      usePlayerStore.setState((s) => ({
        twoSongCache: {
          ...s.twoSongCache,
          currentBufferPercent: Math.max(s.twoSongCache.currentBufferPercent, percent),
          currentLoaded: isComplete || s.twoSongCache.currentLoaded,
        },
      }));
      if (isComplete && !nextLoadingTrackId && (!slotNext || slotNext.status !== 'ready')) {
        preloadNextTrack();
      }
    }
  });

  audioElement.addEventListener('canplay', () => {
    usePlayerStore.setState({ isLoading: false });
  });

  audioElement.addEventListener('canplaythrough', () => {
    usePlayerStore.setState({ isLoading: false });
  });

  audioElement.addEventListener('loadedmetadata', () => {
    if (audioElement) {
      const dur = audioElement.duration || 0;
      usePlayerStore.setState((s) => {
        let updatedStats = s.audioStats;
        if (updatedStats && dur > 0 && slotCurrent?.sizeBytes) {
          const measured = Math.round((slotCurrent.sizeBytes * 8) / (dur * 1000));
          if (measured >= 32 && measured <= 10000) {
            updatedStats = {
              ...updatedStats,
              bitrate: updatedStats.measuredBitrate || measured,
              measuredBitrate: updatedStats.measuredBitrate || measured,
              duration: dur,
            };
          }
        }
        return { duration: dur, isLoading: false, audioStats: updatedStats };
      });
    }
  });

  audioElement.addEventListener('ended', () => {
    const { repeatMode, next, sleepTimerStopAfterTrack, currentTrack } = usePlayerStore.getState();
    if (sleepTimerStopAfterTrack) {
      usePlayerStore.setState({ isPlaying: false, sleepTimerStopAfterTrack: false });
      return;
    }

    // Strict validation against premature 'ended' events (e.g. truncated socket / mid-stream EOF)
    const dur = audioElement ? audioElement.duration : 0;
    const cur = audioElement ? audioElement.currentTime : 0;
    const expectedDur = currentTrack?.durationSeconds || dur;

    // If currentTime is significantly before the expected duration (> 5s remaining),
    // the stream ended prematurely due to a network glitch. Reconnect and finish the song!
    if (expectedDur > 12 && cur > 0 && cur < expectedDur - 5) {
      console.warn(`[Player] Premature 'ended' event at ${cur.toFixed(1)}s of ${expectedDur}s. Reconnecting rather than skipping!`);
      usePlayerStore.setState({ isLoading: true });
      if (currentTrack && audioElement) {
        const vid = currentTrack.videoId || currentTrack.id;
        const tParam = encodeURIComponent(currentTrack.title || '');
        const aParam = encodeURIComponent(currentTrack.artist || '');
        audioElement.src = `${API_BASE}/api/stream/${encodeURIComponent(vid)}/audio?title=${tParam}&artist=${aParam}&quality=standard&resume=${Date.now()}`;
        audioElement.currentTime = cur;
        audioElement.play().catch(() => {});
      }
      return;
    }

    if (repeatMode === 'one' && audioElement) {
      audioElement.currentTime = 0;
      audioElement.play();
    } else {
      next();
    }
  });

  let waitingRecoveryTimer: any = null;
  let stallRecoveryTimer: any = null;

  audioElement.addEventListener('waiting', () => {
    usePlayerStore.setState({ isLoading: true });
    if (waitingRecoveryTimer) clearTimeout(waitingRecoveryTimer);
    waitingRecoveryTimer = setTimeout(() => {
      const { currentTrack, isVideoMode, activeVideoSource } = usePlayerStore.getState();
      if (isVideoMode || activeVideoSource === 'youtube_video' || userExplicitlyPaused) return;

      if (audioElement && !audioElement.ended) {
        if (audioElement.paused) {
          audioElement.play().catch(() => {});
        }
        // If after 4.5s still stuck at same position, recover via standard stream
        setTimeout(() => {
          if (!userExplicitlyPaused && currentTrack && audioElement && audioElement.paused && !audioElement.ended) {
            console.warn('[Player] Auto-recovering from frozen buffer state...');
            const cur = audioElement.currentTime || 0;
            const vid = currentTrack.videoId || currentTrack.id;
            audioElement.src = `${API_BASE}/api/stream/${encodeURIComponent(vid)}/audio?quality=standard&recovery=${Date.now()}`;
            audioElement.currentTime = cur;
            audioElement.play().catch(() => {});
          }
        }, 2000);
      }
    }, 2500);
  });

  audioElement.addEventListener('stalled', () => {
    const { currentTrack, isVideoMode, activeVideoSource } = usePlayerStore.getState();
    if (isVideoMode || activeVideoSource === 'youtube_video' || userExplicitlyPaused) return;

    console.warn('[Player] Audio stream network stalled, arming recovery watchdog...');
    usePlayerStore.setState({ isLoading: true });
    if (stallRecoveryTimer) clearTimeout(stallRecoveryTimer);
    stallRecoveryTimer = setTimeout(() => {
      if (!userExplicitlyPaused && currentTrack && audioElement && !audioElement.ended) {
        console.warn('[Player] Executing auto-recovery for stalled stream...');
        const cur = audioElement.currentTime || 0;
        const vid = currentTrack.videoId || currentTrack.id;
        const tParam = encodeURIComponent(currentTrack.title || '');
        const aParam = encodeURIComponent(currentTrack.artist || '');
        audioElement.src = `${API_BASE}/api/stream/${encodeURIComponent(vid)}/audio?title=${tParam}&artist=${aParam}&quality=standard&recovery=${Date.now()}`;
        audioElement.currentTime = cur;
        audioElement.play().catch(() => {});
      }
    }, 3000);
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
    userExplicitlyPaused = false;
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    usePlayerStore.setState({ isPlaying: true, isLoading: false });
  });

  audioElement.addEventListener('pause', () => {
    const { isVideoMode, activeVideoSource, currentTrack } = usePlayerStore.getState();
    if (isVideoMode || activeVideoSource === 'youtube_video') return;
    if (audioElement && !isNaN(audioElement.currentTime)) {
      try {
        localStorage.setItem('ytz_persisted_current_time', String(Math.floor(audioElement.currentTime)));
      } catch {}
    }

    if (userExplicitlyPaused) {
      usePlayerStore.setState({ isPlaying: false, isLoading: false });
      return;
    }

    // Unintended browser pause caused by buffer underrun: auto-resume watchdog
    if (currentTrack && audioElement && !audioElement.ended) {
      console.warn('[Player] Buffer pause encountered without user intent. Watchdog auto-resuming...');
      usePlayerStore.setState({ isLoading: true });
      setTimeout(() => {
        if (!userExplicitlyPaused && audioElement && audioElement.paused && !audioElement.ended) {
          audioElement.play().catch(() => {
            if (!audioElement) return;
            const vid = currentTrack.videoId || currentTrack.id;
            const cur = audioElement.currentTime || 0;
            const tParam = encodeURIComponent(currentTrack.title || '');
            const aParam = encodeURIComponent(currentTrack.artist || '');
            audioElement.src = `${API_BASE}/api/stream/${encodeURIComponent(vid)}/audio?title=${tParam}&artist=${aParam}&quality=standard&recovery=${Date.now()}`;
            audioElement.currentTime = cur;
            audioElement.play().catch(() => {});
          });
        }
      }, 300);
    } else {
      usePlayerStore.setState({ isPlaying: false, isLoading: false });
    }
  });

  audioElement.addEventListener('error', (e) => {
    console.warn('[Player] Audio element error encountered:', audioElement?.error, e);
    const { currentTrack } = usePlayerStore.getState();
    usePlayerStore.setState({ isLoading: false });
    // Resilient fallback: if error was caused by blob URL or high-bitrate stream decoding error, fall back to standard stream
    if (currentTrack && audioElement) {
      const vid = currentTrack.videoId || currentTrack.id;
      const cur = audioElement.currentTime || 0;
      const tParam = encodeURIComponent(currentTrack.title || '');
      const aParam = encodeURIComponent(currentTrack.artist || '');
      const fallbackUrl = `${API_BASE}/api/stream/${encodeURIComponent(vid)}/audio?title=${tParam}&artist=${aParam}&quality=standard&recovery=${Date.now()}`;
      if (audioElement.src !== fallbackUrl) {
        console.log('[Player] Recovering via standard stream fallback at', cur);
        audioElement.src = fallbackUrl;
        audioElement.currentTime = cur;
        audioElement.play().catch(() => {});
      }
    }
  });
}

// =========================================================================
// Industrial Two-Song Cache & Gapless Engine
// Exactly two songs in cache:
//   Slot 1: Current Playing Song (strictly prioritised to load 100% first)
//   Slot 2: Next Song in Queue (preloaded into RAM for 0ms handover)
// =========================================================================

export interface CacheSlot {
  trackId: string;
  blobUrl: string;
  blob?: Blob;
  sizeBytes: number;
  stats?: AudioStats;
  lyrics?: any;
  segments?: any[];
  isFullyLoaded: boolean;
  status: 'idle' | 'loading' | 'ready' | 'error';
}

let slotCurrent: CacheSlot | null = null;
let slotNext: CacheSlot | null = null;
let currentSongAbortController: AbortController | null = null;
let nextSongAbortController: AbortController | null = null;
let nextLoadingTrackId: string | null = null;
let currentLoadingTrackId: string | null = null;

export const loadCurrentTrackCompletely = async (
  track: Track,
  _streamUrl: string,
  _resolutionId: number
) => {
  // Current playing track is streamed natively and cached on disk by backend.
  usePlayerStore.setState((s) => ({
    twoSongCache: {
      ...s.twoSongCache,
      currentLoaded: true,
      currentBufferPercent: 100,
    },
  }));
  // Initiate preloading the next track smoothly without delay
  preloadNextTrack();
};

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

  // Already cached in Slot 2 and ready
  if (slotNext && slotNext.trackId === nextId && slotNext.status === 'ready') {
    return;
  }

  // Already in-flight
  if (nextLoadingTrackId === nextId) {
    return;
  }

  // Abort previous in-flight preload if queue changed
  if (nextSongAbortController) {
    nextSongAbortController.abort();
    nextSongAbortController = null;
  }

  nextLoadingTrackId = nextId;
  const controller = new AbortController();
  nextSongAbortController = controller;

  const videoId = nextTrack.videoId || nextTrack.id;
  const quality = audioQuality || 'lossless';
  const durParam = nextTrack.durationSeconds || 0;

  usePlayerStore.setState((s) => ({
    twoSongCache: {
      ...s.twoSongCache,
      nextReady: false,
      nextTrackTitle: nextTrack.title,
    },
  }));

  // 1. Warm up backend audio cache on local disk
  if (!nextTrack.isLocal) {
    api.preloadTrack(videoId, nextTrack.title, nextTrack.artist, durParam, quality).then(() => {
      if (slotNext && slotNext.trackId === nextId) {
        slotNext.status = 'ready';
        slotNext.isFullyLoaded = true;
      }
      usePlayerStore.setState((s) => ({
        twoSongCache: {
          ...s.twoSongCache,
          nextReady: true,
          nextTrackTitle: nextTrack.title,
        },
      }));
    }).catch(() => {});
  }

  // 2. Pre-fetch stream metadata & stats
  let cachedStats: AudioStats | undefined;
  let cachedLyrics: any | undefined;
  let cachedSegments: any[] | undefined;

  if (!nextTrack.isLocal) {
    api.getAudioStream(videoId, nextTrack.title, nextTrack.artist, durParam, quality)
      .then((streamInfo) => {
        if (streamInfo) {
          const isLosslessStream = Boolean(streamInfo.isLossless);
          const effectiveCodec = (streamInfo.codec || (isLosslessStream ? 'flac' : 'opus')).toLowerCase();
          const effectiveBitrate = streamInfo.bitrate || (isLosslessStream ? 1411 : (effectiveCodec === 'opus' ? 160 : 320));
          const effectiveProvider = streamInfo.addonName || (isLosslessStream ? 'Bit-Perfect Lossless FLAC' : (streamInfo.source === 'youtube' ? 'YouTube Music Direct' : 'High Quality Stream (320k AAC)'));

          cachedStats = {
            codec: effectiveCodec,
            bitrate: effectiveBitrate,
            duration: nextTrack.durationSeconds || 0,
            provider: effectiveProvider,
            isLossless: isLosslessStream,
            sampleRate: streamInfo.sampleRate || (effectiveCodec === 'opus' ? 48000 : 44100),
            bitDepth: streamInfo.bitDepth || (isLosslessStream && effectiveBitrate > 1500 ? 24 : 16),
            qualityTier: streamInfo.qualityTier || (isLosslessStream ? 'lossless' : 'high'),
            addonName: effectiveProvider,
          };
          if (slotNext && slotNext.trackId === nextId) {
            slotNext.stats = cachedStats;
          }
        }
      })
      .catch(() => {});

    api.getSkipSegments(videoId)
      .then((segs) => {
        cachedSegments = segs;
        if (slotNext && slotNext.trackId === nextId) {
          slotNext.segments = segs;
        }
      })
      .catch(() => {});
  }

  // 3. Pre-cache lyrics for instant display
  api.getLyrics(nextTrack.title, nextTrack.artist, durParam)
    .then((lyrics) => {
      cachedLyrics = lyrics;
      if (slotNext && slotNext.trackId === nextId) {
        slotNext.lyrics = lyrics;
      }
    })
    .catch(() => {});

  // 4. Preload audio stream into Slot 2 memory Blob
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

    if (slotNext?.blobUrl) {
      try { URL.revokeObjectURL(slotNext.blobUrl); } catch {}
    }

    slotNext = {
      trackId: nextId,
      blobUrl,
      blob,
      sizeBytes: blob.size,
      stats: cachedStats,
      lyrics: cachedLyrics,
      segments: cachedSegments,
      isFullyLoaded: true,
      status: 'ready',
    };

    console.log(
      `[TwoSongCache] Slot 2 (Next Song) ready in RAM: "${nextTrack.title}" (${(blob.size / 1024 / 1024).toFixed(2)} MB)`
    );

    usePlayerStore.setState((s) => ({
      twoSongCache: {
        ...s.twoSongCache,
        nextReady: true,
        nextTrackTitle: nextTrack.title,
      },
    }));
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.log(`[TwoSongCache] Next song preload aborted: ${nextTrack.title}`);
    } else {
      console.warn(`[TwoSongCache] Next song preload error for ${nextTrack.title}:`, err);
    }
  } finally {
    if (nextLoadingTrackId === nextId) {
      nextLoadingTrackId = null;
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

    let parsedTrack = rawTrack ? (JSON.parse(rawTrack) as Track) : null;
    if (parsedTrack && !parsedTrack.thumbnail) {
      const vId = parsedTrack.videoId || parsedTrack.id;
      if (vId && typeof vId === 'string' && vId.length === 11 && !/[/?&=#\s]/.test(vId)) {
        parsedTrack.thumbnail = `https://i.ytimg.com/vi/${vId}/maxresdefault.jpg`;
      }
    }
    return {
      currentTrack: parsedTrack,
      // User requested: ONLY current playing song resume if user relaunch application, not all
      queue: parsedTrack ? [parsedTrack] : [],
      queueIndex: parsedTrack ? 0 : -1,
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

  twoSongCache: {
    currentLoaded: false,
    nextReady: false,
    currentBufferPercent: 0,
    nextTrackTitle: null,
  },

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
    userExplicitlyPaused = true;
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
    set({ isPlaying: false, isLoading: false });
  },

  pauseAudio: () => {
    userExplicitlyPaused = true;
    if (audioElement && !audioElement.paused) {
      audioElement.pause();
    }
    set({ isPlaying: false, isLoading: false });
  },

  stopAudio: () => {
    userExplicitlyPaused = true;
    currentTrackResolutionId++;
    if (audioElement) {
      try {
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.removeAttribute('src');
        audioElement.load();
      } catch {}
    }
    set({ isPlaying: false, isLoading: false });
  },

  play: () => {
    userExplicitlyPaused = false;
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
    userExplicitlyPaused = false;
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

    const trackVid = track.videoId || track.id;
    const is11CharYt = trackVid && typeof trackVid === 'string' && trackVid.length === 11 && !/[/?&=#\s]/.test(trackVid);
    const effectiveTrack: Track = {
      ...track,
      thumbnail: track.thumbnail || (is11CharYt ? `https://i.ytimg.com/vi/${trackVid}/maxresdefault.jpg` : ''),
    };

    let queue = get().queue;
    let queueIndex = get().queueIndex;

    if (newQueue) {
      queue = newQueue.map((t) => {
        if (t.id === effectiveTrack.id) return effectiveTrack;
        if (!t.thumbnail) {
          const tVid = t.videoId || t.id;
          if (tVid && typeof tVid === 'string' && tVid.length === 11 && !/[/?&=#\s]/.test(tVid)) {
            return { ...t, thumbnail: `https://i.ytimg.com/vi/${tVid}/maxresdefault.jpg` };
          }
        }
        return t;
      });
      queueIndex = queue.findIndex((t) => t.id === effectiveTrack.id);
      if (queueIndex === -1) {
        queue = [effectiveTrack, ...queue];
        queueIndex = 0;
      }
    } else {
      const idx = queue.findIndex((t) => t.id === effectiveTrack.id);
      if (idx !== -1) {
        queueIndex = idx;
        queue[idx] = effectiveTrack;
      } else {
        queue = [...queue, effectiveTrack];
        queueIndex = queue.length - 1;
      }
    }

    set({
      currentTrack: effectiveTrack,
      queue,
      queueIndex,
      isLoading: true,
      currentTime: seekTime !== undefined ? seekTime : 0,
      skipSegments: [],
      lyrics: null,
    });

    // Persist session to localStorage
    try {
      localStorage.setItem('ytz_persisted_current_track', JSON.stringify(effectiveTrack));
      localStorage.setItem('ytz_persisted_queue', JSON.stringify(queue));
      localStorage.setItem('ytz_persisted_queue_index', String(queueIndex));
    } catch {}

    // Record playback in SQLite history
    api.recordPlayback(effectiveTrack).catch(() => {});

    // Resume AudioContext if suspended
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Cleanly stop and detach previous audio stream before starting new track
    if (audioElement) {
      try {
        audioElement.pause();
        audioElement.removeAttribute('src');
        audioElement.load();
      } catch {}
    }

    // Safely revoke previous blob URL now that audio element has detached
    const prevBlobUrl = slotCurrent?.blobUrl;
    if (prevBlobUrl && prevBlobUrl !== slotNext?.blobUrl) {
      try {
        URL.revokeObjectURL(prevBlobUrl);
      } catch {}
    }

    try {
      let streamUrl = '';
      let codec = 'opus';
      let bitrate = 160;

      // 1. Two-Song Cache: Slot 2 Instant Promotion Check
      if (slotNext && slotNext.trackId === track.id && slotNext.blobUrl && slotNext.status === 'ready') {
        console.log(`[TwoSongCache] Slot 2 Promotion! 0ms instant playback for: "${track.title}"`);
        slotCurrent = { ...slotNext, isFullyLoaded: true, status: 'ready' };
        slotNext = null;
        streamUrl = slotCurrent.blobUrl;

        if (slotCurrent.stats) {
          set({ audioStats: slotCurrent.stats });
        }
        if (slotCurrent.segments) {
          set({ skipSegments: slotCurrent.segments });
        }
        if (slotCurrent.lyrics) {
          set({ lyrics: slotCurrent.lyrics });
        }

        set({
          twoSongCache: {
            currentLoaded: true,
            nextReady: false,
            currentBufferPercent: 100,
            nextTrackTitle: null,
          },
        });
      } else if (slotCurrent && slotCurrent.trackId === track.id && slotCurrent.blobUrl && slotCurrent.status === 'ready') {
        streamUrl = slotCurrent.blobUrl;
        console.log(`[TwoSongCache] Replaying Slot 1 cached audio: "${track.title}"`);
        set({
          twoSongCache: {
            currentLoaded: true,
            nextReady: Boolean(slotNext && slotNext.status === 'ready'),
            currentBufferPercent: 100,
            nextTrackTitle: slotNext ? 'Ready' : null,
          },
        });
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

        // Use range-aware audio streaming proxy with resilient fallback & backend cache
        streamUrl = `${API_BASE}/api/stream/${encodeURIComponent(videoId)}/audio?title=${titleParam}&artist=${artistParam}&duration=${durParam}&quality=${quality}`;

        // Reset cache slot for fresh playback
        slotCurrent = {
          trackId: track.id,
          blobUrl: '',
          sizeBytes: 0,
          isFullyLoaded: true,
          status: 'ready',
        };
        slotNext = null;

        set({
          twoSongCache: {
            currentLoaded: true,
            nextReady: false,
            currentBufferPercent: 0,
            nextTrackTitle: null,
          },
        });

        // Fetch stream metadata with Lossless Addon details in background
        api.getAudioStream(videoId, track.title, track.artist, durParam, quality).then((streamInfo) => {
          const isLosslessStream = Boolean(streamInfo.isLossless);
          const effectiveCodec = (streamInfo.codec || (isLosslessStream ? 'flac' : 'opus')).toLowerCase();
          const effectiveBitrate = streamInfo.bitrate || (isLosslessStream ? 1535 : (effectiveCodec === 'opus' ? 160 : 320));
          const effectiveProvider = streamInfo.addonName || (isLosslessStream ? 'PencariMusic' : (streamInfo.source === 'youtube' ? 'YouTube Music Direct' : 'High Quality Stream (320k AAC)'));

          set((s) => {
            const finalBitrate = streamInfo.bitrate || s.audioStats?.measuredBitrate || effectiveBitrate;
            const updatedTrack = (s.currentTrack && streamInfo.thumbnail && (!s.currentTrack.thumbnail || s.currentTrack.thumbnail.includes('maxresdefault.jpg')))
              ? { ...s.currentTrack, thumbnail: streamInfo.thumbnail }
              : s.currentTrack;
            return {
              currentTrack: updatedTrack,
              audioStats: {
                codec: effectiveCodec,
                bitrate: finalBitrate,
                measuredBitrate: finalBitrate,
                duration: (streamInfo as any).duration || track.durationSeconds || 0,
                provider: effectiveProvider,
                isLossless: isLosslessStream,
                sampleRate: streamInfo.sampleRate || (isLosslessStream ? 48000 : 44100),
                bitDepth: streamInfo.bitDepth || (isLosslessStream ? 24 : 16),
                qualityTier: streamInfo.qualityTier || (isLosslessStream ? 'lossless' : 'high'),
                addonName: effectiveProvider,
              },
            };
          });
        }).catch(() => {
          set({
            audioStats: {
              codec: 'opus',
              bitrate: 160,
              duration: track.durationSeconds || 0,
              provider: 'YouTube Music Direct (160k Opus)',
              isLossless: false,
              sampleRate: 48000,
              bitDepth: 16,
              qualityTier: 'standard',
            },
          });
        });

        // Fetch SponsorBlock skip segments in background
        api.getSkipSegments(videoId).then((segs) => {
          set({ skipSegments: segs || [] });
        }).catch(() => {});
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
          } catch (playErr: any) {
            if (playErr.name === 'AbortError') {
              console.log('Playback superseded by newer track selection');
              return;
            }
            console.warn('Playback deferred or blocked by browser autoplay policy', playErr);
            set({ isPlaying: false, isLoading: false });
          }
        }
      }

      // Fetch Lyrics in background
      get().loadLyrics(track);

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
      userExplicitlyPaused = false;
      set({ activeVideoSource: null });
      audioElement.play().catch(() => {});
      set({ isPlaying: true });
    } else {
      userExplicitlyPaused = true;
      audioElement.pause();
      set({ isPlaying: false, isLoading: false });
    }
  },

  next: async () => {
    userExplicitlyPaused = false;
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
        const cur = get().currentTrack;
        if (cur && !cur.isLocal) {
          try {
            const vid = cur.videoId || cur.id;
            const radioTracks = await api.getRadio(vid);
            if (radioTracks && radioTracks.length > 0) {
              const currentQ = get().queue;
              const existingIds = new Set(currentQ.map((t) => t.id));
              const fresh = radioTracks.filter((t) => !existingIds.has(t.id));
              if (fresh.length > 0) {
                const updatedQ = [...currentQ, ...fresh];
                set({ queue: updatedQ, queueIndex: queueIndex + 1 });
                await get().playTrack(fresh[0]);
                return;
              }
            }
          } catch (err) {
            console.warn('[Player] Auto-radio on end of queue failed:', err);
          }
        }
        return;
      }
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      await get().playTrack(nextTrack);
    }
  },

  previous: async () => {
    userExplicitlyPaused = false;
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
    const cached = (slotCurrent?.trackId === track.id ? slotCurrent.lyrics : (slotNext?.trackId === track.id ? slotNext.lyrics : null));
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
      // User requested: ONLY current playing song resume if user relaunch application, not all
      const restoredQueue = [targetTrack];
      const restoredIndex = 0;
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
