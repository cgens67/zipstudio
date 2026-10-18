/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { VFile, generatePreviewHtml } from '../utils/fileSystem';
import { M3Icon, M3IconButton } from './M3Components';

interface PreviewProps {
  files: Record<string, VFile>;
  onConsoleMessage?: (logType: 'log' | 'warn' | 'error' | 'info', message: string) => void;
}

export function Preview({ files, onConsoleMessage }: PreviewProps) {
  const [viewportMode, setViewportMode] = useState<'responsive' | 'tablet' | 'mobile'>('responsive');
  const [htmlContent, setHtmlContent] = useState('');
  const [key, setKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Debounced preview generation to avoid lag while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      const generated = generatePreviewHtml(files);
      setHtmlContent(generated);
      setKey((prev) => prev + 1);
    }, 250);

    return () => clearTimeout(timer);
  }, [files]);

  // Listen to postMessage from the sandboxed preview iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'PREVIEW_CONSOLE_LOG') {
        if (onConsoleMessage) {
          onConsoleMessage(e.data.logType, e.data.message);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onConsoleMessage]);

  const handleRefresh = () => {
    setKey((prev) => prev + 1);
  };

  const getViewportWidth = () => {
    switch (viewportMode) {
      case 'mobile':
        return '375px';
      case 'tablet':
        return '768px';
      default:
        return '100%';
    }
  };

  return (
    <div className="flex-1 h-full bg-[#121316] flex flex-col border-l border-[#43474e]/40 overflow-hidden">
      {/* Browser Bar */}
      <div className="h-10 px-3 bg-[#1e1f22] border-b border-[#43474e]/30 flex items-center justify-between gap-3">
        {/* Navigation buttons & Mock Address bar */}
        <div className="flex items-center gap-1.5 flex-1 max-w-xl">
          <M3IconButton
            size="sm"
            icon="refresh"
            label="Reload Preview"
            onClick={handleRefresh}
          />
          <div className="flex-1 h-7 bg-[#121316] border border-[#43474e]/40 rounded-full px-3 flex items-center gap-1.5 text-xs text-[#c4c6d0]">
            <M3Icon name="lock" size={12} className="text-[#b4f3b7]" />
            <span className="truncate font-mono text-[11px] text-[#8e9199]">
              https://preview.local/index.html
            </span>
          </div>
        </div>

        {/* Viewport switchers */}
        <div className="flex items-center gap-1 bg-[#121316] p-0.5 rounded-lg border border-[#43474e]/30">
          <button
            onClick={() => setViewportMode('responsive')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
              viewportMode === 'responsive'
                ? 'bg-[#a8c7fa] text-[#003062]'
                : 'text-[#8e9199] hover:text-white'
            }`}
            title="Desktop / Responsive"
          >
            <M3Icon name="desktop_windows" size={14} />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            onClick={() => setViewportMode('tablet')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
              viewportMode === 'tablet'
                ? 'bg-[#a8c7fa] text-[#003062]'
                : 'text-[#8e9199] hover:text-white'
            }`}
            title="Tablet (768px)"
          >
            <M3Icon name="tablet" size={14} />
            <span className="hidden sm:inline">Tablet</span>
          </button>
          <button
            onClick={() => setViewportMode('mobile')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
              viewportMode === 'mobile'
                ? 'bg-[#a8c7fa] text-[#003062]'
                : 'text-[#8e9199] hover:text-white'
            }`}
            title="Mobile (375px)"
          >
            <M3Icon name="smartphone" size={14} />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 bg-[#0b0c0e] flex items-center justify-center p-2 overflow-auto">
        <div
          style={{ width: getViewportWidth() }}
          className="h-full bg-white rounded-lg shadow-xl overflow-hidden transition-all duration-300 flex flex-col border border-[#43474e]/30"
        >
          <iframe
            key={key}
            ref={iframeRef}
            srcDoc={htmlContent}
            title="ZipStudio Live Preview"
            sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
            className="w-full h-full border-none bg-white"
          />
        </div>
      </div>
    </div>
  );
}
