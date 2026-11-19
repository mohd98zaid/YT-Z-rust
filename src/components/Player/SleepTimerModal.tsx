import React, { useState } from 'react';
import { Timer, Clock, Check, X, Sliders } from 'lucide-react';
import { usePlayerStore } from '../../stores/usePlayerStore';

export const SleepTimerModal: React.FC = () => {
  const {
    isSleepTimerOpen,
    toggleSleepTimer,
    sleepTimerMinutes,
    sleepTimerRemaining,
    sleepTimerStopAfterTrack,
    setSleepTimer,
  } = usePlayerStore();

  const isCurrentCustom =
    sleepTimerMinutes !== null && ![15, 30, 45, 60].includes(sleepTimerMinutes);

  const [isCustomMode, setIsCustomMode] = useState(isCurrentCustom);
  const [customMinutes, setCustomMinutes] = useState(
    isCurrentCustom && sleepTimerMinutes ? sleepTimerMinutes : 20
  );

  if (!isSleepTimerOpen) return null;

  const presets = [
    { label: '15 Minutes', minutes: 15 },
    { label: '30 Minutes', minutes: 30 },
    { label: '45 Minutes', minutes: 45 },
    { label: '1 Hour', minutes: 60 },
  ];

  const formatRemaining = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm bg-surface border border-border rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Sleep Timer</h3>
              <p className="text-xs text-foreground-muted">Gently pause playback when time ends</p>
            </div>
          </div>
          <button
            onClick={toggleSleepTimer}
            className="p-1.5 rounded-full hover:bg-surface-elevated text-foreground-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Active Countdown Status */}
        {(sleepTimerRemaining !== null || sleepTimerStopAfterTrack) && (
          <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Clock className="w-4 h-4 animate-spin-slow" />
              <span>
                {sleepTimerStopAfterTrack
                  ? 'Pausing at end of current track'
                  : `Stopping in ${formatRemaining(sleepTimerRemaining || 0)}`}
              </span>
            </div>
            <button
              onClick={() => setSleepTimer(null)}
              className="text-xs font-semibold text-foreground-muted hover:text-foreground underline ml-2"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Preset Selection Buttons */}
        <div className="space-y-2">
          {presets.map((preset) => {
            const isSelected = sleepTimerMinutes === preset.minutes;
            return (
              <button
                key={preset.minutes}
                onClick={() => {
                  setSleepTimer(preset.minutes);
                  toggleSleepTimer();
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                  isSelected
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-surface-elevated hover:bg-surface-elevated/80 text-foreground border border-border/60'
                }`}
              >
                <span>{preset.label}</span>
                {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
              </button>
            );
          })}

          {/* End of Track Option */}
          <button
            onClick={() => {
              setSleepTimer(null, true);
              toggleSleepTimer();
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
              sleepTimerStopAfterTrack
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-surface-elevated hover:bg-surface-elevated/80 text-foreground border border-border/60'
            }`}
          >
            <span>End of this track</span>
            {sleepTimerStopAfterTrack && <Check className="w-4 h-4 stroke-[3]" />}
          </button>

          {/* Custom Duration Option */}
          {!isCustomMode ? (
            <button
              onClick={() => setIsCustomMode(true)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                isCurrentCustom
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-surface-elevated hover:bg-surface-elevated/80 text-foreground border border-border/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 opacity-70" />
                <span>
                  {isCurrentCustom
                    ? `Custom (${sleepTimerMinutes} Minutes)`
                    : 'Custom Duration...'}
                </span>
              </div>
              {isCurrentCustom && <Check className="w-4 h-4 stroke-[3]" />}
            </button>
          ) : (
            <div className="p-3.5 rounded-2xl bg-surface-elevated border border-primary/40 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-primary" />
                  <span>Set Custom Minutes</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
                  className="text-[11px] font-semibold text-foreground-muted hover:text-foreground"
                >
                  Close
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomMinutes(Math.max(1, customMinutes - 5))}
                  className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center font-bold text-foreground hover:bg-surface-elevated active:scale-95 text-xs"
                >
                  -5
                </button>
                <div className="flex-1 relative flex items-center">
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-surface border border-border focus:border-primary text-center font-bold font-mono text-base rounded-xl py-1.5 pr-8 text-foreground outline-none"
                  />
                  <span className="absolute right-3 text-xs font-semibold text-foreground-muted pointer-events-none">
                    m
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomMinutes(customMinutes + 5)}
                  className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center font-bold text-foreground hover:bg-surface-elevated active:scale-95 text-xs"
                >
                  +5
                </button>
              </div>

              {/* Quick shortcut chips */}
              <div className="flex gap-1.5">
                {[5, 10, 20, 90, 120].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCustomMinutes(m)}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                      customMinutes === m
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface border-border text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSleepTimer(customMinutes);
                  toggleSleepTimer();
                }}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 transition-all active:scale-95"
              >
                Start {customMinutes} Min Timer
              </button>
            </div>
          )}
        </div>

        {/* Turn Off Button */}
        {(sleepTimerMinutes !== null || sleepTimerStopAfterTrack) && (
          <button
            onClick={() => {
              setSleepTimer(null);
              toggleSleepTimer();
            }}
            className="w-full py-2.5 rounded-2xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-colors"
          >
            Turn Off Sleep Timer
          </button>
        )}
      </div>
    </div>
  );
};
