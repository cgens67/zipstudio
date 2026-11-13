/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDocumentLineMetrics, estimateWrappedRows } from './editorMetrics.ts';

test('estimateWrappedRows computes accurate visual rows for wrapped lines', () => {
  assert.equal(estimateWrappedRows('short line', 40, 2), 1);
  assert.equal(estimateWrappedRows('word1 word2 word3 word4', 12, 2), 2);
  assert.equal(estimateWrappedRows('a'.repeat(25), 10, 2), 3);
  assert.equal(estimateWrappedRows('\t\thello', 10, 4), 2);
});

test('computeDocumentLineMetrics tracks cumulative offsets accurately', () => {
  const doc = ['short', 'this is a medium length line that wraps twice', 'end'].join('\n');
  const metrics = computeDocumentLineMetrics(doc, true, 24, 2);

  assert.equal(metrics.rowsPerLine[0], 1);
  assert.equal(metrics.rowsPerLine[1], 2);
  assert.equal(metrics.rowsPerLine[2], 1);
  assert.deepEqual(metrics.topOffsets, [0, 1, 3]);
  assert.equal(metrics.totalVisualRows, 4);
});
