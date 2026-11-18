import { create } from 'zustand';
import { THEME_PRESETS } from '../themes/presets';
import { ThemePreset } from '../types';
import { api } from '../services/api';

interface ThemeState {
  currentThemeId: string;
  currentTheme: ThemePreset;
  setTheme: (themeId: string) => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentThemeId: 'apple-music',
  currentTheme: THEME_PRESETS[0],

  setTheme: (themeId: string) => {
    const found = THEME_PRESETS.find((t) => t.id === themeId) || THEME_PRESETS[0];
    set({ currentThemeId: found.id, currentTheme: found });
    localStorage.setItem('ytz_theme', found.id);
    applyThemeToDOM(found);
    api.updateConfig({ theme: found.id }).catch(() => {});
  },

  initTheme: () => {
    const saved = localStorage.getItem('ytz_theme') || 'apple-music';
    const found = THEME_PRESETS.find((t) => t.id === saved) || THEME_PRESETS[0];
    set({ currentThemeId: found.id, currentTheme: found });
    applyThemeToDOM(found);
  },
}));

function applyThemeToDOM(theme: ThemePreset) {
  const root = document.documentElement;
  const c = theme.colors;

  root.style.setProperty('--bg-main', c.bgMain);
  root.style.setProperty('--bg-surface', c.bgSurface);
  root.style.setProperty('--bg-elevated', c.bgElevated);
  root.style.setProperty('--bg-glass', c.bgGlass);
  root.style.setProperty('--border-color', c.borderColor);
  root.style.setProperty('--border-glass', c.borderGlass);
  root.style.setProperty('--text-main', c.textMain);
  root.style.setProperty('--text-muted', c.textMuted);
  root.style.setProperty('--text-subtle', c.textSubtle);
  root.style.setProperty('--primary', c.primary);
  root.style.setProperty('--primary-hover', c.primaryHover);
  root.style.setProperty('--accent', c.accent);
  root.style.setProperty('--accent-hover', c.accentHover);

  if (theme.category === 'Light') {
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
  }
}
