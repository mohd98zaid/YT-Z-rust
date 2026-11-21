import React, { useEffect, useState } from 'react';
import {
  FolderHeart,
  Play,
  Folder,
  Heart,
  RefreshCw,
  Music,
  HardDrive,
  History,
  Trash2,
  X,
  ListPlus,
  ListMusic,
  Plus,
  Edit3,
  Check,
  Disc,
  Camera,
  Image,
  Shuffle,
  Download,
  Search,
  Sparkles,
  Volume2,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../services/api';
import { Track } from '../types';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useDownloadStore } from '../stores/useDownloadStore';

const PlaylistCoverImage: React.FC<{
  src?: string;
  alt: string;
  iconSize?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ src, alt, iconSize = 'md', className = '' }) => {
  const [error, setError] = useState(false);
  const cleanSrc = src && src.trim() && !src.includes('googleusercontent.com/test') ? src.trim() : null;

  if (!cleanSrc || error) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/25 via-surface-elevated to-surface text-primary/70 ${className}`}>
        <ListMusic className={iconSize === 'lg' ? 'w-16 h-16 text-primary/70' : 'w-12 h-12 text-primary/60'} />
      </div>
    );
  }

  return (
    <img
      src={cleanSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setError(true)}
      className={`w-full h-full object-cover group-hover:scale-105 transition-transform ${className}`}
    />
  );
};

export const LibraryPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'favorites' | 'playlists' | 'local' | 'history'>('favorites');
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [localFiles, setLocalFiles] = useState<any[]>([]);
  const [historyTracks, setHistoryTracks] = useState<Track[]>([]);
  const [customPlaylists, setCustomPlaylists] = useState<any[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Create Playlist modal state
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [newPlaylistThumbnail, setNewPlaylistThumbnail] = useState('');

  // Edit Playlist modal state
  const [editingPlaylist, setEditingPlaylist] = useState<any | null>(null);
  const [editPlaylistName, setEditPlaylistName] = useState('');
  const [editPlaylistDesc, setEditPlaylistDesc] = useState('');
  const [editPlaylistThumbnail, setEditPlaylistThumbnail] = useState('');

  // ID3 Tag Editor modal
  const [editingFile, setEditingFile] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editAlbum, setEditAlbum] = useState('');
  const [editYear, setEditYear] = useState('');
  const [isSavingTags, setIsSavingTags] = useState(false);

  const { playTrack, currentTrack, isPlaying } = usePlayerStore();
  const { queueDownload } = useDownloadStore();

  // Inline Song Search for Playlist
  const [isAddSongsOpen, setIsAddSongsOpen] = useState(false);
  const [addSongQuery, setAddSongQuery] = useState('');
  const [addSongResults, setAddSongResults] = useState<Track[]>([]);
  const [isSearchingSongs, setIsSearchingSongs] = useState(false);
  const [addedTrackIds, setAddedTrackIds] = useState<Set<string>>(new Set());
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 3000);
  };

  const handleSearchSongsForPlaylist = async (q: string) => {
    setAddSongQuery(q);
    if (!q.trim() || q.trim().length < 2) {
      setAddSongResults([]);
      return;
    }
    setIsSearchingSongs(true);
    try {
      const res = await api.search(q.trim(), 'songs');
      setAddSongResults(res || []);
    } catch {
      setAddSongResults([]);
    } finally {
      setIsSearchingSongs(false);
    }
  };

  const handleAddTrackToCurrentPlaylist = async (track: Track) => {
    if (!selectedPlaylist) return;
    try {
      await api.addTrackToPlaylist(selectedPlaylist.id, track);
      setAddedTrackIds((prev) => new Set(prev).add(track.id));
      const updated = await api.getCustomPlaylist(selectedPlaylist.id);
      setSelectedPlaylist(updated);
      const pls = await api.getCustomPlaylists();
      setCustomPlaylists(pls || []);
      showToast(`Added "${track.title}" to ${selectedPlaylist.name}!`);
    } catch (err) {
      showToast('Failed to add track to playlist');
    }
  };

  const handleDownloadAllPlaylist = async (tracks: Track[]) => {
    if (!tracks || tracks.length === 0) return;
    try {
      for (const t of tracks) {
        const url = t.isLocal
          ? t.filePath || ''
          : `https://www.youtube.com/watch?v=${t.videoId || t.id}`;
        await queueDownload({
          url,
          download_type: 'audio',
          format: 'mp3',
          quality: '320',
          title: t.title,
          artist: t.artist,
          thumbnail: t.thumbnail,
        });
      }
      showToast(`Queued ${tracks.length} tracks to 4K Downloader!`);
    } catch {
      showToast('Error queuing playlist tracks');
    }
  };

  const formatPlaylistTotalDuration = (tracks: any[]) => {
    if (!tracks || tracks.length === 0) return '0 min';
    let totalSec = 0;
    for (const t of tracks) {
      if (typeof t.durationSeconds === 'number' && t.durationSeconds > 0) {
        totalSec += t.durationSeconds;
      } else if (typeof t.duration === 'string' && t.duration.includes(':')) {
        const parts = t.duration.split(':').map(Number);
        totalSec += parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : (parts[0] || 0) * 60 + (parts[1] || 0);
      }
    }
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    if (hrs > 0) {
      return `${hrs} hr ${mins} min`;
    }
    return `${mins} min`;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [favs, locals, hist, pls] = await Promise.all([
        api.getFavorites(),
        api.scanLibrary(),
        api.getPlaybackHistory(),
        api.getCustomPlaylists(),
      ]);
      setFavorites(favs || []);
      setLocalFiles(locals || []);
      setHistoryTracks(hist || []);
      setCustomPlaylists(pls || []);
    } catch (err) {
      console.error('Failed to load library', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePlaylist = async () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    try {
      await api.createCustomPlaylist(name, newPlaylistDesc.trim(), newPlaylistThumbnail.trim());
      setNewPlaylistName('');
      setNewPlaylistDesc('');
      setNewPlaylistThumbnail('');
      setIsCreatePlaylistOpen(false);
      const pls = await api.getCustomPlaylists();
      setCustomPlaylists(pls || []);
    } catch (err) {
      console.error('Failed to create playlist', err);
    }
  };

  const handleStartEditPlaylist = (pl: any) => {
    setEditingPlaylist(pl);
    setEditPlaylistName(pl.name || '');
    setEditPlaylistDesc(pl.description || '');
    setEditPlaylistThumbnail(pl.is_custom_thumbnail ? (pl.thumbnail || '') : '');
  };

  const handleSavePlaylistEdit = async () => {
    if (!editingPlaylist) return;
    const name = editPlaylistName.trim();
    if (!name) return;
    try {
      await api.updateCustomPlaylist(editingPlaylist.id, {
        name,
        description: editPlaylistDesc.trim(),
        thumbnail: editPlaylistThumbnail.trim(),
      });
      const updated = await api.getCustomPlaylist(editingPlaylist.id);
      setSelectedPlaylist(updated);
      setEditingPlaylist(null);
      const pls = await api.getCustomPlaylists();
      setCustomPlaylists(pls || []);
    } catch (err) {
      console.error('Failed to update playlist', err);
    }
  };

  const handleOpenPlaylist = async (playlistId: string) => {
    try {
      const details = await api.getCustomPlaylist(playlistId);
      setSelectedPlaylist(details);
    } catch (err) {
      console.error('Failed to fetch playlist details', err);
    }
  };

  const handleDeletePlaylist = async (e: React.MouseEvent, playlistId: string) => {
    e.stopPropagation();
    try {
      await api.deleteCustomPlaylist(playlistId);
      if (selectedPlaylist && selectedPlaylist.id === playlistId) {
        setSelectedPlaylist(null);
      }
      setCustomPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    } catch (err) {
      console.error('Failed to delete playlist', err);
    }
  };

  const handleRemoveTrackFromPlaylist = async (trackId: string) => {
    if (!selectedPlaylist) return;
    try {
      await api.removeTrackFromPlaylist(selectedPlaylist.id, trackId);
      const updated = await api.getCustomPlaylist(selectedPlaylist.id);
      setSelectedPlaylist(updated);
      const pls = await api.getCustomPlaylists();
      setCustomPlaylists(pls || []);
    } catch (err) {
      console.error('Failed to remove track', err);
    }
  };

  const handleSaveTags = async () => {
    if (!editingFile) return;
    setIsSavingTags(true);
    try {
      await api.editAudioTags({
        filePath: editingFile.filePath,
        title: editTitle,
        artist: editArtist,
        album: editAlbum,
        year: editYear,
      });
      setEditingFile(null);
      // Refresh local files
      const locals = await api.scanLibrary();
      setLocalFiles(locals || []);
    } catch (err) {
      console.error('Failed to save audio tags', err);
    } finally {
      setIsSavingTags(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await api.clearPlaybackHistory();
      setHistoryTracks([]);
    } catch (err) {
      console.error('Failed to clear playback history', err);
    }
  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    try {
      await api.clearPlaybackHistory(trackId);
      setHistoryTracks((prev) => prev.filter((t) => t.id !== trackId));
    } catch (err) {
      console.error('Failed to remove history item', err);
    }
  };

  const handleOpenExplorer = async (path?: string) => {
    if (!path) return;
    try {
      await api.openExplorer(path);
    } catch (err) {
      console.error('Failed to open explorer', err);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto pb-40 md:pb-28">
      {/* Toast Notice */}
      {toastNotice && (
        <div className="fixed top-20 right-6 z-50 bg-black/80 border border-primary/40 text-foreground text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>{toastNotice}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <FolderHeart className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            <span>My Music Library</span>
          </h1>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Access offline downloads, custom playlists, scanned local folders, and listening history.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-full liquid-glass-control text-xs font-bold text-foreground transition-all active:scale-95 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : 'text-primary'}`} />
          <span>Refresh Library</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none max-w-full pb-1">
          <button
            onClick={() => {
              setActiveSubTab('favorites');
              setSelectedPlaylist(null);
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs transition-all shrink-0 ${
              activeSubTab === 'favorites'
                ? 'liquid-glass-pill-active'
                : 'liquid-glass-pill-inactive'
            }`}
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>Favorites ({favorites.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('playlists')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs transition-all shrink-0 ${
              activeSubTab === 'playlists'
                ? 'liquid-glass-pill-active'
                : 'liquid-glass-pill-inactive'
            }`}
          >
            <ListPlus className="w-3.5 h-3.5" />
            <span>Playlists ({customPlaylists.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('local');
              setSelectedPlaylist(null);
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs transition-all shrink-0 ${
              activeSubTab === 'local'
                ? 'liquid-glass-pill-active'
                : 'liquid-glass-pill-inactive'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Local Downloads ({localFiles.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('history');
              setSelectedPlaylist(null);
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs transition-all shrink-0 ${
              activeSubTab === 'history'
                ? 'liquid-glass-pill-active'
                : 'liquid-glass-pill-inactive'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Listening History ({historyTracks.length})</span>
          </button>
        </div>

        {activeSubTab === 'history' && historyTracks.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold liquid-glass-control text-foreground-muted hover:text-rose-400 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}

        {activeSubTab === 'playlists' && (
          <button
            onClick={() => setIsCreatePlaylistOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-md shadow-primary/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Playlist</span>
          </button>
        )}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-foreground-muted">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Loading library...</span>
        </div>
      ) : activeSubTab === 'favorites' ? (
        favorites.length === 0 ? (
          <div className="liquid-glass-card rounded-3xl p-12 text-center text-foreground-muted space-y-2">
            <Heart className="w-10 h-10 opacity-30 text-primary mx-auto mb-2" />
            <p className="text-base font-bold text-foreground">No favorites yet</p>
            <p className="text-xs text-foreground-subtle">
              Click the heart icon on any playing song to add it here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {favorites.map((track) => (
              <div
                key={track.id}
                onClick={() => playTrack(track, favorites)}
                className="liquid-glass-row liquid-glass-card flex items-center justify-between p-3 rounded-2xl cursor-pointer group transition-all"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={track.thumbnail || '/placeholder.png'}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-sm"
                  />
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {track.title}
                    </h4>
                    <p className="text-xs text-foreground-muted truncate">{track.artist}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-foreground-subtle">{track.duration}</span>
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeSubTab === 'playlists' ? (
        selectedPlaylist ? (
          /* Single Playlist View (Apple Music / BitChord style) */
          <div className="space-y-6">
            {/* Playlist Hero Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 rounded-3xl liquid-glass-card relative overflow-hidden shadow-2xl">
              {/* Playlist Cover Art with Change Cover Overlay */}
              <div
                onClick={() => handleStartEditPlaylist(selectedPlaylist)}
                className="relative w-36 h-36 sm:w-48 sm:h-48 rounded-2xl bg-black/40 overflow-hidden border border-white/15 shrink-0 shadow-2xl cursor-pointer group"
                title="Click to change playlist cover art"
              >
                <PlaylistCoverImage
                  src={selectedPlaylist.thumbnail}
                  alt={selectedPlaylist.name}
                  iconSize="lg"
                />

                {/* Hover Change Cover Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1.5 transition-opacity duration-200">
                  <Camera className="w-6 h-6 text-white" />
                  <span className="text-[11px] font-bold text-white tracking-wide uppercase">Change Cover</span>
                </div>
              </div>

              {/* Playlist Metadata & Actions */}
              <div className="flex-1 space-y-3 min-w-0">
                <button
                  onClick={() => setSelectedPlaylist(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground-muted hover:text-primary transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Playlists</span>
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                      PLAYLIST
                    </span>
                    <span className="text-[11px] font-semibold text-foreground-subtle">
                      {selectedPlaylist.is_custom_thumbnail ? 'Custom Cover' : 'Dynamic Cover'}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight truncate mt-1.5">
                    {selectedPlaylist.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-foreground-muted line-clamp-2 mt-1">
                    {selectedPlaylist.description || 'Personal playlist collection'}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-foreground-subtle">
                    <span className="font-semibold text-foreground">
                      {selectedPlaylist.tracks?.length || 0} {selectedPlaylist.tracks?.length === 1 ? 'track' : 'tracks'}
                    </span>
                    <span>•</span>
                    <span>{formatPlaylistTotalDuration(selectedPlaylist.tracks || [])}</span>
                  </div>
                </div>

                {/* Playlist Action Bar */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  {selectedPlaylist.tracks && selectedPlaylist.tracks.length > 0 && (
                    <>
                      <button
                        onClick={() => playTrack(selectedPlaylist.tracks[0], selectedPlaylist.tracks)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full liquid-glass-prominent text-white font-bold text-xs shadow-lg transition-all hover:scale-105 active:scale-95"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Play All</span>
                      </button>

                      <button
                        onClick={() => {
                          const shuffled = [...selectedPlaylist.tracks].sort(() => Math.random() - 0.5);
                          playTrack(shuffled[0], shuffled);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-full liquid-glass-control text-foreground hover:text-white text-xs font-semibold hover:scale-105 active:scale-95 transition-all"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                        <span>Shuffle</span>
                      </button>

                      <button
                        onClick={() => handleDownloadAllPlaylist(selectedPlaylist.tracks)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-full liquid-glass-control text-foreground hover:text-white text-xs font-semibold hover:scale-105 active:scale-95 transition-all"
                        title="Download all playlist tracks in 320k / Lossless"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download All</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setIsAddSongsOpen(!isAddSongsOpen)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold transition-all ${
                      isAddSongsOpen
                        ? 'liquid-glass-pill-active'
                        : 'liquid-glass-control text-foreground hover:text-white'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddSongsOpen ? 'Close Search' : 'Add Songs'}</span>
                  </button>

                  <button
                    onClick={() => handleStartEditPlaylist(selectedPlaylist)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-full liquid-glass-control text-foreground hover:text-white text-xs font-semibold hover:scale-105 active:scale-95 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-foreground-muted" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Inline Quick Song Search & Adder */}
            {isAddSongsOpen && (
              <div className="p-5 rounded-3xl liquid-glass-card border border-primary/30 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Find & Add Songs to Playlist</h3>
                  </div>
                  <span className="text-xs text-foreground-muted">Type song name or artist</span>
                </div>

                <div className="relative flex items-center">
                  <Search className="w-4 h-4 absolute left-3.5 text-foreground-muted pointer-events-none" />
                  <input
                    type="text"
                    value={addSongQuery}
                    onChange={(e) => handleSearchSongsForPlaylist(e.target.value)}
                    placeholder="Search songs to add immediately..."
                    className="w-full bg-white/10 border border-white/20 focus:border-primary/50 text-foreground text-xs sm:text-sm rounded-full pl-10 pr-4 py-2 outline-none transition-all placeholder:text-foreground-subtle focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                  {isSearchingSongs && (
                    <RefreshCw className="w-4 h-4 absolute right-3.5 text-primary animate-spin" />
                  )}
                </div>

                {addSongResults.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                    {addSongResults.map((t) => {
                      const isAdded = addedTrackIds.has(t.id) || selectedPlaylist.tracks?.some((x: any) => x.id === t.id);
                      return (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-2.5 rounded-2xl liquid-glass-row"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={t.thumbnail || '/placeholder.png'}
                              alt=""
                              className="w-9 h-9 rounded-xl object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{t.title}</p>
                              <p className="text-[11px] text-foreground-muted truncate">{t.artist}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddTrackToCurrentPlaylist(t)}
                            disabled={isAdded}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                              isAdded
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'liquid-glass-prominent text-white hover:scale-105 active:scale-95'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Added</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Add</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Playlist Track List */}
            {selectedPlaylist.tracks && selectedPlaylist.tracks.length > 0 ? (
              <div className="space-y-1.5">
                {selectedPlaylist.tracks.map((track: any, idx: number) => {
                  const isCurrentPlaying = currentTrack?.id === track.id && isPlaying;
                  return (
                    <div
                      key={track.id}
                      onClick={() => playTrack(track, selectedPlaylist.tracks)}
                      className={`flex items-center justify-between p-3 rounded-2xl liquid-glass-row cursor-pointer group transition-all ${
                        isCurrentPlaying ? 'border-primary/40 bg-primary/10 shadow-[0_0_15px_rgba(255,0,0,0.15)]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Track Index or Playing Waveform */}
                        <div className="w-6 text-center text-xs font-semibold text-foreground-subtle shrink-0">
                          {isCurrentPlaying ? (
                            <Volume2 className="w-4 h-4 text-primary animate-pulse mx-auto" />
                          ) : (
                            <span className="group-hover:hidden">{idx + 1}</span>
                          )}
                          <Play className="w-3.5 h-3.5 text-primary fill-current hidden group-hover:block mx-auto" />
                        </div>

                        <img
                          src={track.thumbnail || '/placeholder.png'}
                          alt=""
                          className="w-11 h-11 rounded-xl object-cover shrink-0 shadow-md"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className={`font-semibold text-sm truncate transition-colors ${
                            isCurrentPlaying ? 'text-primary font-bold' : 'text-foreground group-hover:text-primary'
                          }`}>
                            {track.title}
                          </h4>
                          <p className="text-xs text-foreground-muted truncate">{track.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono text-foreground-subtle">{track.duration}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTrackFromPlaylist(track.id);
                          }}
                          title="Remove from playlist"
                          className="p-2 rounded-xl text-foreground-subtle hover:text-red-400 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="liquid-glass-card rounded-3xl p-12 text-center text-foreground-muted space-y-3">
                <Disc className="w-12 h-12 opacity-30 text-primary mx-auto mb-2" />
                <p className="text-base font-bold text-foreground">Playlist is empty</p>
                <p className="text-xs text-foreground-subtle max-w-sm mx-auto">
                  Click the <strong>Add Songs</strong> button above or search tracks in YT-Z to build your collection.
                </p>
                <button
                  onClick={() => setIsAddSongsOpen(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full liquid-glass-prominent text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Songs Now</span>
                </button>
              </div>
            )}
          </div>
        ) : customPlaylists.length === 0 ? (
          <div className="liquid-glass-card rounded-3xl p-12 text-center text-foreground-muted space-y-3">
            <ListPlus className="w-12 h-12 opacity-30 text-primary mx-auto mb-2" />
            <p className="text-base font-bold text-foreground">No custom playlists yet</p>
            <p className="text-xs text-foreground-subtle max-w-sm mx-auto">
              Create and organize your favorite songs into custom collections with custom artwork.
            </p>
            <button
              onClick={() => setIsCreatePlaylistOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full liquid-glass-prominent text-white text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Playlist</span>
            </button>
          </div>
        ) : (
          /* Playlists Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {customPlaylists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => handleOpenPlaylist(pl.id)}
                className="p-4 rounded-3xl liquid-glass-card cursor-pointer group transition-all relative overflow-hidden"
              >
                <div className="w-full aspect-square rounded-2xl bg-black/40 border border-white/10 overflow-hidden relative shadow-lg">
                  <PlaylistCoverImage
                    src={pl.thumbnail}
                    alt={pl.name}
                    iconSize="md"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-12 h-12 rounded-full liquid-glass-prominent flex items-center justify-center text-white shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white shadow-md">
                    {pl.trackCount} {pl.trackCount === 1 ? 'track' : 'tracks'}
                  </div>
                </div>

                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {pl.name}
                    </h3>
                    <p className="text-xs text-foreground-muted truncate">
                      {pl.description || `${pl.trackCount} tracks`}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeletePlaylist(e, pl.id)}
                    title="Delete playlist"
                    className="p-1.5 rounded-lg text-foreground-subtle hover:text-red-400 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeSubTab === 'history' ? (
        historyTracks.length === 0 ? (
          <div className="bg-surface border border-border rounded-3xl p-12 text-center text-foreground-muted space-y-2">
            <History className="w-10 h-10 opacity-30 text-primary mx-auto mb-2" />
            <p className="text-base font-bold text-foreground">No listening history yet</p>
            <p className="text-xs text-foreground-subtle">
              Songs you play will automatically be remembered here for next time.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {historyTracks.map((track) => (
              <div
                key={track.id}
                onClick={() => playTrack(track, historyTracks)}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-surface border border-border hover:border-primary/40 hover:bg-surface-elevated cursor-pointer group transition-all"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={track.thumbnail || '/placeholder.png'}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-sm"
                  />
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {track.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-foreground-muted truncate">{track.artist}</p>
                      {(track as any).played_at && (
                        <span className="text-[10px] text-foreground-subtle">
                          • {new Date((track as any).played_at).toLocaleDateString()}{' '}
                          {new Date((track as any).played_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono text-foreground-subtle">{track.duration}</span>
                  <button
                    onClick={(e) => handleDeleteHistoryItem(e, track.id)}
                    title="Remove from history"
                    className="p-2 rounded-xl text-foreground-subtle hover:text-foreground hover:bg-surface opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : localFiles.length === 0 ? (
        <div className="bg-surface border border-border rounded-3xl p-12 text-center text-foreground-muted space-y-2">
          <HardDrive className="w-10 h-10 opacity-30 text-primary mx-auto mb-2" />
          <p className="text-base font-bold text-foreground">No local files found</p>
          <p className="text-xs text-foreground-subtle">
            Downloaded songs from the Downloader tab will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {localFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-surface border border-border hover:bg-surface-elevated transition-all group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-surface-elevated flex items-center justify-center shrink-0 border border-border">
                  <Music className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm text-foreground truncate">{file.title}</h4>
                  <p className="text-xs text-foreground-muted truncate">
                    {file.artist} • <span className="uppercase font-bold">{file.extension}</span> •{' '}
                    {(file.fileSize / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setEditingFile(file);
                    setEditTitle(file.title || '');
                    setEditArtist(file.artist || '');
                    setEditAlbum(file.album || '');
                    setEditYear(file.year || '');
                  }}
                  title="Edit ID3 Audio Tags"
                  className="p-2 rounded-xl bg-surface-elevated hover:bg-surface-elevated/80 text-foreground-muted hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    playTrack({
                      id: file.id,
                      videoId: file.id,
                      title: file.title,
                      artist: file.artist,
                      duration: file.duration,
                      durationSeconds: file.durationSeconds,
                      thumbnail: '',
                      isLocal: true,
                      filePath: file.filePath,
                    })
                  }
                  title="Play File"
                  className="p-2 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
                <button
                  onClick={() => handleOpenExplorer(file.filePath)}
                  title="Open in Windows Explorer"
                  className="p-2 rounded-xl bg-surface-elevated hover:bg-surface-elevated/80 text-foreground-muted hover:text-foreground transition-colors"
                >
                  <Folder className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Playlist Modal */}
      {isCreatePlaylistOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="bg-surface border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <h3 className="text-base font-bold text-foreground">Create New Playlist</h3>
              <button
                onClick={() => setIsCreatePlaylistOpen(false)}
                className="p-1 rounded-full text-foreground-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground-muted block mb-1">Playlist Name</label>
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="e.g. Chill Vibes, Workout 2026..."
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:border-primary outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground-muted block mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  placeholder="e.g. My favorite night-drive songs"
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground-muted block mb-1">Custom Cover Image URL (Optional)</label>
                <input
                  type="text"
                  value={newPlaylistThumbnail}
                  onChange={(e) => setNewPlaylistThumbnail(e.target.value)}
                  placeholder="Leave empty to use 1st song's artwork automatically"
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-foreground-subtle focus:border-primary outline-none"
                />
                <p className="text-[11px] text-foreground-subtle mt-1">
                  💡 If left blank, the playlist cover will automatically be the album art of the first song you add.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCreatePlaylistOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-elevated text-xs font-semibold text-foreground-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim()}
                className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-md disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Playlist Details & Custom Cover Modal */}
      {editingPlaylist && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="bg-surface border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-primary" />
                <h3 className="text-base font-bold text-foreground">Edit Playlist &amp; Cover</h3>
              </div>
              <button
                onClick={() => setEditingPlaylist(null)}
                className="p-1 rounded-full text-foreground-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Cover Preview & Custom URL */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-surface-elevated border border-border overflow-hidden relative shrink-0 shadow-inner">
                  {editPlaylistThumbnail ? (
                    <img
                      src={editPlaylistThumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        const parent = (e.target as HTMLElement).parentElement;
                        if (parent) {
                          const fallback = parent.querySelector('.edit-preview-fallback');
                          if (fallback) (fallback as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className={`edit-preview-fallback w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-surface-elevated text-primary/50 ${
                      editPlaylistThumbnail ? 'hidden' : 'flex'
                    }`}
                  >
                    <ListMusic className="w-8 h-8" />
                  </div>
                </div>

                <div className="flex-1 space-y-1">
                  <label className="text-xs font-semibold text-foreground-muted block">Custom Cover Image URL</label>
                  <input
                    type="text"
                    value={editPlaylistThumbnail}
                    onChange={(e) => setEditPlaylistThumbnail(e.target.value)}
                    placeholder="Paste image link (https://...)"
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:border-primary outline-none"
                  />
                  {editPlaylistThumbnail && (
                    <button
                      type="button"
                      onClick={() => setEditPlaylistThumbnail('')}
                      className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                    >
                      Reset to 1st Song Artwork
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground-muted block mb-1">Playlist Name</label>
                <input
                  type="text"
                  value={editPlaylistName}
                  onChange={(e) => setEditPlaylistName(e.target.value)}
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground-muted block mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={editPlaylistDesc}
                  onChange={(e) => setEditPlaylistDesc(e.target.value)}
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:border-primary outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <button
                onClick={() => setEditingPlaylist(null)}
                className="px-4 py-2 rounded-xl bg-surface-elevated text-xs font-semibold text-foreground-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlaylistEdit}
                disabled={!editPlaylistName.trim()}
                className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-md disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ID3 Tag Editor Modal */}
      {editingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="bg-surface border border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Edit ID3 Audio Metadata</h3>
              </div>
              <button
                onClick={() => setEditingFile(null)}
                className="p-1 rounded-full text-foreground-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="text-foreground-muted block mb-1 font-semibold">Track Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-foreground-muted block mb-1 font-semibold">Artist</label>
                <input
                  type="text"
                  value={editArtist}
                  onChange={(e) => setEditArtist(e.target.value)}
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-foreground-muted block mb-1 font-semibold">Album</label>
                <input
                  type="text"
                  value={editAlbum}
                  onChange={(e) => setEditAlbum(e.target.value)}
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-foreground-muted block mb-1 font-semibold">Release Year</label>
                <input
                  type="text"
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  placeholder="2026"
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-foreground-muted block mb-1 font-semibold">File Format</label>
                <input
                  type="text"
                  value={editingFile.extension?.toUpperCase() || 'AUDIO'}
                  disabled
                  className="w-full bg-surface border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground-subtle cursor-not-allowed"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
              <button
                onClick={() => setEditingFile(null)}
                className="px-4 py-2 rounded-xl bg-surface-elevated text-xs font-semibold text-foreground-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTags}
                disabled={isSavingTags}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-md disabled:opacity-50"
              >
                {isSavingTags ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Save to File</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
