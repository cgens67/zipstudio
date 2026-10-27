/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { M3Icon, M3IconButton, M3Button, M3Badge } from './M3Components';
import { M3Switch } from './M3Switch';
import { M3Dropdown, DropdownOption } from './M3Dropdown';
import {
  GitBranch,
  GitCommit,
  FileDiff,
  PullRequest,
  GitHubUser,
  GitHubRepo,
  RepoLoadProgress,
} from '../utils/gitService';
import { Translations } from '../utils/i18n';
import { useDialogAnimation } from '../utils/useDialogAnimation';

interface GitHubPanelProps {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  repos: GitHubRepo[];
  selectedRepo: GitHubRepo | null;
  branches: GitBranch[];
  activeBranch: string;
  diffs: FileDiff[];
  commits: GitCommit[];
  pullRequests: PullRequest[];
  oauthConfigured: boolean;
  callbackUrl: string;
  t: Translations;
  isCleanZipImport?: boolean;
  isLoadingRepo?: boolean;
  repoLoadProgress?: RepoLoadProgress | null;
  onConnectOAuth: () => void;
  onConnectToken: (token: string) => Promise<void>;
  onDisconnect: () => void;
  onSelectRepo: (repo: GitHubRepo) => void;
  onLoadRepoFiles: () => Promise<void>;
  onCreateRepo: (name: string, description: string, isPrivate: boolean) => Promise<void>;
  onSwitchBranch: (branchName: string) => Promise<void>;
  onCreateBranch: (branchName: string) => Promise<void>;
  onCommitAndPush: (message: string) => Promise<void>;
  onCreatePullRequest: (title: string, head: string, base: string, body: string) => Promise<void>;
  onSubmitPRReview: (prId: number, state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED', body: string) => Promise<void>;
  onRefreshCommits?: () => Promise<void>;
}

export function GitHubPanel({
  isAuthenticated,
  user,
  repos,
  selectedRepo,
  branches,
  activeBranch,
  diffs,
  commits,
  pullRequests,
  oauthConfigured,
  callbackUrl,
  t,
  isCleanZipImport,
  isLoadingRepo,
  repoLoadProgress,
  onConnectOAuth,
  onConnectToken,
  onDisconnect,
  onSelectRepo,
  onLoadRepoFiles,
  onCreateRepo,
  onSwitchBranch,
  onCreateBranch,
  onCommitAndPush,
  onCreatePullRequest,
  onSubmitPRReview,
  onRefreshCommits,
}: GitHubPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'changes' | 'branches' | 'prs' | 'commits'>('changes');
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [isConnectingToken, setIsConnectingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string>('');
  const [selectedDiff, setSelectedDiff] = useState<FileDiff | null>(null);
  const [copiedSha, setCopiedSha] = useState<string | null>(null);
  const [isRefreshingCommits, setIsRefreshingCommits] = useState(false);

  // Authentication inputs
  const [patInput, setPatInput] = useState('');
  const [showOAuthInfo, setShowOAuthInfo] = useState(false);

  // Modal states
  const [showNewRepoModal, setShowNewRepoModal] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDesc, setNewRepoDesc] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);

