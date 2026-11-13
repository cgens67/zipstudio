/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  VFile,
  formatBytes,
  getFileName,
} from './fileSystem';
import {
  FileDiff,
  GitBranch,
  GitCommit,
  GitHubRepo,
  computeFileDiff,
} from './gitService';

export const WORKSPACE_ROOT_DISPLAY = '/workspace/project';

export interface ShellContext {
  files: Record<string, VFile>;
  baseFiles: Record<string, VFile>;
  cwd: string; // "" means root of workspace; "src/components" means subfolder
  prevCwd: string;
  env: Record<string, string>;
  activeBranch: string;
  branches: GitBranch[];
  commits: GitCommit[];
  diffs: FileDiff[];
  selectedRepo?: GitHubRepo | null;
  softResetTarget?: GitCommit | null;
  commandHistory: string[];
  gitUser?: { name?: string; login?: string } | null;
  onOpenFile?: (path: string) => void;
  onSwitchBranch?: (branch: string) => Promise<void>;
  onCreateBranch?: (branch: string) => Promise<void>;
  onGitReset?: (mode: 'soft' | 'mixed' | 'hard', count: number, forcePushRemote: boolean) => Promise<void>;
  onCommit?: (message: string) => Promise<void>;
  onCleanBuild?: () => void;
}

export interface ShellExecutionResult {
  outputLines: string[];
  nextCwd: string;
  nextPrevCwd: string;
  nextEnv: Record<string, string>;
  nextFiles: Record<string, VFile>;
  filesChanged: boolean;
  deletedPaths: string[];
  openedFile?: string;
  clearRequested: boolean;
  exitCode: number;
}

interface RawToken {
  text: string;
  quoted: boolean;
  op?: ';' | '&&' | '||' | '|' | '>' | '>>' | '<';
}

interface CommandInvocation {
  tokens: Array<{ text: string; quoted: boolean }>;
  stdinFile?: string;
  stdoutFile?: string;
  stdoutAppend?: boolean;
}

interface PipelineSegment {
  condition: 'always' | 'and' | 'or';
  commands: CommandInvocation[];
}

export const KNOWN_COMMANDS = [
  'ls', 'cd', 'pwd', 'tree', 'cat', 'head', 'tail', 'grep', 'find', 'wc',
  'sort', 'uniq', 'cut', 'tr', 'sed', 'diff', 'stat', 'du', 'mkdir', 'touch',
  'cp', 'mv', 'rm', 'rmdir', 'echo', 'printf', 'env', 'export', 'printenv', 'unset',
  'which', 'type', 'whoami', 'id', 'uname', 'date', 'history', 'base64', 'jq', 'json',
  'node', 'open', 'code', 'git', 'npm', './gradlew', 'gradlew', 'build', 'clear',
  'help', 'true', 'false',
];

/**
 * Displays the current working directory nicely for prompts / pwd.
 */
export function formatDisplayCwd(cwd: string): string {
  return cwd ? `${WORKSPACE_ROOT_DISPLAY}/${cwd}` : WORKSPACE_ROOT_DISPLAY;
}

export function formatPromptCwd(cwd: string): string {
  return cwd ? `~/${cwd}` : '~';
}

/**
 * Resolves any user path (relative, ., .., ~, /, /workspace/project/...) into a normalized virtual workspace path ("" = root).
 */
export function resolveVirtualPath(cwd: string, rawPath: string): string {
  if (!rawPath || rawPath === '~') return '';

  let cleaned = rawPath.replace(/\\/g, '/').trim();
  let startFromRoot = false;

  if (cleaned === WORKSPACE_ROOT_DISPLAY || cleaned.startsWith(`${WORKSPACE_ROOT_DISPLAY}/`)) {
    cleaned = cleaned.slice(WORKSPACE_ROOT_DISPLAY.length).replace(/^\/+/, '');
    startFromRoot = true;
  } else if (cleaned.startsWith('~/')) {
    cleaned = cleaned.slice(2);
    startFromRoot = true;
  } else if (cleaned.startsWith('/')) {
    cleaned = cleaned.replace(/^\/+/, '');
    startFromRoot = true;
  }

  const baseSegments = startFromRoot || !cwd ? [] : cwd.split('/').filter(Boolean);
  const inputSegments = cleaned.split('/').filter(Boolean);

  for (const seg of inputSegments) {
    if (seg === '.') continue;
    if (seg === '..') {
      baseSegments.pop();
    } else {
      baseSegments.push(seg);
    }
  }

  return baseSegments.join('/');
}

/**
 * Checks whether a virtual directory exists ("" always exists; any dir with at least one descendant file exists).
 */
export function virtualDirExists(files: Record<string, VFile>, dirPath: string): boolean {
  if (dirPath === '') return true;
  const prefix = `${dirPath}/`;
  return Object.keys(files).some((k) => k.startsWith(prefix));
}

/**
 * Returns direct child directory names and file entries inside dirPath (or all files/dirs matching path).
 */
export function listDirectChildren(
  files: Record<string, VFile>,
  dirPath: string,
  includeHidden = false
): Array<{ name: string; fullPath: string; isDir: boolean; file?: VFile }> {
  const prefix = dirPath ? `${dirPath}/` : '';
  const dirsSeen = new Set<string>();
  const entries: Array<{ name: string; fullPath: string; isDir: boolean; file?: VFile }> = [];

  for (const [path, file] of Object.entries(files)) {
    if (!path.startsWith(prefix)) continue;
    const rest = path.slice(prefix.length);
    if (!rest) continue;

    const slashIdx = rest.indexOf('/');
    if (slashIdx === -1) {
      if (!includeHidden && rest.startsWith('.')) continue;
      entries.push({ name: rest, fullPath: path, isDir: false, file });
    } else {
      const folderName = rest.slice(0, slashIdx);
      if (!includeHidden && folderName.startsWith('.')) continue;
      if (!dirsSeen.has(folderName)) {
        dirsSeen.add(folderName);
        entries.push({
          name: folderName,
          fullPath: prefix ? `${prefix}${folderName}` : folderName,
          isDir: true,
        });
      }
    }
  }

  entries.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  return entries;
}

function globToRegex(glob: string, caseInsensitive = false): RegExp {
  let pattern = '^';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        pattern += '.*';
        i++;
      } else {
        pattern += '[^/]*';
      }
    } else if (c === '?') {
      pattern += '[^/]';
    } else if ('\\^$.|+()[]{}'.includes(c)) {
      pattern += '\\' + c;
    } else {
      pattern += c;
    }
  }
  pattern += '$';
  return new RegExp(pattern, caseInsensitive ? 'i' : '');
}

/**
 * Expands unquoted glob patterns (e.g. `*.js` or `src/*.ts`) against files and folders.
 */
function expandGlobToken(
  token: string,
  cwd: string,
  files: Record<string, VFile>
): string[] {
  if (!token.includes('*') && !token.includes('?')) {
    return [token];
  }

  const candidateDirs = new Set<string>();
  for (const path of Object.keys(files)) {
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      candidateDirs.add(parts.slice(0, i).join('/'));
    }
  }

  const allPaths = [...Object.keys(files), ...Array.from(candidateDirs)];
  const resolvedGlob = resolveVirtualPath(cwd, token);
  const regex = globToRegex(resolvedGlob);

  const matches = allPaths.filter((p) => regex.test(p)).sort();
  return matches.length > 0 ? matches : [token];
}

function expandEnvVars(text: string, env: Record<string, string>): string {
  return text.replace(/\$(?:\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))/g, (_, p1, p2) => {
    const key = p1 || p2;
    return env[key] !== undefined ? env[key] : '';
  });
}

/**
 * Tokenizes a shell command line into words and shell operators.
 */
function tokenizeShellLine(line: string, env: Record<string, string>): RawToken[] {
  const tokens: RawToken[] = [];
  let i = 0;
  const n = line.length;

  while (i < n) {
    // Skip whitespace
    while (i < n && /\s/.test(line[i])) i++;
    if (i >= n) break;

    // Comment
    if (line[i] === '#' && tokens.length === 0) break;

    // Ignore 2>&1 noise cleanly
    if (line.slice(i, i + 4) === '2>&1') {
      i += 4;
      continue;
    }

    // Check operators
    const twoChar = line.slice(i, i + 2);
    if (twoChar === '&&' || twoChar === '||' || twoChar === '>>') {
      tokens.push({ text: twoChar, quoted: false, op: twoChar });
      i += 2;
      continue;
    }
    const oneChar = line[i];
    if (oneChar === ';' || oneChar === '|' || oneChar === '>' || oneChar === '<') {
      tokens.push({ text: oneChar, quoted: false, op: oneChar });
      i += 1;
      continue;
    }

    // Read word token (may combine adjacent quoted/unquoted parts)
    let word = '';
    let wasQuoted = false;

    while (i < n && !/\s/.test(line[i]) && ![';', '|', '&', '>', '<'].includes(line[i])) {
      const ch = line[i];
      if (ch === "'") {
        wasQuoted = true;
        i++;
        while (i < n && line[i] !== "'") {
          word += line[i++];
        }
        if (i < n && line[i] === "'") i++;
      } else if (ch === '"') {
        wasQuoted = true;
        i++;
        let inner = '';
        while (i < n && line[i] !== '"') {
          if (line[i] === '\\' && i + 1 < n) {
            const next = line[i + 1];
            if (next === '"' || next === '\\' || next === '$') {
              inner += next;
              i += 2;
              continue;
            }
          }
          inner += line[i++];
        }
        if (i < n && line[i] === '"') i++;
        word += expandEnvVars(inner, env);
      } else if (ch === '\\' && i + 1 < n) {
        word += line[i + 1];
        i += 2;
      } else {
        // Handle single & without matching && cleanly inside words
        let rawChunk = '';
        while (
          i < n &&
          !/\s/.test(line[i]) &&
          ![';', '|', '>', '<', "'", '"', '\\'].includes(line[i])
        ) {
          if (line.slice(i, i + 2) === '&&') break;
          rawChunk += line[i++];
        }
        word += expandEnvVars(rawChunk, env);
      }
    }

    if (word.length > 0 || wasQuoted) {
      tokens.push({ text: word, quoted: wasQuoted });
    }
  }

  return tokens;
}

