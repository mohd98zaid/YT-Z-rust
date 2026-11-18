import React, { useRef, useState } from 'react';
import { Sliders, X, RotateCcw, Power, Volume2, Sparkles } from 'lucide-react';
import { usePlayerStore, EQ_FREQUENCIES, EQ_PRESETS } from '../../stores/usePlayerStore';

export const EqualizerModal: React.FC = () => {
  const {
    isEqualizerOpen,
    toggleEqualizer,
    eqEnabled,
    toggleEq,
    eqPreset,
    eqBands,
    setEqBand,
    setEqPreset,
  } = usePlayerStore();

  if (!isEqualizerOpen) return null;

  const formatFreq = (freq: number) => {
    return freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
  };

  // Generate SVG path points for the frequency curve
  const svgWidth = 600;
  const svgHeight = 70;
  const zeroY = svgHeight / 2;
  const points = EQ_FREQUENCIES.map((_, idx) => {
    const x = (idx / (EQ_FREQUENCIES.length - 1)) * (svgWidth - 40) + 20;
    const gain = eqEnabled ? eqBands[idx] || 0 : 0;
    // gain -12..12 maps to (zeroY + 28) .. (zeroY - 28)
    const y = zeroY - (gain / 12) * (svgHeight / 2 - 8);
    return { x, y };
  });

  // Build smooth cubic bezier path through points
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    pathD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  const fillD = `${pathD} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none animate-fadeIn"
      onClick={toggleEqualizer}
    >
      <div
        className="bg-surface/95 border border-white/10 rounded-3xl p-6 w-full max-w-3xl shadow-2xl relative overflow-hidden backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-28 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/60 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base md:text-lg font-bold text-foreground tracking-tight">
                  10-Band Studio Equalizer
                </h3>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  DSP Pro
                </span>
              </div>
              <p className="text-xs text-foreground-muted">Hardware-accelerated Web Audio signal processing</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Master EQ Power Toggle */}
            <button
              onClick={toggleEq}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
                eqEnabled
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                  : 'bg-surface-elevated text-foreground-muted border-border hover:text-foreground'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{eqEnabled ? 'Active' : 'Bypassed'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={toggleEqualizer}
              className="p-2 rounded-full hover:bg-surface-elevated text-foreground-muted hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preset Selector Chips */}
        <div className="mt-4 flex flex-wrap gap-2 relative z-10">
          {Object.keys(EQ_PRESETS).map((pName) => {
            const isSelected = eqPreset === pName;
            return (
              <button
                key={pName}
                onClick={() => setEqPreset(pName)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                  isSelected
                    ? 'bg-primary text-white shadow-md shadow-primary/25 border border-primary/40'
                    : 'bg-surface-elevated/80 text-foreground-muted hover:text-foreground hover:bg-surface-elevated border border-border/60'
                }`}
              >
                {pName}
              </button>
            );
          })}
        </div>

        {/* Real-time Frequency Response Curve Visualizer */}
        <div className="mt-5 relative w-full h-[70px] bg-black/40 border border-white/5 rounded-2xl overflow-hidden px-2 flex items-center justify-center">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <defs>
              <linearGradient id="eqFillGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fa2d48" stopOpacity="0.35" />
                <stop offset="60%" stopColor="#fa2d48" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#fa2d48" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="eqStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ff4d6d" />
                <stop offset="50%" stopColor="#fa2d48" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
            </defs>

            {/* Reference grid lines: +12, 0, -12 */}
            <line x1="0" y1={zeroY} x2={svgWidth} y2={zeroY} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
            <line x1="0" y1="8" x2={svgWidth} y2="8" stroke="rgba(255,255,255,0.04)" />
            <line x1="0" y1={svgHeight - 8} x2={svgWidth} y2={svgHeight - 8} stroke="rgba(255,255,255,0.04)" />

            {/* Gradient Area Fill */}
            <path d={fillD} fill="url(#eqFillGrad)" />

            {/* Neon Spline Curve */}
            <path
              d={pathD}
              fill="none"
              stroke={eqEnabled ? 'url(#eqStrokeGrad)' : '#666'}
              strokeWidth="2.5"
              strokeLinecap="round"
              className="transition-all duration-150"
            />

            {/* Nodes */}
            {points.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r="3"
                className={`transition-all duration-150 ${eqEnabled ? 'fill-white stroke-primary' : 'fill-neutral-500 stroke-neutral-700'}`}
                strokeWidth="1.5"
              />
            ))}
          </svg>

          {/* Reference labels on the right edge */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col justify-between h-full py-1 text-[9px] font-mono text-foreground-subtle/50 pointer-events-none select-none">
            <span>+12dB</span>
            <span>0dB</span>
            <span>-12dB</span>
          </div>
        </div>

        {/* 10 Precision Studio Faders */}
        <div className="mt-5 grid grid-cols-10 gap-1 sm:gap-2 px-3 py-4 bg-surface-elevated/40 border border-white/5 rounded-2xl">
          {EQ_FREQUENCIES.map((freq, idx) => {
            const gain = eqBands[idx] || 0;
            return (
              <FaderBand
                key={freq}
                freq={freq}
                gain={gain}
                disabled={!eqEnabled}
                formatFreq={formatFreq}
                onChange={(newGain) => setEqBand(idx, newGain)}
              />
            );
          })}
        </div>

        {/* Footer info & controls */}
        <div className="mt-5 flex items-center justify-between text-xs text-foreground-muted pt-2 border-t border-border/40">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-foreground-subtle">Precision: ±12.0 dB (0.5 dB steps)</span>
            <span className="hidden sm:inline text-foreground-subtle/40">•</span>
            <span className="hidden sm:inline text-foreground-subtle text-[11px]">Tip: Double-click fader to zero</span>
          </div>

          <button
            onClick={() => setEqPreset('Flat')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated hover:bg-border/60 text-foreground-muted hover:text-foreground transition-all border border-border text-[11px] font-semibold"
          >
            <RotateCcw className="w-3 h-3 text-primary" />
            <span>Reset to Flat</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Studio Fader Channel Strip
interface FaderBandProps {
  freq: number;
  gain: number;
  disabled: boolean;
  formatFreq: (freq: number) => string;
  onChange: (gain: number) => void;
}

const FaderBand: React.FC<FaderBandProps> = ({ freq, gain, disabled, formatFreq, onChange }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateGain = (clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    // Top is +12 dB, bottom is -12 dB
    const relativeY = clientY - rect.top;
    const ratio = Math.max(0, Math.min(1, relativeY / rect.height));
    const rawGain = 12 - ratio * 24;
    // Snap to 0.5 dB
    const stepped = Math.round(rawGain * 2) / 2;
    onChange(Math.max(-12, Math.min(12, stepped)));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setIsDragging(true);
    calculateGain(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || disabled) return;
    calculateGain(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (disabled) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (disabled) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.5 : -0.5;
    const newGain = Math.max(-12, Math.min(12, Math.round((gain + delta) * 2) / 2));
    onChange(newGain);
  };

  const handleDoubleClick = () => {
    if (disabled) return;
    onChange(0);
  };

  // Convert -12..12 dB to percentage 0%..100% from bottom
  const percentFromBottom = ((gain + 12) / 24) * 100;

  // Active color highlights
  const isBoost = gain > 0;
  const isCut = gain < 0;

  return (
    <div
      className={`flex flex-col items-center justify-between select-none ${
        disabled ? 'opacity-40 pointer-events-none' : ''
      }`}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      title={`${formatFreq(freq)} Hz: ${gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)} dB (Double-click to reset)`}
    >
      {/* Gain Value Label */}
      <span
        className={`text-[10px] font-mono font-bold transition-colors ${
          isBoost
            ? 'text-primary'
            : isCut
            ? 'text-sky-400'
            : 'text-foreground-subtle'
        }`}
      >
        {gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}
      </span>

      {/* Fader Track Container */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-7 h-40 flex items-center justify-center cursor-pointer touch-none my-2 group"
      >
        {/* Track Groove */}
        <div className="w-1.5 h-full bg-neutral-900 border border-white/10 rounded-full relative overflow-hidden">
          {/* 0 dB Center Mark */}
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/30 -translate-y-1/2 z-10" />

          {/* Bipolar Dynamic Fill Bar from Center (50%) */}
          {isBoost && (
            <div
              className="absolute left-0 right-0 bg-gradient-to-t from-primary/60 to-primary rounded-t-full transition-all duration-75"
              style={{
                bottom: '50%',
                height: `${((gain) / 24) * 100}%`,
              }}
            />
          )}
          {isCut && (
            <div
              className="absolute left-0 right-0 bg-gradient-to-b from-sky-400 to-indigo-500 rounded-b-full transition-all duration-75"
              style={{
                top: '50%',
                height: `${((-gain) / 24) * 100}%`,
              }}
            />
          )}
        </div>

        {/* Tactile Studio Knob */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-6 h-5 rounded-md border flex items-center justify-center shadow-lg transition-transform duration-75 ${
            isDragging
              ? 'scale-115 border-primary shadow-primary/30 z-30 cursor-grabbing'
              : 'border-white/30 group-hover:border-white/60 hover:scale-105 z-20 cursor-grab'
          } bg-gradient-to-b from-neutral-700 via-neutral-800 to-neutral-900`}
          style={{
            bottom: `calc(${percentFromBottom}% - 10px)`,
          }}
        >
          {/* Center Indicator Notch */}
          <div
            className={`w-3.5 h-[2px] rounded-full transition-colors ${
              isBoost ? 'bg-primary' : isCut ? 'bg-sky-400' : 'bg-white/80'
            }`}
          />
        </div>
      </div>

      {/* Frequency Label */}
      <span className="text-[11px] font-bold text-foreground font-mono mt-1">
        {formatFreq(freq)}
      </span>
    </div>
  );
};