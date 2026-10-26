/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { M3Icon, M3IconButton, M3Button, M3Badge } from './M3Components';
import { M3Switch } from './M3Switch';
import { M3Dropdown } from './M3Dropdown';
import { Translations, SupportedLanguage } from '../utils/i18n';
import { useDialogAnimation } from '../utils/useDialogAnimation';
import { GitHubRepo } from '../utils/gitService';

export type AppTheme = 'dark' | 'light' | 'system';

export interface EditorSettings {
  theme: AppTheme;
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  fontFamily: string;
  autoConnectCollab: boolean;
  collabName: string;
  collabColor: string;
}

export const DEFAULT_SETTINGS: EditorSettings = {
  theme: 'dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  lineNumbers: true,
  fontFamily: "'JetBrains Mono', monospace",
  autoConnectCollab: true,
  collabName: '',
  collabColor: '#a8c7fa',
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: EditorSettings;
  onUpdateSettings: (newSettings: Partial<EditorSettings>) => void;
  onResetWorkspace?: () => void;
  currentLang: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  t?: Translations;
  fileCount?: number;
  selectedRepo?: GitHubRepo | null;
  activeBranch?: string;
  isAuthenticated?: boolean;
  onCreateRepo?: (name: string, description: string, isPrivate: boolean) => Promise<void> | void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetWorkspace,
  currentLang,
  onLanguageChange,
  t,
  fileCount = 0,
  selectedRepo,
  activeBranch = 'main',
  isAuthenticated = false,
  onCreateRepo,
}: SettingsModalProps) {
  const [activeCategory, setActiveCategory] = useState<'appearance' | 'editor' | 'collab' | 'workspace'>('appearance');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // New Repository Creation State
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDesc, setNewRepoDesc] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [repoSuccessMsg, setRepoSuccessMsg] = useState<string | null>(null);
  const [repoErrorMsg, setRepoErrorMsg] = useState<string | null>(null);

  // Smooth opening and closing animation hook
  const { isRendered, triggerClose, backdropClass, dialogClass } = useDialogAnimation(isOpen, onClose, 180);

  if (!isRendered) return null;

  const fontOptions = [
    { value: "'JetBrains Mono', monospace", label: 'JetBrains Mono (Recommended)' },
    { value: "'Fira Code', monospace", label: 'Fira Code' },
    { value: "'Roboto Mono', monospace", label: 'Roboto Mono' },
    { value: "'Roboto Flex', sans-serif", label: 'Roboto Flex' },
    { value: 'monospace', label: 'System Monospace' },
  ];

  const fontSizeOptions = [
    { value: '12', label: '12px - Compact' },
    { value: '13', label: '13px - Regular' },
    { value: '14', label: '14px - Standard (Default)' },
    { value: '16', label: '16px - Medium' },
    { value: '18', label: '18px - Large' },
  ];

  const tabSizeOptions = [
    { value: '2', label: t?.twoSpaces || '2 spaces (Default)' },
    { value: '4', label: t?.fourSpaces || '4 spaces' },
  ];

  const languageOptions = [
    { value: 'en', label: 'English (US)', description: 'Primary interface in English' },
    { value: 'zh-CN', label: '简体中文 (Simplified Chinese)', description: '完整中文界面与代码分析' },
    { value: 'ms', label: 'Bahasa Melayu (Malay)', description: 'Antara muka & penerangan Bahasa Melayu' },
  ];

  const colorPalette = [
    { name: 'Sky Blue', hex: '#a8c7fa' },
    { name: 'Emerald', hex: '#3ddc84' },
    { name: 'Amber', hex: '#ffd54f' },
    { name: 'Coral', hex: '#ff8585' },
    { name: 'Amethyst', hex: '#d0bcff' },
    { name: 'Cyan', hex: '#70d6ff' },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 ${backdropClass}`}
      onClick={triggerClose}
    >
      <div
        className={`bg-white dark:bg-[#1e1f22] border border-[#d8dae5] dark:border-[#43474e] rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[88vh] ${dialogClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#f8f9fe] dark:bg-[#18191c] border-b border-[#d8dae5] dark:border-[#43474e]/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#d3e3fd] dark:bg-[#00468b]/30 border border-[#0b57d0]/30 dark:border-[#a8c7fa]/30 flex items-center justify-center text-[#0b57d0] dark:text-[#a8c7fa]">
              <M3Icon name="settings" size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-[#191c20] dark:text-white">
                {t?.settingsTitle || 'ZipStudio Settings'}
              </h2>
              <p className="text-[11px] text-[#5d6168] dark:text-[#8e9199]">
                {t?.settingsSubtitle || 'Theme, Language, Editor, and Drag & Drop'}
              </p>
            </div>
          </div>
          <M3IconButton icon="close" size="sm" label={t?.close || 'Close'} onClick={triggerClose} />
        </div>

        {/* Category Tabs: fixed light mode styling without pitch-black background */}
        <div className="h-10 bg-[#eef0f6] dark:bg-[#141518] border-b border-[#d8dae5] dark:border-[#43474e]/30 flex items-center px-3 gap-1 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveCategory('appearance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              activeCategory === 'appearance'
                ? 'bg-white dark:bg-[#2b2d30] text-[#0b57d0] dark:text-[#a8c7fa] border border-[#d8dae5] dark:border-[#a8c7fa]/30 shadow-xs font-semibold'
                : 'text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5'
            }`}
          >
            <M3Icon name="palette" size={15} />
            <span>{t?.appearanceTab || 'Appearance & Language'}</span>
          </button>
          <button
            onClick={() => setActiveCategory('editor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              activeCategory === 'editor'
                ? 'bg-white dark:bg-[#2b2d30] text-[#0b57d0] dark:text-[#a8c7fa] border border-[#d8dae5] dark:border-[#a8c7fa]/30 shadow-xs font-semibold'
                : 'text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5'
            }`}
          >
            <M3Icon name="code" size={15} />
            <span>{t?.editorTab || 'Editor'}</span>
          </button>
          <button
            onClick={() => setActiveCategory('collab')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              activeCategory === 'collab'
                ? 'bg-white dark:bg-[#2b2d30] text-[#0b57d0] dark:text-[#a8c7fa] border border-[#d8dae5] dark:border-[#a8c7fa]/30 shadow-xs font-semibold'
                : 'text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5'
            }`}
          >
            <M3Icon name="group" size={15} />
            <span>{t?.collabTab || 'Live Collab'}</span>
          </button>
          <button
            onClick={() => setActiveCategory('workspace')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              activeCategory === 'workspace'
                ? 'bg-white dark:bg-[#2b2d30] text-[#0b57d0] dark:text-[#a8c7fa] border border-[#d8dae5] dark:border-[#a8c7fa]/30 shadow-xs font-semibold'
                : 'text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5'
            }`}
          >
            <M3Icon name="folder_zip" size={15} />
            <span>{t?.workspaceTab || 'Workspace'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-white dark:bg-[#1e1f22]">
          {/* 1. APPEARANCE & LANGUAGE */}
          {activeCategory === 'appearance' && (
            <div className="space-y-4">
              {/* Color Theme Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#191c20] dark:text-white mb-2">
                  {t?.colorTheme || 'Color Theme'}
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Dark Mode */}
                  <button
                    onClick={() => onUpdateSettings({ theme: 'dark' })}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                      settings.theme === 'dark'
                        ? 'ring-2 ring-[#0b57d0] dark:ring-[#a8c7fa] bg-[#d3e3fd]/30 dark:bg-[#00468b]/30 border-[#0b57d0] dark:border-[#a8c7fa] text-[#191c20] dark:text-white shadow-sm'
                        : 'bg-[#f7f8fc] dark:bg-[#18191c] border-[#d8dae5] dark:border-[#43474e]/50 text-[#5d6168] dark:text-[#8e9199] hover:border-[#74777f]'
                    }`}
                  >
                    <div
                      style={{ backgroundColor: '#121316', borderColor: '#2b2d30' }}
                      className="w-full h-10 rounded-lg border flex items-center justify-center text-[#a8c7fa]"
                    >
                      <M3Icon name="dark_mode" size={20} />
                    </div>
                    <span className="text-xs font-medium">{t?.darkMode || 'Dark Mode'}</span>
                  </button>

                  {/* Light Mode */}
                  <button
                    onClick={() => onUpdateSettings({ theme: 'light' })}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                      settings.theme === 'light'
                        ? 'ring-2 ring-[#0b57d0] dark:ring-[#a8c7fa] bg-[#d3e3fd]/30 dark:bg-[#00468b]/30 border-[#0b57d0] dark:border-[#a8c7fa] text-[#191c20] dark:text-white shadow-sm'
                        : 'bg-[#f7f8fc] dark:bg-[#18191c] border-[#d8dae5] dark:border-[#43474e]/50 text-[#5d6168] dark:text-[#8e9199] hover:border-[#74777f]'
                    }`}
                  >
                    <div
                      style={{ backgroundColor: '#ffffff', borderColor: '#e0e2ec' }}
                      className="w-full h-10 rounded-lg border flex items-center justify-center text-[#0b57d0]"
                    >
                      <M3Icon name="light_mode" size={20} />
                    </div>
                    <span className="text-xs font-medium">{t?.lightMode || 'Light Mode'}</span>
                  </button>

                  {/* System Preference */}
                  <button
                    onClick={() => onUpdateSettings({ theme: 'system' })}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                      settings.theme === 'system'
                        ? 'ring-2 ring-[#0b57d0] dark:ring-[#a8c7fa] bg-[#d3e3fd]/30 dark:bg-[#00468b]/30 border-[#0b57d0] dark:border-[#a8c7fa] text-[#191c20] dark:text-white shadow-sm'
                        : 'bg-[#f7f8fc] dark:bg-[#18191c] border-[#d8dae5] dark:border-[#43474e]/50 text-[#5d6168] dark:text-[#8e9199] hover:border-[#74777f]'
                    }`}
                  >
                    <div
                      style={{
                        background: 'linear-gradient(to right, #121316 50%, #ffffff 50%)',
                        borderColor: '#74777f',
                      }}
                      className="w-full h-10 rounded-lg border flex items-center justify-center text-[#ffd54f]"
                    >
                      <M3Icon name="contrast" size={20} />
                    </div>
                    <span className="text-xs font-medium">{t?.systemAuto || 'System Auto'}</span>
                  </button>
                </div>
              </div>

              {/* Language Selector: moved inside Settings */}
              <div>
                <label className="block text-xs font-semibold text-[#191c20] dark:text-white mb-1.5 flex items-center gap-1.5">
                  <M3Icon name="translate" size={16} className="text-[#0b57d0] dark:text-[#a8c7fa]" />
                  <span>{t?.languageLabel || 'Language'}</span>
                </label>
                <M3Dropdown
                  options={languageOptions}
                  value={currentLang}
                  onChange={(val) => onLanguageChange(val as SupportedLanguage)}
                />
              </div>

              {/* Code Editor Font */}
              <div>
                <label className="block text-xs font-semibold text-[#191c20] dark:text-white mb-1.5">
                  {t?.codeEditorFont || 'Code Editor Font'}
                </label>
                <M3Dropdown
                  options={fontOptions}
                  value={settings.fontFamily}
                  onChange={(val) => onUpdateSettings({ fontFamily: val })}
                />
              </div>

              {/* Editor Font Size */}
              <div>
                <label className="block text-xs font-semibold text-[#191c20] dark:text-white mb-1.5">
                  {t?.editorFontSize || 'Editor Font Size'}
                </label>
                <M3Dropdown
                  options={fontSizeOptions}
                  value={String(settings.fontSize)}
                  onChange={(val) => onUpdateSettings({ fontSize: Number(val) })}
                />
              </div>
            </div>
          )}

          {/* 2. EDITOR PREFERENCES */}
          {activeCategory === 'editor' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f7f8fc] dark:bg-[#18191c] border border-[#d8dae5] dark:border-[#43474e]/40">
                <div>
                  <div className="text-xs font-medium text-[#191c20] dark:text-white">
                    {t?.lineNumbersLabel || 'Line Numbers'}
                  </div>
                  <div className="text-[11px] text-[#5d6168] dark:text-[#8e9199]">
                    {t?.lineNumbersDesc || 'Display code line numbering in the left margin'}
                  </div>
                </div>
                <M3Switch
                  selected={settings.lineNumbers}
                  onChange={(val) => onUpdateSettings({ lineNumbers: val })}
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f7f8fc] dark:bg-[#18191c] border border-[#d8dae5] dark:border-[#43474e]/40">
                <div>
                  <div className="text-xs font-medium text-[#191c20] dark:text-white">
                    {t?.wordWrapLabel || 'Word Wrap'}
                  </div>
                  <div className="text-[11px] text-[#5d6168] dark:text-[#8e9199]">
                    {t?.wordWrapDesc || 'Wrap long code lines without requiring horizontal scrolling'}
                  </div>
                </div>
                <M3Switch
                  selected={settings.wordWrap}
                  onChange={(val) => onUpdateSettings({ wordWrap: val })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#191c20] dark:text-white mb-1.5">
                  {t?.tabSizeLabel || 'Tab Indentation Size'}
                </label>
                <M3Dropdown
                  options={tabSizeOptions}
                  value={String(settings.tabSize)}
                  onChange={(val) => onUpdateSettings({ tabSize: Number(val) })}
                />
              </div>
            </div>
          )}

          {/* 3. LIVE COLLABORATION */}
          {activeCategory === 'collab' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f7f8fc] dark:bg-[#18191c] border border-[#d8dae5] dark:border-[#43474e]/40">
                <div>
                  <div className="text-xs font-medium text-[#191c20] dark:text-white">
                    {t?.autoConnectLabel || 'Auto-Connect to Collaboration'}
                  </div>
                  <div className="text-[11px] text-[#5d6168] dark:text-[#8e9199]">
                    {t?.autoConnectDesc || 'Join shared live editing session on workspace launch'}
                  </div>
                </div>
                <M3Switch
                  selected={settings.autoConnectCollab}
                  onChange={(val) => onUpdateSettings({ autoConnectCollab: val })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#191c20] dark:text-white mb-1.5">
                  {t?.cursorColorLabel || 'Your Cursor Accent Color'}
                </label>
                <div className="flex items-center gap-2">
                  {colorPalette.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => onUpdateSettings({ collabColor: c.hex })}
                      title={c.name}
                      style={{ backgroundColor: c.hex }}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                        settings.collabColor === c.hex ? 'scale-115 ring-2 ring-black dark:ring-white shadow-lg' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      {settings.collabColor === c.hex && (
                        <M3Icon name="check" size={14} className="text-black font-bold" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. WORKSPACE & STORAGE */}
          {activeCategory === 'workspace' && (
            <div className="space-y-4">
              {/* Active Repository Card */}
              <div className="p-3.5 rounded-xl bg-[#f8fafd] dark:bg-[#18191c] border border-[#d8dae5] dark:border-[#43474e]/40 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-semibold text-[#191c20] dark:text-white flex items-center gap-1.5">
                    <M3Icon name="source" size={16} className="text-[#0b57d0] dark:text-[#a8c7fa]" />
                    <span>{t?.currentRepoLabel || 'Active Repository'}</span>
                  </div>
                  <div className="text-[11px] text-[#5d6168] dark:text-[#8e9199] truncate mt-0.5 font-mono">
                    {selectedRepo ? selectedRepo.fullName : (t?.localWorkspace || 'Local Workspace')}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedRepo ? (
                    <>
                      <M3Badge variant="secondary">
                        {activeBranch}
                      </M3Badge>
                      <M3Badge variant="primary">
                        {selectedRepo.private ? (t?.privateRepo || 'Private') : 'Public'}
                      </M3Badge>
                    </>
                  ) : (
                    <M3Badge variant="secondary">
                      {t?.localWorkspace || 'Local Workspace'}
                    </M3Badge>
                  )}
                </div>
              </div>

              {/* Create New Repository Card */}
              <div className="p-4 rounded-xl bg-[#f8fafd] dark:bg-[#18191c] border border-[#d8dae5] dark:border-[#43474e]/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#191c20] dark:text-white">
                    <M3Icon name="add_circle" size={17} className="text-[#0b57d0] dark:text-[#a8c7fa]" />
                    <span>{t?.createRepoTitle || 'Create New Repository'}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#d3e3fd]/60 dark:bg-[#00468b]/30 text-[#0b57d0] dark:text-[#a8c7fa]">
                    {isAuthenticated ? 'GitHub' : (t?.localWorkspace || 'Local')}
                  </span>
                </div>

                <p className="text-[11px] text-[#5d6168] dark:text-[#8e9199]">
                  {isAuthenticated
                    ? (t?.createOnGitHub || 'Create a new repository directly on your GitHub account.')
                    : (t?.createLocalRepo || 'Initialize a new local project repository in this workspace.')}
                </p>

                {repoSuccessMsg && (
                  <div className="p-2.5 rounded-lg bg-[#e8f5e9] dark:bg-[#1b3724] border border-[#a5d6a7] dark:border-[#2e7d32] text-xs text-[#1e4620] dark:text-[#a5d6a7] flex items-center gap-2">
                    <M3Icon name="check_circle" size={16} />
                    <span>{t?.repoCreatedSuccess || 'Repository created successfully!'}: <strong>{repoSuccessMsg}</strong></span>
                  </div>
                )}

                {repoErrorMsg && (
                  <div className="p-2.5 rounded-lg bg-[#ffebee] dark:bg-[#371b1b] border border-[#ef9a9a] dark:border-[#c62828] text-xs text-[#5c1d1d] dark:text-[#ef9a9a] flex items-center gap-2">
                    <M3Icon name="error" size={16} />
                    <span>{repoErrorMsg}</span>
                  </div>
                )}

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newRepoName.trim() || !onCreateRepo) return;
                    setIsCreatingRepo(true);
                    setRepoErrorMsg(null);
                    setRepoSuccessMsg(null);
                    try {
                      await onCreateRepo(newRepoName.trim(), newRepoDesc.trim(), newRepoPrivate);
                      setRepoSuccessMsg(newRepoName.trim());
                      setNewRepoName('');
                      setNewRepoDesc('');
                      setNewRepoPrivate(false);
                    } catch (err: any) {
                      setRepoErrorMsg(err?.message || 'Failed to create repository');
                    } finally {
                      setIsCreatingRepo(false);
                    }
                  }}
                  className="space-y-2.5"
                >
                  <div>
                    <label className="block text-[11px] font-medium text-[#191c20] dark:text-[#e2e2e6] mb-1">
                      {t?.repository || 'Repository'} Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newRepoName}
                      onChange={(e) => setNewRepoName(e.target.value)}
                      placeholder={t?.repoNamePlaceholder || 'e.g., my-awesome-project'}
                      className="w-full h-9 px-3 rounded-lg bg-white dark:bg-[#121316] border border-[#d8dae5] dark:border-[#43474e]/60 text-xs text-[#191c20] dark:text-[#e2e2e6] placeholder-[#8e9199] focus:outline-none focus:ring-2 focus:ring-[#0b57d0] dark:focus:ring-[#a8c7fa] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#191c20] dark:text-[#e2e2e6] mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={newRepoDesc}
                      onChange={(e) => setNewRepoDesc(e.target.value)}
                      placeholder={t?.repoDescPlaceholder || 'Short description of the repository'}
                      className="w-full h-9 px-3 rounded-lg bg-white dark:bg-[#121316] border border-[#d8dae5] dark:border-[#43474e]/60 text-xs text-[#191c20] dark:text-[#e2e2e6] placeholder-[#8e9199] focus:outline-none focus:ring-2 focus:ring-[#0b57d0] dark:focus:ring-[#a8c7fa] transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-[#191c20] dark:text-[#e2e2e6] select-none">
                      <input
                        type="checkbox"
                        checked={newRepoPrivate}
                        onChange={(e) => setNewRepoPrivate(e.target.checked)}
                        className="rounded border-[#d8dae5] text-[#0b57d0] focus:ring-[#0b57d0] dark:focus:ring-[#a8c7fa] w-4 h-4 cursor-pointer"
                      />
                      <span>{t?.privateRepo || 'Private Repository'}</span>
                    </label>

                    <M3Button
                      type="submit"
                      size="sm"
                      disabled={isCreatingRepo || !newRepoName.trim()}
                      icon={isCreatingRepo ? 'sync' : 'add'}
                    >
                      {isCreatingRepo ? '...' : (t?.create || 'Create')}
                    </M3Button>
                  </div>
                </form>
              </div>

              {/* Drag & Drop Information Card */}
              <div className="p-4 rounded-xl bg-[#d3e3fd]/40 dark:bg-[#00468b]/20 border border-[#0b57d0]/30 dark:border-[#a8c7fa]/30 space-y-2">
                <div className="flex items-center gap-2 text-[#0b57d0] dark:text-[#a8c7fa] font-semibold text-xs">
                  <M3Icon name="drag_indicator" size={18} />
                  <span>{t?.dragFolderNotice || 'Drag and Drop Support'}</span>
                </div>
                <p className="text-[11px] text-[#191c20] dark:text-[#c4c6d0] leading-relaxed">
                  {t?.clearWorkspaceDesc || 'You can drag and drop folders and .zip files anywhere onto the ZipStudio window!'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#f7f8fc] dark:bg-[#18191c] border border-[#d8dae5] dark:border-[#43474e]/40 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-[#191c20] dark:text-white">
                    {t?.cachedFilesLabel || 'Current Workspace Files'}
                  </div>
                  <div className="text-[11px] text-[#5d6168] dark:text-[#8e9199]">
                    {t?.filesCount || 'Files currently mounted in memory'}
                  </div>
                </div>
                <M3Badge variant="primary">{fileCount} {t?.filesCount || 'files'}</M3Badge>
              </div>

              {/* Reset Workspace button */}
              <div className="pt-2">
                {!showResetConfirm ? (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full py-2 px-3 rounded-xl bg-[#ffb4ab]/20 dark:bg-[#ffb4ab]/10 hover:bg-[#ffb4ab]/30 text-[#ba1a1a] dark:text-[#ffb4ab] border border-[#ba1a1a]/30 dark:border-[#ffb4ab]/30 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <M3Icon name="restart_alt" size={16} />
                    <span>{t?.clearWorkspaceTitle || 'Clear Workspace & Reset Storage'}</span>
                  </button>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[#ffdad6]/40 dark:bg-[#690005]/20 border border-[#ba1a1a]/40 text-[#ba1a1a] dark:text-[#ffdad6] space-y-2.5">
                    <p className="text-xs">
                      {t?.confirmClearWarning || 'Are you sure you want to clear all files in the current workspace? Unsaved changes will be discarded.'}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (onResetWorkspace) onResetWorkspace();
                          setShowResetConfirm(false);
                          triggerClose();
                        }}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-[#ba1a1a] hover:bg-[#ff5449] text-white text-xs font-medium cursor-pointer"
                      >
                        {t?.confirmClear || 'Confirm Clear'}
                      </button>
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="py-1.5 px-3 rounded-lg bg-[#e8ebf3] dark:bg-[#2b2d30] text-[#191c20] dark:text-[#c4c6d0] hover:text-white text-xs cursor-pointer"
                      >
                        {t?.cancel || 'Cancel'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#f8f9fe] dark:bg-[#18191c] border-t border-[#d8dae5] dark:border-[#43474e]/40 flex items-center justify-between shrink-0">
          <button
            onClick={() => onUpdateSettings(DEFAULT_SETTINGS)}
            className="text-xs text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <M3Icon name="restore" size={14} />
            <span>{t?.resetToDefaults || 'Reset to Defaults'}</span>
          </button>
          <M3Button size="sm" onClick={triggerClose}>
            {t?.done || 'Done'}
          </M3Button>
        </div>
      </div>
    </div>
  );
}
