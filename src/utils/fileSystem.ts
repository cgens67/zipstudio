/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';

export interface VFile {
  path: string;
  name: string;
  content: string; // text content or data URL for binaries
  isBinary: boolean;
  size: number;
  lastModified: number;
  mode?: string; // Git mode ('100644' or '100755')
  sha?: string;
}

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  children?: FileTreeNode[];
  file?: VFile;
}

/**
 * Normalizes a file path to use forward slashes and removes leading slashes.
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').trim();
}

/**
 * Gets the parent folder path from a normalized path.
 */
export function getParentPath(path: string): string {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash === -1) return '';
  return normalized.substring(0, lastSlash);
}

/**
 * Gets file name from path.
 */
export function getFileName(path: string): string {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash === -1) return normalized;
  return normalized.substring(lastSlash + 1);
}

/**
 * Gets file extension in lowercase without the dot.
 */
export function getFileExtension(path: string): string {
  const name = getFileName(path);
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === 0) return '';
  return name.substring(dotIndex + 1).toLowerCase();
}

/**
 * Detects language syntax for a given extension.
 */
export function getLanguageFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'html':
    case 'htm':
    case 'xhtml':
      return 'html';
    case 'css':
      return 'css';
    case 'scss':
    case 'sass':
      return 'scss';
    case 'less':
      return 'less';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'ts':
    case 'mts':
    case 'cts':
      return 'typescript';
    case 'jsx':
      return 'jsx';
    case 'tsx':
      return 'tsx';
    case 'json':
    case 'json5':
    case 'jsonc':
    case 'map':
      return 'json';
    case 'md':
    case 'markdown':
    case 'mdown':
    case 'mkd':
      return 'markdown';
    case 'svg':
      return 'svg';
    case 'xml':
    case 'xaml':
    case 'plist':
    case 'atom':
    case 'rss':
      return 'xml';
    case 'py':
    case 'pyw':
    case 'pyx':
      return 'python';
    case 'java':
      return 'java';
    case 'kt':
    case 'kts':
      return 'kotlin';
    case 'c':
    case 'h':
      return 'c';
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'hpp':
    case 'hh':
    case 'hxx':
      return 'cpp';
    case 'cs':
      return 'csharp';
    case 'go':
      return 'go';
    case 'rs':
      return 'rust';
    case 'php':
    case 'phtml':
      return 'php';
    case 'rb':
    case 'erb':
      return 'ruby';
    case 'swift':
      return 'swift';
    case 'dart':
      return 'dart';
    case 'lua':
      return 'lua';
    case 'r':
    case 'rmd':
      return 'r';
    case 'sql':
      return 'sql';
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'fish':
      return 'bash';
    case 'bat':
    case 'cmd':
      return 'batch';
    case 'ps1':
    case 'psm1':
      return 'powershell';
    case 'yml':
    case 'yaml':
      return 'yaml';
    case 'toml':
      return 'toml';
    case 'ini':
    case 'cfg':
    case 'conf':
    case 'properties':
      return 'properties';
    case 'gradle':
      return 'gradle';
    case 'vue':
      return 'vue';
    case 'svelte':
      return 'svelte';
    case 'astro':
      return 'astro';
    case 'graphql':
    case 'gql':
      return 'graphql';
    case 'csv':
      return 'csv';
    case 'tsv':
      return 'tsv';
    case 'log':
      return 'log';
    case 'txt':
    case 'text':
    case 'unknown':
      return 'plaintext';
    default:
      return ext ? ext.toLowerCase() : 'plaintext';
  }
}

/**
 * Accurately detects language syntax for any file path or filename,
 * including dotfiles (.gitignore, .env) and extensionless files (Dockerfile, Makefile).
 */
export function getLanguageFromFile(pathOrName: string): string {
  const fileName = getFileName(pathOrName).toLowerCase();

  // Special filename checks
  if (fileName.startsWith('dockerfile')) return 'dockerfile';
  if (fileName.startsWith('makefile') || fileName === 'gnumakefile') return 'makefile';
  if (fileName === 'jenkinsfile') return 'groovy';
  if (fileName === 'procfile') return 'procfile';
  if (fileName === 'gemfile' || fileName === 'rakefile') return 'ruby';
  if (fileName === 'cmakelists.txt') return 'cmake';
  if (fileName === 'cargo.toml') return 'toml';
  if (fileName === 'license' || fileName === 'licence' || fileName === 'copying') return 'markdown';

  // Dotfiles
  if (fileName === '.gitignore' || fileName === '.gitattributes' || fileName === '.gitmodules' || fileName === '.gitkeep') {
    return 'git';
  }
  if (fileName.startsWith('.env')) return 'dotenv';
  if (fileName === '.editorconfig') return 'editorconfig';
  if (fileName === '.prettierrc' || fileName === '.eslintrc' || fileName === '.babelrc') return 'json';

  const ext = getFileExtension(fileName);
  return getLanguageFromExt(ext);
}

