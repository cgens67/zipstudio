/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { VFile, generatePreviewHtml, getFileExtension } from '../utils/fileSystem';
import { isAndroidVectorDrawable, parseAndroidVectorXml, ParsedVectorDrawable } from '../utils/vectorParser';
import { M3Icon, M3IconButton } from './M3Components';
import { Translations, TRANSLATIONS } from '../utils/i18n';

interface PreviewProps {
  files: Record<string, VFile>;
  activeFile?: VFile | null;
  activeFilePath?: string | null;
  onConsoleMessage?: (logType: 'log' | 'warn' | 'error' | 'info', message: string) => void;
  t?: Translations;
  onMaximize?: () => void;
  isMaximized?: boolean;
}

/**
 * Lightweight, robust markdown parser for GFM formatting
 */
function renderMarkdown(md: string): string {
  if (!md) return '';

  let html = md
    // Escape HTML tags to prevent XSS
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Fenced code blocks
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    return `<div class="my-4 rounded-xl overflow-hidden border border-[#43474e]/40 bg-[#121316]">
      <div class="px-3 py-1.5 bg-[#1e1f22] text-[#8e9199] text-[11px] font-mono flex items-center justify-between border-b border-[#43474e]/30">
        <span>${lang || 'code'}</span>
      </div>
      <pre class="p-3.5 overflow-x-auto font-mono text-xs leading-relaxed text-[#c4c6d0]"><code>${code}</code></pre>
    </div>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-[#1e1f22] border border-[#43474e]/40 text-[#a8c7fa] font-mono text-xs">$1</code>');

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold text-white mt-5 mb-2 pb-1 border-b border-[#43474e]/30">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-white mt-6 mb-2 pb-1.5 border-b border-[#43474e]/40">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-extrabold text-[#a8c7fa] mt-6 mb-3 pb-2 border-b border-[#a8c7fa]/20">$1</h1>');
  html = html.replace(/^#### (.*$)/gim, '<h4 class="text-sm font-semibold text-[#e2e2e6] mt-4 mb-2">$1</h4>');

  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-[#a8c7fa] pl-4 py-1 my-3 text-sm italic text-[#c4c6d0] bg-[#1e1f22]/50 rounded-r-lg">$1</blockquote>');

  // Horizontal Rules
  html = html.replace(/^---$/gim, '<hr class="my-6 border-[#43474e]/40" />');

  // Task lists
  html = html.replace(/^- \[x\] (.*$)/gim, '<li class="flex items-center gap-2 list-none my-1"><input type="checkbox" checked disabled class="accent-[#a8c7fa] rounded" /> <span class="line-through text-[#8e9199]">$1</span></li>');
  html = html.replace(/^- \[ \] (.*$)/gim, '<li class="flex items-center gap-2 list-none my-1"><input type="checkbox" disabled class="accent-[#a8c7fa] rounded" /> <span>$1</span></li>');

  // Unordered list items
  html = html.replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-sm text-[#e2e2e6] my-1">$1</li>');

  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-[#c4c6d0]">$1</em>');
  html = html.replace(/~~([^~]+)~~/g, '<del class="line-through text-[#8e9199]">$1</del>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="text-[#a8c7fa] hover:underline">$1 ↗</a>');

  // Paragraphs
  const lines = html.split('\n');
  const result: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('<li')) {
      if (!inList) {
        result.push('<ul class="my-2 space-y-1">');
        inList = true;
      }
      result.push(line);
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      if (trimmed && !trimmed.startsWith('<h') && !trimmed.startsWith('<pre') && !trimmed.startsWith('<div') && !trimmed.startsWith('<hr') && !trimmed.startsWith('<blockquote')) {
        result.push(`<p class="text-sm leading-relaxed text-[#c4c6d0] my-2">${line}</p>`);
      } else {
        result.push(line);
      }
    }
  }
  if (inList) result.push('</ul>');

  return result.join('\n');
}

export function Preview({
  files,
  activeFile,
  activeFilePath,
  onConsoleMessage,
  t = TRANSLATIONS.en,
  onMaximize,
  isMaximized,
}: PreviewProps) {
  const [viewportMode, setViewportMode] = useState<'responsive' | 'tablet' | 'mobile'>('responsive');
  const [htmlContent, setHtmlContent] = useState('');
  const [key, setKey] = useState(0);

  // Zoom & pan states for vector / SVG viewer
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [isCheckerboardBg, setIsCheckerboardBg] = useState(true);

  // Active file detection
  const resolvedActiveFile = activeFile || (activeFilePath ? files[activeFilePath] : null);
  const fileExt = resolvedActiveFile ? getFileExtension(resolvedActiveFile.path).toLowerCase() : '';

  const isMarkdown = fileExt === 'md' || fileExt === 'markdown';
  const isSvg = fileExt === 'svg';
  const isVectorXml =
    (fileExt === 'xml' || resolvedActiveFile?.name.endsWith('.xml')) &&
    resolvedActiveFile?.content &&
    isAndroidVectorDrawable(resolvedActiveFile.content);

  const supportsDedicatedPreview = isMarkdown || isSvg || isVectorXml;

  // View mode: 'file' (markdown/svg/vector) vs 'webapp' (index.html)
  const [previewTab, setPreviewTab] = useState<'file' | 'webapp'>('file');

  // When active file changes to one that supports dedicated preview, default to 'file' tab
  useEffect(() => {
    if (supportsDedicatedPreview) {
      setPreviewTab('file');
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
    } else {
      setPreviewTab('webapp');
    }
  }, [resolvedActiveFile?.path, supportsDedicatedPreview]);

  // Debounced web preview generation
  useEffect(() => {
    const timer = setTimeout(() => {
      const generated = generatePreviewHtml(files);
      setHtmlContent(generated);
      setKey((prev) => prev + 1);
    }, 250);

    return () => clearTimeout(timer);
  }, [files]);

  // Listen to postMessage from sandboxed iframe
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

  // Parsed Android Vector Drawable
  const parsedVector: ParsedVectorDrawable | null = useMemo(() => {
    if (!isVectorXml || !resolvedActiveFile?.content) return null;
    return parseAndroidVectorXml(resolvedActiveFile.content);
  }, [isVectorXml, resolvedActiveFile?.content]);

  // Rendered SVG markup
  const svgMarkup = useMemo(() => {
    if (isSvg && resolvedActiveFile) {
      if (resolvedActiveFile.isBinary && resolvedActiveFile.content.startsWith('data:image/svg+xml;base64,')) {
        try {
          const base64 = resolvedActiveFile.content.replace('data:image/svg+xml;base64,', '');
          return atob(base64);
        } catch {
          return '';
        }
      }
      return resolvedActiveFile.content;
    }
    return '';
  }, [isSvg, resolvedActiveFile]);

  // Markdown HTML
  const markdownHtml = useMemo(() => {
    if (!isMarkdown || !resolvedActiveFile?.content) return '';
    return renderMarkdown(resolvedActiveFile.content);
  }, [isMarkdown, resolvedActiveFile?.content]);

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(5, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.25, +(z - 0.25).toFixed(2)));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y,
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  const handleRefresh = () => {
    setKey((prev) => prev + 1);
  };

  const handleOpenExternal = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
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
    <div className="flex-1 h-full bg-[#121316] flex flex-col border-l border-[#43474e]/40 overflow-hidden select-none">
      {/* Browser Bar */}
      <div className="h-10 px-3 bg-[#1e1f22] border-b border-[#43474e]/30 flex items-center justify-between gap-2 shrink-0">
        {/* Navigation & Mode Selection */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {supportsDedicatedPreview ? (
            <div className="flex items-center bg-[#121316] p-0.5 rounded-lg border border-[#43474e]/40 shrink-0">
              <button
                onClick={() => setPreviewTab('file')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  previewTab === 'file'
                    ? 'bg-[#2b2d30] text-[#a8c7fa] shadow-sm'
                    : 'text-[#8e9199] hover:text-[#e2e2e6]'
                }`}
              >
                <M3Icon
                  name={isMarkdown ? 'article' : isVectorXml ? 'polyline' : 'draw'}
                  size={14}
                />
                <span className="truncate max-w-[130px]">
                  {isMarkdown
                    ? t.markdownPreview
                    : isVectorXml
                    ? t.vectorPreview
                    : 'SVG'}
                </span>
              </button>
              <button
                onClick={() => setPreviewTab('webapp')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  previewTab === 'webapp'
                    ? 'bg-[#2b2d30] text-[#a8c7fa] shadow-sm'
                    : 'text-[#8e9199] hover:text-[#e2e2e6]'
                }`}
              >
                <M3Icon name="web" size={14} />
                <span>{t.webAppPreview}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <M3IconButton
                size="sm"
                icon="refresh"
                label={t.reload}
                onClick={handleRefresh}
              />
              <div className="flex-1 max-w-sm h-7 bg-[#121316] border border-[#43474e]/40 rounded-full px-3 flex items-center gap-1.5 text-xs text-[#c4c6d0]">
                <M3Icon name="lock" size={12} className="text-[#b4f3b7]" />
                <span className="truncate font-mono text-[11px] text-[#8e9199]">
                  https://preview.local/index.html
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Viewport & Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {previewTab === 'file' && (isSvg || isVectorXml) && (
            <div className="flex items-center gap-1 mr-2 bg-[#121316] px-1.5 py-0.5 rounded-lg border border-[#43474e]/40">
              <button
                onClick={handleZoomOut}
                title={t.zoomOut}
                className="w-6 h-6 rounded flex items-center justify-center text-[#8e9199] hover:text-white hover:bg-white/10"
              >
                <M3Icon name="remove" size={14} />
              </button>
              <button
                onClick={handleResetZoom}
                title={t.resetZoom}
                className="px-1 text-[11px] font-mono text-[#a8c7fa] hover:underline"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                title={t.zoomIn}
                className="w-6 h-6 rounded flex items-center justify-center text-[#8e9199] hover:text-white hover:bg-white/10"
              >
                <M3Icon name="add" size={14} />
              </button>
              <div className="w-[1px] h-3.5 bg-[#43474e]/50 mx-1" />
              <button
                onClick={() => setIsCheckerboardBg((v) => !v)}
                title={t.toggleBackground}
                className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                  isCheckerboardBg ? 'text-[#a8c7fa] bg-[#2b2d30]' : 'text-[#8e9199] hover:text-white'
                }`}
              >
                <M3Icon name="grid_view" size={14} />
              </button>
            </div>
          )}

          {previewTab === 'webapp' && (
            <div className="flex items-center bg-[#121316] p-0.5 rounded-lg border border-[#43474e]/40">
              <button
                onClick={() => setViewportMode('responsive')}
                title={t.desktop}
                className={`p-1 rounded ${
                  viewportMode === 'responsive'
                    ? 'bg-[#2b2d30] text-[#a8c7fa]'
                    : 'text-[#8e9199] hover:text-[#e2e2e6]'
                }`}
              >
                <M3Icon name="desktop_windows" size={14} />
              </button>
              <button
                onClick={() => setViewportMode('tablet')}
                title={t.tablet}
                className={`p-1 rounded ${
                  viewportMode === 'tablet'
                    ? 'bg-[#2b2d30] text-[#a8c7fa]'
                    : 'text-[#8e9199] hover:text-[#e2e2e6]'
                }`}
              >
                <M3Icon name="tablet_mac" size={14} />
              </button>
              <button
                onClick={() => setViewportMode('mobile')}
                title={t.mobile}
                className={`p-1 rounded ${
                  viewportMode === 'mobile'
                    ? 'bg-[#2b2d30] text-[#a8c7fa]'
                    : 'text-[#8e9199] hover:text-[#e2e2e6]'
                }`}
              >
                <M3Icon name="smartphone" size={14} />
              </button>
            </div>
          )}

          <M3IconButton
            size="sm"
            icon="open_in_new"
            label={t.openInNewWindow}
            onClick={handleOpenExternal}
          />

          {onMaximize && (
            <M3IconButton
              size="sm"
              icon={isMaximized ? 'close_fullscreen' : 'open_in_full'}
              label={isMaximized ? t.restore : t.maximize}
              onClick={onMaximize}
            />
          )}
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 w-full h-full overflow-hidden relative flex flex-col items-center justify-center bg-[#0d0e11]">
        {/* Case A: Rendered Markdown */}
        {previewTab === 'file' && isMarkdown && (
          <div className="w-full h-full overflow-y-auto p-6 md:p-8 flex justify-center bg-[#121316]">
            <article
              className="w-full max-w-3xl leading-relaxed text-[#c4c6d0]"
              dangerouslySetInnerHTML={{ __html: markdownHtml }}
            />
          </div>
        )}

        {/* Case B: Android Vector Drawable (.xml) */}
        {previewTab === 'file' && isVectorXml && parsedVector && (
          <div
            className={`w-full h-full relative overflow-hidden flex flex-col ${
              isCheckerboardBg
                ? 'bg-[radial-gradient(#2b2d30_1px,transparent_1px)] [background-size:16px_16px] bg-[#121316]'
                : 'bg-[#18191c]'
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
          >
            {/* Header info badge */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-[#1e1f22]/90 backdrop-blur-md border border-[#43474e]/40 rounded-lg px-2.5 py-1 text-xs text-[#c4c6d0]">
              <M3Icon name="polyline" size={14} className="text-[#a8c7fa]" />
              <span className="font-mono text-[#a8c7fa]">
                {parsedVector.viewportWidth} × {parsedVector.viewportHeight}
              </span>
              <span className="text-[#8e9199]">·</span>
              <span>{parsedVector.pathCount} {t.pathsCount}</span>
            </div>

            {/* Vector graphic canvas */}
            <div
              className="flex-1 flex items-center justify-center p-8 transition-transform duration-75 ease-out select-none"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                transformOrigin: 'center center',
              }}
            >
              <div
                className="w-64 h-64 flex items-center justify-center drop-shadow-2xl"
                dangerouslySetInnerHTML={{ __html: parsedVector.svgContent }}
              />
            </div>
          </div>
        )}

        {/* Case C: SVG Graphic (.svg) */}
        {previewTab === 'file' && isSvg && (
          <div
            className={`w-full h-full relative overflow-hidden flex items-center justify-center ${
              isCheckerboardBg
                ? 'bg-[radial-gradient(#2b2d30_1px,transparent_1px)] [background-size:16px_16px] bg-[#121316]'
                : 'bg-[#18191c]'
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
          >
            <div
              className="flex-1 flex items-center justify-center p-8 transition-transform duration-75 ease-out select-none"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                transformOrigin: 'center center',
              }}
            >
              <div
                className="w-72 h-72 flex items-center justify-center drop-shadow-xl"
                dangerouslySetInnerHTML={{ __html: svgMarkup }}
              />
            </div>
          </div>
        )}

        {/* Case D: Standard Sandboxed Web App Preview */}
        {(previewTab === 'webapp' || (!isMarkdown && !isSvg && !isVectorXml)) && (
          <div
            style={{ width: getViewportWidth() }}
            className="h-full bg-white transition-all duration-300 shadow-2xl overflow-hidden flex flex-col"
          >
            <iframe
              key={key}
              srcDoc={htmlContent}
              title="Live Code Preview"
              sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
              className="w-full h-full border-none bg-white"
            />
          </div>
        )}
      </div>

      {/* Footer Info */}
      <footer className="h-6 px-3 bg-[#1e1f22] border-t border-[#43474e]/30 flex items-center justify-between text-[11px] text-[#8e9199] shrink-0">
        <div className="flex items-center gap-2">
          <span>{supportsDedicatedPreview && previewTab === 'file' ? resolvedActiveFile?.name : t.sandboxedPreview}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
        </div>
        <div className="font-mono text-[10px]">
          {viewportMode === 'responsive' ? '100% width' : viewportMode === 'tablet' ? '768px' : '375px'}
        </div>
      </footer>
    </div>
  );
}
