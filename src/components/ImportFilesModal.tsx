/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  VFile,
  formatBytes,
  getFileExtension,
  getFileName,
  normalizePath,
  extractZipInBrowser,
} from '../utils/fileSystem';
import { convertFileToVFile } from '../utils/dragDropHandler';
import { M3Icon, M3IconButton, M3Badge, M3Button } from './M3Components';
import { Translations } from '../utils/i18n';
import { useDialogAnimation } from '../utils/useDialogAnimation';

// GitHub file limits
export const GITHUB_WEB_LIMIT_BYTES = 25 * 1024 * 1024; // 25 MB (GitHub Web UI & Contents API upload limit)
export const GITHUB_WARN_FILE_BYTES = 50 * 1024 * 1024; // 50 MB recommendation
export const GITHUB_HARD_LIMIT_BYTES = 100 * 1024 * 1024; // 100 MB Git push/blob hard limit

interface ImportFilesModalProps {
  isOpen: boolean;
  selectedFiles: File[];
  existingFiles: Record<string, VFile>;
  defaultDirectory?: string;
  onClose: () => void;
  onImport: (importedVFiles: VFile[], targetDir: string) => void;
  t: Translations;
}

export function ImportFilesModal({
  isOpen,
  selectedFiles,
  existingFiles,
  defaultDirectory = '',
  onClose,
  onImport,
  t,
}: ImportFilesModalProps) {
  const { isRendered, backdropClass, dialogClass, triggerClose } = useDialogAnimation(
    isOpen,
    onClose
  );

  const [filesToImport, setFilesToImport] = useState<File[]>([]);
  const [targetDir, setTargetDir] = useState('');
  const [limitMode, setLimitMode] = useState<'25mb' | '100mb'>('25mb');
  const [conflictStrategy, setConflictStrategy] = useState<'overwrite' | 'rename' | 'skip'>('overwrite');
  const [zipModes, setZipModes] = useState<Record<string, 'extract' | 'archive'>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });

  // Initialize modal state whenever it opens or files change
  useEffect(() => {
    if (isOpen) {
      setFilesToImport([...selectedFiles]);
      setTargetDir(defaultDirectory ? defaultDirectory.replace(/^\/+|\/+$/g, '') : '');
      setIsProcessing(false);
      setProcessingProgress({ current: 0, total: 0 });

      // Detect and initialize mode for any .zip files (defaulting to extract with interactive prompt)
      const initialZipModes: Record<string, 'extract' | 'archive'> = {};
      for (const f of selectedFiles) {
        if (getFileExtension(f.name).toLowerCase() === 'zip') {
          initialZipModes[f.name] = 'extract';
        }
      }
      setZipModes(initialZipModes);
    }
  }, [isOpen, selectedFiles, defaultDirectory]);

  // Extract all unique folder paths from existing workspace for quick suggestions
  const suggestedDirectories = useMemo(() => {
    const dirSet = new Set<string>();
    dirSet.add(''); // Root

    // Common sensible project directories
    dirSet.add('app/libs');
    dirSet.add('assets');
    dirSet.add('src');

    for (const filePath of Object.keys(existingFiles)) {
      const parts = filePath.split('/');
      if (parts.length > 1) {
        parts.pop(); // remove file name
        let accumulated = '';
        for (const p of parts) {
          accumulated = accumulated ? `${accumulated}/${p}` : p;
          dirSet.add(accumulated);
        }
      }
    }

    return Array.from(dirSet).slice(0, 8); // limit top suggestions
  }, [existingFiles]);

  // Analyze file sizes against GitHub 25MB (web) or 100MB (git) limits
  const fileAnalysis = useMemo(() => {
    let totalBytes = 0;
    let blockedCount = 0;
    let warnCount = 0;
    const maxAllowedBytes = limitMode === '25mb' ? GITHUB_WEB_LIMIT_BYTES : GITHUB_HARD_LIMIT_BYTES;

    const analyzed = filesToImport.map((file) => {
      totalBytes += file.size;
      const isBlocked = file.size > maxAllowedBytes;
      const isWarn = limitMode === '100mb' && !isBlocked && file.size > GITHUB_WARN_FILE_BYTES;

      if (isBlocked) blockedCount++;
      if (isWarn) warnCount++;

      const ext = getFileExtension(file.name).toLowerCase();
      let typeLabel = 'Asset';
      let icon = 'description';
      let badgeVariant: 'primary' | 'secondary' | 'success' | 'warning' | 'error' = 'secondary';

      if (ext === 'aar') {
        typeLabel = 'AAR Library';
        icon = 'android';
        badgeVariant = 'success';
      } else if (ext === 'apk' || ext === 'aab' || ext === 'xapk') {
        typeLabel = 'Android Package';
        icon = 'android';
        badgeVariant = 'success';
      } else if (['ttf', 'otf', 'woff', 'woff2', 'eot'].includes(ext)) {
        typeLabel = 'Font';
        icon = 'font_download';
        badgeVariant = 'primary';
      } else if (['ogg', 'mp3', 'wav', 'flac', 'aac', 'm4a', 'opus'].includes(ext)) {
        typeLabel = 'Audio';
        icon = 'audiotrack';
        badgeVariant = 'primary';
      } else if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'ico'].includes(ext)) {
        typeLabel = 'Image';
        icon = 'image';
        badgeVariant = 'secondary';
      } else if (['jar', 'war', 'ear', 'zip', 'tar', 'gz', '7z'].includes(ext)) {
        typeLabel = 'Archive';
        icon = 'inventory_2';
        badgeVariant = 'warning';
      } else if (['kt', 'java', 'ts', 'tsx', 'js', 'jsx', 'json', 'xml', 'gradle', 'kts'].includes(ext)) {
        typeLabel = 'Code';
        icon = 'code';
        badgeVariant = 'secondary';
      }

      // Check collision
      const cleanTarget = targetDir.trim().replace(/^\/+|\/+$/g, '');
      const potentialPath = cleanTarget ? `${cleanTarget}/${file.name}` : file.name;
      const collides = Boolean(existingFiles[potentialPath]);

      return {
        file,
        ext,
        typeLabel,
        icon,
        badgeVariant,
        isBlocked,
        isWarn,
        potentialPath,
        collides,
      };
    });

    return {
      analyzed,
      totalBytes,
      blockedCount,
      warnCount,
      validFilesCount: filesToImport.length - blockedCount,
    };
  }, [filesToImport, targetDir, existingFiles, limitMode]);

  const handleRemoveFile = (index: number) => {
    setFilesToImport((prev) => prev.filter((_, i) => i !== index));
  };

  const zipFiles = useMemo(() => {
    return filesToImport.filter((f) => getFileExtension(f.name).toLowerCase() === 'zip');
  }, [filesToImport]);

  const handleStartImport = async () => {
    const validItems = fileAnalysis.analyzed.filter((item) => !item.isBlocked);
    if (validItems.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: validItems.length });

    try {
      const convertedFiles: VFile[] = [];
      const cleanTarget = targetDir.trim().replace(/^\/+|\/+$/g, '');

      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        const isZip = item.ext === 'zip';
        const zipMode = zipModes[item.file.name] || 'extract';

        if (isZip && zipMode === 'extract') {
          // Extract internal files & folders from within the ZIP into destination directory
          const extracted = await extractZipInBrowser(item.file);
          for (const [relPath, extractedFile] of Object.entries(extracted)) {
            let finalPath = cleanTarget ? `${cleanTarget}/${relPath}` : relPath;
            finalPath = normalizePath(finalPath);

            // Handle collision strategy
            if (existingFiles[finalPath]) {
              if (conflictStrategy === 'skip') {
                continue;
              } else if (conflictStrategy === 'rename') {
                const ext = getFileExtension(finalPath);
                const baseName = finalPath.slice(0, -(ext ? ext.length + 1 : 0));
                let counter = 1;
                let candidate = `${baseName}_copy.${ext}`;
                while (existingFiles[candidate]) {
                  counter++;
                  candidate = `${baseName}_copy${counter}.${ext}`;
                }
                finalPath = candidate;
              }
            }

            convertedFiles.push({
              ...extractedFile,
              path: finalPath,
              name: getFileName(finalPath),
            });
          }
        } else {
          // Regular file or keep as standalone .zip archive
          let finalPath = cleanTarget ? `${cleanTarget}/${item.file.name}` : item.file.name;
          finalPath = normalizePath(finalPath);

          // Handle collision strategy
          if (existingFiles[finalPath]) {
            if (conflictStrategy === 'skip') {
              continue;
            } else if (conflictStrategy === 'rename') {
              const ext = getFileExtension(item.file.name);
              const baseName = item.file.name.slice(0, -(ext ? ext.length + 1 : 0));
              let counter = 1;
              let candidate = cleanTarget
                ? `${cleanTarget}/${baseName}_copy.${ext}`
                : `${baseName}_copy.${ext}`;
              while (existingFiles[candidate]) {
                counter++;
                candidate = cleanTarget
                  ? `${cleanTarget}/${baseName}_copy${counter}.${ext}`
                  : `${baseName}_copy${counter}.${ext}`;
              }
              finalPath = candidate;
            }
          }

          const vfile = await convertFileToVFile(item.file, finalPath);
          convertedFiles.push(vfile);
        }

        setProcessingProgress({ current: i + 1, total: validItems.length });
      }

      onImport(convertedFiles, cleanTarget);
      triggerClose();
    } catch (err) {
      console.error('Import processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isRendered) return null;

  return (
    <div
      onClick={triggerClose}
      className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 ${backdropClass}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-[#1e1f22] border border-[#d8dae5] dark:border-[#43474e]/60 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden ${dialogClass}`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#d8dae5] dark:border-[#43474e]/30 flex items-center justify-between shrink-0 bg-[#f8fafd] dark:bg-[#1e1f22]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e8ebf3] dark:bg-[#00468b]/30 border border-[#0b57d0]/20 dark:border-[#a8c7fa]/20 flex items-center justify-center">
              <M3Icon name="upload_file" size={24} className="text-[#0b57d0] dark:text-[#a8c7fa]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#191c20] dark:text-white flex items-center gap-2">
                <span>Import Files</span>
                <M3Badge variant="primary">
                  {filesToImport.length} file{filesToImport.length === 1 ? '' : 's'}
                </M3Badge>
              </h2>
              <p className="text-xs text-[#5d6168] dark:text-[#8e9199]">
                Add assets, libraries, or scripts without replacing existing code
              </p>
            </div>
          </div>
          <M3IconButton size="sm" icon="close" label={t.close} onClick={triggerClose} />
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* GitHub Limit Mode Selector */}
          <div className="bg-[#f0f4f9] dark:bg-[#121316]/60 border border-[#d8dae5] dark:border-[#43474e]/40 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#191c20] dark:text-[#e2e2e6] flex items-center gap-1.5">
                <M3Icon name="tune" size={16} className="text-[#0b57d0] dark:text-[#a8c7fa]" />
                <span>GitHub File Limit Policy:</span>
              </span>
              <span className="text-[11px] font-mono text-[#5d6168] dark:text-[#8e9199]">
                Active Limit: {limitMode === '25mb' ? '25 MB' : '100 MB'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLimitMode('25mb')}
                className={`py-2 px-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors border text-left flex flex-col gap-0.5 ${
                  limitMode === '25mb'
                    ? 'bg-[#0b57d0] dark:bg-[#a8c7fa] text-white dark:text-[#003062] border-transparent font-semibold shadow-xs'
                    : 'bg-white dark:bg-[#2b2d30] text-[#44474e] dark:text-[#c4c6d0] border-[#d8dae5] dark:border-[#43474e]/50 hover:bg-[#e8ebf3]'
                }`}
              >
                <span className="font-bold flex items-center gap-1">
                  <M3Icon name="check_circle" size={13} className={limitMode === '25mb' ? 'text-white' : 'opacity-0'} />
                  <span>25 MB (Web & Standard)</span>
                </span>
                <span className={`text-[10px] leading-tight ${limitMode === '25mb' ? 'text-white/80 dark:text-[#003062]/80' : 'text-[#74777f] dark:text-[#8e9199]'}`}>
                  Strict limit enforced by GitHub Web UI &amp; Contents API
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLimitMode('100mb')}
                className={`py-2 px-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors border text-left flex flex-col gap-0.5 ${
                  limitMode === '100mb'
                    ? 'bg-[#0b57d0] dark:bg-[#a8c7fa] text-white dark:text-[#003062] border-transparent font-semibold shadow-xs'
                    : 'bg-white dark:bg-[#2b2d30] text-[#44474e] dark:text-[#c4c6d0] border-[#d8dae5] dark:border-[#43474e]/50 hover:bg-[#e8ebf3]'
                }`}
              >
                <span className="font-bold flex items-center gap-1">
                  <M3Icon name="check_circle" size={13} className={limitMode === '100mb' ? 'text-white' : 'opacity-0'} />
                  <span>100 MB (Git API Max)</span>
                </span>
                <span className={`text-[10px] leading-tight ${limitMode === '100mb' ? 'text-white/80 dark:text-[#003062]/80' : 'text-[#74777f] dark:text-[#8e9199]'}`}>
                  Maximum ceiling supported by Git Database Blobs &amp; push
                </span>
              </button>
            </div>
          </div>

          {/* GitHub Limit Warning / Notice */}
          {fileAnalysis.blockedCount > 0 ? (
            <div className="p-3 rounded-2xl bg-[#ffdad6]/40 dark:bg-[#690005]/30 border border-[#ba1a1a]/40 text-[#410002] dark:text-[#ffdad6] flex items-start gap-2.5">
              <M3Icon name="error" size={18} className="text-[#ba1a1a] dark:text-[#ffb4ab] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">
                  {limitMode === '25mb' ? '25 MB GitHub Limit Exceeded' : '100 MB GitHub Limit Exceeded'}
                </span>
                <span className="text-[11px] leading-relaxed block opacity-90">
                  {fileAnalysis.blockedCount} file{fileAnalysis.blockedCount === 1 ? '' : 's'} exceed {limitMode === '25mb' ? 'the 25 MB GitHub web limit. Switch to "100 MB (Git API Max)" above if you wish to push via Git blobs.' : 'GitHub’s 100 MB hard limit. GitHub strictly rejects any commits containing files over 100 MB.'}
                </span>
              </div>
            </div>
          ) : fileAnalysis.warnCount > 0 ? (
            <div className="p-3 rounded-2xl bg-[#ffdf99]/30 dark:bg-[#5b3f00]/30 border border-[#7e5700]/30 text-[#261900] dark:text-[#ffdf9e] flex items-start gap-2.5">
              <M3Icon name="warning" size={18} className="text-[#7e5700] dark:text-[#ffd54f] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Large File Notice</span>
                <span className="text-[11px] leading-relaxed block opacity-90">
                  {fileAnalysis.warnCount} file{fileAnalysis.warnCount === 1 ? '' : 's'} are between 50 MB and 100 MB. GitHub recommends keeping files under 50 MB for faster clones and smooth Git commits.
                </span>
              </div>
            </div>
          ) : null}

          {/* ZIP Archive Handling Prompt (asks whether to extract files or add zip archive) */}
          {zipFiles.length > 0 && (
            <div className="bg-[#f0f4f9] dark:bg-[#121316]/80 border-2 border-[#0b57d0]/40 dark:border-[#a8c7fa]/40 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0b57d0]/10 dark:bg-[#a8c7fa]/20 text-[#0b57d0] dark:text-[#a8c7fa] flex items-center justify-center shrink-0 mt-0.5">
                  <M3Icon name="folder_zip" size={20} />
                </div>
                <div>
                  <span className="font-bold text-xs text-[#191c20] dark:text-white block">
                    ZIP Archive Detected ({zipFiles.length === 1 ? zipFiles[0].name : `${zipFiles.length} archives`})
                  </span>
                  <span className="text-[11px] text-[#5d6168] dark:text-[#8e9199]">
                    Choose how you want this ZIP to be imported: extract the files inside, or add the ZIP archive file itself to your workspace?
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {zipFiles.map((zf) => {
                  const mode = zipModes[zf.name] || 'extract';
                  return (
                    <div key={zf.name} className="space-y-1.5 pt-0.5">
                      {zipFiles.length > 1 && (
                        <span className="text-[11px] font-mono font-semibold text-[#191c20] dark:text-white block">
                          {zf.name}:
                        </span>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setZipModes((prev) => ({ ...prev, [zf.name]: 'extract' }))}
                          className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 cursor-pointer transition-all ${
                            mode === 'extract'
                              ? 'bg-[#0b57d0] dark:bg-[#a8c7fa] text-white dark:text-[#003062] border-transparent font-semibold shadow-xs'
                              : 'bg-white dark:bg-[#2b2d30] text-[#44474e] dark:text-[#c4c6d0] border-[#d8dae5] dark:border-[#43474e]/50 hover:bg-[#e8ebf3] dark:hover:bg-[#383a3e]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <M3Icon name="unarchive" size={15} />
                            <span className="font-bold text-xs">Extract Files in ZIP</span>
                          </div>
                          <span
                            className={`text-[10px] leading-tight ${
                              mode === 'extract'
                                ? 'text-white/80 dark:text-[#003062]/80'
                                : 'text-[#74777f] dark:text-[#8e9199]'
                            }`}
                          >
                            Unpacks all internal files &amp; folders into /{targetDir.trim().replace(/^\/+|\/+$/g, '') || '(root)'} without replacing existing code.
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setZipModes((prev) => ({ ...prev, [zf.name]: 'archive' }))}
                          className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 cursor-pointer transition-all ${
                            mode === 'archive'
                              ? 'bg-[#0b57d0] dark:bg-[#a8c7fa] text-white dark:text-[#003062] border-transparent font-semibold shadow-xs'
                              : 'bg-white dark:bg-[#2b2d30] text-[#44474e] dark:text-[#c4c6d0] border-[#d8dae5] dark:border-[#43474e]/50 hover:bg-[#e8ebf3] dark:hover:bg-[#383a3e]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <M3Icon name="archive" size={15} />
                            <span className="font-bold text-xs">Add .ZIP Archive File</span>
                          </div>
                          <span
                            className={`text-[10px] leading-tight ${
                              mode === 'archive'
                                ? 'text-white/80 dark:text-[#003062]/80'
                                : 'text-[#74777f] dark:text-[#8e9199]'
                            }`}
                          >
                            Keeps {zf.name} intact as a single binary archive file in /{targetDir.trim().replace(/^\/+|\/+$/g, '') || '(root)'}.
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Destination Directory Prompt */}
          <div className="bg-[#f0f4f9] dark:bg-[#121316]/60 border border-[#d8dae5] dark:border-[#43474e]/40 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#191c20] dark:text-[#e2e2e6] flex items-center gap-1.5">
                <M3Icon name="folder" size={16} className="text-[#0b57d0] dark:text-[#a8c7fa]" />
                <span>Destination Directory:</span>
              </label>
              <span className="text-[11px] font-mono text-[#5d6168] dark:text-[#8e9199]">
                /{targetDir.trim().replace(/^\/+|\/+$/g, '') || '(project root)'}
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={targetDir}
                onChange={(e) => setTargetDir(e.target.value)}
                placeholder="e.g. app/libs, assets/audio, fonts, or leave blank for root"
                className="w-full bg-white dark:bg-[#1e1f22] border border-[#d8dae5] dark:border-[#43474e] rounded-xl px-3 py-2 text-xs text-[#191c20] dark:text-white placeholder-[#74777f] dark:placeholder-[#8e9199] font-mono focus:outline-none focus:ring-2 focus:ring-[#0b57d0] dark:focus:ring-[#a8c7fa]"
              />
            </div>

            {/* Quick Directory Suggestion Chips */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-[#74777f] dark:text-[#8e9199] block font-semibold">
                Quick Locations:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestedDirectories.map((dir) => {
                  const isSelected = targetDir.trim().replace(/^\/+|\/+$/g, '') === dir;
                  return (
                    <button
                      key={dir || '__root__'}
                      type="button"
                      onClick={() => setTargetDir(dir)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono cursor-pointer transition-colors border ${
                        isSelected
                          ? 'bg-[#0b57d0] dark:bg-[#a8c7fa] text-white dark:text-[#003062] border-transparent font-semibold shadow-xs'
                          : 'bg-white dark:bg-[#2b2d30] text-[#44474e] dark:text-[#c4c6d0] border-[#d8dae5] dark:border-[#43474e]/50 hover:bg-[#e8ebf3] dark:hover:bg-[#383a3e]'
                      }`}
                    >
                      {dir ? `/${dir}` : '/ (Root)'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Files List Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-[#191c20] dark:text-[#e2e2e6]">
                Files to Import ({fileAnalysis.validFilesCount} of {filesToImport.length} ready)
              </span>
              <span className="text-[11px] text-[#5d6168] dark:text-[#8e9199] font-mono">
                Total: {formatBytes(fileAnalysis.totalBytes)}
              </span>
            </div>

            <div className="border border-[#d8dae5] dark:border-[#43474e]/40 rounded-2xl divide-y divide-[#d8dae5] dark:divide-[#43474e]/30 overflow-hidden bg-white dark:bg-[#1e1f22]">
              {filesToImport.length === 0 ? (
                <div className="p-6 text-center text-[#74777f] dark:text-[#8e9199]">
                  No files selected
                </div>
              ) : (
                fileAnalysis.analyzed.map((item, idx) => (
                  <div
                    key={`${item.file.name}-${idx}`}
                    className={`p-2.5 sm:p-3 flex items-center justify-between gap-3 transition-colors ${
                      item.isBlocked
                        ? 'bg-[#ffdad6]/20 dark:bg-[#690005]/20'
                        : 'hover:bg-[#f8fafd] dark:hover:bg-[#2b2d30]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                          item.isBlocked
                            ? 'bg-[#ffdad6] dark:bg-[#690005] border-[#ba1a1a]/40 text-[#ba1a1a] dark:text-[#ffb4ab]'
                            : 'bg-[#f0f2f8] dark:bg-[#2b2d30] border-[#d8dae5] dark:border-[#43474e]/60 text-[#0b57d0] dark:text-[#a8c7fa]'
                        }`}
                      >
                        <M3Icon name={item.isBlocked ? 'block' : item.icon} size={18} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-[#191c20] dark:text-white truncate max-w-[200px] sm:max-w-[260px]">
                            {item.file.name}
                          </span>
                          <M3Badge variant={item.badgeVariant}>{item.typeLabel}</M3Badge>
                          {item.ext === 'zip' && (
                            <button
                              type="button"
                              onClick={() =>
                                setZipModes((prev) => ({
                                  ...prev,
                                  [item.file.name]:
                                    (prev[item.file.name] || 'extract') === 'extract'
                                      ? 'archive'
                                      : 'extract',
                                }))
                              }
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border cursor-pointer transition-colors flex items-center gap-1 ${
                                (zipModes[item.file.name] || 'extract') === 'extract'
                                  ? 'bg-[#d3e3fd] text-[#041e49] dark:bg-[#00468b]/40 dark:text-[#a8c7fa] border-[#0b57d0]/30'
                                  : 'bg-[#f0f2f8] text-[#44474e] dark:bg-[#2b2d30] dark:text-[#c4c6d0] border-[#d8dae5] dark:border-[#43474e]/50'
                              }`}
                              title="Click to toggle: Extract files vs. Keep as .zip archive"
                            >
                              <M3Icon
                                name={
                                  (zipModes[item.file.name] || 'extract') === 'extract'
                                    ? 'unarchive'
                                    : 'archive'
                                }
                                size={12}
                              />
                              <span>
                                {(zipModes[item.file.name] || 'extract') === 'extract'
                                  ? 'Extracts internal files'
                                  : 'Adds as .zip archive'}
                              </span>
                            </button>
                          )}
                          {item.collides && (
                            <M3Badge variant="warning">
                              {conflictStrategy === 'overwrite'
                                ? 'Overwrites'
                                : conflictStrategy === 'rename'
                                ? 'Will Auto-Rename'
                                : 'Will Skip'}
                            </M3Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-[#74777f] dark:text-[#8e9199] mt-0.5">
                          <span className="font-mono">{formatBytes(item.file.size)}</span>
                          <span>•</span>
                          <span className="font-mono text-[#0b57d0] dark:text-[#a8c7fa] truncate max-w-[180px] sm:max-w-[240px]">
                            {item.ext === 'zip' && (zipModes[item.file.name] || 'extract') === 'extract'
                              ? `➔ Unpacks inside /${targetDir.trim().replace(/^\/+|\/+$/g, '') || '(root)'}`
                              : `➔ /${item.potentialPath}`}
                          </span>
                          {item.isBlocked && (
                            <span className="text-[#ba1a1a] dark:text-[#ffb4ab] font-semibold">
                              (Blocked: &gt;{limitMode === '25mb' ? '25MB' : '100MB'})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="p-1 rounded-lg text-[#74777f] hover:text-[#ba1a1a] hover:bg-black/5 dark:text-[#8e9199] dark:hover:text-[#ffb4ab] dark:hover:bg-white/5 cursor-pointer shrink-0"
                      title="Remove from import list"
                    >
                      <M3Icon name="close" size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Overwrite / Collision Strategy if any file collides */}
          {fileAnalysis.analyzed.some((item) => item.collides) && (
            <div className="p-3 rounded-2xl bg-[#f0f4f9] dark:bg-[#121316]/60 border border-[#d8dae5] dark:border-[#43474e]/40 space-y-2">
              <span className="font-semibold text-[#191c20] dark:text-white flex items-center gap-1.5">
                <M3Icon name="info" size={16} className="text-[#0b57d0] dark:text-[#a8c7fa]" />
                <span>Existing file conflict detected:</span>
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['overwrite', 'rename', 'skip'] as const).map((strategy) => (
                  <button
                    key={strategy}
                    type="button"
                    onClick={() => setConflictStrategy(strategy)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-medium capitalize border cursor-pointer transition-colors ${
                      conflictStrategy === strategy
                        ? 'bg-[#0b57d0] dark:bg-[#a8c7fa] text-white dark:text-[#003062] border-transparent font-semibold shadow-xs'
                        : 'bg-white dark:bg-[#2b2d30] text-[#44474e] dark:text-[#c4c6d0] border-[#d8dae5] dark:border-[#43474e]/50 hover:bg-[#e8ebf3]'
                    }`}
                  >
                    {strategy === 'overwrite' ? 'Overwrite' : strategy === 'rename' ? 'Keep Both' : 'Skip Existing'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#d8dae5] dark:border-[#43474e]/30 flex items-center justify-between shrink-0 bg-[#f8fafd] dark:bg-[#1e1f22]/50">
          <div className="text-xs text-[#5d6168] dark:text-[#8e9199]">
            {isProcessing ? (
              <span className="flex items-center gap-1.5 font-medium text-[#0b57d0] dark:text-[#a8c7fa]">
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>
                  Processing {processingProgress.current} of {processingProgress.total}...
                </span>
              </span>
            ) : (
              <span>Your existing project code will remain intact.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <M3Button variant="tonal" size="sm" onClick={triggerClose} disabled={isProcessing}>
              {t.cancel}
            </M3Button>
            <M3Button
              variant="filled"
              size="sm"
              icon="upload_file"
              onClick={handleStartImport}
              disabled={isProcessing || fileAnalysis.validFilesCount === 0}
            >
              Import {fileAnalysis.validFilesCount} File{fileAnalysis.validFilesCount === 1 ? '' : 's'}
            </M3Button>
          </div>
        </div>
      </div>
    </div>
  );
}