  const [showNewBranchModal, setShowNewBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  const [showNewPRModal, setShowNewPRModal] = useState(false);
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');
  const [prHead, setPrHead] = useState(activeBranch);
  const [prBase, setPrBase] = useState('main');

  const [activePRToReview, setActivePRToReview] = useState<PullRequest | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patInput.trim()) return;
    setIsConnectingToken(true);
    setTokenError('');
    try {
      await onConnectToken(patInput.trim());
      setPatInput('');
    } catch (err: any) {
      setTokenError(err.message || 'Failed to authenticate with GitHub token');
    } finally {
      setIsConnectingToken(false);
    }
  };

  const handleCommitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) return;
    setIsCommitting(true);
    try {
      await onCommitAndPush(commitMessage.trim());
      setCommitMessage('');
      setSelectedDiff(null);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleCreateRepoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim()) return;
    await onCreateRepo(newRepoName.trim(), newRepoDesc.trim(), newRepoPrivate);
    setShowNewRepoModal(false);
    setNewRepoName('');
    setNewRepoDesc('');
  };

  const handleCreateBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    await onCreateBranch(newBranchName.trim());
    setShowNewBranchModal(false);
    setNewBranchName('');
  };

  const handleCreatePRSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prTitle.trim()) return;
    await onCreatePullRequest(prTitle.trim(), prHead, prBase, prBody.trim());
    setShowNewPRModal(false);
    setPrTitle('');
    setPrBody('');
  };

  const handleReviewAction = async (state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED') => {
    if (!activePRToReview) return;
    await onSubmitPRReview(activePRToReview.id, state, reviewComment || `${state} review submitted via ZipStudio.`);
    setReviewComment('');
    setActivePRToReview(null);
  };

  // -------------------------------------------------------------
  // REAL AUTHENTICATION GATE
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <aside className="w-full h-full bg-white dark:bg-[#18191c] border-r border-[#d8dae5] dark:border-[#43474e]/40 flex flex-col p-4 shrink-0 overflow-y-auto text-[#191c20] dark:text-[#e2e2e6]">
        <div className="flex items-center gap-2 border-b border-[#d8dae5] dark:border-[#43474e]/30 pb-3 mb-4">
          <M3Icon name="lock" size={20} className="text-[#0b57d0] dark:text-[#a8c7fa]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#191c20] dark:text-white">GitHub Access Required</h2>
        </div>

        <div className="bg-[#f8fafd] dark:bg-[#1e1f22] border border-[#d8dae5] dark:border-[#43474e]/50 rounded-2xl p-4 mb-4 text-center">
          <div className="w-12 h-12 rounded-full bg-[#d3e3fd] text-[#041e49] dark:bg-[#00468b]/30 dark:text-[#a8c7fa] flex items-center justify-center mx-auto mb-3">
            <M3Icon name="sync_lock" size={26} />
          </div>
          <h3 className="text-sm font-bold text-[#191c20] dark:text-white mb-1">Real GitHub Integration</h3>
          <p className="text-xs text-[#44474e] dark:text-[#c4c6d0] mb-4 leading-relaxed">
            Connect your real GitHub account to view repositories, switch branches, review pull requests, and commit code directly.
          </p>

          {/* Real Token Login (Recommended & Instant) */}
          <form onSubmit={handleTokenSubmit} className="text-left space-y-2 mb-4 bg-white dark:bg-[#2b2d30] p-3 rounded-xl border border-[#d8dae5] dark:border-[#43474e]/40">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#191c20] dark:text-white flex items-center gap-1">
                <M3Icon name="key" size={14} className="text-[#0b57d0] dark:text-[#a8c7fa]" />
                Personal Access Token (PAT)
              </label>
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#0b57d0] dark:text-[#a8c7fa] hover:underline"
              >
                {t.generateTokenLink}
              </a>
            </div>
            <p className="text-[11px] text-[#5d6168] dark:text-[#8e9199]">
              {t.createTokenNotice}
            </p>
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={patInput}
              onChange={(e) => setPatInput(e.target.value)}
              className="w-full bg-[#f8fafd] dark:bg-[#121316] border border-[#d8dae5] dark:border-[#43474e] rounded-lg px-2.5 py-1.5 text-xs text-[#191c20] dark:text-white font-mono focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa]"
            />
            {tokenError && (
              <div className="text-[11px] text-[#ba1a1a] dark:text-[#ff8585] bg-[#ffdad6]/40 dark:bg-[#690005]/20 p-1.5 rounded border border-[#ff8585]/30">
                {tokenError}
              </div>
            )}
            <M3Button
              variant="filled"
              size="sm"
              type="submit"
              className="w-full"
              loading={isConnectingToken}
              disabled={!patInput.trim()}
            >
              {t.connectWithToken}
            </M3Button>
          </form>

          {/* OAuth Alternative */}
          <div className="pt-2 border-t border-[#d8dae5] dark:border-[#43474e]/30">
            <M3Button
              variant="outlined"
              size="sm"
              icon="open_in_new"
              className="w-full mb-2"
              onClick={onConnectOAuth}
            >
              {t.oauthSignIn}
            </M3Button>

            <button
              type="button"
              onClick={() => setShowOAuthInfo(!showOAuthInfo)}
              className="text-[11px] text-[#5d6168] dark:text-[#8e9199] hover:text-[#0b57d0] dark:hover:text-[#a8c7fa] underline cursor-pointer"
            >
              {showOAuthInfo ? t.hideOAuthInfo : t.viewOAuthInfo}
            </button>

            {showOAuthInfo && (
              <div className="mt-2 text-left bg-[#f0f4f9] dark:bg-[#121316] p-2.5 rounded-lg border border-[#d8dae5] dark:border-[#43474e]/40 text-[11px] text-[#191c20] dark:text-[#c4c6d0] space-y-1.5 animate-fadeIn">
                <div className="font-semibold text-[#191c20] dark:text-white">{t.oauthSignIn}:</div>
                <div>Status: {oauthConfigured ? <span className="text-[#0a6640] dark:text-[#b4f3b7] font-semibold">{t.oauthConfiguredLabel}</span> : <span className="text-[#7e5700] dark:text-[#ffd54f] font-semibold">{t.oauthNotConfiguredLabel}</span>}</div>
                <div>{t.callbackUrlLabel}:</div>
                <div className="p-1 bg-white dark:bg-[#1e1f22] border border-[#d8dae5] dark:border-transparent rounded font-mono text-[10px] break-all text-[#0b57d0] dark:text-[#a8c7fa] select-all">
                  {callbackUrl}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    );
  }

  // -------------------------------------------------------------
  // REAL AUTHENTICATED VIEW
  // -------------------------------------------------------------
  return (
    <aside className="w-full h-full bg-white dark:bg-[#18191c] border-r border-[#d8dae5] dark:border-[#43474e]/40 flex flex-col shrink-0 overflow-hidden text-[#191c20] dark:text-[#e2e2e6]">
      {/* Real GitHub User Header */}
      <div className="p-3 bg-[#f8fafd] dark:bg-[#1e1f22] border-b border-[#d8dae5] dark:border-[#43474e]/30 flex items-center justify-between">
        <a
          href={user?.htmlUrl || 'https://github.com'}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 hover:opacity-85 transition-opacity truncate"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.login}
              className="w-7 h-7 rounded-full border border-[#0b57d0] dark:border-[#a8c7fa]"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#d3e3fd] dark:bg-[#00468b] text-[#041e49] dark:text-[#d6e3ff] flex items-center justify-center font-bold text-xs">
              {user?.login?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <div className="truncate text-left">
            <div className="text-xs font-semibold text-[#191c20] dark:text-white leading-tight truncate">
              {user?.name || user?.login}
            </div>
            <div className="text-[10px] text-[#5d6168] dark:text-[#8e9199]">@{user?.login}</div>
          </div>
        </a>
        <M3IconButton
          size="sm"
          icon="logout"
          label="Disconnect Account"
          onClick={onDisconnect}
        />
      </div>

      {/* Real Repository Selector */}
      <div className="p-2.5 bg-[#f0f4f9] dark:bg-[#121316]/60 border-b border-[#d8dae5] dark:border-[#43474e]/30">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-[#44474e] dark:text-[#8e9199] uppercase tracking-wider flex items-center gap-1">
            <M3Icon name="bookmark" size={13} className="text-[#0b57d0] dark:text-[#a8c7fa]" />
            Target Repository
          </span>
          <button
            onClick={() => setShowNewRepoModal(true)}
            className="text-[11px] text-[#0b57d0] dark:text-[#a8c7fa] hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
          >
            <M3Icon name="add" size={12} />
            New Repo
          </button>
        </div>

        {repos.length > 0 ? (
          <M3Dropdown<string>
            searchable
            options={repos.map((r) => ({
              value: r.fullName,
              label: r.fullName,
              description: `default: ${r.defaultBranch}`,
              icon: r.private ? 'lock' : 'folder_open',
              iconColor: r.private ? 'text-[#7e5700] dark:text-[#ffd54f]' : 'text-[#0b57d0] dark:text-[#a8c7fa]',
            }))}
            value={selectedRepo?.fullName || ''}
            onChange={(val) => {
              const r = repos.find((repo) => repo.fullName === val);
              if (r) onSelectRepo(r);
            }}
            placeholder="Select a repository..."
          />
        ) : (
          <div className="text-xs text-[#5d6168] dark:text-[#8e9199] py-1">
            No repositories found. Click &quot;New Repo&quot; to create one.
          </div>
        )}

        {repos.length > 0 && selectedRepo && (
          <>
            {isLoadingRepo ? (
              <div className="w-full mt-2 p-2.5 rounded-xl bg-[#d3e3fd]/40 dark:bg-[#a8c7fa]/10 border border-[#0b57d0]/30 dark:border-[#a8c7fa]/30 text-xs">
                <div className="flex items-center justify-between mb-1.5 text-[#0b57d0] dark:text-[#a8c7fa] font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>{t.loadingRepo}</span>
                  </span>
                  {repoLoadProgress && (
                    <span className="font-mono text-[11px] text-[#191c20] dark:text-[#c4c6d0]">
                      {repoLoadProgress.loaded}/{repoLoadProgress.total}
                    </span>
                  )}
                </div>
                {repoLoadProgress && (
                  <>
                    <div className="w-full bg-[#d8dae5] dark:bg-[#1e1f22] h-1.5 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="bg-[#0b57d0] dark:bg-[#a8c7fa] h-full transition-all duration-300 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (repoLoadProgress.loaded / (repoLoadProgress.total || 1)) * 100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#5d6168] dark:text-[#8e9199]">
                      <span className="truncate max-w-[130px]" title={repoLoadProgress.currentFile}>
                        {repoLoadProgress.currentFile ? repoLoadProgress.currentFile.split('/').pop() : ''}
                      </span>
                      <span className="shrink-0 text-[#7e5700] dark:text-[#ffd54f] font-mono">
                        ~{repoLoadProgress.estimatedSecondsRemaining}s {t.estimatedRemaining}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onLoadRepoFiles}
                className="w-full mt-2 py-1 px-2 rounded-lg bg-[#d3e3fd] hover:bg-[#c2e7ff] text-[#041e49] border border-[#0b57d0]/30 dark:bg-[#a8c7fa]/10 dark:hover:bg-[#a8c7fa]/20 dark:text-[#a8c7fa] dark:border-[#a8c7fa]/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <M3Icon name="cloud_download" size={14} className="text-[#0b57d0] dark:text-[#a8c7fa]" />
                <span>{t.loadRepoFiles} ({selectedRepo.name})</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Real Branch Switcher & Creator */}
      <div className="p-2.5 bg-[#f8fafd] dark:bg-[#18191c] border-b border-[#d8dae5] dark:border-[#43474e]/30">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-[#44474e] dark:text-[#8e9199] uppercase tracking-wider flex items-center gap-1">
            <M3Icon name="fork_right" size={13} className="text-[#0b57d0] dark:text-[#a8c7fa]" />
            Active Branch
          </span>
          <button
            onClick={() => setShowNewBranchModal(true)}
            className="text-[11px] text-[#0b57d0] dark:text-[#a8c7fa] hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
          >
            <M3Icon name="add" size={12} />
            New Branch
          </button>
        </div>

        <M3Dropdown<string>
          searchable
          icon="fork_right"
          options={branches.map((b) => ({
            value: b.name,
            label: b.name,
            description: b.name === activeBranch ? 'Active branch' : undefined,
            icon: 'fork_right',
            iconColor: b.name === activeBranch ? 'text-[#0b57d0] dark:text-[#a8c7fa]' : 'text-[#74777f] dark:text-[#8e9199]',
          }))}
          value={activeBranch}
          onChange={(branchName) => onSwitchBranch(branchName)}
          placeholder="Switch branch..."
        />
      </div>

      {/* Sub Tabs */}
      <div className="h-8 bg-[#f0f4f9] dark:bg-[#1e1f22] border-b border-[#d8dae5] dark:border-[#43474e]/30 flex items-center px-1 text-xs">
        <button
          onClick={() => setActiveSubTab('changes')}
          className={`flex-1 py-1.5 text-center font-medium border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'changes'
              ? 'border-[#0b57d0] dark:border-[#a8c7fa] text-[#0b57d0] dark:text-[#a8c7fa]'
              : 'border-transparent text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white'
          }`}
        >
          Changes ({diffs.length})
        </button>
        <button
          onClick={() => setActiveSubTab('prs')}
          className={`flex-1 py-1.5 text-center font-medium border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'prs'
              ? 'border-[#0b57d0] dark:border-[#a8c7fa] text-[#0b57d0] dark:text-[#a8c7fa]'
              : 'border-transparent text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white'
          }`}
        >
          PRs ({pullRequests.length})
        </button>
        <button
          onClick={() => setActiveSubTab('commits')}
          className={`flex-1 py-1.5 text-center font-medium border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'commits'
              ? 'border-[#0b57d0] dark:border-[#a8c7fa] text-[#0b57d0] dark:text-[#a8c7fa]'
              : 'border-transparent text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white'
          }`}
        >
          History
        </button>
      </div>

      {/* Sub Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* CHANGES TAB */}
        {activeSubTab === 'changes' && (
          <div className="space-y-3">
            {diffs.length === 0 ? (
              <div className="space-y-3">
                <div className="text-center py-4 text-xs text-[#5d6168] dark:text-[#8e9199]">
                  <M3Icon name="check_circle" size={32} className="mx-auto mb-2 text-[#137333] dark:text-[#b4f3b7]" />
                  <p className="font-semibold text-[#191c20] dark:text-white">Working tree clean</p>
                  <p className="mt-1 text-[11px]">All current files match your local baseline.</p>
                </div>
                {/* Allow pushing a fresh project commit directly */}
                <form onSubmit={handleCommitSubmit} className="pt-2 border-t border-[#d8dae5] dark:border-[#43474e]/30 space-y-2">
                  <div className="text-[11px] font-semibold text-[#0b57d0] dark:text-[#a8c7fa] flex items-center gap-1">
                    <M3Icon name="cloud_upload" size={14} />
                    <span>Push Project Snapshot to GitHub</span>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Commit message (e.g. Sync imported zip files)"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="w-full bg-white dark:bg-[#121316] border border-[#d8dae5] dark:border-[#43474e] rounded-lg p-2 text-xs text-[#191c20] dark:text-white placeholder-[#74777f] dark:placeholder-[#8e9199] focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] resize-none font-mono"
                  />
                  <M3Button
                    variant="filled"
                    size="sm"
                    className="w-full"
                    icon="cloud_upload"
                    loading={isCommitting}
                    disabled={!commitMessage.trim()}
                  >
                    Commit & Push to GitHub ({activeBranch})
                  </M3Button>
                </form>
              </div>
            ) : (
              <>
                {isCleanZipImport && (
                  <div className="p-2.5 rounded-lg bg-[#d3e3fd]/40 dark:bg-[#00468b]/30 border border-[#0b57d0]/30 dark:border-[#a8c7fa]/40 text-[#041e49] dark:text-[#d6e3ff] text-[11px] flex items-start gap-2">
                    <M3Icon name="auto_delete" size={16} className="text-[#0b57d0] dark:text-[#a8c7fa] shrink-0 mt-0.5" />
                    <span>{t.cleanOverwriteNotice}</span>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold uppercase text-[#5d6168] dark:text-[#8e9199] mb-1">
                    Staged Files ({diffs.length})
                  </div>
                  {diffs.map((diff) => (
                    <div
                      key={diff.path}
                      onClick={() => setSelectedDiff(diff)}
                      className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors ${
                        selectedDiff?.path === diff.path
                          ? 'bg-[#d3e3fd] dark:bg-[#00468b]/30 border border-[#0b57d0]/40 dark:border-[#a8c7fa]/50'
                          : 'bg-[#f0f2f8] hover:bg-[#e4e7ef] dark:bg-[#2b2d30] dark:hover:bg-[#383a3e]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <M3Icon
                          name={diff.status === 'added' ? 'add_circle' : diff.status === 'deleted' ? 'remove_circle' : 'edit'}
                          size={14}
                          className={diff.status === 'added' ? 'text-[#0a6640] dark:text-[#b4f3b7]' : diff.status === 'deleted' ? 'text-[#ba1a1a] dark:text-[#ff8585]' : 'text-[#7e5700] dark:text-[#ffd54f]'}
                        />
                        <span className="truncate font-mono text-[#191c20] dark:text-white">{diff.path}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-mono shrink-0 ml-2 font-semibold">
                        {diff.additions > 0 && <span className="text-[#0a6640] dark:text-[#b4f3b7]">+{diff.additions}</span>}
                        {diff.deletions > 0 && <span className="text-[#ba1a1a] dark:text-[#ff8585]">-{diff.deletions}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Commit Form */}
                <form onSubmit={handleCommitSubmit} className="pt-2 border-t border-[#d8dae5] dark:border-[#43474e]/30 space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Commit message (e.g. Update components and styles)"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="w-full bg-white dark:bg-[#121316] border border-[#d8dae5] dark:border-[#43474e] rounded-lg p-2 text-xs text-[#191c20] dark:text-white placeholder-[#74777f] dark:placeholder-[#8e9199] focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] resize-none font-mono"
                  />
                  <M3Button
                    variant="filled"
                    size="sm"
                    className="w-full"
                    icon="cloud_upload"
                    loading={isCommitting}
                    disabled={!commitMessage.trim() || diffs.length === 0}
                  >
                    Commit & Push to GitHub ({activeBranch})
                  </M3Button>
                </form>
              </>
            )}
          </div>
        )}

        {/* PULL REQUESTS TAB */}
        {activeSubTab === 'prs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#191c20] dark:text-white">Pull Requests</span>
              <M3Button
                variant="tonal"
                size="sm"
                icon="add"
                onClick={() => setShowNewPRModal(true)}
              >
                New PR
              </M3Button>
            </div>

            {pullRequests.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#5d6168] dark:text-[#8e9199]">
                <M3Icon name="merge" size={32} className="mx-auto mb-2 text-[#0b57d0]/40 dark:text-[#a8c7fa]/40" />
                <p>No pull requests found for this repo.</p>
              </div>
            ) : (
              pullRequests.map((pr) => (
                <div
                  key={pr.id}
                  className="p-3 rounded-xl bg-[#f8fafd] dark:bg-[#2b2d30] border border-[#d8dae5] dark:border-[#43474e]/50 hover:border-[#0b57d0]/50 dark:hover:border-[#a8c7fa]/50 transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-[#191c20] dark:text-white">#{pr.number} {pr.title}</span>
                    <M3Badge variant={pr.state === 'open' ? 'success' : 'secondary'}>
                      {pr.state}
                    </M3Badge>
                  </div>
                  <div className="text-[11px] text-[#5d6168] dark:text-[#8e9199] flex items-center gap-1 font-mono">
                    <span>{pr.headBranch}</span>
                    <M3Icon name="arrow_forward" size={12} />
                    <span>{pr.baseBranch}</span>
                  </div>
                  {pr.description && (
                    <p className="text-xs text-[#44474e] dark:text-[#c4c6d0] line-clamp-2">{pr.description}</p>
                  )}

                  {/* Review Actions */}
                  <div className="pt-2 border-t border-[#d8dae5] dark:border-[#43474e]/30 flex items-center justify-between">
                    <span className="text-[10px] text-[#5d6168] dark:text-[#8e9199]">
                      {pr.reviews.length} {t.reviews}
                    </span>
                    <button
                      onClick={() => setActivePRToReview(pr)}
                      className="px-2.5 py-1 rounded bg-[#d3e3fd] hover:bg-[#c2e7ff] text-[#041e49] dark:bg-[#a8c7fa]/20 dark:hover:bg-[#a8c7fa]/30 dark:text-[#a8c7fa] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <M3Icon name="rate_review" size={14} />
                      {t.reviewPR}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* COMMITS HISTORY TAB */}
        {activeSubTab === 'commits' && (
          <div className="space-y-3">
            {/* Header explaining commit history */}
            <div className="p-3 rounded-xl bg-[#f8fafd] dark:bg-[#1e1f22] border border-[#d8dae5] dark:border-[#43474e]/40 shadow-xs flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#191c20] dark:text-white">
                  <M3Icon name="history" size={16} className="text-[#0b57d0] dark:text-[#a8c7fa]" />
                  <span>Repository Commit History</span>
                </div>
                <p className="text-[11px] text-[#5d6168] dark:text-[#8e9199] mt-0.5">
                  Live timeline of commits from {selectedRepo ? selectedRepo.fullName : 'workspace'} on branch{' '}
                  <span className="text-[#0b57d0] dark:text-[#a8c7fa] font-mono font-medium">{activeBranch}</span>
                </p>
              </div>

              <button
                onClick={async () => {
                  if (onRefreshCommits) {
                    setIsRefreshingCommits(true);
                    try {
                      await onRefreshCommits();
                    } finally {
                      setIsRefreshingCommits(false);
                    }
                  } else {
                    await onLoadRepoFiles();
                  }
                }}
                disabled={isRefreshingCommits}
                title="Refresh commit history from remote repository"
                className="p-1.5 rounded-lg bg-[#f0f2f8] hover:bg-[#e4e7ef] dark:bg-[#2b2d30] dark:hover:bg-[#383a3e] text-[#0b57d0] dark:text-[#a8c7fa] transition-colors cursor-pointer shrink-0 disabled:opacity-40"
              >
                <M3Icon name={isRefreshingCommits ? 'sync' : 'refresh'} size={16} className={isRefreshingCommits ? 'animate-spin' : ''} />
              </button>
            </div>

            {commits.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#5d6168] dark:text-[#8e9199] bg-[#f8fafd] dark:bg-[#1e1f22]/50 rounded-xl border border-[#d8dae5] dark:border-[#43474e]/30 p-4">
                <M3Icon name="history_toggle_off" size={32} className="mx-auto mb-2 text-[#0b57d0]/40 dark:text-[#a8c7fa]/40" />
                <p className="font-medium text-[#191c20] dark:text-white mb-1">No commits recorded yet</p>
                <p className="text-[11px] text-[#5d6168] dark:text-[#8e9199] max-w-xs mx-auto">
                  Connect a GitHub repository to load its commit history, or stage and commit changes above to build your timeline.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {commits.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-[#f8fafd] dark:bg-[#2b2d30] border border-[#d8dae5] dark:border-[#43474e]/40 hover:border-[#0b57d0]/40 dark:hover:border-[#a8c7fa]/40 transition-all space-y-2 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        {c.author.avatarUrl ? (
                          <img
                            src={c.author.avatarUrl}
                            alt={c.author.name}
                            className="w-6 h-6 rounded-full bg-[#f0f2f8] dark:bg-[#1e1f22] border border-[#d8dae5] dark:border-[#43474e]/40 shrink-0 mt-0.5 object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[#d3e3fd] text-[#041e49] dark:bg-[#00468b]/40 dark:text-[#a8c7fa] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                            {c.author.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#191c20] dark:text-white break-words leading-snug">
                            {c.message}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#5d6168] dark:text-[#8e9199] mt-1 font-mono">
                            <span className="text-[#191c20] dark:text-[#c4c6d0] font-semibold">{c.author.name}</span>
                            <span>•</span>
                            <span>{new Date(c.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(c.id);
                            setCopiedSha(c.id);
                            setTimeout(() => setCopiedSha(null), 2000);
                          }}
                          title="Copy commit SHA"
                          className="px-2 py-0.5 rounded bg-[#f0f2f8] hover:bg-[#e4e7ef] dark:bg-[#1e1f22] dark:hover:bg-[#121316] text-[10px] font-mono text-[#0b57d0] dark:text-[#a8c7fa] border border-[#d8dae5] dark:border-[#43474e]/50 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <M3Icon name={copiedSha === c.id ? 'check' : 'content_copy'} size={11} />
                          <span>{c.shortId}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Visual File Diff Modal with Exit Animation */}
      <AnimatedDiffModal
        diff={selectedDiff}
        onClose={() => setSelectedDiff(null)}
        t={t}
      />

      {/* Review Pull Request Dialog with Exit Animation */}
      <AnimatedReviewPRModal
        pr={activePRToReview}
        onClose={() => setActivePRToReview(null)}
        onReviewAction={handleReviewAction}
        t={t}
      />

      {/* Create New Repo Modal with Exit Animation */}
      <AnimatedNewRepoModal
        isOpen={showNewRepoModal}
        onClose={() => setShowNewRepoModal(false)}
        onCreateRepo={onCreateRepo}
        t={t}
      />

      {/* Create New Branch Modal with Exit Animation */}
      <AnimatedNewBranchModal
        isOpen={showNewBranchModal}
        onClose={() => setShowNewBranchModal(false)}
        onCreateBranch={onCreateBranch}
        activeBranch={activeBranch}
        t={t}
      />

      {/* Create New Pull Request Modal with Exit Animation */}
      <AnimatedNewPRModal
        isOpen={showNewPRModal}
        onClose={() => setShowNewPRModal(false)}
        onCreatePR={onCreatePullRequest}
        branches={branches}
        activeBranch={activeBranch}
        t={t}
      />
    </aside>
  );
}

// -----------------------------------------------------------------
// ANIMATED MODAL COMPONENTS (Fluid Material 3 Enter & Exit Transitions)
// -----------------------------------------------------------------

function AnimatedDiffModal({
  diff,
  onClose,
  t,
}: {
  diff: FileDiff | null;
  onClose: () => void;
  t: Translations;
}) {
  const { isRendered, backdropClass, dialogClass, triggerClose } = useDialogAnimation(
    Boolean(diff),
    onClose
  );
  if (!isRendered || !diff) return null;

  return (
    <div
      onClick={triggerClose}
      className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 ${backdropClass}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-[#1e1f22] border border-[#d8dae5] dark:border-[#43474e] rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden ${dialogClass}`}
      >
        <div className="p-3 bg-[#f8fafd] dark:bg-[#2b2d30] border-b border-[#d8dae5] dark:border-[#43474e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <M3Icon name="difference" size={18} className="text-[#0b57d0] dark:text-[#a8c7fa]" />
            <span className="text-xs font-mono font-semibold text-[#191c20] dark:text-white truncate max-w-xs">{diff.path}</span>
            <span className="text-[11px] text-[#0a6640] dark:text-[#b4f3b7] font-semibold">+{diff.additions}</span>
            <span className="text-[11px] text-[#ba1a1a] dark:text-[#ff8585] font-semibold">-{diff.deletions}</span>
          </div>
          <M3IconButton
            size="sm"
            icon="close"
            label={t.closeDiff}
            onClick={triggerClose}
          />
        </div>

        <div className="flex-1 overflow-auto p-3 font-mono text-xs bg-[#f8fafd] dark:bg-[#121316]">
          {diff.lines.map((line, idx) => {
            const isAdd = line.type === 'add';
            const isDel = line.type === 'delete';
            return (
              <div
                key={idx}
                className={`flex items-start py-0.5 px-2 ${
                  isAdd
                    ? 'bg-[#c4eed0]/40 text-[#072711] dark:bg-[#0f5223]/30 dark:text-[#b4f3b7]'
                    : isDel
                    ? 'bg-[#ffdad6]/40 text-[#ba1a1a] dark:bg-[#690005]/30 dark:text-[#ff8585]'
                    : 'text-[#191c20] dark:text-[#c4c6d0]'
                }`}
              >
                <span className="w-8 text-right pr-2 text-[#74777f] dark:text-[#6e7179] select-none shrink-0">
                  {line.newLineNumber || line.oldLineNumber || ''}
                </span>
                <span className="w-4 select-none shrink-0 font-bold">
                  {isAdd ? '+' : isDel ? '-' : ' '}
                </span>
                <span className="whitespace-pre-wrap break-all">{line.content}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AnimatedReviewPRModal({
  pr,
  onClose,
  onReviewAction,
  t,
}: {
  pr: PullRequest | null;
  onClose: () => void;
  onReviewAction: (state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED', comment: string) => Promise<void>;
  t: Translations;
}) {
  const [comment, setComment] = useState('');
  const { isRendered, backdropClass, dialogClass, triggerClose } = useDialogAnimation(
    Boolean(pr),
    onClose
  );
  if (!isRendered || !pr) return null;

  return (
    <div
      onClick={triggerClose}
      className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 ${backdropClass}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-[#1e1f22] border border-[#d8dae5] dark:border-[#43474e] rounded-2xl max-w-lg w-full p-5 shadow-2xl ${dialogClass}`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#191c20] dark:text-white">{t.reviewPRTitle} #{pr.number}</h3>
          <M3IconButton
            size="sm"
            icon="close"
            label={t.close}
            onClick={triggerClose}
          />
        </div>
        <p className="text-xs text-[#0b57d0] dark:text-[#a8c7fa] font-medium mb-1">{pr.title}</p>
        <p className="text-xs text-[#5d6168] dark:text-[#c4c6d0] mb-3">{pr.description}</p>

        <textarea
          rows={3}
          placeholder={t.reviewNotesPlaceholder}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full bg-[#f8fafd] dark:bg-[#121316] border border-[#d8dae5] dark:border-[#43474e] rounded-lg p-2.5 text-xs text-[#191c20] dark:text-white mb-4 focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa]"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              await onReviewAction('APPROVED', comment);
              triggerClose();
            }}
            className="flex-1 py-2 px-3 rounded-xl bg-[#0a6640] hover:bg-[#085032] text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
          >
            <M3Icon name="check" size={16} />
            {t.approve}
          </button>
          <button
            type="button"
            onClick={async () => {
              await onReviewAction('CHANGES_REQUESTED', comment);
              triggerClose();
            }}
            className="flex-1 py-2 px-3 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
          >
            <M3Icon name="cancel" size={16} />
            {t.requestChanges}
          </button>
          <button
            type="button"
            onClick={async () => {
              await onReviewAction('COMMENTED', comment);
              triggerClose();
            }}
            className="flex-1 py-2 px-3 rounded-xl bg-[#f0f2f8] dark:bg-[#2b2d30] hover:bg-[#e4e7ef] dark:hover:bg-[#383a3e] text-[#191c20] dark:text-[#e2e2e6] text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
          >
            <M3Icon name="chat" size={16} />
            {t.comment}
          </button>
        </div>
      </div>
    </div>
  );
}

function AnimatedNewRepoModal({
  isOpen,
  onClose,
  onCreateRepo,
  t,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreateRepo: (name: string, description: string, isPrivate: boolean) => Promise<void>;
  t: Translations;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const { isRendered, backdropClass, dialogClass, triggerClose } = useDialogAnimation(
    isOpen,
    onClose
  );
  if (!isRendered) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onCreateRepo(name.trim(), desc.trim(), isPrivate);
      triggerClose();
      setName('');
      setDesc('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={triggerClose}
      className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 ${backdropClass}`}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className={`bg-white dark:bg-[#1e1f22] border border-[#d8dae5] dark:border-[#43474e] rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3 ${dialogClass}`}
      >
        <h3 className="text-sm font-semibold text-[#191c20] dark:text-white">{t.createRepoTitle}</h3>
        <input
          type="text"
          required
          placeholder={t.repoNamePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-[#f8fafd] dark:bg-[#121316] border border-[#d8dae5] dark:border-[#43474e] rounded-lg px-2.5 py-2 text-xs text-[#191c20] dark:text-white focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa]"
        />
        <input
          type="text"
          placeholder={t.repoDescPlaceholder}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full bg-[#f8fafd] dark:bg-[#121316] border border-[#d8dae5] dark:border-[#43474e] rounded-lg px-2.5 py-2 text-xs text-[#191c20] dark:text-white focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa]"
        />
        <div className="bg-[#f0f4f9] dark:bg-[#121316] p-2.5 rounded-xl border border-[#d8dae5] dark:border-[#43474e]/40">
          <M3Switch
            selected={isPrivate}
            onChange={setIsPrivate}
            label={t.privateRepo}
            sublabel="Only visible to you and authorized collaborators"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <M3Button variant="tonal" size="sm" type="button" onClick={triggerClose} className="flex-1">
            {t.cancel}
          </M3Button>
          <M3Button variant="filled" size="sm" type="submit" loading={loading} className="flex-1">
            {t.createOnGitHub}
          </M3Button>
        </div>
      </form>
    </div>
  );
}

function AnimatedNewBranchModal({
  isOpen,
  onClose,
  onCreateBranch,
  activeBranch,
  t,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreateBranch: (name: string) => Promise<void>;
  activeBranch: string;
  t: Translations;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const { isRendered, backdropClass, dialogClass, triggerClose } = useDialogAnimation(
    isOpen,
    onClose
  );
  if (!isRendered) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onCreateBranch(name.trim());
      triggerClose();
      setName('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={triggerClose}
      className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 ${backdropClass}`}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className={`bg-white dark:bg-[#1e1f22] border border-[#d8dae5] dark:border-[#43474e] rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3 ${dialogClass}`}
      >
        <h3 className="text-sm font-semibold text-[#191c20] dark:text-white">{t.createBranchTitle}</h3>
        <p className="text-xs text-[#5d6168] dark:text-[#c4c6d0]">
          {t.branchFrom}: <span className="text-[#0b57d0] dark:text-[#a8c7fa] font-mono font-medium">{activeBranch}</span>
        </p>
        <input
          type="text"
          required
          placeholder={t.branchNamePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-[#f8fafd] dark:bg-[#121316] border border-[#d8dae5] dark:border-[#43474e] rounded-lg px-2.5 py-2 text-xs text-[#191c20] dark:text-white font-mono focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa]"
        />
        <div className="flex gap-2 pt-2">
          <M3Button variant="tonal" size="sm" type="button" onClick={triggerClose} className="flex-1">
            {t.cancel}
          </M3Button>
          <M3Button variant="filled" size="sm" type="submit" loading={loading} className="flex-1">
            {t.newBranch}
          </M3Button>
        </div>
      </form>
    </div>
  );
}

function AnimatedNewPRModal({
  isOpen,
  onClose,
  onCreatePR,
  branches,
  activeBranch,
  t,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreatePR: (title: string, head: string, base: string, body: string) => Promise<void>;
  branches: GitBranch[];
  activeBranch: string;
  t: Translations;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [head, setHead] = useState(activeBranch);
  const [base, setBase] = useState('main');
  const [loading, setLoading] = useState(false);

  const { isRendered, backdropClass, dialogClass, triggerClose } = useDialogAnimation(
    isOpen,
    onClose
  );
  if (!isRendered) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      await onCreatePR(title.trim(), head, base, body.trim());
      triggerClose();
      setTitle('');
      setBody('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={triggerClose}
      className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 ${backdropClass}`}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className={`bg-white dark:bg-[#1e1f22] border border-[#d8dae5] dark:border-[#43474e] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3 ${dialogClass}`}
      >
        <h3 className="text-sm font-semibold text-[#191c20] dark:text-white">{t.newPR}</h3>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex-1">
            <M3Dropdown<string>
              searchable
              size="sm"
              label="Head branch"
              options={branches.map((b) => ({
                value: b.name,
                label: b.name,
                icon: 'fork_right',
              }))}
              value={head}
              onChange={(val) => setHead(val)}
            />
          </div>
          <span className="text-[#5d6168] dark:text-[#8e9199] font-medium shrink-0 pt-3">into</span>
          <div className="flex-1">
            <M3Dropdown<string>
              searchable
              size="sm"
              label="Base branch"
              options={branches.map((b) => ({
                value: b.name,
                label: b.name,
                icon: 'fork_right',
              }))}
              value={base}
              onChange={(val) => setBase(val)}
            />
          </div>
        </div>
        <input
          type="text"
          required
          placeholder="PR Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-[#f8fafd] dark:bg-[#121316] border border-[#d8dae5] dark:border-[#43474e] rounded-lg px-2.5 py-2 text-xs text-[#191c20] dark:text-white focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa]"
        />
        <textarea
          rows={3}
          placeholder="Description of changes..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full bg-[#f8fafd] dark:bg-[#121316] border border-[#d8dae5] dark:border-[#43474e] rounded-lg p-2 text-xs text-[#191c20] dark:text-white focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] resize-none"
        />
        <div className="flex gap-2 pt-2">
          <M3Button variant="tonal" size="sm" type="button" onClick={triggerClose} className="flex-1">
            {t.cancel}
          </M3Button>
          <M3Button variant="filled" size="sm" type="submit" loading={loading} className="flex-1">
            {t.openPR}
          </M3Button>
        </div>
      </form>
    </div>
  );
}