/**
 * MIME type mapping for web assets, media, fonts, and documents.
 */
export function getMimeType(ext: string): string {
  switch (ext.toLowerCase()) {
    // Fonts
    case 'ttf':
      return 'font/ttf';
    case 'otf':
      return 'font/otf';
    case 'woff':
      return 'font/woff';
    case 'woff2':
      return 'font/woff2';
    case 'eot':
      return 'application/vnd.ms-fontobject';

    // Audio
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'ogg':
    case 'oga':
      return 'audio/ogg';
    case 'aac':
      return 'audio/aac';
    case 'flac':
      return 'audio/flac';
    case 'm4a':
      return 'audio/mp4';

    // Video
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mkv':
      return 'video/x-matroska';
    case 'ogv':
      return 'video/ogg';

    // Images
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'ico':
      return 'image/x-icon';
    case 'bmp':
      return 'image/bmp';

    // Web text & scripts
    case 'html':
    case 'htm':
      return 'text/html';
    case 'css':
      return 'text/css';
    case 'js':
    case 'mjs':
      return 'application/javascript';
    case 'xml':
      return 'application/xml';
    case 'txt':
      return 'text/plain';

    // Documents & Archives & Binaries
    case 'pdf':
      return 'application/pdf';
    case 'zip':
      return 'application/zip';
    case 'jar':
      return 'application/java-archive';
    case 'war':
    case 'ear':
      return 'application/java-archive';
    case 'apk':
      return 'application/vnd.android.package-archive';
    case 'aab':
    case 'apks':
    case 'xapk':
      return 'application/octet-stream';
    case 'dex':
      return 'application/octet-stream';
    case 'so':
    case 'dylib':
    case 'dll':
      return 'application/octet-stream';
    case 'db':
    case 'sqlite':
    case 'sqlite3':
      return 'application/x-sqlite3';
    case 'tar':
      return 'application/x-tar';
    case 'gz':
      return 'application/gzip';
    case '7z':
      return 'application/x-7z-compressed';
    case 'json':
      return 'application/json';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Checks if a file path is a font asset.
 */
export function isFontExtension(ext: string): boolean {
  return ['ttf', 'otf', 'woff', 'woff2', 'eot'].includes(ext.toLowerCase());
}

/**
 * Checks if a file path is an audio asset.
 */
export function isAudioExtension(ext: string): boolean {
  return ['mp3', 'wav', 'ogg', 'oga', 'aac', 'flac', 'm4a', 'opus'].includes(ext.toLowerCase());
}

/**
 * Checks if a file path is a video asset.
 */
export function isVideoExtension(ext: string): boolean {
  return ['mp4', 'webm', 'mkv', 'ogv', 'mov', 'avi'].includes(ext.toLowerCase());
}

/**
 * Checks if a file path is an image asset.
 */
export function isImageExtension(ext: string): boolean {
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'tiff', 'cur'].includes(ext.toLowerCase());
}

/**
 * Checks if a file path is a binary asset (image, font, audio, video, archive, compiled code, etc.).
 */
export function isBinaryExtension(ext: string): boolean {
  const binaryExts = [
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'tiff', 'cur',
    'woff', 'woff2', 'ttf', 'otf', 'eot',
    'mp3', 'wav', 'ogg', 'oga', 'aac', 'flac', 'm4a', 'opus',
    'mp4', 'webm', 'mkv', 'ogv', 'mov', 'avi',
    'pdf', 'zip', 'gz', 'tar', 'bz2', 'xz', '7z', 'rar',
    'jar', 'war', 'ear', 'apk', 'aab', 'apks', 'xapk', 'class', 'so', 'dylib', 'dll', 'exe', 'bin', 'dex',
    'dat', 'db', 'sqlite', 'sqlite3', 'o', 'obj', 'lib', 'a', 'pak', 'arsc', 'flat', 'node'
  ];
  return binaryExts.includes(ext.toLowerCase());
}

/**
 * Builds a hierarchical tree from a flat list of virtual files.
 */
export function buildFileTree(files: Record<string, VFile>): FileTreeNode[] {
  const rootNodes: Record<string, FileTreeNode> = {};

  const ensureFolderNode = (folderPath: string): FileTreeNode => {
    const normalized = normalizePath(folderPath);
    if (!normalized) {
      throw new Error('Empty folder path');
    }
    if (rootNodes[normalized]) {
      return rootNodes[normalized];
    }

    const parentPath = getParentPath(normalized);
    const node: FileTreeNode = {
      id: normalized,
      name: getFileName(normalized),
      path: normalized,
      isFolder: true,
      children: [],
    };
    rootNodes[normalized] = node;

    if (parentPath) {
      const parentNode = ensureFolderNode(parentPath);
      parentNode.children = parentNode.children || [];
      if (!parentNode.children.some((c) => c.path === node.path)) {
        parentNode.children.push(node);
      }
    }

    return node;
  };

  // Process all files
  const fileKeys = Object.keys(files).sort();
  for (const path of fileKeys) {
    const file = files[path];
    const normalized = normalizePath(path);
    const parentPath = getParentPath(normalized);

    const fileNode: FileTreeNode = {
      id: normalized,
      name: file.name,
      path: normalized,
      isFolder: false,
      file,
    };

    if (parentPath) {
      const parentNode = ensureFolderNode(parentPath);
      parentNode.children = parentNode.children || [];
      parentNode.children.push(fileNode);
    } else {
      rootNodes[normalized] = fileNode;
    }
  }

  // Filter top-level items (items without a parent in rootNodes)
  const result: FileTreeNode[] = [];
  for (const key of Object.keys(rootNodes)) {
    if (!getParentPath(key)) {
      result.push(rootNodes[key]);
    }
  }

  // Sort: folders first alphabetically, then files alphabetically
  const sortNodes = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    for (const node of nodes) {
      if (node.children) {
        sortNodes(node.children);
      }
    }
  };

  sortNodes(result);
  return result;
}

