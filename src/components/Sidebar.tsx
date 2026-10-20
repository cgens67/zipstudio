/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  FileTreeNode,
  getFileExtension,
  VFile,
  formatBytes,
  packageSubtreeZip,
} from '../utils/fileSystem';
import { M3Icon, M3IconButton } from './M3Components';
import { Translations, TRANSLATIONS } from '../utils/i18n';

interface SidebarProps {
  tree: FileTreeNode[];
  activeFilePath: string;
  files?: Record<string, VFile>;
  t?: Translations;
  onSelectFile: (path: string) => void;
  onUploadZip: (file: File) => void;
  onExportZip: () => void;
  onCreateFile: (path: string) => void;
  onCreateFolder: (path: string) => void;
  onDeleteNode: (path: string) => void;
  onRenameNode: (oldPath: string, newPath: string) => void;
}

export function Sidebar({
  tree,
  activeFilePath,
  files = {},
  t = TRANSLATIONS.en,
  onSelectFile,
  onUploadZip,
  onExportZip,
  onCreateFile,
  onCreateFolder,
  onDeleteNode,
  onRenameNode,
}: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    src: true,
    components: true,
    styles: true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [targetParentFolder, setTargetParentFolder] = useState('');
  const [newPathInput, setNewPathInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node: FileTreeNode;
  } | null>(null);

  // Modals state
  const [propertiesNode, setPropertiesNode] = useState<FileTreeNode | null>(null);
  const [renameNode, setRenameNode] = useState<FileTreeNode | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');

  // Touch long-press ref for mobile
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setPropertiesNode(null);
        setRenameNode(null);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadZip(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPathInput.trim()) return;

    let fullPath = newPathInput.trim().replace(/^\/+/, '');
    if (targetParentFolder) {
      fullPath = `${targetParentFolder.replace(/\/+$/, '')}/${fullPath}`;
    }

    if (isCreatingFile) {
      onCreateFile(fullPath);
    } else {
      onCreateFolder(fullPath);
    }
    setNewPathInput('');
    setIsCreatingFile(false);
    setIsCreatingFolder(false);
    setTargetParentFolder('');
  };

  // Context Menu Trigger Handlers
  const openContextMenuAt = (x: number, y: number, node: FileTreeNode) => {
    // Screen bounds adjustment
    const menuWidth = 180;
    const menuHeight = 220;
    const boundedX = Math.min(x, window.innerWidth - menuWidth - 10);
    const boundedY = Math.min(y, window.innerHeight - menuHeight - 10);

    setContextMenu({
      visible: true,
      x: Math.max(10, boundedX),
      y: Math.max(10, boundedY),
      node,
    });
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileTreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenuAt(e.clientX, e.clientY, node);
  };

  const handleTouchStart = (e: React.TouchEvent, node: FileTreeNode) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      if (navigator.vibrate) {
        navigator.vibrate(40);
      }
      openContextMenuAt(touchStartPos.current.x, touchStartPos.current.y, node);
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  // Context Menu Actions
  const handleAddFileInFolder = (node: FileTreeNode) => {
    setTargetParentFolder(node.path);
    setIsCreatingFile(true);
    setIsCreatingFolder(false);
    setContextMenu(null);
  };

  const handleOpenRename = (node: FileTreeNode) => {
    setRenameNode(node);
    setRenameInputValue(node.name);
    setContextMenu(null);
  };

  const handleConfirmRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameNode || !renameInputValue.trim() || renameInputValue.trim() === renameNode.name) {
      setRenameNode(null);
      return;
    }
    const cleanNewName = renameInputValue.trim();
    const parentPath = renameNode.path.includes('/')
      ? renameNode.path.substring(0, renameNode.path.lastIndexOf('/'))
      : '';
    const newPath = parentPath ? `${parentPath}/${cleanNewName}` : cleanNewName;

    onRenameNode(renameNode.path, newPath);
    setRenameNode(null);
  };

  const handleDelete = (node: FileTreeNode) => {
    setContextMenu(null);
    if (window.confirm(t.deleteConfirm)) {
      onDeleteNode(node.path);
    }
  };

  const handleDownload = async (node: FileTreeNode) => {
    setContextMenu(null);
    if (node.isFolder) {
      // Download zipped folder subtree
      try {
        const blob = await packageSubtreeZip(files, node.path);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${node.name || 'folder'}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err: any) {
        alert(`${t.exportFailed}: ${err.message}`);
      }
    } else {
      // Download single file
      const file = files[node.path];
      if (!file) return;

      let blob: Blob;
      if (file.isBinary && file.content.startsWith('data:')) {
        const commaIndex = file.content.indexOf(',');
        const base64 = file.content.substring(commaIndex + 1);
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray]);
      } else {
        blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = node.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleViewProperties = (node: FileTreeNode) => {
    setPropertiesNode(node);
    setContextMenu(null);
  };

  // Icon Helper
  const getIconForFile = (filename: string): { icon: string; color: string } => {
    const ext = getFileExtension(filename);
    switch (ext) {
      case 'html':
      case 'htm':
        return { icon: 'html', color: 'text-[#e44d26]' };
      case 'css':
        return { icon: 'css', color: 'text-[#264de4]' };
      case 'js':
      case 'jsx':
        return { icon: 'javascript', color: 'text-[#f7df1e]' };
      case 'ts':
      case 'tsx':
        return { icon: 'data_object', color: 'text-[#3178c6]' };
      case 'json':
        return { icon: 'code', color: 'text-[#cbcb41]' };
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
      case 'svg':
        return { icon: 'image', color: 'text-[#a8c7fa]' };
      case 'md':
      case 'markdown':
        return { icon: 'article', color: 'text-[#a8c7fa]' };
      case 'xml':
        return { icon: 'polyline', color: 'text-[#3ddc84]' };
      default:
        return { icon: 'description', color: 'text-[#8e9199]' };
    }
  };

  // Render tree node
  const renderTreeNode = (node: FileTreeNode, depth = 0) => {
    const isExpanded = expandedFolders[node.path];
    const isSelected = activeFilePath === node.path;
    const paddingLeft = `${depth * 14 + 10}px`;

    if (searchQuery.trim() && !node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      if (!node.children || !node.children.some((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))) {
        return null;
      }
    }

    if (node.isFolder) {
      return (
        <div key={node.path} className="select-none">
          <div
            onClick={() => toggleFolder(node.path)}
            onContextMenu={(e) => handleContextMenu(e, node)}
            onTouchStart={(e) => handleTouchStart(e, node)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ paddingLeft }}
            className="flex items-center gap-1.5 py-1 px-2 text-xs text-[#c4c6d0] hover:bg-[#2b2d30] hover:text-white cursor-pointer rounded transition-colors group relative"
          >
            <M3Icon
              name={isExpanded ? 'expand_more' : 'chevron_right'}
              size={16}
              className="text-[#8e9199] group-hover:text-white transition-transform"
            />
            <M3Icon
              name={isExpanded ? 'folder_open' : 'folder'}
              size={16}
              className="text-[#a8c7fa]"
            />
            <span className="truncate font-medium flex-1">{node.name}</span>

            {/* Quick Context Menu Trigger */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                openContextMenuAt(e.clientX, e.clientY, node);
              }}
              title={t.properties}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-[#8e9199] hover:text-white"
            >
              <M3Icon name="more_vert" size={14} />
            </button>
          </div>

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
              isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              {node.children && node.children.map((child) => renderTreeNode(child, depth + 1))}
            </div>
          </div>
        </div>
      );
    }

    const { icon, color } = getIconForFile(node.name);

    return (
      <div
        key={node.path}
        onClick={() => onSelectFile(node.path)}
        onContextMenu={(e) => handleContextMenu(e, node)}
        onTouchStart={(e) => handleTouchStart(e, node)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ paddingLeft }}
        className={`flex items-center gap-2 py-1 px-2 text-xs cursor-pointer rounded transition-colors select-none group relative ${
          isSelected
            ? 'bg-[#00468b]/30 text-[#a8c7fa] font-medium border-l-2 border-[#a8c7fa]'
            : 'text-[#e2e2e6] hover:bg-[#2b2d30] hover:text-white'
        }`}
      >
        <M3Icon name={icon} size={15} className={color} />
        <span className="truncate flex-1">{node.name}</span>

        {/* Quick Context Menu Trigger */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            openContextMenuAt(e.clientX, e.clientY, node);
          }}
          title={t.properties}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-[#8e9199] hover:text-white"
        >
          <M3Icon name="more_vert" size={14} />
        </button>
      </div>
    );
  };

  return (
    <aside className="w-full h-full bg-[#18191c] border-r border-[#43474e]/40 flex flex-col shrink-0 select-none overflow-hidden relative">
      {/* Hidden file input for zip upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Explorer Header */}
      <div className="p-3 border-b border-[#43474e]/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <M3Icon name="folder_zip" size={18} className="text-[#a8c7fa]" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#c4c6d0]">
            {t.explorer}
          </h2>
        </div>

        <div className="flex items-center gap-1">
          <M3IconButton
            size="sm"
            icon="note_add"
            label={t.newFile}
            onClick={() => {
              setTargetParentFolder('');
              setIsCreatingFile(true);
              setIsCreatingFolder(false);
            }}
          />
          <M3IconButton
            size="sm"
            icon="create_new_folder"
            label={t.newFolder}
            onClick={() => {
              setTargetParentFolder('');
              setIsCreatingFolder(true);
              setIsCreatingFile(false);
            }}
          />
          <M3IconButton
            size="sm"
            icon="download"
            label={t.exportZip}
            onClick={onExportZip}
          />
        </div>
      </div>

      {/* Primary Actions: Import & Export ZIP */}
      <div className="p-2 border-b border-[#43474e]/20 bg-[#121316]/50 shrink-0 space-y-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#a8c7fa]/10 hover:bg-[#a8c7fa]/20 text-[#a8c7fa] border border-[#a8c7fa]/30 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title={t.importZip}
          >
            <M3Icon name="upload" size={16} />
            <span>{t.importZip}</span>
          </button>
          <button
            onClick={onExportZip}
            className="py-1.5 px-2.5 rounded-lg bg-[#2b2d30] hover:bg-[#383a3e] text-[#e2e2e6] border border-[#43474e]/60 text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title={t.exportZip}
          >
            <M3Icon name="download" size={16} />
            <span>{t.exportZip}</span>
          </button>
        </div>

        {/* Search input */}
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

      {/* New File / Folder inline form with animateContentSize transition */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out border-b border-[#43474e]/40 ${
          isCreatingFile || isCreatingFolder ? 'grid-rows-[1fr] opacity-100 bg-[#2b2d30]' : 'grid-rows-[0fr] opacity-0 bg-transparent'
        }`}
      >
        <div className="overflow-hidden">
          {(isCreatingFile || isCreatingFolder) && (
            <form onSubmit={handleCreateSubmit} className="p-2">
              <div className="text-[11px] text-[#a8c7fa] font-medium mb-1 flex items-center gap-1">
                <M3Icon name={isCreatingFile ? 'note_add' : 'create_new_folder'} size={14} />
                <span>
                  {isCreatingFile ? t.newFile : t.newFolder}
                  {targetParentFolder && ` in /${targetParentFolder}`}
                </span>
              </div>
              <div className="flex gap-1">
                <input
                  autoFocus
                  type="text"
                  placeholder={isCreatingFile ? 'src/index.js' : 'src/assets'}
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
                    setTargetParentFolder('');
                  }}
                  className="px-2 py-1 bg-transparent hover:bg-white/10 text-[#8e9199] rounded text-xs cursor-pointer"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto overscroll-contain py-2 px-1 divide-y-0">
        {tree.length === 0 ? (
          <div className="p-4 text-center text-[#8e9199] text-xs leading-relaxed">
            <M3Icon name="inbox" size={32} className="mx-auto mb-2 text-[#43474e]" />
            <p className="font-medium text-[#c4c6d0]">{t.noFilesLoaded}</p>
            <p className="text-[11px] mt-1">{t.noFilesLoadedDesc}</p>
          </div>
        ) : (
          tree.map((node) => renderTreeNode(node))
        )}
      </div>

      {/* Custom Context Menu */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-48 bg-[#1e1f22] border border-[#43474e]/60 rounded-xl shadow-2xl py-1 text-xs text-[#e2e2e6] select-none backdrop-blur-md m3-menu-spring"
        >
          <div className="px-3 py-1.5 text-[11px] font-mono text-[#a8c7fa] border-b border-[#43474e]/30 truncate font-semibold">
            {contextMenu.node.name}
          </div>

          {contextMenu.node.isFolder && (
            <button
              onClick={() => handleAddFileInFolder(contextMenu.node)}
              className="w-full px-3 py-2 text-left hover:bg-[#2b2d30] flex items-center gap-2 cursor-pointer text-[#e2e2e6]"
            >
              <M3Icon name="note_add" size={15} className="text-[#a8c7fa]" />
              <span>{t.addFile}</span>
            </button>
          )}

          <button
            onClick={() => handleOpenRename(contextMenu.node)}
            className="w-full px-3 py-2 text-left hover:bg-[#2b2d30] flex items-center gap-2 cursor-pointer text-[#e2e2e6]"
          >
            <M3Icon name="edit" size={15} className="text-[#c4c6d0]" />
            <span>{t.rename}</span>
          </button>

          <button
            onClick={() => handleDownload(contextMenu.node)}
            className="w-full px-3 py-2 text-left hover:bg-[#2b2d30] flex items-center gap-2 cursor-pointer text-[#e2e2e6]"
          >
            <M3Icon name="download" size={15} className="text-[#c4c6d0]" />
            <span>{t.download}</span>
          </button>

          <button
            onClick={() => handleViewProperties(contextMenu.node)}
            className="w-full px-3 py-2 text-left hover:bg-[#2b2d30] flex items-center gap-2 cursor-pointer text-[#e2e2e6]"
          >
            <M3Icon name="info" size={15} className="text-[#8e9199]" />
            <span>{t.properties}</span>
          </button>

          <div className="border-t border-[#43474e]/30 my-1" />

          <button
            onClick={() => handleDelete(contextMenu.node)}
            className="w-full px-3 py-2 text-left hover:bg-[#ffb4ab]/10 text-[#ffb4ab] flex items-center gap-2 cursor-pointer"
          >
            <M3Icon name="delete" size={15} />
            <span>{t.delete}</span>
          </button>
        </div>
      )}

      {/* Rename Modal Dialog */}
      {renameNode && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e1f22] border border-[#43474e]/60 rounded-2xl w-full max-w-sm p-4 shadow-2xl m3-dialog-bounce">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <M3Icon name="edit" size={18} className="text-[#a8c7fa]" />
              <span>{renameNode.isFolder ? t.renameFolder : t.renameFile}</span>
            </h3>
            <p className="text-xs text-[#8e9199] mb-3">{t.enterNewName}</p>
            <form onSubmit={handleConfirmRename}>
              <input
                autoFocus
                type="text"
                value={renameInputValue}
                onChange={(e) => setRenameInputValue(e.target.value)}
                className="w-full bg-[#121316] border border-[#43474e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a8c7fa] font-mono mb-4"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameNode(null)}
                  className="px-3 py-1.5 rounded-lg bg-transparent hover:bg-white/5 text-xs text-[#c4c6d0] cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#a8c7fa] text-[#003062] font-semibold text-xs cursor-pointer"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Properties Modal Dialog */}
      {propertiesNode && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e1f22] border border-[#43474e]/60 rounded-2xl w-full max-w-md p-5 shadow-2xl m3-dialog-bounce">
            <div className="flex items-center justify-between border-b border-[#43474e]/30 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <M3Icon
                  name={propertiesNode.isFolder ? 'folder' : 'description'}
                  size={20}
                  className="text-[#a8c7fa]"
                />
                <h3 className="text-sm font-bold text-white truncate max-w-xs">
                  {propertiesNode.name}
                </h3>
              </div>
              <M3IconButton
                size="sm"
                icon="close"
                label={t.close}
                onClick={() => setPropertiesNode(null)}
              />
            </div>

            {/* Properties Grid */}
            <div className="space-y-3 text-xs">
              <div className="flex items-start justify-between py-1 border-b border-[#43474e]/20">
                <span className="text-[#8e9199]">{t.filePath}:</span>
                <span className="font-mono text-[#e2e2e6] text-right truncate max-w-[240px] select-all">
                  /{propertiesNode.path}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#43474e]/20">
                <span className="text-[#8e9199]">{t.fileType}:</span>
                <span className="text-[#e2e2e6] font-medium">
                  {propertiesNode.isFolder
                    ? 'Folder'
                    : getFileExtension(propertiesNode.name).toUpperCase() || 'Plain Text'}
                </span>
              </div>

              {!propertiesNode.isFolder && files[propertiesNode.path] && (
                <>
                  <div className="flex items-center justify-between py-1 border-b border-[#43474e]/20">
                    <span className="text-[#8e9199]">{t.fileSize}:</span>
                    <span className="font-mono text-[#a8c7fa]">
                      {formatBytes(files[propertiesNode.path].size)} ({files[propertiesNode.path].size} bytes)
                    </span>
                  </div>

                  {!files[propertiesNode.path].isBinary && (
                    <div className="flex items-center justify-between py-1 border-b border-[#43474e]/20">
                      <span className="text-[#8e9199]">{t.fileLines}:</span>
                      <span className="font-mono text-[#e2e2e6]">
                        {files[propertiesNode.path].content.split('\n').length}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-1 border-b border-[#43474e]/20">
                    <span className="text-[#8e9199]">{t.lastModified}:</span>
                    <span className="text-[#c4c6d0]">
                      {new Date(files[propertiesNode.path].lastModified).toLocaleString()}
                    </span>
                  </div>
                </>
              )}

              {propertiesNode.isFolder && (
                <div className="flex items-center justify-between py-1 border-b border-[#43474e]/20">
                  <span className="text-[#8e9199]">Items:</span>
                  <span className="font-mono text-[#e2e2e6]">
                    {propertiesNode.children ? propertiesNode.children.length : 0} items
                  </span>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end">
              <button
                onClick={() => setPropertiesNode(null)}
                className="px-4 py-2 bg-[#2b2d30] hover:bg-[#383a3e] text-[#a8c7fa] rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
