/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { FileDiff } from '../utils/gitService';
import { buildSideBySideRows } from '../utils/diffUtils';
import { M3Icon } from './M3Components';
import { Translations, TRANSLATIONS } from '../utils/i18n';

interface DiffViewerProps {
  diff: FileDiff;
  hasWorkingFile: boolean;
  viewStyle: 'inline' | 'side-by-side';
  onChangeViewStyle: (style: 'inline' | 'side-by-side') => void;
  onExitDiffMode?: () => void;
  onRevertFile: (path: string) => void;
  fontSize?: number;
  fontFamily?: string;
  t?: Translations;
}

export function DiffViewer({
  diff,
  hasWorkingFile,
  viewStyle,
  onChangeViewStyle,
  onExitDiffMode,
  onRevertFile,
  fontSize = 13,
  fontFamily = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  t = TRANSLATIONS.en,
}: DiffViewerProps) {
  const [confirmingRevert, setConfirmingRevert] = useState(false);

  // Reset confirmation prompt when switching files
  useEffect(() => {
    setConfirmingRevert(false);
  }, [diff.path]);

  const sideBySideRows = useMemo(() => {
    if (viewStyle !== 'side-by-side') return [];
    return buildSideBySideRows(diff.lines);
  }, [diff.lines, viewStyle]);

  const lineHeight = Math.round(fontSize * 1.55);

  const statusBadgeClass =
    diff.status === 'added'
      ? 'bg-[#c4eed0] text-[#072711] dark:bg-[#0f5223]/60 dark:text-[#b4f3b7] border border-[#308745]/40'
      : diff.status === 'deleted'
      ? 'bg-[#ffdad6] text-[#690005] dark:bg-[#690005]/50 dark:text-[#ffb4ab] border border-[#ba1a1a]/40'
      : 'bg-[#ffdf99] text-[#4d3500] dark:bg-[#e09b00]/25 dark:text-[#ffd54f] border border-[#ffd54f]/40';

  const statusLabel =
    diff.status === 'added' ? 'ADDED' : diff.status === 'deleted' ? 'DELETED' : 'MODIFIED';

  const isBinaryDiff = diff.lines.length === 0;

  return (
    <div
      data-testid="editor-diff-viewer"
      className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#f8fafd] dark:bg-[#121316] text-[#191c20] dark:text-[#e2e2e6]"
    >
      {/* Diff Mode Action Header */}
      <div className="px-3 py-2 bg-white dark:bg-[#18191c] border-b border-[#d8dae5] dark:border-[#43474e]/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase shrink-0 ${statusBadgeClass}`}
          >
            {statusLabel}
          </span>
          <span
            className="text-xs font-mono font-semibold text-[#191c20] dark:text-white truncate max-w-[220px] sm:max-w-xs"
            title={diff.path}
          >
            {diff.path}
          </span>
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold shrink-0">
            <span className="text-[#0a6640] dark:text-[#b4f3b7]">+{diff.additions}</span>
            <span className="text-[#ba1a1a] dark:text-[#ff8585]">-{diff.deletions}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {/* Inline vs Side-by-Side Switcher */}
          <div
            role="group"
            aria-label="Diff view layout"
            className="flex items-center bg-[#f0f2f8] dark:bg-[#121316] rounded-lg p-0.5 border border-[#d8dae5] dark:border-[#43474e]/50"
          >
            <button
              type="button"
              onClick={() => onChangeViewStyle('inline')}
              aria-pressed={viewStyle === 'inline'}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                viewStyle === 'inline'
                  ? 'bg-[#0b57d0] text-white dark:bg-[#a8c7fa] dark:text-[#003062] font-semibold shadow-xs'
                  : 'text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white'
              }`}
            >
              <M3Icon name="view_agenda" size={13} />
              <span>Inline</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeViewStyle('side-by-side')}
              aria-pressed={viewStyle === 'side-by-side'}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                viewStyle === 'side-by-side'
                  ? 'bg-[#0b57d0] text-white dark:bg-[#a8c7fa] dark:text-[#003062] font-semibold shadow-xs'
                  : 'text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white'
              }`}
            >
              <M3Icon name="vertical_split" size={13} />
              <span>Side-by-Side</span>
            </button>
          </div>

          {/* Exit Diff Mode back to Code Editor */}
          {hasWorkingFile && onExitDiffMode && (
            <button
              type="button"
              onClick={onExitDiffMode}
              className="px-2.5 py-1 rounded-lg bg-[#f0f2f8] hover:bg-[#e4e7ef] dark:bg-[#2b2d30] dark:hover:bg-[#383a3e] text-[#191c20] dark:text-[#e2e2e6] border border-[#d8dae5] dark:border-[#43474e]/50 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
              title="Switch back to editable code view"
            >
              <M3Icon name="edit" size={13} />
              <span>Edit Code</span>
            </button>
          )}

          {/* Revert File Button + Inline 2-Step Confirmation */}
          {!confirmingRevert ? (
            <button
              type="button"
              onClick={() => setConfirmingRevert(true)}
              className="px-2.5 py-1 rounded-lg bg-[#ffdad6]/70 hover:bg-[#ffdad6] dark:bg-[#690005]/40 dark:hover:bg-[#690005]/70 text-[#ba1a1a] dark:text-[#ffb4ab] border border-[#ba1a1a]/35 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              title="Discard local changes and restore baseline file"
            >
              <M3Icon name="undo" size={14} />
              <span>Revert File</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-[#ffdad6]/40 dark:bg-[#690005]/30 border border-[#ba1a1a]/50 rounded-lg px-1.5 py-0.5">
              <button
                type="button"
                onClick={() => {
                  setConfirmingRevert(false);
                  onRevertFile(diff.path);
                }}
                className="px-2 py-0.5 rounded bg-[#ba1a1a] hover:bg-[#93000a] text-white text-[11px] font-semibold cursor-pointer transition-colors"
              >
                Confirm Revert
              </button>
              <button
                type="button"
                onClick={() => setConfirmingRevert(false)}
                className="px-2 py-0.5 rounded text-[#5d6168] dark:text-[#c4c6d0] hover:text-[#191c20] dark:hover:text-white text-[11px] font-medium cursor-pointer transition-colors"
              >
                {t.cancel}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Diff Viewport Content */}
      {isBinaryDiff ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-[#5d6168] dark:text-[#8e9199]">
          <M3Icon name="difference" size={40} className="mb-3 text-[#0b57d0] dark:text-[#a8c7fa]" />
          <p className="font-semibold text-sm text-[#191c20] dark:text-white mb-1">
            Binary file {diff.status}
          </p>
          <p className="max-w-sm leading-relaxed mb-4">
            Line-by-line text preview is not available for binary assets. Use &ldquo;Revert File&rdquo; above to restore the baseline version.
          </p>
        </div>
      ) : viewStyle === 'inline' ? (
        <div
          data-testid="diff-inline-view"
          className="flex-1 overflow-auto min-h-0 bg-white dark:bg-[#121316]"
          style={{ fontSize: `${fontSize}px`, lineHeight: `${lineHeight}px`, fontFamily }}
        >
          <div className="min-w-max py-2">
            {diff.lines.map((line, idx) => {
              const isAdd = line.type === 'add';
              const isDel = line.type === 'delete';
              return (
                <div
                  key={idx}
                  className={`flex items-stretch px-2 ${
                    isAdd
                      ? 'bg-[#e6f4ea] text-[#072711] dark:bg-[#0f5223]/30 dark:text-[#b4f3b7]'
                      : isDel
                      ? 'bg-[#ffebee] text-[#690005] dark:bg-[#690005]/30 dark:text-[#ffb4ab]'
                      : 'text-[#191c20] dark:text-[#c4c6d0] hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <span className="w-10 text-right pr-2 text-[#74777f] dark:text-[#6e7179] select-none shrink-0 border-r border-[#d8dae5]/60 dark:border-[#43474e]/30">
                    {line.oldLineNumber ?? ''}
                  </span>
                  <span className="w-10 text-right pr-2 pl-1 text-[#74777f] dark:text-[#6e7179] select-none shrink-0 border-r border-[#d8dae5]/60 dark:border-[#43474e]/30">
                    {line.newLineNumber ?? ''}
                  </span>
                  <span
                    className={`w-6 text-center select-none shrink-0 font-bold ${
                      isAdd
                        ? 'text-[#0a6640] dark:text-[#80e286]'
                        : isDel
                        ? 'text-[#ba1a1a] dark:text-[#ff8585]'
                        : 'text-[#8e9199]'
                    }`}
                  >
                    {isAdd ? '+' : isDel ? '-' : ' '}
                  </span>
                  <span className="whitespace-pre pr-6 select-text">{line.content || ' '}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          data-testid="diff-side-by-side-view"
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-white dark:bg-[#121316]"
          style={{ fontSize: `${fontSize}px`, lineHeight: `${lineHeight}px`, fontFamily }}
        >
          <div className="w-full min-w-0">
            {/* Sticky Split Column Headers */}
            <div className="sticky top-0 z-10 grid grid-cols-2 bg-[#f0f4f9] dark:bg-[#18191c] border-b border-[#d8dae5] dark:border-[#43474e]/40 text-[11px] font-sans font-semibold text-[#5d6168] dark:text-[#8e9199]">
              <div className="px-2 sm:px-3 py-1 border-r border-[#d8dae5] dark:border-[#43474e]/40 flex items-center justify-between gap-1 min-w-0">
                <span className="truncate">
                  <span className="sm:hidden">Original</span>
                  <span className="hidden sm:inline">Original (Baseline)</span>
                </span>
                {diff.deletions > 0 && (
                  <span className="font-mono text-[#ba1a1a] dark:text-[#ff8585] shrink-0">
                    -{diff.deletions}
                  </span>
                )}
              </div>
              <div className="px-2 sm:px-3 py-1 flex items-center justify-between gap-1 min-w-0">
                <span className="truncate">
                  <span className="sm:hidden">Modified</span>
                  <span className="hidden sm:inline">Modified (Working Tree)</span>
                </span>
                {diff.additions > 0 && (
                  <span className="font-mono text-[#0a6640] dark:text-[#b4f3b7] shrink-0">
                    +{diff.additions}
                  </span>
                )}
              </div>
            </div>

            {/* Aligned Split Rows */}
            <div className="py-1">
              {sideBySideRows.map((row, idx) => {
                const leftDel = row.left?.type === 'delete';
                const rightAdd = row.right?.type === 'add';
                return (
                  <div key={idx} className="grid grid-cols-2 min-w-0">
                    {/* Left Cell */}
                    <div
                      className={`flex items-stretch min-w-0 border-r border-[#d8dae5] dark:border-[#43474e]/40 ${
                        !row.left
                          ? 'bg-[#f0f2f8]/60 dark:bg-[#18191c]/60'
                          : leftDel
                          ? 'bg-[#ffebee] text-[#690005] dark:bg-[#690005]/30 dark:text-[#ffb4ab]'
                          : 'text-[#191c20] dark:text-[#c4c6d0]'
                      }`}
                    >
                      <span className="w-7 sm:w-10 text-right pr-1 sm:pr-2 text-[10px] sm:text-xs text-[#74777f] dark:text-[#6e7179] select-none shrink-0 border-r border-[#d8dae5]/50 dark:border-[#43474e]/25">
                        {row.left?.lineNumber ?? ''}
                      </span>
                      <span className="w-4 sm:w-5 text-center select-none shrink-0 font-bold text-[#ba1a1a] dark:text-[#ff8585]">
                        {leftDel ? '-' : ' '}
                      </span>
                      <span className="whitespace-pre-wrap [overflow-wrap:anywhere] pr-1.5 sm:pr-3 flex-1 min-w-0 select-text">
                        {row.left ? row.left.content || ' ' : ''}
                      </span>
                    </div>

                    {/* Right Cell */}
                    <div
                      className={`flex items-stretch min-w-0 ${
                        !row.right
                          ? 'bg-[#f0f2f8]/60 dark:bg-[#18191c]/60'
                          : rightAdd
                          ? 'bg-[#e6f4ea] text-[#072711] dark:bg-[#0f5223]/30 dark:text-[#b4f3b7]'
                          : 'text-[#191c20] dark:text-[#c4c6d0]'
                      }`}
                    >
                      <span className="w-7 sm:w-10 text-right pr-1 sm:pr-2 text-[10px] sm:text-xs text-[#74777f] dark:text-[#6e7179] select-none shrink-0 border-r border-[#d8dae5]/50 dark:border-[#43474e]/25">
                        {row.right?.lineNumber ?? ''}
                      </span>
                      <span className="w-4 sm:w-5 text-center select-none shrink-0 font-bold text-[#0a6640] dark:text-[#80e286]">
                        {rightAdd ? '+' : ' '}
                      </span>
                      <span className="whitespace-pre-wrap [overflow-wrap:anywhere] pr-1.5 sm:pr-3 flex-1 min-w-0 select-text">
                        {row.right ? row.right.content || ' ' : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
