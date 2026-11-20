import React, { useState } from 'react';
import { ListMusic, Play, Download, CheckCircle2, ArrowRight, Sparkles, FolderHeart } from 'lucide-react';
import { api } from '../services/api';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useDownloadStore } from '../stores/useDownloadStore';
import { useNavigationStore } from '../stores/useNavigationStore';

export const SpotifyImporterPage: React.FC = () => {
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [importedData, setImportedData] = useState<any | null>(null);

  const { playTrack } = usePlayerStore();
  const { queueDownload } = useDownloadStore();
  const { setActiveTab } = useNavigationStore();

  const handleImport = async () => {
    if (!spotifyUrl.trim()) return;
    setLoading(true);
    setImportedData(null);
    try {
      const data = await api.importSpotify(spotifyUrl.trim());
      setImportedData(data);
    } catch (err: any) {
      alert(`Spotify Import Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (!importedData?.tracks) return;
    const playable = importedData.tracks.filter((t: any) => t.matched && t.videoId);
    if (playable.length > 0) {
      playTrack(playable[0], playable);
    }
  };

  const handleDownloadAll = async () => {
    if (!importedData?.tracks) return;
    const playable = importedData.tracks.filter((t: any) => t.matched && t.videoId);
    const batchItems = playable.map((t: any) => ({
      url: `https://www.youtube.com/watch?v=${t.videoId}`,
      download_type: 'audio',
      format: 'mp3',
      quality: '320',
      title: t.title,
      artist: t.artist,
      thumbnail: t.thumbnail,
    }));
    await api.batchQueue(batchItems);
    alert(`Enqueued ${batchItems.length} tracks to Download Queue!`);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto pb-40 md:pb-28">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
          <ListMusic className="w-8 h-8 text-primary" />
          <span>Spotify Playlist Importer</span>
        </h1>
        <p className="text-sm text-foreground-muted mt-1">
          Seamlessly migrate your Spotify playlists, albums, and liked songs to YouTube Music.
          Stream or download all tracks in one click.
        </p>
      </div>

      {/* Input Box */}
      <div className="bg-surface border border-border rounded-3xl p-6 shadow-xl space-y-4">
        <label className="text-xs font-bold text-foreground-muted uppercase tracking-wider block">
          Spotify Link (Playlist, Album, or Track)
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={spotifyUrl}
            onChange={(e) => setSpotifyUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleImport()}
            placeholder="e.g. https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
            className="flex-1 bg-surface-elevated border border-border focus:border-primary text-foreground placeholder:text-foreground-subtle text-sm rounded-2xl px-4 py-3.5 outline-none transition-all shadow-inner focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={handleImport}
            disabled={loading || !spotifyUrl.trim()}
            className="px-6 py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-sm shadow-lg shadow-primary/25 disabled:opacity-50 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            <span>{loading ? 'Matching Tracks...' : 'Import & Match'}</span>
          </button>
        </div>
      </div>

      {/* Imported Result View */}
      {importedData && (
        <div className="bg-surface border border-border rounded-3xl p-6 shadow-xl space-y-6 animate-fadeIn">
          {/* Saved to Library Status Banner */}
          {importedData.savedToLibrary && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Saved to My Playlists ({importedData.matchedCount} tracks ready in your Library)</span>
              </div>
              <button
                onClick={() => setActiveTab('library')}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition-all active:scale-95 shadow-sm"
              >
                Open in Library &gt;
              </button>
            </div>
          )}

          {/* Header Details */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
            <div className="flex items-center gap-4">
              {importedData.coverArt && (
                <img
                  src={importedData.coverArt}
                  alt=""
                  className="w-16 h-16 rounded-2xl object-cover shadow-lg border border-border"
                />
              )}
              <div>
                <h2 className="text-xl font-bold text-foreground">{importedData.title}</h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  {importedData.subtitle} • {importedData.matchedCount} of {importedData.totalTracks}{' '}
                  tracks matched on YouTube Music
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                onClick={() => setActiveTab('library')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-surface-elevated hover:bg-surface border border-border text-foreground font-bold text-xs transition-all hover:scale-105 active:scale-95"
              >
                <FolderHeart className="w-4 h-4 text-primary" />
                <span>My Playlists</span>
              </button>
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-md shadow-primary/20 transition-all hover:scale-105 active:scale-95"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Play All</span>
              </button>
              <button
                onClick={handleDownloadAll}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-surface-elevated hover:bg-surface-elevated/80 border border-border text-foreground font-bold text-xs transition-all hover:scale-105"
              >
                <Download className="w-4 h-4" />
                <span>Download (320k)</span>
              </button>
            </div>
          </div>

          {/* Tracks Table */}
          <div className="space-y-2">
            {importedData.tracks.map((track: any, idx: number) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  track.matched
                    ? 'bg-surface border-border hover:bg-surface-elevated'
                    : 'bg-surface/40 border-border/40 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono font-bold text-foreground-subtle w-6 text-center">
                    {idx + 1}
                  </span>
                  {track.thumbnail ? (
                    <img
                      src={track.thumbnail}
                      alt=""
                      className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center shrink-0">
                      <ListMusic className="w-4 h-4 text-foreground-muted" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-foreground truncate">
                      {track.title}
                    </h4>
                    <p className="text-xs text-foreground-muted truncate">{track.artist}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {track.matched ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Matched</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-foreground-subtle">Not Found</span>
                  )}

                  {track.matched && (
                    <button
                      onClick={() => playTrack(track)}
                      className="p-2 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all ml-1"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
