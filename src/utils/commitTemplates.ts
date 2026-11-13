/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FileDiff, GitCommit } from './gitService';

export interface CommitTypeInfo {
  type: string;
  label: string;
  description: string;
  defaultAction: string;
}

export interface CommitTemplatePreset {
  id: string;
  label: string;
  type: string;
  scope?: string;
  action?: string;
  description?: string;
  isCustom?: boolean;
}

export const CONVENTIONAL_COMMIT_TYPES: CommitTypeInfo[] = [
  { type: 'fix', label: 'fix', description: 'Bug fix', defaultAction: 'update' },
  { type: 'feat', label: 'feat', description: 'New feature', defaultAction: 'add' },
  { type: 'refactor', label: 'refactor', description: 'Code refactor', defaultAction: '' },
  { type: 'perf', label: 'perf', description: 'Performance', defaultAction: 'optimize' },
  { type: 'style', label: 'style', description: 'UI / formatting', defaultAction: 'update' },
  { type: 'docs', label: 'docs', description: 'Documentation', defaultAction: 'update' },
  { type: 'test', label: 'test', description: 'Tests', defaultAction: 'add' },
  { type: 'build', label: 'build', description: 'Build / Gradle', defaultAction: 'update' },
  { type: 'chore', label: 'chore', description: 'Maintenance', defaultAction: 'update' },
  { type: 'ci', label: 'ci', description: 'CI / Workflow', defaultAction: 'update' },
];

export const COMMIT_ACTION_VERBS = [
  'update',
  'add',
  'fix',
  'improve',
  'simplify',
  'remove',
  'optimize',
  '',
] as const;

export const DEFAULT_COMMIT_TEMPLATES: CommitTemplatePreset[] = [
  {
    id: 'fix-playback-update',
    label: 'fix(playback): update ...',
    type: 'fix',
    scope: 'playback',
    action: 'update',
    description: 'Update playback fix',
  },
  {
    id: 'refactor-playback',
    label: 'refactor(playback): ...',
    type: 'refactor',
    scope: 'playback',
    action: '',
    description: 'Refactor playback implementation',
  },
  {
    id: 'feat-scope-add',
    label: 'feat(ui): add ...',
    type: 'feat',
    scope: 'ui',
    action: 'add',
    description: 'Add a new UI capability',
  },
  {
    id: 'fix-ui-fix',
    label: 'fix(ui): fix ...',
    type: 'fix',
    scope: 'ui',
    action: 'fix',
    description: 'Resolve a UI or layout issue',
  },
  {
    id: 'refactor-core',
    label: 'refactor(core): simplify ...',
    type: 'refactor',
    scope: 'core',
    action: 'simplify',
    description: 'Clean up or restructure logic',
  },
  {
    id: 'perf-optimize',
    label: 'perf(playback): optimize ...',
    type: 'perf',
    scope: 'playback',
    action: 'optimize',
    description: 'Boost performance or reduce work',
  },
  {
    id: 'chore-deps',
    label: 'chore(deps): update ...',
    type: 'chore',
    scope: 'deps',
    action: 'update',
    description: 'Bump libraries or dependencies',
  },
  {
    id: 'docs-update',
    label: 'docs(readme): update ...',
    type: 'docs',
    scope: 'readme',
    action: 'update',
    description: 'Update documentation',
  },
];

const STORAGE_KEY = 'zipstudio_custom_commit_templates_v1';

/**
 * Formats a conventional commit template prefix, ready for the user to finish typing the summary.
 * Example:
 *  formatCommitTemplate({ type: 'fix', scope: 'playback', action: 'update' }) => 'fix(playback): update '
 *  formatCommitTemplate({ type: 'refactor', scope: 'playback' }) => 'refactor(playback): '
 */
export function formatCommitTemplate({
  type,
  scope = '',
  action = '',
  summary = '',
}: {
  type: string;
  scope?: string;
  action?: string;
  summary?: string;
}): string {
  const cleanType = type.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'chore';
  const cleanScope = scope.trim().replace(/[():]/g, '');
  const cleanAction = action.trim();
  const cleanSummary = summary.trim();

  const header = cleanScope ? `${cleanType}(${cleanScope}):` : `${cleanType}:`;
  const parts = [header];
  if (cleanAction) parts.push(cleanAction);
  if (cleanSummary) {
    parts.push(cleanSummary);
    return parts.join(' ');
  }
  return `${parts.join(' ')} `;
}

