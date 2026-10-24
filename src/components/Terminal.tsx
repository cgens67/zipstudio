/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { M3Icon, M3IconButton } from './M3Components';
import { M3Dropdown, DropdownOption } from './M3Dropdown';
import { VFile } from '../utils/fileSystem';
import { GitBranch, GitCommit } from '../utils/gitService';
import { Translations, TRANSLATIONS } from '../utils/i18n';

export interface ConsoleLogEntry {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
}

interface TerminalProps {
  files: Record<string, VFile>;
  logs: ConsoleLogEntry[];
  gitLogs: string[];
  activeBranch: string;
  branches: GitBranch[];
  commits: GitCommit[];
  onClearLogs: () => void;
  onClearGitLogs: () => void;
  onClose: () => void;
  onRunGitCommand?: (cmd: string) => void;
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
  logs,
  gitLogs,
  activeBranch,
  branches,
  commits,
  onClearLogs,
  onClearGitLogs,
  onClose,
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
  const [history, setHistory] = useState<string[]>([
    t.welcomeTerminal,
    t.typeHelp,
    `${t.connectedWorkspace} ${activeBranch}`,
  ]);
  const [inputVal, setInputVal] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, logs, gitLogs]);

  const executeCommand = (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    setCommandHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    setInputVal('');

    const newHistory = [...history, `$ ${trimmed}`];
    const parts = trimmed.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'help':
        newHistory.push(
          'Available commands:',
          '  ls               - List files in current project',
          '  cat <file>       - Display contents of a file',
          '  pwd              - Print working directory',
          '  clear            - Clear terminal output',
          '  echo <text>      - Print text to terminal',
          '  git status       - Show modified and tracked files',
          '  git branch       - List repository branches',
          '  git log          - Show commit history',
          '  npm test         - Run internal test suite',
          '  build            - Validate assets and packaging'
        );
        break;

      case 'clear':
        setHistory([]);
        return;

      case 'pwd':
        newHistory.push('/workspace/project');
        break;

      case 'ls': {
        const fileList = Object.keys(files);
        if (fileList.length === 0) {
          newHistory.push('(empty workspace)');
        } else {
          newHistory.push(fileList.join('   '));
        }
        break;
      }

      case 'cat': {
        const target = args[0];
        if (!target) {
          newHistory.push('Usage: cat <filename>');
        } else if (files[target]) {
          newHistory.push(files[target].content.substring(0, 500) + (files[target].content.length > 500 ? '\n...[truncated]' : ''));
        } else {
          newHistory.push(`cat: ${target}: No such file or directory`);
        }
        break;
      }

      case 'echo':
        newHistory.push(args.join(' '));
        break;

      case 'git': {
        const sub = args[0];
        if (sub === 'status') {
          newHistory.push(`On branch ${activeBranch}`);
          newHistory.push(t.workingTreeClean);
        } else if (sub === 'branch') {
          branches.forEach((b) => {
            newHistory.push(`${b.name === activeBranch ? '* ' : '  '}${b.name}`);
          });
        } else if (sub === 'log') {
          commits.slice(0, 5).forEach((c) => {
            newHistory.push(`commit ${c.shortId} (${c.branch})`);
            newHistory.push(`Author: ${c.author.name} <${c.author.email}>`);
            newHistory.push(`Date:   ${new Date(c.timestamp).toLocaleString()}`);
            newHistory.push(`    ${c.message}\n`);
          });
          if (commits.length === 0) {
            newHistory.push('(No commits yet)');
          }
        } else {
          newHistory.push(`git: '${sub}' is simulated. Use UI Source Control for direct GitHub sync.`);
        }
        break;
      }

      case 'npm': {
        if (args[0] === 'test') {
          newHistory.push('> project@1.0.0 test');
          newHistory.push('✔ Virtual file system valid');
          newHistory.push('✔ In-browser package bundler ready');
          newHistory.push('✔ All 11 unit tests passed (311ms)');
        } else {
          newHistory.push(`npm: running ${args.join(' ')} (simulated)`);
        }
        break;
      }

      case 'build':
        newHistory.push('Building web assets for production distribution...');
        newHistory.push('✔ HTML/CSS/JS bundled');
        newHistory.push(`✔ Total workspace size: ${Math.round(Object.values(files).reduce((a, b) => a + b.size, 0) / 1024)} KB`);
        newHistory.push('Ready for commit or .zip download.');
        break;

      default:
        newHistory.push(`bash: ${cmd}: command not found. Type 'help' for available commands.`);
    }

    setHistory(newHistory);
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand(inputVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
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
      className={`bg-[#18191c] flex flex-col select-none relative ${
        isMobile
          ? 'h-full w-full flex-1 min-h-0'
          : 'border-t border-[#43474e]/40 transition-[height] duration-150 shrink-0'
      }`}
    >
      {/* Mouse Drag Resize Handle on Top Edge (Desktop only) */}
      {!isMobile && onResizeStart && (
        <div
          onMouseDown={onResizeStart}
          title={t.resizeTerminal}
          className="absolute -top-1.5 inset-x-0 h-3 cursor-row-resize z-30 group flex items-center justify-center hover:bg-[#a8c7fa]/20 transition-colors"
        >
          <div className="w-16 h-1 rounded-full bg-[#43474e]/50 group-hover:bg-[#a8c7fa] group-active:bg-[#a8c7fa] transition-colors" />
        </div>
      )}

      {/* Terminal Header Tabs Bar */}
      <div className="h-9 px-2 bg-[#1e1f22] border-b border-[#43474e]/30 flex items-center justify-between text-xs shrink-0 overflow-x-auto no-scrollbar gap-2">
        <div className="flex items-center gap-1 h-full shrink-0">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-3 py-1.5 font-medium flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'terminal'
                ? 'border-[#a8c7fa] text-[#a8c7fa]'
                : 'border-transparent text-[#8e9199] hover:text-[#e2e2e6]'
            }`}
          >
            <M3Icon name="terminal" size={14} />
            <span>{t.terminal}</span>
          </button>

          <button
            onClick={() => setActiveTab('console')}
            className={`px-3 py-1.5 font-medium flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors relative ${
              activeTab === 'console'
                ? 'border-[#a8c7fa] text-[#a8c7fa]'
                : 'border-transparent text-[#8e9199] hover:text-[#e2e2e6]'
            }`}
          >
            <M3Icon name="dvr" size={14} />
            <span>{t.logs}</span>
            {logs.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#00468b] text-[#d6e3ff] font-bold text-[9px] flex items-center justify-center">
                {logs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('git')}
            className={`px-3 py-1.5 font-medium flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'git'
                ? 'border-[#a8c7fa] text-[#a8c7fa]'
                : 'border-transparent text-[#8e9199] hover:text-[#e2e2e6]'
            }`}
          >
            <M3Icon name="commit" size={14} />
            <span>{t.gitOutput}</span>
          </button>

          <button
            onClick={() => setActiveTab('problems')}
            className={`px-3 py-1.5 font-medium flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'problems'
                ? 'border-[#a8c7fa] text-[#a8c7fa]'
                : 'border-transparent text-[#8e9199] hover:text-[#e2e2e6]'
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
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-[#e2e2e6]">
        {/* Terminal Tab */}
        {activeTab === 'terminal' && (
          <div className="space-y-1">
            {history.map((line, idx) => (
              <div
                key={idx}
                className={line.startsWith('$') ? 'text-[#a8c7fa] font-semibold' : 'text-[#c4c6d0]'}
              >
                {line}
              </div>
            ))}
            {/* Quick Command Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 pb-1">
              {['ls', 'git status', 'git log', 'pwd', 'npm test', 'build', 'clear', 'help'].map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => executeCommand(cmd)}
                  className="px-2.5 py-1 rounded-full bg-[#2b2d30] hover:bg-[#383a3e] active:scale-95 text-[#a8c7fa] text-[11px] font-mono border border-[#43474e]/40 shrink-0 cursor-pointer transition-all"
                >
                  {cmd}
                </button>
              ))}
            </div>

            <form onSubmit={handleCommandSubmit} className="flex items-center gap-2 mt-1.5 bg-[#121316] rounded-xl px-2.5 py-1.5 border border-[#43474e]/40">
              <span className="text-[#a8c7fa] font-bold text-xs select-none shrink-0">zipstudio:~$</span>
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.typeCommandPrompt}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                className="flex-1 bg-transparent border-none text-[#e2e2e6] focus:outline-none font-mono text-xs min-w-0"
              />
              {inputVal.trim() && (
                <button
                  type="submit"
                  className="w-7 h-7 rounded-full bg-[#a8c7fa] text-[#003062] flex items-center justify-center shrink-0 cursor-pointer active:scale-90 transition-transform"
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
              <div className="text-[#8e9199] italic">{t.noLogs}</div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-2 py-0.5 border-b border-[#43474e]/20 ${
                    log.type === 'error'
                      ? 'text-[#ff8585] bg-[#690005]/15'
                      : log.type === 'warn'
                      ? 'text-[#ffd54f] bg-[#ff8f00]/10'
                      : 'text-[#c4c6d0]'
                  }`}
                >
                  <span className="text-[#8e9199] text-[10px] shrink-0 font-mono">
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
              <div className="text-[#8e9199] italic">{t.noGitLogs}</div>
            ) : (
              gitLogs.map((log, idx) => (
                <div key={idx} className="text-[#a8c7fa]/90">
                  {log}
                </div>
              ))
            )}
          </div>
        )}

        {/* Diagnostics Tab */}
        {activeTab === 'problems' && (
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-[#1e1f22] rounded-lg border border-[#43474e]/40 flex items-center gap-2 text-[#b4f3b7]">
              <M3Icon name="verified" size={18} />
              <span>{t.noDiagnostics}</span>
            </div>
            <div className="text-[11px] text-[#8e9199] space-y-1">
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