/**
 * Extracts a .zip file (ArrayBuffer or Blob) completely in the browser.
 */
export async function extractZipInBrowser(zipData: ArrayBuffer | Blob): Promise<Record<string, VFile>> {
  const zip = new JSZip();
  const loaded = await zip.loadAsync(zipData);
  const files: Record<string, VFile> = {};

  const entries = Object.entries(loaded.files);

  for (const [relativePath, zipEntry] of entries) {
    // Skip macOS metadata and directory entries
    if (zipEntry.dir || relativePath.startsWith('__MACOSX/') || relativePath.includes('/.DS_Store') || relativePath === '.DS_Store') {
      continue;
    }

    const normalizedPath = normalizePath(relativePath);
    const ext = getFileExtension(normalizedPath);
    const isBinary = isBinaryExtension(ext);

    let content = '';
    let size = 0;

    if (isBinary) {
      const base64 = await zipEntry.async('base64');
      const mime = getMimeType(ext);
      content = `data:${mime};base64,${base64}`;
      size = Math.round((base64.length * 3) / 4);
    } else {
      content = await zipEntry.async('text');
      size = new Blob([content]).size;
    }

    let mode = '100644';
    const fileName = getFileName(normalizedPath);
    if ((zipEntry as any).unixPermissions && ((zipEntry as any).unixPermissions & 0o111) !== 0) {
      mode = '100755';
    } else if (fileName === 'gradlew' || normalizedPath.endsWith('.sh') || normalizedPath.endsWith('.bash')) {
      mode = '100755';
    }

    files[normalizedPath] = {
      path: normalizedPath,
      name: fileName,
      content,
      isBinary,
      size,
      lastModified: zipEntry.date.getTime() || Date.now(),
      mode,
    };
  }

  return files;
}

/**
 * Packages the current virtual file system back into a .zip Blob.
 */
export async function packageZipFromFiles(files: Record<string, VFile>): Promise<Blob> {
  const zip = new JSZip();

  for (const [path, file] of Object.entries(files)) {
    if (file.isBinary && file.content.startsWith('data:')) {
      const commaIndex = file.content.indexOf(',');
      const base64 = file.content.substring(commaIndex + 1);
      zip.file(path, base64, { base64: true });
    } else {
      zip.file(path, file.content);
    }
  }

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}


/**
 * Generates an isolated HTML document for live preview, inlining relative CSS, JS, and image references.
 * Injects a lightweight console interceptor to report console logs back to the IDE terminal.
 */
