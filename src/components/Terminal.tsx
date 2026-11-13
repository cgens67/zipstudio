/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { M3Icon, M3IconButton } from './M3Components';
import { M3Dropdown } from './M3Dropdown';
import { VFile } from '../utils/fileSystem';
import { FileDiff, GitBranch, GitCommit, GitHubRepo } from '../utils/gitService';
import { Translations, TRANSLATIONS } from '../utils/i18n';
import {
  executeShellCommandLine,
  formatPromptCwd,
  getAutocompleteSuggestions,
  virtualDirExists,
} from '../utils/terminalShell';

export interface ConsoleLogEntry {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
}

interface TerminalProps {
  files: Record<string, VFile>;
  baseFiles?: Record<string, VFile>;
  diffs?: FileDiff[];
  selectedRepo?: GitHubRepo | null;
  gitUser?: { name?: string; login?: string } | null;
  logs: ConsoleLogEntry[];
  gitLogs: string[];
  activeBranch: string;
  branches: GitBranch[];
  commits: GitCommit[];
  onClearLogs: () => void;
  onClearGitLogs: () => void;
  onClose: () => void;
  onRunGitCommand?: (cmd: string) => void;
  onGitReset?: (mode: 'soft' | 'mixed' | 'hard', count: number, forcePushRemote: boolean) => Promise<void>;
  onCommit?: (message: string) => Promise<void>;
  onDeleteFile?: (path: string) => void;
  onCleanBuild?: () => void;
  onApplyFilesFromTerminal?: (
    nextFiles: Record<string, VFile>,
    meta?: { deletedPaths?: string[]; openedFile?: string }
  ) => void;
  onOpenFile?: (path: string) => void;
  onSwitchBranch?: (branchName: string) => Promise<void>;
  onCreateBranch?: (branchName: string) => Promise<void>;
  diffsCount?: number;
  softResetTarget?: GitCommit | null;
  t?: Translations;
  height?: number;
  onResizeStart?: (e: React.MouseEvent) => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  onMinimize?: () => void;
  isMobile?: boolean;
}