function parsePipelineSegments(rawTokens: RawToken[]): PipelineSegment[] {
  const segments: PipelineSegment[] = [];
  let currentCondition: 'always' | 'and' | 'or' = 'always';
  let currentCommands: CommandInvocation[] = [];
  let currentCmd: CommandInvocation = { tokens: [] };

  const flushCmd = () => {
    if (currentCmd.tokens.length > 0 || currentCmd.stdoutFile || currentCmd.stdinFile) {
      currentCommands.push(currentCmd);
    }
    currentCmd = { tokens: [] };
  };

  const flushSegment = (nextCond: 'always' | 'and' | 'or') => {
    flushCmd();
    if (currentCommands.length > 0) {
      segments.push({ condition: currentCondition, commands: currentCommands });
    }
    currentCommands = [];
    currentCondition = nextCond;
  };

  for (let i = 0; i < rawTokens.length; i++) {
    const tok = rawTokens[i];
    if (tok.op === ';') {
      flushSegment('always');
    } else if (tok.op === '&&') {
      flushSegment('and');
    } else if (tok.op === '||') {
      flushSegment('or');
    } else if (tok.op === '|') {
      flushCmd();
    } else if (tok.op === '>' || tok.op === '>>') {
      const target = rawTokens[i + 1];
      if (target && !target.op) {
        currentCmd.stdoutFile = target.text;
        currentCmd.stdoutAppend = tok.op === '>>';
        i++;
      }
    } else if (tok.op === '<') {
      const target = rawTokens[i + 1];
      if (target && !target.op) {
        currentCmd.stdinFile = target.text;
        i++;
      }
    } else {
      currentCmd.tokens.push({ text: tok.text, quoted: tok.quoted });
    }
  }

  flushSegment('always');
  return segments;
}

function makeTextFile(path: string, content: string): VFile {
  return {
    path,
    name: getFileName(path),
    content,
    isBinary: false,
    size: content.length,
    lastModified: Date.now(),
    mode: path.endsWith('.sh') || path.endsWith('gradlew') ? '100755' : '100644',
  };
}

function getAllDirectories(files: Record<string, VFile>): string[] {
  const dirs = new Set<string>();
  for (const path of Object.keys(files)) {
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join('/'));
    }
  }
  return Array.from(dirs).sort();
}

function unescapeEchoString(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\\\/g, '\\');
}

function formatPrintf(fmt: string, args: string[]): string {
  let argIdx = 0;
  const unescaped = unescapeEchoString(fmt);
  return unescaped.replace(/%([sdif%])/g, (_, spec) => {
    if (spec === '%') return '%';
    const raw = args[argIdx++] ?? '';
    if (spec === 'd' || spec === 'i') {
      const num = parseInt(raw, 10);
      return Number.isNaN(num) ? '0' : String(num);
    }
    if (spec === 'f') {
      const num = parseFloat(raw);
      return Number.isNaN(num) ? '0.000000' : num.toFixed(6);
    }
    return raw;
  });
}

function renderTree(
  files: Record<string, VFile>,
  rootDir: string,
  maxDepth: number
): string[] {
  const lines: string[] = [rootDir ? rootDir : '.'];
  let fileCount = 0;
  let dirCount = 0;

  const walk = (dir: string, prefix: string, depth: number) => {
    if (depth > maxDepth) return;
    const entries = listDirectChildren(files, dir, false);
    entries.forEach((entry, idx) => {
      const isLast = idx === entries.length - 1;
      const branch = isLast ? '└── ' : '├── ';
      lines.push(`${prefix}${branch}${entry.name}${entry.isDir ? '/' : ''}`);
      if (entry.isDir) {
        dirCount++;
        walk(entry.fullPath, prefix + (isLast ? '    ' : '│   '), depth + 1);
      } else {
        fileCount++;
      }
    });
  };

  walk(rootDir, '', 1);
  lines.push('', `${dirCount} directories, ${fileCount} files`);
  return lines;
}

/**
 * Executes a full multi-statement / piped / redirected shell command line against a workspace snapshot.
 */
export async function executeShellCommandLine(
  rawLine: string,
  context: ShellContext
): Promise<ShellExecutionResult> {
  const workingFiles: Record<string, VFile> = { ...context.files };
  let cwd = context.cwd;
  let prevCwd = context.prevCwd;
  const env: Record<string, string> = {
    HOME: WORKSPACE_ROOT_DISPLAY,
    USER: context.gitUser?.login || 'developer',
    SHELL: '/bin/bash',
    BRANCH: context.activeBranch,
    ...context.env,
    PWD: formatDisplayCwd(cwd),
  };

  let filesChanged = false;
  const deletedPaths: string[] = [];
  let openedFile: string | undefined;
  let clearRequested = false;
  const outputLines: string[] = [];

  const tokens = tokenizeShellLine(rawLine, env);
  const segments = parsePipelineSegments(tokens);

  let lastExitCode = 0;

  for (const segment of segments) {
    if (segment.condition === 'and' && lastExitCode !== 0) continue;
    if (segment.condition === 'or' && lastExitCode === 0) continue;

    let pipeData: string | null = null;

    for (let cmdIdx = 0; cmdIdx < segment.commands.length; cmdIdx++) {
      const inv = segment.commands[cmdIdx];
      if (inv.tokens.length === 0) continue;

      const cmdName = inv.tokens[0].text;
      // Expand unquoted wildcards for args
      const expandedArgs: string[] = [];
      for (let t = 1; t < inv.tokens.length; t++) {
        const argTok = inv.tokens[t];
        if (!argTok.quoted && (argTok.text.includes('*') || argTok.text.includes('?'))) {
          expandedArgs.push(...expandGlobToken(argTok.text, cwd, workingFiles));
        } else {
          expandedArgs.push(argTok.text);
        }
      }

      // Handle `< inputFile` if no pipe data
      if (pipeData === null && inv.stdinFile) {
        const stdinPath = resolveVirtualPath(cwd, inv.stdinFile);
        const f = workingFiles[stdinPath];
        if (!f) {
          outputLines.push(`bash: ${inv.stdinFile}: No such file or directory`);
          lastExitCode = 1;
          break;
        }
        pipeData = f.isBinary ? '' : f.content;
      }

      const res = await runSingleCommand(cmdName, expandedArgs, pipeData, {
        workingFiles,
        baseFiles: context.baseFiles,
        cwd,
        prevCwd,
        env,
        activeBranch: context.activeBranch,
        branches: context.branches,
        commits: context.commits,
        diffs: context.diffs,
        selectedRepo: context.selectedRepo,
        softResetTarget: context.softResetTarget,
        commandHistory: context.commandHistory,
        gitUser: context.gitUser,
        onOpenFile: context.onOpenFile,
        onSwitchBranch: context.onSwitchBranch,
        onCreateBranch: context.onCreateBranch,
        onGitReset: context.onGitReset,
        onCommit: context.onCommit,
        onCleanBuild: context.onCleanBuild,
      });

      cwd = res.nextCwd;
      prevCwd = res.nextPrevCwd;
      env.PWD = formatDisplayCwd(cwd);

      if (res.filesChanged) filesChanged = true;
      if (res.deletedPaths.length > 0) deletedPaths.push(...res.deletedPaths);
      if (res.openedFile) openedFile = res.openedFile;
      if (res.clearRequested) {
        clearRequested = true;
        outputLines.length = 0;
      }

      lastExitCode = res.exitCode;
      const hasNextPipe = cmdIdx < segment.commands.length - 1;

      if (inv.stdoutFile) {
        const outPath = resolveVirtualPath(cwd, inv.stdoutFile);
        if (!outPath) {
          outputLines.push(`bash: ${inv.stdoutFile}: Invalid file path`);
          lastExitCode = 1;
        } else {
          const textToWrite = res.stdout.endsWith('\n') || res.stdout === ''
            ? res.stdout
            : `${res.stdout}\n`;
          const existing = workingFiles[outPath];
          const finalContent =
            inv.stdoutAppend && existing && !existing.isBinary
              ? existing.content + textToWrite
              : textToWrite;
          workingFiles[outPath] = makeTextFile(outPath, finalContent);
          filesChanged = true;
        }
        pipeData = '';
      } else if (hasNextPipe) {
        pipeData = res.stdout;
      } else {
        if (res.stdout) {
          outputLines.push(...res.stdout.replace(/\n$/, '').split('\n'));
        }
        pipeData = null;
      }

      if (res.stderr) {
        outputLines.push(...res.stderr.replace(/\n$/, '').split('\n'));
      }
    }
  }

  return {
    outputLines,
    nextCwd: cwd,
    nextPrevCwd: prevCwd,
    nextEnv: env,
    nextFiles: workingFiles,
    filesChanged,
    deletedPaths,
    openedFile,
    clearRequested,
    exitCode: lastExitCode,
  };
}

interface SingleCmdRuntime {
  workingFiles: Record<string, VFile>;
  baseFiles: Record<string, VFile>;
  cwd: string;
  prevCwd: string;
  env: Record<string, string>;
  activeBranch: string;
  branches: GitBranch[];
  commits: GitCommit[];
  diffs: FileDiff[];
  selectedRepo?: GitHubRepo | null;
  softResetTarget?: GitCommit | null;
  commandHistory: string[];
  gitUser?: { name?: string; login?: string } | null;
  onOpenFile?: (path: string) => void;
  onSwitchBranch?: (branch: string) => Promise<void>;
  onCreateBranch?: (branch: string) => Promise<void>;
  onGitReset?: (mode: 'soft' | 'mixed' | 'hard', count: number, forcePushRemote: boolean) => Promise<void>;
  onCommit?: (message: string) => Promise<void>;
  onCleanBuild?: () => void;
}

interface SingleCmdResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  nextCwd: string;
  nextPrevCwd: string;
  filesChanged: boolean;
  deletedPaths: string[];
  openedFile?: string;
  clearRequested: boolean;
}

