import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronDown,
  Check,
  Tv,
  ShieldCheck,
  MoreVertical,
  ThumbsUp,
  Share2,
  Music,
  CheckCircle2,
  Sparkles,
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuVideo, setMobileMenuVideo] = useState<Track | null>(null);
  const [likedVideos, setLikedVideos] = useState<Record<string, boolean>>({});
  const [subscribedChannels, setSubscribedChannels] = useState<Record<string, boolean>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const {
    activeVideo,
    isPiP,
    isFullscreen,
    videoQuality,
    setVideoQuality,
    useDirectVideo,
    toggleDirectVideo,
    playVideo,
    closeVideo,
    togglePiP,
    setPiP,
    setIsFullscreen,
    reloadVideo,
    restoreCinema,
  } = useVideoStore();

  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number; width: number } | null>(null);
  const qualityMenuRef = useRef<HTMLDivElement | null>(null);
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);

  const toggleQualityMenu = () => {
    if (!qualityMenuOpen && qualityMenuRef.current) {
      const rect = qualityMenuRef.current.getBoundingClientRect();
      setDropdownPos({
        top: Math.round(rect.bottom + 6),
        right: Math.round(window.innerWidth - rect.right),
        width: 260,
      });
      setQualityMenuOpen(true);
    } else {
      setQualityMenuOpen(false);
    }
  };

  useEffect(() => {
    if (!qualityMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        qualityMenuRef.current &&
        !qualityMenuRef.current.contains(target) &&
        dropdownMenuRef.current &&
        !dropdownMenuRef.current.contains(target)
      ) {
        setQualityMenuOpen(false);
      }
    };
    const handleScrollOrResize = () => {
      setQualityMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [qualityMenuOpen]);

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
      // Fallback
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
    const currentList = searchResults.length > 0 ? searchResults : trendingVideos;
    const queue = currentList.map((t) => ({
      id: t.videoId || t.id,
      title: t.title,
      artist: t.artist || 'YouTube',
      thumbnail: t.thumbnail,
    }));

    playVideo(
      {
        id,
        title: video.title,
        artist: video.artist || 'YouTube',
        thumbnail: video.thumbnail,
      },
      queue
    );
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

  const handleListenAsAudio = (track?: { id: string; title: string; artist: string; thumbnail?: string }) => {
    const cur = track || activeVideo;
    if (!cur) return;
    if (!track) closeVideo();
    playTrack({
      id: cur.id,
      videoId: cur.id,
      title: cur.title,
      artist: cur.artist || 'YouTube',
      thumbnail: cur.thumbnail || `https://i.ytimg.com/vi/${cur.id}/hqdefault.jpg`,
      duration: '0:00',
      durationSeconds: 0,
    });
  };

  const handleShareVideo = (id: string) => {
    const url = `https://www.youtube.com/watch?v=${id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2000);
      });
    }
  };

  const displayedVideos = searchResults.length > 0 ? searchResults : trendingVideos;

  return (
    <div className="min-h-screen text-foreground pb-44 md:pb-32">
      {/* Toast Notification */}
      {copiedToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>Link copied to clipboard!</span>
        </div>
      )}

      {/* ========================================================== */}
      {/* 📱 MOBILE VIEW (< 768px): AUTHENTIC YOUTUBE APP EXPERIENCE */}
      {/* ========================================================== */}
      <div className="block md:hidden">
        {/* Mobile YouTube Top App Bar (When no video is sticky or when browsing) */}
        <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-md border-b border-white/10 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => { setSearchResults([]); setSearchQuery(''); }}>
            <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-md">
              <YouTubeIcon className="w-4 h-4" />
            </div>
            <span className="text-[17px] font-black tracking-tighter text-white">YouTube</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="p-2 rounded-full hover:bg-white/10 text-white/90 active:scale-95 transition-all"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={handlePaste}
              className="p-2 rounded-full hover:bg-white/10 text-white/90 active:scale-95 transition-all"
              title="Paste YouTube link"
            >
              <Clipboard className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mobile Expandable Search Bar */}
        {mobileSearchOpen && (
          <form onSubmit={handleSearch} className="p-3 bg-[#18181b] border-b border-white/10 flex gap-2 animate-fadeIn">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search YouTube videos, songs..."
                className="w-full bg-[#27272a] text-white placeholder:text-white/40 text-xs rounded-full pl-9 pr-3 py-2 outline-none focus:ring-1 focus:ring-red-500"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-full shrink-0"
            >
              Search
            </button>
          </form>
        )}

        {/* Mobile Horizontal Category Filter Chips */}
        <div className="px-4 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none bg-[#0f0f0f] border-b border-white/5">
          {[
            { id: 'IN', label: 'All / India' },
            { id: 'bollywood', label: 'Bollywood' },
            { id: 'punjabi', label: 'Punjabi' },
            { id: 'US', label: 'Global Hits' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSearchResults([]);
                loadTrending(cat.id as any);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                trendingCategory === cat.id && searchResults.length === 0
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'bg-white/10 text-white/80 hover:bg-white/15'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Mobile Active Video Watch Deck (Sticky at Top) */}
        {activeVideo && (
          <div className="sticky top-0 z-50 bg-[#0f0f0f] shadow-2xl border-b border-white/10">
            {/* 16:9 Sticky Video Anchor */}
            <div
              ref={sentinelRef}
              id="youtube-cinema-anchor"
              className="relative w-full aspect-video bg-black overflow-hidden"
            >
              {isPiP && (
                <div
                  onClick={restoreCinema}
                  className="w-full h-full flex flex-col items-center justify-center bg-black/80 text-white gap-2 cursor-pointer"
                >
                  <PictureInPicture2 className="w-8 h-8 text-red-500 animate-pulse" />
                  <span className="text-xs font-bold">Tap to Restore Full Video</span>
                </div>
              )}
            </div>

            {/* Mobile Video Info & Actions */}
            <div className="p-3.5 space-y-3 bg-[#0f0f0f]">
              {/* Title & Close */}
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[15px] font-bold text-white line-clamp-2 leading-snug">
                  {activeVideo.title}
                </h2>
                <button
                  onClick={closeVideo}
                  className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Channel Row & Subscribe Button */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-red-600 to-red-400 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                    {activeVideo.artist ? activeVideo.artist.charAt(0).toUpperCase() : 'Y'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{activeVideo.artist || 'YouTube Official'}</p>
                    <p className="text-[10px] text-white/60">Official Artist Channel</p>
                  </div>
                </div>

                <button
                  onClick={() =>
                    setSubscribedChannels((prev) => ({
                      ...prev,
                      [activeVideo.artist]: !prev[activeVideo.artist],
                    }))
                  }
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    subscribedChannels[activeVideo.artist]
                      ? 'bg-white/15 text-white'
                      : 'bg-white text-black hover:bg-white/90 active:scale-95'
                  }`}
                >
                  {subscribedChannels[activeVideo.artist] ? 'Subscribed' : 'Subscribe'}
                </button>
              </div>

              {/* YouTube Native Horizontal Action Pills */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-1 pb-1">
                {/* Like Button */}
                <button
                  onClick={() =>
                    setLikedVideos((prev) => ({ ...prev, [activeVideo.id]: !prev[activeVideo.id] }))
                  }
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    likedVideos[activeVideo.id]
                      ? 'bg-white text-black font-bold'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${likedVideos[activeVideo.id] ? 'fill-current' : ''}`} />
                  <span>{likedVideos[activeVideo.id] ? 'Liked' : 'Like'}</span>
                </button>

                {/* Share Button */}
                <button
                  onClick={() => handleShareVideo(activeVideo.id)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold whitespace-nowrap"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>

                {/* Listen as Audio */}
                <button
                  onClick={() => handleListenAsAudio()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-semibold whitespace-nowrap"
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>Listen Audio</span>
                </button>

                {/* Download Video */}
                <button
                  onClick={() =>
                    handleDownloadVideo(activeVideo.id, activeVideo.title, activeVideo.artist, false)
                  }
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download MP4</span>
                </button>

                {/* Download MP3 */}
                <button
                  onClick={() =>
                    handleDownloadVideo(activeVideo.id, activeVideo.title, activeVideo.artist, true)
                  }
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-pink-400" />
                  <span>Download MP3</span>
                </button>

                {/* Direct Video Bypass Toggle */}
                <button
                  onClick={toggleDirectVideo}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${
                    useDirectVideo
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-white/10 text-white border-transparent'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{useDirectVideo ? 'Direct Active' : 'Bypass Error'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Native Video Feed (Full Width 16:9 Edge-to-Edge Cards) */}
        <div className="divide-y divide-white/5">
          {displayedVideos.map((video, idx) => {
            const vidId = video.videoId || video.id;
            const thumb = video.thumbnail || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;
            const duration = video.duration || 'Video';
            const channelName = video.artist || (video as any).uploader || 'YouTube Official';

            return (
              <div key={vidId || idx} className="pb-4 pt-2">
                {/* 16:9 Full Bleed Thumbnail */}
                <div
                  className="relative aspect-video w-full bg-[#18181b] overflow-hidden cursor-pointer"
                  onClick={() => handleSelectVideo(video)}
                >
                  <img
                    src={thumb}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold font-mono px-1.5 py-0.5 rounded shadow">
                    {duration}
                  </div>
                </div>

                {/* Metadata Row below Thumbnail (Avatar + Title + Channel + 3-Dot Menu) */}
                <div className="px-3.5 pt-3 flex items-start gap-3">
                  {/* Channel Avatar */}
                  <div
                    className="w-9 h-9 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow mt-0.5"
                    onClick={() => handleSelectVideo(video)}
                  >
                    {channelName.charAt(0).toUpperCase()}
                  </div>

                  {/* Title & Info */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleSelectVideo(video)}>
                    <h3 className="text-[14px] font-semibold text-white line-clamp-2 leading-snug tracking-tight">
                      {video.title}
                    </h3>
                    <p className="text-[12px] text-zinc-400 mt-0.5 truncate">
                      {channelName} · {duration}
                    </p>
                  </div>

                  {/* 3-Dot Action Menu Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMobileMenuVideo(video);
                    }}
                    className="p-2 -mr-1 text-zinc-400 hover:text-white active:scale-90 transition-all shrink-0"
                    title="Options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile 3-Dot Action Bottom Sheet */}
        {mobileMenuVideo && (
          <div className="fixed inset-0 z-[600] flex flex-col justify-end">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fadeIn"
              onClick={() => setMobileMenuVideo(null)}
            />
            <div className="relative bg-[#1c1c1e] border-t border-white/15 rounded-t-[28px] p-5 shadow-2xl z-10 space-y-3 animate-slideUp max-h-[80vh] overflow-y-auto">
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-2" />

              {/* Video Preview */}
              <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                <img
                  src={
                    mobileMenuVideo.thumbnail ||
                    `https://i.ytimg.com/vi/${mobileMenuVideo.videoId || mobileMenuVideo.id}/hqdefault.jpg`
                  }
                  alt=""
                  className="w-16 h-10 object-cover rounded-lg shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white line-clamp-1">{mobileMenuVideo.title}</h4>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">{mobileMenuVideo.artist || 'YouTube'}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-1 text-sm font-semibold">
                <button
                  onClick={() => {
                    handleSelectVideo(mobileMenuVideo);
                    setMobileMenuVideo(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 text-white transition-colors"
                >
                  <Play className="w-4 h-4 text-red-500 fill-current" />
                  <span>Play Video Now</span>
                </button>

                <button
                  onClick={() => {
                    handleListenAsAudio(mobileMenuVideo);
                    setMobileMenuVideo(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 text-white transition-colors"
                >
                  <Music className="w-4 h-4 text-primary" />
                  <span>Listen as Audio (Music Mode)</span>
                </button>

                <button
                  onClick={() => {
                    handleDownloadVideo(
                      mobileMenuVideo.videoId || mobileMenuVideo.id,
                      mobileMenuVideo.title,
                      mobileMenuVideo.artist,
                      false
                    );
                    setMobileMenuVideo(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 text-white transition-colors"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Download Video (1080p MP4)</span>
                </button>

                <button
                  onClick={() => {
                    handleDownloadVideo(
                      mobileMenuVideo.videoId || mobileMenuVideo.id,
                      mobileMenuVideo.title,
                      mobileMenuVideo.artist,
                      true
                    );
                    setMobileMenuVideo(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 text-white transition-colors"
                >
                  <Download className="w-4 h-4 text-pink-400" />
                  <span>Download Audio (320k MP3)</span>
                </button>

                <button
                  onClick={() => {
                    handleShareVideo(mobileMenuVideo.videoId || mobileMenuVideo.id);
                    setMobileMenuVideo(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 text-white transition-colors"
                >
                  <Share2 className="w-4 h-4 text-zinc-300" />
                  <span>Copy YouTube Link</span>
                </button>
              </div>

              <button
                onClick={() => setMobileMenuVideo(null)}
                className="w-full py-3 mt-2 rounded-2xl bg-white/10 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================== */}
      {/* 💻 DESKTOP VIEW (>= 768px): FULL YOUTUBE WEB CINEMA LAYOUT */}
      {/* ========================================================== */}
      <div className="hidden md:block p-6 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto">
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

        {/* Main Theater Player Section (Desktop) */}
        {activeVideo ? (
          <div className="bg-surface border border-border rounded-3xl p-5 shadow-2xl space-y-4 animate-fadeIn relative">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-red-500 flex items-center gap-1.5 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Now Playing
              </span>
              <div className="flex items-center gap-2">
                {/* Video Quality Dropdown */}
                <div className="relative z-30" ref={qualityMenuRef}>
                  <button
                    type="button"
                    onClick={toggleQualityMenu}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl transition-all border ${
                      qualityMenuOpen
                        ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30'
                        : 'bg-red-600/15 text-red-500 border-red-500/30 hover:bg-red-600/25'
                    }`}
                    title="Select Video Playback Quality (Default: 1080p Full HD)"
                  >
                    <Tv className="w-3.5 h-3.5 text-red-500" />
                    <span>
                      {videoQuality === 'hd2160'
                        ? '4K Ultra HD'
                        : videoQuality === 'hd1440'
                        ? '1440p QHD'
                        : videoQuality === 'hd720'
                        ? '720p HD'
                        : videoQuality === 'large'
                        ? '480p SD'
                        : videoQuality === 'medium'
                        ? '360p Data Saver'
                        : videoQuality === 'auto'
                        ? 'Auto Quality'
                        : '1080p Full HD'}
                    </span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${qualityMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {qualityMenuOpen && dropdownPos && createPortal(
                    <div
                      ref={dropdownMenuRef}
                      style={{
                        position: 'fixed',
                        top: `${dropdownPos.top}px`,
                        right: `${dropdownPos.right}px`,
                        width: `${dropdownPos.width}px`,
                        zIndex: 99999,
                        backgroundColor: 'var(--bg-surface)',
                      }}
                      className="bg-surface border-2 border-border/90 rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.65)] animate-fadeIn space-y-1 select-none"
                    >
                      <div className="px-3 py-2 border-b border-border/40 mb-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-foreground">Playback Quality</p>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
                            {videoQuality === 'hd2160' ? '4K' : videoQuality === 'hd1440' ? '1440p' : videoQuality === 'hd720' ? '720p' : videoQuality === 'large' ? '480p' : videoQuality === 'medium' ? '360p' : videoQuality === 'auto' ? 'Auto' : '1080p'}
                          </span>
                        </div>
                        <p className="text-[10px] text-foreground-muted">Default playback resolution</p>
                      </div>

                      <div className="space-y-0.5">
                        {[
                          { id: 'hd1080', label: '1080p Full HD', badge: 'Default', desc: 'Crisp 1080p high definition' },
                          { id: 'hd2160', label: '4K Ultra HD', badge: '2160p', desc: 'Highest 4K cinema resolution' },
                          { id: 'hd1440', label: '1440p Quad HD', badge: '2K', desc: 'Premium quad definition' },
                          { id: 'hd720', label: '720p HD', badge: '720p', desc: 'Smooth high definition' },
                          { id: 'large', label: '480p SD', badge: '480p', desc: 'Standard definition' },
                          { id: 'medium', label: '360p Data Saver', badge: 'Saver', desc: 'Lowest data usage' },
                          { id: 'auto', label: 'Auto (Adaptive)', badge: 'Auto', desc: 'Automatically matches network' },
                        ].map((q) => {
                          const isSelected = (videoQuality || 'hd1080') === q.id;
                          return (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => {
                                setVideoQuality(q.id);
                                setQualityMenuOpen(false);
                              }}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                                isSelected
                                  ? 'bg-red-600/20 text-red-400 font-bold border border-red-500/40'
                                  : 'hover:bg-surface-elevated text-foreground-muted hover:text-foreground border border-transparent'
                              }`}
                            >
                              <div>
                                <div className="text-xs font-semibold">{q.label}</div>
                                <div className="text-[10px] text-foreground-subtle leading-tight">{q.desc}</div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-surface-elevated text-foreground-subtle border border-border/40">
                                  {q.badge}
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>,
                    document.body
                  )}
                </div>

                {/* Direct Video Bypass Toggle Button */}
                <button
                  type="button"
                  onClick={toggleDirectVideo}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl transition-all border ${
                    useDirectVideo
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                      : 'text-foreground-muted hover:text-foreground hover:bg-surface-elevated border-border/50'
                  }`}
                  title={useDirectVideo ? 'Direct HTML5 Video Player Active (Bypasses Blocks)' : 'Switch to Direct Video Player (bypasses YouTube Error 150/152)'}
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${useDirectVideo ? 'text-white' : 'text-emerald-400'}`} />
                  <span>{useDirectVideo ? 'Direct Active' : 'Bypass Blocks'}</span>
                </button>

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

            {/* Cinema Screen Anchor for Persistent Video Player */}
            <div
              ref={sentinelRef}
              id="youtube-cinema-anchor"
              className="relative w-full aspect-video rounded-2xl max-h-[65vh] bg-black/40 overflow-hidden"
            >
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
                <button
                  type="button"
                  onClick={() => handleListenAsAudio()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-border/60 text-xs font-bold text-foreground transition-all hover:scale-105 active:scale-95"
                >
                  <ListPlus className="w-3.5 h-3.5 text-primary" />
                  <span>Listen as Audio</span>
                </button>

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

        {/* Search Any YouTube Video Section (Desktop) */}
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

          {/* Search Results Grid (Desktop) */}
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

        {/* Trending YouTube Videos Section (Desktop) */}
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
    </div>
  );
};
