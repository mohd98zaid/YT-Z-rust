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
  ThumbsDown,
  Share2,
  Music,
  CheckCircle2,
  Cast,
  Bell,
  Sparkles,
  CheckCircle,
  Expand,
} from 'lucide-react';
import { api } from '../services/api';
import { Track } from '../types';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useDownloadStore } from '../stores/useDownloadStore';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useVideoStore } from '../stores/useVideoStore';

// Authentic YouTube Wordmark Logo
const YouTubeLogo: React.FC<{ className?: string }> = ({ className = 'h-5' }) => (
  <div className="flex items-center gap-1.5 select-none cursor-pointer">
    <div className="w-7 h-5 rounded-[6px] bg-[#ff0000] flex items-center justify-center shadow-sm">
      <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5 ml-0.5">
        <path d="M8 5v14l11-7z" />
      </svg>
    </div>
    <span className="text-[18px] font-black tracking-[-0.05em] text-white font-sans">YouTube</span>
    <span className="text-[10px] text-[#aaaaaa] font-semibold -mt-2.5 ml-0.5">IN</span>
  </div>
);

// Authentic YouTube Shorts Logo
const ShortsIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="#ff0000" className={className}>
    <path d="M17.77 10.32l-1.2-.5a3.48 3.48 0 0 0-4.6-1.57l-.54.26a3.5 3.5 0 0 0-1.74 3.03v.2a3.49 3.49 0 0 0 1.57 2.92l.54.26-1.2.5A3.49 3.49 0 0 0 8.7 19.1l.54.26a3.5 3.5 0 0 0 4.6 1.57l.54-.26a3.5 3.5 0 0 0 1.74-3.03v-.2a3.49 3.49 0 0 0-1.57-2.92l-.54-.26 1.2-.5a3.49 3.49 0 0 0 2.56-4.63zm-7.77 4.18v-5l4.5 2.5-4.5 2.5z" />
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuVideo, setMobileMenuVideo] = useState<Track | null>(null);
  const [likedVideos, setLikedVideos] = useState<Record<string, boolean>>({});
  const [dislikedVideos, setDislikedVideos] = useState<Record<string, boolean>>({});
  const [subscribedChannels, setSubscribedChannels] = useState<Record<string, boolean>>({});
  const [trendingCategory, setTrendingCategory] = useState<string>('All');
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const {
    activeVideo,
    isPiP,
    isFullscreen,
    isTheaterMode,
    toggleTheaterMode,
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

  const { youtubeSearchQuery } = useNavigationStore();

  useEffect(() => {
    if (youtubeSearchQuery && youtubeSearchQuery.trim()) {
      setSearchQuery(youtubeSearchQuery);
      setSearchLoading(true);
      api.searchYouTubeVideos(youtubeSearchQuery).then((res) => {
        setSearchResults(res || []);
        setSearchLoading(false);
      }).catch(() => setSearchLoading(false));
    }
  }, [youtubeSearchQuery]);

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

  // Load Trending YouTube Videos
  const loadTrending = async (category: string = 'All') => {
    setLoading(true);
    setTrendingCategory(category);
    try {
      if (category === 'All' || category === 'IN') {
        const charts = await api.getCharts('IN');
        if (charts && charts.videos && charts.videos.length > 0) {
          setTrendingVideos(charts.videos);
        }
      } else if (category === 'US') {
        const charts = await api.getCharts('US');
        if (charts && charts.videos && charts.videos.length > 0) {
          setTrendingVideos(charts.videos);
        }
      } else if (category === 'Bollywood') {
        const results = await api.searchYouTubeVideos('Hindi Bollywood official video new song', 20);
        setTrendingVideos(results || []);
      } else if (category === 'Punjabi') {
        const results = await api.searchYouTubeVideos('Punjabi official video new song', 20);
        setTrendingVideos(results || []);
      } else if (category === 'Gaming') {
        const results = await api.searchYouTubeVideos('Trending Gaming gameplay highlights', 20);
        setTrendingVideos(results || []);
      } else if (category === 'Podcasts') {
        const results = await api.searchYouTubeVideos('Popular podcast episodes full interview', 20);
        setTrendingVideos(results || []);
      } else if (category === 'Live') {
        const results = await api.searchYouTubeVideos('Live music concert stream 4K', 20);
        setTrendingVideos(results || []);
      } else {
        const results = await api.searchYouTubeVideos(`${category} official video trending`, 20);
        setTrendingVideos(results || []);
      }
    } catch (err) {
      console.error('Failed to load trending videos', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrending('All');
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      showToast('Please enter a valid YouTube video link');
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
          showToast('Loaded YouTube Video from clipboard!');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } catch {
      showToast('Clipboard access unavailable');
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

  useEffect(() => {
    if (activeVideo) {
      const mainEl = document.getElementById('main-content') || document.querySelector('main');
      if (mainEl) {
        mainEl.scrollTo({ top: 0, behavior: 'instant' });
      }
      const timer = setTimeout(() => {
        if (mainEl) mainEl.scrollTop = 0;
        sentinelRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeVideo?.id]);

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

    const mainEl = document.getElementById('main-content') || document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'instant' });
    }
    requestAnimationFrame(() => {
      if (mainEl) mainEl.scrollTop = 0;
      sentinelRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
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
    showToast(isAudio ? 'Added to MP3 audio download queue!' : 'Added to 1080p MP4 download queue!');
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
    showToast('Playing in Background Audio Mode');
  };

  const handleShareVideo = (id: string) => {
    const url = `https://www.youtube.com/watch?v=${id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('YouTube link copied to clipboard!');
      });
    }
  };

  const displayedVideos = searchResults.length > 0 ? searchResults : trendingVideos;

  // Shorts shelf items extracted from trending videos
  const shortsItems = displayedVideos.slice(0, 6).map((item, i) => ({
    ...item,
    mockViews: `${(1.2 + (i * 0.7)).toFixed(1)}M views`,
  }));

  const categoryPills = [
    'All',
    'Music',
    'Bollywood',
    'Punjabi',
    'Live',
    'Gaming',
    'Podcasts',
    'Mixes',
  ];

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white selection:bg-red-600 selection:text-white pb-48 md:pb-36">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 bg-[#212121] text-white text-xs font-semibold rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-white/10 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-red-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📱 TOP BAR (MOBILE VIEW < 768px - AS SEEN IN SAMSUNG S24 SCREENSHOT 1) */}
      {/* ========================================================================= */}
      {!activeVideo && (
        <div className="block md:hidden sticky top-0 z-30 bg-[#0f0f0f]/95 backdrop-blur-md border-b border-white/10">
          <div className="px-4 py-2.5 flex items-center justify-between">
            <div
              onClick={() => {
                setSearchResults([]);
                setSearchQuery('');
                loadTrending('All');
              }}
            >
              <YouTubeLogo />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => showToast('Cast to TV device search initiated')}
                className="p-2 rounded-full hover:bg-white/10 text-white active:scale-95 transition-all"
                title="Cast to Device"
              >
                <Cast className="w-5 h-5 text-white/90" />
              </button>
              <button
                onClick={() => showToast('No new notifications')}
                className="p-2 rounded-full hover:bg-white/10 text-white active:scale-95 transition-all relative"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-white/90" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600" />
              </button>
              <button
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                className="p-2 rounded-full hover:bg-white/10 text-white active:scale-95 transition-all"
                title="Search"
              >
                <Search className="w-5 h-5 text-white/90" />
              </button>
              <button
                onClick={handlePaste}
                className="p-2 rounded-full hover:bg-white/10 text-white active:scale-95 transition-all"
                title="Paste YouTube link"
              >
                <Clipboard className="w-5 h-5 text-white/90" />
              </button>
            </div>
          </div>

          {/* Mobile Search Expandable Input */}
          {mobileSearchOpen && (
            <form onSubmit={handleSearch} className="px-3 pb-3 flex gap-2 animate-fadeIn">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search YouTube"
                  className="w-full bg-[#222222] text-white placeholder:text-white/40 text-xs rounded-full pl-9 pr-3 py-2 outline-none focus:ring-1 focus:ring-red-500"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#ff0000] text-white text-xs font-bold rounded-full shrink-0"
              >
                Search
              </button>
            </form>
          )}

          {/* Mobile Category Filter Pills Bar */}
          <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none border-t border-white/5">
            {categoryPills.map((cat) => {
              const isSelected = trendingCategory === cat && searchResults.length === 0;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSearchResults([]);
                    loadTrending(cat);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'bg-[#272727] text-white hover:bg-[#3f3f3f]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 💻 TOP BAR (DESKTOP VIEW >= 768px - AS SEEN IN YOUTUBE WEB SCREENSHOT 2)  */}
      {/* ========================================================================= */}
      <div className="hidden md:block sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-md border-b border-[#272727] px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          {/* Left: YouTube Logo */}
          <div
            onClick={() => {
              setSearchResults([]);
              setSearchQuery('');
              loadTrending('All');
            }}
          >
            <YouTubeLogo />
          </div>

          {/* Center: Authentic YouTube Web Pill Search Bar */}
          <form onSubmit={handleSearch} className="flex items-center flex-1 max-w-2xl">
            <div className="flex items-center flex-1 bg-[#121212] border border-[#303030] focus-within:border-[#1c62b9] rounded-l-full px-4 py-2 shadow-inner transition-colors">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full bg-transparent text-white text-sm outline-none placeholder-[#888888]"
              />
            </div>
            <button
              type="submit"
              className="bg-[#222222] hover:bg-[#272727] border border-l-0 border-[#303030] rounded-r-full px-6 py-2 text-[#f1f1f1] transition-colors"
              title="Search"
            >
              <Search className="w-5 h-5 text-[#f1f1f1]" />
            </button>
          </form>

          {/* Right: Quick Paste Link Bar */}
          <form onSubmit={handlePlayUrl} className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste YouTube Link or ID..."
                className="bg-[#222222] border border-[#303030] focus:border-red-500 text-white placeholder-[#888888] text-xs rounded-full pl-4 pr-9 py-2 outline-none w-56 transition-all"
              />
              <button
                type="button"
                onClick={handlePaste}
                title="Paste from Clipboard"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#888888] hover:text-white"
              >
                <Clipboard className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shrink-0"
            >
              Play
            </button>
          </form>
        </div>

        {/* Desktop Filter Pills Row (Hidden when watching video to save vertical space) */}
        {!activeVideo && (
          <div className="max-w-7xl mx-auto flex items-center gap-2.5 overflow-x-auto scrollbar-none pt-3">
            {categoryPills.map((cat) => {
              const isSelected = trendingCategory === cat && searchResults.length === 0;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSearchResults([]);
                    loadTrending(cat);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'bg-[#272727] text-white hover:bg-[#3f3f3f]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 🎬 ACTIVE WATCH PAGE (SHARED RESPONSIVE: STICKY MOBILE + 2-COL DESKTOP)    */}
      {/* ========================================================================= */}
      {activeVideo && (
        <div className="w-full bg-[#0f0f0f] border-b border-white/10 md:border-none pb-6">
          <div className={`flex flex-col ${isTheaterMode ? 'w-full max-w-7xl mx-auto space-y-6 md:p-6 lg:p-8' : 'lg:grid lg:grid-cols-3 lg:gap-6 max-w-7xl mx-auto md:p-6 lg:p-8'}`}>
            {/* Left / Main Watch Deck */}
            <div className={isTheaterMode ? "w-full space-y-3.5" : "lg:col-span-2 space-y-3.5"}>
              {/* Single Video Anchor */}
              <div
                ref={sentinelRef}
                id="youtube-cinema-anchor"
                className="sticky top-0 md:static z-20 relative w-full aspect-video bg-black overflow-hidden shadow-2xl rounded-none md:rounded-2xl max-h-[52vh]"
              >
                {isPiP && (
                  <div
                    onClick={restoreCinema}
                    className="w-full h-full flex flex-col items-center justify-center bg-black/85 text-white gap-2 cursor-pointer select-none"
                  >
                    <PictureInPicture2 className="w-8 h-8 text-red-500 animate-pulse" />
                    <span className="text-xs font-bold">Video playing in Sidebar PiP · Click to restore</span>
                  </div>
                )}
              </div>

              {/* Title & Metadata */}
              <div className="px-4 md:px-0 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-base sm:text-lg md:text-xl font-bold text-white leading-snug line-clamp-2">
                    {activeVideo.title}
                  </h1>
                  <button
                    onClick={closeVideo}
                    className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white shrink-0"
                    title="Close Video"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Channel Row & Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-b border-white/10 pb-3">
                  {/* Channel Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
                      {activeVideo.artist ? activeVideo.artist.charAt(0).toUpperCase() : 'Y'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-white truncate">{activeVideo.artist || 'YouTube Official'}</p>
                        <CheckCircle className="w-3.5 h-3.5 text-[#aaaaaa] shrink-0" />
                      </div>
                      <p className="text-xs text-[#aaaaaa]">14.2M subscribers</p>
                    </div>

                    <button
                      onClick={() => {
                        const channel = activeVideo.artist || 'YouTube';
                        setSubscribedChannels((prev) => {
                          const state = !prev[channel];
                          showToast(state ? `Subscribed to ${channel}` : `Unsubscribed from ${channel}`);
                          return { ...prev, [channel]: state };
                        });
                      }}
                      className={`ml-2 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                        subscribedChannels[activeVideo.artist || 'YouTube']
                          ? 'bg-[#272727] text-white hover:bg-[#3f3f3f]'
                          : 'bg-white text-black hover:bg-white/90 active:scale-95'
                      }`}
                    >
                      {subscribedChannels[activeVideo.artist || 'YouTube'] ? 'Subscribed' : 'Subscribe'}
                    </button>
                  </div>

                  {/* YouTube Action Buttons (Quality, Like/Dislike, Share, Audio, Download, Bypass, Theater) */}
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                    {/* Prominent Video Quality Selector Pill */}
                    <div className="relative" ref={qualityMenuRef}>
                      <button
                        onClick={toggleQualityMenu}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 text-xs font-bold whitespace-nowrap shadow-sm transition-all"
                        title="Change Playback Resolution (4K, 1440p, 1080p, 720p, etc.)"
                      >
                        <Tv className="w-3.5 h-3.5 text-red-500" />
                        <span>{videoQuality === 'hd2160' ? '4K Ultra' : videoQuality === 'hd1440' ? '1440p 2K' : videoQuality === 'hd720' ? '720p HD' : videoQuality === 'large' ? '480p' : videoQuality === 'medium' ? '360p' : videoQuality === 'auto' ? 'Auto' : '1080p HD'}</span>
                        <ChevronDown className="w-3 h-3" />
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
                          }}
                          className="liquid-glass-card border border-white/20 rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-fadeIn space-y-1 select-none text-white"
                        >
                          <div className="px-3 py-1.5 border-b border-white/10 text-xs font-bold text-white">
                            Select Quality
                          </div>
                          {[
                            { id: 'hd2160', label: '2160p 4K Ultra HD' },
                            { id: 'hd1440', label: '1440p Quad HD' },
                            { id: 'hd1080', label: '1080p Full HD (Default)' },
                            { id: 'hd720', label: '720p High Definition' },
                            { id: 'medium', label: '360p Data Saver' },
                            { id: 'auto', label: 'Auto (Adaptive)' },
                          ].map((q) => (
                            <button
                              key={q.id}
                              onClick={() => {
                                setVideoQuality(q.id);
                                setQualityMenuOpen(false);
                                showToast(`Video quality set to ${q.label}`);
                              }}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                                videoQuality === q.id ? 'bg-red-600 text-white' : 'hover:bg-white/10 text-white/80'
                              }`}
                            >
                              <span>{q.label}</span>
                              {videoQuality === q.id && <Check className="w-3.5 h-3.5" />}
                            </button>
                          ))}
                        </div>,
                        document.body
                      )}
                    </div>

                    {/* Theater Mode Button */}
                    <button
                      onClick={toggleTheaterMode}
                      className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                        isTheaterMode
                          ? 'bg-red-600 text-white font-bold'
                          : 'bg-[#272727] hover:bg-[#3f3f3f] text-white'
                      }`}
                      title={isTheaterMode ? "Default View (2 Columns)" : "Theater Mode (Wide Video)"}
                    >
                      <Expand className="w-3.5 h-3.5" />
                      <span>{isTheaterMode ? "Standard" : "Theater"}</span>
                    </button>

                    {/* Like / Dislike joined pill */}
                    <div className="flex items-center bg-[#272727] rounded-full divide-x divide-white/10">
                      <button
                        onClick={() => {
                          setLikedVideos((prev) => {
                            const cur = !prev[activeVideo.id];
                            if (cur) setDislikedVideos((d) => ({ ...d, [activeVideo.id]: false }));
                            return { ...prev, [activeVideo.id]: cur };
                          });
                        }}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-l-full hover:bg-white/10 transition-colors ${
                          likedVideos[activeVideo.id] ? 'text-white font-bold' : 'text-white/80'
                        }`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${likedVideos[activeVideo.id] ? 'fill-current text-white' : ''}`} />
                        <span>{likedVideos[activeVideo.id] ? '142K' : '141K'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setDislikedVideos((prev) => {
                            const cur = !prev[activeVideo.id];
                            if (cur) setLikedVideos((l) => ({ ...l, [activeVideo.id]: false }));
                            return { ...prev, [activeVideo.id]: cur };
                          });
                        }}
                        className="px-3 py-1.5 text-xs text-white/80 rounded-r-full hover:bg-white/10 transition-colors"
                        title="Dislike"
                      >
                        <ThumbsDown className={`w-3.5 h-3.5 ${dislikedVideos[activeVideo.id] ? 'fill-current text-white' : ''}`} />
                      </button>
                    </div>

                    {/* Share */}
                    <button
                      onClick={() => handleShareVideo(activeVideo.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#272727] hover:bg-[#3f3f3f] text-white text-xs font-semibold whitespace-nowrap transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>

                    {/* Listen as Audio */}
                    <button
                      onClick={() => handleListenAsAudio()}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 text-xs font-semibold whitespace-nowrap transition-colors"
                      title="Convert directly to audio and play in background"
                    >
                      <Music className="w-3.5 h-3.5" />
                      <span>Audio Mode</span>
                    </button>

                    {/* Download MP4 */}
                    <button
                      onClick={() => handleDownloadVideo(activeVideo.id, activeVideo.title, activeVideo.artist, false)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#272727] hover:bg-[#3f3f3f] text-white text-xs font-semibold whitespace-nowrap transition-colors"
                      title="Download full 1080p MP4 Video"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Download</span>
                    </button>

                    {/* Download MP3 */}
                    <button
                      onClick={() => handleDownloadVideo(activeVideo.id, activeVideo.title, activeVideo.artist, true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#272727] hover:bg-[#3f3f3f] text-white text-xs font-semibold whitespace-nowrap transition-colors"
                      title="Download 320k Audio MP3"
                    >
                      <Download className="w-3.5 h-3.5 text-pink-400" />
                      <span>MP3</span>
                    </button>

                    {/* Direct Video Bypass Toggle */}
                    <button
                      onClick={toggleDirectVideo}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${
                        useDirectVideo
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-[#272727] text-white border-transparent hover:bg-[#3f3f3f]'
                      }`}
                      title={useDirectVideo ? 'Direct HTML5 Video bypass active' : 'Switch to Direct Video bypass'}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{useDirectVideo ? 'Direct' : 'Bypass'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right / Below Watch Queue ("Up Next") */}
            <div className={isTheaterMode ? "w-full pt-4 border-t border-white/10 space-y-4" : "lg:col-span-1 px-4 md:px-0 space-y-3 pt-2 lg:pt-0"}>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <span>Up Next</span>
              </h3>

              <div className={isTheaterMode ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-3"}>
                {displayedVideos
                  .filter((v) => (v.videoId || v.id) !== activeVideo.id)
                  .slice(0, 16)
                  .map((video, idx) => {
                    const vidId = video.videoId || video.id;
                    const thumb = video.thumbnail || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;
                    const duration = video.duration || 'Video';
                    const author = video.artist || 'YouTube Official';

                    if (isTheaterMode) {
                      return (
                        <div
                          key={vidId || idx}
                          onClick={() => handleSelectVideo(video)}
                          className="group cursor-pointer select-none space-y-2"
                        >
                          <div className="relative aspect-video rounded-xl overflow-hidden bg-[#272727]">
                            <img src={thumb} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-mono px-1 py-0.2 rounded font-bold">
                              {duration}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                              {video.title}
                            </h4>
                            <p className="text-[11px] text-[#aaaaaa] mt-0.5 truncate">{author}</p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={vidId || idx}
                        onClick={() => handleSelectVideo(video)}
                        className="flex gap-2.5 group cursor-pointer hover:bg-white/5 p-1 rounded-xl transition-colors"
                      >
                        {/* Compact 16:9 Thumbnail */}
                        <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-[#272727] shrink-0">
                          <img
                            src={thumb}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-mono font-semibold px-1 py-0.2 rounded">
                            {duration}
                          </span>
                        </div>

                        {/* Text info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                            {video.title}
                          </h4>
                          <p className="text-[11px] text-[#aaaaaa] mt-1 truncate">{author}</p>
                          <p className="text-[10px] text-[#888888]">420K views</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📱 MOBILE FEED (SCREENSHOT 1: 16:9 FULL-BLEED CARDS + SHORTS SHELF)        */}
      {/* ========================================================================= */}
      <div className="block md:hidden">
        {/* First 2 Full-Bleed Video Cards */}
        {displayedVideos.slice(0, 2).map((video, idx) => (
          <MobileVideoCard
            key={video.id || idx}
            video={video}
            onSelect={() => handleSelectVideo(video)}
            onOpenMenu={() => setMobileMenuVideo(video)}
          />
        ))}

        {/* Authentic Mobile Shorts Shelf (As seen in Screenshot 1!) */}
        <div className="py-4 border-y border-white/10 bg-[#0f0f0f] space-y-3">
          <div className="px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShortsIcon className="w-5 h-5" />
              <span className="text-[17px] font-bold text-white tracking-tight">Shorts</span>
            </div>
          </div>

          <div className="px-4 flex items-center gap-3 overflow-x-auto scrollbar-none">
            {shortsItems.map((short, i) => {
              const sId = short.videoId || short.id;
              const sThumb = short.thumbnail || `https://i.ytimg.com/vi/${sId}/hqdefault.jpg`;
              return (
                <div
                  key={sId || i}
                  onClick={() => handleSelectVideo(short)}
                  className="relative w-36 aspect-[9/16] rounded-xl overflow-hidden bg-[#272727] shrink-0 cursor-pointer shadow-lg group active:scale-95 transition-all"
                >
                  <img
                    src={sThumb}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                  <div className="absolute bottom-2 left-2 right-2 space-y-0.5">
                    <p className="text-xs font-semibold text-white line-clamp-2 leading-snug drop-shadow-md">
                      {short.title}
                    </p>
                    <p className="text-[10px] text-white/70 font-medium">
                      {short.mockViews}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Remaining Full-Bleed Video Cards */}
        {displayedVideos.slice(2).map((video, idx) => (
          <MobileVideoCard
            key={video.id || idx}
            video={video}
            onSelect={() => handleSelectVideo(video)}
            onOpenMenu={() => setMobileMenuVideo(video)}
          />
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 💻 DESKTOP FEED (SCREENSHOT 2: 4-COLUMN RESPONSIVE YOUTUBE WEB GRID)       */}
      {/* ========================================================================= */}
      <div className="hidden md:block max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
        {/* Results / Category Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              {searchResults.length > 0 ? `Results for "${searchQuery}"` : `${trendingCategory} Videos`}
            </h2>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading || searchLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#aaaaaa]">
            <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold">Loading YouTube videos...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-8 gap-x-4">
            {displayedVideos.map((video, idx) => {
              const vidId = video.videoId || video.id;
              const thumb = video.thumbnail || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;
              const duration = video.duration || '12:45';
              const channelName = video.artist || (video as any).uploader || 'YouTube Official';

              return (
                <div
                  key={vidId || idx}
                  className="group flex flex-col cursor-pointer select-none"
                  onClick={() => handleSelectVideo(video)}
                >
                  {/* 16:9 Thumbnail with Rounded Corners & Duration Badge */}
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-[#272727] mb-3">
                    <img
                      src={thumb}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                    <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-semibold px-1.5 py-0.5 rounded font-mono shadow">
                      {duration}
                    </span>
                  </div>

                  {/* Metadata Row: 36px Avatar on Left, Details on Right */}
                  <div className="flex gap-3 items-start">
                    {/* Channel Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      {channelName.charAt(0).toUpperCase()}
                    </div>

                    {/* Details Column */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-semibold text-white line-clamp-2 leading-snug group-hover:text-white transition-colors">
                        {video.title}
                      </h3>
                      <div className="mt-1">
                        <p className="text-[13px] text-[#aaaaaa] hover:text-white transition-colors truncate">
                          {channelName}
                        </p>
                        <p className="text-[13px] text-[#aaaaaa] truncate mt-0.5">
                          2.4M views • 3 days ago
                        </p>
                      </div>
                    </div>

                    {/* 3-Dot Overflow Menu */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMobileMenuVideo(video);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#aaaaaa] hover:text-white transition-all shrink-0"
                      title="Options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Desktop Shorts Shelf (As in YouTube Web) */}
        <div className="pt-8 border-t border-[#272727] space-y-4">
          <div className="flex items-center gap-2">
            <ShortsIcon className="w-6 h-6" />
            <span className="text-xl font-bold text-white tracking-tight">Shorts</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {shortsItems.map((short, idx) => {
              const sId = short.videoId || short.id;
              const sThumb = short.thumbnail || `https://i.ytimg.com/vi/${sId}/hqdefault.jpg`;
              return (
                <div
                  key={sId || idx}
                  onClick={() => handleSelectVideo(short)}
                  className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-[#272727] cursor-pointer shadow-lg group hover:scale-[1.03] transition-all"
                >
                  <img
                    src={sThumb}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20" />
                  <div className="absolute bottom-3 left-3 right-3 space-y-1">
                    <p className="text-xs font-semibold text-white line-clamp-2 leading-snug drop-shadow-md">
                      {short.title}
                    </p>
                    <p className="text-[11px] text-white/70 font-medium">
                      {short.mockViews}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📋 MOBILE 3-DOT ACTION BOTTOM SHEET                                       */}
      {/* ========================================================================= */}
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
  );
};

// Sub-component for Mobile Video Cards (Screenshot 1 Authentic Design)
const MobileVideoCard: React.FC<{
  video: Track;
  onSelect: () => void;
  onOpenMenu: () => void;
}> = ({ video, onSelect, onOpenMenu }) => {
  const vidId = video.videoId || video.id;
  const thumb = video.thumbnail || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;
  const duration = video.duration || '12:45';
  const channelName = video.artist || (video as any).uploader || 'YouTube Official';

  return (
    <div className="pb-4 pt-1">
      {/* 16:9 Full-Bleed Thumbnail */}
      <div
        className="relative aspect-video w-full bg-[#18181b] overflow-hidden cursor-pointer"
        onClick={onSelect}
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

      {/* Metadata Row: 36px Avatar + 2-line Title + Channel Name · Views · Time + 3-Dot */}
      <div className="px-3.5 pt-3 flex items-start gap-3">
        {/* Channel Avatar */}
        <div
          className="w-9 h-9 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow mt-0.5 cursor-pointer"
          onClick={onSelect}
        >
          {channelName.charAt(0).toUpperCase()}
        </div>

        {/* Video Title & Meta */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
          <h3 className="text-[14px] font-semibold text-white line-clamp-2 leading-snug tracking-tight">
            {video.title}
          </h3>
          <p className="text-[12px] text-zinc-400 mt-0.5 truncate">
            {channelName} · 3.1M views · 2 days ago
          </p>
        </div>

        {/* 3-Dot Menu */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenMenu();
          }}
          className="p-2 -mr-1 text-zinc-400 hover:text-white active:scale-90 transition-all shrink-0"
          title="Options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
