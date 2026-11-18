import React from 'react';
import {
  FileText,
  Cpu,
  Sliders,
  Volume2,
  Video,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/usePlayerStore';

interface AudioPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioPipelineModal: React.FC<AudioPipelineModalProps> = ({ isOpen, onClose }) => {
  const { audioStats, currentTrack, isVideoMode } = usePlayerStore();

  if (!isOpen || !currentTrack) return null;

  const isLossless = isVideoMode ? false : Boolean(audioStats?.isLossless);
  const sampleRateHz = isVideoMode ? 44100 : (audioStats?.sampleRate || 48000);
  const sampleRateKhz = (sampleRateHz / 1000).toFixed(1).replace('.0', '');
  const bitDepth = isVideoMode ? 16 : (audioStats?.bitDepth || (isLossless ? 24 : 16));
  const bitrateKbps = isVideoMode ? 160 : (audioStats?.bitrate || (isLossless ? 2144 : 160));
  const channels = 2; // Stereo
  const pcmDataRateKbps = Math.round((sampleRateHz * bitDepth * channels) / 1000);
  const formatStr = isVideoMode ? 'AAC / OPUS' : (audioStats?.codec || (isLossless ? 'flac' : 'opus')).toUpperCase();

  const sourceName = isVideoMode
    ? 'YouTube Video (Synced Audio)'
    : (audioStats?.addonName || audioStats?.provider || (isLossless ? 'Lossless Bridge' : 'YouTube Music'));

  const decoderName = isVideoMode
    ? 'c2.webaudio.aac.decoder'
    : isLossless
    ? 'c2.webaudio.flac.decoder'
    : 'c2.webaudio.opus.decoder';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-[390px] bg-[#1c1c1e] border border-white/[0.08] rounded-[28px] p-6 shadow-2xl text-white animate-scaleUp font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Handle */}
        <div className="w-9 h-1 bg-white/20 rounded-full mx-auto mb-3.5" />

        {/* Header */}
        <div className="text-center">
          <h3 className="text-[17px] font-semibold text-white tracking-tight">Audio Pipeline</h3>
          <p className="text-[13px] text-zinc-400 mt-0.5">Live signal path, decoder to output</p>
        </div>

        {/* Video Mode Audio Notice */}
        {isVideoMode && (
          <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-left">
            <Video className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[12px] text-amber-200/90 leading-snug">
              <strong className="text-amber-300 font-semibold block">Video Sync Active · Audio Reduced</strong>
              Audio signal is routed from YouTube video stream (~160 kbps) for frame-synchronized playback. Switch back to &quot;Song &amp; Vinyl&quot; mode for bit-perfect Hi-Res Lossless FLAC.
            </div>
          </div>
        )}

        {/* Hairline Divider */}
        <div className="h-[1px] bg-white/[0.08] my-4" />

        {/* Connected Vertical Timeline / Stepper */}
        <div className="relative pl-8 space-y-5">
          {/* Continuous vertical line */}
          <div className="absolute left-[11px] top-2 bottom-3 w-[1.5px] bg-white/15" />

          {/* 1. Track Info Node */}
          <div className="relative">
            <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-[#2c2c2e] border border-white/20 flex items-center justify-center text-zinc-300 shrink-0">
              <FileText className="w-3 h-3" />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wider text-zinc-300 uppercase mb-2">
                Track Info
              </div>
              <div className="space-y-1 text-[13px]">
                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-400">Source:</span>
                  <span className="text-zinc-100 font-medium truncate max-w-[210px]">{sourceName}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-400">Format:</span>
                  <span className="text-zinc-100 font-medium">{formatStr}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-400">Bit Depth:</span>
                  <span className="text-zinc-100 font-medium">{bitDepth}-bit</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-400">Sample Rate:</span>
                  <span className="text-zinc-100 font-medium">{sampleRateKhz} kHz</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-400">Bitrate:</span>
                  <span className="text-zinc-100 font-medium">{bitrateKbps} kbps</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-400">PCM Data Rate:</span>
                  <span className="text-zinc-100 font-medium">{pcmDataRateKbps} kbps</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-400">Channels:</span>
                  <span className="text-zinc-100 font-medium">Stereo</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Decoder Node */}
          <div className="relative">
            <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-[#2c2c2e] border border-white/20 flex items-center justify-center text-zinc-300 shrink-0">
              <Cpu className="w-3 h-3" />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wider text-zinc-300 uppercase mb-2">
                Decoder
              </div>
              <div className="space-y-1 text-[13px]">
                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-400">Decoder Name:</span>
                  <span className="text-zinc-200 font-mono text-[11px] truncate max-w-[200px]">{decoderName}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-400">Format:</span>
                  <span className="text-zinc-100 font-medium">{isLossless ? '24-bit Float PCM' : '16-bit PCM'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Resampler Node */}
          <div className="relative">
            <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-[#2c2c2e] border border-white/20 flex items-center justify-center text-zinc-300 shrink-0">
              <Sliders className="w-3 h-3" />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wider text-zinc-300 uppercase mb-2">
                Resampler
              </div>
              <div className="space-y-1 text-[13px]">
                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-400">I/O Rate:</span>
                  <span className="text-zinc-100 font-medium">
                    {sampleRateKhz} kHz → {sampleRateKhz} kHz
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-400">Type:</span>
                  <span className="text-zinc-100 font-medium">None</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-400">Cutoff:</span>
                  <span className="text-zinc-500">—</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-400">Quality:</span>
                  <span className="text-zinc-100 font-medium">Passthrough</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. DSP Node */}
          <div className="relative">
            <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-[#2c2c2e] border border-white/20 flex items-center justify-center text-zinc-300 shrink-0">
              <Volume2 className="w-3 h-3" />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wider text-zinc-300 uppercase mb-2">
                DSP
              </div>
              <div className="space-y-1 text-[13px]">
                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-400">Engine:</span>
                  <span className="text-zinc-100 font-medium">Direct WebAudio 10-Band EQ</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-400">Output:</span>
                  <span className="text-zinc-100 font-medium">System Audio DAC</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-400">Mode:</span>
                  <span className="text-zinc-100 font-medium">
                    {isLossless ? 'Bit-Perfect Passthrough' : 'Standard Audio'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Done Button */}
        <button
          onClick={onClose}
          className="w-full mt-6 py-3 rounded-2xl bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white font-semibold text-[15px] transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};
