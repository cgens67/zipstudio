/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { M3Icon, M3IconButton, M3Button } from './M3Components';
import { M3Switch } from './M3Switch';
import { VFile, isBinaryExtension, getFileExtension } from '../utils/fileSystem';
import { Translations, TRANSLATIONS } from '../utils/i18n';

export interface SearchMatch {
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchLength: number;
  previewBefore: string;
  previewMatch: string;
  previewAfter: string;
}

export interface FileSearchResult {
  filePath: string;
  fileName: string;
  matches: SearchMatch[];
}

const MAX_MATCHES_PER_FILE = 200;
const MAX_MATCHES_PER_LINE = 50;
const MAX_TOTAL_SCAN_MATCHES = 5000; // Deep workspace scan limit
const INITIAL_PREVIEW_LIMIT = 500;
const PREVIEW_INCREMENT = 500;
const MAX_LINE_LENGTH_TO_SEARCH = 8000;
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB safety limit for live search

function createSnippet(line: string, start: number, len: number) {
  const maxContext = 40;
  const snippetStart = Math.max(0, start - maxContext);
  const snippetEnd = Math.min(line.length, start + len + maxContext);

  const prefix = snippetStart > 0 ? '…' : '';
  const before = prefix + line.substring(snippetStart, start);
  const match = line.substring(start, start + len);
  const suffix = snippetEnd < line.length ? '…' : '';
  const after = line.substring(start + len, snippetEnd) + suffix;

  return { before, match, after };
}

interface SearchPanelProps {
  files: Record<string, VFile>;
  onSelectResult: (filePath: string, lineNumber: number) => void;
  onReplaceAll: (searchQuery: string, replaceQuery: string, caseSensitive: boolean, isRegex: boolean) => void;
  onClose: () => void;
  t?: Translations;
}

