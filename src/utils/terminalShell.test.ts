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

test('grep -rn, find, head, tail, and diff -u handle workspace files cleanly', async () => {
  const ctx = makeContext({
    'src/a.ts': makeFile('src/a.ts', 'const foo = 1;\nconst foobar = 2;\nexport { foo };\n'),
    'src/nested/b.ts': makeFile('src/nested/b.ts', 'import { foo } from "../a";\nconsole.log(foo);\n'),
    'src/nested/c.md': makeFile('src/nested/c.md', '# Docs\nfoo mention\n'),
    'empty.txt': makeFile('empty.txt', ''),
    'v1.txt': makeFile('v1.txt', 'alpha\nbeta\ngamma\ndelta\nepsilon\n'),
    'v2.txt': makeFile('v2.txt', 'alpha\nbeta-edited\ngamma\ndelta\nepsilon\n'),
  });

  const grepRes = await executeShellCommandLine('grep -rnw --include=*.ts foo .', ctx);
  assert.equal(grepRes.exitCode, 0);
  assert.ok(grepRes.outputLines.includes('src/a.ts:1:const foo = 1;'));
  assert.ok(!grepRes.outputLines.some((l) => l.includes('foobar')));
  assert.ok(!grepRes.outputLines.some((l) => l.includes('c.md')));

  const findRes = await executeShellCommandLine('find src -type f -path "*.ts" -maxdepth 2', ctx);
  assert.equal(findRes.exitCode, 0);
  assert.deepEqual(findRes.outputLines, ['src/a.ts', 'src/nested/b.ts']);

  const headEmpty = await executeShellCommandLine('head -n 5 empty.txt', ctx);
  assert.equal(headEmpty.exitCode, 0);
  assert.deepEqual(headEmpty.outputLines, []);

  const headRes = await executeShellCommandLine('head -n2 v1.txt', ctx);
  assert.deepEqual(headRes.outputLines, ['alpha', 'beta']);

  const tailRes = await executeShellCommandLine('tail -n +4 v1.txt', ctx);
  assert.deepEqual(tailRes.outputLines, ['delta', 'epsilon']);

  const diffRes = await executeShellCommandLine('diff -u v1.txt v2.txt', ctx);
  assert.equal(diffRes.exitCode, 1);
  assert.ok(diffRes.outputLines.some((l) => l.startsWith('@@ ')));
  assert.ok(diffRes.outputLines.includes('-beta'));
  assert.ok(diffRes.outputLines.includes('+beta-edited'));
});

test('zip, unzip, and binary base64 round-trip workspace files cleanly', async () => {
  const rawBinaryPayload = btoa('HELLO-ZIP-BINARY');
  const ctx = makeContext({
    'src/hello.txt': makeFile('src/hello.txt', 'hello archive!'),
    'assets/blob.bin': {
      path: 'assets/blob.bin',
      name: 'blob.bin',
      content: `data:application/octet-stream;base64,${rawBinaryPayload}`,
      isBinary: true,
      size: 16,
      lastModified: Date.now(),
    },
  });

  // Binary file base64 encode/decode
  const b64BinRes = await executeShellCommandLine('base64 assets/blob.bin', ctx);
  assert.equal(b64BinRes.exitCode, 0);
  assert.equal(b64BinRes.outputLines[0], rawBinaryPayload);

  const b64DecRes = await executeShellCommandLine('echo "emlw" | base64 -d', ctx);
  assert.equal(b64DecRes.exitCode, 0);
  assert.equal(b64DecRes.outputLines[0], 'zip');

  // zip -> unzip -l -> unzip -d
  const zipRes = await executeShellCommandLine('zip -r out.zip src assets', ctx);
  assert.equal(zipRes.exitCode, 0);
  assert.equal(zipRes.filesChanged, true);
  assert.ok(zipRes.nextFiles['out.zip']);
  assert.ok(zipRes.nextFiles['out.zip'].content.startsWith('data:application/zip;base64,'));

  const ctxWithZip = { ...ctx, files: zipRes.nextFiles };
  const listRes = await executeShellCommandLine('unzip -l out.zip', ctxWithZip);
  assert.equal(listRes.exitCode, 0);
  assert.ok(listRes.outputLines.some((l) => l.includes('src/hello.txt')));
  assert.ok(listRes.outputLines.some((l) => l.includes('assets/blob.bin')));

  const extractRes = await executeShellCommandLine('unzip out.zip -d restored', ctxWithZip);
  assert.equal(extractRes.exitCode, 0);
  assert.equal(extractRes.filesChanged, true);
  assert.equal(extractRes.nextFiles['restored/src/hello.txt']?.content, 'hello archive!');
});