export function Terminal({
  files,
  baseFiles = {},
  diffs = [],
  selectedRepo = null,
  gitUser = null,
  logs,
  gitLogs,
  activeBranch,
  branches,
  commits,
  onClearLogs,
  onClearGitLogs,
  onClose,
  onGitReset,
  onCommit,
  onDeleteFile,
  onCleanBuild,
  onApplyFilesFromTerminal,
  onOpenFile,
  onSwitchBranch,
  onCreateBranch,
  diffsCount = 0,
  softResetTarget = null,
  t = TRANSLATIONS.en,
  height = 220,
  onResizeStart,
  isMaximized = false,
  onToggleMaximize,
  onMinimize,
  isMobile = false,
}: TerminalProps) {
  const [activeTab, setActiveTab] = useState<'terminal' | 'console' | 'git' | 'problems'>('terminal');
  const [internalMaximized, setInternalMaximized] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'log'>('all');

  // If parent controls maximize, use isMaximized, otherwise use internalMaximized
  const maximized = onToggleMaximize ? isMaximized : internalMaximized;
  const toggleMaximize = onToggleMaximize || (() => setInternalMaximized(!internalMaximized));

  // Interactive virtual terminal state
  const [cwd, setCwd] = useState('');
  const [prevCwd, setPrevCwd] = useState('');
  const [shellEnv, setShellEnv] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<string[]>([
    t.welcomeTerminal,
    t.typeHelp,
    `${t.connectedWorkspace} ${activeBranch}`,
  ]);
  const [inputVal, setInputVal] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isRunningCmd, setIsRunningCmd] = useState(false);
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset cwd safely if current directory disappears (e.g. repo switch or zip upload)
  useEffect(() => {
    if (cwd && !virtualDirExists(files, cwd)) {
      setCwd('');
    }
  }, [files, cwd]);

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, logs, gitLogs]);

  const executeCommand = async (rawCmd: string) => {
    const rawLines = rawCmd.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (rawLines.length === 0) return;

    const updatedCmdHistory = [...commandHistory, ...rawLines];
    setCommandHistory(updatedCmdHistory);
    setHistoryIndex(-1);
    setInputVal('');
    setIsRunningCmd(true);

    let runningCwd = cwd;
    let runningPrevCwd = prevCwd;
    let runningEnv = shellEnv;
    let workingFiles = { ...files };
    let cleared = false;
    const batchLines: string[] = [];

    try {
      for (const trimmed of rawLines) {
        if (trimmed.startsWith('#')) {
          batchLines.push(trimmed);
          continue;
        }

        const promptLabel = `zipstudio:${formatPromptCwd(runningCwd)} (${activeBranch})$`;
        batchLines.push(`${promptLabel} ${trimmed}`);

        const result = await executeShellCommandLine(trimmed, {
          files: workingFiles,
          baseFiles,
          cwd: runningCwd,
          prevCwd: runningPrevCwd,
          env: runningEnv,
          activeBranch,
          branches,
          commits,
          diffs,
          selectedRepo,
          softResetTarget,
          commandHistory: updatedCmdHistory,
          gitUser,
          onOpenFile,
          onSwitchBranch,
          onCreateBranch,
          onGitReset,
          onCommit,
          onCleanBuild,
        });

        runningCwd = result.nextCwd;
        runningPrevCwd = result.nextPrevCwd;
        runningEnv = result.nextEnv;

        if (result.clearRequested) {
          cleared = true;
          batchLines.length = 0;
        }
        if (result.outputLines.length > 0) {
          batchLines.push(...result.outputLines);
        }

        if (result.filesChanged) {
          workingFiles = result.nextFiles;
          if (onApplyFilesFromTerminal) {
            onApplyFilesFromTerminal(result.nextFiles, {
              deletedPaths: result.deletedPaths,
              openedFile: result.openedFile,
            });
          } else if (onDeleteFile) {
            result.deletedPaths.forEach((p) => onDeleteFile(p));
          }
        } else if (result.openedFile && onOpenFile) {
          onOpenFile(result.openedFile);
        }
      }

      setCwd(runningCwd);
      setPrevCwd(runningPrevCwd);
      setShellEnv(runningEnv);

      if (cleared) {
        setHistory(batchLines);
      } else {
        setHistory((prev) => [...prev, ...batchLines]);
      }
    } catch (err: any) {
      setHistory((prev) => [...prev, ...batchLines, `fatal: ${err?.message || 'Shell execution error'}`]);
    } finally {
      setIsRunningCmd(false);
    }
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRunningCmd) {
      executeCommand(inputVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const { completedInput, candidates } = getAutocompleteSuggestions(inputVal, cwd, files);
      if (completedInput !== null) {
        setInputVal(completedInput);
      } else if (candidates.length > 1) {
        setHistory((prev) => [...prev, candidates.join('   ')]);
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      setHistory([]);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex < commandHistory.length) {
        setHistoryIndex(nextIndex);
        setInputVal(commandHistory[commandHistory.length - 1 - nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInputVal(commandHistory[commandHistory.length - 1 - nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputVal('');
      }
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (logFilter === 'all') return true;
    if (logFilter === 'error') return l.type === 'error';
    if (logFilter === 'warn') return l.type === 'warn';
    if (logFilter === 'log') return l.type === 'log' || l.type === 'info';
    return true;
  });

  return (
    <div
      style={isMobile ? undefined : { height: maximized ? '75vh' : `${height}px` }}
      className={`bg-white dark:bg-[#18191c] text-[#191c20] dark:text-[#e2e2e6] flex flex-col select-none relative ${
        isMobile
          ? 'h-full w-full flex-1 min-h-0'
          : 'border-t border-[#d8dae5] dark:border-[#43474e]/40 transition-[height] duration-150 shrink-0'
      }`}
    >
      {/* Mouse Drag Resize Handle on Top Edge (Desktop only) */}
      {!isMobile && onResizeStart && (
        <div
          onMouseDown={onResizeStart}
          title={t.resizeTerminal}
          className="absolute -top-1.5 inset-x-0 h-3 cursor-row-resize z-30 group flex items-center justify-center hover:bg-[#0b57d0]/10 dark:hover:bg-[#a8c7fa]/20 transition-colors"
        >
          <div className="w-16 h-1 rounded-full bg-[#d8dae5] dark:bg-[#43474e]/50 group-hover:bg-[#0b57d0] dark:group-hover:bg-[#a8c7fa] group-active:bg-[#0b57d0] dark:group-active:bg-[#a8c7fa] transition-colors" />
        </div>
      )}

      {/* Terminal Header Tabs Bar */}
      <div className="h-9 px-2 bg-[#f8fafd] dark:bg-[#1e1f22] border-b border-[#d8dae5] dark:border-[#43474e]/30 flex items-center justify-between text-xs shrink-0 overflow-x-auto no-scrollbar gap-2">
        <div className="flex items-center gap-1 h-full shrink-0">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-3 py-1.5 font-medium flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'terminal'
                ? 'border-[#0b57d0] dark:border-[#a8c7fa] text-[#0b57d0] dark:text-[#a8c7fa]'
                : 'border-transparent text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-[#e2e2e6]'
            }`}
          >
            <M3Icon name="terminal" size={14} />
            <span>{t.terminal}</span>
          </button>

          <button
            onClick={() => setActiveTab('console')}
            className={`px-3 py-1.5 font-medium flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors relative ${
              activeTab === 'console'
                ? 'border-[#0b57d0] dark:border-[#a8c7fa] text-[#0b57d0] dark:text-[#a8c7fa]'
                : 'border-transparent text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-[#e2e2e6]'
            }`}
          >
            <M3Icon name="dvr" size={14} />
            <span>{t.logs}</span>
            {logs.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#d3e3fd] text-[#041e49] dark:bg-[#00468b] dark:text-[#d6e3ff] font-bold text-[9px] flex items-center justify-center">
                {logs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('git')}
            className={`px-3 py-1.5 font-medium flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'git'
                ? 'border-[#0b57d0] dark:border-[#a8c7fa] text-[#0b57d0] dark:text-[#a8c7fa]'
                : 'border-transparent text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-[#e2e2e6]'
            }`}
          >
            <M3Icon name="commit" size={14} />
            <span>{t.gitOutput}</span>
          </button>

          <button
            onClick={() => setActiveTab('problems')}
            className={`px-3 py-1.5 font-medium flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'problems'
                ? 'border-[#0b57d0] dark:border-[#a8c7fa] text-[#0b57d0] dark:text-[#a8c7fa]'
                : 'border-transparent text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-[#e2e2e6]'
            }`}
          >
            <M3Icon name="error_outline" size={14} />
            <span>{t.diagnostics}</span>
          </button>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1">
          {activeTab === 'console' && (
            <div className="flex items-center gap-1.5 mr-2">
              <div className="w-32">
                <M3Dropdown<'all' | 'error' | 'warn' | 'log'>
                  size="sm"
                  value={logFilter}
                  onChange={(val) => setLogFilter(val)}
                  options={[
                    { value: 'all', label: t.allLogs, icon: 'list' },
                    { value: 'error', label: t.errorsOnly, icon: 'error', iconColor: 'text-[#f2b8b5]' },
                    { value: 'warn', label: t.warnings, icon: 'warning', iconColor: 'text-[#ffd54f]' },
                    { value: 'log', label: t.infoLogs, icon: 'info', iconColor: 'text-[#a8c7fa]' },
                  ]}
                />
              </div>
              <M3IconButton
                size="sm"
                icon="block"
                label={t.clearLogs}
                onClick={onClearLogs}
              />
            </div>
          )}

          {activeTab === 'terminal' && (
            <M3IconButton
              size="sm"
              icon="delete_sweep"
              label={t.clearTerminal}
              onClick={() => setHistory([])}
            />
          )}

          {activeTab === 'git' && (
            <M3IconButton
              size="sm"
              icon="clear_all"
              label={t.clearGitLogs}
              onClick={onClearGitLogs}
            />
          )}

          {onMinimize && (
            <M3IconButton
              size="sm"
              icon="keyboard_arrow_down"
              label={t.minimizeTerminal}
              onClick={onMinimize}
            />
          )}

          <M3IconButton
            size="sm"
            icon={maximized ? 'collapse_content' : 'expand_content'}
            label={maximized ? t.restoreTerminal : t.maximizeTerminal}
            onClick={toggleMaximize}
          />

          <M3IconButton
            size="sm"
            icon="close"
            label={t.close}
            onClick={onClose}
          />
        </div>
      </div>

      {/* Tab Contents */}
      <div
        onClick={() => {
          if (activeTab === 'terminal' && typeof window !== 'undefined' && !window.getSelection()?.toString()) {
            inputRef.current?.focus();
          }
        }}
        className="flex-1 overflow-y-auto p-3 font-mono text-xs text-[#191c20] dark:text-[#e2e2e6]"
      >
        {/* Terminal Tab */}
        {activeTab === 'terminal' && (
          <div className="space-y-1 select-text">
            {history.map((line, idx) => {
              const isPromptLine = line.startsWith('zipstudio:') || line.startsWith('$');
              const isDiffAdd = line.startsWith('+') && !line.startsWith('+++');
              const isDiffDel = line.startsWith('-') && !line.startsWith('---');
              return (
                <div
                  key={idx}
                  className={`whitespace-pre-wrap break-words leading-relaxed ${
                    isPromptLine
                      ? 'text-[#0b57d0] dark:text-[#a8c7fa] font-semibold'
                      : isDiffAdd
                      ? 'text-[#0a6640] dark:text-[#b4f3b7]'
                      : isDiffDel
                      ? 'text-[#ba1a1a] dark:text-[#ffb4ab]'
                      : 'text-[#44474e] dark:text-[#c4c6d0]'
                  }`}
                >
                  {line}
                </div>
              );
            })}
            {/* Quick Command Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 pb-1 select-none">
              {['ls -la', 'tree -L 2', 'git status', 'git diff', 'git log --oneline', 'pwd', 'clear', 'help'].map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    executeCommand(cmd);
                  }}
                  className="px-2.5 py-1 rounded-full bg-[#f0f2f8] dark:bg-[#2b2d30] hover:bg-[#e4e7ef] dark:hover:bg-[#383a3e] active:scale-95 text-[#0b57d0] dark:text-[#a8c7fa] text-[11px] font-mono border border-[#d8dae5] dark:border-[#43474e]/40 shrink-0 cursor-pointer transition-all shadow-xs"
                >
                  {cmd}
                </button>
              ))}
            </div>

            <form
              onSubmit={handleCommandSubmit}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 mt-1.5 bg-[#f8fafd] dark:bg-[#121316] rounded-xl px-2.5 py-1.5 border border-[#d8dae5] dark:border-[#43474e]/40 select-none"
            >
              <span className="text-[#0b57d0] dark:text-[#a8c7fa] font-bold text-xs select-none shrink-0 max-w-[45%] truncate">
                zipstudio:{formatPromptCwd(cwd)} ({activeBranch})$
              </span>
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isRunningCmd ? 'Running...' : t.typeCommandPrompt}
                disabled={isRunningCmd}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                className="flex-1 bg-transparent border-none text-[#191c20] dark:text-[#e2e2e6] focus:outline-none font-mono text-xs min-w-0"
              />
              {inputVal.trim() && (
                <button
                  type="submit"
                  disabled={isRunningCmd}
                  className="w-7 h-7 rounded-full bg-[#0b57d0] text-white dark:bg-[#a8c7fa] dark:text-[#003062] flex items-center justify-center shrink-0 cursor-pointer active:scale-90 transition-transform shadow-xs"
                  title="Run command"
                >
                  <M3Icon name="arrow_forward" size={16} />
                </button>
              )}
            </form>
            <div ref={terminalBottomRef} />
          </div>
        )}

        {/* Preview Logs Tab */}
        {activeTab === 'console' && (
          <div className="space-y-1">
            {filteredLogs.length === 0 ? (
              <div className="text-[#74777f] dark:text-[#8e9199] italic">{t.noLogs}</div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-2 py-0.5 border-b border-[#d8dae5]/50 dark:border-[#43474e]/20 ${
                    log.type === 'error'
                      ? 'text-[#ba1a1a] dark:text-[#ff8585] bg-[#ffdad6]/20 dark:bg-[#690005]/15'
                      : log.type === 'warn'
                      ? 'text-[#7e5700] dark:text-[#ffd54f] bg-[#ffdf99]/20 dark:bg-[#ff8f00]/10'
                      : 'text-[#191c20] dark:text-[#c4c6d0]'
                  }`}
                >
                  <span className="text-[#74777f] dark:text-[#8e9199] text-[10px] shrink-0 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="font-bold shrink-0 text-[10px] uppercase">
                    [{log.type}]
                  </span>
                  <span className="whitespace-pre-wrap break-all flex-1">{log.message}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Git Output Tab */}
        {activeTab === 'git' && (
          <div className="space-y-1 font-mono text-[11px]">
            {gitLogs.length === 0 ? (
              <div className="text-[#74777f] dark:text-[#8e9199] italic">{t.noGitLogs}</div>
            ) : (
              gitLogs.map((log, idx) => (
                <div key={idx} className="text-[#041e49] dark:text-[#a8c7fa] leading-relaxed">
                  {log}
                </div>
              ))
            )}
          </div>
        )}

        {/* Diagnostics Tab */}
        {activeTab === 'problems' && (
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-[#e6f4ea] dark:bg-[#1e1f22] rounded-lg border border-[#a5d6a7] dark:border-[#43474e]/40 flex items-center gap-2 text-[#0a6640] dark:text-[#b4f3b7] font-semibold">
              <M3Icon name="verified" size={18} className="text-[#137333] dark:text-[#b4f3b7]" />
              <span>{t.noDiagnostics}</span>
            </div>
            <div className="text-[11px] text-[#44474e] dark:text-[#8e9199] space-y-1">
              <div>• HTML parser: Active</div>
              <div>• ES module loader: Ready</div>
              <div>• Sandboxed preview bridge: Online</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
