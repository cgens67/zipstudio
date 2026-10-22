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
  assert.equal(isBinaryExtension('dex'), true);
  assert.equal(isBinaryExtension('so'), true);
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
