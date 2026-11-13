/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Estimates visual wrapped row count for a single logical line under
 * CSS `white-space: pre-wrap; overflow-wrap: break-word; word-break: normal`.
 */
export function estimateWrappedRows(
  line: string,
  maxCols: number,
  tabSize = 2
): number {
  if (maxCols <= 0 || line.length === 0) return 1;

  // Expand tabs cleanly to match CSS tab-size metrics
  const expanded = line.includes('\t')
    ? expandTabs(line, tabSize)
    : line;

  if (expanded.length <= maxCols) return 1;

  let rows = 1;
  let col = 0;
  let i = 0;

  while (i < expanded.length) {
    const ch = expanded[i];
    if (ch === ' ') {
      // Spaces can advance col; in pre-wrap trailing spaces usually hang until overflow
      col += 1;
      if (col > maxCols) {
        rows += 1;
        col = 1;
      }
      i += 1;
      continue;
    }

    // Consume a non-space word
    let wordEnd = i + 1;
    while (wordEnd < expanded.length && expanded[wordEnd] !== ' ') {
      wordEnd += 1;
    }
    const wordLen = wordEnd - i;

    if (col > 0 && col + wordLen > maxCols) {
      // Word wraps onto a new visual row before overflow-wrap breaks it
      rows += 1;
      col = 0;
    }

    if (wordLen <= maxCols) {
      col += wordLen;
    } else {
      // Very long continuous token breaks across multiple rows
      const extraRows = Math.floor((col + wordLen - 1) / maxCols);
      rows += extraRows;
      col = (col + wordLen) % maxCols;
      if (col === 0) col = maxCols;
    }

    i = wordEnd;
  }

  return Math.max(1, rows);
}

function expandTabs(line: string, tabSize: number): string {
  let out = '';
  let col = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\t') {
      const spaces = tabSize - (col % tabSize);
      out += ' '.repeat(spaces);
      col += spaces;
    } else {
      out += line[i];
      col += 1;
    }
  }
  return out;
}

export interface LineLayoutMetrics {
  rowsPerLine: number[];
  topOffsets: number[]; // cumulative visual rows before each line (length = lineCount)
  totalVisualRows: number;
}

export function computeDocumentLineMetrics(
  content: string,
  wordWrap: boolean,
  maxCols: number,
  tabSize = 2
): LineLayoutMetrics {
  if (!content) {
    return {
      rowsPerLine: [1],
      topOffsets: [0],
      totalVisualRows: 1,
    };
  }

  const lines = content.split('\n');
  const rowsPerLine = new Array<number>(lines.length);
  const topOffsets = new Array<number>(lines.length);

  let cumulative = 0;
  // Performance guard: for massive files (> 6000 lines), fast-estimate wrapping
  const useSimpleDivision = wordWrap && lines.length > 6000 && maxCols > 0;

  for (let i = 0; i < lines.length; i++) {
    topOffsets[i] = cumulative;
    let rows = 1;
    if (wordWrap && maxCols > 0) {
      rows = useSimpleDivision
        ? Math.max(1, Math.ceil(lines[i].length / maxCols))
        : estimateWrappedRows(lines[i], maxCols, tabSize);
    }
    rowsPerLine[i] = rows;
    cumulative += rows;
  }

  return {
    rowsPerLine,
    topOffsets,
    totalVisualRows: Math.max(1, cumulative),
  };
}
