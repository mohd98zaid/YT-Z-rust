import { Track, DownloadItem, LyricsResponse, SponsorBlockSegment } from '../types';

const API_BASE = 'http://127.0.0.1:47892';
const WS_BASE = 'ws://127.0.0.1:47892/ws';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(url, options);
  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`API Error ${resp.status}: ${errorText || resp.statusText}`);
  }
  return resp.json();
}

export const api = {
  // Discovery
  getHome: () => fetchJson<any[]>(`${API_BASE}/api/ytm/home`),
  getQuickPicks: (refresh = false, mood?: string, limit = 10) =>
    fetchJson<Track[]>(
      `${API_BASE}/api/ytm/quick-picks?refresh=${refresh}${mood ? `&mood=${encodeURIComponent(mood)}` : ''}&limit=${limit}`
    ),
  getCharts: (country = 'IN') => fetchJson<any>(`${API_BASE}/api/ytm/charts?country=${country}`),
  getMoodCategories: () => fetchJson<Record<string, any[]>>(`${API_BASE}/api/ytm/moods`),
  getMoodPlaylists: (params: string) => fetchJson<any[]>(`${API_BASE}/api/ytm/moods/playlists?params=${encodeURIComponent(params)}`),
  search: (query: string, filter?: string) => {
    const url = filter
      ? `${API_BASE}/api/ytm/search?query=${encodeURIComponent(query)}&filter=${encodeURIComponent(filter)}`
      : `${API_BASE}/api/ytm/search?query=${encodeURIComponent(query)}`;
    return fetchJson<Track[]>(url);
  },
  searchYouTubeVideos: (query: string, limit = 20) =>
    fetchJson<Track[]>(`${API_BASE}/api/youtube/search?query=${encodeURIComponent(query)}&limit=${limit}`),
  getSuggestions: (query: string) => fetchJson<string[]>(`${API_BASE}/api/ytm/suggestions?query=${encodeURIComponent(query)}`),
  getArtist: (channelId: string) => fetchJson<any>(`${API_BASE}/api/ytm/artist/${channelId}`),
  getAlbum: (browseId: string) => fetchJson<any>(`${API_BASE}/api/ytm/album/${browseId}`),
  getPlaylist: (playlistId: string) => fetchJson<any>(`${API_BASE}/api/ytm/playlist/${playlistId}`),
  getRadio: (videoId: string) => fetchJson<Track[]>(`${API_BASE}/api/ytm/radio/${videoId}`),

  // Playback & Stream (Lossless Addon & YouTube Fallback)
  getAudioStream: (videoId: string, title = '', artist = '', duration = 0, quality = 'auto') =>
    fetchJson<{
      streamUrl: string;
      codec: string;
      format: string;
      bitrate: number;
      sampleRate: number;
      bitDepth: number;
      isLossless: boolean;
      qualityTier: string;
      source: string;
      addonName?: string;
    }>(
      `${API_BASE}/api/stream/${videoId}?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&duration=${duration}&quality=${quality}`
    ),
  getSkipSegments: (videoId: string) => fetchJson<SponsorBlockSegment[]>(`${API_BASE}/api/stream/${videoId}/segments`),
  getVideoStreamInfo: (videoId: string) =>
    fetchJson<{
      videoId: string;
      videoUrl: string;
      title: string;
      duration: number;
      resolution: string;
      audioQuality: string;
    }>(`${API_BASE}/api/stream/${videoId}/video-info`),

  // Lyrics
  getLyrics: (title: string, artist = '', duration = 0) =>
    fetchJson<LyricsResponse>(`${API_BASE}/api/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&duration=${duration}`),

  // Downloader
  inspectUrl: (url: string) =>
    fetchJson<any>(`${API_BASE}/api/downloader/inspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }),
  queueDownload: (data: {
    url: string;
    download_type: 'audio' | 'video';
    format: string;
    quality: string;
    title?: string;
    artist?: string;
    thumbnail?: string;
  }) =>
    fetchJson<{ status: string; id: string }>(`${API_BASE}/api/downloader/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  batchQueue: (items: any[]) =>
    fetchJson<{ status: string; count: number; ids: string[] }>(`${API_BASE}/api/downloader/batch-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    }),
  getQueue: () => fetchJson<DownloadItem[]>(`${API_BASE}/api/downloader/queue`),
  getHistory: () => fetchJson<DownloadItem[]>(`${API_BASE}/api/downloader/history`),
  cancelDownload: (id: string) => fetchJson<any>(`${API_BASE}/api/downloader/cancel/${id}`, { method: 'POST' }),
  retryDownload: (id: string) => fetchJson<any>(`${API_BASE}/api/downloader/retry/${id}`, { method: 'POST' }),
  deleteDownload: (id: string) => fetchJson<any>(`${API_BASE}/api/downloader/${id}`, { method: 'DELETE' }),
  clearCompleted: () => fetchJson<any>(`${API_BASE}/api/downloader/clear-completed`, { method: 'DELETE' }),

  // Spotify Importer
  importSpotify: (url: string, limit = 50) =>
    fetchJson<any>(`${API_BASE}/api/spotify/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, limit }),
    }),

  // Local Library
  scanLibrary: (path?: string) => {
    const url = path ? `${API_BASE}/api/library/scan?path=${encodeURIComponent(path)}` : `${API_BASE}/api/library/scan`;
    return fetchJson<any[]>(url);
  },
  openExplorer: (path: string) =>
    fetchJson<any>(`${API_BASE}/api/library/open-explorer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    }),

  // Favorites
  getFavorites: () => fetchJson<Track[]>(`${API_BASE}/api/favorites`),
  addFavorite: (track: Track) =>
    fetchJson<any>(`${API_BASE}/api/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(track),
    }),
  removeFavorite: (videoId: string) => fetchJson<any>(`${API_BASE}/api/favorites/${videoId}`, { method: 'DELETE' }),

  // Search History
  getSearchHistory: () => fetchJson<string[]>(`${API_BASE}/api/history/searches`),
  saveSearchQuery: (query: string) =>
    fetchJson<any>(`${API_BASE}/api/history/searches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    }),
  deleteSearchQuery: (query?: string) =>
    fetchJson<any>(`${API_BASE}/api/history/searches${query ? `?query=${encodeURIComponent(query)}` : ''}`, {
      method: 'DELETE',
    }),

  // Playback / Listening History
  getPlaybackHistory: (limit = 50) => fetchJson<Track[]>(`${API_BASE}/api/history/playback?limit=${limit}`),
  recordPlayback: (track: Track) =>
    fetchJson<any>(`${API_BASE}/api/history/playback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(track),
    }),
  clearPlaybackHistory: (trackId?: string) =>
    fetchJson<any>(`${API_BASE}/api/history/playback${trackId ? `?track_id=${encodeURIComponent(trackId)}` : ''}`, {
      method: 'DELETE',
    }),

  // Config & Session Persistence
  getConfig: () => fetchJson<any>(`${API_BASE}/api/config`),
  updateConfig: (updates: any) =>
    fetchJson<any>(`${API_BASE}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }),
  getSession: () => fetchJson<any>(`${API_BASE}/api/session`),
  updateSession: (updates: any) =>
    fetchJson<any>(`${API_BASE}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }),

  // Pluggable Sources & Extensions
  getPlugins: () => fetchJson<any[]>(`${API_BASE}/api/plugins`),
  togglePlugin: (id: string, enabled: boolean) =>
    fetchJson<any>(`${API_BASE}/api/plugins/${id}/toggle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    }),
  addPlugin: (payload: any) =>
    fetchJson<any>(`${API_BASE}/api/plugins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  deletePlugin: (id: string) => fetchJson<any>(`${API_BASE}/api/plugins/${id}`, { method: 'DELETE' }),
  testPlugin: (id: string) => fetchJson<any>(`${API_BASE}/api/plugins/${id}/test`, { method: 'POST' }),

  // Custom Playlists
  getCustomPlaylists: () =>
    fetchJson<Array<{ id: string; name: string; description: string; thumbnail: string; trackCount: number; created_at: string }>>(
      `${API_BASE}/api/playlists/custom`
    ),
  createCustomPlaylist: (name: string, description = '', thumbnail = '') =>
    fetchJson<any>(`${API_BASE}/api/playlists/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, thumbnail }),
    }),
  getCustomPlaylist: (id: string) => fetchJson<any>(`${API_BASE}/api/playlists/custom/${id}`),
  updateCustomPlaylist: (id: string, data: { name?: string; description?: string; thumbnail?: string }) =>
    fetchJson<any>(`${API_BASE}/api/playlists/custom/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  deleteCustomPlaylist: (id: string) => fetchJson<any>(`${API_BASE}/api/playlists/custom/${id}`, { method: 'DELETE' }),
  addTrackToPlaylist: (playlistId: string, track: Track) =>
    fetchJson<any>(`${API_BASE}/api/playlists/custom/${playlistId}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(track),
    }),
  removeTrackFromPlaylist: (playlistId: string, trackId: string) =>
    fetchJson<any>(`${API_BASE}/api/playlists/custom/${playlistId}/tracks/${encodeURIComponent(trackId)}`, {
      method: 'DELETE',
    }),

  // ID3 Tag Editor
  editAudioTags: (payload: { filePath: string; title: string; artist: string; album: string; year?: string; genre?: string }) =>
    fetchJson<any>(`${API_BASE}/api/library/edit-tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  // Storage & Cache
  getStorageInfo: () =>
    fetchJson<{
      cacheSizeBytes: number;
      cacheSizeMB: number;
      downloadsSizeBytes: number;
      downloadsSizeMB: number;
      downloadsPath: string;
    }>(`${API_BASE}/api/storage/info`),
  clearCache: () => fetchJson<any>(`${API_BASE}/api/storage/clear-cache`, { method: 'POST' }),

  // WebSocket
  createWebSocket: (onMessage: (data: any) => void) => {
    let ws: WebSocket | null = null;
    let keepAliveInterval: any = null;

    const connect = () => {
      ws = new WebSocket(WS_BASE);
      ws.onopen = () => {
        keepAliveInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 15000);
      };
      ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const parsed = JSON.parse(event.data);
          onMessage(parsed);
        } catch {
          // non-json
        }
      };
      ws.onclose = () => {
        clearInterval(keepAliveInterval);
        setTimeout(connect, 3000);
      };
      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      clearInterval(keepAliveInterval);
      ws?.close();
    };
  },
};
