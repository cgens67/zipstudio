/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { FileTreeNode, getFileExtension } from '../utils/fileSystem';
import { M3Icon, M3IconButton } from './M3Components';
import { StarterTemplate, STARTER_TEMPLATES } from '../utils/starterTemplates';
import { Translations, TRANSLATIONS } from '../utils/i18n';

interface SidebarProps {
  tree: FileTreeNode[];
  activeFilePath: string;
  t?: Translations;
  onSelectFile: (path: string) => void;
  onUploadZip: (file: File) => void;
  onExportZip: () => void;
  onCreateFile: (path: string) => void;
  onCreateFolder: (path: string) => void;
  onDeleteNode: (path: string) => void;
  onRenameNode: (oldPath: string, newPath: string) => void;
  onLoadTemplate: (template: StarterTemplate) => void;
  onExplainCode: () => void;
}

export function Sidebar({
  tree,
  activeFilePath,
  t = TRANSLATIONS.en,
  onSelectFile,
  onUploadZip,
  onExportZip,
  onCreateFile,
  onCreateFolder,
  onDeleteNode,
  onLoadTemplate,
  onExplainCode,
}: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    src: true,
    components: true,
    styles: true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newPathInput, setNewPathInput] = useState('');
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadZip(e.target.files[0]);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPathInput.trim()) return;

    if (isCreatingFile) {
      onCreateFile(newPathInput.trim());
      setIsCreatingFile(false);
    } else if (isCreatingFolder) {
      onCreateFolder(newPathInput.trim());
      setIsCreatingFolder(false);
    }
    setNewPathInput('');
  };

  const getFileIcon = (fileName: string, isFolder: boolean, isExpanded?: boolean) => {
    if (isFolder) {
      return isExpanded ? 'folder_open' : 'folder';
    }
    const ext = getFileExtension(fileName);
    switch (ext) {
      case 'html':
      case 'htm':
        return 'html';
      case 'css':
      case 'scss':
        return 'css';
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return 'code';
      case 'json':
        return 'data_object';
      case 'md':
        return 'description';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
      case 'gif':
      case 'webp':
        return 'image';
      default:
        return 'draft';
    }
  };

  const renderTreeNodes = (nodes: FileTreeNode[], depth = 0) => {
    const filtered = nodes.filter((node) => {
      if (!searchQuery) return true;
      return (
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.path.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    if (filtered.length === 0 && searchQuery && depth === 0) {
      return (
        <div className="p-3 text-center text-xs text-[#8e9199]">
          <p>{t.noFilesMatch}</p>
        </div>
      );
    }

    return filtered.map((node) => {
      const isFolder = node.isFolder;
      const isExpanded = !!expandedFolders[node.path];
      const isActive = activeFilePath === node.path;
      const paddingLeft = `${depth * 14 + 12}px`;

      if (isFolder) {
        return (
          <div key={node.path} className="select-none">
            <button
              type="button"
              onClick={() => toggleFolder(node.path)}
              style={{ paddingLeft }}
              className="w-full flex items-center gap-1.5 py-1 px-2 text-xs text-[#c4c6d0] hover:text-white hover:bg-white/5 transition-colors text-left group cursor-pointer"
            >
              <M3Icon
                name={isExpanded ? 'expand_more' : 'chevron_right'}
                size={16}
                className="text-[#8e9199] transition-transform duration-200"
              />
              <M3Icon
                name={getFileIcon(node.name, true, isExpanded)}
                size={16}
                className="text-[#a8c7fa]"
              />
              <span className="truncate flex-1 font-mono text-[11px] font-medium">{node.name}</span>
              <span
                title={t.delete}
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`${t.delete} "${node.name}"?`)) {
                    onDeleteNode(node.path);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-[#ff8585] transition-opacity"
              >
                <M3Icon name="delete" size={14} />
              </span>
            </button>
            {/* Jetpack Compose style animateContentSize smooth grid transition */}
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-250 ease-out ${
                isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                {node.children && renderTreeNodes(node.children, depth + 1)}
              </div>
            </div>
          </div>
        );
      }

      return (
        <div
          key={node.path}
          style={{ paddingLeft }}
          onClick={() => onSelectFile(node.path)}
          className={`w-full flex items-center gap-2 py-1 px-2 text-xs cursor-pointer transition-all duration-150 text-left group select-none ${
            isActive
              ? 'bg-[#00468b]/30 text-[#a8c7fa] border-l-2 border-[#a8c7fa] font-medium'
              : 'text-[#e2e2e6] hover:bg-white/5'
          }`}
        >
          <M3Icon
            name={getFileIcon(node.name, false)}
            size={16}
            className={isActive ? 'text-[#a8c7fa]' : 'text-[#8e9199]'}
          />
          <span className="truncate flex-1 font-mono text-[11px]">{node.name}</span>
          <span
            title={t.delete}
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`${t.delete} "${node.name}"?`)) {
                onDeleteNode(node.path);
              }
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-[#8e9199] hover:text-[#ff8585] transition-opacity"
          >
            <M3Icon name="delete" size={14} />
          </span>
        </div>
      );
    });
  };

  return (
    <aside className="w-full h-full bg-[#18191c] flex flex-col shrink-0 select-none overflow-hidden">
      {/* Hidden file input for zip upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Explorer Header */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-[#43474e]/30 bg-[#1e1f22] shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#c4c6d0]">
          <M3Icon name="folder_zip" size={18} className="text-[#a8c7fa]" />
          <span>{t.explorer}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <M3IconButton
            size="sm"
            icon="note_add"
            label={t.newFile}
            onClick={() => {
              setIsCreatingFile(true);
              setIsCreatingFolder(false);
              setNewPathInput('');
            }}
          />
          <M3IconButton
            size="sm"
            icon="create_new_folder"
            label={t.newFolder}
            onClick={() => {
              setIsCreatingFolder(true);
              setIsCreatingFile(false);
              setNewPathInput('');
            }}
          />
          <M3IconButton
            size="sm"
            icon="upload_file"
            label={t.importZip}
            onClick={() => fileInputRef.current?.click()}
          />
          <M3IconButton
            size="sm"
            icon="download"
            label={t.exportZip}
            onClick={onExportZip}
          />
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="p-2 border-b border-[#43474e]/20 bg-[#121316]/50 shrink-0">
        <div className="flex items-center gap-1.5 mb-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#a8c7fa]/10 hover:bg-[#a8c7fa]/20 text-[#a8c7fa] border border-[#a8c7fa]/30 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title={t.importZip}
          >
            <M3Icon name="upload" size={16} />
            <span>{t.importZip}</span>
          </button>
          <button
            onClick={() => setShowTemplatesModal(true)}
            className="py-1.5 px-2.5 rounded-lg bg-[#2b2d30] hover:bg-[#383a3e] text-[#e2e2e6] border border-[#43474e]/60 text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title={t.templates}
          >
            <M3Icon name="widgets" size={16} />
            <span>{t.templates}</span>
          </button>
        </div>

        {/* Search input with animateContentSize transition */}
        <div className="relative">
          <M3Icon
            name="search"
            size={14}
            className="absolute left-2 top-2 text-[#8e9199]"
          />
          <input
            type="text"
            placeholder={t.searchFiles}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1e1f22] border border-[#43474e]/40 rounded-md pl-7 pr-2 py-1 text-xs text-[#e2e2e6] placeholder-[#8e9199] focus:outline-none focus:border-[#a8c7fa]"
          />
        </div>
      </div>

      {/* New File / Folder inline form with animateContentSize smooth grid expansion */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-250 ease-out border-b border-[#43474e]/40 ${
          isCreatingFile || isCreatingFolder ? 'grid-rows-[1fr] opacity-100 bg-[#2b2d30]' : 'grid-rows-[0fr] opacity-0 bg-transparent'
        }`}
      >
        <div className="overflow-hidden">
          {(isCreatingFile || isCreatingFolder) && (
            <form onSubmit={handleCreateSubmit} className="p-2">
              <div className="text-[11px] text-[#a8c7fa] font-medium mb-1 flex items-center gap-1">
                <M3Icon name={isCreatingFile ? 'note_add' : 'create_new_folder'} size={14} />
                <span>{isCreatingFile ? t.newFile : t.newFolder}</span>
              </div>
              <div className="flex gap-1">
                <input
                  autoFocus
                  type="text"
                  placeholder={isCreatingFile ? 'src/helper.js' : 'src/assets'}
                  value={newPathInput}
                  onChange={(e) => setNewPathInput(e.target.value)}
                  className="flex-1 bg-[#18191c] border border-[#43474e] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#a8c7fa] font-mono"
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-[#a8c7fa] text-[#003062] rounded text-xs font-semibold cursor-pointer"
                >
                  {t.create}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingFile(false);
                    setIsCreatingFolder(false);
                  }}
                  className="px-1.5 py-1 text-[#8e9199] hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto py-1">
        {tree.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#8e9199]">
            <M3Icon name="folder_open" size={32} className="mx-auto mb-2 opacity-50" />
            <p className="font-medium text-[#c4c6d0]">{t.noFilesLoaded}</p>
            <p className="mt-1">{t.noFilesLoadedDesc}</p>
          </div>
        ) : (
          renderTreeNodes(tree)
        )}
      </div>

      {/* Plain English Mode quick button */}
      <div className="p-2 border-t border-[#43474e]/30 bg-[#1e1f22] shrink-0">
        <button
          onClick={onExplainCode}
          className="w-full py-1.5 px-3 rounded-lg bg-[#6750a4]/20 hover:bg-[#6750a4]/30 text-[#d0bcff] border border-[#6750a4]/40 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <M3Icon name="help_outline" size={16} />
          <span>{t.plainEnglish}</span>
        </button>
      </div>

      {/* Starter Templates Modal with animateContentSize scale & fade */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1e1f22] border border-[#43474e] rounded-2xl max-w-md w-full p-5 shadow-2xl transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <M3Icon name="widgets" size={24} className="text-[#a8c7fa]" />
                <h3 className="text-base font-semibold text-white">{t.templates}</h3>
              </div>
              <M3IconButton
                size="sm"
                icon="close"
                label={t.close}
                onClick={() => setShowTemplatesModal(false)}
              />
            </div>
            <p className="text-xs text-[#c4c6d0] mb-4">
              {t.chooseTemplate}
            </p>
            <div className="space-y-3">
              {STARTER_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => {
                    onLoadTemplate(tmpl);
                    setShowTemplatesModal(false);
                  }}
                  className="p-3 rounded-xl bg-[#2b2d30] hover:bg-[#383a3e] border border-[#43474e]/50 cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-[#a8c7fa]">{tmpl.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00468b] text-[#d6e3ff]">
                      {tmpl.category}
                    </span>
                  </div>
                  <p className="text-xs text-[#c4c6d0]">{tmpl.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
