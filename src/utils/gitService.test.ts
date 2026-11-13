/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFileDiff,
  computeWorkingTreeChanges,
  createCommit,
  GitHubApiClient,
} from './gitService.ts';
import type { VFile } from './gitService.ts';

test('computeFileDiff detects added files', () => {
  const diff = computeFileDiff('index.html', null, '<h1>Hello World</h1>\n<p>Welcome</p>');
  assert.equal(diff.status, 'added');
  assert.equal(diff.additions, 2);
  assert.equal(diff.deletions, 0);
  assert.equal(diff.lines[0].type, 'add');
});

test('computeFileDiff detects deleted files', () => {
  const diff = computeFileDiff('old.js', 'console.log(1);\nconsole.log(2);', null);
  assert.equal(diff.status, 'deleted');
  assert.equal(diff.additions, 0);
  assert.equal(diff.deletions, 2);
  assert.equal(diff.lines[0].type, 'delete');
});

test('computeFileDiff computes line modifications', () => {
  const oldText = 'const a = 1;\nconst b = 2;\nconsole.log(a);';
  const newText = 'const a = 1;\nconst b = 99;\nconsole.log(a);';
  const diff = computeFileDiff('app.js', oldText, newText);

  assert.equal(diff.status, 'modified');
  assert.ok(diff.additions > 0);
  assert.ok(diff.deletions > 0);
});

test('computeWorkingTreeChanges calculates delta across files', () => {
  const baseFiles: Record<string, VFile> = {
    'style.css': {
      path: 'style.css',
      name: 'style.css',
      content: 'body { color: red; }',
      isBinary: false,
      size: 20,
      lastModified: 100,
    },
    'deleted.txt': {
      path: 'deleted.txt',
      name: 'deleted.txt',
      content: 'gone',
      isBinary: false,
      size: 4,
      lastModified: 100,
    },
  };

  const currentFiles: Record<string, VFile> = {
    'style.css': {
      path: 'style.css',
      name: 'style.css',
      content: 'body { color: blue; }',
      isBinary: false,
      size: 21,
      lastModified: 200,
    },
    'newFile.ts': {
      path: 'newFile.ts',
      name: 'newFile.ts',
      content: 'export const x = 10;',
      isBinary: false,
      size: 20,
      lastModified: 200,
    },
  };

  const changes = computeWorkingTreeChanges(baseFiles, currentFiles);
  assert.equal(changes.length, 3); // 1 modified, 1 deleted, 1 added
  const modified = changes.find((c) => c.status === 'modified');
  const added = changes.find((c) => c.status === 'added');
  const deleted = changes.find((c) => c.status === 'deleted');

  assert.ok(modified);
  assert.ok(added);
  assert.ok(deleted);
});

test('createCommit generates valid commit object with shortId', () => {
  const commit = createCommit('Add Material 3 styles', 'main', 'Alice');
  assert.equal(commit.message, 'Add Material 3 styles');
  assert.equal(commit.branch, 'main');
  assert.equal(commit.author.name, 'Alice');
  assert.equal(commit.shortId.length, 7);
  assert.equal(commit.id.length, 40);
});

test('GitHubApiClient.fetchRepoTree aborts remaining batches immediately on AbortSignal', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  const controller = new AbortController();

  // Mock 12 blobs (> 1 batch of 8) so abort after tree or batch 1 stops batch 2
  const tree = Array.from({ length: 12 }, (_, idx) => ({
    path: `file${idx}.txt`,
    type: 'blob',
    sha: `sha-${idx}`,
    mode: '100644',
  }));

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    fetchCount++;
    if (init?.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    const u = String(url);
    if (u.includes('/git/trees/')) {
      return new Response(JSON.stringify({ tree }), { status: 200 });
    }
    // Abort on the 2nd blob request so batch 2 never runs
    if (fetchCount >= 3) {
      controller.abort();
    }
    return new Response(
      JSON.stringify({ encoding: 'base64', content: btoa('hello'), size: 5 }),
      { status: 200 }
    );
  }) as typeof fetch;

  try {
    const client = new GitHubApiClient('test-token');
    await assert.rejects(
      () => client.fetchRepoTree('owner', 'repo', 'main', undefined, controller.signal),
      (err: any) => err?.name === 'AbortError'
    );
    // Should have stopped after batch 1 (1 tree + <= 8 blobs = <= 9 fetches, never all 13)
    assert.ok(fetchCount <= 9, `Expected <= 9 fetches after abort, got ${fetchCount}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
