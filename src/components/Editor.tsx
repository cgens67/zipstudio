/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VFile, getFileExtension, getLanguageFromExt } from '../utils/fileSystem';
import { M3Icon, M3IconButton, M3Badge } from './M3Components';
import { explainCodeInPlainEnglish, CodeBlockExplanation } from '../utils/codeExplainer';
import { Translations, TRANSLATIONS } from '../utils/i18n';

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
  onMaximize,
  isMaximized,
}: EditorProps) {
  const activeFile = files[activeFilePath];
  const [content, setContent] = useState(activeFile?.content || '');
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [plainEnglishMode, setPlainEnglishMode] = useState(false);
  const [fontSize, setFontSize] = useState(13);
  const [wordWrap, setWordWrap] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const gutterInnerRef = useRef<HTMLDivElement>(null);

  // Undo / Redo history state
  const historyRef = useRef<Record<string, { stack: string[]; pointer: number }>>({});

  const lineHeight = Math.round(fontSize * 1.55);

  // Initialize or restore history when active file changes
  useEffect(() => {
    if (activeFile) {
      setContent(activeFile.content);
      if (!historyRef.current[activeFilePath]) {
        historyRef.current[activeFilePath] = {
          stack: [activeFile.content],
          pointer: 0,
        };
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

      historyRef.current[activeFilePath] = {
        stack: newStack,
        pointer: newStack.length - 1,
      };
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
    }
  }, [activeFilePath, onUpdateContent]);

  // Delete current line action
  const handleDeleteLine = useCallback(() => {
    if (!textareaRef.current || !activeFilePath) return;
    const text = textareaRef.current.value;
    const selStart = textareaRef.current.selectionStart;

    // Find start of current line
    const lastNewlineBefore = text.lastIndexOf('\n', selStart - 1);
    const lineStart = lastNewlineBefore === -1 ? 0 : lastNewlineBefore + 1;

    // Find end of current line
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
      setCursorPos({ line: targetLine, col: 1 });
    }
  }, [targetLine, activeFilePath, activeFile, lineHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    if (activeFilePath) {
      onUpdateContent(activeFilePath, val);
      recordHistory(val);
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

  // Synchronize line gutter scrolling in real time with textarea scroll using hardware accelerated transform
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const st = e.currentTarget.scrollTop;
    setScrollTop(st);
    if (gutterInnerRef.current) {
      gutterInnerRef.current.style.transform = `translateY(-${st}px)`;
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

  const lineCount = content.split('\n').length;
  const ext = activeFile ? getFileExtension(activeFile.name) : '';
  const lang = getLanguageFromExt(ext);
  const explanation: CodeBlockExplanation | null =
    activeFile && !activeFile.isBinary ? explainCodeInPlainEnglish(activeFile.name, content) : null;

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
      <div className="h-9 px-3 bg-[#1e1f22] border-b border-[#43474e]/30 flex items-center justify-between text-xs shrink-0 gap-2">
        <div className="flex items-center gap-2 truncate">
          <span className="text-[#a8c7fa] font-mono font-medium truncate max-w-[180px]">
            {activeFile.path}
          </span>
          <M3Badge variant="secondary">{lang}</M3Badge>
          <span className="text-[#8e9199] text-[11px] shrink-0 font-mono">
            {lineCount} {t.linesLabel}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Quick Hotkey Buttons */}
          <M3IconButton
            size="sm"
            icon="undo"
            label={t.undo}
            onClick={handleUndo}
          />
          <M3IconButton
            size="sm"
            icon="redo"
            label={t.redo}
            onClick={handleRedo}
          />
          <M3IconButton
            size="sm"
            icon="content_cut"
            label={t.deleteLine}
            onClick={handleDeleteLine}
          />

          {onFindInFiles && (
            <M3IconButton
              size="sm"
              icon="search"
              label={t.findInFiles}
              onClick={onFindInFiles}
            />
          )}

          <div className="w-[1px] h-3.5 bg-[#43474e]/50 mx-1" />

          {/* Plain English Mode Toggle */}
          <button
            onClick={() => setPlainEnglishMode(!plainEnglishMode)}
            className={`px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              plainEnglishMode
                ? 'bg-[#a8c7fa] text-[#003062] font-semibold'
                : 'bg-[#2b2d30] text-[#c4c6d0] hover:text-white hover:bg-[#383a3e]'
            }`}
            title={t.plainEnglishDesc}
          >
            <M3Icon name="translate" size={14} />
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

      {/* Plain English Explanation Banner */}
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
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#121316]">
            {activeFile.content.startsWith('data:image/') ? (
              <div className="max-w-md max-h-[70%] border border-[#43474e] rounded-xl p-2 bg-[#1e1f22]">
                <img
                  src={activeFile.content}
                  alt={activeFile.name}
                  className="max-h-[300px] w-auto mx-auto object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="text-center text-[#c4c6d0]">
                <M3Icon name="inventory_2" size={48} className="mx-auto mb-2 text-[#a8c7fa]" />
                <p className="text-sm font-semibold">{activeFile.name}</p>
                <p className="text-xs text-[#8e9199] mt-1 font-mono">
                  {t.binaryAsset} ({Math.round(activeFile.size / 1024)} KB)
                </p>
              </div>
            )}
          </div>
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
                {Array.from({ length: lineCount }).map((_, i) => {
                  const lineNum = i + 1;
                  const isCurrentLine = lineNum === cursorPos.line;
                  return (
                    <div
                      key={lineNum}
                      onClick={() => jumpToLineIndex(i)}
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

            {/* Editable Text Area with real-time synchronized scroll & hotkeys */}
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
                // Save hotkey (Ctrl+S / Cmd+S)
                else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                  e.preventDefault();
                  if (onSaveFile && activeFilePath) {
                    onSaveFile(activeFilePath);
                  }
                }
                // Find in Files (Ctrl+Shift+F / Cmd+Shift+F)
                else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
                  e.preventDefault();
                  if (onFindInFiles) onFindInFiles();
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
              className={`flex-1 bg-transparent text-[#e2e2e6] font-mono py-3 px-3 resize-none focus:outline-none overflow-auto border-none selection:bg-[#a8c7fa]/25 ${
                wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'
              }`}
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: `${lineHeight}px`,
                tabSize: 2,
              }}
            />
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
          <span>{lang.toUpperCase()}</span>
          <span className="flex items-center gap-1 text-[#b4f3b7]">
            <M3Icon name="cloud_done" size={12} /> {t.ready}
          </span>
        </div>
      </div>
    </div>
  );
}
