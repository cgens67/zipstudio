/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { M3Icon, M3IconButton, M3Button, M3Badge } from './M3Components';
import {
  GitBranch,
  GitCommit,
  FileDiff,
  PullRequest,
  GitHubUser,
  GitHubRepo,
} from '../utils/gitService';
import { Translations } from '../utils/i18n';

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
}: GitHubPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'changes' | 'branches' | 'prs' | 'commits'>('changes');
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [isConnectingToken, setIsConnectingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string>('');
  const [selectedDiff, setSelectedDiff] = useState<FileDiff | null>(null);

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
      <aside className="w-80 h-full bg-[#18191c] border-r border-[#43474e]/40 flex flex-col p-4 shrink-0 overflow-y-auto">
        <div className="flex items-center gap-2 border-b border-[#43474e]/30 pb-3 mb-4">
          <M3Icon name="lock" size={20} className="text-[#a8c7fa]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white">GitHub Access Required</h2>
        </div>

        <div className="bg-[#1e1f22] border border-[#43474e]/50 rounded-2xl p-4 mb-4 text-center">
          <div className="w-12 h-12 rounded-full bg-[#00468b]/30 text-[#a8c7fa] flex items-center justify-center mx-auto mb-3">
            <M3Icon name="sync_lock" size={26} />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Real GitHub Integration</h3>
          <p className="text-xs text-[#c4c6d0] mb-4 leading-relaxed">
            Connect your real GitHub account to view repositories, switch branches, review pull requests, and commit code directly.
          </p>

          {/* Real Token Login (Recommended & Instant) */}
          <form onSubmit={handleTokenSubmit} className="text-left space-y-2 mb-4 bg-[#2b2d30] p-3 rounded-xl border border-[#43474e]/40">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-1">
                <M3Icon name="key" size={14} className="text-[#a8c7fa]" />
                Personal Access Token (PAT)
              </label>
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#a8c7fa] hover:underline"
              >
                {t.generateTokenLink}
              </a>
            </div>
            <p className="text-[11px] text-[#8e9199]">
              {t.createTokenNotice}
            </p>
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={patInput}
              onChange={(e) => setPatInput(e.target.value)}
              className="w-full bg-[#121316] border border-[#43474e] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#a8c7fa]"
            />
            {tokenError && (
              <div className="text-[11px] text-[#ff8585] bg-[#690005]/20 p-1.5 rounded border border-[#ff8585]/30">
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
          <div className="pt-2 border-t border-[#43474e]/30">
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
              className="text-[11px] text-[#8e9199] hover:text-[#a8c7fa] underline cursor-pointer"
            >
              {showOAuthInfo ? t.hideOAuthInfo : t.viewOAuthInfo}
            </button>

            {showOAuthInfo && (
              <div className="mt-2 text-left bg-[#121316] p-2.5 rounded-lg border border-[#43474e]/40 text-[11px] text-[#c4c6d0] space-y-1.5 animate-fadeIn">
                <div className="font-semibold text-white">{t.oauthSignIn}:</div>
                <div>Status: {oauthConfigured ? <span className="text-[#b4f3b7]">{t.oauthConfiguredLabel}</span> : <span className="text-[#ffd54f]">{t.oauthNotConfiguredLabel}</span>}</div>
                <div>{t.callbackUrlLabel}:</div>
                <div className="p-1 bg-[#1e1f22] rounded font-mono text-[10px] break-all text-[#a8c7fa] select-all">
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
    <aside className="w-80 h-full bg-[#18191c] border-r border-[#43474e]/40 flex flex-col shrink-0 overflow-hidden">
      {/* Real GitHub User Header */}
      <div className="p-3 bg-[#1e1f22] border-b border-[#43474e]/30 flex items-center justify-between">
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
              className="w-7 h-7 rounded-full border border-[#a8c7fa]"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#00468b] text-[#d6e3ff] flex items-center justify-center font-bold text-xs">
              {user?.login?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <div className="truncate text-left">
            <div className="text-xs font-semibold text-white leading-tight truncate">
              {user?.name || user?.login}
            </div>
            <div className="text-[10px] text-[#8e9199]">@{user?.login}</div>
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
      <div className="p-2.5 bg-[#121316]/60 border-b border-[#43474e]/30">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-[#8e9199] uppercase tracking-wider flex items-center gap-1">
            <M3Icon name="bookmark" size={13} className="text-[#a8c7fa]" />
            Target Repository
          </span>
          <button
            onClick={() => setShowNewRepoModal(true)}
            className="text-[11px] text-[#a8c7fa] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <M3Icon name="add" size={12} />
            New Repo
          </button>
        </div>

        {repos.length > 0 ? (
          <select
            value={selectedRepo?.fullName || ''}
            onChange={(e) => {
              const r = repos.find((repo) => repo.fullName === e.target.value);
              if (r) onSelectRepo(r);
            }}
            className="w-full bg-[#1e1f22] border border-[#43474e]/50 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#a8c7fa] font-mono truncate"
          >
            {repos.map((r) => (
              <option key={r.id} value={r.fullName}>
                {r.fullName} ({r.defaultBranch})
              </option>
            ))}
          </select>
        ) : (
          <div className="text-xs text-[#8e9199] py-1">
            No repositories found. Click &quot;New Repo&quot; to create one.
          </div>
        )}

        {repos.length > 0 && selectedRepo && (
          <button
            type="button"
            disabled={isLoadingRepo}
            onClick={onLoadRepoFiles}
            className="w-full mt-2 py-1 px-2 rounded-lg bg-[#a8c7fa]/10 hover:bg-[#a8c7fa]/20 text-[#a8c7fa] border border-[#a8c7fa]/30 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLoadingRepo ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>{t.loadingRepo}</span>
              </>
            ) : (
              <>
                <M3Icon name="cloud_download" size={14} />
                <span>{t.loadRepoFiles} ({selectedRepo.name})</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Real Branch Switcher & Creator */}
      <div className="p-2.5 bg-[#18191c] border-b border-[#43474e]/30">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-[#8e9199] uppercase tracking-wider flex items-center gap-1">
            <M3Icon name="fork_right" size={13} className="text-[#a8c7fa]" />
            Active Branch
          </span>
          <button
            onClick={() => setShowNewBranchModal(true)}
            className="text-[11px] text-[#a8c7fa] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <M3Icon name="add" size={12} />
            New Branch
          </button>
        </div>

        <select
          value={activeBranch}
          onChange={(e) => onSwitchBranch(e.target.value)}
          className="w-full bg-[#1e1f22] border border-[#43474e]/50 rounded-lg px-2 py-1.5 text-xs text-[#a8c7fa] font-mono font-medium focus:outline-none focus:border-[#a8c7fa]"
        >
          {branches.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name} {b.name === activeBranch ? '✓' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Sub Tabs */}
      <div className="h-8 bg-[#1e1f22] border-b border-[#43474e]/30 flex items-center px-1 text-xs">
        <button
          onClick={() => setActiveSubTab('changes')}
          className={`flex-1 py-1.5 text-center font-medium border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'changes'
              ? 'border-[#a8c7fa] text-[#a8c7fa]'
              : 'border-transparent text-[#8e9199] hover:text-white'
          }`}
        >
          Changes ({diffs.length})
        </button>
        <button
          onClick={() => setActiveSubTab('prs')}
          className={`flex-1 py-1.5 text-center font-medium border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'prs'
              ? 'border-[#a8c7fa] text-[#a8c7fa]'
              : 'border-transparent text-[#8e9199] hover:text-white'
          }`}
        >
          PRs ({pullRequests.length})
        </button>
        <button
          onClick={() => setActiveSubTab('commits')}
          className={`flex-1 py-1.5 text-center font-medium border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'commits'
              ? 'border-[#a8c7fa] text-[#a8c7fa]'
              : 'border-transparent text-[#8e9199] hover:text-white'
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
                <div className="text-center py-4 text-xs text-[#8e9199]">
                  <M3Icon name="check_circle" size={32} className="mx-auto mb-2 text-[#b4f3b7]" />
                  <p className="font-semibold text-white">Working tree clean</p>
                  <p className="mt-1 text-[11px]">All current files match your local baseline.</p>
                </div>
                {/* Allow pushing a fresh project commit directly */}
                <form onSubmit={handleCommitSubmit} className="pt-2 border-t border-[#43474e]/30 space-y-2">
                  <div className="text-[11px] font-semibold text-[#a8c7fa] flex items-center gap-1">
                    <M3Icon name="cloud_upload" size={14} />
                    <span>Push Project Snapshot to GitHub</span>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Commit message (e.g. Sync imported zip files)"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="w-full bg-[#121316] border border-[#43474e] rounded-lg p-2 text-xs text-white placeholder-[#8e9199] focus:outline-none focus:border-[#a8c7fa] resize-none font-mono"
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
                  <div className="p-2.5 rounded-lg bg-[#00468b]/30 border border-[#a8c7fa]/40 text-[#d6e3ff] text-[11px] flex items-start gap-2">
                    <M3Icon name="auto_delete" size={16} className="text-[#a8c7fa] shrink-0 mt-0.5" />
                    <span>{t.cleanOverwriteNotice}</span>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold uppercase text-[#8e9199] mb-1">
                    Staged Files ({diffs.length})
                  </div>
                  {diffs.map((diff) => (
                    <div
                      key={diff.path}
                      onClick={() => setSelectedDiff(diff)}
                      className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors ${
                        selectedDiff?.path === diff.path
                          ? 'bg-[#00468b]/30 border border-[#a8c7fa]/50'
                          : 'bg-[#2b2d30] hover:bg-[#383a3e]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <M3Icon
                          name={diff.status === 'added' ? 'add_circle' : diff.status === 'deleted' ? 'remove_circle' : 'edit'}
                          size={14}
                          className={diff.status === 'added' ? 'text-[#b4f3b7]' : diff.status === 'deleted' ? 'text-[#ff8585]' : 'text-[#ffd54f]'}
                        />
                        <span className="truncate font-mono text-white">{diff.path}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-mono shrink-0 ml-2">
                        {diff.additions > 0 && <span className="text-[#b4f3b7]">+{diff.additions}</span>}
                        {diff.deletions > 0 && <span className="text-[#ff8585]">-{diff.deletions}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Commit Form */}
                <form onSubmit={handleCommitSubmit} className="pt-2 border-t border-[#43474e]/30 space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Commit message (e.g. Update components and styles)"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="w-full bg-[#121316] border border-[#43474e] rounded-lg p-2 text-xs text-white placeholder-[#8e9199] focus:outline-none focus:border-[#a8c7fa] resize-none font-mono"
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
              <span className="text-xs font-semibold text-white">Pull Requests</span>
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
              <div className="text-center py-6 text-xs text-[#8e9199]">
                <M3Icon name="merge" size={32} className="mx-auto mb-2 text-[#a8c7fa]/40" />
                <p>No pull requests found for this repo.</p>
              </div>
            ) : (
              pullRequests.map((pr) => (
                <div
                  key={pr.id}
                  className="p-3 rounded-xl bg-[#2b2d30] border border-[#43474e]/50 hover:border-[#a8c7fa]/50 transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-white">#{pr.number} {pr.title}</span>
                    <M3Badge variant={pr.state === 'open' ? 'success' : 'secondary'}>
                      {pr.state}
                    </M3Badge>
                  </div>
                  <div className="text-[11px] text-[#8e9199] flex items-center gap-1 font-mono">
                    <span>{pr.headBranch}</span>
                    <M3Icon name="arrow_forward" size={12} />
                    <span>{pr.baseBranch}</span>
                  </div>
                  {pr.description && (
                    <p className="text-xs text-[#c4c6d0] line-clamp-2">{pr.description}</p>
                  )}

                  {/* Review Actions */}
                  <div className="pt-2 border-t border-[#43474e]/30 flex items-center justify-between">
                    <span className="text-[10px] text-[#8e9199]">
                      {pr.reviews.length} {t.reviews}
                    </span>
                    <button
                      onClick={() => setActivePRToReview(pr)}
                      className="px-2.5 py-1 rounded bg-[#a8c7fa]/20 hover:bg-[#a8c7fa]/30 text-[#a8c7fa] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
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
          <div className="space-y-2">
            {commits.map((c) => (
              <div key={c.id} className="p-2.5 rounded-lg bg-[#2b2d30] border border-[#43474e]/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white truncate max-w-[180px]">{c.message}</span>
                  <span className="text-[10px] font-mono text-[#a8c7fa]">{c.shortId}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#8e9199]">
                  <span>{c.author.name}</span>
                  <span>{new Date(c.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visual File Diff Modal */}
      {selectedDiff && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1e1f22] border border-[#43474e] rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-3 bg-[#2b2d30] border-b border-[#43474e] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <M3Icon name="difference" size={18} className="text-[#a8c7fa]" />
                <span className="text-xs font-mono font-semibold text-white">{selectedDiff.path}</span>
                <span className="text-[11px] text-[#b4f3b7]">+{selectedDiff.additions}</span>
                <span className="text-[11px] text-[#ff8585]">-{selectedDiff.deletions}</span>
              </div>
              <M3IconButton
                size="sm"
                icon="close"
                label={t.closeDiff}
                onClick={() => setSelectedDiff(null)}
              />
            </div>

            <div className="flex-1 overflow-auto p-3 font-mono text-xs bg-[#121316]">
              {selectedDiff.lines.map((line, idx) => {
                const isAdd = line.type === 'add';
                const isDel = line.type === 'delete';
                return (
                  <div
                    key={idx}
                    className={`flex items-start py-0.5 px-2 ${
                      isAdd
                        ? 'bg-[#0f5223]/30 text-[#b4f3b7]'
                        : isDel
                        ? 'bg-[#690005]/30 text-[#ff8585]'
                        : 'text-[#c4c6d0]'
                    }`}
                  >
                    <span className="w-8 text-right pr-2 text-[#6e7179] select-none shrink-0">
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
      )}

      {/* Review Pull Request Dialog */}
      {activePRToReview && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1e1f22] border border-[#43474e] rounded-2xl max-w-lg w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">{t.reviewPRTitle} #{activePRToReview.number}</h3>
              <M3IconButton
                size="sm"
                icon="close"
                label={t.close}
                onClick={() => setActivePRToReview(null)}
              />
            </div>
            <p className="text-xs text-[#a8c7fa] font-medium mb-1">{activePRToReview.title}</p>
            <p className="text-xs text-[#c4c6d0] mb-3">{activePRToReview.description}</p>

            <textarea
              rows={3}
              placeholder={t.reviewNotesPlaceholder}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full bg-[#121316] border border-[#43474e] rounded-lg p-2.5 text-xs text-white mb-4 focus:outline-none focus:border-[#a8c7fa]"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleReviewAction('APPROVED')}
                className="flex-1 py-2 px-3 rounded-xl bg-[#0f5223] hover:bg-[#146c2e] text-[#b4f3b7] text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <M3Icon name="check" size={16} />
                {t.approve}
              </button>
              <button
                onClick={() => handleReviewAction('CHANGES_REQUESTED')}
                className="flex-1 py-2 px-3 rounded-xl bg-[#690005] hover:bg-[#8c0009] text-[#ffdad6] text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <M3Icon name="cancel" size={16} />
                {t.requestChanges}
              </button>
              <button
                onClick={() => handleReviewAction('COMMENTED')}
                className="flex-1 py-2 px-3 rounded-xl bg-[#2b2d30] hover:bg-[#383a3e] text-[#e2e2e6] text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <M3Icon name="chat" size={16} />
                {t.comment}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Repo Modal */}
      {showNewRepoModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateRepoSubmit} className="bg-[#1e1f22] border border-[#43474e] rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-semibold text-white">{t.createRepoTitle}</h3>
            <input
              type="text"
              required
              placeholder={t.repoNamePlaceholder}
              value={newRepoName}
              onChange={(e) => setNewRepoName(e.target.value)}
              className="w-full bg-[#121316] border border-[#43474e] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#a8c7fa]"
            />
            <input
              type="text"
              placeholder={t.repoDescPlaceholder}
              value={newRepoDesc}
              onChange={(e) => setNewRepoDesc(e.target.value)}
              className="w-full bg-[#121316] border border-[#43474e] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#a8c7fa]"
            />
            <label className="flex items-center gap-2 text-xs text-[#c4c6d0] cursor-pointer">
              <input
                type="checkbox"
                checked={newRepoPrivate}
                onChange={(e) => setNewRepoPrivate(e.target.checked)}
                className="rounded accent-[#a8c7fa]"
              />
              <span>{t.privateRepo}</span>
            </label>
            <div className="flex gap-2 pt-2">
              <M3Button variant="tonal" size="sm" type="button" onClick={() => setShowNewRepoModal(false)} className="flex-1">
                {t.cancel}
              </M3Button>
              <M3Button variant="filled" size="sm" type="submit" className="flex-1">
                {t.createOnGitHub}
              </M3Button>
            </div>
          </form>
        </div>
      )}

      {/* Create New Branch Modal */}
      {showNewBranchModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateBranchSubmit} className="bg-[#1e1f22] border border-[#43474e] rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-semibold text-white">{t.createBranchTitle}</h3>
            <p className="text-xs text-[#c4c6d0]">{t.branchFrom}: <span className="text-[#a8c7fa] font-mono">{activeBranch}</span></p>
            <input
              type="text"
              required
              placeholder={t.branchNamePlaceholder}
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              className="w-full bg-[#121316] border border-[#43474e] rounded-lg px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#a8c7fa]"
            />
            <div className="flex gap-2 pt-2">
              <M3Button variant="tonal" size="sm" type="button" onClick={() => setShowNewBranchModal(false)} className="flex-1">
                {t.cancel}
              </M3Button>
              <M3Button variant="filled" size="sm" type="submit" className="flex-1">
                {t.newBranch}
              </M3Button>
            </div>
          </form>
        </div>
      )}

      {/* Create New Pull Request Modal */}
      {showNewPRModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreatePRSubmit} className="bg-[#1e1f22] border border-[#43474e] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-semibold text-white">{t.newPR}</h3>
            <div className="flex items-center gap-2 text-xs">
              <select
                value={prHead}
                onChange={(e) => setPrHead(e.target.value)}
                className="flex-1 bg-[#121316] border border-[#43474e] rounded p-1.5 text-xs text-[#a8c7fa] font-mono"
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
              <span className="text-[#8e9199]">into</span>
              <select
                value={prBase}
                onChange={(e) => setPrBase(e.target.value)}
                className="flex-1 bg-[#121316] border border-[#43474e] rounded p-1.5 text-xs text-white font-mono"
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              required
              placeholder="PR Title"
              value={prTitle}
              onChange={(e) => setPrTitle(e.target.value)}
              className="w-full bg-[#121316] border border-[#43474e] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#a8c7fa]"
            />
            <textarea
              rows={3}
              placeholder="Description of changes..."
              value={prBody}
              onChange={(e) => setPrBody(e.target.value)}
              className="w-full bg-[#121316] border border-[#43474e] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#a8c7fa] resize-none"
            />
            <div className="flex gap-2 pt-2">
              <M3Button variant="tonal" size="sm" type="button" onClick={() => setShowNewPRModal(false)} className="flex-1">
                {t.cancel}
              </M3Button>
              <M3Button variant="filled" size="sm" type="submit" className="flex-1">
                {t.openPR}
              </M3Button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
}