test('git branch, checkout file, diff <file>, and git stash push/list/pop work atomically', async () => {
  const baseFiles: Record<string, VFile> = {
    'app.js': makeFile('app.js', 'const v = 1;\nconsole.log(v);\n'),
  };
  const modifiedFiles: Record<string, VFile> = {
    'app.js': makeFile('app.js', 'const v = 2;\nconsole.log(v);\n'),
    'added.txt': makeFile('added.txt', 'new line\n'),
  };

  let createdBranch = '';
  let deletedBranch = '';
  let switchedBranch = '';

  const ctx: ShellContext = {
    ...makeContext(modifiedFiles),
    baseFiles,
    commits: [
      {
        id: '1234567890abcdef1234567890abcdef12345678',
        shortId: '1234567',
        message: 'Initial commit',
        author: { name: 'Dev', email: 'dev@example.com' },
        timestamp: Date.now(),
        branch: 'main',
        filesChanged: 1,
      },
    ],
    onCreateBranch: async (b) => {
      createdBranch = b;
    },
    onDeleteBranch: async (b) => {
      deletedBranch = b;
    },
    onSwitchBranch: async (b) => {
      switchedBranch = b;
    },
  };

  // git diff <file> shows unified @@ hunks
  const gdiff = await executeShellCommandLine('git diff app.js', ctx);
  assert.equal(gdiff.exitCode, 0);
  assert.ok(gdiff.outputLines.some((l) => l.startsWith('@@ ')));
  assert.ok(gdiff.outputLines.includes('-const v = 1;'));
  assert.ok(gdiff.outputLines.includes('+const v = 2;'));

  // git branch -d must NOT call onCreateBranch
  const gdel = await executeShellCommandLine('git branch -d dev', ctx);
  assert.equal(gdel.exitCode, 0);
  assert.equal(deletedBranch, 'dev');
  assert.equal(createdBranch, '');

  // git branch -d main fails cleanly
  const gdelActive = await executeShellCommandLine('git branch -d main', ctx);
  assert.equal(gdelActive.exitCode, 1);

  // git checkout branch
  const gcoBranch = await executeShellCommandLine('git checkout dev', ctx);
  assert.equal(gcoBranch.exitCode, 0);
  assert.equal(switchedBranch, 'dev');

  // git stash push -> restores baseline
  const stashPush = await executeShellCommandLine('git stash push -m "wip save"', ctx);
  assert.equal(stashPush.exitCode, 0);
  assert.equal(stashPush.stashesChanged, true);
  assert.equal(stashPush.nextStashes.length, 1);
  assert.equal(stashPush.nextFiles['app.js'].content, baseFiles['app.js'].content);
  assert.equal(stashPush.nextFiles['added.txt'], undefined);

  const ctxStashed: ShellContext = {
    ...ctx,
    files: stashPush.nextFiles,
    stashes: stashPush.nextStashes,
  };
  const stashList = await executeShellCommandLine('git stash list', ctxStashed);
  assert.ok(stashList.outputLines[0].includes('stash@{0}: On main: wip save'));

  // git stash pop -> reapplies modified and added files and drops stash
  const stashPop = await executeShellCommandLine('git stash pop', ctxStashed);
  assert.equal(stashPop.exitCode, 0);
  assert.equal(stashPop.nextStashes.length, 0);
  assert.equal(stashPop.nextFiles['app.js'].content, modifiedFiles['app.js'].content);
  assert.equal(stashPop.nextFiles['added.txt'].content, 'new line\n');

  // git checkout -- app.js reverts only app.js to baseline
  const revertFile = await executeShellCommandLine('git checkout -- app.js', {
    ...ctx,
    files: stashPop.nextFiles,
  });
  assert.equal(revertFile.exitCode, 0);
  assert.equal(revertFile.nextFiles['app.js'].content, baseFiles['app.js'].content);
  assert.equal(revertFile.nextFiles['added.txt'].content, 'new line\n');

  // history -c requests clearCommandHistoryRequested
  const histClear = await executeShellCommandLine('history -c', ctx);
  assert.equal(histClear.exitCode, 0);
  assert.equal(histClear.clearCommandHistoryRequested, true);
});

test('chained git branch, checkout -b, switch, and branch -d preserve synchronous branch state across &&', async () => {
  const ctx = makeContext({ 'app.js': makeFile('app.js', 'const a = 1;\n') });

  const res1 = await executeShellCommandLine('git branch feature-x && git checkout feature-x && git rev-parse --abbrev-ref HEAD', ctx);
  assert.equal(res1.exitCode, 0);
  assert.ok(res1.outputLines.includes("Created branch 'feature-x'"));
  assert.ok(res1.outputLines.includes("Switched to branch 'feature-x'"));
  assert.equal(res1.outputLines[res1.outputLines.length - 1], 'feature-x');

  const res2 = await executeShellCommandLine(
    'git checkout -b feature-y && git checkout main && git branch -d feature-y && git branch',
    ctx
  );
  assert.equal(res2.exitCode, 0);
  assert.ok(res2.outputLines.includes("Switched to a new branch 'feature-y'"));
  assert.ok(res2.outputLines.includes("Switched to branch 'main'"));
  assert.ok(res2.outputLines.includes('Deleted branch feature-y.'));
  assert.ok(!res2.outputLines.some((l) => l.includes('feature-y') && l.startsWith('  ')));
});

