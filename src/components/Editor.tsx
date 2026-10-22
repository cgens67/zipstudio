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
import { FontSpecimenViewer, MediaPlayer, BinaryAssetViewer } from './BinaryFileViewers';

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
}: EditorProps) {
  const activeFile = files[activeFilePath];
  const [content, setContent] = useState(activeFile?.isBinary ? '' : (activeFile?.content || ''));
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [plainEnglishMode, setPlainEnglishMode] = useState(false);
  const [fontSize, setFontSize] = useState(13);
  const [wordWrap, setWordWrap] = useState(false);
  const [syntaxHighlighting, setSyntaxHighlighting] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);

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
  const gutterRef = useRef<HTMLDivElement>(null);
  const gutterInnerRef = useRef<HTMLDivElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);

  // Undo / Redo history state
  const historyRef = useRef<Record<string, { stack: string[]; pointer: number }>>({});
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const lineHeight = Math.round(fontSize * 1.55);

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

        const targetScroll = Math.max(0, (m.line - 4) * lineHeight);
        textareaRef.current.scrollTop = targetScroll;
        setScrollTop(targetScroll);

        if (gutterInnerRef.current) {
          gutterInnerRef.current.style.transform = `translateY(-${targetScroll}px)`;
        }
        if (highlightRef.current) {
          highlightRef.current.scrollTop = targetScroll;
        }

        setCursorPos({ line: m.line, col: 1 });
      }
    },
    [matches, lineHeight]
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

  // Synchronize gutter scroll when jumping to targetLine
  useEffect(() => {
    if (targetLine && textareaRef.current && activeFile) {
      const lines = activeFile.content.split('\n');
      let charPos = 0;
      for (let i = 0; i < Math.min(targetLine - 1, lines.length); i++) {
        charPos += lines[i].length + 1;
      }
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(charPos, charPos + (lines[targetLine - 1]?.length || 0));
      const scrollPos = Math.max(0, (targetLine - 4) * lineHeight);
      textareaRef.current.scrollTop = scrollPos;
      setScrollTop(scrollPos);
      if (gutterInnerRef.current) {
        gutterInnerRef.current.style.transform = `translateY(-${scrollPos}px)`;
      }
      if (highlightRef.current) {
        highlightRef.current.scrollTop = scrollPos;
      }
      setCursorPos({ line: targetLine, col: 1 });
    }
  }, [targetLine, activeFilePath, activeFile, lineHeight]);

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
    }
  };

  const handleSelection = () => {
    if (!textareaRef.current) return;
    const text = textareaRef.current.value;
    const selStart = textareaRef.current.selectionStart;
    const lines = text.substring(0, selStart).split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    });
  };

  // Synchronize line gutter and syntax highlighted pre with textarea scroll
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const st = e.currentTarget.scrollTop;
    const sl = e.currentTarget.scrollLeft;
    setScrollTop(st);
    if (gutterInnerRef.current) {
      gutterInnerRef.current.style.transform = `translateY(-${st}px)`;
    }
    if (highlightRef.current) {
      highlightRef.current.scrollTop = st;
      highlightRef.current.scrollLeft = sl;
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

  const lineCount = useMemo(() => {
    if (!content || activeFile?.isBinary) return 1;
    let count = 1;
    for (let i = 0; i < content.length; i++) {
      if (content.charCodeAt(i) === 10) count++;
    }
    return count;
  }, [content, activeFile?.isBinary]);

  // Virtualized visible line numbers to prevent DOM explosion on large files
  const viewportHeight = 650;
  const visibleLineCount = Math.ceil(viewportHeight / lineHeight) + 15;
  const startLineIndex = Math.max(0, Math.floor(scrollTop / lineHeight) - 5);
  const endLineIndex = Math.min(lineCount, startLineIndex + visibleLineCount);

  const visibleLineNumbers = useMemo(() => {
    const list: number[] = [];
    for (let i = startLineIndex; i < endLineIndex; i++) {
      list.push(i + 1);
    }
    return list;
  }, [startLineIndex, endLineIndex]);

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
          <div className="flex-1 flex overflow-hidden relative bg-[#121316]">
            {/* Synchronized Line Numbers Gutter */}
            <div
              ref={gutterRef}
              title={t.jumpToLine}
              onWheel={(e) => {
                if (textareaRef.current) {
                  textareaRef.current.scrollTop += e.deltaY;
                }
              }}
              className="w-12 bg-[#18191c] border-r border-[#43474e]/30 select-none overflow-hidden shrink-0 cursor-default"
            >
              <div
                ref={gutterInnerRef}
                className="py-3 text-right pr-2 font-mono will-change-transform"
                style={{
                  transform: `translateY(-${scrollTop}px)`,
                  fontSize: `${fontSize}px`,
                  lineHeight: `${lineHeight}px`,
                }}
              >
                <div
                  style={{
                    paddingTop: `${startLineIndex * lineHeight}px`,
                    paddingBottom: `${Math.max(0, (lineCount - endLineIndex) * lineHeight)}px`,
                  }}
                >
                  {visibleLineNumbers.map((lineNum) => {
                    const isCurrentLine = lineNum === cursorPos.line;
                    return (
                      <div
                        key={lineNum}
                        onClick={() => jumpToLineIndex(lineNum - 1)}
                        style={{ height: `${lineHeight}px`, lineHeight: `${lineHeight}px` }}
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
            </div>

            {/* Code Viewport with Syntax Highlighting and Interactive Overlay */}
            <div className="relative flex-1 h-full overflow-hidden bg-[#121316]">
              {/* Syntax Highlighted Code Layer underneath */}
              {syntaxHighlighting && (
                <pre
                  ref={highlightRef}
                  aria-hidden="true"
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: `${lineHeight}px`,
                    tabSize: 2,
                  }}
                  className={`absolute inset-0 pointer-events-none font-mono py-3 px-3 m-0 border-none select-none overflow-hidden will-change-scroll ${
                    wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                  }`}
                  dangerouslySetInnerHTML={{ __html: highlightedHtml + '\n' }}
                />
              )}

              {/* Editable Text Area on top with synchronized scroll */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleChange}
                onKeyUp={handleSelection}
                onClick={handleSelection}
                onScroll={handleScroll}
                onKeyDown={(e) => {
                  // Tab indentation
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const start = e.currentTarget.selectionStart;
                    const end = e.currentTarget.selectionEnd;
                    const val = e.currentTarget.value;
                    const newVal = val.substring(0, start) + '  ' + val.substring(end);
                    setContent(newVal);
                    if (activeFilePath) onUpdateContent(activeFilePath, newVal);
                    recordHistory(newVal);
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
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
                wrap={wordWrap ? 'on' : 'off'}
                className={`absolute inset-0 w-full h-full bg-transparent font-mono py-3 px-3 resize-none focus:outline-none border-none overflow-auto z-10 selection:bg-[#a8c7fa]/30 ${
                  syntaxHighlighting ? 'text-transparent caret-white' : 'text-[#e2e2e6] caret-[#a8c7fa]'
                } ${wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: `${lineHeight}px`,
                  tabSize: 2,
                }}
              />

              {/* Floating Material 3 In-File Search Bar */}
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
          </div>
        )}
      </div>

      {/* Editor Status Bar */}
      <div className="h-6 px-3 bg-[#18191c] border-t border-[#43474e]/30 flex items-center justify-between text-[11px] text-[#8e9199] shrink-0 font-mono">
        <div className="flex items-center gap-3">
          <span className="text-[#a8c7fa]">
            {t.linesLabel} {cursorPos.line}, {t.spaces} {cursorPos.col}
          </span>
          <span>{t.spaces}: 2</span>
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
