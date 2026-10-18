/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { M3Icon, M3IconButton } from './M3Components';
import { VFile } from '../utils/fileSystem';

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
}

export function SearchPanel({
  files,
  onSelectResult,
  onReplaceAll,
  onClose,
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
    <aside className="w-80 h-full bg-[#18191c] border-r border-[#43474e]/40 flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-10 px-3 bg-[#1e1f22] border-b border-[#43474e]/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <M3Icon name="search" size={18} className="text-[#a8c7fa]" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider">
            Search in Code
          </span>
        </div>
        <M3IconButton
          size="sm"
          icon="close"
          label="Close Search"
          onClick={onClose}
        />
      </div>

      {/* Search Input Controls */}
      <div className="p-3 bg-[#1e1f22] border-b border-[#43474e]/30 space-y-2">
        {/* Search row */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => setShowReplace(!showReplace)}
            className="p-1 mr-1 text-[#8e9199] hover:text-white transition-colors cursor-pointer"
            title={showReplace ? 'Hide Replace' : 'Toggle Replace'}
          >
            <M3Icon name={showReplace ? 'expand_more' : 'chevron_right'} size={16} />
          </button>
          <div className="relative flex-1">
            <input
              type="text"
              autoFocus
              placeholder="Search (e.g. style, button, import...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121316] border border-[#43474e] rounded-lg pl-2.5 pr-20 py-1.5 text-xs text-white placeholder-[#8e9199] focus:outline-none focus:border-[#a8c7fa] font-mono"
            />
            {/* Toggles: Case, Whole Word, Regex */}
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setCaseSensitive(!caseSensitive)}
                title="Match Case (Alt+C)"
                className={`w-5 h-5 rounded text-[11px] font-bold flex items-center justify-center cursor-pointer transition-colors ${
                  caseSensitive ? 'bg-[#a8c7fa] text-[#003062]' : 'text-[#8e9199] hover:text-white'
                }`}
              >
                Aa
              </button>
              <button
                type="button"
                onClick={() => setWholeWord(!wholeWord)}
                title="Match Whole Word (Alt+W)"
                className={`w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center cursor-pointer transition-colors ${
                  wholeWord ? 'bg-[#a8c7fa] text-[#003062]' : 'text-[#8e9199] hover:text-white'
                }`}
              >
                \b
              </button>
              <button
                type="button"
                onClick={() => setUseRegex(!useRegex)}
                title="Use Regular Expression (Alt+R)"
                className={`w-5 h-5 rounded text-[11px] font-mono font-bold flex items-center justify-center cursor-pointer transition-colors ${
                  useRegex ? 'bg-[#a8c7fa] text-[#003062]' : 'text-[#8e9199] hover:text-white'
                }`}
              >
                .*
              </button>
            </div>
          </div>
        </div>

        {/* Replace row */}
        {showReplace && (
          <div className="flex items-center pl-6 gap-1 animate-fadeIn">
            <input
              type="text"
              placeholder="Replace with..."
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              className="flex-1 bg-[#121316] border border-[#43474e] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#8e9199] focus:outline-none focus:border-[#a8c7fa] font-mono"
            />
            <button
              type="button"
              onClick={handleExecuteReplaceAll}
              disabled={!searchQuery.trim() || totalMatches === 0}
              className="px-2 py-1.5 bg-[#2b2d30] hover:bg-[#383a3e] disabled:opacity-40 text-[#a8c7fa] border border-[#43474e] rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="Replace All Occurrences"
            >
              <M3Icon name="find_replace" size={14} />
              <span>Replace All</span>
            </button>
          </div>
        )}

        {/* Result metrics */}
        {searchQuery.trim() && (
          <div className="flex items-center justify-between text-[11px] text-[#8e9199] pt-1">
            <span>
              {totalMatches} {totalMatches === 1 ? 'match' : 'matches'} in {searchResults.length}{' '}
              {searchResults.length === 1 ? 'file' : 'files'}
            </span>
            <button
              onClick={() => {
                const nextState = Object.keys(collapsedFiles).length === 0;
                const newCollapsed: Record<string, boolean> = {};
                if (nextState) {
                  searchResults.forEach((r) => {
                    newCollapsed[r.filePath] = true;
                  });
                }
                setCollapsedFiles(newCollapsed);
              }}
              className="text-[#a8c7fa] hover:underline cursor-pointer"
            >
              {Object.keys(collapsedFiles).length > 0 ? 'Expand all' : 'Collapse all'}
            </button>
          </div>
        )}
      </div>

      {/* Results Tree List */}
      <div className="flex-1 overflow-y-auto p-2">
        {!searchQuery.trim() ? (
          <div className="py-12 text-center text-[#8e9199] space-y-1">
            <M3Icon name="find_in_page" size={36} className="mx-auto mb-1 opacity-40 text-[#a8c7fa]" />
            <p className="text-xs">Type a keyword or regular expression to search across all project files.</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="py-12 text-center text-[#8e9199] space-y-1">
            <M3Icon name="search_off" size={32} className="mx-auto mb-1 opacity-50 text-[#ff8585]" />
            <p className="text-xs font-medium text-white">No results found</p>
            <p className="text-[11px]">No matches found for &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          <div className="space-y-1">
            {searchResults.map((result) => {
              const isCollapsed = !!collapsedFiles[result.filePath];

              return (
                <div key={result.filePath} className="rounded-lg overflow-hidden border border-[#43474e]/30 bg-[#1e1f22]">
                  {/* File group title */}
                  <button
                    type="button"
                    onClick={() => toggleFileCollapse(result.filePath)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[#c4c6d0] hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <M3Icon
                        name={isCollapsed ? 'chevron_right' : 'expand_more'}
                        size={16}
                        className="text-[#8e9199]"
                      />
                      <M3Icon name="description" size={14} className="text-[#a8c7fa]" />
                      <span className="font-semibold text-white truncate font-mono text-[11px]">
                        {result.filePath}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.2 rounded-full bg-[#2b2d30] text-[10px] text-[#a8c7fa] font-mono">
                      {result.matches.length}
                    </span>
                  </button>

                  {/* Matches lines */}
                  {!isCollapsed && (
                    <div className="border-t border-[#43474e]/20 divide-y divide-[#43474e]/10 bg-[#121316]">
                      {result.matches.map((match, idx) => {
                        const before = match.lineContent.substring(0, match.matchStart);
                        const matched = match.lineContent.substring(
                          match.matchStart,
                          match.matchStart + match.matchLength
                        );
                        const after = match.lineContent.substring(
                          match.matchStart + match.matchLength
                        );

                        return (
                          <div
                            key={idx}
                            onClick={() => onSelectResult(result.filePath, match.lineNumber)}
                            className="px-3 py-1 text-xs hover:bg-white/5 cursor-pointer flex items-baseline gap-2 font-mono group transition-colors"
                          >
                            <span className="text-[10px] text-[#6e7179] w-6 text-right shrink-0 select-none group-hover:text-[#a8c7fa]">
                              {match.lineNumber}
                            </span>
                            <span className="truncate text-[#c4c6d0]">
                              <span>{before}</span>
                              <mark className="bg-[#a8c7fa]/30 text-[#a8c7fa] font-bold px-0.5 rounded">
                                {matched}
                              </mark>
                              <span>{after}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
