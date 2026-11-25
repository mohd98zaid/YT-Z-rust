import React, { useEffect, useState, useRef } from 'react';
import { Play, Download, TrendingUp, Music, RefreshCw, MoreVertical, Ban, UserX, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { Track } from '../types';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useDownloadStore } from '../stores/useDownloadStore';
import { useHomeStore } from '../stores/useHomeStore';
import { useRecommendationStore } from '../stores/useRecommendationStore';

export const HomePage: React.FC = () => {
  const {
    sections,
    loading,
    isRefreshing,
    hasLoaded,
    quickPicksMood,
    loadHome,
    refreshQuickPicks,
    setQuickPicksMood,
  } = useHomeStore();

  const { playTrack } = usePlayerStore();
  const { queueDownload } = useDownloadStore();
  const { isBlocked, blockVideo, blockArtist, undoLastBlock } = useRecommendationStore();

  const [toast, setToast] = useState<{ message: string; onUndo?: () => void } | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const showToast = (message: string, onUndo?: () => void) => {
    setToast({ message, onUndo });
    setTimeout(() => setToast(null), onUndo ? 5000 : 2500);
  };

  // Close card context menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    if (activeMenuId) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [activeMenuId]);

  // Load once on start, preserves exact same feed across all page switches until explicit refresh
  useEffect(() => {
    loadHome(false);
  }, [loadHome]);

  const handleRefreshQuickPicks = (mood = quickPicksMood) => {
    refreshQuickPicks(mood);
  };

  const handleDownload = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    queueDownload({
      url: `https://www.youtube.com/watch?v=${track.videoId || track.id}`,
      download_type: 'audio',
      format: 'mp3',
      quality: '320',
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail,
    });
  };

  const handleBlockSong = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    const vId = item.id || item.videoId || item.browseId;
    blockVideo(vId, item.title);
    setActiveMenuId(null);
    showToast(`Removed "${item.title}" from recommendations`, () => undoLastBlock());
  };

  const handleBlockArtist = (e: React.MouseEvent, artistName: string) => {
    e.stopPropagation();
    if (!artistName) return;
    blockArtist(artistName);
    setActiveMenuId(null);
    showToast(`Will not recommend songs by "${artistName}"`, () => undoLastBlock());
  };

  // Filter out any blocked songs or artists and empty/corrupted items
  const filteredSections = sections
    .map((section) => ({
      ...section,
      items: (section.items || []).filter((item: any) => {
        if (!item || !(item.title || '').trim()) return false;
        const vId = item.id || item.videoId || item.browseId;
        const artist = item.artist || item.subtitle;
        return !isBlocked(vId, artist);
      }),
    }))
    .filter((section) => section.items.length > 0);

  if (loading && !hasLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-foreground-muted py-24">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold">Tuning into YouTube Music Feed...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 md:space-y-10 max-w-7xl mx-auto pb-40 md:pb-28 relative select-none">
      {/* Toast Notification with Undo */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 bg-[#212121]/95 backdrop-blur-md text-white text-xs font-semibold rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-white/15 flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
          <span className="truncate max-w-[280px] sm:max-w-md">{toast.message}</span>
          {toast.onUndo && (
            <button
              onClick={() => {
                toast.onUndo?.();
                setToast(null);
              }}
              className="px-2.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] transition-colors shrink-0 cursor-pointer"
            >
              Undo
            </button>
          )}
        </div>
      )}

      {/* Top Header Row with Listen Now & Refresh Button */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Listen Now
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Your personalized recommendations & quick picks
          </p>
        </div>
        <button
          onClick={() => loadHome(true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full liquid-glass-control text-xs font-bold transition-all active:scale-95 shadow-sm hover:scale-105 cursor-pointer"
          title="Refresh Home Feed from YouTube Music"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : 'text-primary'}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh Feed'}</span>
        </button>
      </div>

      {/* Dynamic Sections from YouTube Music */}
      {filteredSections.map((section, sIdx) => {
        const isQuickPicks = section.title.toLowerCase().includes('quick');
        return (
          <section key={sIdx} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground tracking-tight">{section.title}</h2>
                {isQuickPicks && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/15 text-primary border border-primary/25">
                    Dynamic
                  </span>
                )}
              </div>

              {isQuickPicks && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Mood Filter Pills for Quick Picks */}
                  <div className="flex items-center gap-1.5 p-1 liquid-glass rounded-full">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'trending', label: 'Trending' },
                      { id: 'chill', label: 'Chill' },
                      { id: 'upbeat', label: 'Upbeat' },
                      { id: 'romantic', label: 'Romance' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setQuickPicksMood(m.id);
                          handleRefreshQuickPicks(m.id);
                        }}
                        className={`px-3.5 py-1 rounded-full text-xs transition-all cursor-pointer ${
                          quickPicksMood === m.id
                            ? 'liquid-glass-pill-active'
                            : 'liquid-glass-pill-inactive'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Refresh Quick Picks Button */}
                  <button
                    onClick={() => handleRefreshQuickPicks(quickPicksMood)}
                    disabled={isRefreshing}
                    className="flex items-center gap-1.5 px-3.5 py-1 rounded-full liquid-glass-control text-xs font-bold text-foreground shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Refresh Quick picks with new fresh tracks"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        isRefreshing ? 'animate-spin text-primary' : 'text-primary'
                      }`}
                    />
                    <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {section.items.map((item: any, iIdx: number) => {
                const isSong = Boolean(item.videoId || item.duration);
                const itemKey = `${sIdx}-${iIdx}-${item.id || item.videoId || item.title}`;
                const isMenuOpen = activeMenuId === itemKey;
                const vId = item.videoId || item.id;
                const artistName = item.artist || item.subtitle || 'Artist';

                return (
                  <div
                    key={itemKey}
                    onClick={async () => {
                      if (isMenuOpen) {
                        setActiveMenuId(null);
                        return;
                      }
                      if (isSong) {
                        playTrack(item, section.items.filter((x: any) => x.videoId || x.duration));
                      } else if (item.id || item.browseId) {
                        const id = item.id || item.browseId;
                        try {
                          const isPl =
                            item.type === 'playlist' ||
                            id.startsWith('RDCL') ||
                            id.startsWith('PL') ||
                            id.startsWith('VL') ||
                            id.startsWith('RD');
                          let data = isPl ? await api.getPlaylist(id) : await api.getAlbum(id);
                          if (!data || !data.tracks || data.tracks.length === 0) {
                            data = isPl ? await api.getAlbum(id) : await api.getPlaylist(id);
                          }
                          if (data && data.tracks && data.tracks.length > 0) {
                            playTrack(data.tracks[0], data.tracks);
                          }
                        } catch (err) {
                          console.error('Failed to load playlist/album', err);
                        }
                      }
                    }}
                    className="group relative liquid-glass-card hover:border-white/30 rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
                  >
                    {/* Artwork Container */}
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-900 to-black mb-2.5 shadow-md flex items-center justify-center">
                      {/* Underneath fallback in case image fails */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 text-white/30 select-none">
                        <Music className="w-8 h-8 mb-1 opacity-40" />
                        <span className="text-[10px] truncate max-w-[90%] font-medium opacity-60">{item.title}</span>
                      </div>

                      {/* Cover Art Image */}
                      <img
                        src={
                          item.thumbnail && item.thumbnail !== '/placeholder.png'
                            ? item.thumbnail
                            : vId && typeof vId === 'string' && vId.length === 11
                            ? `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`
                            : ''
                        }
                        alt={item.title}
                        className="relative z-10 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (vId && typeof vId === 'string' && vId.length === 11 && !target.dataset.triedHq) {
                            target.dataset.triedHq = 'true';
                            target.src = `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;
                          } else {
                            target.style.display = 'none';
                          }
                        }}
                      />

                      {/* 3-Dots Context Menu Button (Don't Recommend) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : itemKey);
                        }}
                        className="absolute top-2 right-2 z-30 p-1.5 rounded-full bg-black/60 hover:bg-black/85 text-white/80 hover:text-white backdrop-blur-md transition-all shadow-md opacity-0 group-hover:opacity-100 sm:opacity-0 focus:opacity-100"
                        title="Options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Menu for "Don't Recommend" */}
                      {isMenuOpen && (
                        <div
                          ref={menuRef}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-10 right-2 z-40 w-52 p-1.5 rounded-2xl bg-[#1c1c1f]/95 backdrop-blur-2xl border border-white/20 shadow-2xl space-y-1 animate-fadeIn text-left"
                        >
                          <button
                            onClick={(e) => handleBlockSong(e, item)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/15 text-rose-400 hover:text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Not interested in this</span>
                          </button>

                          {artistName && artistName !== 'YouTube Music' && (
                            <button
                              onClick={(e) => handleBlockArtist(e, artistName)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/15 text-rose-400 hover:text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <UserX className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">Don't recommend artist</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Hover Overlay Play & Download Buttons */}
                      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20 pointer-events-none group-hover:pointer-events-auto">
                        <div className="w-10 h-10 rounded-full liquid-glass-prominent flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer">
                          <Play className="w-5 h-5 fill-current ml-0.5 text-white" />
                        </div>
                        {isSong && (
                          <button
                            onClick={(e) => handleDownload(e, item)}
                            title="Download 320k MP3"
                            className="w-9 h-9 rounded-full liquid-glass-control flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                          >
                            <Download className="w-4 h-4 text-white" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-0.5">
                      <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-foreground-muted truncate">
                        {artistName}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
