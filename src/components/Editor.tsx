/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { VFile, getFileExtension, getLanguageFromExt } from '../utils/fileSystem';
import { M3Icon, M3IconButton, M3Badge } from './M3Components';
import { explainCodeInPlainEnglish, CodeBlockExplanation } from '../utils/codeExplainer';

interface EditorProps {
  openTabs: string[];
  activeFilePath: string;
  files: Record<string, VFile>;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onUpdateContent: (path: string, newContent: string) => void;
  onSaveFile?: (path: string) => void;
  targetLine?: number;
}

export function Editor({
  openTabs,
  activeFilePath,
  files,
  onSelectTab,
  onCloseTab,
  onUpdateContent,
  onSaveFile,
  targetLine,
}: EditorProps) {
  const activeFile = files[activeFilePath];
  const [content, setContent] = useState(activeFile?.content || '');
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [plainEnglishMode, setPlainEnglishMode] = useState(false);
  const [fontSize, setFontSize] = useState(13);
  const [wordWrap, setWordWrap] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeFile) {
      setContent(activeFile.content);
    }
  }, [activeFilePath, activeFile]);

  useEffect(() => {
    if (targetLine && textareaRef.current && activeFile) {
      const lines = activeFile.content.split('\n');
      let charPos = 0;
      for (let i = 0; i < Math.min(targetLine - 1, lines.length); i++) {
        charPos += lines[i].length + 1;
      }
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(charPos, charPos + (lines[targetLine - 1]?.length || 0));
      const lineHeight = fontSize * 1.5;
      textareaRef.current.scrollTop = Math.max(0, (targetLine - 5) * lineHeight);
      setCursorPos({ line: targetLine, col: 1 });
    }
  }, [targetLine, activeFilePath, activeFile, fontSize]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    if (activeFilePath) {
      onUpdateContent(activeFilePath, val);
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

  const lineCount = content.split('\n').length;
  const ext = activeFile ? getFileExtension(activeFile.name) : '';
  const lang = getLanguageFromExt(ext);
  const explanation: CodeBlockExplanation | null = activeFile && !activeFile.isBinary
    ? explainCodeInPlainEnglish(activeFile.name, content)
    : null;

  if (!activeFile) {
    return (
      <div className="flex-1 h-full bg-[#1e1f22] flex flex-col items-center justify-center text-[#8e9199] p-8">
        <M3Icon name="code" size={56} className="text-[#a8c7fa]/30 mb-4" />
        <h3 className="text-base font-medium text-[#e2e2e6] mb-1">No File Open</h3>
        <p className="text-xs max-w-sm text-center">
          Select a file from the explorer on the left, import a .zip project, or pick a starter template.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full bg-[#1e1f22] flex flex-col overflow-hidden">
      {/* Tabs Bar */}
      <div className="h-9 bg-[#18191c] border-b border-[#43474e]/40 flex items-center overflow-x-auto no-scrollbar">
        {openTabs.map((path) => {
          const file = files[path];
          if (!file) return null;
          const isActive = path === activeFilePath;
          return (
            <div
              key={path}
              onClick={() => onSelectTab(path)}
              className={`h-full px-3 flex items-center gap-2 text-xs border-r border-[#43474e]/30 cursor-pointer select-none group transition-colors ${
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
              <span className="truncate max-w-[120px]">{file.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(path);
                }}
                className="w-4 h-4 rounded flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-white/10 text-xs"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* Editor Controls Bar */}
      <div className="h-9 px-3 bg-[#1e1f22] border-b border-[#43474e]/30 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[#a8c7fa] font-mono font-medium">{activeFile.path}</span>
          <M3Badge variant="secondary">{lang}</M3Badge>
          <span className="text-[#8e9199] text-[11px]">{lineCount} lines</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Plain English Mode Toggle */}
          <button
            onClick={() => setPlainEnglishMode(!plainEnglishMode)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              plainEnglishMode
                ? 'bg-[#a8c7fa] text-[#003062] font-semibold'
                : 'bg-[#2b2d30] text-[#c4c6d0] hover:text-white hover:bg-[#383a3e]'
            }`}
            title="Translate code into plain English for non-coders"
          >
            <M3Icon name="translate" size={14} />
            <span>Plain English</span>
          </button>


          {/* Font Size controls */}
          <M3IconButton
            size="sm"
            icon="remove"
            label="Decrease Font"
            onClick={() => setFontSize(Math.max(11, fontSize - 1))}
          />
          <span className="text-[11px] text-[#8e9199] w-5 text-center font-mono">{fontSize}</span>
          <M3IconButton
            size="sm"
            icon="add"
            label="Increase Font"
            onClick={() => setFontSize(Math.min(22, fontSize + 1))}
          />

          {/* Word Wrap Toggle */}
          <M3IconButton
            size="sm"
            icon={wordWrap ? 'wrap_text' : 'format_align_left'}
            label={wordWrap ? 'Disable Word Wrap' : 'Enable Word Wrap'}
            onClick={() => setWordWrap(!wordWrap)}
          />
        </div>
      </div>

      {/* Plain English Explanation Banner (Accessible for people who can't understand code) */}
      {plainEnglishMode && explanation && (
        <div className="bg-[#18191c] border-b border-[#a8c7fa]/30 p-3.5 animate-fadeIn">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full bg-[#00468b] text-[#d6e3ff] text-[11px] font-semibold flex items-center gap-1">
                  <M3Icon name="psychology" size={14} />
                  Plain English Reader
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
              label="Close Explainer"
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
                <p className="text-xs text-[#8e9199] mt-1">Binary Asset ({Math.round(activeFile.size / 1024)} KB)</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden relative bg-[#121316]">
            {/* Line Numbers Gutter */}
            <div
              className="w-12 bg-[#18191c] border-r border-[#43474e]/30 select-none py-3 text-right pr-2 text-[#6e7179] font-mono overflow-hidden shrink-0"
              style={{ fontSize: `${fontSize}px`, lineHeight: '1.5' }}
            >
              {Array.from({ length: lineCount }).map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Editable Text Area */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              onKeyUp={handleSelection}
              onClick={handleSelection}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const start = e.currentTarget.selectionStart;
                  const end = e.currentTarget.selectionEnd;
                  const val = e.currentTarget.value;
                  const newVal = val.substring(0, start) + '  ' + val.substring(end);
                  setContent(newVal);
                  if (activeFilePath) onUpdateContent(activeFilePath, newVal);
                  setTimeout(() => {
                    if (textareaRef.current) {
                      textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
                    }
                  }, 0);
                } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                  e.preventDefault();
                  if (onSaveFile && activeFilePath) {
                    onSaveFile(activeFilePath);
                  }
                }
              }}
              spellCheck={false}
              wrap={wordWrap ? 'on' : 'off'}
              className="flex-1 bg-transparent text-[#e2e2e6] font-mono p-3 resize-none focus:outline-none overflow-auto border-none selection:bg-[#a8c7fa]/25"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: '1.5',
                tabSize: 2,
              }}
            />
          </div>
        )}
      </div>

      {/* Editor Status Bar */}
      <div className="h-6 px-3 bg-[#18191c] border-t border-[#43474e]/30 flex items-center justify-between text-[11px] text-[#8e9199]">
        <div className="flex items-center gap-3">
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span>Spaces: 2</span>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{lang.toUpperCase()}</span>
          <span className="flex items-center gap-1 text-[#b4f3b7]">
            <M3Icon name="cloud_done" size={12} /> Ready
          </span>
        </div>
      </div>
    </div>
  );
}
