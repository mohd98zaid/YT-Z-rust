import React, { useState, useEffect, useRef } from 'react';
import { Search, Sliders, Palette, X, Clock, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useThemeStore } from '../stores/useThemeStore';
import { usePlayerStore } from '../stores/usePlayerStore';

interface HeaderProps {
  onSearchSubmit: (query: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSearchSubmit,
  searchQuery,
  setSearchQuery,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const { currentTheme } = useThemeStore();
  const { toggleEqualizer, eqEnabled } = usePlayerStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadSearchHistory = async () => {
    try {
      const history = await api.getSearchHistory();
      setSearchHistory(history || []);
    } catch {}
  };

  useEffect(() => {
    loadSearchHistory();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      api.getSuggestions(searchQuery).then((res) => {
        setSuggestions(res || []);
      }).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerSearch = (query: string) => {
    const q = query.trim();
    if (!q) return;
    setShowDropdown(false);
    api.saveSearchQuery(q).then(() => loadSearchHistory()).catch(() => {});
    onSearchSubmit(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      triggerSearch(searchQuery);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    try {
      await api.deleteSearchQuery(item);
      loadSearchHistory();
    } catch {}
  };

  const handleClearAllHistory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteSearchQuery();
      setSearchHistory([]);
    } catch {}
  };

  const showRecentSearches = showDropdown && !searchQuery.trim() && searchHistory.length > 0;
  const showSuggestions = showDropdown && searchQuery.trim().length > 0 && suggestions.length > 0;

  return (
    <header className="h-16 border-b border-border bg-surface/90 backdrop-blur-md px-6 flex items-center justify-between relative z-30 shrink-0">
      {/* Search Input Bar with Autocomplete & Search History */}
      <div className="relative w-full max-w-xl z-40" ref={dropdownRef}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-foreground-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => {
              setShowDropdown(true);
              loadSearchHistory();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search songs, artists, albums, or paste YouTube/Spotify link..."
            className="w-full bg-surface-elevated border border-border focus:border-primary/50 text-foreground placeholder:text-foreground-subtle text-sm rounded-full pl-10 pr-9 py-2 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/20"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSuggestions([]);
              }}
              className="absolute right-3 p-0.5 rounded-full hover:bg-surface text-foreground-muted hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdown Menu (Recent Searches & Autocomplete) */}
        {(showRecentSearches || showSuggestions) && (
          <div
            className="absolute top-full left-0 right-0 mt-2 bg-surface-elevated border border-border/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.45)] py-2 z-50 backdrop-blur-2xl max-h-72 overflow-y-auto"
          >
            {/* Recent Searches */}
            {showRecentSearches && (
              <div>
                <div className="flex items-center justify-between px-4 py-1.5 text-[11px] font-bold text-foreground-subtle uppercase tracking-wider border-b border-border/40">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>Recent Searches</span>
                  </span>
                  <button
                    onClick={handleClearAllHistory}
                    className="hover:text-primary transition-colors cursor-pointer text-[10px] font-semibold"
                  >
                    Clear All
                  </button>
                </div>
                {searchHistory.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSearchQuery(item);
                      triggerSearch(item);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-primary/15 hover:text-primary text-sm text-foreground flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Clock className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                      <span className="truncate">{item}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteHistoryItem(e, item)}
                      title="Remove from history"
                      className="p-1 rounded-full text-foreground-subtle hover:text-foreground hover:bg-surface opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Autocomplete Suggestions */}
            {showSuggestions &&
              suggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSearchQuery(item);
                    triggerSearch(item);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-primary/15 hover:text-primary text-sm text-foreground flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                  <span className="truncate">{item}</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Header Quick Actions */}
      <div className="flex items-center gap-2 ml-4">
        {/* Equalizer Quick Toggle */}
        <button
          onClick={toggleEqualizer}
          title="10-Band Graphic Equalizer"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            eqEnabled
              ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
              : 'bg-surface-elevated text-foreground-muted border-border hover:text-foreground'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>EQ</span>
        </button>

        {/* Theme Indicator */}
        <div
          title={`Active Theme: ${currentTheme.name}`}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated border border-border text-xs text-foreground-muted font-medium"
        >
          <Palette className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline">{currentTheme.name}</span>
          <div
            className="w-3 h-3 rounded-full border border-white/20 shadow-sm"
            style={{ backgroundColor: currentTheme.colors.primary }}
          />
        </div>
      </div>
    </header>
  );
};
