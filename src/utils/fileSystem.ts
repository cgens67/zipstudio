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
  switch (ext) {
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
    case 'scss':
    case 'less':
      return 'css';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'ts':
    case 'mts':
      return 'typescript';
    case 'jsx':
      return 'jsx';
    case 'tsx':
      return 'tsx';
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'svg':
    case 'xml':
      return 'xml';
    case 'py':
      return 'python';
    case 'yml':
    case 'yaml':
      return 'yaml';
    case 'sh':
    case 'bash':
      return 'bash';
    default:
      return 'plaintext';
  }
}

/**
 * Checks if a file path is a binary asset (image, font, audio, etc.).
 */
export function isBinaryExtension(ext: string): boolean {
  const binaryExts = [
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'tiff',
    'woff', 'woff2', 'ttf', 'otf', 'eot',
    'mp3', 'wav', 'ogg', 'mp4', 'webm',
    'pdf', 'zip', 'gz', 'tar'
  ];
  return binaryExts.includes(ext);
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

    files[normalizedPath] = {
      path: normalizedPath,
      name: getFileName(normalizedPath),
      content,
      isBinary,
      size,
      lastModified: zipEntry.date.getTime() || Date.now(),
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
 * Returns MIME type based on extension.
 */
export function getMimeType(ext: string): string {
  switch (ext) {
    case 'html':
    case 'htm':
      return 'text/html';
    case 'css':
      return 'text/css';
    case 'js':
    case 'mjs':
      return 'application/javascript';
    case 'json':
      return 'application/json';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'webp':
      return 'image/webp';
    case 'ico':
      return 'image/x-icon';
    case 'woff':
      return 'font/woff';
    case 'woff2':
      return 'font/woff2';
    case 'ttf':
      return 'font/ttf';
    default:
      return 'text/plain';
  }
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
