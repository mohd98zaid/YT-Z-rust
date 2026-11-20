import { create } from 'zustand';

export type LyricsFontFamily =
  | 'system'
  | 'dancing_script'
  | 'caveat'
  | 'pacifico'
  | 'playfair'
  | 'cinzel'
  | 'orbitron'
  | 'righteous'
  | 'comfortaa'
  | 'jetbrains';

export type LyricsBackgroundStyle =
  | 'mesh'
  | 'oled'
  | 'glass'
  | 'nebula'
  | 'velvet'
  | 'sunset'
  | 'aurora';

export type LyricsAlignment = 'center' | 'left' | 'right';
export type LyricsFontSize = 'compact' | 'standard' | 'large' | 'huge';
export type LyricsAnimationStyle = 'kinetic' | 'karaoke' | 'smooth';

export interface LyricsSettings {
  fontFamily: LyricsFontFamily;
  activeTextColor: string;
  glowColor: string;
  glowIntensity: 'none' | 'subtle' | 'radiant' | 'neon';
  backgroundStyle: LyricsBackgroundStyle;
  alignment: LyricsAlignment;
  fontSize: LyricsFontSize;
  animationStyle: LyricsAnimationStyle;
  inactiveOpacity: number;
}

export const FONT_OPTIONS: { id: LyricsFontFamily; name: string; preview: string; cssFamily: string }[] = [
  { id: 'system', name: 'Apple Music Sans', preview: 'Clean & Modern', cssFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Plus Jakarta Sans', sans-serif" },
  { id: 'dancing_script', name: 'Dancing Script', preview: 'Fancy Cursive', cssFamily: "'Dancing Script', cursive" },
  { id: 'caveat', name: 'Caveat Hand', preview: 'Artistic Handwritten', cssFamily: "'Caveat', cursive" },
  { id: 'pacifico', name: 'Pacifico Brush', preview: 'Smooth Vintage Brush', cssFamily: "'Pacifico', cursive" },
  { id: 'playfair', name: 'Playfair Luxury', preview: 'Editorial Luxury Serif', cssFamily: "'Playfair Display', serif" },
  { id: 'cinzel', name: 'Cinzel Classical', preview: 'Royal Trajan Serif', cssFamily: "'Cinzel', serif" },
  { id: 'orbitron', name: 'Orbitron Sci-Fi', preview: 'Futuristic Cyber Tech', cssFamily: "'Orbitron', sans-serif" },
  { id: 'righteous', name: 'Righteous Retro', preview: '80s Arcade Synth', cssFamily: "'Righteous', cursive" },
  { id: 'comfortaa', name: 'Comfortaa Rounded', preview: 'Soft Rounded Pill', cssFamily: "'Comfortaa', cursive" },
  { id: 'jetbrains', name: 'JetBrains Code', preview: 'Tech Monospace', cssFamily: "'JetBrains Mono', monospace" },
];

export const COLOR_PALETTE = [
  { name: 'Pure White', hex: '#ffffff', glow: 'rgba(255, 255, 255, 0.6)' },
  { name: 'Apple Red', hex: '#fa2d48', glow: 'rgba(250, 45, 72, 0.65)' },
  { name: 'Liquid Gold', hex: '#f59e0b', glow: 'rgba(245, 158, 11, 0.6)' },
  { name: 'Cyan Neon', hex: '#06b6d4', glow: 'rgba(6, 182, 212, 0.65)' },
  { name: 'Emerald Glow', hex: '#10b981', glow: 'rgba(16, 185, 129, 0.6)' },
  { name: 'Amethyst Violet', hex: '#a855f7', glow: 'rgba(168, 85, 247, 0.65)' },
  { name: 'Sunset Ember', hex: '#f97316', glow: 'rgba(249, 115, 22, 0.6)' },
  { name: 'Hot Magenta', hex: '#ec4899', glow: 'rgba(236, 72, 153, 0.65)' },
];

export const BACKGROUND_PRESETS: { id: LyricsBackgroundStyle; name: string; desc: string; bgClass: string }[] = [
  { id: 'mesh', name: 'Dynamic Album Mesh', desc: 'Organic fluid colors from album art', bgClass: 'bg-transparent' },
  { id: 'oled', name: 'OLED Pure Black', desc: 'Maximum contrast deep pitch black', bgClass: 'bg-[#000000]' },
  { id: 'glass', name: 'Frosted Glass', desc: 'Sleek frosted blur material', bgClass: 'bg-black/40 backdrop-blur-3xl' },
  { id: 'nebula', name: 'Cosmic Nebula', desc: 'Deep cosmic violet galaxy glow', bgClass: 'bg-gradient-to-b from-[#180a2a] via-[#0d091f] to-[#05030a]' },
  { id: 'velvet', name: 'Midnight Velvet', desc: 'Deep oceanic midnight blue', bgClass: 'bg-gradient-to-b from-[#0b1329] via-[#080d1c] to-[#04060c]' },
  { id: 'sunset', name: 'Crimson Sunset', desc: 'Rich warm embers & dusk gradient', bgClass: 'bg-gradient-to-b from-[#2e0e16] via-[#1a080d] to-[#0a0305]' },
  { id: 'aurora', name: 'Emerald Aurora', desc: 'Atmospheric deep northern lights', bgClass: 'bg-gradient-to-b from-[#06241a] via-[#03130d] to-[#020805]' },
];

const DEFAULT_SETTINGS: LyricsSettings = {
  fontFamily: 'system',
  activeTextColor: '#ffffff',
  glowColor: 'rgba(250, 45, 72, 0.55)',
  glowIntensity: 'radiant',
  backgroundStyle: 'mesh',
  alignment: 'center',
  fontSize: 'large',
  animationStyle: 'kinetic',
  inactiveOpacity: 0.45,
};

function loadSavedSettings(): LyricsSettings {
  try {
    const raw = localStorage.getItem('ytz_lyrics_settings');
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

interface LyricsSettingsState extends LyricsSettings {
  setFontFamily: (font: LyricsFontFamily) => void;
  setActiveTextColor: (color: string, glow?: string) => void;
  setGlowIntensity: (intensity: 'none' | 'subtle' | 'radiant' | 'neon') => void;
  setBackgroundStyle: (bg: LyricsBackgroundStyle) => void;
  setAlignment: (align: LyricsAlignment) => void;
  setFontSize: (size: LyricsFontSize) => void;
  setAnimationStyle: (anim: LyricsAnimationStyle) => void;
  setInactiveOpacity: (op: number) => void;
  resetDefaults: () => void;
}

export const useLyricsSettingsStore = create<LyricsSettingsState>((set, get) => ({
  ...loadSavedSettings(),

  setFontFamily: (fontFamily) => {
    set({ fontFamily });
    save(get());
  },
  setActiveTextColor: (activeTextColor, glow) => {
    const glowColor = glow || activeTextColor;
    set({ activeTextColor, glowColor });
    save(get());
  },
  setGlowIntensity: (glowIntensity) => {
    set({ glowIntensity });
    save(get());
  },
  setBackgroundStyle: (backgroundStyle) => {
    set({ backgroundStyle });
    save(get());
  },
  setAlignment: (alignment) => {
    set({ alignment });
    save(get());
  },
  setFontSize: (fontSize) => {
    set({ fontSize });
    save(get());
  },
  setAnimationStyle: (animationStyle) => {
    set({ animationStyle });
    save(get());
  },
  setInactiveOpacity: (inactiveOpacity) => {
    set({ inactiveOpacity });
    save(get());
  },
  resetDefaults: () => {
    set(DEFAULT_SETTINGS);
    save(DEFAULT_SETTINGS);
  },
}));

function save(state: LyricsSettings) {
  try {
    localStorage.setItem(
      'ytz_lyrics_settings',
      JSON.stringify({
        fontFamily: state.fontFamily,
        activeTextColor: state.activeTextColor,
        glowColor: state.glowColor,
        glowIntensity: state.glowIntensity,
        backgroundStyle: state.backgroundStyle,
        alignment: state.alignment,
        fontSize: state.fontSize,
        animationStyle: state.animationStyle,
        inactiveOpacity: state.inactiveOpacity,
      })
    );
  } catch {}
}
