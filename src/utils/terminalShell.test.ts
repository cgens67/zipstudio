/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  executeShellCommandLine,
  getAutocompleteSuggestions,
  resolveVirtualPath,
  ShellContext,
} from './terminalShell.ts';
import type { VFile } from './fileSystem.ts';

function makeContext(files: Record<string, VFile> = {}): ShellContext {
  return {
    files,
    baseFiles: files,
    cwd: '',
    prevCwd: '',
    env: {},
    activeBranch: 'main',
    branches: [
      { name: 'main', isCurrent: true, isDefault: true, commitSha: 'HEAD' },
      { name: 'dev', isCurrent: false, isDefault: false, commitSha: 'HEAD' },
    ],
    commits: [],
    diffs: [],
    commandHistory: [],
  };
}

function makeFile(path: string, content: string): VFile {
  return {
    path,
    name: path.split('/').pop() || path,
    content,
    isBinary: false,
    size: content.length,
    lastModified: Date.now(),
  };
}

test('resolveVirtualPath handles ., .., ~, /, and /workspace/project', () => {
  assert.equal(resolveVirtualPath('src/utils', '..'), 'src');
  assert.equal(resolveVirtualPath('src/utils', '../..'), '');
  assert.equal(resolveVirtualPath('src/utils', '../../..'), '');
  assert.equal(resolveVirtualPath('src/utils', '~/app.js'), 'app.js');
  assert.equal(resolveVirtualPath('src/utils', '/workspace/project/index.html'), 'index.html');
  assert.equal(resolveVirtualPath('src', './components/Editor.tsx'), 'src/components/Editor.tsx');
});

test('chaining mkdir, echo >, cp, mv, cd, ls, and rm works atomically', async () => {
  const ctx = makeContext({
    'README.md': makeFile('README.md', '# Hello\nWorld\n'),
  });

  const res1 = await executeShellCommandLine(
    'mkdir -p src/app && cd src/app && echo "const a = 1;" > main.js && cp main.js copy.js && ls',
    ctx
  );

  assert.equal(res1.exitCode, 0);
  assert.equal(res1.nextCwd, 'src/app');
  assert.ok(res1.nextFiles['src/app/main.js']);
  assert.ok(res1.nextFiles['src/app/copy.js']);
  assert.equal(res1.nextFiles['src/app/main.js'].content, 'const a = 1;\n');
  assert.ok(res1.outputLines.some((l) => l.includes('copy.js') && l.includes('main.js')));

  const res2 = await executeShellCommandLine(
    'mv copy.js renamed.js && rm main.js && cat renamed.js',
    { ...ctx, files: res1.nextFiles, cwd: res1.nextCwd }
  );
  assert.equal(res2.exitCode, 0);
  assert.equal(res2.nextFiles['src/app/main.js'], undefined);
  assert.ok(res2.nextFiles['src/app/renamed.js']);
  assert.deepEqual(res2.outputLines, ["removed 'main.js'", 'const a = 1;']);
});

test('pipes, grep, sort, uniq, wc, sed, jq, and node evaluation work', async () => {
  const ctx = makeContext({
    'data.txt': makeFile('data.txt', 'banana\napple\nbanana\ncherry\n'),
    'pkg.json': makeFile('pkg.json', '{"name":"zipstudio","version":"2.0.0"}'),
  });

  const pipeRes = await executeShellCommandLine('cat data.txt | sort | uniq -c', ctx);
  assert.equal(pipeRes.exitCode, 0);
  assert.equal(pipeRes.outputLines.length, 3);
  assert.ok(pipeRes.outputLines[1].includes('2 banana'));

  const grepRes = await executeShellCommandLine('grep -n banana data.txt | wc -l', ctx);
  assert.equal(grepRes.exitCode, 0);
  assert.equal(grepRes.outputLines[0].trim(), '2');

  const sedRes = await executeShellCommandLine("sed 's/banana/mango/g' data.txt | grep -c mango", ctx);
  assert.equal(sedRes.exitCode, 0);
  assert.equal(sedRes.outputLines[0].trim(), '2');

  const jqRes = await executeShellCommandLine('jq .name pkg.json', ctx);
  assert.equal(jqRes.exitCode, 0);
  assert.equal(jqRes.outputLines[0], '"zipstudio"');

  const nodeRes = await executeShellCommandLine('node -e "console.log(6 * 7)"', ctx);
  assert.equal(nodeRes.exitCode, 0);
  assert.deepEqual(nodeRes.outputLines, ['42']);
});

test('conditional && / || execution respects exit codes', async () => {
  const ctx = makeContext({});
  const res = await executeShellCommandLine(
    'cat missing.txt && echo NOPE || echo RECOVERED',
    ctx
  );
  assert.equal(res.exitCode, 0);
  assert.ok(res.outputLines.some((l) => l.includes('No such file')));
  assert.ok(!res.outputLines.includes('NOPE'));
  assert.ok(res.outputLines.includes('RECOVERED'));
});

test('Tab autocomplete resolves command names and relative file paths', () => {
  const files = {
    'src/index.ts': makeFile('src/index.ts', ''),
    'src/utils/helper.ts': makeFile('src/utils/helper.ts', ''),
  };

  const cmdAc = getAutocompleteSuggestions('git diff && mkd', '', files);
  assert.equal(cmdAc.completedInput, 'git diff && mkdir ');

  const pathAc = getAutocompleteSuggestions('cat src/ind', '', files);
  assert.equal(pathAc.completedInput, 'cat src/index.ts ');
});
