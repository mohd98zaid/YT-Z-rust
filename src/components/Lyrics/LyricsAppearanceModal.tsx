import React, { useState } from 'react';
import {
  X,
  Type,
  Palette,
  Sparkles,
  Layers,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Sliders,
  Check,
  RotateCcw,
} from 'lucide-react';
import {
  useLyricsSettingsStore,
  FONT_OPTIONS,
  COLOR_PALETTE,
  BACKGROUND_PRESETS,
  LyricsFontFamily,
  LyricsBackgroundStyle,
  LyricsAlignment,
  LyricsFontSize,
  LyricsAnimationStyle,
} from '../../stores/useLyricsSettingsStore';

interface LyricsAppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LyricsAppearanceModal: React.FC<LyricsAppearanceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    fontFamily,
    setFontFamily,
    activeTextColor,
    setActiveTextColor,
    glowIntensity,
    setGlowIntensity,
    backgroundStyle,
    setBackgroundStyle,
    alignment,
    setAlignment,
    fontSize,
    setFontSize,
    animationStyle,
    setAnimationStyle,
    inactiveOpacity,
    setInactiveOpacity,
    resetDefaults,
  } = useLyricsSettingsStore();

  const [activeTab, setActiveTab] = useState<'font' | 'color' | 'background' | 'layout'>('font');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-3 sm:p-6 select-none animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl max-h-[88vh] bg-[#14151c]/95 dark:bg-[#0c0d14]/95 border border-white/15 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden z-10 animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/20 text-primary border border-primary/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white tracking-tight">Lyrics Appearance & Style</h3>
              <p className="text-[11px] text-white/50">Fancy fonts, custom colors, backgrounds & animations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetDefaults}
              title="Reset to default Apple Music styling"
              className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 px-6 pt-3 pb-2 border-b border-white/5 shrink-0 overflow-x-auto">
          {[
            { id: 'font', label: 'Fancy Fonts', icon: Type },
            { id: 'color', label: 'Colors & Glow', icon: Palette },
            { id: 'background', label: 'Backgrounds', icon: Layers },
            { id: 'layout', label: 'Appearance', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 ${
                  isSelected
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body / Tab Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: FONT OPTIONS */}
          {activeTab === 'font' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-white/70 uppercase tracking-wider">
                Select Lyrics Typography
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {FONT_OPTIONS.map((f) => {
                  const isSelected = fontFamily === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFontFamily(f.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98] relative overflow-hidden ${
                        isSelected
                          ? 'bg-primary/20 border-primary shadow-lg shadow-primary/20'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white/90">{f.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                      <div
                        className="text-lg text-white font-bold tracking-tight truncate pt-1"
                        style={{ fontFamily: f.cssFamily }}
                      >
                        {f.preview}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: COLORS & GLOW */}
          {activeTab === 'color' && (
            <div className="space-y-6">
              {/* Active Lyric Text Color */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-white/70 uppercase tracking-wider">
                  Active Lyric Color & Glow
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                  {COLOR_PALETTE.map((c) => {
                    const isSelected = activeTextColor.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.hex}
                        onClick={() => setActiveTextColor(c.hex, c.glow)}
                        className={`h-11 rounded-2xl flex items-center justify-center transition-all active:scale-95 border relative ${
                          isSelected ? 'border-white scale-105 shadow-lg' : 'border-white/15 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      >
                        {isSelected && (
                          <Check
                            className={`w-4 h-4 ${
                              c.hex === '#ffffff' ? 'text-black' : 'text-white'
                            } font-black`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Color Input */}
                <div className="flex items-center gap-3 pt-2 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <input
                    type="color"
                    value={activeTextColor}
                    onChange={(e) => setActiveTextColor(e.target.value)}
                    className="w-9 h-9 rounded-xl border border-white/20 bg-transparent cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-white block">Custom Hex Color</span>
                    <span className="text-[11px] font-mono text-white/50">{activeTextColor}</span>
                  </div>
                </div>
              </div>

              {/* Glow Intensity */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-white/70 uppercase tracking-wider">
                  Ambient Glow Intensity
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'none', label: 'Off' },
                    { id: 'subtle', label: 'Subtle' },
                    { id: 'radiant', label: 'Radiant' },
                    { id: 'neon', label: 'Neon' },
                  ].map((g) => {
                    const isSelected = glowIntensity === g.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setGlowIntensity(g.id as any)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/30'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
                        }`}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Inactive Lines Opacity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white/70 uppercase tracking-wider">
                  <span>Inactive Lines Dimming</span>
                  <span className="font-mono text-white">{Math.round(inactiveOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="0.80"
                  step="0.05"
                  value={inactiveOpacity}
                  onChange={(e) => setInactiveOpacity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>
          )}

          {/* TAB 3: BACKGROUNDS */}
          {activeTab === 'background' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-white/70 uppercase tracking-wider">
                Lyrics Canvas Backdrop
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {BACKGROUND_PRESETS.map((bg) => {
                  const isSelected = backgroundStyle === bg.id;
                  return (
                    <button
                      key={bg.id}
                      onClick={() => setBackgroundStyle(bg.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98] relative overflow-hidden ${
                        isSelected
                          ? 'bg-primary/20 border-primary shadow-lg shadow-primary/20'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{bg.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                      <p className="text-[11px] text-white/50">{bg.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: LAYOUT, ALIGNMENT & ANIMATION */}
          {activeTab === 'layout' && (
            <div className="space-y-6">
              {/* Text Alignment */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-white/70 uppercase tracking-wider">
                  Lyrics Alignment
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'left', label: 'Left', icon: AlignLeft },
                    { id: 'center', label: 'Center', icon: AlignCenter },
                    { id: 'right', label: 'Right', icon: AlignRight },
                  ].map((al) => {
                    const Icon = al.icon;
                    const isSelected = alignment === al.id;
                    return (
                      <button
                        key={al.id}
                        onClick={() => setAlignment(al.id as any)}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/30'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{al.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font Size */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-white/70 uppercase tracking-wider">
                  Lyrics Text Size
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'compact', label: 'Compact' },
                    { id: 'standard', label: 'Standard' },
                    { id: 'large', label: 'Large' },
                    { id: 'huge', label: 'Stage' },
                  ].map((sz) => {
                    const isSelected = fontSize === sz.id;
                    return (
                      <button
                        key={sz.id}
                        onClick={() => setFontSize(sz.id as any)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/30'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
                        }`}
                      >
                        {sz.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Animation Appearance Style */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-white/70 uppercase tracking-wider">
                  How Lyrics Appear & Transition
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'kinetic', title: 'Apple Music Kinetic', desc: 'Dynamic scale, word glow & spring fluid scrolling' },
                    { id: 'karaoke', title: 'Karaoke Progressive Sweep', desc: 'Smooth letter-by-letter vocal fill with active bounce' },
                    { id: 'smooth', title: 'Minimalist Smooth Fade', desc: 'Clean opacity transitions without text resizing' },
                  ].map((anim) => {
                    const isSelected = animationStyle === anim.id;
                    return (
                      <button
                        key={anim.id}
                        onClick={() => setAnimationStyle(anim.id as any)}
                        className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.99] flex items-center justify-between ${
                          isSelected
                            ? 'bg-primary/20 border-primary shadow-md shadow-primary/25'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-white">{anim.title}</div>
                          <div className="text-[11px] text-white/50 mt-0.5">{anim.desc}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-white/50">Changes apply instantly to live lyrics</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/30 active:scale-95 transition-all"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
