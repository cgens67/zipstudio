/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  VFile,
  getLanguageFromFile,
  getFileExtension,
  isFontExtension,
  isAudioExtension,
  isVideoExtension,
  isImageExtension,
  formatBytes,
} from '../utils/fileSystem';
import { M3Icon, M3IconButton, M3Badge, M3Button } from './M3Components';
import { explainCodeInPlainEnglish, CodeBlockExplanation } from '../utils/codeExplainer';
import { Translations, TRANSLATIONS, SupportedLanguage } from '../utils/i18n';
import { highlightCode } from '../utils/syntaxHighlighter';
import { computeDocumentLineMetrics } from '../utils/editorMetrics';
import { FontSpecimenViewer, MediaPlayer, BinaryAssetViewer } from './BinaryFileViewers';
import { collabService, RemoteCursor, FileUpdateEvent } from '../utils/collabService';

interface EditorProps {
  openTabs: string[];
  activeFilePath: string;
  files: Record<string, VFile>;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onUpdateContent: (path: string, newContent: string) => void;
  onSaveFile?: (path: string) => void;
  onFindInFiles?: () => void;
  targetLine?: number;
  t?: Translations;
  currentLang?: SupportedLanguage;
  onMaximize?: () => void;
  isMaximized?: boolean;
  settings?: {
    fontSize?: number;
    wordWrap?: boolean;
    lineNumbers?: boolean;
    tabSize?: number;
    fontFamily?: string;
  };
}