async function runSingleCommand(
  cmdRaw: string,
  args: string[],
  stdin: string | null,
  rt: SingleCmdRuntime
): Promise<SingleCmdResult> {
  const { workingFiles } = rt;
  let nextCwd = rt.cwd;
  let nextPrevCwd = rt.prevCwd;
  let filesChanged = false;
  const deletedPaths: string[] = [];
  let openedFile: string | undefined;
  let clearRequested = false;

  const ok = (stdout = '', stderr = ''): SingleCmdResult => ({
    stdout,
    stderr,
    exitCode: 0,
    nextCwd,
    nextPrevCwd,
    filesChanged,
    deletedPaths,
    openedFile,
    clearRequested,
  });

  const fail = (stderr: string, code = 1, stdout = ''): SingleCmdResult => ({
    stdout,
    stderr,
    exitCode: code,
    nextCwd,
    nextPrevCwd,
    filesChanged,
    deletedPaths,
    openedFile,
    clearRequested,
  });

  // Handle inline VAR=val assignment
  if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(cmdRaw) && args.length === 0) {
    const eqIdx = cmdRaw.indexOf('=');
    const key = cmdRaw.slice(0, eqIdx);
    const val = cmdRaw.slice(eqIdx + 1);
    rt.env[key] = val;
    return ok('');
  }

  const cmd = cmdRaw.toLowerCase();

  // Helper to read text contents from files or stdin
  const readTextSources = (fileArgs: string[], commandLabel: string): { texts: Array<{ label: string; content: string }>; err?: string } => {
    const cleanArgs = fileArgs.filter((a) => a !== '-');
    if (cleanArgs.length === 0) {
      if (stdin !== null) {
        return { texts: [{ label: '(stdin)', content: stdin }] };
      }
      return { texts: [], err: `${commandLabel}: missing file operand` };
    }
    const texts: Array<{ label: string; content: string }> = [];
    const errors: string[] = [];
    for (const arg of cleanArgs) {
      const p = resolveVirtualPath(rt.cwd, arg);
      const file = workingFiles[p];
      if (!file) {
        if (virtualDirExists(workingFiles, p)) {
          errors.push(`${commandLabel}: ${arg}: Is a directory`);
        } else {
          errors.push(`${commandLabel}: ${arg}: No such file or directory`);
        }
        continue;
      }
      if (file.isBinary || file.content.startsWith('data:')) {
        texts.push({
          label: p,
          content: `[Binary file: ${p} (${formatBytes(file.size)})]\n`,
        });
      } else {
        texts.push({ label: p, content: file.content });
      }
    }
    return { texts, err: errors.length > 0 ? errors.join('\n') : undefined };
  };

  switch (cmd) {
    case 'help': {
      const topic = args[0]?.toLowerCase();
      if (topic === 'git') {
        return ok(
          [
            'Git commands:',
            '  git status [-s]              Show working tree status and changed files',
            '  git diff [file]              Show line-by-line diff against base snapshot',
            '  git branch [name | -d name]  List, create, or delete branches',
            '  git checkout [-b] <branch>   Switch to or create a branch',
            '  git switch [-c] <branch>     Switch to or create a branch',
            '  git add <path | .>           Stage files for commit',
            '  git commit -m "<msg>"        Commit and publish changes',
            '  git log [-n N] [--oneline]   Display commit history',
            '  git show [sha]               Show commit summary',
            '  git rev-parse [--short] HEAD Show HEAD commit/branch ref',
            '  git remote [-v]              Show connected GitHub remote URL',
            '  git reset [--soft|--hard] HEAD~N  Reset HEAD commit history',
          ].join('\n')
        );
      }
      return ok(
        [
          'ZipStudio Interactive Shell — Supported Commands:',
          '  Navigation & Files:',
          '    pwd, cd [dir|-], ls [-l -a -R], tree [-L n], mkdir [-p], touch,',
          '    cp [-r], mv, rm [-rf], rmdir, stat, du [-sh], open/code <file>',
          '  Viewing & Text Processing:',
          '    cat [-n], head [-n], tail [-n], grep [-i -n -r -v -c -l -E],',
          '    find [-name -iname -type -maxdepth], wc [-l -w -c], sort [-r -u -n],',
          '    uniq [-c -d], cut -d<sep> -f<list>, tr, sed s/pat/rep/g, diff, jq, base64',
          '  Shell & Utilities:',
          '    echo [-n -e], printf, export, env, unset, which, whoami, uname, date,',
          '    history, node [-e code | file.js], clear',
          '    Supports pipes (|), chains (&&, ||, ;), globs (*, ?), quotes, > and >> redirection.',
          '  Git & Build Tools:',
          '    git (type "help git" for all subcommands), npm [test|run|ls],',
          '    ./gradlew [clean|build|test|tasks|--version], build',
        ].join('\n')
      );
    }

    case 'clear': {
      clearRequested = true;
      return ok('');
    }

    case 'true':
      return ok('');

    case 'false':
      return fail('', 1);

    case 'pwd':
      return ok(formatDisplayCwd(rt.cwd));

    case 'cd': {
      const target = args[0] || '~';
      if (target === '-') {
        const swapped = rt.prevCwd;
        nextPrevCwd = rt.cwd;
        nextCwd = swapped;
        return ok(formatDisplayCwd(nextCwd));
      }
      const resolved = resolveVirtualPath(rt.cwd, target);
      if (workingFiles[resolved] && !virtualDirExists(workingFiles, resolved)) {
        return fail(`bash: cd: ${target}: Not a directory`);
      }
      if (!virtualDirExists(workingFiles, resolved)) {
        return fail(`bash: cd: ${target}: No such file or directory`);
      }
      nextPrevCwd = rt.cwd;
      nextCwd = resolved;
      return ok('');
    }

    case 'ls': {
      let longFmt = false;
      let showAll = false;
      let recursive = false;
      const targets: string[] = [];

      for (const a of args) {
        if (a.startsWith('-') && a.length > 1) {
          if (a.includes('l')) longFmt = true;
          if (a.includes('a') || a.includes('A')) showAll = true;
          if (a.includes('R')) recursive = true;
        } else {
          targets.push(a);
        }
      }

      if (targets.length === 0) targets.push('.');

      const sections: string[] = [];
      for (let tIdx = 0; tIdx < targets.length; tIdx++) {
        const rawT = targets[tIdx];
        const resolved = resolveVirtualPath(rt.cwd, rawT);
        const directFile = workingFiles[resolved];

        if (directFile && !virtualDirExists(workingFiles, resolved)) {
          if (longFmt) {
            const d = new Date(directFile.lastModified).toISOString().slice(0, 16).replace('T', ' ');
            sections.push(`${directFile.mode === '100755' ? '-rwxr-xr-x' : '-rw-r--r--'}  ${formatBytes(directFile.size).padStart(8)}  ${d}  ${directFile.name}`);
          } else {
            sections.push(directFile.name);
          }
          continue;
        }

        if (!virtualDirExists(workingFiles, resolved)) {
          return fail(`ls: cannot access '${rawT}': No such file or directory`);
        }

        if (recursive) {
          const prefix = resolved ? `${resolved}/` : '';
          const matching = Object.keys(workingFiles)
            .filter((k) => k.startsWith(prefix))
            .sort();
          if (matching.length === 0) {
            sections.push('(empty directory)');
          } else if (longFmt) {
            for (const p of matching) {
              const f = workingFiles[p];
              const d = new Date(f.lastModified).toISOString().slice(0, 16).replace('T', ' ');
              sections.push(`${f.mode === '100755' ? '-rwxr-xr-x' : '-rw-r--r--'}  ${formatBytes(f.size).padStart(8)}  ${d}  ${p}`);
            }
          } else {
            sections.push(...matching);
          }
          continue;
        }

        const children = listDirectChildren(workingFiles, resolved, showAll);
        if (targets.length > 1) {
          sections.push(`${rawT}:`);
        }
        if (children.length === 0) {
          if (Object.keys(workingFiles).length === 0) {
            sections.push('(empty workspace)');
          }
        } else if (longFmt) {
          for (const entry of children) {
            if (entry.isDir) {
              sections.push(`drwxr-xr-x  ${'-'.padStart(8)}                    ${entry.name}/`);
            } else if (entry.file) {
              const d = new Date(entry.file.lastModified).toISOString().slice(0, 16).replace('T', ' ');
              sections.push(`${entry.file.mode === '100755' ? '-rwxr-xr-x' : '-rw-r--r--'}  ${formatBytes(entry.file.size).padStart(8)}  ${d}  ${entry.name}`);
            }
          }
        } else {
          sections.push(children.map((c) => (c.isDir ? `${c.name}/` : c.name)).join('   '));
        }
      }

      return ok(sections.join('\n'));
    }

    case 'tree': {
      let maxDepth = Infinity;
      let targetArg = '.';
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-L' && args[i + 1]) {
          const parsed = parseInt(args[i + 1], 10);
          if (!Number.isNaN(parsed) && parsed > 0) maxDepth = parsed;
          i++;
        } else if (!args[i].startsWith('-')) {
          targetArg = args[i];
        }
      }
      const resolved = resolveVirtualPath(rt.cwd, targetArg);
      if (!virtualDirExists(workingFiles, resolved)) {
        return fail(`tree: '${targetArg}': No such directory`);
      }
      return ok(renderTree(workingFiles, resolved, maxDepth).join('\n'));
    }

    case 'mkdir': {
      const targets = args.filter((a) => !a.startsWith('-'));
      if (targets.length === 0) return fail('mkdir: missing operand');
      for (const rawTarget of targets) {
        const resolved = resolveVirtualPath(rt.cwd, rawTarget);
        if (!resolved) continue;
        if (workingFiles[resolved]) {
          return fail(`mkdir: cannot create directory '${rawTarget}': File exists`);
        }
        if (!virtualDirExists(workingFiles, resolved)) {
          const keepPath = `${resolved}/.gitkeep`;
          workingFiles[keepPath] = makeTextFile(keepPath, '');
          filesChanged = true;
        }
      }
      return ok('');
    }

    case 'touch': {
      const targets = args.filter((a) => !a.startsWith('-'));
      if (targets.length === 0) return fail('touch: missing file operand');
      for (const rawTarget of targets) {
        const resolved = resolveVirtualPath(rt.cwd, rawTarget);
        if (!resolved) return fail(`touch: invalid path '${rawTarget}'`);
        if (workingFiles[resolved]) {
          workingFiles[resolved] = {
            ...workingFiles[resolved],
            lastModified: Date.now(),
          };
        } else {
          workingFiles[resolved] = makeTextFile(resolved, '');
        }
        filesChanged = true;
      }
      return ok('');
    }

    case 'cp': {
      let recursive = false;
      const operands: string[] = [];
      for (const a of args) {
        if (a.startsWith('-') && (a.includes('r') || a.includes('R') || a.includes('a'))) {
          recursive = true;
        } else if (!a.startsWith('-')) {
          operands.push(a);
        }
      }
      if (operands.length < 2) return fail('cp: missing destination file operand');

      const dstRaw = operands[operands.length - 1];
      const dstResolved = resolveVirtualPath(rt.cwd, dstRaw);
      const sources = operands.slice(0, -1);
      const dstIsDir =
        dstRaw.endsWith('/') ||
        virtualDirExists(workingFiles, dstResolved) ||
        sources.length > 1;

      for (const srcRaw of sources) {
        const srcResolved = resolveVirtualPath(rt.cwd, srcRaw);
        const srcFile = workingFiles[srcResolved];
        const srcIsDir = virtualDirExists(workingFiles, srcResolved);

        if (!srcFile && !srcIsDir) {
          return fail(`cp: cannot stat '${srcRaw}': No such file or directory`);
        }
        if (srcIsDir && !recursive) {
          return fail(`cp: -r not specified; omitting directory '${srcRaw}'`);
        }

        if (srcFile) {
          const targetPath = dstIsDir
            ? (dstResolved ? `${dstResolved}/${getFileName(srcResolved)}` : getFileName(srcResolved))
            : dstResolved;
          workingFiles[targetPath] = {
            ...srcFile,
            path: targetPath,
            name: getFileName(targetPath),
            lastModified: Date.now(),
          };
          filesChanged = true;
        } else if (srcIsDir) {
          const prefix = `${srcResolved}/`;
          const baseName = getFileName(srcResolved);
          const targetBase = dstIsDir && dstResolved && virtualDirExists(workingFiles, dstResolved)
            ? `${dstResolved}/${baseName}`
            : dstResolved;
          for (const [k, f] of Object.entries({ ...workingFiles })) {
            if (k.startsWith(prefix)) {
              const rel = k.slice(prefix.length);
              const targetPath = targetBase ? `${targetBase}/${rel}` : rel;
              workingFiles[targetPath] = {
                ...f,
                path: targetPath,
                name: getFileName(targetPath),
                lastModified: Date.now(),
              };
            }
          }
          filesChanged = true;
        }
      }
      return ok('');
    }

    case 'mv': {
      const operands = args.filter((a) => !a.startsWith('-'));
      if (operands.length < 2) return fail('mv: missing destination file operand');

      const dstRaw = operands[operands.length - 1];
      const dstResolved = resolveVirtualPath(rt.cwd, dstRaw);
      const sources = operands.slice(0, -1);
      const dstIsDir =
        dstRaw.endsWith('/') ||
        virtualDirExists(workingFiles, dstResolved) ||
        sources.length > 1;

      for (const srcRaw of sources) {
        const srcResolved = resolveVirtualPath(rt.cwd, srcRaw);
        const srcFile = workingFiles[srcResolved];
        const srcIsDir = virtualDirExists(workingFiles, srcResolved);

        if (!srcFile && !srcIsDir) {
          return fail(`mv: cannot stat '${srcRaw}': No such file or directory`);
        }

        if (srcFile) {
          const targetPath = dstIsDir
            ? (dstResolved ? `${dstResolved}/${getFileName(srcResolved)}` : getFileName(srcResolved))
            : dstResolved;
          if (targetPath !== srcResolved) {
            workingFiles[targetPath] = {
              ...srcFile,
              path: targetPath,
              name: getFileName(targetPath),
              lastModified: Date.now(),
            };
            delete workingFiles[srcResolved];
            deletedPaths.push(srcResolved);
            filesChanged = true;
          }
        } else if (srcIsDir) {
          const prefix = `${srcResolved}/`;
          const baseName = getFileName(srcResolved);
          const targetBase = dstIsDir && virtualDirExists(workingFiles, dstResolved)
            ? (dstResolved ? `${dstResolved}/${baseName}` : baseName)
            : dstResolved;

          if (targetBase.startsWith(`${srcResolved}/`)) {
            return fail(`mv: cannot move '${srcRaw}' to a subdirectory of itself, '${dstRaw}'`);
          }

          for (const [k, f] of Object.entries({ ...workingFiles })) {
            if (k.startsWith(prefix)) {
              const rel = k.slice(prefix.length);
              const targetPath = targetBase ? `${targetBase}/${rel}` : rel;
              delete workingFiles[k];
              deletedPaths.push(k);
              workingFiles[targetPath] = {
                ...f,
                path: targetPath,
                name: getFileName(targetPath),
                lastModified: Date.now(),
              };
            }
          }
          filesChanged = true;
        }
      }
      return ok('');
    }

    case 'rm': {
      let isForce = false;
      let isRecursive = false;
      const targets: string[] = [];

      for (const a of args) {
        if (a.startsWith('-')) {
          if (a.includes('f') || a.includes('F')) isForce = true;
          if (a.includes('r') || a.includes('R')) isRecursive = true;
        } else {
          targets.push(a);
        }
      }

      if (targets.length === 0) return fail('rm: missing operand');

      const out: string[] = [];
      for (const target of targets) {
        const resolved = resolveVirtualPath(rt.cwd, target);
        if (!resolved) {
          return fail("rm: refusing to remove root workspace directory");
        }
        const isFile = Boolean(workingFiles[resolved]);
        const isDir = virtualDirExists(workingFiles, resolved);

        if (!isFile && !isDir) {
          if (!isForce) {
            return fail(`rm: cannot remove '${target}': No such file or directory`);
          }
          continue;
        }

        if (isDir && !isFile && !isRecursive) {
          return fail(`rm: cannot remove '${target}': Is a directory`);
        }

        if (isFile) {
          delete workingFiles[resolved];
          deletedPaths.push(resolved);
          filesChanged = true;
          out.push(`removed '${target}'`);
        }
        if (isDir && isRecursive) {
          const prefix = `${resolved}/`;
          for (const k of Object.keys(workingFiles)) {
            if (k.startsWith(prefix)) {
              delete workingFiles[k];
              deletedPaths.push(k);
            }
          }
          filesChanged = true;
          out.push(`removed '${target}'`);
        }
      }
      return ok(out.join('\n'));
    }

    case 'rmdir': {
      const targets = args.filter((a) => !a.startsWith('-'));
      if (targets.length === 0) return fail('rmdir: missing operand');
      for (const t of targets) {
        const resolved = resolveVirtualPath(rt.cwd, t);
        if (!resolved || !virtualDirExists(workingFiles, resolved)) {
          return fail(`rmdir: failed to remove '${t}': No such file or directory`);
        }
        const prefix = `${resolved}/`;
        const inside = Object.keys(workingFiles).filter((k) => k.startsWith(prefix));
        const onlyGitkeep = inside.length === 1 && inside[0] === `${resolved}/.gitkeep`;
        if (inside.length > 0 && !onlyGitkeep) {
          return fail(`rmdir: failed to remove '${t}': Directory not empty`);
        }
        if (onlyGitkeep) {
          delete workingFiles[`${resolved}/.gitkeep`];
          deletedPaths.push(`${resolved}/.gitkeep`);
          filesChanged = true;
        }
      }
      return ok('');
    }

    case 'cat': {
      let numbered = false;
      const fileArgs: string[] = [];
      for (const a of args) {
        if (a === '-n') numbered = true;
        else if (!a.startsWith('-')) fileArgs.push(a);
      }
      const { texts, err } = readTextSources(fileArgs, 'cat');
      if (err && texts.length === 0) return fail(err);
      let combined = texts.map((t) => t.content).join('');
      if (numbered) {
        combined = combined
          .split('\n')
          .map((line, i) => `${String(i + 1).padStart(5)}  ${line}`)
          .join('\n');
      }
      return err ? fail(err, 1, combined) : ok(combined);
    }

    case 'head':
    case 'tail': {
      let count = 10;
      const fileArgs: string[] = [];
      for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '-n' && args[i + 1]) {
          const parsed = parseInt(args[i + 1], 10);
          if (!Number.isNaN(parsed) && parsed >= 0) count = parsed;
          i++;
        } else if (/^-\d+$/.test(a)) {
          count = parseInt(a.slice(1), 10);
        } else if (!a.startsWith('-')) {
          fileArgs.push(a);
        }
      }

      const { texts, err } = readTextSources(fileArgs, cmd);
      if (err && texts.length === 0) return fail(err);

      const blocks = texts.map((t) => {
        const lines = t.content.replace(/\n$/, '').split('\n');
        const sliced = cmd === 'head' ? lines.slice(0, count) : lines.slice(-count);
        const body = sliced.join('\n');
        return texts.length > 1 ? `==> ${t.label} <==\n${body}` : body;
      });
      return err ? fail(err, 1, blocks.join('\n')) : ok(blocks.join('\n'));
    }

    case 'wc': {
      let showL = false;
      let showW = false;
      let showC = false;
      const fileArgs: string[] = [];
      for (const a of args) {
        if (a.startsWith('-')) {
          if (a.includes('l')) showL = true;
          if (a.includes('w')) showW = true;
          if (a.includes('c')) showC = true;
        } else {
          fileArgs.push(a);
        }
      }
      if (!showL && !showW && !showC) {
        showL = showW = showC = true;
      }

      const { texts, err } = readTextSources(fileArgs, 'wc');
      if (err && texts.length === 0) return fail(err);

      const rows: string[] = [];
      let totalL = 0;
      let totalW = 0;
      let totalC = 0;

      for (const t of texts) {
        const l = t.content === '' ? 0 : t.content.split('\n').length - (t.content.endsWith('\n') ? 1 : 0);
        const w = t.content.trim() ? t.content.trim().split(/\s+/).length : 0;
        const c = t.content.length;
        totalL += l;
        totalW += w;
        totalC += c;
        const parts: string[] = [];
        if (showL) parts.push(String(l).padStart(6));
        if (showW) parts.push(String(w).padStart(6));
        if (showC) parts.push(String(c).padStart(6));
        if (t.label !== '(stdin)') parts.push(` ${t.label}`);
        rows.push(parts.join(' '));
      }

      if (texts.length > 1) {
        const parts: string[] = [];
        if (showL) parts.push(String(totalL).padStart(6));
        if (showW) parts.push(String(totalW).padStart(6));
        if (showC) parts.push(String(totalC).padStart(6));
        parts.push(' total');
        rows.push(parts.join(' '));
      }

      return err ? fail(err, 1, rows.join('\n')) : ok(rows.join('\n'));
    }

    case 'grep': {
      let ignoreCase = false;
      let lineNumbers = false;
      let recursive = false;
      let invert = false;
      let countOnly = false;
      let filesWithMatches = false;
      let extendedRegex = true;
      const positional: string[] = [];

      for (const a of args) {
        if (a.startsWith('-') && a.length > 1) {
          if (a.includes('i')) ignoreCase = true;
          if (a.includes('n')) lineNumbers = true;
          if (a.includes('r') || a.includes('R')) recursive = true;
          if (a.includes('v')) invert = true;
          if (a.includes('c')) countOnly = true;
          if (a.includes('l')) filesWithMatches = true;
          if (a.includes('F')) extendedRegex = false;
        } else {
          positional.push(a);
        }
      }

      const pattern = positional[0];
      if (!pattern) return fail('grep: missing search pattern');

      let regex: RegExp;
      try {
        const src = extendedRegex ? pattern : pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(src, ignoreCase ? 'i' : '');
      } catch (e: any) {
        return fail(`grep: invalid pattern: ${e.message}`);
      }

      const targetPaths = positional.slice(1);
      const candidates: Array<{ label: string; content: string }> = [];

      if (targetPaths.length === 0) {
        if (stdin !== null) {
          candidates.push({ label: '', content: stdin });
        } else if (recursive) {
          const prefix = rt.cwd ? `${rt.cwd}/` : '';
          for (const [k, f] of Object.entries(workingFiles)) {
            if (k.startsWith(prefix) && !f.isBinary && !f.content.startsWith('data:')) {
              candidates.push({ label: k, content: f.content });
            }
          }
        } else {
          return fail('grep: missing file operand (use -r or pipe stdin)');
        }
      } else {
        for (const tp of targetPaths) {
          const resolved = resolveVirtualPath(rt.cwd, tp);
          const f = workingFiles[resolved];
          if (f) {
            if (!f.isBinary && !f.content.startsWith('data:')) {
              candidates.push({ label: resolved, content: f.content });
            }
          } else if (virtualDirExists(workingFiles, resolved)) {
            if (!recursive) {
              return fail(`grep: ${tp}: Is a directory (use -r)`);
            }
            const prefix = resolved ? `${resolved}/` : '';
            for (const [k, df] of Object.entries(workingFiles)) {
              if (k.startsWith(prefix) && !df.isBinary && !df.content.startsWith('data:')) {
                candidates.push({ label: k, content: df.content });
              }
            }
          } else {
            return fail(`grep: ${tp}: No such file or directory`);
          }
        }
      }

      const showPrefix = candidates.length > 1 || recursive;
      const matches: string[] = [];
      let totalMatches = 0;

      for (const item of candidates) {
        const lines = item.content.split('\n');
        let fileCount = 0;
        for (let idx = 0; idx < lines.length; idx++) {
          const line = lines[idx];
          const isMatch = regex.test(line);
          if (invert ? !isMatch : isMatch) {
            fileCount++;
            totalMatches++;
            if (filesWithMatches) {
              matches.push(item.label || '(standard input)');
              break;
            }
            if (!countOnly) {
              const prefixParts: string[] = [];
              if (showPrefix && item.label) prefixParts.push(item.label);
              if (lineNumbers) prefixParts.push(String(idx + 1));
              matches.push(prefixParts.length > 0 ? `${prefixParts.join(':')}:${line}` : line);
            }
          }
        }
        if (countOnly && !filesWithMatches) {
          matches.push(showPrefix && item.label ? `${item.label}:${fileCount}` : String(fileCount));
        }
      }

      if (totalMatches === 0 && !countOnly) {
        return fail('', 1, '');
      }
      return ok(matches.slice(0, 500).join('\n'));
    }

    case 'find': {
      let baseArg = '.';
      let nameGlob: string | null = null;
      let nameInsensitive = false;
      let typeFilter: 'f' | 'd' | null = null;
      let maxDepth = Infinity;

      let i = 0;
      if (args[0] && !args[0].startsWith('-')) {
        baseArg = args[0];
        i = 1;
      }
      for (; i < args.length; i++) {
        if (args[i] === '-name' && args[i + 1]) {
          nameGlob = args[++i];
          nameInsensitive = false;
        } else if (args[i] === '-iname' && args[i + 1]) {
          nameGlob = args[++i];
          nameInsensitive = true;
        } else if (args[i] === '-type' && args[i + 1]) {
          const t = args[++i];
          if (t === 'f' || t === 'd') typeFilter = t;
        } else if (args[i] === '-maxdepth' && args[i + 1]) {
          const d = parseInt(args[++i], 10);
          if (!Number.isNaN(d)) maxDepth = d;
        }
      }

      const baseResolved = resolveVirtualPath(rt.cwd, baseArg);
      if (!virtualDirExists(workingFiles, baseResolved) && !workingFiles[baseResolved]) {
        return fail(`find: '${baseArg}': No such file or directory`);
      }

      const nameRegex = nameGlob ? globToRegex(nameGlob, nameInsensitive) : null;
      const prefix = baseResolved ? `${baseResolved}/` : '';
      const baseDepth = baseResolved ? baseResolved.split('/').length : 0;

      const results: string[] = [];
      const dirs = getAllDirectories(workingFiles).filter((d) =>
        baseResolved ? d === baseResolved || d.startsWith(prefix) : true
      );

      if (typeFilter !== 'f') {
        if (!baseResolved) {
          if (!nameRegex || nameRegex.test('.')) results.push('.');
        } else if (dirs.includes(baseResolved)) {
          if (!nameRegex || nameRegex.test(getFileName(baseResolved))) results.push(baseResolved);
        }
        for (const d of dirs) {
          if (d === baseResolved) continue;
          const depth = d.split('/').length - baseDepth;
          if (depth > maxDepth) continue;
          if (!nameRegex || nameRegex.test(getFileName(d))) results.push(d);
        }
      }

      if (typeFilter !== 'd') {
        for (const fPath of Object.keys(workingFiles).sort()) {
          if (baseResolved && fPath !== baseResolved && !fPath.startsWith(prefix)) continue;
          const depth = fPath.split('/').length - baseDepth;
          if (depth > maxDepth) continue;
          if (!nameRegex || nameRegex.test(getFileName(fPath))) results.push(fPath);
        }
      }

      return ok(results.sort().slice(0, 500).join('\n'));
    }

    case 'sort': {
      let reverse = false;
      let unique = false;
      let numeric = false;
      const fileArgs: string[] = [];
      for (const a of args) {
        if (a.startsWith('-') && a.length > 1) {
          if (a.includes('r')) reverse = true;
          if (a.includes('u')) unique = true;
          if (a.includes('n')) numeric = true;
        } else {
          fileArgs.push(a);
        }
      }
      const { texts, err } = readTextSources(fileArgs, 'sort');
      if (err && texts.length === 0) return fail(err);
      let lines = texts
        .map((t) => t.content.replace(/\n$/, ''))
        .join('\n')
        .split('\n');
      if (unique) lines = Array.from(new Set(lines));
      lines.sort((a, b) => {
        if (numeric) {
          return (parseFloat(a) || 0) - (parseFloat(b) || 0);
        }
        return a.localeCompare(b);
      });
      if (reverse) lines.reverse();
      return ok(lines.join('\n'));
    }

    case 'uniq': {
      let countFlag = false;
      let dupOnly = false;
      const fileArgs: string[] = [];
      for (const a of args) {
        if (a === '-c') countFlag = true;
        else if (a === '-d') dupOnly = true;
        else if (!a.startsWith('-')) fileArgs.push(a);
      }
      const { texts, err } = readTextSources(fileArgs, 'uniq');
      if (err && texts.length === 0) return fail(err);
      const lines = texts.map((t) => t.content.replace(/\n$/, '')).join('\n').split('\n');
      const groups: Array<{ line: string; count: number }> = [];
      for (const line of lines) {
        const prev = groups[groups.length - 1];
        if (prev && prev.line === line) {
          prev.count++;
        } else {
          groups.push({ line, count: 1 });
        }
      }
      const out = groups
        .filter((g) => (!dupOnly || g.count > 1))
        .map((g) => (countFlag ? `${String(g.count).padStart(6)} ${g.line}` : g.line));
      return ok(out.join('\n'));
    }

    case 'cut': {
      let delim = '\t';
      let fieldsSpec = '';
      const fileArgs: string[] = [];
      for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a.startsWith('-d')) {
          delim = a.length > 2 ? a.slice(2) : (args[++i] || '\t');
        } else if (a.startsWith('-f')) {
          fieldsSpec = a.length > 2 ? a.slice(2) : (args[++i] || '');
        } else if (!a.startsWith('-')) {
          fileArgs.push(a);
        }
      }
      if (!fieldsSpec) return fail('cut: you must specify a list of fields (-f)');
      const fieldIndices = fieldsSpec
        .split(',')
        .map((n) => parseInt(n.trim(), 10) - 1)
        .filter((n) => !Number.isNaN(n) && n >= 0);

      const { texts, err } = readTextSources(fileArgs, 'cut');
      if (err && texts.length === 0) return fail(err);
      const lines = texts.map((t) => t.content.replace(/\n$/, '')).join('\n').split('\n');
      const out = lines.map((line) => {
        const parts = line.split(delim);
        return fieldIndices.map((idx) => parts[idx] ?? '').join(delim);
      });
      return ok(out.join('\n'));
    }

    case 'tr': {
      let deleteMode = false;
      const positional: string[] = [];
      for (const a of args) {
        if (a === '-d') deleteMode = true;
        else if (!a.startsWith('-')) positional.push(a);
      }
      if (stdin === null) return fail('tr: expects piped stdin');
      const set1 = positional[0] || '';
      const set2 = positional[1] || '';
      if (!set1) return fail('tr: missing operand');

      let result = '';
      for (const ch of stdin) {
        const idx = set1.indexOf(ch);
        if (idx !== -1) {
          if (!deleteMode) {
            result += set2[Math.min(idx, Math.max(0, set2.length - 1))] ?? ch;
          }
        } else {
          result += ch;
        }
      }
      return ok(result);
    }

    case 'sed': {
      const exprArg = args.find((a) => !a.startsWith('-'));
      const fileArgs = args.filter((a) => a !== exprArg && !a.startsWith('-'));
      if (!exprArg) return fail('sed: missing script expression');

      // Support s/pat/rep/[gi] with arbitrary delimiter
      const delim = exprArg[1];
      if (!exprArg.startsWith('s') || !delim) {
        return fail(`sed: unsupported expression '${exprArg}' (use s/pattern/replacement/g)`);
      }
      const parts = exprArg.slice(2).split(delim);
      const pat = parts[0] || '';
      const rep = parts[1] ?? '';
      const flags = parts[2] || '';
      let regex: RegExp;
      try {
        regex = new RegExp(pat, flags.replace(/[^gi]/g, ''));
      } catch (e: any) {
        return fail(`sed: invalid regex: ${e.message}`);
      }

      const { texts, err } = readTextSources(fileArgs, 'sed');
      if (err && texts.length === 0) return fail(err);
      const transformed = texts.map((t) => t.content.replace(regex, rep)).join('');
      return ok(transformed);
    }

    case 'diff': {
      const positional = args.filter((a) => !a.startsWith('-'));
      if (positional.length < 2) return fail('diff: missing operand after diff');
      const p1 = resolveVirtualPath(rt.cwd, positional[0]);
      const p2 = resolveVirtualPath(rt.cwd, positional[1]);
      const f1 = workingFiles[p1];
      const f2 = workingFiles[p2];
      if (!f1) return fail(`diff: ${positional[0]}: No such file`);
      if (!f2) return fail(`diff: ${positional[1]}: No such file`);

      const diff = computeFileDiff(`${p1} -> ${p2}`, f1.content, f2.content);
      const changed = diff.lines.filter((l) => l.type !== 'normal');
      if (changed.length === 0) return ok('');
      const header = [`--- ${p1}`, `+++ ${p2}`];
      for (const line of diff.lines) {
        if (line.type === 'delete') header.push(`- ${line.content}`);
        else if (line.type === 'add') header.push(`+ ${line.content}`);
      }
      return fail('', 1, header.join('\n'));
    }

    case 'stat': {
      if (args.length === 0) return fail('stat: missing operand');
      const out: string[] = [];
      for (const a of args) {
        const resolved = resolveVirtualPath(rt.cwd, a);
        const f = workingFiles[resolved];
        if (f) {
          out.push(
            `  File: ${resolved}`,
            `  Size: ${f.size} (${formatBytes(f.size)})   Type: ${f.isBinary ? 'binary' : 'regular text file'}`,
            `  Mode: ${f.mode || '100644'}   Modified: ${new Date(f.lastModified).toISOString()}`
          );
        } else if (virtualDirExists(workingFiles, resolved)) {
          out.push(`  File: ${resolved || '/'}   Type: directory`);
        } else {
          return fail(`stat: cannot stat '${a}': No such file or directory`);
        }
      }
      return ok(out.join('\n'));
    }

    case 'du': {
      let human = false;
      let summaryOnly = false;
      const targets: string[] = [];
      for (const a of args) {
        if (a.startsWith('-')) {
          if (a.includes('h')) human = true;
          if (a.includes('s')) summaryOnly = true;
        } else {
          targets.push(a);
        }
      }
      if (targets.length === 0) targets.push('.');

      const lines: string[] = [];
      for (const t of targets) {
        const resolved = resolveVirtualPath(rt.cwd, t);
        const prefix = resolved ? `${resolved}/` : '';
        const matching = Object.values(workingFiles).filter(
          (f) => f.path === resolved || f.path.startsWith(prefix)
        );
        if (matching.length === 0 && !virtualDirExists(workingFiles, resolved)) {
          return fail(`du: cannot access '${t}': No such file or directory`);
        }
        const fmt = (bytes: number) => (human ? formatBytes(bytes).padEnd(9) : `${Math.ceil(bytes / 1024)}K`.padEnd(8));
        if (!summaryOnly) {
          for (const f of matching) {
            lines.push(`${fmt(f.size)} ${f.path}`);
          }
        }
        const totalBytes = matching.reduce((acc, f) => acc + f.size, 0);
        lines.push(`${fmt(totalBytes)} ${t}`);
      }
      return ok(lines.join('\n'));
    }

    case 'open':
    case 'code': {
      const target = args[0];
      if (!target) return fail(`Usage: ${cmd} <filename>`);
      const resolved = resolveVirtualPath(rt.cwd, target);
      if (!workingFiles[resolved]) {
        return fail(`${cmd}: ${target}: No such file`);
      }
      openedFile = resolved;
      rt.onOpenFile?.(resolved);
      return ok(`Opened ${resolved} in Editor.`);
    }

    case 'echo': {
      let noNewline = false;
      let interpEscapes = false;
      let startIdx = 0;
      while (startIdx < args.length && (args[startIdx] === '-n' || args[startIdx] === '-e')) {
        if (args[startIdx] === '-n') noNewline = true;
        if (args[startIdx] === '-e') interpEscapes = true;
        startIdx++;
      }
      let outStr = args.slice(startIdx).join(' ');
      if (interpEscapes) outStr = unescapeEchoString(outStr);
      return ok(noNewline ? outStr : `${outStr}\n`);
    }

    case 'printf': {
      if (args.length === 0) return fail('printf: usage: printf format [arguments]');
      return ok(formatPrintf(args[0], args.slice(1)));
    }

    case 'env':
    case 'printenv': {
      if (cmd === 'printenv' && args[0]) {
        const v = rt.env[args[0]];
        return v !== undefined ? ok(v) : fail('', 1);
      }
      return ok(
        Object.entries(rt.env)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join('\n')
      );
    }

    case 'export': {
      if (args.length === 0) {
        return ok(
          Object.entries(rt.env)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `declare -x ${k}="${v}"`)
            .join('\n')
        );
      }
      for (const a of args) {
        const eqIdx = a.indexOf('=');
        if (eqIdx > 0) {
          rt.env[a.slice(0, eqIdx)] = a.slice(eqIdx + 1);
        }
      }
      return ok('');
    }

    case 'unset': {
      for (const a of args) {
        delete rt.env[a];
      }
      return ok('');
    }

    case 'which':
    case 'type': {
      if (args.length === 0) return fail('', 1);
      const found: string[] = [];
      let allFound = true;
      for (const target of args) {
        if (KNOWN_COMMANDS.includes(target.toLowerCase())) {
          found.push(cmd === 'type' ? `${target} is a ZipStudio shell builtin` : `/usr/bin/${target}`);
        } else {
          found.push(`${target} not found`);
          allFound = false;
        }
      }
      return allFound ? ok(found.join('\n')) : fail(found.join('\n'));
    }

    case 'whoami':
      return ok(rt.env.USER || 'developer');

    case 'id':
      return ok(`uid=1000(${rt.env.USER || 'developer'}) gid=1000(workspace) groups=1000(workspace)`);

    case 'uname':
      return ok(
        args.includes('-a')
          ? 'ZipStudio-BrowserOS 6.8.0-wasm #1 SMP WebWorker x86_64/wasm32 GNU/Linux'
          : 'ZipStudio-BrowserOS'
      );

    case 'date':
      return ok(new Date().toString());

    case 'history':
      return ok(rt.commandHistory.map((c, idx) => `${String(idx + 1).padStart(4)}  ${c}`).join('\n'));

    case 'base64': {
      let decode = false;
      const fileArgs: string[] = [];
      for (const a of args) {
        if (a === '-d' || a === '--decode') decode = true;
        else if (!a.startsWith('-')) fileArgs.push(a);
      }
      const { texts, err } = readTextSources(fileArgs, 'base64');
      if (err && texts.length === 0) return fail(err);
      const input = texts.map((t) => t.content).join('');
      try {
        if (decode) {
          const clean = input.replace(/\s+/g, '');
          const binary = atob(clean);
          const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
          return ok(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
        } else {
          const bytes = new TextEncoder().encode(input);
          let bin = '';
          bytes.forEach((b) => (bin += String.fromCharCode(b)));
          return ok(btoa(bin));
        }
      } catch (e: any) {
        return fail(`base64: invalid input (${e.message})`);
      }
    }

    case 'jq':
    case 'json': {
      let filter = '.';
      const fileArgs: string[] = [];
      for (const a of args) {
        if (a.startsWith('.') && a !== '.') {
          filter = a;
        } else if (a === '.') {
          filter = '.';
        } else if (!a.startsWith('-')) {
          fileArgs.push(a);
        }
      }
      const { texts, err } = readTextSources(fileArgs, cmd);
      if (err && texts.length === 0) return fail(err);
      const raw = texts.map((t) => t.content).join('');
      try {
        let parsed = JSON.parse(raw);
        if (filter !== '.') {
          const parts = filter.replace(/^\./, '').split('.').filter(Boolean);
          for (const key of parts) {
            if (parsed && typeof parsed === 'object') {
              parsed = parsed[key];
            } else {
              parsed = null;
              break;
            }
          }
        }
        return ok(JSON.stringify(parsed, null, 2));
      } catch (e: any) {
        return fail(`${cmd}: parse error: ${e.message}`);
      }
    }

    case 'node': {
      if (args.length === 0) {
        return fail('Usage: node -e "<javascript>" OR node <script.js>');
      }
      let code = '';
      if (args[0] === '-e' || args[0] === '--eval') {
        code = args.slice(1).join(' ');
      } else {
        const resolved = resolveVirtualPath(rt.cwd, args[0]);
        const file = workingFiles[resolved];
        if (!file) return fail(`node: cannot find module '${args[0]}'`);
        if (file.isBinary) return fail(`node: '${args[0]}' is a binary file`);
        code = file.content;
      }

      const logs: string[] = [];
      const fmtVal = (v: unknown): string => {
        if (typeof v === 'string') return v;
        try {
          return JSON.stringify(v, null, 2);
        } catch {
          return String(v);
        }
      };
      const virtualConsole = {
        log: (...v: unknown[]) => logs.push(v.map(fmtVal).join(' ')),
        info: (...v: unknown[]) => logs.push(v.map(fmtVal).join(' ')),
        warn: (...v: unknown[]) => logs.push(`[warn] ${v.map(fmtVal).join(' ')}`),
        error: (...v: unknown[]) => logs.push(`[error] ${v.map(fmtVal).join(' ')}`),
      };
      const requireMock = (mod: string) => {
        const rel = resolveVirtualPath(rt.cwd, mod);
        const jsonFile = workingFiles[rel] || workingFiles[`${rel}.json`];
        if (jsonFile && !jsonFile.isBinary) {
          return JSON.parse(jsonFile.content);
        }
        throw new Error(`Cannot find module '${mod}' in browser sandbox`);
      };

      try {
        const fn = new Function('console', 'require', 'process', code);
        const ret = fn(virtualConsole, requireMock, {
          env: rt.env,
          cwd: () => formatDisplayCwd(rt.cwd),
          argv: ['node', ...args],
        });
        if (ret !== undefined && logs.length === 0) {
          logs.push(fmtVal(ret));
        }
        return ok(logs.join('\n'));
      } catch (e: any) {
        return fail(`Uncaught ${e.name || 'Error'}: ${e.message}`, 1, logs.join('\n'));
      }
    }

    case './gradlew':
    case 'gradlew':
    case './gradle':
    case 'gradle': {
      const task = args[0] || 'tasks';
      const settingsFile = workingFiles['settings.gradle.kts'] || workingFiles['settings.gradle'];
      const moduleMatches = settingsFile
        ? Array.from(settingsFile.content.matchAll(/include\s*\(?\s*["'](:[^"']+)["']/g)).map((m) => m[1])
        : [':app'];
      const modules = moduleMatches.length > 0 ? moduleMatches : [':app'];

      if (task === 'clean') {
        rt.onCleanBuild?.();
        const lines = [
          '> Task :clean UP-TO-DATE',
          ...modules.map((m) => `> Task ${m}:clean`),
          '',
          'BUILD SUCCESSFUL in 1s',
          `${modules.length + 1} actionable tasks: ${modules.length} executed, 1 up-to-date`,
        ];
        return ok(lines.join('\n'));
      }
      if (task === 'build' || task === 'assemble' || task === 'assembleDebug' || task === 'assembleRelease') {
        const lines = [
          ...modules.map((m) => `> Task ${m}:compileKotlin`),
          `> Task ${modules[0]}:${task === 'build' ? 'assemble' : task}`,
          '',
          'BUILD SUCCESSFUL in 2s',
          `${modules.length + 1} actionable tasks: ${modules.length + 1} executed`,
        ];
        return ok(lines.join('\n'));
      }
      if (task === 'test') {
        return ok(
          [
            ...modules.map((m) => `> Task ${m}:test`),
            'BUILD SUCCESSFUL in 1s',
          ].join('\n')
        );
      }
      if (task === 'tasks') {
        return ok(
          [
            `Detected Gradle modules: ${modules.join(', ')}`,
            'Build tasks: assemble, assembleDebug, assembleRelease, build, clean',
            'Verification tasks: check, test',
          ].join('\n')
        );
      }
      if (task === '--version' || task === '-v') {
        return ok(
          [
            '------------------------------------------------------------',
            'Gradle 8.5',
            '------------------------------------------------------------',
            'Kotlin:       1.9.22',
            'Groovy:       3.0.17',
            'JVM:          17.0.9',
          ].join('\n')
        );
      }
      return ok(`> Task :${task}\nBUILD SUCCESSFUL in 850ms`);
    }

    case 'npm': {
      const sub = args[0] || '--help';
      const pkgFile = workingFiles['package.json'];
      let pkg: any = null;
      if (pkgFile && !pkgFile.isBinary) {
        try {
          pkg = JSON.parse(pkgFile.content);
        } catch {
          pkg = null;
        }
      }

      if (sub === '--version' || sub === '-v') return ok('10.8.2');
      if (sub === 'test' || (sub === 'run' && args[1] === 'test')) {
        return ok(
          [
            `> ${pkg?.name || 'project'}@${pkg?.version || '1.0.0'} test`,
            '✔ Virtual file system valid',
            '✔ All checks passed',
          ].join('\n')
        );
      }
      if (sub === 'ls' || sub === 'list') {
        if (!pkg) return fail('npm error: no package.json found in workspace root');
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        const entries = Object.entries(deps);
        if (entries.length === 0) return ok(`${pkg.name || 'project'}@${pkg.version || '1.0.0'}\n(empty)`);
        return ok(
          [
            `${pkg.name || 'project'}@${pkg.version || '1.0.0'}`,
            ...entries.map(([k, v], i) => `${i === entries.length - 1 ? '└──' : '├──'} ${k}@${v}`),
          ].join('\n')
        );
      }
      if (sub === 'run') {
        const scriptName = args[1];
        if (!scriptName) {
          const scripts = pkg?.scripts ? Object.entries(pkg.scripts) : [];
          if (scripts.length === 0) return ok('No scripts defined in package.json.');
          return ok(
            ['Lifecycle scripts available in package.json:', ...scripts.map(([k, v]) => `  ${k}: ${v}`)].join('\n')
          );
        }
        const scriptCmd = pkg?.scripts?.[scriptName];
        if (!scriptCmd) {
          return fail(`npm error: Missing script: "${scriptName}"`);
        }
        return ok(`> ${pkg?.name || 'project'} ${scriptName}\n> ${scriptCmd}\n✔ Script "${scriptName}" completed.`);
      }
      return ok(`npm: simulated '${args.join(' ')}'`);
    }

    case 'build': {
      const totalKB = Math.round(
        Object.values(workingFiles).reduce((a, b) => a + b.size, 0) / 1024
      );
      return ok(
        [
          'Validating project assets...',
          `✔ ${Object.keys(workingFiles).length} files indexed (${totalKB} KB total)`,
          'Ready for commit or .zip export.',
        ].join('\n')
      );
    }

    case 'git': {
      const sub = args[0];
      if (!sub || sub === '--help') {
        return runSingleCommand('help', ['git'], null, rt);
      }

      if (sub === 'status') {
        const isShort = args.includes('-s') || args.includes('--short');
        if (isShort) {
          if (rt.diffs.length === 0) return ok('');
          return ok(
            rt.diffs
              .map((d) => `${d.status === 'added' ? 'A ' : d.status === 'deleted' ? 'D ' : ' M'} ${d.path}`)
              .join('\n')
          );
        }
        const out = [`On branch ${rt.activeBranch}`];
        if (rt.softResetTarget) {
          out.push(
            `HEAD rewound to [${rt.softResetTarget.shortId}] ${rt.softResetTarget.message}`,
            `  (use "git commit -m <message>" to publish squashed workspace)`,
            `  ${Object.keys(workingFiles).length} workspace files staged`
          );
        } else if (rt.diffs.length > 0) {
          out.push('Changes not staged / ready for commit:');
          rt.diffs.slice(0, 50).forEach((d) => {
            out.push(`  ${d.status.padEnd(9)} ${d.path}`);
          });
          if (rt.diffs.length > 50) {
            out.push(`  ... and ${rt.diffs.length - 50} more files`);
          }
        } else {
          out.push('nothing to commit, working tree clean');
        }
        return ok(out.join('\n'));
      }

      if (sub === 'diff') {
        const targetArg = args.slice(1).find((a) => !a.startsWith('-'));
        const filterPath = targetArg ? resolveVirtualPath(rt.cwd, targetArg) : null;
        const selectedDiffs = filterPath
          ? rt.diffs.filter((d) => d.path === filterPath || d.path.startsWith(`${filterPath}/`))
          : rt.diffs;

        if (selectedDiffs.length === 0) return ok('');
        if (args.includes('--stat')) {
          return ok(
            selectedDiffs
              .map((d) => ` ${d.path} | +${d.additions} -${d.deletions} (${d.status})`)
              .join('\n')
          );
        }

        const chunks: string[] = [];
        for (const d of selectedDiffs.slice(0, 20)) {
          chunks.push(`diff --git a/${d.path} b/${d.path}`, `--- a/${d.path}`, `+++ b/${d.path}`);
          for (const line of d.lines.slice(0, 120)) {
            if (line.type === 'add') chunks.push(`+${line.content}`);
            else if (line.type === 'delete') chunks.push(`-${line.content}`);
          }
        }
        if (selectedDiffs.length > 20) {
          chunks.push(`... (${selectedDiffs.length - 20} more changed files omitted; run git diff <file>)`);
        }
        return ok(chunks.join('\n'));
      }

      if (sub === 'branch') {
        const newBranch = args.slice(1).find((a) => !a.startsWith('-'));
        if (!newBranch) {
          return ok(
            rt.branches
              .map((b) => `${b.name === rt.activeBranch ? '* ' : '  '}${b.name}`)
              .join('\n')
          );
        }
        if (rt.onCreateBranch) {
          try {
            await rt.onCreateBranch(newBranch);
            return ok(`Created branch '${newBranch}'`);
          } catch (e: any) {
            return fail(`fatal: could not create branch '${newBranch}': ${e.message}`);
          }
        }
        return ok(`Branch '${newBranch}'`);
      }

      if (sub === 'checkout' || sub === 'switch') {
        const createFlag = args.includes('-b') || args.includes('-c');
        const targetBranch = args.slice(1).find((a) => !a.startsWith('-'));
        if (!targetBranch) {
          return fail(`git ${sub}: missing branch name`);
        }
        if (createFlag) {
          if (!rt.onCreateBranch) return fail('git: branch creation handler unavailable');
          try {
            await rt.onCreateBranch(targetBranch);
            return ok(`Switched to a new branch '${targetBranch}'`);
          } catch (e: any) {
            return fail(`fatal: ${e.message}`);
          }
        }
        const exists = rt.branches.some((b) => b.name === targetBranch);
        if (!exists) {
          return fail(`error: pathspec '${targetBranch}' did not match any branch (use -b to create)`);
        }
        if (rt.onSwitchBranch) {
          try {
            await rt.onSwitchBranch(targetBranch);
            return ok(`Switched to branch '${targetBranch}'`);
          } catch (e: any) {
            return fail(`fatal: ${e.message}`);
          }
        }
        return ok(`Switched to branch '${targetBranch}'`);
      }

      if (sub === 'add') {
        const target = args[1];
        if (!target) return fail('Nothing specified, nothing added.\nMaybe you wanted to say "git add ."?');
        return ok(`Staged '${target}' for commit (${rt.diffs.length} changed file(s) tracked).`);
      }

      if (sub === 'remote') {
        if (!rt.selectedRepo) return ok('(no remote repository selected; local workspace)');
        const url = rt.selectedRepo.htmlUrl !== '#'
          ? `${rt.selectedRepo.htmlUrl}.git`
          : `local://${rt.selectedRepo.fullName}`;
        if (args.includes('-v')) {
          return ok(`origin  ${url} (fetch)\norigin  ${url} (push)`);
        }
        return ok('origin');
      }

      if (sub === 'rev-parse') {
        if (args.includes('--abbrev-ref')) return ok(rt.activeBranch);
        const head = rt.commits[0];
        if (!head) return ok('HEAD');
        return ok(args.includes('--short') ? head.shortId : head.id);
      }

      if (sub === 'show') {
        const sha = args[1] && args[1] !== 'HEAD' ? args[1] : null;
        const c = sha
          ? rt.commits.find((cm) => cm.shortId.startsWith(sha) || cm.id.startsWith(sha))
          : rt.commits[0];
        if (!c) return fail(`fatal: bad object ${sha || 'HEAD'}`);
        return ok(
          [
            `commit ${c.id}`,
            `Author: ${c.author.name} <${c.author.email}>`,
            `Date:   ${new Date(c.timestamp).toLocaleString()}`,
            `Branch: ${c.branch}`,
            `Files changed: ${c.filesChanged}`,
            '',
            `    ${c.message}`,
          ].join('\n')
        );
      }

      if (sub === 'log') {
        let limit = 15;
        let oneline = args.includes('--oneline');
        let grepQuery = '';

        for (let i = 1; i < args.length; i++) {
          if (args[i] === '-n' && args[i + 1]) {
            const p = parseInt(args[++i], 10);
            if (!Number.isNaN(p) && p > 0) limit = p;
          } else if (/^-\d+$/.test(args[i])) {
            limit = parseInt(args[i].slice(1), 10);
          } else if (args[i].startsWith('--grep=')) {
            grepQuery = args[i].slice(7).toLowerCase();
          }
        }

        const matching = grepQuery
          ? rt.commits.filter((c) => c.message.toLowerCase().includes(grepQuery))
          : rt.commits;
        const shown = matching.slice(0, limit);
        if (shown.length === 0) return ok('(No matching commits recorded)');

        if (oneline) {
          return ok(shown.map((c) => `${c.shortId} ${c.message}`).join('\n'));
        }
        const out: string[] = [];
        shown.forEach((c) => {
          out.push(
            `commit ${c.shortId} (${c.branch})`,
            `Author: ${c.author.name} <${c.author.email}>`,
            `Date:   ${new Date(c.timestamp).toLocaleString()}`,
            `    ${c.message}`,
            ''
          );
        });
        if (matching.length > limit) {
          out.push(`... and ${matching.length - limit} more commits. (Use 'git log -n ${matching.length}' to show all)`);
        }
        return ok(out.join('\n'));
      }

      if (sub === 'reset') {
        let mode: 'soft' | 'mixed' | 'hard' = 'mixed';
        let count = 1;
        let forcePush = false;

        for (const a of args.slice(1)) {
          if (a === '--soft') mode = 'soft';
          else if (a === '--hard') mode = 'hard';
          else if (a === '--mixed') mode = 'mixed';
          else if (a === '--force' || a === '-f') forcePush = true;
          else if (/^HEAD~\d+$/i.test(a)) {
            const num = parseInt(a.replace(/head~/i, ''), 10);
            if (!Number.isNaN(num) && num > 0) count = num;
          } else if (a.startsWith('~')) {
            const num = parseInt(a.slice(1), 10);
            if (!Number.isNaN(num) && num > 0) count = num;
          } else if (/^\d+$/.test(a)) {
            count = parseInt(a, 10);
          } else if (!a.startsWith('-')) {
            const idx = rt.commits.findIndex((c) => c.shortId.startsWith(a) || c.id.startsWith(a));
            if (idx >= 0) count = idx + 1;
          }
        }

        if (rt.onGitReset) {
          try {
            await rt.onGitReset(mode, count, forcePush);
            const target = rt.commits[count] || rt.commits[rt.commits.length - 1];
            const targetMsg = target
              ? `HEAD is now at ${target.shortId} ${target.message}`
              : `HEAD is now at HEAD~${count}`;
            return ok(
              [
                targetMsg,
                mode === 'soft'
                  ? `✔ Workspace files preserved (${Object.keys(workingFiles).length} files staged from ${count} commit(s)).`
                  : mode === 'hard'
                  ? '✔ Workspace tree reset to target commit.'
                  : '✔ Unstaged changes in working tree.',
              ].join('\n')
            );
          } catch (e: any) {
            return fail(`fatal: git reset error: ${e.message}`);
          }
        }
        return ok(`git: reset executed for ${count} commit(s).`);
      }

      if (sub === 'commit') {
        let message = '';
        const mIdx = args.indexOf('-m');
        if (mIdx !== -1 && args[mIdx + 1]) {
          message = args[mIdx + 1];
        } else {
          message = 'Update workspace changes';
        }
        if (rt.onCommit) {
          try {
            await rt.onCommit(message);
            return ok(`[${rt.activeBranch}] Committed "${message}"`);
          } catch (e: any) {
            return fail(`fatal: commit failed: ${e.message}`);
          }
        }
        return ok(`git commit: "${message}"`);
      }

      if (sub === 'push') {
        return ok(`Everything up-to-date on branch '${rt.activeBranch}'.`);
      }

      return fail(`git: '${sub}' is not supported. Type 'help git' for supported subcommands.`);
    }

    default:
      return fail(`bash: ${cmdRaw}: command not found. Type 'help' for available commands.`, 127);
  }
}

