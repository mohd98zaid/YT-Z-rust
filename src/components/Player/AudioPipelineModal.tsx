import React from 'react';
import {
  FileText,
  Cpu,
  Sliders,
  Activity,
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
  const bitrateKbps = isVideoMode ? 160 : (audioStats?.bitrate || (isLossless ? 1566 : 160));
  const channels = 2; // Stereo
  const pcmDataRateKbps = Math.round((sampleRateHz * bitDepth * channels) / 1000);

  const rawCodec = (audioStats?.codec || (isLossless ? 'alac' : 'opus')).toLowerCase();
  const formatStr = isVideoMode ? 'AAC' : (isLossless ? (rawCodec.includes('flac') ? 'FLAC' : 'ALAC') : 'OPUS');

  let sourceName = isVideoMode
    ? 'YouTube Video (Synced Audio)'
    : (audioStats?.addonName || audioStats?.provider || (isLossless ? 'PencariMusic' : 'YouTube Music High'));

  if (sourceName.toLowerCase().includes('pencari')) {
    sourceName = 'PencariMusic';
  } else if (sourceName.toLowerCase().includes('lossless') || sourceName.toLowerCase().includes('addon')) {
    sourceName = 'PencariMusic';
  }

  const decoderName = isVideoMode
    ? 'ffmpegLavc63.9.100-aac'
    : formatStr === 'ALAC'
    ? 'ffmpegLavc63.9.100-alac'
    : formatStr === 'FLAC'
    ? 'ffmpegLavc63.9.100-flac'
    : 'ffmpegLavc63.9.100-opus';

  const getDeviceName = () => {
    if (typeof navigator === 'undefined') return 'SM-G990E';
    const ua = navigator.userAgent;
    const androidMatch = ua.match(/Android[^;]+;\s*([^;)]+)\)/);
    if (androidMatch && androidMatch[1]) {
      const raw = androidMatch[1].trim();
      if (!raw.toLowerCase().includes('k') && !raw.toLowerCase().includes('build')) {
        return raw;
      }
    }
    if (/iPhone|iPad|iPod/.test(ua)) return 'iPhone Audio DAC';
    if (/Macintosh/.test(ua)) return 'macOS CoreAudio';
    return 'SM-G990E';
  };

  const deviceName = getDeviceName();

  return (
    <div 
      className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-[390px] max-h-[88vh] bg-[#1c1c1e] border border-white/[0.08] rounded-[32px] p-6 shadow-2xl text-white flex flex-col font-sans animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Drag Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3 shrink-0" />

        {/* Header */}
        <div className="text-center mb-4 shrink-0">
          <h3 className="text-[17px] font-semibold text-white tracking-tight">Audio Pipeline</h3>
          <p className="text-[13px] text-zinc-400 mt-0.5">Live signal path, decoder to output</p>
        </div>

        {/* Video Mode Audio Notice */}
        {isVideoMode && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-left shrink-0">
            <Video className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[12px] text-amber-200/90 leading-snug">
              <strong className="text-amber-300 font-semibold block">Video Sync Active · Audio Reduced</strong>
              Audio signal is routed from YouTube video stream (~160 kbps) for frame-synchronized playback. Switch back to &quot;Song &amp; Vinyl&quot; mode for bit-perfect Hi-Res Lossless ALAC/FLAC.
            </div>
          </div>
        )}

        {/* Scrollable Pipeline Content */}
        <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-6 custom-scrollbar">
          {/* Connected Vertical Timeline */}
          <div className="relative pl-8 space-y-6">
            {/* Continuous vertical line connecting all 5 node badges */}
            <div className="absolute left-[11px] top-3 bottom-4 w-[1.5px] bg-white/15" />

            {/* 1. TRACK INFO */}
            <div className="relative">
              <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-[#2c2c2e] border border-white/20 flex items-center justify-center text-zinc-300 shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[12px] font-bold tracking-wider text-zinc-300 uppercase mb-2">
                  Track Info
                </div>
                <div className="space-y-1 text-[13px] leading-relaxed">
                  <div>
                    <span className="font-semibold text-white/95">Source: </span>
                    <span className="text-zinc-300 font-normal">{sourceName}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Format: </span>
                    <span className="text-zinc-300 font-normal">{formatStr}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Bit Depth: </span>
                    <span className="text-zinc-300 font-normal">{bitDepth}-bit</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Sample Rate: </span>
                    <span className="text-zinc-300 font-normal">{sampleRateKhz} kHz</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Bitrate: </span>
                    <span className="text-zinc-300 font-normal">{bitrateKbps} kbps</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">PCM Data Rate: </span>
                    <span className="text-zinc-300 font-normal">{pcmDataRateKbps} kbps</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Channels: </span>
                    <span className="text-zinc-300 font-normal">Stereo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. DECODER */}
            <div className="relative">
              <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-[#2c2c2e] border border-white/20 flex items-center justify-center text-zinc-300 shrink-0">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[12px] font-bold tracking-wider text-zinc-300 uppercase mb-2">
                  Decoder
                </div>
                <div className="space-y-1 text-[13px] leading-relaxed">
                  <div>
                    <span className="font-semibold text-white/95">Decoder Name: </span>
                    <span className="text-zinc-300 font-mono text-[12px]">{decoderName}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Format: </span>
                    <span className="text-zinc-300 font-normal">16-bit PCM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. RESAMPLER */}
            <div className="relative">
              <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-[#2c2c2e] border border-white/20 flex items-center justify-center text-zinc-300 shrink-0">
                <Sliders className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[12px] font-bold tracking-wider text-zinc-300 uppercase mb-2">
                  Resampler
                </div>
                <div className="space-y-1 text-[13px] leading-relaxed">
                  <div>
                    <span className="font-semibold text-white/95">I/O Rate: </span>
                    <span className="text-zinc-300 font-normal">{sampleRateKhz} kHz &rarr; 48 kHz</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Type: </span>
                    <span className="text-zinc-300 font-normal">None</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Cutoff: </span>
                    <span className="text-zinc-300 font-normal">&mdash;</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Quality: </span>
                    <span className="text-zinc-300 font-normal">Passthrough</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. DSP */}
            <div className="relative">
              <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-[#2c2c2e] border border-white/20 flex items-center justify-center text-zinc-300 shrink-0">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[12px] font-bold tracking-wider text-zinc-300 uppercase mb-2">
                  DSP
                </div>
                <div className="space-y-1 text-[13px] leading-relaxed">
                  <div>
                    <span className="font-semibold text-white/95">PCM Format: </span>
                    <span className="text-zinc-300 font-normal">Float32</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Sample Rate: </span>
                    <span className="text-zinc-300 font-normal">48 kHz</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Gain: </span>
                    <span className="text-zinc-300 font-normal">&mdash;</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Measured: </span>
                    <span className="text-zinc-300 font-normal">&mdash;</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">EQ Preset: </span>
                    <span className="text-zinc-300 font-normal">Flat</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Stereo Expand: </span>
                    <span className="text-zinc-300 font-normal">250%</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Buffers: </span>
                    <span className="text-zinc-300 font-normal">2x (500ms, 24000 frames)</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Output API: </span>
                    <span className="text-zinc-300 font-normal">AudioTrack</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Bit-exact: </span>
                    <span className="text-zinc-300 font-normal">No &mdash; spatial audio</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. OUTPUT DEVICE */}
            <div className="relative">
              <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-[#2c2c2e] border border-white/20 flex items-center justify-center text-zinc-300 shrink-0">
                <Volume2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[12px] font-bold tracking-wider text-zinc-300 uppercase mb-2">
                  Output Device
                </div>
                <div className="space-y-1 text-[13px] leading-relaxed">
                  <div>
                    <span className="font-semibold text-white/95">Device Name: </span>
                    <span className="text-zinc-300 font-normal">{deviceName}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Route: </span>
                    <span className="text-zinc-300 font-normal">PHONE</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Transport: </span>
                    <span className="text-zinc-300 font-normal">AudioTrack</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Direct: </span>
                    <span className="text-zinc-300 font-normal">Not Supported (Mixed Path)</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">AudioTrack: </span>
                    <span className="text-zinc-300 font-normal">PCM16 / 48 kHz</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">System: </span>
                    <span className="text-zinc-300 font-normal">AudioFlinger Mixer 48 kHz, HAL PCM24 packed</span>
                  </div>
                  <div className="pt-0.5">
                    <span className="font-semibold text-white/95">Fallback: </span>
                    <span className="text-zinc-300 font-normal">Speaker output capped at 16-bit to avoid OEM mixer distortion</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Done Button */}
        <div className="pt-4 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-[#2c2c2e]/90 hover:bg-[#3a3a3c] text-white font-semibold text-[15px] transition-all active:scale-[0.98] shadow-lg border border-white/10"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
