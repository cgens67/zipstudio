/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCommitTemplate,
  applyCommitTemplateToMessage,
  extractSuggestedScopes,
  DEFAULT_COMMIT_TEMPLATES,
} from './commitTemplates.ts';
import type { FileDiff, GitCommit } from './gitService.ts';

test('formatCommitTemplate builds conventional commit prefixes with and without scope/action', () => {
  assert.equal(
    formatCommitTemplate({ type: 'fix', scope: 'playback', action: 'update' }),
    'fix(playback): update '
  );
  assert.equal(
    formatCommitTemplate({ type: 'refactor', scope: 'playback' }),
    'refactor(playback): '
  );
  assert.equal(
    formatCommitTemplate({ type: 'feat', action: 'add' }),
    'feat: add '
  );
  assert.equal(
    formatCommitTemplate({ type: 'chore', scope: 'deps', action: 'update', summary: 'bump jszip' }),
    'chore(deps): update bump jszip'
  );
});

test('applyCommitTemplateToMessage inserts into empty messages and swaps headers cleanly', () => {
  assert.equal(
    applyCommitTemplateToMessage('', 'fix(playback): update '),
    'fix(playback): update '
  );

  // Replaces bare template prefix instead of stacking
  assert.equal(
    applyCommitTemplateToMessage('feat(ui): add ', 'fix(playback): update '),
    'fix(playback): update '
  );

  // Preserves custom summary when switching commit type/scope
  assert.equal(
    applyCommitTemplateToMessage('feat(ui): improve miniplayer controls', 'refactor(playback): '),
    'refactor(playback): improve miniplayer controls'
  );

  // Prepends prefix when user already wrote a plain summary
  assert.equal(
    applyCommitTemplateToMessage('buffer underrun on seek', 'fix(playback): update '),
    'fix(playback): update buffer underrun on seek'
  );
});

test('extractSuggestedScopes prioritizes scopes from commit history and modified files', () => {
  const commits: GitCommit[] = [
    {
      id: '1',
      shortId: '1111111',
      message: 'fix(playback): handle audio focus loss',
      author: { name: 'Dev', email: 'd@example.com' },
      timestamp: 1000,
      branch: 'main',
      filesChanged: 1,
    },
    {
      id: '2',
      shortId: '2222222',
      message: 'refactor(playback): extract queue state',
      author: { name: 'Dev', email: 'd@example.com' },
      timestamp: 2000,
      branch: 'main',
      filesChanged: 2,
    },
    {
      id: '3',
      shortId: '3333333',
      message: 'feat(lyrics): add sync offset',
      author: { name: 'Dev', email: 'd@example.com' },
      timestamp: 3000,
      branch: 'main',
      filesChanged: 1,
    },
  ];

  const diffs: FileDiff[] = [
    { path: 'src/player/CrossfadeEngine.kt', status: 'modified', lines: [], additions: 5, deletions: 2 },
  ];

  const scopes = extractSuggestedScopes(diffs, commits);
  assert.equal(scopes[0], 'playback');
  assert.ok(scopes.includes('lyrics'));
  assert.ok(scopes.includes('player'));
  assert.ok(DEFAULT_COMMIT_TEMPLATES.some((t) => t.label.includes('fix(playback): update')));
});
