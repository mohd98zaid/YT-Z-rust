export interface Track {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  isExplicit?: boolean;
  resultType?: string;
  isLocal?: boolean;
  filePath?: string;
}

export interface LyricWord {
  time: number;
  text: string;
}

export interface LyricLine {
  time: number;
  text: string;
  words?: LyricWord[] | null;
}

export interface LyricsResponse {
  synced: boolean;
  provider: string;
  lines: LyricLine[];
}

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  download_type: 'audio' | 'video';
  format: string;
  quality: string;
  status: 'pending' | 'downloading' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  speed: string;
  eta: string;
  file_size: number;
  file_path?: string | null;
  error_message?: string | null;
  created_at?: string;
  completed_at?: string | null;
}

export interface SponsorBlockSegment {
  category: string;
  start: number;
  end: number;
  actionType: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  category: 'Apple' | 'Dark' | 'Light' | 'Catppuccin' | 'Vibrant';
  colors: {
    bgMain: string;
    bgSurface: string;
    bgElevated: string;
    bgGlass: string;
    borderColor: string;
    borderGlass: string;
    textMain: string;
    textMuted: string;
    textSubtle: string;
    primary: string;
    primaryHover: string;
    accent: string;
    accentHover: string;
  };
}

export interface PluginSource {
  id: string;
  name: string;
  type: 'audio_source' | 'lyrics_source' | 'scrobbler' | 'enhancement' | 'audio_filter';
  description: string;
  endpoint: string;
  api_key?: string;
  enabled: boolean | number;
  status: 'active' | 'degraded' | 'offline' | 'standby';
  latency_ms: number;
  icon?: string;
  is_builtin: boolean | number;
}
