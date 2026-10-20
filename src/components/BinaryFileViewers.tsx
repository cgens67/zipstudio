/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { VFile, getFileExtension, isFontExtension, isAudioExtension, isVideoExtension, formatBytes } from '../utils/fileSystem';
import { M3Icon, M3Badge, M3Button, M3IconButton } from './M3Components';
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
    <div className="w-full h-full flex flex-col bg-[#121316] text-[#e2e2e6] overflow-y-auto p-4 md:p-6 space-y-4">
      {/* Header Card */}
      <div className="bg-[#1e1f22] border border-[#43474e]/50 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00468b]/40 border border-[#a8c7fa]/30 flex items-center justify-center text-[#a8c7fa]">
            <M3Icon name="font_download" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">{file.name}</h2>
              <M3Badge variant="primary">{ext.toUpperCase()}</M3Badge>
            </div>
            <p className="text-xs text-[#8e9199] font-mono mt-0.5">
              {formatBytes(file.size)} • {file.path}
            </p>
          </div>
        </div>

        {/* View mode tabs */}
        <div className="flex items-center bg-[#121316] p-1 rounded-xl border border-[#43474e]/40 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('sample')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'sample' ? 'bg-[#2b2d30] text-[#a8c7fa]' : 'text-[#8e9199] hover:text-white'
            }`}
          >
            Sample Text
          </button>
          <button
            onClick={() => setActiveTab('glyphs')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'glyphs' ? 'bg-[#2b2d30] text-[#a8c7fa]' : 'text-[#8e9199] hover:text-white'
            }`}
          >
            Glyph Matrix
          </button>
          <button
            onClick={() => setActiveTab('waterfall')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'waterfall' ? 'bg-[#2b2d30] text-[#a8c7fa]' : 'text-[#8e9199] hover:text-white'
            }`}
          >
            Type Waterfall
          </button>
        </div>
      </div>

      {/* Font Controls Toolbar */}
      <div className="bg-[#1e1f22] border border-[#43474e]/40 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-4 text-xs">
        {/* Sample Text Input */}
        <div className="flex-1 min-w-[240px]">
          <label className="text-[11px] font-semibold uppercase text-[#8e9199] block mb-1">
            Custom Preview Text
          </label>
          <input
            type="text"
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            className="w-full bg-[#121316] border border-[#43474e] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#a8c7fa]"
            placeholder="Type custom text..."
          />
        </div>

        {/* Font Size Slider */}
        <div className="w-48">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-semibold uppercase text-[#8e9199]">Size</span>
            <span className="font-mono text-[#a8c7fa] font-bold">{fontSize}px</span>
          </div>
          <input
            type="range"
            min={12}
            max={96}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full accent-[#a8c7fa] cursor-pointer"
          />
        </div>

        {/* Letter Spacing */}
        <div className="w-36">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-semibold uppercase text-[#8e9199]">Spacing</span>
            <span className="font-mono text-[#a8c7fa]">{letterSpacing}px</span>
          </div>
          <input
            type="range"
            min={-3}
            max={12}
            value={letterSpacing}
            onChange={(e) => setLetterSpacing(Number(e.target.value))}
            className="w-full accent-[#a8c7fa] cursor-pointer"
          />
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-2 pt-3">
          <button
            onClick={() => setIsItalic(!isItalic)}
            className={`px-3 py-2 rounded-xl border flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
              isItalic
                ? 'bg-[#00468b]/40 text-[#a8c7fa] border-[#a8c7fa]/50'
                : 'bg-[#121316] text-[#8e9199] border-[#43474e] hover:text-white'
            }`}
          >
            <M3Icon name="format_italic" size={16} />
            Italic
          </button>
          <button
            onClick={() => {
              setFontSize(32);
              setLetterSpacing(0);
              setIsItalic(false);
              setSampleText('The quick brown fox jumps over the lazy dog 1234567890');
            }}
            className="px-3 py-2 rounded-xl bg-[#121316] text-[#8e9199] border border-[#43474e] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <M3Icon name="restart_alt" size={16} />
            Reset
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      {activeTab === 'sample' && (
        <div className="flex-1 bg-[#18191c] border border-[#43474e]/40 rounded-2xl p-6 shadow-inner flex flex-col justify-center min-h-[220px]">
          <div
            style={{
              fontFamily: `'${fontFamily}', sans-serif`,
              fontSize: `${fontSize}px`,
              letterSpacing: `${letterSpacing}px`,
              fontStyle: isItalic ? 'italic' : 'normal',
              lineHeight: 1.3,
            }}
            className="text-white whitespace-pre-wrap break-words selection:bg-[#a8c7fa] selection:text-[#003062]"
          >
            {sampleText || ' '}
          </div>
        </div>
      )}

      {/* Glyph Matrix */}
      {activeTab === 'glyphs' && (
        <div className="flex-1 bg-[#18191c] border border-[#43474e]/40 rounded-2xl p-6 shadow-inner space-y-6">
          {/* Uppercase */}
          <div>
            <div className="text-xs font-semibold uppercase text-[#8e9199] mb-2 tracking-wider">
              Uppercase Characters (A-Z)
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-13 gap-2">
              {uppercaseChars.map((ch) => (
                <div
                  key={ch}
                  style={{ fontFamily: `'${fontFamily}', sans-serif` }}
                  className="h-12 rounded-xl bg-[#2b2d30] hover:bg-[#383a3e] border border-[#43474e]/40 flex items-center justify-center text-xl text-white select-none transition-colors"
                >
                  {ch}
                </div>
              ))}
            </div>
          </div>

          {/* Lowercase */}
          <div>
            <div className="text-xs font-semibold uppercase text-[#8e9199] mb-2 tracking-wider">
              Lowercase Characters (a-z)
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-13 gap-2">
              {lowercaseChars.map((ch) => (
                <div
                  key={ch}
                  style={{ fontFamily: `'${fontFamily}', sans-serif` }}
                  className="h-12 rounded-xl bg-[#2b2d30] hover:bg-[#383a3e] border border-[#43474e]/40 flex items-center justify-center text-xl text-white select-none transition-colors"
                >
                  {ch}
                </div>
              ))}
            </div>
          </div>

          {/* Numbers */}
          <div>
            <div className="text-xs font-semibold uppercase text-[#8e9199] mb-2 tracking-wider">
              Numerals (0-9)
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {numberChars.map((ch) => (
                <div
                  key={ch}
                  style={{ fontFamily: `'${fontFamily}', sans-serif` }}
                  className="h-12 rounded-xl bg-[#2b2d30] hover:bg-[#383a3e] border border-[#43474e]/40 flex items-center justify-center text-xl text-[#a8c7fa] select-none transition-colors"
                >
                  {ch}
                </div>
              ))}
            </div>
          </div>

          {/* Symbols */}
          <div>
            <div className="text-xs font-semibold uppercase text-[#8e9199] mb-2 tracking-wider">
              Symbols & Punctuation
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
              {symbolChars.map((ch, idx) => (
                <div
                  key={idx}
                  style={{ fontFamily: `'${fontFamily}', sans-serif` }}
                  className="h-12 rounded-xl bg-[#2b2d30] hover:bg-[#383a3e] border border-[#43474e]/40 flex items-center justify-center text-lg text-[#ffd54f] select-none transition-colors"
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
        <div className="flex-1 bg-[#18191c] border border-[#43474e]/40 rounded-2xl p-6 shadow-inner space-y-6">
          {waterfallSizes.map((px) => (
            <div key={px} className="border-b border-[#43474e]/30 pb-4 last:border-b-0">
              <span className="text-[10px] font-mono font-bold text-[#a8c7fa] block mb-1">
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
                className="text-white whitespace-pre-wrap break-words"
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

/**
 * Integrated Audio and Video Player with Material 3 styling and responsive controls.
 */
export function MediaPlayer({ file }: BinaryViewerProps) {
  const ext = getFileExtension(file.name).toLowerCase();
  const isAudio = isAudioExtension(ext);
  const isVideo = isVideoExtension(ext);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement>(null);

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (mediaRef.current) {
      mediaRef.current.playbackRate = speed;
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#121316] text-[#e2e2e6] p-6 overflow-y-auto">
      <div className="max-w-2xl w-full bg-[#1e1f22] border border-[#43474e]/50 rounded-2xl p-6 shadow-2xl space-y-5 m3-dialog-bounce">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#43474e]/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#00468b]/40 border border-[#a8c7fa]/30 flex items-center justify-center text-[#a8c7fa]">
              <M3Icon name={isAudio ? 'audiotrack' : 'videocam'} size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white truncate max-w-sm">{file.name}</h3>
                <M3Badge variant={isAudio ? 'success' : 'primary'}>{ext.toUpperCase()}</M3Badge>
              </div>
              <p className="text-xs text-[#8e9199] font-mono mt-0.5">
                {formatBytes(file.size)} • {file.path}
              </p>
            </div>
          </div>
        </div>

        {/* Media Render */}
        {isAudio ? (
          <div className="space-y-4">
            {/* Visualizer Waveform Animation */}
            <div className="h-24 bg-[#121316] rounded-xl border border-[#43474e]/30 flex items-center justify-center gap-1.5 px-4 overflow-hidden">
              {Array.from({ length: 36 }).map((_, i) => {
                const heightPercent = 20 + ((Math.sin(i * 0.45) + 1) * 35);
                return (
                  <div
                    key={i}
                    style={{
                      height: isPlaying ? `${Math.max(15, heightPercent + (Math.random() * 20))}%` : '24%',
                      transition: 'height 0.18s ease',
                    }}
                    className={`w-1 rounded-full ${
                      isPlaying ? 'bg-[#a8c7fa]' : 'bg-[#43474e]'
                    }`}
                  />
                );
              })}
            </div>

            {/* Audio Element with controls */}
            <audio
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={file.content}
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              className="w-full accent-[#a8c7fa] rounded-lg"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden bg-black border border-[#43474e]/40 flex items-center justify-center">
              <video
                ref={mediaRef as React.RefObject<HTMLVideoElement>}
                src={file.content}
                controls
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                className="max-h-[50vh] w-auto max-w-full rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Playback Speed Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#43474e]/30 text-xs">
          <div className="flex items-center gap-1.5 text-[#8e9199]">
            <M3Icon name="speed" size={16} />
            <span>Speed:</span>
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

          <a
            href={file.content}
            download={file.name}
            className="px-3 py-1.5 rounded-xl bg-[#2b2d30] hover:bg-[#383a3e] text-[#a8c7fa] text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <M3Icon name="download" size={16} />
            Download Asset
          </a>
        </div>
      </div>
    </div>
  );
}
