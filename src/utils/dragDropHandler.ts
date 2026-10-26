/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VFile, normalizePath, getFileName, getFileExtension, isBinaryExtension, getMimeType, extractZipInBrowser } from './fileSystem';

export interface DragDropResult {
  files: Record<string, VFile>;
  zipCount: number;
  folderCount: number;
  fileCount: number;
  totalSize: number;
}

/**
 * Reads a browser File object and returns a VFile with normalized content.
 */
async function fileToVFile(file: File, relativePath: string): Promise<VFile> {
  const normalized = normalizePath(relativePath || file.name);
  const ext = getFileExtension(normalized);
  const isBinary = isBinaryExtension(ext);
  const fileName = getFileName(normalized);

  let content = '';
  if (isBinary) {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const mime = getMimeType(ext);
    content = `data:${mime};base64,${base64}`;
  } else {
    content = await file.text();
  }

  let mode = '100644';
  if (fileName === 'gradlew' || normalized.endsWith('.sh') || normalized.endsWith('.bash')) {
    mode = '100755';
  }

  return {
    path: normalized,
    name: fileName,
    content,
    isBinary,
    size: file.size,
    lastModified: file.lastModified || Date.now(),
    mode,
  };
}

/**
 * Recursively traverses a FileSystemDirectoryEntry and collects all nested files.
 */
async function traverseDirectoryEntry(
  dirEntry: any,
  currentPath: string
): Promise<VFile[]> {
  const files: VFile[] = [];

  const readEntries = (reader: any): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      reader.readEntries((entries: any[]) => resolve(entries), reject);
    });
  };

  const dirReader = dirEntry.createReader();
  let entries: any[] = [];
  let readBatch = await readEntries(dirReader);

  // Chrome reads directory entries in chunks of 100, so we must loop until empty
  while (readBatch.length > 0) {
    entries = entries.concat(readBatch);
    readBatch = await readEntries(dirReader);
  }

  for (const entry of entries) {
    // Skip system/hidden metadata
    if (entry.name === '.DS_Store' || entry.name === '__MACOSX' || entry.name.startsWith('._')) {
      continue;
    }

    const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

    if (entry.isFile) {
      const file: File = await new Promise((resolve, reject) => {
        entry.file(resolve, reject);
      });

      // If a nested zip is found inside a folder
      if (file.name.toLowerCase().endsWith('.zip')) {
        try {
          const extracted = await extractZipInBrowser(file);
          for (const [subPath, vfile] of Object.entries(extracted)) {
            const fullSubPath = `${nextPath.replace(/\.zip$/i, '')}/${subPath}`;
            files.push({
              ...vfile,
              path: fullSubPath,
            });
          }
        } catch {
          // If unzip fails, fallback to importing as binary file
          const vfile = await fileToVFile(file, nextPath);
          files.push(vfile);
        }
      } else {
        const vfile = await fileToVFile(file, nextPath);
        files.push(vfile);
      }
    } else if (entry.isDirectory) {
      const subFiles = await traverseDirectoryEntry(entry, nextPath);
      files.push(...subFiles);
    }
  }

  return files;
}

/**
 * Processes dropped items from a DataTransfer event.
 * Handles:
 * 1. Folders dropped directly from OS (via webkitGetAsEntry)
 * 2. .zip files unpacked in-memory using JSZip
 * 3. Individual files or combinations of folders + files + zips
 */
export async function processDroppedDataTransfer(
  dataTransfer: DataTransfer
): Promise<DragDropResult> {
  const result: Record<string, VFile> = {};
  let zipCount = 0;
  let folderCount = 0;
  let fileCount = 0;
  let totalSize = 0;

  const items = dataTransfer.items;

  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind !== 'file') continue;

      const entry = (item as any).webkitGetAsEntry ? (item as any).webkitGetAsEntry() : null;

      if (entry && entry.isDirectory) {
        folderCount++;
        const dirFiles = await traverseDirectoryEntry(entry, entry.name);
        for (const vf of dirFiles) {
          result[vf.path] = vf;
          fileCount++;
          totalSize += vf.size;
        }
      } else {
        const file = item.getAsFile();
        if (!file) continue;

        if (file.name.toLowerCase().endsWith('.zip')) {
          zipCount++;
          try {
            const extracted = await extractZipInBrowser(file);
            for (const [path, vfile] of Object.entries(extracted)) {
              result[path] = vfile;
              fileCount++;
              totalSize += vfile.size;
            }
          } catch (err) {
            console.error('Failed to extract dropped zip:', err);
            const vf = await fileToVFile(file, file.name);
            result[vf.path] = vf;
            fileCount++;
            totalSize += vf.size;
          }
        } else {
          fileCount++;
          const vf = await fileToVFile(file, file.name);
          result[vf.path] = vf;
          totalSize += vf.size;
        }
      }
    }
  } else if (dataTransfer.files && dataTransfer.files.length > 0) {
    // Fallback if dataTransfer.items is unavailable
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const file = dataTransfer.files[i];
      if (file.name.toLowerCase().endsWith('.zip')) {
        zipCount++;
        try {
          const extracted = await extractZipInBrowser(file);
          for (const [path, vfile] of Object.entries(extracted)) {
            result[path] = vfile;
            fileCount++;
            totalSize += vfile.size;
          }
        } catch {
          const vf = await fileToVFile(file, file.name);
          result[vf.path] = vf;
          fileCount++;
          totalSize += vf.size;
        }
      } else {
        fileCount++;
        const vf = await fileToVFile(file, file.name);
        result[vf.path] = vf;
        totalSize += vf.size;
      }
    }
  }

  return {
    files: result,
    zipCount,
    folderCount,
    fileCount,
    totalSize,
  };
}
