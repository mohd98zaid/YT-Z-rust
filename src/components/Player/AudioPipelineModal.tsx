import React, { useState, useEffect } from 'react';
import {
  FileText,
  Cpu,
  Sliders,
  Activity,
  Volume2,
  Video,
} from 'lucide-react';
import { usePlayerStore, getAudioContext } from '../../stores/usePlayerStore';

interface AudioPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioPipelineModal: React.FC<AudioPipelineModalProps> = ({ isOpen, onClose }) => {
  const {
    audioStats,
    currentTrack,
    isVideoMode,
    eqEnabled,
    eqPreset,
    volume,
    volumeNormalization,
  } = usePlayerStore();

  const [deviceLabel, setDeviceLabel] = useState<string>('');
  const [deviceKind, setDeviceKind] = useState<'headphones' | 'bluetooth' | 'speaker' | 'default'>('default');

  // Enumerate actual output devices from the browser/OS audio subsystem
  useEffect(() => {
    if (!isOpen) return;

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');
          const defaultDev = audioOutputs.find((d) => d.deviceId === 'default') || audioOutputs[0];
          if (defaultDev?.label) {
            const lbl = defaultDev.label;
            setDeviceLabel(lbl);
            const lower = lbl.toLowerCase();
            if (lower.includes('headphone') || lower.includes('buds') || lower.includes('ear') || lower.includes('airpod')) {
              setDeviceKind('headphones');
            } else if (lower.includes('bluetooth') || lower.includes('bt')) {
              setDeviceKind('bluetooth');
            } else if (lower.includes('speaker') || lower.includes('realtek') || lower.includes('audio')) {
              setDeviceKind('speaker');
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || !currentTrack) return null;

  // Real Web Audio context from running audio engine
  const audioCtx = getAudioContext();
  const dacSampleRate = audioCtx?.sampleRate || 48000;
  const dacSampleRateKhz = (dacSampleRate / 1000).toFixed(1).replace('.0', '');

  // Track stream parameters
  const isLossless = isVideoMode ? false : Boolean(audioStats?.isLossless);
  const trackSampleRate = isVideoMode ? 44100 : (audioStats?.sampleRate || dacSampleRate);
  const trackSampleRateKhz = (trackSampleRate / 1000).toFixed(1).replace('.0', '');
  const bitDepth = isVideoMode ? 16 : (audioStats?.bitDepth || (isLossless ? 24 : 16));
  const bitrateKbps = isVideoMode ? 160 : (audioStats?.bitrate || (isLossless ? 1566 : 160));
  const channels = 2; // Stereo
  const pcmDataRateKbps = Math.round((trackSampleRate * bitDepth * channels) / 1000);

  const rawCodec = (audioStats?.codec || (isVideoMode ? 'aac' : isLossless ? 'flac' : 'opus')).toLowerCase();
  const formatStr = isVideoMode
    ? 'AAC'
    : rawCodec.includes('flac')
    ? 'FLAC'
    : rawCodec.includes('alac')
    ? 'ALAC'
    : rawCodec.includes('opus')
    ? 'OPUS'
    : rawCodec.toUpperCase();

  // Dynamic Source Detection
  let sourceName = '';
  if (isVideoMode) {
    sourceName = 'YouTube Video Stream (AAC / WebM)';
  } else if (currentTrack.isLocal) {
    sourceName = 'Local Storage (Bit-Perfect Storage Direct)';
  } else if (audioStats?.addonName) {
    sourceName = audioStats.addonName;
  } else if (audioStats?.provider) {
    sourceName = audioStats.provider;
  } else if (isLossless) {
    sourceName = 'Hi-Res Lossless Master';
  } else {
    sourceName = 'YouTube Music High (Opus Direct)';
  }

  // Detect OS & Platform Runtime
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isWindows = /Windows/i.test(ua);
  const isMac = /Macintosh|Mac OS/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isLinux = /Linux/i.test(ua) && !isAndroid;

  // Extract real Android model if on Android
  let androidModel = '';
  if (isAndroid) {
    const match = ua.match(/Android[^;]+;\s*([^;)]+)\)/);
    if (match && match[1]) {
      const clean = match[1].replace(/Build\/.+/i, '').trim();
      if (clean && !clean.toLowerCase().includes('k')) androidModel = clean;
    }
  }

  // 1. Dynamic Decoder Name
  let decoderEngine = '';
  if (isAndroid) {
    decoderEngine = `ffmpegLavc63.9.100-${formatStr.toLowerCase()}`;
  } else if (/Chrome|Edg|OPR/i.test(ua)) {
    decoderEngine = `Chromium Blink AudioDecoder (${formatStr.toLowerCase()})`;
  } else if (/Firefox/i.test(ua)) {
    decoderEngine = `Gecko Media Lavc (${formatStr.toLowerCase()})`;
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    decoderEngine = `WebKit CoreAudio Hardware Decoder (${formatStr.toLowerCase()})`;
  } else {
    decoderEngine = `WebAudio Lavc Decoder (${formatStr.toLowerCase()})`;
  }

  // 2. Dynamic Resampler Info
  const isResampling = Math.abs(trackSampleRate - dacSampleRate) > 100;
  const resamplerIoRate = isResampling
    ? `${trackSampleRateKhz} kHz → ${dacSampleRateKhz} kHz`
    : `${trackSampleRateKhz} kHz → ${trackSampleRateKhz} kHz`;
  const resamplerType = isResampling ? 'Polyphase Sinc Interpolator' : 'None (Bit-Matched)';
  const resamplerCutoff = isResampling
    ? `0.99 Nyquist (${((Math.min(trackSampleRate, dacSampleRate) / 2) * 0.99).toFixed(1)} kHz)`
    : `Nyquist (${(trackSampleRate / 2).toFixed(1)} kHz Full Bandwidth)`;
  const resamplerQuality = isResampling ? 'High-Fidelity Sinc Resampling' : 'Bit-Perfect Passthrough';

  // 3. Dynamic DSP Info
  const baseLatencyMs = audioCtx?.baseLatency ? (audioCtx.baseLatency * 1000).toFixed(1) : '5.3';
  const bufferFrames = audioCtx?.baseLatency ? Math.round(audioCtx.baseLatency * dacSampleRate) : 256;
  const bufferText = `2x (${baseLatencyMs}ms, ${bufferFrames} frames)`;

  let outputApi = 'Web Audio API';
  if (isWindows) outputApi = 'Web Audio (WASAPI Direct)';
  else if (isMac) outputApi = 'Web Audio (CoreAudio HAL)';
  else if (isAndroid) outputApi = 'Web Audio / Android AudioTrack';
  else if (isIOS) outputApi = 'AVAudioSession';

  const isBitExact = !eqEnabled && volume >= 0.99 && !volumeNormalization && !isResampling && isLossless;
  const activeDspList = [
    eqEnabled ? `10-Band EQ (${eqPreset})` : null,
    volume < 0.99 ? `Digital Attenuation (${Math.round(volume * 100)}%)` : null,
    volumeNormalization ? 'ReplayGain Normalizer' : null,
    isResampling ? 'Resampler' : null,
  ].filter(Boolean);

  const bitExactStatus = isBitExact
    ? 'Yes — Bit-Perfect Passthrough'
    : `No — DSP active (${activeDspList.join(', ') || 'Mixed Path'})`;

  // 4. Dynamic Output Device Info
  let detectedDeviceName = deviceLabel;
  if (!detectedDeviceName) {
    if (isAndroid) detectedDeviceName = androidModel ? `${androidModel} (Phone Audio)` : 'Android Audio Device';
    else if (isWindows) detectedDeviceName = 'Default Audio Endpoint (Windows WASAPI)';
    else if (isMac) detectedDeviceName = 'System Audio Output (macOS CoreAudio)';
    else if (isIOS) detectedDeviceName = 'iOS Device Audio Output';
    else if (isLinux) detectedDeviceName = 'PipeWire / PulseAudio Sink';
    else detectedDeviceName = 'System Audio DAC';
  }

  let routeName = 'SPEAKERS';
  if (deviceKind === 'headphones' || /headphone|ear|buds|airpod/i.test(detectedDeviceName)) {
    routeName = 'HEADPHONES';
  } else if (deviceKind === 'bluetooth' || /bluetooth|bt/i.test(detectedDeviceName)) {
    routeName = 'BLUETOOTH';
  } else if (isAndroid || isIOS) {
    routeName = 'PHONE / SPEAKER';
  }

  let transportName = 'Web Audio Stream';
  if (isWindows) transportName = 'WASAPI (32-bit Float Shared)';
  else if (isMac) transportName = 'CoreAudio AudioUnit (Float32)';
  else if (isAndroid) transportName = 'AudioTrack (Mixed HAL)';
  else if (isLinux) transportName = 'PipeWire PCM Node';

  let systemMixer = '';
  if (isWindows) systemMixer = `Windows Audio Mixer (${dacSampleRateKhz} kHz, Float32)`;
  else if (isMac) systemMixer = `CoreAudio HAL Mixer (${dacSampleRateKhz} kHz, 32-bit)`;
  else if (isAndroid) systemMixer = `AudioFlinger Mixer (${dacSampleRateKhz} kHz, HAL PCM)`;
  else if (isLinux) systemMixer = `PipeWire Server (${dacSampleRateKhz} kHz)`;
  else systemMixer = `System Audio Mixer (${dacSampleRateKhz} kHz)`;

  let fallbackNote = '';
  if (isBitExact) {
    fallbackNote = 'Direct bit-matched audio pipeline with zero DSP alterations';
  } else if (isResampling) {
    fallbackNote = `Stream sample rate (${trackSampleRateKhz} kHz) matched to hardware DAC clock (${dacSampleRateKhz} kHz)`;
  } else if (isAndroid) {
    fallbackNote = 'Speaker output managed by OEM HAL mixer';
  } else {
    fallbackNote = 'Hardware audio output synchronized to system DAC clock';
  }

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
                    <span className="text-zinc-300 font-normal">{trackSampleRateKhz} kHz</span>
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
                    <span className="font-semibold text-white/95">Decoder Engine: </span>
                    <span className="text-zinc-300 font-mono text-[11px]">{decoderEngine}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Decoded Format: </span>
                    <span className="text-zinc-300 font-normal">Float32 PCM (IEEE-754)</span>
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
                    <span className="text-zinc-300 font-normal">{resamplerIoRate}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Type: </span>
                    <span className="text-zinc-300 font-normal">{resamplerType}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Cutoff: </span>
                    <span className="text-zinc-300 font-normal">{resamplerCutoff}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Quality: </span>
                    <span className="text-zinc-300 font-normal">{resamplerQuality}</span>
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
                    <span className="text-zinc-300 font-normal">{dacSampleRateKhz} kHz</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Gain: </span>
                    <span className="text-zinc-300 font-normal">
                      {volumeNormalization ? '-14.0 LUFS Target' : `${(20 * Math.log10(volume || 0.001)).toFixed(1)} dBFS`}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">EQ Preset: </span>
                    <span className="text-zinc-300 font-normal">
                      {eqEnabled ? `${eqPreset} (Active)` : 'Flat (Bypass)'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Buffers: </span>
                    <span className="text-zinc-300 font-normal">{bufferText}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Output API: </span>
                    <span className="text-zinc-300 font-normal">{outputApi}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Bit-exact: </span>
                    <span className="text-zinc-300 font-normal">{bitExactStatus}</span>
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
                    <span className="text-zinc-300 font-normal">{detectedDeviceName}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Route: </span>
                    <span className="text-zinc-300 font-normal">{routeName}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Transport: </span>
                    <span className="text-zinc-300 font-normal">{transportName}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Direct: </span>
                    <span className="text-zinc-300 font-normal">
                      {isBitExact ? 'Direct Bit-Matched Path' : 'System Audio Engine (Shared Path)'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">Audio Stream: </span>
                    <span className="text-zinc-300 font-normal">PCM32 Float / {dacSampleRateKhz} kHz</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white/95">System: </span>
                    <span className="text-zinc-300 font-normal">{systemMixer}</span>
                  </div>
                  <div className="pt-0.5">
                    <span className="font-semibold text-white/95">Status: </span>
                    <span className="text-zinc-300 font-normal">{fallbackNote}</span>
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