export function generatePreviewHtml(files: Record<string, VFile>): string {
  // Find index.html or fallback to first html file or generate a placeholder
  let indexFile = files['index.html'] || files['public/index.html'] || files['src/index.html'];
  if (!indexFile) {
    const htmlKey = Object.keys(files).find((p) => p.endsWith('.html'));
    if (htmlKey) {
      indexFile = files[htmlKey];
    }
  }

  const consoleInterceptorScript = `
<script>
(function() {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalInfo = console.info;

  function safeStringify(arg) {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'object') {
      try { return JSON.stringify(arg); } catch (e) { return String(arg); }
    }
    return String(arg);
  }

  function sendToParent(type, args) {
    try {
      const message = Array.from(args).map(safeStringify).join(' ');
      window.parent.postMessage({
        type: 'PREVIEW_CONSOLE_LOG',
        logType: type,
        message: message,
        timestamp: Date.now()
      }, '*');
    } catch(e) {}
  }

  console.log = function() { sendToParent('log', arguments); originalLog.apply(console, arguments); };
  console.warn = function() { sendToParent('warn', arguments); originalWarn.apply(console, arguments); };
  console.error = function() { sendToParent('error', arguments); originalError.apply(console, arguments); };
  console.info = function() { sendToParent('info', arguments); originalInfo.apply(console, arguments); };

  window.addEventListener('error', function(e) {
    sendToParent('error', [e.message + ' at ' + (e.filename || 'script') + ':' + e.lineno]);
  });
  window.addEventListener('unhandledrejection', function(e) {
    sendToParent('error', ['Unhandled Promise Rejection: ' + (e.reason ? (e.reason.message || String(e.reason)) : 'unknown')]);
  });
})();
</script>
`;

  if (!indexFile) {
    // Generate a default preview if no HTML is present
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Preview</title>
  ${consoleInterceptorScript}
  <style>
    body { font-family: system-ui, sans-serif; background: #18191c; color: #e2e2e6; padding: 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; text-align: center; }
    .card { background: #2b2d30; padding: 2rem; border-radius: 16px; border: 1px solid #43474e; max-width: 500px; }
    h1 { color: #a8c7fa; font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #c4c6d0; font-size: 0.95rem; }
    code { background: #121316; padding: 0.2rem 0.5rem; border-radius: 4px; color: #a8c7fa; }
  </style>
</head>
<body>
  <div class="card">
    <h1>No index.html detected</h1>
    <p>This project currently has no <code>index.html</code> entry point. Create one or select a file to view.</p>
  </div>
</body>
</html>`;
  }

  let html = indexFile.content;

  // Resolve relative CSS links: <link rel="stylesheet" href="...">
  html = html.replace(/<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi, (match, href) => {
    const cleanHref = normalizePath(href.replace(/^\.\//, ''));
    if (files[cleanHref]) {
      return `<style>/* inlined ${cleanHref} */\n${files[cleanHref].content}</style>`;
    }
    return match;
  });

  // Resolve relative JS scripts: <script src="...">
  html = html.replace(/<script\s+[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (match, src) => {
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
      return match;
    }
    const cleanSrc = normalizePath(src.replace(/^\.\//, ''));
    if (files[cleanSrc]) {
      return `<script>/* inlined ${cleanSrc} */\n${files[cleanSrc].content}\n</script>`;
    }
    return match;
  });

  // Resolve image tags: <img src="...">
  html = html.replace(/<img\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi, (match, before, src, after) => {
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('//')) {
      return match;
    }
    const cleanSrc = normalizePath(src.replace(/^\.\//, ''));
    if (files[cleanSrc]) {
      return `<img ${before}src="${files[cleanSrc].content}"${after}>`;
    }
    return match;
  });

  // Inject console interceptor into <head> or at top
  if (html.includes('<head>')) {
    html = html.replace('<head>', `<head>\n${consoleInterceptorScript}`);
  } else {
    html = `${consoleInterceptorScript}\n${html}`;
  }

  return html;
}

/**
 * Formats a file size into readable bytes, KB, or MB.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Packages a specific folder subtree into a .zip Blob.
 */
export async function packageSubtreeZip(files: Record<string, VFile>, folderPath: string): Promise<Blob> {
  const zip = new JSZip();
  const prefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;

  for (const [path, file] of Object.entries(files)) {
    if (path.startsWith(prefix)) {
      const relative = path.substring(prefix.length);
      if (file.isBinary && file.content.startsWith('data:')) {
        const commaIndex = file.content.indexOf(',');
        const base64 = file.content.substring(commaIndex + 1);
        zip.file(relative, base64, { base64: true });
      } else {
        zip.file(relative, file.content);
      }
    }
  }

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}
