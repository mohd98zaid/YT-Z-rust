import React, { useState, useEffect } from 'react';
import { Search, Play, Download, Music, Video, User, Disc, ListMusic, Clock, History, X, ListPlus, Check, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { Track } from '../types';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useDownloadStore } from '../stores/useDownloadStore';
import { useNavigationStore } from '../stores/useNavigationStore';

interface SearchPageProps {
  initialQuery?: string;
}

const safeText = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    if (typeof val.text === 'string') return val.text;
    if (typeof val.name === 'string') return val.name;
    if (typeof val.title === 'string') return val.title;
    if (Array.isArray(val)) {
      return val.map((x) => safeText(x)).filter(Boolean).join(', ');
    }
    return '';
  }
  return String(val);
};

export const SearchPage: React.FC<SearchPageProps> = ({ initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<string>('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [customPlaylists, setCustomPlaylists] = useState<any[]>([]);
  const [playlistModalTrack, setPlaylistModalTrack] = useState<any | null>(null);
  const [addedToast, setAddedToast] = useState('');

  const { playTrack, setExpanded, setVideoMode } = usePlayerStore();
  const { queueDownload } = useDownloadStore();

  const loadHistoryData = async () => {
    try {
      const [hist, recents, pls] = await Promise.all([
        api.getSearchHistory(),
        api.getPlaybackHistory(12),
        api.getCustomPlaylists(),
      ]);
      setSearchHistory(hist || []);
      setRecentTracks(recents || []);
      setCustomPlaylists(pls || []);
    } catch {}
  };

  useEffect(() => {
    loadHistoryData();
  }, []);

  useEffect(() => {
    if (initialQuery && initialQuery.trim() && initialQuery !== query) {
      setQuery(initialQuery);
      executeSearch(initialQuery);
    }
  }, [initialQuery]);

  const executeSearch = async (searchQuery: string, searchFilter?: string) => {
    const q = searchQuery.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    api.saveSearchQuery(q).then(() => loadHistoryData()).catch(() => {});
    const activeFilter = searchFilter !== undefined ? searchFilter : filter;
    try {
      const data = await api.search(q, activeFilter || undefined);
      setResults(data || []);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    try {
      await api.deleteSearchQuery(item);
      setSearchHistory((prev) => prev.filter((s) => s !== item));
    } catch {}
  };

  const handleClearHistory = async () => {
    try {
      await api.deleteSearchQuery();
      setSearchHistory([]);
    } catch {}
  };

  // Sync and auto-search when initialQuery from Header updates
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setQuery(initialQuery);
      executeSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleFilterClick = (newFilter: string) => {
    setFilter(newFilter);
    executeSearch(query, newFilter);
  };

  const handleItemClick = async (item: any) => {
    const isSong = Boolean(item.videoId || item.duration);
    if (isSong) {
      playTrack(item, results.filter((x) => x.videoId || x.duration));
    } else if (item.resultType === 'album' || item.resultType === 'playlist') {
      const id = item.id || item.browseId;
      if (id) {
        try {
          const isPl =
            item.resultType === 'playlist' ||
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
          console.error('Failed to load playlist/album tracks', err);
        }
      }
    } else if (item.resultType === 'artist') {
      const id = item.id || item.browseId;
      if (id) {
        try {
          const data = await api.getArtist(id);
          if (data && data.topSongs && data.topSongs.length > 0) {
            playTrack(data.topSongs[0], data.topSongs);
          }
        } catch (err) {
          console.error('Failed to load artist top songs', err);
        }
      }
    }
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

  const filterTabs = [
    { id: '', label: 'All Results' },
    { id: 'songs', label: 'Songs', icon: Music },
    { id: 'videos', label: 'Videos', icon: Video },
    { id: 'albums', label: 'Albums', icon: Disc },
    { id: 'artists', label: 'Artists', icon: User },
    { id: 'playlists', label: 'Playlists', icon: ListMusic },
  ];

  const browseCategories = [
    { title: 'Bollywood Hits', query: 'Bollywood hits top songs', gradient: 'from-rose-600 to-red-500' },
    { title: 'Punjabi Bangers', query: 'Punjabi hits top tracks', gradient: 'from-amber-600 to-orange-500' },
    { title: 'Global Pop', query: 'Top Pop music international', gradient: 'from-purple-600 to-indigo-500' },
    { title: 'Hip-Hop & Rap', query: 'Hip-hop rap latest tracks', gradient: 'from-emerald-600 to-teal-500' },
    { title: 'Romantic Melodies', query: 'Romantic Hindi love songs', gradient: 'from-pink-600 to-rose-500' },
    { title: 'Chill & Lo-Fi', query: 'Chill Lo-fi beats relaxing music', gradient: 'from-cyan-600 to-blue-500' },
    { title: 'Workout Energy', query: 'Workout motivation EDM gym music', gradient: 'from-violet-600 to-fuchsia-500' },
    { title: 'Sufi & Acoustic', query: 'Sufi ghazal acoustic soulful songs', gradient: 'from-amber-700 to-yellow-600' },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto pb-40 md:pb-28">
      {/* Search Header Form */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
              <Search className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
              <span>Search & Discover</span>
            </h1>
            <p className="text-xs sm:text-sm text-foreground-muted mt-1">
              Search across YouTube Music, Spotify catalogue, playlists, and artists.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeSearch(query)}
              placeholder="Search artists, tracks, podcasts, albums..."
              className="w-full liquid-glass-input text-foreground placeholder:text-foreground-subtle text-sm sm:text-base pl-12 pr-4 py-3 outline-none"
            />
          </div>
          <button
            onClick={() => executeSearch(query)}
            aria-label="Submit search"
            disabled={loading || !query.trim()}
            className="px-6 py-3 rounded-xl liquid-glass-prominent font-bold text-sm disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 pt-1">
          {filterTabs.map((tab) => {
            const isSelected = filter === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleFilterClick(tab.id)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs transition-all ${
                  isSelected
                    ? 'liquid-glass-pill-active'
                    : 'liquid-glass-pill-inactive'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Section */}
      {loading ? (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2.5 text-foreground-muted text-xs font-semibold py-1">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Searching YouTube Music...</span>
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-surface border border-border animate-pulse"
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-xl bg-surface-elevated shrink-0" />
                <div className="space-y-2 flex-1 max-w-md">
                  <div className="h-4 bg-surface-elevated rounded-md w-3/4" />
                  <div className="h-3 bg-surface-elevated rounded-md w-1/2" />
                </div>
              </div>
              <div className="w-16 h-3 bg-surface-elevated rounded-md" />
            </div>
          ))}
        </div>
      ) : !searched ? (
        <div className="space-y-8 pt-2">
          {/* Apple Music Style Browse Categories */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Browse Categories</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {browseCategories.map((cat, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setQuery(cat.title);
                    executeSearch(cat.query);
                  }}
                  className={`relative h-20 sm:h-24 rounded-2xl p-3.5 bg-gradient-to-br ${cat.gradient} text-white font-black text-sm flex flex-col justify-between shadow-md cursor-pointer hover:scale-[1.02] active:scale-95 transition-all overflow-hidden select-none`}
                >
                  <span className="leading-snug">{cat.title}</span>
                  <span className="text-[10px] font-semibold opacity-85 flex items-center gap-1">
                    <span>Explore</span>
                    <span>→</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Search Queries */}
          {searchHistory.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Recent Searches</span>
                </h3>
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-foreground-muted hover:text-primary transition-colors cursor-pointer"
                >
                  Clear History
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {searchHistory.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setQuery(item);
                      executeSearch(item);
                    }}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface border border-border hover:border-primary/50 text-xs font-semibold text-foreground hover:bg-surface-elevated cursor-pointer group transition-all"
                  >
                    <Clock className="w-3 h-3 text-foreground-muted" />
                    <span>{item}</span>
                    <button
                      onClick={(e) => handleDeleteHistoryItem(e, item)}
                      title="Remove"
                      className="text-foreground-subtle hover:text-foreground p-0.5 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recently Played Tracks */}
          {recentTracks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  <span>Recently Played</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {recentTracks.slice(0, 8).map((track) => (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track, recentTracks)}
                    className="flex items-center gap-3 p-2.5 rounded-2xl bg-surface border border-border hover:border-primary/40 hover:bg-surface-elevated cursor-pointer group transition-all"
                  >
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-surface-elevated shrink-0 shadow-sm">
                      <img
                        src={track.thumbnail || '/placeholder.png'}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                        {track.title}
                      </h4>
                      <p className="text-[11px] text-foreground-muted truncate mt-0.5">
                        {track.artist}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchHistory.length === 0 && recentTracks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-foreground-muted">
              <Search className="w-12 h-12 opacity-30 text-primary" />
              <p className="text-base font-semibold">Start searching or playing songs</p>
              <p className="text-xs text-foreground-subtle">
                Your recent searches and playback history will be saved here automatically for next time.
              </p>
            </div>
          )}
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-foreground-muted">
          <Search className="w-12 h-12 opacity-30 text-primary" />
          <p className="text-base font-semibold">No results found for "{query}"</p>
          <p className="text-xs text-foreground-subtle">Check your spelling or try broader keywords.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((item, idx) => {
            const isSong = Boolean(item.videoId || item.duration);
            const titleStr = safeText(item.title) || safeText(item.name) || 'Untitled';
            const artistStr = safeText(item.artist) || safeText(item.uploader) || safeText(item.author) || 'YouTube Music';
            const durationStr = safeText(item.duration);
            const subscribersStr = safeText(item.subscribers);
            const itemCountStr = safeText(item.itemCount);
            const resultTypeStr = safeText(item.resultType);

            return (
              <div
                key={item.id || item.videoId || item.browseId || idx}
                onClick={() => handleItemClick(item)}
                className="liquid-glass-row liquid-glass-card flex items-center justify-between p-3 rounded-2xl cursor-pointer group transition-all"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-surface-elevated shrink-0 shadow-md">
                    <img
                      src={item.thumbnail || '/placeholder.png'}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {titleStr}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-foreground-muted truncate">
                        {artistStr}
                      </p>
                      {resultTypeStr && resultTypeStr !== 'song' && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-surface-elevated text-primary border border-primary/20 shrink-0">
                          {resultTypeStr}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isSong && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          useNavigationStore.getState().navigateToYouTube({
                            id: item.videoId || item.id,
                            title: item.title,
                            artist: item.artist || 'YouTube',
                          });
                        }}
                        title="Watch in YouTube Cinema"
                        className="p-2 rounded-xl hover:bg-surface text-foreground-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaylistModalTrack(item);
                        }}
                        title="Add to Custom Playlist"
                        className="p-2 rounded-xl hover:bg-surface text-foreground-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ListPlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDownload(e, item)}
                        title="Download 320k MP3"
                        className="p-2 rounded-xl hover:bg-surface text-foreground-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {durationStr ? (
                    <span className="text-xs font-mono text-foreground-subtle min-w-[45px] text-right">
                      {durationStr}
                    </span>
                  ) : subscribersStr ? (
                    <span className="text-xs font-mono text-foreground-subtle text-right">
                      {subscribersStr}
                    </span>
                  ) : itemCountStr ? (
                    <span className="text-xs font-mono text-foreground-subtle text-right">
                      {itemCountStr}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add to Playlist Modal */}
      {playlistModalTrack && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
          onClick={() => setPlaylistModalTrack(null)}
        >
          <div
            className="bg-surface border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Add to Playlist</h3>
              </div>
              <button
                onClick={() => setPlaylistModalTrack(null)}
                className="p-1 rounded-full text-foreground-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-foreground-muted">
              Select a custom playlist for <span className="text-foreground font-semibold">"{playlistModalTrack.title}"</span>:
            </div>

            {customPlaylists.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-xs text-foreground-subtle">No custom playlists created yet.</p>
                <p className="text-[11px] text-foreground-muted">Create a playlist in the Library tab first.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {customPlaylists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={async () => {
                      try {
                        await api.addTrackToPlaylist(pl.id, playlistModalTrack);
                        setAddedToast(`Added to "${pl.name}"`);
                        setTimeout(() => setAddedToast(''), 3000);
                        setPlaylistModalTrack(null);
                        loadHistoryData();
                      } catch {}
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-surface-elevated hover:bg-primary/15 hover:text-primary transition-all flex items-center justify-between group"
                  >
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary truncate">
                      {pl.name}
                    </span>
                    <span className="text-[10px] text-foreground-subtle">
                      {pl.trackCount} tracks
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Added Toast */}
      {addedToast && (
        <div className="fixed bottom-24 right-8 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold shadow-xl animate-fadeIn">
          <Check className="w-4 h-4" />
          <span>{addedToast}</span>
        </div>
      )}
    </div>
  );
};
