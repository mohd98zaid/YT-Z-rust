import React, { useState, useEffect } from 'react';
import {
  Puzzle,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  Sliders,
  Mic2,
  Disc,
  Radio,
  ShieldCheck,
  Zap,
  Volume2,
  Search,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { PluginSource } from '../types';
import { usePlayerStore } from '../stores/usePlayerStore';

export const PluginsPage: React.FC = () => {
  const { audioQuality, setAudioQuality } = usePlayerStore();
  const [plugins, setPlugins] = useState<PluginSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State for Adding Custom Module
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<PluginSource['type']>('audio_source');
  const [newEndpoint, setNewEndpoint] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadPlugins = async () => {
    try {
      const data = await api.getPlugins();
      setPlugins(data || []);
    } catch (err) {
      console.error('Failed to load plugins', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlugins();
  }, []);

  const handleToggle = async (plugin: PluginSource) => {
    const nextState = !plugin.enabled;
    try {
      await api.togglePlugin(plugin.id, nextState);
      setPlugins((prev) =>
        prev.map((p) => (p.id === plugin.id ? { ...p, enabled: nextState } : p))
      );
    } catch (err) {
      console.error('Failed to toggle plugin', err);
    }
  };

  const handleTest = async (pluginId: string) => {
    setTestingId(pluginId);
    try {
      const res = await api.testPlugin(pluginId);
      setPlugins((prev) =>
        prev.map((p) =>
          p.id === pluginId
            ? { ...p, status: res.status, latency_ms: res.latency_ms }
            : p
        )
      );
    } catch (err) {
      console.error('Test plugin failed', err);
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (pluginId: string) => {
    if (!confirm('Are you sure you want to remove this module source?')) return;
    try {
      await api.deletePlugin(pluginId);
      setPlugins((prev) => prev.filter((p) => p.id !== pluginId));
    } catch (err) {
      console.error('Failed to delete plugin', err);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEndpoint.trim()) return;
    setFormSubmitting(true);
    try {
      await api.addPlugin({
        name: newName,
        type: newType,
        endpoint: newEndpoint,
        api_key: newApiKey,
        description: newDescription || 'Custom user module source',
      });
      setShowAddModal(false);
      setNewName('');
      setNewEndpoint('');
      setNewApiKey('');
      setNewDescription('');
      await loadPlugins();
    } catch (err) {
      console.error('Failed to add custom plugin', err);
    } finally {
      setFormSubmitting(false);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'audio_source':
        return <Disc className="w-5 h-5 text-indigo-400" />;
      case 'lyrics_source':
        return <Mic2 className="w-5 h-5 text-pink-400" />;
      case 'scrobbler':
        return <Radio className="w-5 h-5 text-purple-400" />;
      case 'audio_filter':
        return <Sliders className="w-5 h-5 text-emerald-400" />;
      default:
        return <ShieldCheck className="w-5 h-5 text-primary" />;
    }
  };

  const filteredPlugins = plugins.filter((p) => {
    const matchesType = filterType === 'all' || p.type === filterType;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto pb-28">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-extrabold border border-primary/30 mb-2">
            <Zap className="w-3.5 h-3.5" />
            <span>AUDIO ENGINE EXTENSIONS</span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            Pluggable Module Sources & Extensions
          </h1>
          <p className="text-sm text-foreground-muted mt-1 max-w-2xl">
            Configure external Hi-Res FLAC lossless modules, multi-provider lyrics engines,
            Discord Rich Presence, Last.fm scrobblers, and smart audio DSP filters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setLoading(true);
              loadPlugins();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-surface border border-border hover:bg-surface-elevated text-xs font-bold text-foreground transition-all hover:scale-105 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-lg shadow-primary/25 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Module Source</span>
          </button>
        </div>
      </div>

      {/* Hi-Res Lossless Audio Architecture Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-surface to-primary/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
            <Sparkles className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-foreground">Hi-Res Lossless Audio Architecture</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-foreground-muted mt-0.5 max-w-xl">
              Audio source add-ons resolve 16-bit / 24-bit bit-perfect FLAC audio via standardized JSON protocol (<code className="text-amber-400 font-mono text-[11px]">/search</code> &amp; <code className="text-amber-400 font-mono text-[11px]">/stream</code>). When offline or not found, playback automatically falls back to 256k YouTube Music Opus.
            </p>
          </div>
        </div>

        {/* Quality Preference Pill Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-elevated/80 border border-border rounded-2xl shrink-0">
          {[
            { id: 'lossless', label: 'Lossless FLAC' },
            { id: 'high', label: 'High (320k)' },
            { id: 'auto', label: 'Standard (Opus)' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setAudioQuality(mode.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                audioQuality === mode.id
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30 font-black'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All Modules' },
            { id: 'audio_source', label: 'Audio & FLAC' },
            { id: 'lyrics_source', label: 'Lyrics Providers' },
            { id: 'scrobbler', label: 'Scrobblers & RPC' },
            { id: 'audio_filter', label: 'Audio DSP' },
            { id: 'enhancement', label: 'Enhancements' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === tab.id
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-surface border border-border text-foreground-muted hover:text-foreground hover:bg-surface-elevated'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search modules..."
            className="w-full bg-surface border border-border focus:border-primary text-foreground placeholder:text-foreground-subtle text-xs rounded-xl pl-9 pr-3 py-2 outline-none transition-all"
          />
        </div>
      </div>

      {/* Module Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-foreground-muted">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Scanning module sources...</span>
        </div>
      ) : filteredPlugins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-foreground-muted">
          <Puzzle className="w-12 h-12 opacity-30 text-primary" />
          <p className="text-base font-semibold">No module sources match your query</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlugins.map((plugin) => {
            const isEnabled = Boolean(plugin.enabled);
            const isDegraded = plugin.status === 'degraded';
            return (
              <div
                key={plugin.id}
                className={`p-5 rounded-3xl border transition-all relative flex flex-col justify-between ${
                  isEnabled
                    ? 'bg-surface border-border hover:border-primary/40 shadow-lg'
                    : 'bg-surface/50 border-border/40 opacity-70'
                }`}
              >
                <div>
                  {/* Top Row: Icon + Type + Toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-surface-elevated flex items-center justify-center border border-border shadow-inner">
                        {getSourceIcon(plugin.type)}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-foreground-subtle">
                          {plugin.type.replace('_', ' ')}
                        </span>
                        <h3 className="font-bold text-sm text-foreground truncate max-w-[170px]">
                          {plugin.name}
                        </h3>
                      </div>
                    </div>

                    {/* Enable Toggle Switch */}
                    <button
                      onClick={() => handleToggle(plugin)}
                      className={`w-12 h-6 rounded-full p-1 transition-colors relative flex items-center ${
                        isEnabled ? 'bg-primary' : 'bg-surface-elevated border border-border'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          isEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-foreground-muted leading-relaxed line-clamp-3 mb-4">
                    {plugin.description}
                  </p>
                </div>

                {/* Bottom Row: Endpoint + Latency + Actions */}
                <div className="pt-3 border-t border-border/40 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-foreground-subtle">
                    <span className="truncate max-w-[150px] font-mono">{plugin.endpoint}</span>
                    <span
                      className={`flex items-center gap-1 font-mono font-bold ${
                        isDegraded ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                      {plugin.latency_ms > 0 ? `${plugin.latency_ms}ms` : 'Healthy'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleTest(plugin.id)}
                      disabled={testingId === plugin.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-surface-elevated hover:bg-border/60 text-[11px] font-bold text-foreground-muted hover:text-foreground transition-all"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${testingId === plugin.id ? 'animate-spin text-primary' : ''}`}
                      />
                      <span>{testingId === plugin.id ? 'Testing...' : 'Test Connection'}</span>
                    </button>

                    {!plugin.is_builtin && (
                      <button
                        onClick={() => handleDelete(plugin.id)}
                        title="Delete Module"
                        className="p-1.5 rounded-xl hover:bg-red-500/20 text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Custom Module Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative w-full max-w-md bg-surface border border-border rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Puzzle className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">Add Custom Module Source</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-foreground-muted hover:text-foreground text-xs font-bold"
              >
                Cancel
              </button>
            </div>

            {/* Quick Fill Presets */}
            <div className="mb-4 p-3 bg-surface-elevated/70 border border-border/80 rounded-2xl">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-foreground-subtle block mb-1.5">
                Quick Addon Presets
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewName('Unified Lossless Addon');
                    setNewType('audio_source');
                    setNewEndpoint('http://localhost:8080');
                    setNewDescription('Local self-hosted unified lossless audio addon.');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-border/80 hover:border-primary text-[11px] font-semibold text-foreground transition-all"
                >
                  Unified Addon (Local 8080)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewName('Hi-Res FLAC Lossless Module');
                    setNewType('audio_source');
                    setNewEndpoint('internal://lossless/engine');
                    setNewDescription('Bit-perfect 16-bit/44.1kHz and 24-bit/96kHz lossless FLAC decoding.');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-border/80 hover:border-primary text-[11px] font-semibold text-foreground transition-all"
                >
                  Native Lossless Audio Engine
                </button>
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Module Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. My Lossless FLAC Server"
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Module Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary"
                >
                  <option value="audio_source">Hi-Res Lossless Audio Source (FLAC/ALAC)</option>
                  <option value="lyrics_source">Lyrics Provider Engine</option>
                  <option value="scrobbler">Scrobbler / Rich Presence</option>
                  <option value="audio_filter">Audio DSP Filter</option>
                  <option value="enhancement">Playback Enhancement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Endpoint URL</label>
                <input
                  type="text"
                  required
                  value={newEndpoint}
                  onChange={(e) => setNewEndpoint(e.target.value)}
                  placeholder="https://api.my-music-source.org or internal://..."
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">API Key (Optional)</label>
                <input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="Bearer token or secret key"
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Description</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What does this module provide?"
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-foreground-muted hover:text-foreground hover:bg-surface-elevated"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/25 disabled:opacity-50"
                >
                  {formSubmitting ? 'Registering...' : 'Add Source'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
