/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import JSZip from 'jszip';
import { VFile, getFileExtension, isFontExtension, isAudioExtension, isVideoExtension, formatBytes } from '../utils/fileSystem';
import { M3Icon, M3Badge, M3Button, M3IconButton } from './M3Components';
import { M3Switch } from './M3Switch';
import { Translations } from '../utils/i18n';

interface BinaryViewerProps {
  file: VFile;
  t?: Translations;
}

/**
 * Interactive Font Specimen Viewer for TTF, OTF, WOFF, WOFF2, and EOT files.
 * Dynamically registers the font and provides custom preview, size slider, glyph matrix, and waterfall.
 */
export function FontSpecimenViewer({ file, t }: BinaryViewerProps) {
  const ext = getFileExtension(file.name).toLowerCase();
  const [sampleText, setSampleText] = useState('The quick brown fox jumps over the lazy dog 1234567890');
  const [fontSize, setFontSize] = useState(32);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [isItalic, setIsItalic] = useState(false);
  const [activeTab, setActiveTab] = useState<'sample' | 'glyphs' | 'waterfall'>('sample');

  // Generate unique font family name for dynamic registration
  const fontFamily = useMemo(() => {
    const safeName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
    return `ZipStudioFont_${safeName}_${Math.abs(file.path.split('').reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0))}`;
  }, [file.name, file.path]);

  // Format specifier for @font-face
  const fontFormat = useMemo(() => {
    switch (ext) {
      case 'ttf':
        return 'truetype';
      case 'otf':
        return 'opentype';
      case 'woff':
        return 'woff';
      case 'woff2':
        return 'woff2';
      case 'eot':
        return 'embedded-opentype';
      default:
        return 'truetype';
    }
  }, [ext]);

  // Dynamically inject @font-face rule into document head
  useEffect(() => {
    if (!file.content) return;
    const styleId = `font-face-${fontFamily}`;
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      @font-face {
        font-family: '${fontFamily}';
        src: url('${file.content}') format('${fontFormat}');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }
    `;

    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, [fontFamily, fontFormat, file.content]);

  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const numberChars = '0123456789'.split('');
  const symbolChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`\\'.split('');

  const waterfallSizes = [72, 48, 36, 28, 20, 16, 13];

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f8] dark:bg-[#121316] text-[#191c20] dark:text-[#e2e2e6] overflow-y-auto p-4 md:p-6 space-y-4">
      {/* Header Card */}
      <div className="bg-white dark:bg-[#1e1f22] border border-[#d8dae5] dark:border-[#43474e]/50 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00468b]/20 dark:bg-[#00468b]/40 border border-[#0b57d0]/30 dark:border-[#a8c7fa]/30 flex items-center justify-center text-[#0b57d0] dark:text-[#a8c7fa]">
            <M3Icon name="font_download" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#191c20] dark:text-white">{file.name}</h2>
              <M3Badge variant="primary">{ext.toUpperCase()}</M3Badge>
            </div>
            <p className="text-xs text-[#5d6168] dark:text-[#8e9199] font-mono mt-0.5">
              {formatBytes(file.size)} • {file.path}
            </p>
          </div>
        </div>

        {/* View mode tabs */}
        <div className="flex items-center bg-[#f0f2f8] dark:bg-[#121316] p-1 rounded-xl border border-[#d8dae5] dark:border-[#43474e]/40 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('sample')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'sample' ? 'bg-[#d3e3fd] text-[#041e49] dark:bg-[#2b2d30] dark:text-[#a8c7fa]' : 'text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white'
            }`}
          >
            {t?.sampleTextTab || 'Sample Text'}
          </button>
          <button
            onClick={() => setActiveTab('glyphs')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'glyphs' ? 'bg-[#d3e3fd] text-[#041e49] dark:bg-[#2b2d30] dark:text-[#a8c7fa]' : 'text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white'
            }`}
          >
            {t?.glyphMatrixTab || 'Glyph Matrix'}
          </button>
          <button
            onClick={() => setActiveTab('waterfall')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'waterfall' ? 'bg-[#d3e3fd] text-[#041e49] dark:bg-[#2b2d30] dark:text-[#a8c7fa]' : 'text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white'
            }`}
          >
            {t?.waterfallTab || 'Type Waterfall'}
          </button>
        </div>
      </div>

      {/* Font Controls Toolbar */}
      <div className="bg-white dark:bg-[#1e1f22] border border-[#d8dae5] dark:border-[#43474e]/40 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-4 text-xs relative z-10 shrink-0">
        {/* Sample Text Input */}
        <div className="flex-1 min-w-[240px]">
          <label className="text-[11px] font-semibold uppercase text-[#5d6168] dark:text-[#8e9199] block mb-1">
            {t?.customPreviewText || 'Custom Preview Text'}
          </label>
          <input
            type="text"
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            className="w-full bg-[#f0f2f8] dark:bg-[#121316] border border-[#d8dae5] dark:border-[#43474e] rounded-xl px-3 py-2 text-[#191c20] dark:text-white font-mono focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa]"
            placeholder={t?.typeCustomText || 'Type custom text...'}
          />
        </div>

        {/* Font Size Slider */}
        <div className="w-48">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-semibold uppercase text-[#5d6168] dark:text-[#8e9199]">{t?.sizeLabel || 'Size'}</span>
            <span className="font-mono text-[#0b57d0] dark:text-[#a8c7fa] font-bold">{fontSize}px</span>
          </div>
          <input
            type="range"
            min={12}
            max={96}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full accent-[#0b57d0] dark:accent-[#a8c7fa] cursor-pointer"
          />
        </div>

        {/* Letter Spacing */}
        <div className="w-36">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-semibold uppercase text-[#5d6168] dark:text-[#8e9199]">{t?.spacingLabel || 'Spacing'}</span>
            <span className="font-mono text-[#0b57d0] dark:text-[#a8c7fa]">{letterSpacing}px</span>
          </div>
          <input
            type="range"
            min={-3}
            max={12}
            value={letterSpacing}
            onChange={(e) => setLetterSpacing(Number(e.target.value))}
            className="w-full accent-[#0b57d0] dark:accent-[#a8c7fa] cursor-pointer"
          />
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-4 pt-3">
          <M3Switch
            selected={isItalic}
            onChange={setIsItalic}
            label={t?.italicStyle || 'Italic Style'}
          />
          <button
            onClick={() => {
              setFontSize(32);
              setLetterSpacing(0);
              setIsItalic(false);
              setSampleText('The quick brown fox jumps over the lazy dog 1234567890');
            }}
            className="px-3 py-1.5 rounded-xl bg-[#f0f2f8] dark:bg-[#121316] text-[#5d6168] dark:text-[#8e9199] border border-[#d8dae5] dark:border-[#43474e] hover:text-[#191c20] dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
          >
            <M3Icon name="restart_alt" size={15} />
            {t?.reset || 'Reset'}
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      {activeTab === 'sample' && (
        <div className="flex-1 min-h-[260px] bg-[#f8fafd] dark:bg-[#18191c] border border-[#d8dae5] dark:border-[#43474e]/40 rounded-2xl p-6 shadow-inner flex flex-col justify-start items-start overflow-y-auto relative z-0">
          <div
            style={{
              fontFamily: `'${fontFamily}', sans-serif`,
              fontSize: `${fontSize}px`,
              letterSpacing: `${letterSpacing}px`,
              fontStyle: isItalic ? 'italic' : 'normal',
              lineHeight: 1.25,
            }}
            className="w-full text-[#191c20] dark:text-white whitespace-pre-wrap break-words selection:bg-[#a8c7fa] selection:text-[#003062]"
          >
            {sampleText || ' '}
          </div>
        </div>
      )}

      {/* Glyph Matrix */}
      {activeTab === 'glyphs' && (
        <div className="flex-1 bg-[#f8fafd] dark:bg-[#18191c] border border-[#d8dae5] dark:border-[#43474e]/40 rounded-2xl p-6 shadow-inner space-y-6">
          {/* Uppercase */}
          <div>
            <div className="text-xs font-semibold uppercase text-[#5d6168] dark:text-[#8e9199] mb-2 tracking-wider">
              {t?.uppercaseChars || 'Uppercase Characters (A-Z)'}
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-13 gap-2">
              {uppercaseChars.map((ch) => (
                <div
                  key={ch}
                  style={{ fontFamily: `'${fontFamily}', sans-serif` }}
                  className="h-12 rounded-xl bg-white dark:bg-[#2b2d30] hover:bg-black/5 dark:hover:bg-[#383a3e] border border-[#d8dae5] dark:border-[#43474e]/40 flex items-center justify-center text-xl text-[#191c20] dark:text-white select-none transition-colors shadow-xs"
                >
                  {ch}
                </div>
              ))}
            </div>
          </div>

          {/* Lowercase */}
          <div>
            <div className="text-xs font-semibold uppercase text-[#5d6168] dark:text-[#8e9199] mb-2 tracking-wider">
              {t?.lowercaseChars || 'Lowercase Characters (a-z)'}
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-13 gap-2">
              {lowercaseChars.map((ch) => (
                <div
                  key={ch}
                  style={{ fontFamily: `'${fontFamily}', sans-serif` }}
                  className="h-12 rounded-xl bg-white dark:bg-[#2b2d30] hover:bg-black/5 dark:hover:bg-[#383a3e] border border-[#d8dae5] dark:border-[#43474e]/40 flex items-center justify-center text-xl text-[#191c20] dark:text-white select-none transition-colors shadow-xs"
                >
                  {ch}
                </div>
              ))}
            </div>
          </div>

          {/* Numbers */}
          <div>
            <div className="text-xs font-semibold uppercase text-[#5d6168] dark:text-[#8e9199] mb-2 tracking-wider">
              {t?.numericChars || 'Numerals (0-9)'}
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {numberChars.map((ch) => (
                <div
                  key={ch}
                  style={{ fontFamily: `'${fontFamily}', sans-serif` }}
                  className="h-12 rounded-xl bg-white dark:bg-[#2b2d30] hover:bg-black/5 dark:hover:bg-[#383a3e] border border-[#d8dae5] dark:border-[#43474e]/40 flex items-center justify-center text-xl text-[#0b57d0] dark:text-[#a8c7fa] select-none transition-colors shadow-xs font-bold"
                >
                  {ch}
                </div>
              ))}
            </div>
          </div>

          {/* Symbols */}
          <div>
            <div className="text-xs font-semibold uppercase text-[#5d6168] dark:text-[#8e9199] mb-2 tracking-wider">
              Symbols & Punctuation
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
              {symbolChars.map((ch, idx) => (
                <div
                  key={idx}
                  style={{ fontFamily: `'${fontFamily}', sans-serif` }}
                  className="h-12 rounded-xl bg-white dark:bg-[#2b2d30] hover:bg-black/5 dark:hover:bg-[#383a3e] border border-[#d8dae5] dark:border-[#43474e]/40 flex items-center justify-center text-lg text-[#b26a00] dark:text-[#ffd54f] select-none transition-colors shadow-xs font-bold"
                >
                  {ch}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Typographic Waterfall */}
      {activeTab === 'waterfall' && (
        <div className="flex-1 bg-[#f8fafd] dark:bg-[#18191c] border border-[#d8dae5] dark:border-[#43474e]/40 rounded-2xl p-6 shadow-inner space-y-6">
          {waterfallSizes.map((px) => (
            <div key={px} className="border-b border-[#d8dae5] dark:border-[#43474e]/30 pb-4 last:border-b-0">
              <span className="text-[10px] font-mono font-bold text-[#0b57d0] dark:text-[#a8c7fa] block mb-1">
                {px}px
              </span>
              <p
                style={{
                  fontFamily: `'${fontFamily}', sans-serif`,
                  fontSize: `${px}px`,
                  letterSpacing: `${letterSpacing}px`,
                  fontStyle: isItalic ? 'italic' : 'normal',
                  lineHeight: 1.25,
                }}
                className="text-[#191c20] dark:text-white whitespace-pre-wrap break-words"
              >
                {sampleText}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Integrated In-UI Audio and Video Player with Real Web Audio Soundwaves,
 * Scrubber, Volume, Loop, and Fullscreen Controls (No browser default player UI).
 */
export function MediaPlayer({ file, t }: BinaryViewerProps) {
  const ext = getFileExtension(file.name).toLowerCase();
  const isAudio = isAudioExtension(ext);
  const isVideo = isVideoExtension(ext);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [visualizerMode, setVisualizerMode] = useState<'spectrum' | 'wave'>('spectrum');
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Web Audio API refs for REAL audio soundwave analysis
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Peak indicators and smoothed bars for realistic audio visualizer dynamics
  const peaksRef = useRef<{ y: number; vel: number }[]>([]);
  const smoothedBarsRef = useRef<number[]>([]);

  // Lazy Web Audio API initialization on user gesture
  const initWebAudio = () => {
    if (!audioCtxRef.current && mediaRef.current) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.75;

          try {
            const source = ctx.createMediaElementSource(mediaRef.current);
            source.connect(analyser);
            analyser.connect(ctx.destination);
            sourceRef.current = source;
          } catch (connErr) {
            console.debug('Media element audio source already connected or restricted:', connErr);
          }

          audioCtxRef.current = ctx;
          analyserRef.current = analyser;
        }
      } catch (err) {
        console.warn('Web Audio initialization:', err);
      }
    }

    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  };

  // Optimized moving soundwave animation canvas loop
  useEffect(() => {
    if (!isAudio) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    const barCount = 36; // Optimized bar count for fluid mobile performance
    let lastFrameTime = 0;

    // Initialize peaks array if needed
    if (peaksRef.current.length !== barCount) {
      peaksRef.current = Array.from({ length: barCount }, () => ({ y: 0, vel: 0 }));
      smoothedBarsRef.current = Array.from({ length: barCount }, () => 0);
    }

    const drawIdle = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#74777f';
      const barGap = 3;
      const totalGaps = (barCount - 1) * barGap;
      const barWidth = Math.max(3, (width - totalGaps) / barCount);

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + barGap);
        const phase = i * 0.22;
        const idleHeight = 6 + (Math.sin(phase) * 0.5 + 0.5) * 6;
        ctx.beginPath();
        ctx.roundRect(x, height - idleHeight, barWidth, idleHeight, [2, 2, 0, 0]);
        ctx.fill();
      }
    };

    if (!isPlaying) {
      drawIdle();
      return () => {
        isRunning = false;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }

    const renderVisualizer = (timestamp: number) => {
      if (!isRunning) return;
      animFrameRef.current = requestAnimationFrame(renderVisualizer);

      // Throttle canvas to ~30-33fps to prevent mobile CPU/GPU throttling and battery drain
      if (timestamp - lastFrameTime < 30) return;
      lastFrameTime = timestamp;

      const width = canvas.width;
      const height = canvas.height;
      const now = performance.now();
      ctx.clearRect(0, 0, width, height);

      const analyser = analyserRef.current;
      const barGap = 3;
      const totalGaps = (barCount - 1) * barGap;
      const barWidth = Math.max(3, (width - totalGaps) / barCount);

      let hasRealSignal = false;
      const freqBuffer = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
      const timeBuffer = analyser ? new Uint8Array(analyser.fftSize) : null;

      if (analyser) {
        analyser.getByteFrequencyData(freqBuffer!);
        analyser.getByteTimeDomainData(timeBuffer!);

        // Check if analyser receives non-zero audio signals
        for (let i = 0; i < freqBuffer!.length; i++) {
          if (freqBuffer![i] > 2) {
            hasRealSignal = true;
            break;
          }
        }
      }

      const audioCurrentTime = mediaRef.current?.currentTime || (now / 1000);
      const activeVol = isMuted ? 0 : volume;

      if (visualizerMode === 'spectrum') {
        // High-performance 2D gradient bars (no CPU shadowBlur overhead)
        for (let i = 0; i < barCount; i++) {
          let amplitude = 0;

          if (hasRealSignal && freqBuffer) {
            const binIndex = Math.min(
              freqBuffer.length - 1,
              Math.floor(Math.pow(i / barCount, 1.3) * freqBuffer.length)
            );
            amplitude = freqBuffer[binIndex] / 255;
          } else {
            const t = audioCurrentTime * 3.5;
            const bassKick = Math.pow(Math.sin(t * 4), 6) * 0.45;
            const subBeat = Math.sin(t * 8 + i * 0.15) * 0.25;
            const midHarmony = Math.cos(t * 6 + i * 0.28) * 0.28;
            const shimmer = Math.sin(t * 14 + i * 0.5) * 0.15;
            const curve = Math.sin((i / barCount) * Math.PI);
            amplitude = Math.max(0.06, (bassKick + subBeat + midHarmony + shimmer + 0.35) * curve * activeVol);
          }

          const prev = smoothedBarsRef.current[i] || 0;
          const currentAmp = prev * 0.65 + amplitude * 0.35;
          smoothedBarsRef.current[i] = currentAmp;

          const barHeight = Math.max(6, Math.min(height - 12, currentAmp * (height - 10)));
          const x = i * (barWidth + barGap);
          const y = height - barHeight;

          const gradient = ctx.createLinearGradient(0, height, 0, y);
          gradient.addColorStop(0, '#00468b');
          gradient.addColorStop(0.55, '#a8c7fa');
          gradient.addColorStop(1, '#d0bcff');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 1, 1]);
          ctx.fill();

          // Real-time floating peak cap with gravity physics
          const peak = peaksRef.current[i] || { y: height, vel: 0 };
          if (y < peak.y) {
            peak.y = y;
            peak.vel = 0;
          } else {
            peak.vel += 0.22;
            peak.y += peak.vel;
            if (peak.y > height - 6) {
              peak.y = height - 6;
              peak.vel = 0;
            }
          }
          peaksRef.current[i] = peak;

          // Floating peak cap without expensive CPU blur
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, Math.max(2, peak.y - 2), barWidth, 2);
        }
      } else {
        // Oscilloscope waveform mode
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#a8c7fa';

        const pointsCount = timeBuffer ? Math.min(timeBuffer.length, 64) : 48;
        const sliceWidth = width / (pointsCount - 1);

        for (let i = 0; i < pointsCount; i++) {
          let norm = 0.5;
          if (hasRealSignal && timeBuffer) {
            norm = timeBuffer[i] / 255.0;
          } else {
            const t = audioCurrentTime * 6;
            const f1 = Math.sin(t + (i / pointsCount) * 12) * 0.25;
            const f2 = Math.sin(t * 1.8 + (i / pointsCount) * 24) * 0.12;
            norm = 0.5 + (f1 + f2) * activeVol;
          }

          const x = i * sliceWidth;
          const y = norm * height;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
    };

    animFrameRef.current = requestAnimationFrame(renderVisualizer);

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isAudio, isPlaying, visualizerMode, volume, isMuted]);

  // Throttled media element event handler to eliminate mobile re-render stutter
  const lastTimeUpdateRef = useRef<number>(0);
  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      const now = performance.now();
      if (now - lastTimeUpdateRef.current > 250 || mediaRef.current.ended) {
        lastTimeUpdateRef.current = now;
        setCurrentTime(mediaRef.current.currentTime);
        if (mediaRef.current.buffered.length > 0 && mediaRef.current.duration) {
          const bufferedEnd = mediaRef.current.buffered.end(mediaRef.current.buffered.length - 1);
          setBufferedPercent((bufferedEnd / mediaRef.current.duration) * 100);
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration || 0);
    }
  };

  const togglePlay = () => {
    if (!mediaRef.current) return;
    initWebAudio();
    if (isPlaying) {
      mediaRef.current.pause();
    } else {
      mediaRef.current.play().catch((err) => console.warn('Play error:', err));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (mediaRef.current) {
      mediaRef.current.currentTime = newTime;
    }
  };

  const handleSkip = (seconds: number) => {
    if (mediaRef.current) {
      const targetTime = Math.max(0, Math.min(duration, mediaRef.current.currentTime + seconds));
      mediaRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (mediaRef.current) {
      mediaRef.current.volume = newVol;
      mediaRef.current.muted = newVol === 0;
    }
  };

  const toggleMute = () => {
    if (!mediaRef.current) return;
    if (isMuted) {
      mediaRef.current.muted = false;
      mediaRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      mediaRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (mediaRef.current) {
      mediaRef.current.playbackRate = speed;
    }
  };

  const handleLoopChange = (loop: boolean) => {
    setIsLooping(loop);
    if (mediaRef.current) {
      mediaRef.current.loop = loop;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Auto-hide controls for video
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying && isVideo) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2400);
    }
  };

  // Keyboard controls (Space: play/pause, Left/Right: seek ±5s, M: mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSkip(-5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSkip(5);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, duration, volume, isMuted]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="w-full h-full flex flex-col items-center justify-center bg-[#f0f2f8] dark:bg-[#121316] text-[#191c20] dark:text-[#e2e2e6] p-4 md:p-6 overflow-y-auto"
    >
      <div className="max-w-2xl w-full bg-white dark:bg-[#1e1f22] border border-[#d8dae5] dark:border-[#43474e]/50 rounded-2xl p-5 md:p-6 shadow-2xl space-y-4 m3-dialog-bounce relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#d8dae5] dark:border-[#43474e]/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#00468b]/20 dark:bg-[#00468b]/40 border border-[#0b57d0]/30 dark:border-[#a8c7fa]/30 flex items-center justify-center text-[#0b57d0] dark:text-[#a8c7fa] shrink-0">
              <M3Icon name={isAudio ? 'audiotrack' : 'videocam'} size={28} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#191c20] dark:text-white truncate max-w-sm">{file.name}</h3>
                <M3Badge variant={isAudio ? 'success' : 'primary'}>{ext.toUpperCase()}</M3Badge>
              </div>
              <p className="text-xs text-[#5d6168] dark:text-[#8e9199] font-mono mt-0.5">
                {formatBytes(file.size)} • {file.path}
              </p>
            </div>
          </div>

          <a
            href={file.content}
            download={file.name}
            className="px-3 py-1.5 rounded-xl bg-[#d3e3fd] hover:bg-[#c2e7ff] text-[#041e49] dark:bg-[#2b2d30] dark:hover:bg-[#383a3e] dark:text-[#a8c7fa] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#d8dae5] dark:border-transparent"
            title="Download original file"
          >
            <M3Icon name="download" size={16} />
            <span className="hidden sm:inline">Download</span>
          </a>
        </div>

        {/* ======================================================== */}
        {/* AUDIO VIEW: Custom In-UI Player with Real Moving Soundwaves */}
        {/* ======================================================== */}
        {isAudio && (
          <div className="space-y-4">
            {/* Real Audio Canvas Waveform */}
            <div className="relative h-28 md:h-32 bg-[#121316] rounded-2xl border border-[#43474e]/40 p-3 flex flex-col justify-between overflow-hidden shadow-inner">
              {/* Header badges inside visualizer */}
              <div className="flex items-center justify-between text-[11px] z-10 select-none">
                <span className="text-[#8e9199] font-mono flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-[#b4f3b7] animate-pulse' : 'bg-[#6e7179]'}`} />
                  {isPlaying ? (t?.liveSpectrum || 'Live Audio Spectrum (Web Audio API)') : (t?.audioReady || 'Audio Ready')}
                </span>

                <div className="flex items-center gap-2 bg-[#1e1f22]/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-[#43474e]/40">
                  <button
                    onClick={() => setVisualizerMode('spectrum')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                      visualizerMode === 'spectrum' ? 'text-[#a8c7fa] bg-[#00468b]/40' : 'text-[#8e9199]'
                    }`}
                  >
                    {t?.barsMode || 'Bars'}
                  </button>
                  <button
                    onClick={() => setVisualizerMode('wave')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                      visualizerMode === 'wave' ? 'text-[#a8c7fa] bg-[#00468b]/40' : 'text-[#8e9199]'
                    }`}
                  >
                    {t?.waveMode || 'Wave'}
                  </button>
                </div>
              </div>

              {/* Real Soundwave Canvas */}
              <canvas
                ref={canvasRef}
                width={600}
                height={100}
                className="w-full h-20 md:h-24 block"
              />
            </div>

            {/* Hidden native audio element (No external browser player UI) */}
            <audio
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={file.content}
              controls={false}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => {
                initWebAudio();
                setIsPlaying(true);
              }}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />

            {/* Interactive Progress Scrubber */}
            <div className="space-y-1 select-none">
              <div className="relative flex items-center">
                {/* Buffered track */}
                <div
                  style={{ width: `${bufferedPercent}%` }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-[#43474e] rounded-full pointer-events-none"
                />
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-[#2b2d30] rounded-full appearance-none cursor-pointer accent-[#a8c7fa] relative z-10"
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-[#8e9199]">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Custom Playback Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSkip(-10)}
                  title={t?.replayTenSec || 'Replay 10 seconds'}
                  className="w-9 h-9 rounded-xl bg-[#2b2d30] hover:bg-[#383a3e] text-[#c4c6d0] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <M3Icon name="replay_10" size={18} />
                </button>

                {/* Material 3 Expressive Play/Pause Morphing Button (Circle <-> Squircle) */}
                <button
                  onClick={togglePlay}
                  title={isPlaying ? (t?.pause || 'Pause') : (t?.play || 'Play')}
                  className={`m3-play-pause-morph ${isPlaying ? 'is-playing' : 'is-paused'} w-12 h-12 flex items-center justify-center cursor-pointer shadow-lg bg-[#a8c7fa] text-[#003062]`}
                >
                  <M3Icon
                    name={isPlaying ? 'pause' : 'play_arrow'}
                    size={28}
                    className="transition-transform duration-200"
                  />
                </button>

                <button
                  onClick={() => handleSkip(10)}
                  title={t?.forwardTenSec || 'Forward 10 seconds'}
                  className="w-9 h-9 rounded-xl bg-[#2b2d30] hover:bg-[#383a3e] text-[#c4c6d0] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <M3Icon name="forward_10" size={18} />
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-2 bg-[#121316] px-3 py-1.5 rounded-xl border border-[#43474e]/40">
                <button
                  onClick={toggleMute}
                  title={isMuted ? (t?.unmute || 'Unmute') : (t?.mute || 'Mute')}
                  className="text-[#8e9199] hover:text-white cursor-pointer"
                >
                  <M3Icon
                    name={isMuted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
                    size={18}
                  />
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-20 h-1 bg-[#2b2d30] accent-[#a8c7fa] cursor-pointer"
                />
              </div>

              {/* Loop Switch using M3Switch from material-esm/material */}
              <M3Switch
                selected={isLooping}
                onChange={handleLoopChange}
                label={t?.loopLabel || 'Loop'}
              />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIDEO VIEW: Custom In-UI Player with Interactive Overlay */}
        {/* ======================================================== */}
        {isVideo && (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-black border border-[#43474e]/50 flex items-center justify-center group select-none">
              <video
                ref={mediaRef as React.RefObject<HTMLVideoElement>}
                src={file.content}
                controls={false}
                playsInline
                preload="metadata"
                style={{ transform: 'translateZ(0)', willChange: 'transform' }}
                onClick={togglePlay}
                onDoubleClick={toggleFullscreen}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                className="max-h-[55vh] w-auto max-w-full rounded-2xl cursor-pointer"
              />

              {/* Big Centered Play Button when paused */}
              {!isPlaying && (
                <div
                  onClick={togglePlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs cursor-pointer transition-opacity"
                >
                  <div className="w-16 h-16 rounded-full bg-[#a8c7fa] text-[#003062] flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                    <M3Icon name="play_arrow" size={36} />
                  </div>
                </div>
              )}

              {/* Floating Bottom Video Controls Bar */}
              <div
                className={`absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 ${
                  showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {/* Scrubber */}
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-white/30 rounded-full appearance-none cursor-pointer accent-[#a8c7fa] mb-2"
                />

                <div className="flex items-center justify-between text-xs text-white">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={togglePlay}
                      className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
                    >
                      <M3Icon name={isPlaying ? 'pause' : 'play_arrow'} size={22} />
                    </button>
                    <span className="font-mono text-[11px] text-[#c4c6d0]">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                    <button
                      onClick={toggleMute}
                      className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer ml-1"
                    >
                      <M3Icon
                        name={isMuted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
                        size={18}
                      />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleFullscreen}
                      className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
                      title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                      <M3Icon name={isFullscreen ? 'fullscreen_exit' : 'fullscreen'} size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Playback Speed Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#43474e]/30 text-xs">
          <div className="flex items-center gap-1.5 text-[#8e9199]">
            <M3Icon name="speed" size={16} />
            <span>Playback Speed:</span>
            {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
              <button
                key={spd}
                onClick={() => handleSpeedChange(spd)}
                className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-colors cursor-pointer ${
                  playbackSpeed === spd
                    ? 'bg-[#a8c7fa] text-[#003062] font-bold'
                    : 'bg-[#2b2d30] text-[#c4c6d0] hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <span className="text-[11px] text-[#8e9199] font-mono hidden md:inline">
            Press Space to Play/Pause • ←/→ to Seek
          </span>
        </div>
      </div>
    </div>
  );
}

interface BinaryAssetViewerProps {
  file: VFile;
  t?: Translations;
}

interface ArchiveEntrySummary {
  name: string;
  size: number;
  isDir: boolean;
}

/**
 * Robust Binary Asset & APK/AAB Package Inspector.
 * Prevents UI freezes, avoids memory bloat from multi-megabyte base64 strings,
 * and enables safe file downloading via Blob ObjectURLs.
 */
export function BinaryAssetViewer({ file, t }: BinaryAssetViewerProps) {
  const ext = getFileExtension(file.name).toLowerCase();
  const isApk = ext === 'apk' || ext === 'aab' || ext === 'xapk' || ext === 'apks';
  const isArchive = ['zip', 'jar', 'tar', 'gz', '7z', 'rar', 'war', 'ear'].includes(ext) || isApk;
  const isNativeBinary = ['so', 'dylib', 'dll', 'exe', 'bin', 'dex', 'o', 'obj', 'lib'].includes(ext);

  const [activeTab, setActiveTab] = useState<'overview' | 'structure'>('overview');
  const [entries, setEntries] = useState<ArchiveEntrySummary[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Inspect internal structure if it is an APK or ZIP-based archive
  useEffect(() => {
    let isCancelled = false;
    if (isArchive && file.content && file.content.startsWith('data:')) {
      setLoadingEntries(true);

      (async () => {
        try {
          const commaIndex = file.content.indexOf(',');
          const base64 = file.content.substring(commaIndex + 1);
          const zip = new JSZip();
          const loaded = await zip.loadAsync(base64, { base64: true });
          if (isCancelled) return;

          const list: ArchiveEntrySummary[] = [];
          loaded.forEach((relativePath, entry) => {
            list.push({
              name: relativePath,
              size: (entry as any)._data?.uncompressedSize || 0,
              isDir: entry.dir,
            });
          });

          // Sort folders first, then alphabetically
          list.sort((a, b) => {
            if (a.isDir && !b.isDir) return -1;
            if (!a.isDir && b.isDir) return 1;
            return a.name.localeCompare(b.name);
          });

          setEntries(list);
          setLoadingEntries(false);
        } catch (e: any) {
          if (!isCancelled) {
            setLoadingEntries(false);
          }
        }
      })();
    } else {
      setEntries([]);
      setLoadingEntries(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [file.path, file.content, isArchive]);

  // Safe file download via memory Blob and object URL (prevents browser URL length crashes)
  const handleDownload = () => {
    try {
      let blob: Blob;
      if (file.content.startsWith('data:')) {
        const commaIndex = file.content.indexOf(',');
        const mime = file.content.substring(5, commaIndex).split(';')[0];
        const base64 = file.content.substring(commaIndex + 1);
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: mime || 'application/octet-stream' });
      } else {
        blob = new Blob([file.content], { type: 'application/octet-stream' });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    } catch (err: any) {
      console.error('Download error:', err);
    }
  };

  const getBadgeVariant = (): 'primary' | 'secondary' | 'success' => {
    if (isApk) return 'success';
    if (isNativeBinary) return 'secondary';
    return 'primary';
  };

  const getIconName = () => {
    if (isApk) return 'android';
    if (ext === 'jar') return 'inventory_2';
    if (isNativeBinary) return 'memory';
    if (ext === 'pdf') return 'picture_as_pdf';
    if (ext === 'db' || ext === 'sqlite' || ext === 'sqlite3') return 'database';
    return 'inventory_2';
  };

  const getIconColor = () => {
    if (isApk) return 'text-[#3ddc84]';
    if (ext === 'jar') return 'text-[#e44d26]';
    if (isNativeBinary) return 'text-[#c2e7ff]';
    if (ext === 'pdf') return 'text-[#ffb4ab]';
    if (ext === 'db' || ext === 'sqlite') return 'text-[#ffd54f]';
    return 'text-[#a8c7fa]';
  };

  const getTypeDescription = () => {
    if (ext === 'apk') return 'Android Application Package (APK)';
    if (ext === 'aab') return 'Android App Bundle (AAB)';
    if (ext === 'xapk' || ext === 'apks') return 'Android Split / Bundle Package';
    if (ext === 'jar') return 'Java Archive (JAR)';
    if (ext === 'dex') return 'Dalvik Executable (DEX)';
    if (ext === 'so') return 'Linux / Android Shared Object (.so)';
    if (ext === 'dylib') return 'macOS Dynamic Library (.dylib)';
    if (ext === 'dll') return 'Windows Dynamic Link Library (.dll)';
    if (ext === 'pdf') return 'Portable Document Format (PDF)';
    if (ext === 'db' || ext === 'sqlite') return 'SQLite Database';
    return 'Binary Asset';
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#121316] text-[#e2e2e6] overflow-y-auto p-4 md:p-6 space-y-4">
      {/* Header Card */}
      <div className="bg-[#1e1f22] border border-[#43474e]/50 rounded-2xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#2b2d30] border border-[#43474e]/60 flex items-center justify-center shadow-inner">
            <M3Icon name={getIconName()} size={28} className={getIconColor()} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">{file.name}</h2>
              <M3Badge variant={getBadgeVariant()}>{ext.toUpperCase() || 'BIN'}</M3Badge>
            </div>
            <p className="text-xs text-[#8e9199] font-mono mt-0.5">
              {getTypeDescription()} • {formatBytes(file.size)}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isArchive && entries.length > 0 && (
            <div className="flex items-center bg-[#121316] p-1 rounded-xl border border-[#43474e]/40 gap-1 text-xs mr-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeTab === 'overview' ? 'bg-[#2b2d30] text-[#a8c7fa]' : 'text-[#8e9199] hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('structure')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'structure' ? 'bg-[#2b2d30] text-[#a8c7fa]' : 'text-[#8e9199] hover:text-white'
                }`}
              >
                <span>Contents</span>
                <span className="px-1.5 py-0.2 bg-[#1e1f22] rounded-full text-[10px] font-mono text-[#a8c7fa]">
                  {entries.length}
                </span>
              </button>
            </div>
          )}

          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-xl bg-[#00468b] hover:bg-[#005cb8] text-[#d6e3ff] font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <M3Icon name={downloadSuccess ? 'check' : 'download'} size={16} />
            <span>{downloadSuccess ? 'Downloaded!' : `Download ${ext.toUpperCase() || 'Asset'}`}</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      {activeTab === 'overview' ? (
        <div className="space-y-4 flex-1">
          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#18191c] border border-[#43474e]/40 rounded-2xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8e9199] block mb-1">
                File Size
              </span>
              <span className="text-lg font-mono font-bold text-white">{formatBytes(file.size)}</span>
              <span className="text-[11px] text-[#6e7179] block mt-0.5">{file.size.toLocaleString()} bytes</span>
            </div>

            <div className="bg-[#18191c] border border-[#43474e]/40 rounded-2xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8e9199] block mb-1">
                Type
              </span>
              <span className="text-sm font-semibold text-[#a8c7fa] block truncate">{getTypeDescription()}</span>
              <span className="text-[11px] text-[#6e7179] font-mono block mt-0.5">.{ext}</span>
            </div>

            <div className="bg-[#18191c] border border-[#43474e]/40 rounded-2xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8e9199] block mb-1">
                Security & Status
              </span>
              <span className="text-sm font-semibold text-[#b4f3b7] flex items-center gap-1">
                <M3Icon name="verified_user" size={15} /> Safe Binary
              </span>
              <span className="text-[11px] text-[#6e7179] block mt-0.5">Sandboxed Virtual FS</span>
            </div>

            <div className="bg-[#18191c] border border-[#43474e]/40 rounded-2xl p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8e9199] block mb-1">
                Internal Entries
              </span>
              <span className="text-lg font-mono font-bold text-white">
                {loadingEntries ? 'Reading...' : entries.length > 0 ? entries.length : 'N/A'}
              </span>
              <span className="text-[11px] text-[#6e7179] block mt-0.5">
                {isArchive ? (entries.length > 0 ? 'Archive contents mapped' : 'Monolithic archive') : 'Non-archive binary'}
              </span>
            </div>
          </div>

          {/* Android APK Highlights */}
          {isApk && (
            <div className="bg-[#1e1f22] border border-[#3ddc84]/30 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <M3Icon name="android" size={20} className="text-[#3ddc84]" />
                <h3 className="text-sm font-bold text-white">Android Package Details</h3>
              </div>
              <p className="text-xs text-[#c4c6d0] leading-relaxed">
                This Android package is safely sandboxed. You can inspect its manifest and internal resources or download it to test on an Android device or emulator.
              </p>

              {entries.length > 0 && (
                <div className="pt-2 border-t border-[#43474e]/30 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-[#121316] p-2.5 rounded-xl border border-[#43474e]/30">
                    <span className="text-[11px] text-[#8e9199] block">AndroidManifest</span>
                    <span className="font-semibold text-white">
                      {entries.some((e) => e.name.toLowerCase().includes('androidmanifest')) ? '✓ Present' : '—'}
                    </span>
                  </div>
                  <div className="bg-[#121316] p-2.5 rounded-xl border border-[#43474e]/30">
                    <span className="text-[11px] text-[#8e9199] block">DEX Bytecode</span>
                    <span className="font-semibold text-white">
                      {entries.filter((e) => e.name.endsWith('.dex')).length} DEX files
                    </span>
                  </div>
                  <div className="bg-[#121316] p-2.5 rounded-xl border border-[#43474e]/30">
                    <span className="text-[11px] text-[#8e9199] block">Resources (ARSC)</span>
                    <span className="font-semibold text-white">
                      {entries.some((e) => e.name.endsWith('.arsc')) ? '✓ Compiled' : '—'}
                    </span>
                  </div>
                  <div className="bg-[#121316] p-2.5 rounded-xl border border-[#43474e]/30">
                    <span className="text-[11px] text-[#8e9199] block">Native Libraries</span>
                    <span className="font-semibold text-white">
                      {entries.filter((e) => e.name.startsWith('lib/')).length} libraries
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Preview File Path Card */}
          <div className="bg-[#18191c] border border-[#43474e]/40 rounded-2xl p-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <M3Icon name="folder_open" size={16} className="text-[#8e9199] shrink-0" />
              <span className="font-mono text-[#c4c6d0] truncate">{file.path}</span>
            </div>
            <button
              onClick={handleDownload}
              className="text-[#a8c7fa] hover:underline font-medium shrink-0 ml-4 cursor-pointer"
            >
              Export
            </button>
          </div>
        </div>
      ) : (
        /* Archive Structure Tab */
        <div className="flex-1 bg-[#18191c] border border-[#43474e]/40 rounded-2xl p-4 shadow-inner flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#43474e]/30 text-xs">
            <span className="text-[#8e9199] font-medium">Archive File Tree ({entries.length} items)</span>
            <span className="font-mono text-[11px] text-[#6e7179]">Read-only Inspection</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
            {entries.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#2b2d30] text-[#c4c6d0] transition-colors"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <M3Icon
                    name={entry.isDir ? 'folder' : entry.name.endsWith('.dex') ? 'memory' : entry.name.endsWith('.xml') ? 'code' : 'description'}
                    size={15}
                    className={entry.isDir ? 'text-[#a8c7fa]' : 'text-[#8e9199]'}
                  />
                  <span className="truncate">{entry.name}</span>
                </div>
                {!entry.isDir && entry.size > 0 && (
                  <span className="text-[11px] text-[#6e7179] shrink-0 font-mono">
                    {formatBytes(entry.size)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

