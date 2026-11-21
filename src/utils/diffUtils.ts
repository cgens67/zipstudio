/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FileDiff, FileDiffLine } from './gitService';

export interface SideBySideCell {
  lineNumber?: number;
  content: string;
  type: 'normal' | 'delete' | 'add';
}

export interface SideBySideRow {
  type: 'normal' | 'change';
  left: SideBySideCell | null;
  right: SideBySideCell | null;
}

/**
 * Pairs unified FileDiffLine entries into aligned rows for a side-by-side diff viewer.
 * Contiguous delete/add blocks are paired row-for-row, padding the shorter side with null spacer cells.
 */
export function buildSideBySideRows(lines: FileDiffLine[]): SideBySideRow[] {
  const rows: SideBySideRow[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.type === 'normal') {
      rows.push({
        type: 'normal',
        left: {
          lineNumber: line.oldLineNumber,
          content: line.content,
          type: 'normal',
        },
        right: {
          lineNumber: line.newLineNumber,
          content: line.content,
          type: 'normal',
        },
      });
      i++;
      continue;
    }

    const deletes: FileDiffLine[] = [];
    const adds: FileDiffLine[] = [];

    while (i < lines.length && lines[i].type !== 'normal') {
      if (lines[i].type === 'delete') {
        deletes.push(lines[i]);
      } else {
        adds.push(lines[i]);
      }
      i++;
    }

    const pairCount = Math.max(deletes.length, adds.length);
    for (let k = 0; k < pairCount; k++) {
      const del = deletes[k];
      const add = adds[k];
      rows.push({
        type: 'change',
        left: del
          ? {
              lineNumber: del.oldLineNumber,
              content: del.content,
              type: 'delete',
            }
          : null,
        right: add
          ? {
              lineNumber: add.newLineNumber,
              content: add.content,
              type: 'add',
            }
          : null,
      });
    }
  }

  return rows;
}

/**
 * Formats a FileDiff into standard unified diff output lines with `@@ -a,b +c,d @@` hunk headers.
 */
export function formatUnifiedDiff(
  diff: FileDiff,
  options: {
    contextLines?: number;
    leftLabel?: string;
    rightLabel?: string;
    gitHeader?: boolean;
  } = {}
): string[] {
  const contextLines = options.contextLines ?? 3;
  const oldLabel =
    options.leftLabel ?? (diff.status === 'added' ? '/dev/null' : `a/${diff.path}`);
  const newLabel =
    options.rightLabel ?? (diff.status === 'deleted' ? '/dev/null' : `b/${diff.path}`);

  const out: string[] = [];
  if (options.gitHeader !== false) {
    out.push(`diff --git a/${diff.path} b/${diff.path}`);
    if (diff.status === 'added') out.push('new file mode 100644');
    else if (diff.status === 'deleted') out.push('deleted file mode 100644');
  }

  if (diff.lines.length === 0) {
    if (diff.additions > 0 || diff.deletions > 0 || diff.status !== 'modified') {
      out.push(`--- ${oldLabel}`, `+++ ${newLabel}`, `Binary files ${oldLabel} and ${newLabel} differ`);
    }
    return out;
  }

  const lines = diff.lines;
  const changedIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].type !== 'normal') {
      changedIndices.push(i);
    }
  }

  if (changedIndices.length === 0) {
    return [];
  }

  out.push(`--- ${oldLabel}`, `+++ ${newLabel}`);

  // Build merged hunk index ranges [start, end]
  const hunks: Array<{ start: number; end: number }> = [];
  for (const idx of changedIndices) {
    const start = Math.max(0, idx - contextLines);
    const end = Math.min(lines.length - 1, idx + contextLines);
    const prev = hunks[hunks.length - 1];
    if (prev && start <= prev.end + 1) {
      prev.end = Math.max(prev.end, end);
    } else {
      hunks.push({ start, end });
    }
  }

  for (const hunk of hunks) {
    let oldCount = 0;
    let newCount = 0;
    let oldStart: number | undefined;
    let newStart: number | undefined;
    const body: string[] = [];

    for (let i = hunk.start; i <= hunk.end; i++) {
      const l = lines[i];
      if (l.type === 'normal') {
        if (oldStart === undefined) oldStart = l.oldLineNumber ?? 1;
        if (newStart === undefined) newStart = l.newLineNumber ?? 1;
        oldCount++;
        newCount++;
        body.push(` ${l.content}`);
      } else if (l.type === 'delete') {
        if (oldStart === undefined) oldStart = l.oldLineNumber ?? 1;
        oldCount++;
        body.push(`-${l.content}`);
      } else {
        if (newStart === undefined) newStart = l.newLineNumber ?? 1;
        newCount++;
        body.push(`+${l.content}`);
      }
    }

    const resolvedOldStart = oldCount === 0 ? 0 : (oldStart ?? 1);
    const resolvedNewStart = newCount === 0 ? 0 : (newStart ?? 1);
    out.push(`@@ -${resolvedOldStart},${oldCount} +${resolvedNewStart},${newCount} @@`);
    out.push(...body);
  }

  return out;
}
