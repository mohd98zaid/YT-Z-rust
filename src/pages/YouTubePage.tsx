import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Search,
  Download,
  ExternalLink,
  Flame,
  Maximize2,
  ListPlus,
  RotateCcw,
  Clipboard,
  X,
  PictureInPicture2,
} from 'lucide-react';
import { api } from '../services/api';
import { Track } from '../types';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useDownloadStore } from '../stores/useDownloadStore';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useVideoStore } from '../stores/useVideoStore';

// Authentic YouTube Play Icon
const YouTubeIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

// Helper to extract YouTube video ID from various link formats
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}

export const YouTubePage: React.FC = () => {
  const [urlInput, setUrlInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingVideos, setTrendingVideos] = useState<Track[]>([]);
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const {
    activeVideo,
    isPiP,
    isFullscreen,
    playVideo,
    closeVideo,
    togglePiP,
    setPiP,
    setIsFullscreen,
    reloadVideo,
    restoreCinema,
  } = useVideoStore();

  const { playTrack } = usePlayerStore();
  const { queueDownload } = useDownloadStore();
  const youtubeSelectedVideo = useNavigationStore((s) => s.youtubeSelectedVideo);

  // Picture-in-Picture on scroll: detect when Cinema Screen scrolls out of view
  useEffect(() => {
    if (!activeVideo) {
      return;
    }

    const scrollContainer = sentinelRef.current?.closest('main') || window;

    const handleScroll = () => {
      if (!sentinelRef.current) return;
      const rect = sentinelRef.current.getBoundingClientRect();
      // When the cinema screen scrolls past header into top view
      if (rect.bottom < 80) {
        setPiP(true);
      } else if (rect.top >= 40) {
        setPiP(false);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [activeVideo, setPiP]);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Auto-play video redirected from other components
  useEffect(() => {
    if (youtubeSelectedVideo && youtubeSelectedVideo.id) {
      playVideo({
        id: youtubeSelectedVideo.id,
        title: youtubeSelectedVideo.title,
        artist: youtubeSelectedVideo.artist || 'YouTube',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [youtubeSelectedVideo, playVideo]);

  const [trendingCategory, setTrendingCategory] = useState<'IN' | 'bollywood' | 'punjabi' | 'US'>('IN');

  // Load Trending YouTube Videos (Default: India / Hindi)
  const loadTrending = async (category: 'IN' | 'bollywood' | 'punjabi' | 'US' = 'IN') => {
    setLoading(true);
    setTrendingCategory(category);
    try {
      if (category === 'IN') {
        const charts = await api.getCharts('IN');
        if (charts && charts.videos && charts.videos.length > 0) {
          setTrendingVideos(charts.videos);
        }
      } else if (category === 'US') {
        const charts = await api.getCharts('US');
        if (charts && charts.videos && charts.videos.length > 0) {
          setTrendingVideos(charts.videos);
        }
      } else if (category === 'bollywood') {
        const results = await api.searchYouTubeVideos('Hindi Bollywood official video new song', 16);
        setTrendingVideos(results || []);
      } else if (category === 'punjabi') {
        const results = await api.searchYouTubeVideos('Punjabi official video new song', 16);
        setTrendingVideos(results || []);
      }
    } catch (err) {
      console.error('Failed to load trending videos', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrending('IN');
  }, []);

  const handlePlayUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const id = extractYouTubeId(urlInput);
    if (id) {
      playVideo({
        id,
        title: `YouTube Video (${id})`,
        artist: 'YouTube',
      });
      setUrlInput('');
    } else {
      alert('Please enter a valid YouTube video URL or 11-character video ID.');
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text);
        const id = extractYouTubeId(text);
        if (id) {
          playVideo({
            id,
            title: `YouTube Video (${id})`,
            artist: 'YouTube',
          });
          setCopiedToast(true);
          setTimeout(() => setCopiedToast(false), 2000);
        }
      }
    } catch {
      // Fallback if clipboard api blocked
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const data = await api.searchYouTubeVideos(searchQuery);
      setSearchResults(data || []);
    } catch (err) {
      console.error('Failed to search YouTube videos', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectVideo = (video: Track) => {
    const id = video.videoId || video.id;
    playVideo({
      id,
      title: video.title,
      artist: video.artist || 'YouTube',
      thumbnail: video.thumbnail,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadVideo = (id: string, title: string, author: string, isAudio = false) => {
    queueDownload({
      url: `https://www.youtube.com/watch?v=${id}`,
      download_type: isAudio ? 'audio' : 'video',
      format: isAudio ? 'mp3' : 'mp4',
      quality: isAudio ? '320' : '1080',
      title: title || 'YouTube Video',
      artist: author || 'YouTube',
    });
  };

  const handleListenAsAudio = () => {
    if (!activeVideo) return;
    const cur = activeVideo;
    closeVideo();
    playTrack({
      id: cur.id,
      videoId: cur.id,
      title: cur.title,
      artist: cur.artist,
      thumbnail: cur.thumbnail || `https://i.ytimg.com/vi/${cur.id}/hqdefault.jpg`,
      duration: '0:00',
      durationSeconds: 0,
    });
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto pb-28">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center shadow-lg shadow-red-500/10">
            <YouTubeIcon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                YouTube Videos & Music
              </h1>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600/20 text-red-500 border border-red-500/30 uppercase">
                4K Cinema
              </span>
            </div>
            <p className="text-xs text-foreground-muted mt-0.5">
              Watch ad-free videos, float in Sidebar PiP, or seamlessly convert to audio & download
            </p>
          </div>
        </div>

        {/* Quick URL Bar */}
        <form onSubmit={handlePlayUrl} className="flex items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste any YouTube URL or Video ID..."
              className="w-full bg-surface border border-border focus:border-red-500 text-foreground placeholder:text-foreground-subtle text-xs rounded-2xl pl-4 pr-10 py-3 outline-none transition-all shadow-inner"
            />
            <button
              type="button"
              onClick={handlePaste}
              title="Paste from Clipboard"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl hover:bg-surface-elevated text-foreground-muted hover:text-foreground transition-colors"
            >
              <Clipboard className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="submit"
            className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/25 transition-all hover:scale-105 active:scale-95 shrink-0 flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play Video</span>
          </button>
        </form>
      </div>

      {/* Main Theater Player Section (only when a video is selected) */}
      {activeVideo ? (
        <div className="bg-surface border border-border rounded-3xl p-5 shadow-2xl space-y-4 animate-fadeIn relative">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-red-500 flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Now Playing
            </span>
            <div className="flex items-center gap-2">
              {/* Picture-in-Picture Toggle Button */}
              <button
                type="button"
                onClick={togglePiP}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl transition-all border ${
                  isPiP
                    ? 'bg-red-600/20 text-red-500 border-red-500/40 shadow-sm shadow-red-500/20'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-elevated border-border/50'
                }`}
                title={isPiP ? 'Restore full cinema screen' : 'Dock video into Sidebar PiP'}
              >
                <PictureInPicture2 className="w-3.5 h-3.5 text-red-500" />
                <span>{isPiP ? 'Exit PiP' : 'Sidebar PiP'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="flex items-center gap-1.5 text-xs font-semibold text-foreground-muted hover:text-foreground hover:bg-surface-elevated px-2.5 py-1 rounded-xl transition-colors border border-border/50"
                title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen (F)'}
              >
                <Maximize2 className="w-3.5 h-3.5 text-red-500" />
                <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
              </button>

              <button
                type="button"
                onClick={reloadVideo}
                className="flex items-center gap-1.5 text-xs font-semibold text-foreground-muted hover:text-foreground hover:bg-surface-elevated px-2.5 py-1 rounded-xl transition-colors border border-border/50"
                title="Reload / Retry Video Player"
              >
                <RotateCcw className="w-3.5 h-3.5 text-foreground-muted" />
                <span>Retry</span>
              </button>

              <button
                type="button"
                onClick={closeVideo}
                className="flex items-center gap-1 text-xs font-semibold text-foreground-muted hover:text-foreground hover:bg-surface-elevated px-2.5 py-1 rounded-xl transition-colors border border-border/50"
              >
                <X className="w-3.5 h-3.5" />
                <span>Close Video</span>
              </button>
            </div>
          </div>

          {/* Sentinel & Cinema Screen Anchor for Persistent Video Player */}
          <div
            ref={sentinelRef}
            id="youtube-cinema-anchor"
            className="relative w-full aspect-video rounded-2xl max-h-[65vh] bg-black/40 overflow-hidden"
          >
            {/* Animated Placeholder displayed in page layout when video docks into Sidebar PiP */}
            {isPiP && (
              <div
                onClick={restoreCinema}
                className="w-full h-full rounded-2xl border-2 border-dashed border-red-500/30 bg-surface-elevated/40 hover:bg-surface-elevated/70 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group p-6 shadow-inner animate-fadeIn select-none"
              >
                <div className="w-12 h-12 rounded-2xl bg-red-600/15 border border-red-500/30 text-red-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <PictureInPicture2 className="w-6 h-6 animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-foreground flex items-center justify-center gap-2">
                    <span>Video Playing in Sidebar PiP</span>
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  </p>
                  <p className="text-xs text-foreground-muted mt-1">
                    Click anywhere here or in the left sidebar to restore full cinema screen
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Under-Video Details & Quick Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-foreground truncate">{activeVideo.title}</h2>
              <p className="text-xs text-foreground-muted truncate mt-0.5">{activeVideo.artist}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Play Audio in Global Player */}
              <button
                type="button"
                onClick={handleListenAsAudio}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-border/60 text-xs font-bold text-foreground transition-all hover:scale-105 active:scale-95"
              >
                <ListPlus className="w-3.5 h-3.5 text-primary" />
                <span>Listen as Audio</span>
              </button>

              {/* Download 4K Video */}
              <button
                type="button"
                onClick={() =>
                  handleDownloadVideo(activeVideo.id, activeVideo.title, activeVideo.artist, false)
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-border/60 text-xs font-bold text-foreground transition-all hover:scale-105 active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download Video</span>
              </button>

              {/* Download 320k MP3 */}
              <button
                type="button"
                onClick={() =>
                  handleDownloadVideo(activeVideo.id, activeVideo.title, activeVideo.artist, true)
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-border/60 text-xs font-bold text-foreground transition-all hover:scale-105 active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-pink-400" />
                <span>Download MP3</span>
              </button>

              {/* Watch on YouTube (Direct official link) */}
              <a
                href={`https://www.youtube.com/watch?v=${activeVideo.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-border/60 text-xs font-bold text-foreground-muted hover:text-foreground transition-all hover:scale-105 active:scale-95"
                title="Open in YouTube"
              >
                <ExternalLink className="w-3.5 h-3.5 text-red-500" />
                <span>Watch on YouTube</span>
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Welcome Placeholder when no video is playing */
        <div className="bg-gradient-to-r from-surface via-surface-elevated/40 to-surface border border-border rounded-3xl p-8 shadow-xl text-center flex flex-col items-center justify-center gap-3 animate-fadeIn">
          <div className="w-14 h-14 rounded-3xl bg-red-600/10 text-red-500 border border-red-500/20 flex items-center justify-center shadow-lg">
            <YouTubeIcon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Ready to Watch</h2>
          <p className="text-xs text-foreground-muted max-w-md">
            Paste any YouTube video link in the bar above, search for any video below, or click any video card to start playing.
          </p>
        </div>
      )}

      {/* Search Any YouTube Video Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-red-500" />
            <h3 className="text-xl font-bold text-foreground">Search Any YouTube Video</h3>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tutorials, live streams, music videos, podcasts..."
              className="w-full bg-surface border border-border focus:border-red-500 text-foreground placeholder:text-foreground-subtle text-xs rounded-2xl pl-11 pr-4 py-3 outline-none transition-all shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={searchLoading || !searchQuery.trim()}
            className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/25 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
          >
            {searchLoading ? 'Searching...' : 'Search Videos'}
          </button>
        </form>

        {/* Search Results Grid */}
        {searchResults.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
            {searchResults.map((video, idx) => (
              <div
                key={video.id || idx}
                onClick={() => handleSelectVideo(video)}
                className="bg-surface border border-border hover:border-red-500/50 rounded-2xl p-3 cursor-pointer group transition-all hover:-translate-y-1 shadow-md flex flex-col justify-between"
              >
                <div className="relative aspect-video rounded-xl overflow-hidden bg-surface-elevated mb-2.5">
                  <img
                    src={video.thumbnail || `https://i.ytimg.com/vi/${video.videoId || video.id}/hqdefault.jpg`}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                  {video.duration && (
                    <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                      {video.duration}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-xs text-foreground line-clamp-2 group-hover:text-red-500 transition-colors">
                    {video.title}
                  </h4>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-foreground-muted">
                    <span className="truncate">{video.artist || (video as any).uploader || 'YouTube Video'}</span>
                    {(video as any).views && (
                      <span className="shrink-0 font-medium text-foreground-subtle ml-1">
                        {(video as any).views}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trending YouTube Videos Section (India / Hindi default) */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-500" />
            <h3 className="text-xl font-bold text-foreground">Trending YouTube Videos</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600/15 text-red-500 border border-red-500/30">
              India (Hindi) Default
            </span>
          </div>

          {/* Region & Language Filter Chips */}
          <div className="flex items-center gap-1 p-1 bg-surface-elevated/70 border border-border/80 rounded-xl overflow-x-auto">
            {[
              { id: 'IN', label: '🇮🇳 India (Hindi)' },
              { id: 'bollywood', label: 'Bollywood & Hindi Pop' },
              { id: 'punjabi', label: 'Punjabi Hits' },
              { id: 'US', label: 'Global / US' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => loadTrending(tab.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  trendingCategory === tab.id
                    ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-foreground-muted">
            <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold">Loading trending videos...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {trendingVideos.map((video, idx) => (
              <div
                key={video.id || idx}
                onClick={() => handleSelectVideo(video)}
                className="bg-surface border border-border hover:border-red-500/50 rounded-2xl p-3 cursor-pointer group transition-all hover:-translate-y-1 shadow-md flex flex-col justify-between"
              >
                <div className="relative aspect-video rounded-xl overflow-hidden bg-surface-elevated mb-2.5">
                  <img
                    src={video.thumbnail}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                  {video.duration && (
                    <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                      {video.duration}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-xs text-foreground line-clamp-2 group-hover:text-red-500 transition-colors">
                    {video.title}
                  </h4>
                  <p className="text-[11px] text-foreground-muted truncate mt-1">{video.artist}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
