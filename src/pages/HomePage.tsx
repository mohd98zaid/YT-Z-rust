import React, { useEffect } from 'react';
import { Play, Download, Sparkles, TrendingUp, Music, Disc3, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { Track } from '../types';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useDownloadStore } from '../stores/useDownloadStore';
import { useHomeStore } from '../stores/useHomeStore';

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

  if (loading && !hasLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-foreground-muted py-24">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold">Tuning into YouTube Music Feed...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 md:space-y-10 max-w-7xl mx-auto pb-40 md:pb-28">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-3xl overflow-hidden p-5 sm:p-8 liquid-glass-card shadow-2xl flex items-center justify-between border border-white/15">
        <div className="relative z-1 max-w-xl space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-black border border-primary/30 tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>YT-Z AUDIOPHILE</span>
            </div>
            <button
              onClick={() => loadHome(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full liquid-glass-control text-xs font-bold transition-all active:scale-95 shadow-sm"
              title="Refresh Home Feed from YouTube Music"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : 'text-primary'}`} />
              <span>{isRefreshing ? 'Refreshing Feed...' : 'Refresh Feed'}</span>
            </button>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Hi-Res Lossless Audio & Cinema
          </h1>
          <p className="text-sm text-zinc-300 leading-relaxed font-normal">
            Bit-perfect 24-bit / 96kHz FLAC streaming, frame-locked YouTube Cinema player, Apple Music fluid lyrics, and uncapped 4K media downloads.
          </p>
        </div>

        <div className="hidden md:flex relative z-1 shrink-0 mr-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/25 rounded-3xl blur-2xl group-hover:blur-3xl transition-all" />
            <img
              src="/app-icon.webp"
              alt="YT-Z Logo"
              className="relative w-28 h-28 lg:w-32 lg:h-32 rounded-3xl object-cover shadow-2xl border border-white/20 ring-1 ring-primary/40 transform group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </div>
        <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-primary/15 rounded-full filter blur-3xl pointer-events-none" />
      </div>

      {/* Dynamic Sections from YouTube Music */}
      {sections.map((section, sIdx) => {
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
                        className={`px-3.5 py-1 rounded-full text-xs transition-all ${
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
                    className="flex items-center gap-1.5 px-3.5 py-1 rounded-full liquid-glass-control text-xs font-bold text-foreground shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
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
              return (
                <div
                  key={iIdx}
                  onClick={async () => {
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
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/40 mb-2.5 shadow-md">
                    <img
                      src={item.thumbnail || '/placeholder.png'}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Hover Overlay Play & Download Buttons */}
                    <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-full liquid-glass-prominent flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                      {isSong && (
                        <button
                          onClick={(e) => handleDownload(e, item)}
                          title="Download 320k MP3"
                          className="w-9 h-9 rounded-full liquid-glass-control flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform"
                        >
                          <Download className="w-4 h-4" />
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
                      {item.artist || item.subtitle || 'YouTube Music'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ); })}
    </div>
  );
};
