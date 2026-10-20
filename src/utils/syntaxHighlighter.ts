/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Prism from 'prismjs';

// Import essential Prism grammars for syntax highlighting
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';

/**
 * Maps high-level detected language IDs to Prism grammar keys.
 */
function getPrismLanguageKey(language: string): string {
  const normalized = language.toLowerCase();
  switch (normalized) {
    case 'js':
    case 'javascript':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'ts':
    case 'typescript':
    case 'mts':
      return 'typescript';
    case 'jsx':
      return 'jsx';
    case 'tsx':
      return 'tsx';
    case 'html':
    case 'htm':
    case 'xml':
    case 'svg':
      return 'markup';
    case 'css':
      return 'css';
    case 'scss':
    case 'sass':
    case 'less':
      return 'scss';
    case 'json':
    case 'json5':
    case 'jsonc':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'py':
    case 'python':
      return 'python';
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'shell':
      return 'bash';
    case 'sql':
      return 'sql';
    case 'yml':
    case 'yaml':
      return 'yaml';
    case 'java':
      return 'java';
    case 'kt':
    case 'kotlin':
    case 'kts':
      return 'kotlin';
    case 'rs':
    case 'rust':
      return 'rust';
    case 'c':
      return 'c';
    case 'cpp':
    case 'c++':
      return 'cpp';
    case 'cs':
    case 'csharp':
    case 'c#':
      return 'csharp';
    case 'go':
    case 'golang':
      return 'go';
    case 'dockerfile':
      return 'bash';
    case 'git':
    case 'dotenv':
    case 'properties':
    case 'toml':
    case 'ini':
      return 'yaml';
    default:
      return 'markup';
  }
}

/**
 * Escapes raw HTML characters for fallback or non-tokenized text.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Highlights a string of source code using PrismJS.
 * Returns highlighted HTML string.
 */
export function highlightCode(code: string, language: string): string {
  if (!code) return '';

  const prismLang = getPrismLanguageKey(language);
  const grammar = Prism.languages[prismLang];

  if (!grammar) {
    return escapeHtml(code);
  }

  try {
    return Prism.highlight(code, grammar, prismLang);
  } catch (err) {
    console.warn(`Prism highlighting failed for ${language}:`, err);
    return escapeHtml(code);
  }
}