/**
 * Provides bash-style Tab autocomplete for command names or workspace paths.
 */
export function getAutocompleteSuggestions(
  input: string,
  cwd: string,
  files: Record<string, VFile>
): { completedInput: string | null; candidates: string[] } {
  // Find the active word at the end of the input
  const match = input.match(/(?:^|\s)([^\s]*)$/);
  if (!match) return { completedInput: null, candidates: [] };
  const partial = match[1];
  const prefixBefore = input.slice(0, input.length - partial.length);
  const beforeTrimmed = prefixBefore.trim();

  const isCommandPosition =
    beforeTrimmed === '' ||
    beforeTrimmed.endsWith('&&') ||
    beforeTrimmed.endsWith('||') ||
    beforeTrimmed.endsWith(';') ||
    beforeTrimmed.endsWith('|');

  if (isCommandPosition) {
    const matches = KNOWN_COMMANDS.filter((c) => c.startsWith(partial.toLowerCase())).sort();
    if (matches.length === 1) {
      return { completedInput: `${prefixBefore}${matches[0]} `, candidates: [] };
    }
    if (matches.length > 1) {
      const common = longestCommonPrefix(matches);
      return {
        completedInput: common.length > partial.length ? `${prefixBefore}${common}` : null,
        candidates: matches,
      };
    }
    return { completedInput: null, candidates: [] };
  }

  // Path completion relative to cwd
  const lastSlash = partial.lastIndexOf('/');
  const dirPart = lastSlash >= 0 ? partial.slice(0, lastSlash) : '';
  const namePrefix = lastSlash >= 0 ? partial.slice(lastSlash + 1) : partial;
  const targetDir = dirPart ? resolveVirtualPath(cwd, dirPart) : cwd;

  const children = listDirectChildren(files, targetDir, true);
  const matchingEntries = children
    .filter((c) => c.name.startsWith(namePrefix))
    .map((c) => (c.isDir ? `${c.name}/` : c.name));

  if (matchingEntries.length === 1) {
    const replacement = dirPart ? `${dirPart}/${matchingEntries[0]}` : matchingEntries[0];
    const trailingSpace = matchingEntries[0].endsWith('/') ? '' : ' ';
    return { completedInput: `${prefixBefore}${replacement}${trailingSpace}`, candidates: [] };
  }

  if (matchingEntries.length > 1) {
    const common = longestCommonPrefix(matchingEntries);
    const replacement = dirPart ? `${dirPart}/${common}` : common;
    return {
      completedInput: common.length > namePrefix.length ? `${prefixBefore}${replacement}` : null,
      candidates: matchingEntries,
    };
  }

  return { completedInput: null, candidates: [] };
}

function longestCommonPrefix(items: string[]): string {
  if (items.length === 0) return '';
  let prefix = items[0];
  for (let i = 1; i < items.length; i++) {
    while (!items[i].startsWith(prefix) && prefix.length > 0) {
      prefix = prefix.slice(0, -1);
    }
  }
  return prefix;
}