export function SearchPanel({
  files,
  onSelectResult,
  onReplaceAll,
  onClose,
  t = TRANSLATIONS.en,
}: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [previewLimit, setPreviewLimit] = useState(INITIAL_PREVIEW_LIMIT);
  const [replaceQuery, setReplaceQuery] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});

  // Debounce search query to avoid freezing on rapid typing
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setDebouncedQuery('');
      setIsSearching(false);
      setSearchError(null);
      setPreviewLimit(INITIAL_PREVIEW_LIMIT);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setIsSearching(false);
      setPreviewLimit(INITIAL_PREVIEW_LIMIT);
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform search across all text files with comprehensive safety guards
  const { results: searchResults, totalMatches, isCapped } = useMemo(() => {
    const query = debouncedQuery.trim();
    if (!query) {
      return { results: [], totalMatches: 0, isCapped: false };
    }

    let regex: RegExp;
    try {
      let pattern = debouncedQuery;
      if (!useRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      if (wholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
      setSearchError(null);
    } catch (err) {
      setSearchError((err as Error).message || 'Invalid regular expression');
      return { results: [], totalMatches: 0, isCapped: false };
    }

    const results: FileSearchResult[] = [];
    let grandTotalMatches = 0;
    let hitCap = false;

    for (const [filePath, file] of Object.entries(files)) {
      if (hitCap) break;

      // Guard 1: Ensure valid file and text content
      if (!file || typeof file.content !== 'string' || file.isBinary) continue;

      // Guard 2: Skip data-URL files (e.g., base64 media/binaries)
      if (file.content.startsWith('data:')) continue;

      // Guard 3: Skip binary extensions (.aar, .jar, .png, .so, etc.)
      const ext = getFileExtension(filePath);
      if (isBinaryExtension(ext)) continue;

      // Guard 4: Skip files exceeding size limit
      if (file.content.length > MAX_FILE_SIZE_BYTES) continue;

      try {
        const lines = file.content.split('\n');
        const fileMatches: SearchMatch[] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Guard 5: Skip excessively long minified lines (>8000 chars)
          if (line.length > MAX_LINE_LENGTH_TO_SEARCH) continue;

          regex.lastIndex = 0;
          let match: RegExpExecArray | null;
          let matchesInLine = 0;
          let safetyLoop = 0;

          while ((match = regex.exec(line)) !== null) {
            safetyLoop++;
            if (safetyLoop > 100) break; // Guard against runaway / ReDoS loops

            const matchStart = match.index;
            const matchLength = match[0].length;
            const snippet = createSnippet(line, matchStart, matchLength);

            fileMatches.push({
              lineNumber: i + 1,
              lineContent: line.length > 300 ? line.substring(0, 300) + '…' : line,
              matchStart,
              matchLength,
              previewBefore: snippet.before,
              previewMatch: snippet.match,
              previewAfter: snippet.after,
            });

            grandTotalMatches++;
            matchesInLine++;

            if (grandTotalMatches >= MAX_TOTAL_SCAN_MATCHES) {
              hitCap = true;
              break;
            }

            if (fileMatches.length >= MAX_MATCHES_PER_FILE) {
              break;
            }

            if (matchesInLine >= MAX_MATCHES_PER_LINE) {
              break;
            }

            // Guard zero-width matches (e.g. ^, $, \b, empty groups)
            if (matchLength === 0) {
              regex.lastIndex = Math.max(regex.lastIndex + 1, match.index + 1);
              if (regex.lastIndex > line.length) {
                break;
              }
            }
          }

          if (fileMatches.length >= MAX_MATCHES_PER_FILE || hitCap) {
            break;
          }
        }

        if (fileMatches.length > 0) {
          results.push({
            filePath,
            fileName: file.name,
            matches: fileMatches,
          });
        }
      } catch (fileErr) {
        console.warn(`[SearchPanel] Error scanning ${filePath}:`, fileErr);
      }
    }

    return { results, totalMatches: grandTotalMatches, isCapped: hitCap };
  }, [files, debouncedQuery, caseSensitive, wholeWord, useRegex]);

  // Paginated view for DOM rendering: only render up to previewLimit matches to keep the browser 60 FPS
  const { displayedResults, displayedMatchesCount } = useMemo(() => {
    let remaining = previewLimit;
    const sliced: FileSearchResult[] = [];
    let count = 0;

    for (const res of searchResults) {
      if (remaining <= 0) break;
      const fileMatches = res.matches.slice(0, remaining);
      sliced.push({
        ...res,
        matches: fileMatches,
      });
      count += fileMatches.length;
      remaining -= fileMatches.length;
    }

    return { displayedResults: sliced, displayedMatchesCount: count };
  }, [searchResults, previewLimit]);

  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [preserveCasing, setPreserveCasing] = useState(false);
  const [createBackup, setCreateBackup] = useState(true);

  const toggleFileCollapse = (filePath: string) => {
    setCollapsedFiles((prev) => ({
      ...prev,
      [filePath]: !prev[filePath],
    }));
  };

  const handleExecuteReplaceAll = () => {
    if (!searchQuery.trim() || totalMatches === 0) return;
    setShowReplaceConfirm(true);
  };

  const handleConfirmReplaceAll = () => {
    setShowReplaceConfirm(false);
    onReplaceAll(searchQuery, replaceQuery, caseSensitive, useRegex);
  };

  return (
    <aside className="w-full h-full bg-[#f8fafd] dark:bg-[#18191c] border-r border-[#d8dae5] dark:border-[#43474e]/40 flex flex-col shrink-0 overflow-hidden select-none">
      {/* Header */}
      <div className="h-10 px-3 bg-[#ffffff] dark:bg-[#1e1f22] border-b border-[#d8dae5] dark:border-[#43474e]/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <M3Icon name="search" size={18} className="text-[#0b57d0] dark:text-[#a8c7fa]" />
          <span className="text-xs font-semibold text-[#191c20] dark:text-white uppercase tracking-wider">
            {t.search}
          </span>
        </div>
        <M3IconButton
          size="sm"
          icon="close"
          label={t.close}
          onClick={onClose}
        />
      </div>

      {/* Search Input Controls */}
      <div className="p-3 bg-[#ffffff] dark:bg-[#1e1f22] border-b border-[#d8dae5] dark:border-[#43474e]/30 space-y-2 shrink-0">
        {/* Search row */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => setShowReplace(!showReplace)}
            className="p-1 mr-1 text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white transition-colors cursor-pointer"
            title={showReplace ? t.hideReplace : t.toggleReplace}
          >
            <M3Icon name={showReplace ? 'expand_more' : 'chevron_right'} size={16} />
          </button>
          <div className="relative flex-1">
            <input
              type="text"
              autoFocus
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f0f2f8] dark:bg-[#121316] border border-[#d8dae5] dark:border-[#43474e] rounded-lg pl-2.5 pr-20 py-1.5 text-xs text-[#191c20] dark:text-white placeholder-[#5d6168] dark:placeholder-[#8e9199] focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] font-mono"
            />
            {/* Toggles: Case, Whole Word, Regex */}
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setCaseSensitive(!caseSensitive)}
                title={t.matchCase}
                className={`w-5 h-5 rounded text-[11px] font-bold flex items-center justify-center cursor-pointer transition-colors ${
                  caseSensitive ? 'bg-[#0b57d0] text-white dark:bg-[#a8c7fa] dark:text-[#003062]' : 'text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white'
                }`}
              >
                Aa
              </button>
              <button
                type="button"
                onClick={() => setWholeWord(!wholeWord)}
                title={t.matchWholeWord}
                className={`w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center cursor-pointer transition-colors ${
                  wholeWord ? 'bg-[#0b57d0] text-white dark:bg-[#a8c7fa] dark:text-[#003062]' : 'text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white'
                }`}
              >
                \b
              </button>
              <button
                type="button"
                onClick={() => setUseRegex(!useRegex)}
                title={t.useRegex}
                className={`w-5 h-5 rounded text-[11px] font-mono font-bold flex items-center justify-center cursor-pointer transition-colors ${
                  useRegex ? 'bg-[#0b57d0] text-white dark:bg-[#a8c7fa] dark:text-[#003062]' : 'text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white'
                }`}
              >
                .*
              </button>
            </div>
          </div>
        </div>

        {/* Replace row (expandable with animateContentSize) */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
            showReplace ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            {showReplace && (
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder={t.replacePlaceholder}
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  className="flex-1 bg-[#f0f2f8] dark:bg-[#121316] border border-[#d8dae5] dark:border-[#43474e] rounded-lg px-2.5 py-1.5 text-xs text-[#191c20] dark:text-white placeholder-[#5d6168] dark:placeholder-[#8e9199] focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] font-mono"
                />
                <button
                  type="button"
                  onClick={handleExecuteReplaceAll}
                  disabled={!searchQuery.trim() || totalMatches === 0}
                  className="px-2.5 py-1.5 bg-[#0b57d0] hover:bg-[#0842a0] text-white dark:bg-[#a8c7fa] dark:text-[#003062] dark:hover:bg-[#c2e7ff] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title={t.replaceAll}
                >
                  <M3Icon name="find_replace" size={14} />
                  <span>{t.replaceAll}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search Error notice if invalid regex */}
        {searchError && (
          <div className="text-[11px] text-[#ba1a1a] dark:text-[#ff8585] bg-[#ba1a1a]/10 dark:bg-[#ff8585]/10 px-2 py-1 rounded border border-[#ba1a1a]/20 dark:border-[#ff8585]/20 font-mono">
            {searchError}
          </div>
        )}

        {/* Results summary counter */}
        {searchQuery.trim() && (
          <div className="flex items-center justify-between text-[11px] text-[#5d6168] dark:text-[#8e9199] pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>
                <strong className="text-[#0b57d0] dark:text-[#a8c7fa]">{totalMatches}</strong> {t.matchesInFiles} ({searchResults.length} {t.filesCount})
              </span>
              {displayedMatchesCount < totalMatches && (
                <span className="text-[10px] text-[#5d6168] dark:text-[#8e9199] bg-[#e8ebf3] dark:bg-[#2b2d30] px-1.5 py-0.5 rounded font-mono">
                  Showing {displayedMatchesCount} of {totalMatches}
                </span>
              )}
              {isCapped && (
                <span className="text-[10px] text-[#ba1a1a] dark:text-[#ff8585] bg-[#ba1a1a]/10 dark:bg-[#ff8585]/10 px-1.5 py-0.5 rounded font-mono font-medium">
                  {MAX_TOTAL_SCAN_MATCHES}+ (capped)
                </span>
              )}
              {isSearching && (
                <span className="inline-block w-3 h-3 border-2 border-[#0b57d0] dark:border-[#a8c7fa] border-t-transparent rounded-full animate-spin ml-1" />
              )}
            </div>
            {searchResults.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const allCollapsed = searchResults.every((r) => collapsedFiles[r.filePath]);
                  const nextState: Record<string, boolean> = {};
                  searchResults.forEach((r) => {
                    nextState[r.filePath] = !allCollapsed;
                  });
                  setCollapsedFiles(nextState);
                }}
                className="hover:text-[#191c20] dark:hover:text-white underline cursor-pointer"
              >
                {searchResults.every((r) => collapsedFiles[r.filePath]) ? t.restore : t.close}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto">
        {!searchQuery.trim() ? (
          <div className="p-6 text-center text-xs text-[#8e9199]">
            <M3Icon name="search" size={32} className="mx-auto mb-2 opacity-40 text-[#a8c7fa]" />
            <p>{t.searchAcrossWorkspace}</p>
          </div>
        ) : isSearching && searchResults.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#8e9199]">
            <div className="w-6 h-6 border-2 border-[#0b57d0] dark:border-[#a8c7fa] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p>Searching workspace files...</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#8e9199]">
            <M3Icon name="search_off" size={32} className="mx-auto mb-2 opacity-40 text-[#ff8585]" />
            <p className="text-[#e2e2e6] font-medium mb-1">{t.noResults}</p>
            <p>0 matches for &ldquo;{searchQuery}&rdquo;</p>
          </div>
        ) : (
          <div className="py-1">
            {displayedResults.map((result) => {
              const isCollapsed = !!collapsedFiles[result.filePath];
              return (
                <div key={result.filePath} className="border-b border-[#d8dae5] dark:border-[#43474e]/20 last:border-b-0">
                  {/* File header */}
                  <div
                    onClick={() => toggleFileCollapse(result.filePath)}
                    className="flex items-center justify-between px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-xs group transition-colors"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <M3Icon
                        name={isCollapsed ? 'chevron_right' : 'expand_more'}
                        size={16}
                        className="text-[#5d6168] dark:text-[#8e9199] group-hover:text-[#191c20] dark:group-hover:text-white"
                      />
                      <span className="font-semibold text-[#191c20] dark:text-white font-mono truncate text-[11px]">
                        {result.fileName}
                      </span>
                      <span className="text-[10px] text-[#5d6168] dark:text-[#8e9199] truncate font-mono">
                        {result.filePath}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full bg-[#d3e3fd] text-[#041e49] dark:bg-[#00468b]/40 dark:text-[#a8c7fa] text-[10px] font-mono shrink-0 ml-1">
                      {result.matches.length}
                    </span>
                  </div>

                  {/* Matches within file with animateContentSize */}
                  <div
                    className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                      !isCollapsed ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                  >
                    <div className="overflow-hidden">
                      {result.matches.map((m, idx) => {
                        return (
                          <div
                            key={idx}
                            onClick={() => onSelectResult(result.filePath, m.lineNumber)}
                            className="flex items-baseline gap-2 pl-7 pr-3 py-1 text-xs hover:bg-[#0b57d0]/10 dark:hover:bg-[#a8c7fa]/10 cursor-pointer font-mono group transition-colors"
                          >
                            <span className="text-[10px] text-[#5d6168] dark:text-[#8e9199] group-hover:text-[#0b57d0] dark:group-hover:text-[#a8c7fa] w-6 text-right shrink-0">
                              {m.lineNumber}:
                            </span>
                            <span className="text-[#191c20] dark:text-[#c4c6d0] truncate flex-1 text-[11px]">
                              <span>{m.previewBefore}</span>
                              <mark className="bg-[#a8c7fa] text-[#003062] font-semibold px-0.5 rounded-xs">
                                {m.previewMatch}
                              </mark>
                              <span>{m.previewAfter}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Load More Matches Pagination Control */}
            {totalMatches > displayedMatchesCount && (
              <div className="p-3 text-center border-t border-[#d8dae5] dark:border-[#43474e]/30 bg-[#f8fafd] dark:bg-[#18191c]/50">
                <button
                  type="button"
                  onClick={() => setPreviewLimit((prev) => prev + PREVIEW_INCREMENT)}
                  className="px-3.5 py-1.5 bg-[#0b57d0] hover:bg-[#0842a0] dark:bg-[#a8c7fa] dark:text-[#003062] dark:hover:bg-[#c2e7ff] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <M3Icon name="expand_more" size={16} />
                  <span>Show Next {Math.min(PREVIEW_INCREMENT, totalMatches - displayedMatchesCount)} Matches</span>
                </button>
                <p className="text-[10px] text-[#5d6168] dark:text-[#8e9199] mt-1 font-mono">
                  Showing {displayedMatchesCount} of {totalMatches} • Replace All applies to all files in workspace
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* In-UI Replace All Confirmation Dialog with Material 3 Expressive Switch */}
      {showReplaceConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1e1f22] border border-[#d8dae5] dark:border-[#a8c7fa]/40 rounded-2xl w-full max-w-sm p-5 shadow-2xl m3-dialog-bounce space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00468b]/20 dark:bg-[#00468b]/40 border border-[#0b57d0]/30 dark:border-[#a8c7fa]/30 flex items-center justify-center text-[#0b57d0] dark:text-[#a8c7fa] shrink-0">
                <M3Icon name="find_replace" size={24} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#191c20] dark:text-white">Batch Replace</h3>
                <p className="text-xs text-[#5d6168] dark:text-[#8e9199] truncate font-mono mt-0.5">
                  {totalMatches} {totalMatches === 1 ? 'match' : 'matches'} across {searchResults.length} {searchResults.length === 1 ? 'file' : 'files'}
                </p>
              </div>
            </div>

            <div className="bg-[#f0f2f8] dark:bg-[#121316] p-3 rounded-xl border border-[#d8dae5] dark:border-[#43474e]/40 space-y-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-[#ba1a1a] dark:text-[#ff8585] font-semibold">-</span>
                <span className="text-[#5d6168] dark:text-[#8e9199]">Find:</span>
                <span className="text-[#191c20] dark:text-white truncate font-bold">&ldquo;{searchQuery}&rdquo;</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#0f5223] dark:text-[#b4f3b7] font-semibold">+</span>
                <span className="text-[#5d6168] dark:text-[#8e9199]">Replace:</span>
                <span className="text-[#0b57d0] dark:text-[#a8c7fa] truncate font-bold">&ldquo;{replaceQuery}&rdquo;</span>
              </div>
            </div>

            {/* Note clarifying workspace-wide reach */}
            <div className="bg-[#e8f0fe] dark:bg-[#00468b]/20 p-2.5 rounded-xl border border-[#0b57d0]/20 text-[11px] text-[#041e49] dark:text-[#c2e7ff] flex items-start gap-2">
              <M3Icon name="info" size={15} className="text-[#0b57d0] dark:text-[#a8c7fa] shrink-0 mt-0.5" />
              <span>
                Replace All updates every match in all workspace files, including results beyond the visible preview window.
              </span>
            </div>

            {/* M3Switch options from material-esm/material */}
            <div className="space-y-3 pt-1">
              <div className="bg-[#f0f2f8] dark:bg-[#121316] p-3 rounded-xl border border-[#d8dae5] dark:border-[#43474e]/40">
                <M3Switch
                  selected={preserveCasing}
                  onChange={setPreserveCasing}
                  label="Preserve Case"
                  sublabel="Maintain capitalization across replacement targets"
                />
              </div>
              <div className="bg-[#f0f2f8] dark:bg-[#121316] p-3 rounded-xl border border-[#d8dae5] dark:border-[#43474e]/40">
                <M3Switch
                  selected={createBackup}
                  onChange={setCreateBackup}
                  label="Create Undo History"
                  sublabel="Track each replaced file for easy undo"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReplaceConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-xs text-[#5d6168] dark:text-[#c4c6d0] font-medium transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <M3Button
                variant="filled"
                size="sm"
                icon="find_replace"
                onClick={handleConfirmReplaceAll}
              >
                Replace All ({totalMatches})
              </M3Button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
