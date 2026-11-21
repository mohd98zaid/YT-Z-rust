import React, { useEffect, useState } from 'react';
import { Compass, Trophy, Flame, Play, Download, Video } from 'lucide-react';
import { api } from '../services/api';
import { Track } from '../types';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useDownloadStore } from '../stores/useDownloadStore';
import { useNavigationStore } from '../stores/useNavigationStore';

export const ExplorePage: React.FC = () => {
  const [charts, setCharts] = useState<{ songs: Track[]; videos: Track[]; artists: any[] }>({
    songs: [],
    videos: [],
    artists: [],
  });
  const [moodCategories, setMoodCategories] = useState<Record<string, any[]>>({});
  const [selectedMoodPlaylists, setSelectedMoodPlaylists] = useState<any[]>([]);
  const [activeMoodTitle, setActiveMoodTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const { playTrack, setExpanded, setVideoMode } = usePlayerStore();
  const { queueDownload } = useDownloadStore();

  useEffect(() => {
    Promise.all([api.getCharts(), api.getMoodCategories()]).then(([chartsData, moodsData]) => {
      setCharts(chartsData);
      setMoodCategories(moodsData);
      setLoading(false);
    }).catch((err) => {
      console.error('Failed to load explore data', err);
      setLoading(false);
    });
  }, []);

  const handleSelectMood = async (title: string, params: string) => {
    setActiveMoodTitle(title);
    try {
      const playlists = await api.getMoodPlaylists(params);
      setSelectedMoodPlaylists(playlists || []);
    } catch (err) {
      console.error('Failed to load mood playlists', err);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-foreground-muted">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold">Loading Charts & Moods...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 md:space-y-10 max-w-7xl mx-auto pb-40 md:pb-28">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <Compass className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            <span>Explore & Charts</span>
          </h1>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Global charts, trending music videos, top artists, and curated moods.
          </p>
        </div>
      </div>

      {/* Top Charts Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Top Charts</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Top Songs */}
          <div className="liquid-glass-card rounded-3xl p-5 sm:p-6 shadow-xl border border-white/12 flex flex-col">
            <h3 className="font-extrabold text-base text-foreground mb-4 flex items-center justify-between">
              <span>Top Songs</span>
              <span className="text-xs text-primary font-semibold">US / Global</span>
            </h3>
            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-96 pr-1">
              {charts.songs.slice(0, 10).map((song, idx) => (
                <div
                  key={song.id || idx}
                  onClick={() => playTrack(song, charts.songs)}
                  className="liquid-glass-row flex items-center justify-between p-2 rounded-xl cursor-pointer group transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-bold font-mono text-foreground-subtle w-4 text-center group-hover:text-primary">
                      {idx + 1}
                    </span>
                    <img
                      src={song.thumbnail}
                      alt=""
                      className="w-11 h-11 rounded-xl object-cover shrink-0 shadow-md"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {song.title}
                      </p>
                      <p className="text-xs text-foreground-muted truncate">{song.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDownload(e, song)}
                      className="p-1.5 rounded-full hover:bg-white/10 text-foreground-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Download 320k"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono text-foreground-subtle">{song.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Music Videos */}
          <div className="liquid-glass-card rounded-3xl p-5 sm:p-6 shadow-xl border border-white/12 flex flex-col">
            <h3 className="font-extrabold text-base text-foreground mb-4 flex items-center justify-between">
              <span>Top Music Videos</span>
              <span className="text-xs text-primary font-semibold">Trending</span>
            </h3>
            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-96 pr-1">
              {charts.videos.slice(0, 10).map((video, idx) => (
                <div
                  key={video.id || idx}
                  onClick={() => {
                    useNavigationStore.getState().navigateToYouTube({
                      id: video.videoId || video.id,
                      title: video.title,
                      artist: video.artist || 'YouTube',
                    });
                  }}
                  className="liquid-glass-row flex items-center justify-between p-2 rounded-xl cursor-pointer group transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-bold font-mono text-foreground-subtle w-4 text-center group-hover:text-primary">
                      {idx + 1}
                    </span>
                    <div className="relative w-11 h-11 shrink-0">
                      <img
                        src={video.thumbnail}
                        alt=""
                        className="w-full h-full rounded-xl object-cover shadow-md"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity">
                        <Video className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {video.title}
                      </p>
                      <p className="text-xs text-foreground-muted truncate">{video.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        useNavigationStore.getState().navigateToYouTube({
                          id: video.videoId || video.id,
                          title: video.title,
                          artist: video.artist || 'YouTube',
                        });
                      }}
                      className="p-1.5 rounded-full hover:bg-white/10 text-foreground-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Watch Video"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDownload(e, video)}
                      className="p-1.5 rounded-full hover:bg-white/10 text-foreground-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Download 320k"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono text-foreground-subtle">{video.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Artists */}
          <div className="liquid-glass-card rounded-3xl p-5 sm:p-6 shadow-xl border border-white/12 flex flex-col">
            <h3 className="font-extrabold text-base text-foreground mb-4 flex items-center justify-between">
              <span>Top Artists</span>
              <span className="text-xs text-primary font-semibold">Rankings</span>
            </h3>
            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-96 pr-1">
              {charts.artists.slice(0, 10).map((artist, idx) => (
                <div
                  key={artist.id || idx}
                  className="liquid-glass-row flex items-center justify-between p-2 rounded-xl group transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-bold font-mono text-foreground-subtle w-4 text-center group-hover:text-primary">
                      {idx + 1}
                    </span>
                    <img
                      src={artist.thumbnail}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover shrink-0 shadow-md border border-white/15"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{artist.name}</p>
                      <p className="text-xs text-foreground-muted truncate">
                        {artist.subscribers || 'Artist'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Moods & Genres Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-primary" />
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Moods & Genres</h2>
        </div>

        {/* Mood Chips */}
        <div className="space-y-6">
          {Object.entries(moodCategories).map(([categoryName, items]) => (
            <div key={categoryName} className="space-y-3">
              <h4 className="text-xs font-black text-foreground-muted uppercase tracking-wider">
                {categoryName}
              </h4>
              <div className="flex flex-wrap gap-2">
                {items.map((item: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectMood(item.title, item.params)}
                    className={`px-4 py-1.5 rounded-full text-xs transition-all ${
                      activeMoodTitle === item.title
                        ? 'liquid-glass-pill-active scale-105'
                        : 'liquid-glass-pill-inactive'
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Selected Mood Playlists Preview */}
        {selectedMoodPlaylists.length > 0 && (
          <div className="mt-8 space-y-4 animate-fadeIn">
            <h3 className="text-lg font-bold text-foreground">
              {activeMoodTitle} Playlists
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {selectedMoodPlaylists.map((pl: any, idx: number) => (
                <div
                  key={idx}
                  onClick={async () => {
                    const id = pl.id || pl.browseId || pl.playlistId;
                    if (id) {
                      try {
                        let data = await api.getPlaylist(id);
                        if (!data || !data.tracks || data.tracks.length === 0) {
                          data = await api.getAlbum(id);
                        }
                        if (data && data.tracks && data.tracks.length > 0) {
                          playTrack(data.tracks[0], data.tracks);
                        }
                      } catch (err) {
                        console.error('Failed to play mood playlist', err);
                      }
                    }
                  }}
                  className="liquid-glass-card rounded-2xl p-3 flex flex-col justify-between hover:border-white/30 hover:-translate-y-1 transition-all shadow-md group cursor-pointer"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-2.5 bg-black/40">
                    <img
                      src={pl.thumbnail}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="w-10 h-10 rounded-full liquid-glass-prominent flex items-center justify-center text-white shadow-lg">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {pl.title}
                    </h4>
                    <p className="text-xs text-foreground-muted truncate">{pl.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