/**
 * Applies a formatted commit template prefix to an existing commit message:
 * - If the input is empty, returns the template prefix directly.
 * - If the input already starts with a conventional prefix (`type(scope): ` or `type: `),
 *   swaps the prefix while preserving any custom description the user already wrote.
 * - Otherwise prepends the template prefix before the user's text.
 */
export function applyCommitTemplateToMessage(
  currentMessage: string,
  templatePrefix: string
): string {
  const trimmedCurrent = currentMessage.trim();
  if (!trimmedCurrent) {
    return templatePrefix;
  }

  const normalizedPrefix = templatePrefix.endsWith(' ') ? templatePrefix : `${templatePrefix} `;

  // If the current box only contains a template header + optional verb (e.g. "fix(ui): update "),
  // replace it cleanly instead of stacking prefixes.
  const onlyPrefixMatch = trimmedCurrent.match(
    /^[a-z0-9_-]+(?:\([^)]*\))?:\s*(?:update|add|fix|improve|simplify|remove|optimize)?$/i
  );
  if (onlyPrefixMatch) {
    return normalizedPrefix;
  }

  // If user already wrote `type(scope): some description`, replace just `type(scope): ` header
  // unless user chose a brand new action verb and current text has no action yet.
  const existingConvMatch = currentMessage.match(/^([a-z0-9_-]+(?:\([^)]*\))?:\s*)(.+)$/is);
  if (existingConvMatch) {
    const rest = existingConvMatch[2].trimStart();
    const headerMatch = normalizedPrefix.match(/^([a-z0-9_-]+(?:\([^)]*\))?:\s*)(.*)$/is);
    if (headerMatch) {
      return `${headerMatch[1]}${rest}`;
    }
  }

  return `${normalizedPrefix}${trimmedCurrent}`;
}

/**
 * Extracts relevant scope suggestions from modified diffs, recent commit history, and common defaults.
 */
export function extractSuggestedScopes(
  diffs: FileDiff[] = [],
  commits: GitCommit[] = []
): string[] {
  const counts = new Map<string, number>();

  const addScope = (raw: string, weight = 1) => {
    const clean = raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '');
    if (!clean || clean.length < 2 || clean.length > 24) return;
    if (['src', 'app', 'main', 'java', 'kotlin', 'com', 'org', 'net', 'lib', 'utils', 'components'].includes(clean)) {
      return;
    }
    counts.set(clean, (counts.get(clean) || 0) + weight);
  };

  // 1. Recent commit scopes get high priority (matches repo conventions like `playback`, `bottomsheet`, etc.)
  for (const commit of commits.slice(0, 60)) {
    const firstLine = (commit.message || '').split('\n')[0];
    const match = firstLine.match(/^[a-z0-9_-]+\(([^)]+)\):/i);
    if (match && match[1]) {
      for (const part of match[1].split(',')) {
        addScope(part, 3);
      }
    }
  }

  // 2. Modified file paths suggest likely scopes
  for (const diff of diffs) {
    const segments = diff.path.split('/').filter(Boolean);
    for (let i = 0; i < segments.length - 1; i++) {
      addScope(segments[i], 2);
    }
    const fileName = segments[segments.length - 1] || '';
    const baseName = fileName.replace(/\.[^.]+$/, '');
    if (baseName) {
      addScope(baseName, 1);
    }
  }

  // 3. Common sensible defaults
  const fallbacks = ['playback', 'ui', 'audio', 'editor', 'search', 'terminal', 'git', 'core', 'deps'];
  for (const fb of fallbacks) {
    if (!counts.has(fb)) {
      counts.set(fb, 0);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([scope]) => scope)
    .slice(0, 12);
}

/**
 * Loads user-saved custom commit templates safely from localStorage.
 */
export function loadCustomCommitTemplates(): CommitTemplatePreset[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.type === 'string' && typeof item.id === 'string')
      .map((item) => ({ ...item, isCustom: true }));
  } catch {
    return [];
  }
}

/**
 * Persists user-saved custom commit templates safely to localStorage.
 */
export function saveCustomCommitTemplates(templates: CommitTemplatePreset[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // Ignore storage quota or private browsing errors
  }
}
