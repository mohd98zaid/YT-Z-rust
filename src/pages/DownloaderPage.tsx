import React, { useState, useEffect } from 'react';
import {
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Folder,
  Trash2,
  RotateCcw,
  Sparkles,
  FileVideo,
  FileAudio,
  ListPlus,
  Layers,
  Pause,
} from 'lucide-react';
import { api } from '../services/api';
import { DownloadItem } from '../types';
import { useDownloadStore } from '../stores/useDownloadStore';
import { usePlayerStore } from '../stores/usePlayerStore';

export const DownloaderPage: React.FC = () => {
  const { queue, history, fetchQueue, fetchHistory, cancelDownload, retryDownload, deleteDownload, clearCompleted } =
    useDownloadStore();
  const { playTrack } = usePlayerStore();

  const [inputUrl, setInputUrl] = useState('');
  const [downloadType, setDownloadType] = useState<'audio' | 'video'>('audio');
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [audioQuality, setAudioQuality] = useState('320');
  const [videoQuality, setVideoQuality] = useState('1080p');
  const [videoFormat, setVideoFormat] = useState('mp4');

  const [inspecting, setInspecting] = useState(false);
  const [inspectedData, setInspectedData] = useState<any | null>(null);
  const [selectedPlaylistItems, setSelectedPlaylistItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchQueue();
    fetchHistory();
  }, [fetchQueue, fetchHistory]);

  const handleInspect = async () => {
    if (!inputUrl.trim()) return;
    setInspecting(true);
    setInspectedData(null);
    try {
      const data = await api.inspectUrl(inputUrl.trim());
      setInspectedData(data);
      if (data.is_playlist && data.entries) {
        setSelectedPlaylistItems(new Set(data.entries.map((e: any) => e.id)));
      }
    } catch (err: any) {
      alert(`Could not inspect URL: ${err.message}`);
    } finally {
      setInspecting(false);
    }
  };

  const handleStartDownload = async () => {
    if (!inputUrl.trim()) return;

    if (inspectedData?.is_playlist) {
      // Batch download selected playlist entries
      const entriesToDownload = inspectedData.entries.filter((e: any) =>
        selectedPlaylistItems.has(e.id)
      );
      const batchItems = entriesToDownload.map((e: any) => ({
        url: e.url || `https://www.youtube.com/watch?v=${e.id}`,
        download_type: downloadType,
        format: downloadType === 'audio' ? audioFormat : videoFormat,
        quality: downloadType === 'audio' ? audioQuality : videoQuality,
        title: e.title,
        artist: e.uploader || '',
      }));
      await api.batchQueue(batchItems);
      fetchQueue();
      setInspectedData(null);
      setInputUrl('');
    } else {
      // Single download
      await api.queueDownload({
        url: inputUrl.trim(),
        download_type: downloadType,
        format: downloadType === 'audio' ? audioFormat : videoFormat,
        quality: downloadType === 'audio' ? audioQuality : videoQuality,
        title: inspectedData?.title,
        artist: inspectedData?.uploader,
        thumbnail: inspectedData?.thumbnail,
      });
      fetchQueue();
      setInspectedData(null);
      setInputUrl('');
    }
  };

  const handleOpenFolder = async (path?: string | null) => {
    if (!path) return;
    try {
      await api.openExplorer(path);
    } catch (err) {
      console.error('Failed to open explorer', err);
    }
  };

  const handlePlayDownloaded = (item: DownloadItem) => {
    if (!item.file_path) return;
    playTrack({
      id: item.id,
      videoId: item.id,
      title: item.title,
      artist: item.artist || 'Local Download',
      duration: item.eta || '',
      durationSeconds: item.duration || 0,
      thumbnail: item.thumbnail,
      isLocal: true,
      filePath: item.file_path,
    });
  };

  const toggleSelectPlaylistItem = (id: string) => {
    const next = new Set(selectedPlaylistItems);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedPlaylistItems(next);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto pb-40 md:pb-28">
      {/* Downloader Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <Download className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            <span>Industrial Downloader</span>
          </h1>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Concurrent queue powered by yt-dlp. Download YouTube & YT Music audio (320k MP3, FLAC) & video up to 4K.
          </p>
        </div>

        {/* Quick Type Switcher: Audio vs Video */}
        <div className="flex items-center gap-1.5 p-1 rounded-full liquid-glass">
          <button
            onClick={() => setDownloadType('audio')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs transition-all ${
              downloadType === 'audio'
                ? 'liquid-glass-pill-active'
                : 'liquid-glass-pill-inactive'
            }`}
          >
            <FileAudio className="w-4 h-4" />
            <span>Audio (MP3 / FLAC)</span>
          </button>
          <button
            onClick={() => setDownloadType('video')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs transition-all ${
              downloadType === 'video'
                ? 'liquid-glass-pill-active'
                : 'liquid-glass-pill-inactive'
            }`}
          >
            <FileVideo className="w-4 h-4" />
            <span>Video (4K / 1080p)</span>
          </button>
        </div>
      </div>

      {/* Main Input Workstation Box */}
      <div className="liquid-glass-card rounded-3xl p-6 shadow-xl space-y-6 border border-white/12">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInspect()}
            placeholder="Paste YouTube, YouTube Music, or Playlist link (e.g. https://www.youtube.com/watch?v=...)"
            className="flex-1 liquid-glass-input text-sm rounded-xl px-4 py-3 outline-none"
          />
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleInspect}
              disabled={inspecting || !inputUrl.trim()}
              className="px-5 py-3 rounded-xl liquid-glass-control text-foreground font-bold text-sm disabled:opacity-50 transition-all"
            >
              {inspecting ? 'Inspecting...' : 'Inspect URL'}
            </button>
            <button
              onClick={handleStartDownload}
              disabled={!inputUrl.trim()}
              className="px-6 py-3 rounded-xl liquid-glass-prominent font-bold text-sm disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
            >
              Start Download
            </button>
          </div>
        </div>

        {/* Options Row */}
        <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-white/10 text-xs">
          {downloadType === 'audio' ? (
            <>
              {/* Audio Format */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground-muted">Format:</span>
                {['mp3', 'flac', 'm4a', 'opus', 'wav'].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setAudioFormat(fmt)}
                    className={`px-3 py-1 rounded-full uppercase font-bold text-[11px] transition-all ${
                      audioFormat === fmt
                        ? 'liquid-glass-pill-active'
                        : 'liquid-glass-pill-inactive'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>

              {/* Audio Quality */}
              {audioFormat === 'mp3' && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground-muted">Bitrate:</span>
                  {['320', '256', '192', '128'].map((q) => (
                    <button
                      key={q}
                      onClick={() => setAudioQuality(q)}
                      className={`px-3 py-1 rounded-full font-bold text-[11px] transition-all ${
                        audioQuality === q
                          ? 'liquid-glass-pill-active'
                          : 'liquid-glass-pill-inactive'
                      }`}
                    >
                      {q}k
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Video Quality */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground-muted">Quality:</span>
                {['4K', '1440p', '1080p', '720p', '480p'].map((vq) => (
                  <button
                    key={vq}
                    onClick={() => setVideoQuality(vq)}
                    className={`px-3 py-1 rounded-full font-bold text-[11px] transition-all ${
                      videoQuality === vq
                        ? 'liquid-glass-pill-active'
                        : 'liquid-glass-pill-inactive'
                    }`}
                  >
                    {vq}
                  </button>
                ))}
              </div>

              {/* Video Container */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground-muted">Container:</span>
                {['mp4', 'mkv'].map((vf) => (
                  <button
                    key={vf}
                    onClick={() => setVideoFormat(vf)}
                    className={`px-3 py-1.5 rounded-xl uppercase font-bold text-[11px] transition-all ${
                      videoFormat === vf
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-surface-elevated text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    {vf}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Inspected Playlist Preview Box */}
        {inspectedData && inspectedData.is_playlist && (
          <div className="mt-4 p-5 rounded-2xl bg-surface-elevated/60 border border-border space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  Playlist: {inspectedData.title}
                </h4>
                <p className="text-xs text-foreground-muted">
                  {selectedPlaylistItems.size} of {inspectedData.count} items selected
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setSelectedPlaylistItems(new Set(inspectedData.entries.map((e: any) => e.id)))
                  }
                  className="px-3 py-1 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-elevated"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedPlaylistItems(new Set())}
                  className="px-3 py-1 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-elevated"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {inspectedData.entries.map((item: any, idx: number) => {
                const isSelected = selectedPlaylistItems.has(item.id);
                return (
                  <div
                    key={item.id || idx}
                    onClick={() => toggleSelectPlaylistItem(item.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary/10 border border-primary/30 text-foreground'
                        : 'bg-surface/50 border border-border/50 text-foreground-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded accent-primary"
                      />
                      <span className="font-semibold truncate">{item.title}</span>
                    </div>
                    <span className="font-mono shrink-0">{item.uploader || ''}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Active Downloads Queue */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <span>Active Queue ({queue.length})</span>
          </div>
        </h2>

        {queue.length === 0 ? (
          <div className="liquid-glass-card rounded-2xl p-8 text-center text-foreground-muted space-y-1">
            <Download className="w-8 h-8 opacity-30 text-primary mx-auto mb-2" />
            <p className="text-sm font-semibold">Queue is empty</p>
            <p className="text-xs text-foreground-subtle">Enter a URL above to start downloading.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((item) => (
              <div
                key={item.id}
                className="liquid-glass-card rounded-2xl p-4 shadow-md space-y-3 border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-surface-elevated flex items-center justify-center shrink-0">
                        <Download className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-foreground truncate">{item.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-foreground-muted mt-0.5">
                        <span className="uppercase font-bold text-primary">{item.format}</span>
                        <span>•</span>
                        <span>{item.quality}</span>
                        <span>•</span>
                        <span className="capitalize">{item.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right font-mono text-xs text-foreground-muted">
                      <p className="font-bold text-foreground">{item.speed}</p>
                      <p>ETA {item.eta}</p>
                    </div>
                    <button
                      onClick={() => cancelDownload(item.id)}
                      className="p-2 rounded-xl bg-surface-elevated hover:bg-red-500/10 hover:text-red-400 text-foreground-muted transition-colors"
                      title="Cancel download"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-surface-elevated h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Completed History Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Completed Downloads ({history.length})</span>
          </h2>
          {history.length > 0 && (
            <button
              onClick={clearCompleted}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated border border-border text-xs text-foreground-muted hover:text-foreground transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Finished</span>
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center text-foreground-muted">
            <p className="text-sm font-semibold">No downloaded history yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-surface border border-border hover:bg-surface-elevated/60 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="w-11 h-11 rounded-xl object-cover shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-surface-elevated flex items-center justify-center shrink-0">
                      <FileAudio className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-foreground truncate">{item.title}</h4>
                    <p className="text-xs text-foreground-muted truncate">
                      {item.artist || 'Downloaded Media'} •{' '}
                      {item.file_size > 0
                        ? `${(item.file_size / (1024 * 1024)).toFixed(1)} MB`
                        : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Status Indicator */}
                  {item.status === 'completed' ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Completed
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                      {item.status}
                    </span>
                  )}

                  {/* Play in YT-Z Player button */}
                  {item.status === 'completed' && item.file_path && (
                    <button
                      onClick={() => handlePlayDownloaded(item)}
                      title="Play in YT-Z Player"
                      className="p-2 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>
                  )}

                  {/* Open in Windows Explorer */}
                  {item.file_path && (
                    <button
                      onClick={() => handleOpenFolder(item.file_path)}
                      title="Show in Windows Explorer"
                      className="p-2 rounded-xl bg-surface-elevated hover:bg-surface-elevated/80 text-foreground-muted hover:text-foreground transition-colors"
                    >
                      <Folder className="w-4 h-4" />
                    </button>
                  )}

                  {/* Retry button if failed */}
                  {item.status !== 'completed' && (
                    <button
                      onClick={() => retryDownload(item.id)}
                      title="Retry Download"
                      className="p-2 rounded-xl bg-surface-elevated hover:bg-surface-elevated/80 text-foreground-muted hover:text-foreground transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete from history */}
                  <button
                    onClick={() => deleteDownload(item.id)}
                    title="Remove from history"
                    className="p-2 rounded-xl hover:bg-red-500/10 hover:text-red-400 text-foreground-muted transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
