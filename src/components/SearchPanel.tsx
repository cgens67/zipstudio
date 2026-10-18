/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { M3Icon, M3IconButton } from './M3Components';
import { VFile } from '../utils/fileSystem';
import { Translations, TRANSLATIONS } from '../utils/i18n';

export interface SearchMatch {
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchLength: number;
}

export interface FileSearchResult {
  filePath: string;
  fileName: string;
  matches: SearchMatch[];
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
  const [replaceQuery, setReplaceQuery] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});

  // Perform search across all text files
  const searchResults: FileSearchResult[] = useMemo(() => {
    if (!searchQuery.trim()) return [];

    let regex: RegExp;
    try {
      let pattern = searchQuery;
      if (!useRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      if (wholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
    } catch {
      return [];
    }

    const results: FileSearchResult[] = [];

    for (const [filePath, file] of Object.entries(files)) {
      if (file.isBinary) continue;

      const lines = file.content.split('\n');
      const fileMatches: SearchMatch[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(line)) !== null) {
          fileMatches.push({
            lineNumber: i + 1,
            lineContent: line,
            matchStart: match.index,
            matchLength: match[0].length,
          });

          // Prevent infinite loop if match length is 0
          if (match[0].length === 0) {
            regex.lastIndex++;
          }
        }
      }

      if (fileMatches.length > 0) {
        results.push({
          filePath,
          fileName: file.name,
          matches: fileMatches,
        });
      }
    }

    return results;
  }, [files, searchQuery, caseSensitive, wholeWord, useRegex]);

  const totalMatches = useMemo(() => {
    return searchResults.reduce((acc, r) => acc + r.matches.length, 0);
  }, [searchResults]);

  const toggleFileCollapse = (filePath: string) => {
    setCollapsedFiles((prev) => ({
      ...prev,
      [filePath]: !prev[filePath],
    }));
  };

  const handleExecuteReplaceAll = () => {
    if (!searchQuery.trim()) return;
    if (confirm(`Replace all ${totalMatches} occurrences across ${searchResults.length} files?`)) {
      onReplaceAll(searchQuery, replaceQuery, caseSensitive, useRegex);
    }
  };

  return (
    <aside className="w-full h-full bg-[#18191c] border-r border-[#43474e]/40 flex flex-col shrink-0 overflow-hidden select-none">
      {/* Header */}
      <div className="h-10 px-3 bg-[#1e1f22] border-b border-[#43474e]/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <M3Icon name="search" size={18} className="text-[#a8c7fa]" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider">
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
      <div className="p-3 bg-[#1e1f22] border-b border-[#43474e]/30 space-y-2 shrink-0">
        {/* Search row */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => setShowReplace(!showReplace)}
            className="p-1 mr-1 text-[#8e9199] hover:text-white transition-colors cursor-pointer"
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
              className="w-full bg-[#121316] border border-[#43474e] rounded-lg pl-2.5 pr-20 py-1.5 text-xs text-white placeholder-[#8e9199] focus:outline-none focus:border-[#a8c7fa] font-mono"
            />
            {/* Toggles: Case, Whole Word, Regex */}
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setCaseSensitive(!caseSensitive)}
                title={t.matchCase}
                className={`w-5 h-5 rounded text-[11px] font-bold flex items-center justify-center cursor-pointer transition-colors ${
                  caseSensitive ? 'bg-[#a8c7fa] text-[#003062]' : 'text-[#8e9199] hover:text-white'
                }`}
              >
                Aa
              </button>
              <button
                type="button"
                onClick={() => setWholeWord(!wholeWord)}
                title={t.matchWholeWord}
                className={`w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center cursor-pointer transition-colors ${
                  wholeWord ? 'bg-[#a8c7fa] text-[#003062]' : 'text-[#8e9199] hover:text-white'
                }`}
              >
                \b
              </button>
              <button
                type="button"
                onClick={() => setUseRegex(!useRegex)}
                title={t.useRegex}
                className={`w-5 h-5 rounded text-[11px] font-mono font-bold flex items-center justify-center cursor-pointer transition-colors ${
                  useRegex ? 'bg-[#a8c7fa] text-[#003062]' : 'text-[#8e9199] hover:text-white'
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
                  className="flex-1 bg-[#121316] border border-[#43474e] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#8e9199] focus:outline-none focus:border-[#a8c7fa] font-mono"
                />
                <button
                  type="button"
                  onClick={handleExecuteReplaceAll}
                  disabled={!searchQuery.trim() || totalMatches === 0}
                  className="px-2.5 py-1.5 bg-[#a8c7fa] hover:bg-[#c2e7ff] disabled:opacity-40 disabled:cursor-not-allowed text-[#003062] rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title={t.replaceAll}
                >
                  <M3Icon name="find_replace" size={14} />
                  <span>{t.replaceAll}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Results summary counter */}
        {searchQuery.trim() && (
          <div className="flex items-center justify-between text-[11px] text-[#8e9199] pt-1">
            <span>
              <strong className="text-[#a8c7fa]">{totalMatches}</strong> {t.matchesInFiles} ({searchResults.length} {t.filesCount})
            </span>
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
                className="hover:text-white underline cursor-pointer"
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
        ) : searchResults.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#8e9199]">
            <M3Icon name="search_off" size={32} className="mx-auto mb-2 opacity-40 text-[#ff8585]" />
            <p className="text-[#e2e2e6] font-medium mb-1">{t.noResults}</p>
            <p>0 matches for &ldquo;{searchQuery}&rdquo;</p>
          </div>
        ) : (
          <div className="py-1">
            {searchResults.map((result) => {
              const isCollapsed = !!collapsedFiles[result.filePath];
              return (
                <div key={result.filePath} className="border-b border-[#43474e]/20 last:border-b-0">
                  {/* File header */}
                  <div
                    onClick={() => toggleFileCollapse(result.filePath)}
                    className="flex items-center justify-between px-3 py-1.5 hover:bg-white/5 cursor-pointer text-xs group transition-colors"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <M3Icon
                        name={isCollapsed ? 'chevron_right' : 'expand_more'}
                        size={16}
                        className="text-[#8e9199] group-hover:text-white"
                      />
                      <span className="font-semibold text-white font-mono truncate text-[11px]">
                        {result.fileName}
                      </span>
                      <span className="text-[10px] text-[#8e9199] truncate font-mono">
                        {result.filePath}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full bg-[#00468b]/40 text-[#a8c7fa] text-[10px] font-mono shrink-0 ml-1">
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
                        const before = m.lineContent.substring(0, m.matchStart);
                        const matched = m.lineContent.substring(
                          m.matchStart,
                          m.matchStart + m.matchLength
                        );
                        const after = m.lineContent.substring(m.matchStart + m.matchLength);

                        return (
                          <div
                            key={idx}
                            onClick={() => onSelectResult(result.filePath, m.lineNumber)}
                            className="flex items-baseline gap-2 pl-7 pr-3 py-1 text-xs hover:bg-[#a8c7fa]/10 cursor-pointer font-mono group transition-colors"
                          >
                            <span className="text-[10px] text-[#8e9199] group-hover:text-[#a8c7fa] w-6 text-right shrink-0">
                              {m.lineNumber}:
                            </span>
                            <span className="text-[#c4c6d0] truncate flex-1 text-[11px]">
                              <span>{before}</span>
                              <mark className="bg-[#a8c7fa] text-[#003062] font-semibold px-0.5 rounded-xs">
                                {matched}
                              </mark>
                              <span>{after}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
