/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFileDiff } from './gitService.ts';
import { buildSideBySideRows, formatUnifiedDiff } from './diffUtils.ts';

test('buildSideBySideRows pairs deletions and additions side by side with spacer nulls', () => {
  const diff = computeFileDiff(
    'app.js',
    'line1\noldA\noldB\nline4',
    'line1\nnewA\nline4\nextra'
  );

  const rows = buildSideBySideRows(diff.lines);
  assert.equal(rows[0].type, 'normal');
  assert.equal(rows[0].left?.content, 'line1');
  assert.equal(rows[0].right?.content, 'line1');

  const changeRows = rows.filter((r) => r.type === 'change');
  assert.equal(changeRows.length, 3);
  assert.equal(changeRows[0].left?.content, 'oldA');
  assert.equal(changeRows[0].right?.content, 'newA');
  assert.equal(changeRows[1].left?.content, 'oldB');
  assert.equal(changeRows[1].right, null);
  assert.equal(changeRows[2].left, null);
  assert.equal(changeRows[2].right?.content, 'extra');
});

test('formatUnifiedDiff produces unified @@ hunk headers and context lines', () => {
  const orig = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].join('\n');
  const curr = ['a', 'b', 'c', 'D-MODIFIED', 'e', 'f', 'g', 'h', 'i'].join('\n');
  const diff = computeFileDiff('notes.txt', orig, curr);

  const unified = formatUnifiedDiff(diff, { contextLines: 2 });
  assert.ok(unified.includes('diff --git a/notes.txt b/notes.txt'));
  assert.ok(unified.includes('--- a/notes.txt'));
  assert.ok(unified.includes('+++ b/notes.txt'));
  assert.ok(unified.some((line) => line.startsWith('@@ -2,5 +2,5 @@')));
  assert.ok(unified.includes(' b'));
  assert.ok(unified.includes('-d'));
  assert.ok(unified.includes('+D-MODIFIED'));
  assert.ok(unified.includes(' f'));
  assert.ok(!unified.includes(' a'));
});

test('formatUnifiedDiff handles added and deleted files cleanly', () => {
  const added = computeFileDiff('new.ts', null, 'export const a = 1;');
  const addedOut = formatUnifiedDiff(added);
  assert.ok(addedOut.includes('--- /dev/null'));
  assert.ok(addedOut.includes('+++ b/new.ts'));
  assert.ok(addedOut.includes('@@ -0,0 +1,1 @@'));
  assert.ok(addedOut.includes('+export const a = 1;'));

  const deleted = computeFileDiff('old.ts', 'const z = 0;', null);
  const deletedOut = formatUnifiedDiff(deleted);
  assert.ok(deletedOut.includes('--- a/old.ts'));
  assert.ok(deletedOut.includes('+++ /dev/null'));
  assert.ok(deletedOut.includes('@@ -1,1 +0,0 @@'));
  assert.ok(deletedOut.includes('-const z = 0;'));
});