export function Editor({
  openTabs,
  activeFilePath,
  files,
  onSelectTab,
  onCloseTab,
  onUpdateContent,
  onSaveFile,
  onFindInFiles,
  targetLine,
  t = TRANSLATIONS.en,
  currentLang = 'en',
  onMaximize,
  isMaximized,
  settings,
}: EditorProps) {
  const activeFile = files[activeFilePath];
  const [content, setContent] = useState(activeFile?.isBinary ? '' : (activeFile?.content || ''));
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [plainEnglishMode, setPlainEnglishMode] = useState(false);
  const [fontSize, setFontSize] = useState(settings?.fontSize ?? 13);
  const [wordWrap, setWordWrap] = useState(settings?.wordWrap ?? false);
  const [syntaxHighlighting, setSyntaxHighlighting] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);

  const showLineNumbers = settings?.lineNumbers !== false;
  const tabSize = settings?.tabSize ?? 2;
  const resolvedFontFamily =
    settings?.fontFamily ||
    "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

  useEffect(() => {
    if (settings?.fontSize) setFontSize(settings.fontSize);
  }, [settings?.fontSize]);

  useEffect(() => {
    if (settings?.wordWrap !== undefined) setWordWrap(settings.wordWrap);
  }, [settings?.wordWrap]);

  // Live Collaboration state & remote cursors
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [collabNotice, setCollabNotice] = useState<string | null>(null);
  const isRemoteUpdatingRef = useRef(false);

  // In-file search & replace state
  const [showFindBar, setShowFindBar] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);

  const [stageWidth, setStageWidth] = useState<number>(600);
  const [viewportHeight, setViewportHeight] = useState<number>(650);

  // Undo / Redo history state
  const historyRef = useRef<Record<string, { stack: string[]; pointer: number }>>({});
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const lineHeight = Math.round(fontSize * 1.55);

  // Track exact stage width and viewport height for wrap line numbers & virtualization
  useEffect(() => {
    const stageEl = stageRef.current;
    const scrollEl = scrollContainerRef.current;
    if (!stageEl && !scrollEl) return;

    const updateDimensions = () => {
      if (stageEl) {
        setStageWidth(stageEl.clientWidth);
      }
      if (scrollEl) {
        setViewportHeight(scrollEl.clientHeight || 650);
      }
    };
    updateDimensions();

    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(updateDimensions);
    if (stageEl) ro.observe(stageEl);
    if (scrollEl) ro.observe(scrollEl);
    return () => ro.disconnect();
  }, [activeFilePath, activeFile?.isBinary, wordWrap, showLineNumbers]);

  // Measure precise monospace glyph advance width matching resolvedFontFamily & fontSize
  const charWidth = useMemo(() => {
    if (typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.font = `400 ${fontSize}px ${resolvedFontFamily}`;
          const measured = ctx.measureText('MMMMMMMMMM').width / 10;
          if (measured > 0) return measured;
        }
      } catch {
        // fallback below
      }
    }
    return fontSize * 0.6;
  }, [fontSize, resolvedFontFamily]);

  const maxCols = useMemo(() => {
    if (!wordWrap || stageWidth <= 32 || charWidth <= 0) return 0;
    return Math.max(8, Math.floor((stageWidth - 24) / charWidth));
  }, [wordWrap, stageWidth, charWidth]);

  // Accurate file language detection using full filename and extension
  const lang = activeFile ? getLanguageFromFile(activeFile.name) : 'plaintext';

  // Syntax highlighted HTML generated via PrismJS
  const highlightedHtml = useMemo(() => {
    if (!content || activeFile?.isBinary) return '';
    return highlightCode(content, lang);
  }, [content, lang, activeFile?.isBinary]);

  // Compute matches for in-file search
  const matches = useMemo(() => {
    if (!findQuery || !content || activeFile?.isBinary) return [];
    try {
      const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = matchWholeWord ? `\\b${escaped}\\b` : escaped;
      const flags = matchCase ? 'g' : 'gi';
      const regex = new RegExp(pattern, flags);
      const results: Array<{ start: number; end: number; line: number }> = [];
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        results.push({
          start: match.index,
          end: match.index + match[0].length,
          line,
        });
        if (!regex.global) break;
      }
      return results;
    } catch {
      return [];
    }
  }, [findQuery, content, matchCase, matchWholeWord, activeFile?.isBinary]);

  // Adjust match index if matches count changes
  useEffect(() => {
    if (matches.length === 0) {
      setCurrentMatchIndex(0);
    } else if (currentMatchIndex >= matches.length) {
      setCurrentMatchIndex(0);
    }
  }, [matches, currentMatchIndex]);

  // Compute document wrapping metrics for synchronized line numbers and scroll jumps
  const lineMetrics = useMemo(() => {
    if (activeFile?.isBinary) {
      return { rowsPerLine: [1], topOffsets: [0], totalVisualRows: 1 };
    }
    return computeDocumentLineMetrics(content, wordWrap, maxCols, tabSize);
  }, [content, wordWrap, maxCols, tabSize, activeFile?.isBinary]);

  // Navigate to a specific match and select it in the editor
  const goToMatch = useCallback(
    (index: number) => {
      if (matches.length === 0) return;
      const boundedIndex = (index + matches.length) % matches.length;
      setCurrentMatchIndex(boundedIndex);
      const m = matches[boundedIndex];
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(m.start, m.end);

        const visualRow = lineMetrics.topOffsets[m.line - 1] ?? m.line - 1;
        const targetScroll = Math.max(0, (visualRow - 3) * lineHeight);
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = targetScroll;
        }
        setScrollTop(targetScroll);
        setCursorPos({ line: m.line, col: 1 });
      }
    },
    [matches, lineHeight, lineMetrics]
  );

  // Replace current match in file
  const handleReplaceCurrent = useCallback(() => {
    if (matches.length === 0 || !activeFilePath) return;
    const m = matches[currentMatchIndex];
    if (!m) return;
    const newVal = content.substring(0, m.start) + replaceQuery + content.substring(m.end);
    setContent(newVal);
    onUpdateContent(activeFilePath, newVal);

    // Record history
    if (!historyRef.current[activeFilePath]) {
      historyRef.current[activeFilePath] = { stack: [newVal], pointer: 0 };
    } else {
      const fileHist = historyRef.current[activeFilePath];
      fileHist.stack.push(newVal);
      fileHist.pointer = fileHist.stack.length - 1;
    }
  }, [matches, currentMatchIndex, content, replaceQuery, activeFilePath, onUpdateContent]);

  // Replace all occurrences in this file
  const handleReplaceAllInFile = useCallback(() => {
    if (!findQuery || !activeFilePath || matches.length === 0) return;
    try {
      const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = matchWholeWord ? `\\b${escaped}\\b` : escaped;
      const flags = matchCase ? 'g' : 'gi';
      const regex = new RegExp(pattern, flags);
      const newVal = content.replace(regex, replaceQuery);
      setContent(newVal);
      onUpdateContent(activeFilePath, newVal);

      if (!historyRef.current[activeFilePath]) {
        historyRef.current[activeFilePath] = { stack: [newVal], pointer: 0 };
      } else {
        const fileHist = historyRef.current[activeFilePath];
        fileHist.stack.push(newVal);
        fileHist.pointer = fileHist.stack.length - 1;
      }
    } catch (e) {
      console.warn('Replace all error', e);
    }
  }, [findQuery, replaceQuery, content, matchCase, matchWholeWord, matches.length, activeFilePath, onUpdateContent]);

  // Open in-file search bar
  const openFindBar = useCallback(() => {
    setShowFindBar(true);
    setTimeout(() => {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    }, 50);
  }, []);

  // Initialize or restore history when active file changes
  useEffect(() => {
    if (activeFile) {
      if (activeFile.isBinary) {
        setContent('');
        setCanUndo(false);
        setCanRedo(false);
      } else {
        setContent(activeFile.content);
        if (!historyRef.current[activeFilePath]) {
          historyRef.current[activeFilePath] = {
            stack: [activeFile.content],
            pointer: 0,
          };
        }
        const hist = historyRef.current[activeFilePath];
        setCanUndo(hist ? hist.pointer > 0 : false);
        setCanRedo(hist ? hist.pointer < hist.stack.length - 1 : false);
      }
    }
  }, [activeFilePath, activeFile]);

  // Real-Time Live Collaboration: remote edits & remote cursors
  useEffect(() => {
    const unsubCursors = collabService.onCursors((allCursors) => {
      const myId = collabService.getProfile().id;
      const fileCursors = allCursors.filter(
        (c) => c.filePath === activeFilePath && c.peerId !== myId
      );
      setRemoteCursors(fileCursors);
    });

    const unsubFile = collabService.onFileUpdate((event: FileUpdateEvent) => {
      if (event.filePath === activeFilePath) {
        const myId = collabService.getProfile().id;
        if (event.senderId !== myId) {
          isRemoteUpdatingRef.current = true;
          setContent(event.content);
          onUpdateContent(event.filePath, event.content);
          setTimeout(() => {
            isRemoteUpdatingRef.current = false;
          }, 80);

          if (event.isConflictResolved) {
            setCollabNotice(event.conflictNote || 'Simultaneous edits reconciled by server');
          } else {
            setCollabNotice(`${event.senderName} edited this file`);
          }
          setTimeout(() => setCollabNotice(null), 3000);
        }
      }
    });

    return () => {
      unsubCursors();
      unsubFile();
    };
  }, [activeFilePath, onUpdateContent]);

  // Record history snapshot (debounced)
  const recordHistory = useCallback(
    (newVal: string) => {
      if (!activeFilePath) return;
      const fileHist = historyRef.current[activeFilePath] || { stack: [], pointer: -1 };
      const current = fileHist.stack[fileHist.pointer];
      if (current === newVal) return;

      const newStack = fileHist.stack.slice(0, fileHist.pointer + 1);
      if (newStack.length > 50) newStack.shift();
      newStack.push(newVal);

      const newPointer = newStack.length - 1;
      historyRef.current[activeFilePath] = {
        stack: newStack,
        pointer: newPointer,
      };
      setCanUndo(newPointer > 0);
      setCanRedo(false);
    },
    [activeFilePath]
  );

  // Undo action
  const handleUndo = useCallback(() => {
    if (!activeFilePath) return;
    const hist = historyRef.current[activeFilePath];
    if (hist && hist.pointer > 0) {
      hist.pointer -= 1;
      const prevVal = hist.stack[hist.pointer];
      setContent(prevVal);
      onUpdateContent(activeFilePath, prevVal);
      setCanUndo(hist.pointer > 0);
      setCanRedo(hist.pointer < hist.stack.length - 1);
    }
  }, [activeFilePath, onUpdateContent]);

  // Redo action
  const handleRedo = useCallback(() => {
    if (!activeFilePath) return;
    const hist = historyRef.current[activeFilePath];
    if (hist && hist.pointer < hist.stack.length - 1) {
      hist.pointer += 1;
      const nextVal = hist.stack[hist.pointer];
      setContent(nextVal);
      onUpdateContent(activeFilePath, nextVal);
      setCanUndo(hist.pointer > 0);
      setCanRedo(hist.pointer < hist.stack.length - 1);
    }
  }, [activeFilePath, onUpdateContent]);

  // Delete current line action
  const handleDeleteLine = useCallback(() => {
    if (!textareaRef.current || !activeFilePath) return;
    const text = textareaRef.current.value;
    const selStart = textareaRef.current.selectionStart;

    const lastNewlineBefore = text.lastIndexOf('\n', selStart - 1);
    const lineStart = lastNewlineBefore === -1 ? 0 : lastNewlineBefore + 1;

    const nextNewline = text.indexOf('\n', selStart);
    const lineEnd = nextNewline === -1 ? text.length : nextNewline + 1;

    const newVal = text.substring(0, lineStart) + text.substring(lineEnd);
    setContent(newVal);
    onUpdateContent(activeFilePath, newVal);
    recordHistory(newVal);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = Math.min(lineStart, newVal.length);
        handleSelection();
      }
    }, 0);
  }, [activeFilePath, onUpdateContent, recordHistory]);

  // Scroll shared viewport cleanly when jumping to targetLine
  useEffect(() => {
    if (targetLine && textareaRef.current && activeFile && !activeFile.isBinary) {
      const lines = activeFile.content.split('\n');
      let charPos = 0;
      for (let i = 0; i < Math.min(targetLine - 1, lines.length); i++) {
        charPos += lines[i].length + 1;
      }
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(charPos, charPos + (lines[targetLine - 1]?.length || 0));
      const visualRow = lineMetrics.topOffsets[targetLine - 1] ?? targetLine - 1;
      const scrollPos = Math.max(0, (visualRow - 3) * lineHeight);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollPos;
      }
      setScrollTop(scrollPos);
      setCursorPos({ line: targetLine, col: 1 });
    }
  }, [targetLine, activeFilePath, activeFile, lineHeight, lineMetrics]);

  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    recordHistory(val);
    if (activeFilePath) {
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
      updateTimerRef.current = setTimeout(() => {
        onUpdateContent(activeFilePath, val);
      }, 150);

      // Real-time simultaneous edit broadcast with conflict resolution
      if (!isRemoteUpdatingRef.current && !activeFile?.isBinary) {
        collabService.sendFileEdit(activeFilePath, val);
      }
    }
  };

  const handleSelection = () => {
    if (!textareaRef.current) return;
    const text = textareaRef.current.value;
    const selStart = textareaRef.current.selectionStart;
    const selEnd = textareaRef.current.selectionEnd;
    const lines = text.substring(0, selStart).split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    setCursorPos({ line, col });

    // Real-time cursor position broadcast to peers
    if (activeFilePath && !activeFile?.isBinary) {
      collabService.sendCursorMove(activeFilePath, line, col, undefined, undefined, {
        start: selStart,
        end: selEnd,
      });
    }
  };

  const jumpToLineIndex = (index: number) => {
    if (!textareaRef.current) return;
    const lines = content.split('\n');
    let charPos = 0;
    for (let j = 0; j < index; j++) {
      charPos += lines[j].length + 1;
    }
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(charPos, charPos + (lines[index]?.length || 0));
    setCursorPos({ line: index + 1, col: 1 });
  };

  const lineCount = lineMetrics.rowsPerLine.length;

  // Binary search on topOffsets so even wrapped files virtualize cleanly
  const { startLineIndex, endLineIndex } = useMemo(() => {
    const topVisualRow = Math.max(0, Math.floor(scrollTop / lineHeight) - 8);
    const bottomVisualRow = topVisualRow + Math.ceil(viewportHeight / lineHeight) + 20;
    const offsets = lineMetrics.topOffsets;

    let lo = 0;
    let hi = offsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (offsets[mid] <= topVisualRow) lo = mid;
      else hi = mid - 1;
    }
    const startIdx = Math.max(0, lo);

    let endIdx = startIdx;
    while (endIdx < offsets.length && offsets[endIdx] <= bottomVisualRow) {
      endIdx++;
    }
    return {
      startLineIndex: startIdx,
      endLineIndex: Math.min(offsets.length, Math.max(startIdx + 1, endIdx)),
    };
  }, [scrollTop, lineHeight, viewportHeight, lineMetrics.topOffsets]);

  const visibleLineNumbers = useMemo(() => {
    const list: number[] = [];
    for (let i = startLineIndex; i < endLineIndex; i++) {
      list.push(i + 1);
    }
    return list;
  }, [startLineIndex, endLineIndex]);

  const topGutterSpacerHeight = (lineMetrics.topOffsets[startLineIndex] ?? 0) * lineHeight;
  const endOffsetRows =
    endLineIndex < lineCount
      ? lineMetrics.topOffsets[endLineIndex]
      : lineMetrics.totalVisualRows;
  const bottomGutterSpacerHeight = Math.max(
    0,
    (lineMetrics.totalVisualRows - endOffsetRows) * lineHeight
  );

  // Trilingual plain language explanation (only computed if plainEnglishMode is open)
  const explanation = useMemo(() => {
    if (!plainEnglishMode || !activeFile || activeFile.isBinary) return null;
    return explainCodeInPlainEnglish(activeFile.name, content, currentLang);
  }, [plainEnglishMode, activeFile?.name, activeFile?.isBinary, content, currentLang]);

  if (!activeFile) {
    return (
      <div className="flex-1 h-full bg-[#1e1f22] flex flex-col items-center justify-center text-[#8e9199] p-8">
        <M3Icon name="code" size={56} className="text-[#a8c7fa]/30 mb-4" />
        <h3 className="text-base font-medium text-[#e2e2e6] mb-1">{t.noFileOpen}</h3>
        <p className="text-xs max-w-sm text-center">{t.noFileOpenDesc}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full bg-[#1e1f22] flex flex-col overflow-hidden select-none">
      {/* Tabs Bar */}
      <div className="h-9 bg-[#18191c] border-b border-[#43474e]/40 flex items-center overflow-x-auto no-scrollbar shrink-0">
        {openTabs.map((path) => {
          const file = files[path];
          if (!file) return null;
          const isActive = path === activeFilePath;
          return (
            <div
              key={path}
              onClick={() => onSelectTab(path)}
              className={`h-full px-3 flex items-center gap-2 text-xs border-r border-[#43474e]/30 cursor-pointer select-none group transition-colors shrink-0 ${
                isActive
                  ? 'bg-[#1e1f22] text-[#a8c7fa] border-t-2 border-t-[#a8c7fa] font-medium'
                  : 'text-[#c4c6d0] hover:bg-white/5 hover:text-white'
              }`}
            >
              <M3Icon
                name={file.isBinary ? 'image' : 'description'}
                size={14}
                className={isActive ? 'text-[#a8c7fa]' : 'text-[#8e9199]'}
              />
              <span className="truncate max-w-[140px] font-mono text-[11px]">{file.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(path);
                }}
                className="w-4 h-4 rounded flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-white/10 text-xs"
                title={t.close}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* Editor Controls & Hotkeys Bar */}
      <div className="h-9 px-3 bg-[#1e1f22] border-b border-[#43474e]/30 flex items-center justify-between text-xs shrink-0 gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 truncate shrink-0">
          <span className="text-[#a8c7fa] font-mono font-medium truncate max-w-[180px]">
            {activeFile.path}
          </span>
          <M3Badge variant="secondary">{lang.toUpperCase()}</M3Badge>
          <span className="text-[#8e9199] text-[11px] shrink-0 font-mono">
            {lineCount} {t.linesLabel}
          </span>

          {/* Live Collaborators in this file */}
          {remoteCursors.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#121316] border border-[#43474e]/40 shrink-0">
              <div className="flex -space-x-1.5 overflow-hidden">
                {remoteCursors.map((c) => (
                  <div
                    key={c.peerId}
                    style={{ backgroundColor: c.color }}
                    title={`${c.name} (Line ${c.line})`}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-[#001d3d] ring-1 ring-[#1e1f22]"
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-[#a8c7fa] font-mono">
                {remoteCursors.length} {remoteCursors.length === 1 ? 'co-editor' : 'co-editors'}
              </span>
            </div>
          )}

          {/* Conflict resolution / real-time sync notification */}
          {collabNotice && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00468b]/50 border border-[#a8c7fa]/40 text-[#a8c7fa] text-[10px] font-medium shrink-0 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3ddc84]" />
              <span>{collabNotice}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Undo / Redo */}
          <M3IconButton
            size="sm"
            icon="undo"
            label={t.undo}
            disabled={!canUndo}
            onClick={handleUndo}
          />
          <M3IconButton
            size="sm"
            icon="redo"
            label={t.redo}
            disabled={!canRedo}
            onClick={handleRedo}
          />
          <M3IconButton size="sm" icon="content_cut" label={t.deleteLine} onClick={handleDeleteLine} />

          {/* In-File Search Button (Does NOT open global Search in Code!) */}
          <M3IconButton
            size="sm"
            icon="search"
            label={`${t.findInFile} (Ctrl+F)`}
            variant={showFindBar ? 'filled' : 'standard'}
            onClick={() => {
              if (showFindBar) {
                setShowFindBar(false);
              } else {
                openFindBar();
              }
            }}
          />

          <div className="w-[1px] h-3.5 bg-[#43474e]/50 mx-1" />

          {/* Syntax Highlighting Toggle */}
          <button
            onClick={() => setSyntaxHighlighting(!syntaxHighlighting)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              syntaxHighlighting
                ? 'bg-[#00468b]/40 text-[#a8c7fa] border border-[#a8c7fa]/30 font-semibold'
                : 'bg-[#2b2d30] text-[#8e9199] hover:text-white'
            }`}
            title={t.syntaxHighlighting}
          >
            <M3Icon name="palette" size={13} />
            <span className="hidden sm:inline">{t.syntaxHighlighting}</span>
          </button>

          {/* Plain English Mode Toggle (Trilingual) */}
          <button
            onClick={() => setPlainEnglishMode(!plainEnglishMode)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              plainEnglishMode
                ? 'bg-[#a8c7fa] text-[#003062] font-semibold'
                : 'bg-[#2b2d30] text-[#c4c6d0] hover:text-white hover:bg-[#383a3e]'
            }`}
            title={t.plainEnglishDesc}
          >
            <M3Icon name="translate" size={13} />
            <span className="hidden md:inline">{t.plainEnglish}</span>
          </button>

          {/* Font Size controls */}
          <M3IconButton
            size="sm"
            icon="remove"
            label={t.decreaseFont}
            onClick={() => setFontSize(Math.max(11, fontSize - 1))}
          />
          <span className="text-[11px] text-[#8e9199] w-4 text-center font-mono">{fontSize}</span>
          <M3IconButton
            size="sm"
            icon="add"
            label={t.increaseFont}
            onClick={() => setFontSize(Math.min(22, fontSize + 1))}
          />

          {/* Word Wrap Toggle */}
          <M3IconButton
            size="sm"
            icon={wordWrap ? 'wrap_text' : 'format_align_left'}
            label={t.toggleWordWrap}
            onClick={() => setWordWrap(!wordWrap)}
          />

          {/* Maximize / Restore Editor Button */}
          {onMaximize && (
            <M3IconButton
              size="sm"
              icon={isMaximized ? 'collapse_content' : 'fullscreen'}
              label={isMaximized ? t.restore : t.maximizeEditor}
              onClick={onMaximize}
            />
          )}
        </div>
      </div>

      {/* Trilingual Plain Language Explanation Banner */}
      {plainEnglishMode && explanation && (
        <div className="bg-[#18191c] border-b border-[#a8c7fa]/30 p-3.5 animate-fadeIn shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full bg-[#00468b] text-[#d6e3ff] text-[11px] font-semibold flex items-center gap-1">
                  <M3Icon name="psychology" size={14} />
                  {t.plainEnglish}
                </span>
                <h4 className="text-xs font-bold text-white">{explanation.title}</h4>
              </div>
              <p className="text-xs text-[#a8c7fa] italic mb-2">
                &ldquo;{explanation.simpleAnalogy}&rdquo;
              </p>
              <p className="text-xs text-[#c4c6d0] mb-2">{explanation.whatItDoes}</p>
              <ul className="space-y-1 text-xs text-[#8e9199]">
                {explanation.details.map((d, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <M3Icon name="check_circle" size={12} className="text-[#a8c7fa]" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
            <M3IconButton
              size="sm"
              icon="close"
              label={t.close}
              onClick={() => setPlainEnglishMode(false)}
            />
          </div>
        </div>
      )}

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {activeFile.isBinary ? (
          (() => {
            const ext = getFileExtension(activeFile.name).toLowerCase();
            if (isFontExtension(ext)) {
              return <FontSpecimenViewer file={activeFile} t={t} />;
            }
            if (isAudioExtension(ext) || isVideoExtension(ext)) {
              return <MediaPlayer file={activeFile} t={t} />;
            }
            if (activeFile.content.startsWith('data:image/') || isImageExtension(ext)) {
              return (
                <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#121316]">
                  <div className="max-w-md max-h-[70%] border border-[#43474e] rounded-xl p-2 bg-[#1e1f22] shadow-2xl">
                    <img
                      src={activeFile.content}
                      alt={activeFile.name}
                      className="max-h-[300px] w-auto mx-auto object-contain rounded-lg"
                    />
                  </div>
                  <p className="text-xs text-[#8e9199] mt-3 font-mono">
                    {activeFile.name} ({formatBytes(activeFile.size)})
                  </p>
                </div>
              );
            }
            return <BinaryAssetViewer file={activeFile} t={t} />;
          })()
        ) : (
          <div className="editor-viewport flex-1 flex overflow-hidden relative bg-[#121316]">
            {/* Single Unified Scroll Container locking Gutter, <pre>, and <textarea> */}
            <div
              ref={scrollContainerRef}
              onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
              className="flex-1 w-full h-full overflow-auto flex items-stretch relative"
            >
              {/* Synchronized Sticky Line Numbers Gutter */}
              {showLineNumbers && (
                <div
                  title={t.jumpToLine}
                  className="editor-gutter sticky left-0 z-20 w-12 bg-[#18191c] border-r border-[#43474e]/30 select-none shrink-0 cursor-default py-3 pr-2 text-right"
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: `${lineHeight}px`,
                    fontFamily: resolvedFontFamily,
                    minHeight: '100%',
                    height: `${lineMetrics.totalVisualRows * lineHeight + 24}px`,
                  }}
                >
                  <div
                    style={{
                      paddingTop: `${topGutterSpacerHeight}px`,
                      paddingBottom: `${bottomGutterSpacerHeight}px`,
                    }}
                  >
                    {visibleLineNumbers.map((lineNum) => {
                      const isCurrentLine = lineNum === cursorPos.line;
                      const rows = lineMetrics.rowsPerLine[lineNum - 1] ?? 1;
                      return (
                        <div
                          key={lineNum}
                          onClick={() => jumpToLineIndex(lineNum - 1)}
                          style={{
                            height: `${rows * lineHeight}px`,
                            lineHeight: `${lineHeight}px`,
                          }}
                          className={`transition-colors cursor-pointer rounded-xs px-1 hover:text-white hover:bg-white/10 ${
                            isCurrentLine
                              ? 'text-[#a8c7fa] font-bold bg-[#a8c7fa]/20'
                              : 'text-[#6e7179]'
                          }`}
                        >
                          {lineNum}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grid Stage: <pre> and <textarea> share exact grid cell (1/1), width, height, and metrics */}
              <div
                ref={stageRef}
                className={`editor-code-container relative grid flex-1 min-h-full bg-[#121316] ${
                  wordWrap ? 'min-w-0 w-full' : 'min-w-full w-max'
                }`}
                style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}
              >
                {/* Syntax Highlighted Code Layer underneath (also sizes the grid stage) */}
                <pre
                  ref={highlightRef}
                  aria-hidden="true"
                  style={{
                    gridColumn: '1 / 1',
                    gridRow: '1 / 1',
                    minWidth: 0,
                    width: '100%',
                    fontSize: `${fontSize}px`,
                    lineHeight: `${lineHeight}px`,
                    tabSize,
                    fontFamily: resolvedFontFamily,
                    whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                    overflowWrap: wordWrap ? 'break-word' : 'normal',
                    wordBreak: 'normal',
                    visibility: syntaxHighlighting ? 'visible' : 'hidden',
                  }}
                  className="editor-pre pointer-events-none py-3 px-3 m-0 border-none select-none overflow-hidden"
                  dangerouslySetInnerHTML={{
                    __html:
                      (content.endsWith('\n')
                        ? highlightedHtml + '\u200b'
                        : highlightedHtml) || '\u200b',
                  }}
                />

                {/* Editable Textarea locked 1:1 on top of <pre> */}
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleChange}
                  onKeyUp={handleSelection}
                  onClick={handleSelection}
                  onSelect={handleSelection}
                  onKeyDown={(e) => {
                    // Tab indentation
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      const start = e.currentTarget.selectionStart;
                      const end = e.currentTarget.selectionEnd;
                      const val = e.currentTarget.value;
                      const tabSpaces = ' '.repeat(tabSize);
                      const newVal = val.substring(0, start) + tabSpaces + val.substring(end);
                      setContent(newVal);
                      if (activeFilePath) onUpdateContent(activeFilePath, newVal);
                      recordHistory(newVal);
                      setTimeout(() => {
                        if (textareaRef.current) {
                          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + tabSize;
                        }
                      }, 0);
                    }
                    // In-File Find (Ctrl+F / Cmd+F)
                    else if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F') && !e.shiftKey) {
                      e.preventDefault();
                      openFindBar();
                    }
                    // Find in Files / Workspace Search (Ctrl+Shift+F / Cmd+Shift+F)
                    else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
                      e.preventDefault();
                      if (onFindInFiles) onFindInFiles();
                    }
                    // Save hotkey (Ctrl+S / Cmd+S)
                    else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                      e.preventDefault();
                      if (onSaveFile && activeFilePath) {
                        onSaveFile(activeFilePath);
                      }
                    }
                    // Delete Line (Ctrl+Shift+K / Cmd+Shift+K or Ctrl+D)
                    else if (
                      ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) ||
                      ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'k' || e.key === 'K'))
                    ) {
                      e.preventDefault();
                      handleDeleteLine();
                    }
                    // Undo (Ctrl+Z / Cmd+Z without Shift)
                    else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
                      e.preventDefault();
                      handleUndo();
                    }
                    // Redo (Ctrl+Y or Ctrl+Shift+Z)
                    else if (
                      ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
                      ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
                    ) {
                      e.preventDefault();
                      handleRedo();
                    }
                  }}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  autoComplete="off"
                  wrap="soft"
                  className={`editor-textarea w-full h-full bg-transparent py-3 px-3 m-0 resize-none focus:outline-none border-none overflow-hidden z-10 ${
                    syntaxHighlighting
                      ? 'has-highlight text-transparent caret-white'
                      : 'text-[#e2e2e6] caret-[#a8c7fa] selection:bg-[#a8c7fa]/30'
                  }`}
                  style={{
                    gridColumn: '1 / 1',
                    gridRow: '1 / 1',
                    minWidth: 0,
                    backgroundColor: 'transparent',
                    color: syntaxHighlighting ? 'transparent' : undefined,
                    WebkitTextFillColor: syntaxHighlighting ? 'transparent' : undefined,
                    fontSize: `${fontSize}px`,
                    lineHeight: `${lineHeight}px`,
                    tabSize,
                    fontFamily: resolvedFontFamily,
                    whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                    overflowWrap: wordWrap ? 'break-word' : 'normal',
                    wordBreak: 'normal',
                  }}
                />

                {/* Live Collaborative Remote Cursors Overlay */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                  {remoteCursors.map((c) => {
                    const visualRow = lineMetrics.topOffsets[c.line - 1] ?? c.line - 1;
                    const topPos = visualRow * lineHeight + 12;
                    const leftPos = Math.max(12, (c.col - 1) * charWidth + 12);

                    if (
                      topPos < scrollTop - 40 ||
                      topPos > scrollTop + viewportHeight + 100
                    ) {
                      return null;
                    }

                    return (
                      <div
                        key={c.peerId}
                        style={{
                          transform: `translate3d(${leftPos}px, ${topPos}px, 0)`,
                          transition: 'transform 0.05s ease-out',
                        }}
                        className="absolute top-0 left-0 flex flex-col pointer-events-none will-change-transform z-30 select-none"
                      >
                        {/* Name Badge */}
                        <div
                          style={{ backgroundColor: c.color }}
                          className="px-1.5 py-0.2 rounded text-[10px] font-bold text-[#001d3d] shadow-lg flex items-center gap-1 w-max -translate-y-4"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#001d3d] animate-pulse" />
                          <span>{c.name}</span>
                        </div>

                        {/* Blinking Caret */}
                        <div
                          style={{
                            backgroundColor: c.color,
                            height: `${lineHeight}px`,
                            boxShadow: `0 0 6px ${c.color}`,
                          }}
                          className="w-[2px] rounded-full animate-pulse"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Floating Material 3 In-File Search Bar (pinned cleanly over viewport) */}
            {showFindBar && (
                <div className="absolute top-2 right-4 z-30 max-w-sm w-[92%] sm:w-80 bg-[#1e1f22]/95 backdrop-blur-md border border-[#a8c7fa]/40 rounded-xl p-2 shadow-2xl animate-fadeIn">
                  {/* Find Row */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsReplaceOpen(!isReplaceOpen)}
                      className="p-1 rounded text-[#8e9199] hover:text-white cursor-pointer"
                      title={t.replaceInFile}
                    >
                      <M3Icon
                        name={isReplaceOpen ? 'expand_more' : 'chevron_right'}
                        size={16}
                      />
                    </button>

                    <div className="flex-1 relative flex items-center bg-[#121316] rounded-lg border border-[#43474e]/50 px-2 py-1">
                      <input
                        ref={findInputRef}
                        type="text"
                        value={findQuery}
                        onChange={(e) => setFindQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (e.shiftKey) {
                              goToMatch(currentMatchIndex - 1);
                            } else {
                              goToMatch(currentMatchIndex + 1);
                            }
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setShowFindBar(false);
                            textareaRef.current?.focus();
                          }
                        }}
                        placeholder={`${t.findInFile}...`}
                        className="w-full bg-transparent border-none text-xs text-[#e2e2e6] focus:outline-none font-mono"
                      />
                      {findQuery && (
                        <span className="text-[10px] text-[#8e9199] font-mono shrink-0 pl-1 select-none">
                          {matches.length > 0
                            ? `${currentMatchIndex + 1}/${matches.length}`
                            : t.noMatches}
                        </span>
                      )}
                    </div>

                    {/* Match Navigation Buttons */}
                    <M3IconButton
                      size="sm"
                      icon="arrow_upward"
                      label={t.prevMatch}
                      disabled={matches.length === 0}
                      onClick={() => goToMatch(currentMatchIndex - 1)}
                    />
                    <M3IconButton
                      size="sm"
                      icon="arrow_downward"
                      label={t.nextMatch}
                      disabled={matches.length === 0}
                      onClick={() => goToMatch(currentMatchIndex + 1)}
                    />

                    {/* Match Case Toggle */}
                    <button
                      type="button"
                      onClick={() => setMatchCase(!matchCase)}
                      className={`w-6 h-6 rounded flex items-center justify-center font-mono text-xs cursor-pointer transition-colors ${
                        matchCase
                          ? 'bg-[#a8c7fa] text-[#003062] font-bold'
                          : 'text-[#8e9199] hover:text-white'
                      }`}
                      title={t.matchCase}
                    >
                      Aa
                    </button>

                    {/* Match Whole Word Toggle */}
                    <button
                      type="button"
                      onClick={() => setMatchWholeWord(!matchWholeWord)}
                      className={`w-6 h-6 rounded flex items-center justify-center font-mono text-[10px] cursor-pointer transition-colors ${
                        matchWholeWord
                          ? 'bg-[#a8c7fa] text-[#003062] font-bold'
                          : 'text-[#8e9199] hover:text-white'
                      }`}
                      title={t.matchWholeWord}
                    >
                      \b
                    </button>

                    {/* Close Search Bar */}
                    <M3IconButton
                      size="sm"
                      icon="close"
                      label={t.close}
                      onClick={() => {
                        setShowFindBar(false);
                        textareaRef.current?.focus();
                      }}
                    />
                  </div>

                  {/* Expandable Replace Row */}
                  {isReplaceOpen && (
                    <div className="flex items-center gap-1.5 mt-2 pl-6 animate-fadeIn">
                      <div className="flex-1 bg-[#121316] rounded-lg border border-[#43474e]/50 px-2 py-1">
                        <input
                          type="text"
                          value={replaceQuery}
                          onChange={(e) => setReplaceQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleReplaceCurrent();
                            }
                          }}
                          placeholder={`${t.replaceInFile}...`}
                          className="w-full bg-transparent border-none text-xs text-[#e2e2e6] focus:outline-none font-mono"
                        />
                      </div>

                      <M3Button
                        size="sm"
                        variant="tonal"
                        disabled={matches.length === 0}
                        onClick={handleReplaceCurrent}
                        className="text-[11px] px-2 py-1"
                      >
                        {t.replaceInFile}
                      </M3Button>

                      <M3Button
                        size="sm"
                        variant="filled"
                        disabled={matches.length === 0}
                        onClick={handleReplaceAllInFile}
                        className="text-[11px] px-2 py-1"
                      >
                        {t.replaceAll}
                      </M3Button>
                    </div>
                  )}
                </div>
              )}
          </div>
        )}
      </div>

      {/* Editor Status Bar */}
      <div className="h-6 px-3 bg-[#18191c] border-t border-[#43474e]/30 flex items-center justify-between text-[11px] text-[#8e9199] shrink-0 font-mono">
        <div className="flex items-center gap-3">
          <span className="text-[#a8c7fa]">
            {t.linesLabel} {cursorPos.line}, {t.spaces} {cursorPos.col}
          </span>
          <span>{t.spaces}: {tabSize}</span>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold">{lang.toUpperCase()}</span>
          <span className="flex items-center gap-1 text-[#b4f3b7]">
            <M3Icon name="cloud_done" size={12} /> {t.ready}
          </span>
        </div>
      </div>
    </div>
  );
}
