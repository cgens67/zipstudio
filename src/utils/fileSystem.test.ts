/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePath,
  getParentPath,
  getFileName,
  getFileExtension,
  getLanguageFromExt,
  isBinaryExtension,
  buildFileTree,
  filterFileTree,
  hasMatchingDescendant,
  nodeMatchesSearch,
} from './fileSystem.ts';
import type { VFile } from './fileSystem.ts';

test('normalizePath standardizes slashes and removes leading slashes', () => {
  assert.equal(normalizePath('/src/components/App.tsx'), 'src/components/App.tsx');
  assert.equal(normalizePath('\\public\\assets\\logo.png'), 'public/assets/logo.png');
  assert.equal(normalizePath('index.html'), 'index.html');
});

test('getParentPath identifies parent directory path', () => {
  assert.equal(getParentPath('src/components/Button.tsx'), 'src/components');
  assert.equal(getParentPath('src/App.tsx'), 'src');
  assert.equal(getParentPath('index.html'), '');
});

test('getFileName and getFileExtension extract names correctly', () => {
  assert.equal(getFileName('src/styles/theme.css'), 'theme.css');
  assert.equal(getFileExtension('src/styles/theme.css'), 'css');
  assert.equal(getFileExtension('archive.tar.gz'), 'gz');
  assert.equal(getFileExtension('Dockerfile'), '');
});

test('getLanguageFromExt maps extensions to languages', () => {
  assert.equal(getLanguageFromExt('tsx'), 'tsx');
  assert.equal(getLanguageFromExt('js'), 'javascript');
  assert.equal(getLanguageFromExt('css'), 'css');
  assert.equal(getLanguageFromExt('html'), 'html');
  assert.equal(getLanguageFromExt('json'), 'json');
  assert.equal(getLanguageFromExt('unknown'), 'plaintext');
});

test('isBinaryExtension identifies assets', () => {
  assert.equal(isBinaryExtension('png'), true);
  assert.equal(isBinaryExtension('mp3'), true);
  assert.equal(isBinaryExtension('woff2'), true);
  assert.equal(isBinaryExtension('apk'), true);
  assert.equal(isBinaryExtension('aab'), true);
  assert.equal(isBinaryExtension('aar'), true);
  assert.equal(isBinaryExtension('dex'), true);
  assert.equal(isBinaryExtension('so'), true);
  assert.equal(isBinaryExtension('keystore'), true);
  assert.equal(isBinaryExtension('ts'), false);
  assert.equal(isBinaryExtension('html'), false);
});

test('buildFileTree creates nested hierarchy from flat list', () => {
  const files: Record<string, VFile> = {
    'index.html': {
      path: 'index.html',
      name: 'index.html',
      content: '<h1>Hello</h1>',
      isBinary: false,
      size: 14,
      lastModified: 1000,
    },
    'src/main.js': {
      path: 'src/main.js',
      name: 'main.js',
      content: 'console.log(1)',
      isBinary: false,
      size: 14,
      lastModified: 1000,
    },
    'src/components/Card.js': {
      path: 'src/components/Card.js',
      name: 'Card.js',
      content: 'export default () => {}',
      isBinary: false,
      size: 24,
      lastModified: 1000,
    },
  };

  const tree = buildFileTree(files);
  assert.equal(tree.length, 2); // 'src' folder and 'index.html' file
  const srcNode = tree.find((n) => n.name === 'src');
  assert.ok(srcNode);
  assert.equal(srcNode.isFolder, true);
  assert.equal(srcNode.children?.length, 2); // components folder and main.js
});

test('filterFileTree finds deeply nested files across multiple folder levels', () => {
  const files: Record<string, VFile> = {
    'README.md': {
      path: 'README.md',
      name: 'README.md',
      content: '# App',
      isBinary: false,
      size: 5,
      lastModified: 1000,
    },
    'app/src/main/java/com/example/playback/PlayerService.kt': {
      path: 'app/src/main/java/com/example/playback/PlayerService.kt',
      name: 'PlayerService.kt',
      content: 'class PlayerService {}',
      isBinary: false,
      size: 22,
      lastModified: 1000,
    },
    'app/src/main/java/com/example/playback/QueueManager.kt': {
      path: 'app/src/main/java/com/example/playback/QueueManager.kt',
      name: 'QueueManager.kt',
      content: 'class QueueManager {}',
      isBinary: false,
      size: 21,
      lastModified: 1000,
    },
    'app/src/main/java/com/example/ui/HomeScreen.kt': {
      path: 'app/src/main/java/com/example/ui/HomeScreen.kt',
      name: 'HomeScreen.kt',
      content: 'fun HomeScreen() {}',
      isBinary: false,
      size: 19,
      lastModified: 1000,
    },
  };

  const tree = buildFileTree(files);

  // Search for a deeply nested file by filename
  const byFile = filterFileTree(tree, 'playerservice');
  assert.equal(byFile.length, 1);
  assert.equal(byFile[0].name, 'app');
  assert.equal(hasMatchingDescendant(byFile[0], 'playerservice'), true);

  // Navigate down filtered tree to verify only PlayerService branch remains
  const playbackNode =
    byFile[0].children?.[0]?.children?.[0]?.children?.[0]?.children?.[0]?.children?.[0]?.children?.[0];
  assert.equal(playbackNode?.name, 'playback');
  assert.equal(playbackNode?.children?.length, 1);
  assert.equal(playbackNode?.children?.[0].name, 'PlayerService.kt');

  // Search by extension across nested folders
  const byExt = filterFileTree(tree, '.kt');
  assert.equal(byExt.length, 1);
  const comNode = byExt[0].children?.[0]?.children?.[0]?.children?.[0]?.children?.[0];
  assert.equal(comNode?.name, 'com');
  const exampleNode = comNode?.children?.[0];
  assert.equal(exampleNode?.children?.length, 2); // playback + ui

  // Search by path fragment
  const byPath = filterFileTree(tree, 'playback/Queue');
  assert.equal(byPath.length, 1);
  assert.equal(nodeMatchesSearch(byPath[0], 'playback/Queue'), false);
  assert.equal(hasMatchingDescendant(byPath[0], 'playback/Queue'), true);

  // Non-matching search returns empty array
  assert.deepEqual(filterFileTree(tree, 'nonexistent_xyz'), []);
});
