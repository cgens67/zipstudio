/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  VFile,
  buildFileTree,
  extractZipInBrowser,
  packageZipFromFiles,
  normalizePath,
  getFileName,
} from './utils/fileSystem';
import {
  GitBranch,
  GitCommit,
  PullRequest,
  GitHubUser,
  GitHubRepo,
  computeWorkingTreeChanges,
  createCommit,
  GitHubApiClient,
  RepoLoadProgress,
} from './utils/gitService';
import { STARTER_TEMPLATES } from './utils/starterTemplates';
import { SupportedLanguage, TRANSLATIONS } from './utils/i18n';
import { M3Icon, M3Button } from './components/M3Components';
import { M3Switch } from './components/M3Switch';
import { Sidebar } from './components/Sidebar';
import { SearchPanel } from './components/SearchPanel';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { Terminal, ConsoleLogEntry } from './components/Terminal';
import { GitHubPanel } from './components/GitHubPanel';
import { CollabModal } from './components/CollabModal';
import { collabService, CollabPeer } from './utils/collabService';
import { SettingsModal, EditorSettings, DEFAULT_SETTINGS } from './components/SettingsModal';
import { processDroppedDataTransfer } from './utils/dragDropHandler';
import { useDialogAnimation } from './utils/useDialogAnimation';

interface SavedSession {
  savedAt: number;
  files: Record<string, VFile>;
  openTabs: string[];
  activeFilePath: string;
  repoName?: string;
  isCleanZipImport?: boolean;
}

export default function App() {
  // Screen size detection for dedicated mobile UI
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Language state (en, zh-CN, ms)
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(() => {
    return (localStorage.getItem('zipstudio_lang') as SupportedLanguage) || 'en';
  });

  const t = useMemo(() => TRANSLATIONS[currentLang] || TRANSLATIONS.en, [currentLang]);

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setCurrentLang(lang);
    localStorage.setItem('zipstudio_lang', lang);
  };

  // Desktop active sidebar panel: 'explorer' | 'search' | 'git' | null
  const [activePanel, setActivePanel] = useState<'explorer' | 'search' | 'git' | null>('explorer');

  // Desktop split view mode: 'split' | 'code' | 'preview'
  const [viewMode, setViewMode] = useState<'split' | 'code' | 'preview'>('split');

  // Mobile dedicated tab view: 'files' | 'editor' | 'preview' | 'search' | 'git' | 'terminal'
  const [mobileTab, setMobileTab] = useState<'files' | 'editor' | 'preview' | 'search' | 'git' | 'terminal'>('editor');

  // Bottom terminal toggle (desktop)
  const [showTerminal, setShowTerminal] = useState(true);

  // Mouse Resizable Layout State (Sidebar, Splitter Code/Preview, Bottom Terminal)
  const [sidebarWidth, setSidebarWidth] = useState<number>(270);
  const [terminalHeight, setTerminalHeight] = useState<number>(230);
  const [splitRatio, setSplitRatio] = useState<number>(50); // % width of code editor in split view
  const [terminalMaximized, setTerminalMaximized] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<'sidebar' | 'terminal' | 'splitter' | null>(null);
  const centralWorkspaceRef = useRef<HTMLDivElement>(null);

  // Global mouse move and mouse up listeners for smooth resizing with mouse
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging === 'sidebar') {
        const newWidth = Math.max(180, Math.min(600, e.clientX - 48));
        setSidebarWidth(newWidth);
      } else if (isDragging === 'terminal') {
        const newHeight = Math.max(100, Math.min(window.innerHeight - 120, window.innerHeight - e.clientY));
        setTerminalHeight(newHeight);
      } else if (isDragging === 'splitter') {
        if (centralWorkspaceRef.current) {
          const rect = centralWorkspaceRef.current.getBoundingClientRect();
          const offsetX = e.clientX - rect.left;
          const newRatio = Math.max(15, Math.min(85, (offsetX / rect.width) * 100));
          setSplitRatio(newRatio);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // File System State
  const defaultTemplate = STARTER_TEMPLATES[0];
  const [files, setFiles] = useState<Record<string, VFile>>(defaultTemplate.files);
  const [baseFiles, setBaseFiles] = useState<Record<string, VFile>>(defaultTemplate.files);
  const [openTabs, setOpenTabs] = useState<string[]>(['index.html', 'style.css', 'app.js']);
  const [activeFilePath, setActiveFilePath] = useState<string>('index.html');
  const [targetSearchLine, setTargetSearchLine] = useState<number | undefined>(undefined);

  // Clean zip import overwrite flag
  const [isCleanZipImport, setIsCleanZipImport] = useState(false);

  // Loading GitHub repo files state & ETA progress
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const [repoLoadProgress, setRepoLoadProgress] = useState<RepoLoadProgress | null>(null);

  // Unsaved session persistence & prompt state
  const [pendingSession, setPendingSession] = useState<SavedSession | null>(null);
  const [backupBeforeRestore, setBackupBeforeRestore] = useState(true);

  // In-UI Alert & Modal Dialog state (eliminates external browser alert/dialogs)
  const [inUiAlert, setInUiAlert] = useState<{
    title: string;
    message: string;
    type?: 'info' | 'error' | 'success' | 'warning';
  } | null>(null);

  const triggerAlert = (
    title: string,
    message: string,
    type: 'info' | 'error' | 'success' | 'warning' = 'info'
  ) => {
    setInUiAlert({ title, message, type });
  };

  // Terminal & Preview Logs
  const [logs, setLogs] = useState<ConsoleLogEntry[]>([]);
  const [gitLogs, setGitLogs] = useState<string[]>([
    'Git subsystem initialized.',
    'Tracking working tree on branch main.',
  ]);

  // GitHub & Version Control State (100% Real API)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [activeBranch, setActiveBranch] = useState('main');
  const [branches, setBranches] = useState<GitBranch[]>([
    { name: 'main', isCurrent: true, isDefault: true, commitSha: 'HEAD' },
  ]);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState('');

  // Live Collaboration & Presence State
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [collabPeers, setCollabPeers] = useState<CollabPeer[]>([]);
  const [collabConnected, setCollabConnected] = useState(false);

  // App & Editor Settings state (persisted to localStorage)
  const [settings, setSettings] = useState<EditorSettings>(() => {
    try {
      const saved = localStorage.getItem('zipstudio_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Drag & Drop Folders and ZIP Archives
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  // Theme synchronization effect (Dark, Light, System)
  useEffect(() => {
    try {
      localStorage.setItem('zipstudio_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed saving settings:', e);
    }

    const applyTheme = () => {
      const isLight =
        settings.theme === 'light' ||
        (settings.theme === 'system' && !window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (isLight) {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      }
    };

    applyTheme();

    if (settings.theme === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
  }, [settings]);

  // Drag and drop event listeners
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    try {
      const result = await processDroppedDataTransfer(e.dataTransfer);
      if (result.fileCount === 0) {
        triggerAlert('No Files Found', 'No files could be extracted from the dropped item.', 'warning');
        return;
      }

      // Merge dropped files into workspace
      setFiles((prev) => ({
        ...prev,
        ...result.files,
      }));

      const keys = Object.keys(result.files);
      const defaultFile = result.files['index.html'] ? 'index.html' : keys[0];
      if (defaultFile) {
        setActiveFilePath(defaultFile);
        setOpenTabs((prev) => Array.from(new Set([...prev, defaultFile])));
      }

      const msg = `Imported ${result.fileCount} file(s)${
        result.folderCount > 0 ? ` across ${result.folderCount} folder(s)` : ''
      }${result.zipCount > 0 ? ` (including ${result.zipCount} ZIP archive${result.zipCount > 1 ? 's' : ''})` : ''} into workspace.`;

      addGitLog(msg);
      triggerAlert('Files Imported', msg, 'info');
    } catch (err: any) {
      console.error('Drag and drop import failed:', err);
      triggerAlert('Import Error', `Failed to import dropped files: ${err.message}`, 'error');
    }
  };

  const handleResetWorkspace = () => {
    setFiles({});
    setBaseFiles({});
    setOpenTabs([]);
    setActiveFilePath('');
    localStorage.removeItem('zipstudio_workspace_session');
    addGitLog('Cleared workspace and local storage cache.');
    triggerAlert('Workspace Reset', 'All workspace files have been cleared.', 'info');
  };

  // Initialize live collaboration WebSocket on mount
  useEffect(() => {
    collabService.connect();
    const unsubPeers = collabService.onPeers(setCollabPeers);
    const unsubConn = collabService.onConnection(setCollabConnected);
    return () => {
      unsubPeers();
      unsubConn();
    };
  }, []);

  // Check saved session on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('zipstudio_workspace_session');
      if (raw) {
        const parsed: SavedSession = JSON.parse(raw);
        if (parsed.files && Object.keys(parsed.files).length > 0) {
          setPendingSession(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed restoring saved session:', e);
    }
  }, []);

  // Debounced auto-save session (safely omits heavy binary data to stay well under browser 5MB quota)
  useEffect(() => {
    if (pendingSession) return;
    const timer = setTimeout(() => {
      try {
        const sanitizedFiles: Record<string, VFile> = {};
        for (const [path, f] of Object.entries(files)) {
          if (f.isBinary || f.size > 30000 || f.content.length > 30000) {
            sanitizedFiles[path] = {
              ...f,
              content: '', // omit multi-megabyte base64 data from localStorage
            };
          } else {
            sanitizedFiles[path] = f;
          }
        }

        const session: SavedSession = {
          savedAt: Date.now(),
          files: sanitizedFiles,
          openTabs,
          activeFilePath,
          repoName: selectedRepo?.fullName,
          isCleanZipImport,
        };
        localStorage.setItem('zipstudio_workspace_session', JSON.stringify(session));
      } catch (e) {
        console.warn('Failed auto-saving session (storage quota):', e);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [files, openTabs, activeFilePath, selectedRepo, isCleanZipImport, pendingSession]);

  const handleRestoreSession = () => {
    if (!pendingSession) return;
    if (backupBeforeRestore && Object.keys(files).length > 0) {
      try {
        const sanitizedFiles: Record<string, VFile> = {};
        for (const [path, f] of Object.entries(files)) {
          if (f.isBinary || f.size > 30000 || f.content.length > 30000) {
            sanitizedFiles[path] = { ...f, content: '' };
          } else {
            sanitizedFiles[path] = f;
          }
        }
        localStorage.setItem(
          `zipstudio_backup_${Date.now()}`,
          JSON.stringify({ files: sanitizedFiles, timestamp: Date.now() })
        );
      } catch (e) {
        console.warn('Backup error:', e);
      }
    }
    setFiles(pendingSession.files);
    setBaseFiles(pendingSession.files);
    if (pendingSession.openTabs && pendingSession.openTabs.length > 0) {
      setOpenTabs(pendingSession.openTabs);
    }
    if (pendingSession.activeFilePath) {
      setActiveFilePath(pendingSession.activeFilePath);
    }
    if (typeof pendingSession.isCleanZipImport === 'boolean') {
      setIsCleanZipImport(pendingSession.isCleanZipImport);
    }
    addGitLog(`Restored previous unsaved session (${Object.keys(pendingSession.files).length} files).`);
    setPendingSession(null);
  };

  const handleDiscardSession = () => {
    localStorage.removeItem('zipstudio_workspace_session');
    setPendingSession(null);
    addGitLog('Discarded previous unsaved session.');
  };

  // Global hotkeys (Find in files: Ctrl+Shift+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        if (isMobile) {
          setMobileTab('search');
        } else {
          setActivePanel('search');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile]);

  // Helper to add git log with auto-timestamp
  const addGitLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setGitLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  // Check OAuth configuration status on mount
  useEffect(() => {
    fetch('/api/auth/github/url')
      .then((res) => res.json())
      .then((data) => {
        setOauthConfigured(Boolean(data.configured));
        if (data.callbackUrl) {
          setCallbackUrl(data.callbackUrl);
        }
      })
      .catch(() => setOauthConfigured(false));
  }, []);

  // Restore authenticated session from localStorage if present
  useEffect(() => {
    const savedToken = localStorage.getItem('zipstudio_github_token');
    if (savedToken) {
      handleConnectToken(savedToken).catch(() => {
        localStorage.removeItem('zipstudio_github_token');
      });
    }
  }, []);

  // Listen to OAuth postMessage from popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const token = event.data.token;
        if (token) {
          await handleConnectToken(token);
          addGitLog('GitHub OAuth authentication successful.');
        }
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        addGitLog(`GitHub OAuth Error: ${event.data.error || 'Access denied'}`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [addGitLog]);

  // Handle OAuth Connect
  const handleConnectOAuth = async () => {
    try {
      addGitLog('Requesting OAuth authorization URL...');
      const res = await fetch('/api/auth/github/url');
      const data = await res.json();

      if (!data.configured) {
        triggerAlert(
          'OAuth Not Configured',
          'GitHub OAuth CLIENT_ID is not configured in server environment variables.\n\nPlease enter a GitHub Personal Access Token (PAT) with "repo" scope to connect immediately.',
          'warning'
        );
        return;
      }

      const authWindow = window.open(
        data.url,
        'github_oauth_popup',
        'width=600,height=720,menubar=no,toolbar=no'
      );

      if (!authWindow) {
        triggerAlert('Popup Blocked', 'Popup was blocked by your browser. Please allow popups to connect your GitHub account.', 'warning');
      }
    } catch (err: any) {
      addGitLog(`OAuth initiation error: ${err.message}`);
    }
  };

  // Real Token Connect (uses real GitHub API)
  const handleConnectToken = async (token: string) => {
    addGitLog('Validating GitHub credentials with https://api.github.com/user...');
    const client = new GitHubApiClient(token);
    const user = await client.getAuthenticatedUser();

    setGithubToken(token);
    setGithubUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('zipstudio_github_token', token);
    addGitLog(`Successfully connected to real GitHub account: @${user.login} (${user.name})`);

    // Fetch real repositories from user's GitHub
    try {
      const userRepos = await client.getUserRepos();
      setRepos(userRepos);
      if (userRepos.length > 0) {
        setSelectedRepo(userRepos[0]);
        setActiveBranch(userRepos[0].defaultBranch);
        addGitLog(`Loaded ${userRepos.length} repositories. Selected: ${userRepos[0].fullName}`);

        // Automatically load remote repo tree files
        await loadRemoteRepoTree(client, userRepos[0], userRepos[0].defaultBranch);
      }
    } catch (e: any) {
      addGitLog(`Notice fetching user repos: ${e.message}`);
    }
  };

  // Helper: Load remote repository files directly into editor and preview with ETA progress
  const loadRemoteRepoTree = async (
    client: GitHubApiClient,
    repo: GitHubRepo,
    branch: string
  ) => {
    setIsLoadingRepo(true);
    setRepoLoadProgress(null);
    addGitLog(`Downloading full file tree for ${repo.fullName}@${branch}...`);

    try {
      const [owner, repoName] = repo.fullName.split('/');
      const repoFiles = await client.fetchRepoTree(
        owner,
        repoName,
        branch,
        (progress) => setRepoLoadProgress(progress)
      );
      const fileCount = Object.keys(repoFiles).length;

      if (fileCount > 0) {
        setFiles(repoFiles);
        setBaseFiles(repoFiles);
        setIsCleanZipImport(false);

        // Open index.html or first file
        const defaultFile = repoFiles['index.html'] ? 'index.html' : Object.keys(repoFiles)[0];
        setOpenTabs([defaultFile]);
        setActiveFilePath(defaultFile);

        addGitLog(`Successfully loaded ${fileCount} files from GitHub repo ${repo.fullName}@${branch}`);
      } else {
        addGitLog(`Repository ${repo.fullName} has an empty tree or default branch.`);
      }

      // Fetch branches and PRs
      const branchList = await client.getBranches(owner, repoName);
      if (branchList.length > 0) {
        setBranches(
          branchList.map((b) => ({
            name: b,
            isCurrent: b === branch,
            isDefault: b === repo.defaultBranch,
            commitSha: 'HEAD',
          }))
        );
      }

      const prs = await client.getPullRequests(owner, repoName);
      setPullRequests(
        prs.map((p) => ({
          id: p.id,
          number: p.number,
          title: p.title,
          description: p.body || '',
          headBranch: p.head?.ref || '',
          baseBranch: p.base?.ref || '',
          state: p.state as any,
          author: {
            login: p.user?.login || '',
            avatarUrl: p.user?.avatar_url || '',
          },
          createdAt: new Date(p.created_at).getTime(),
          reviews: [],
          diffs: [],
        }))
      );

      // Fetch repository commit history
      try {
        const repoCommits = await client.getRepoCommits(owner, repoName, branch);
        setCommits(repoCommits);
        addGitLog(`Loaded ${repoCommits.length} commits from ${repo.fullName}@${branch}`);
      } catch (commitErr: any) {
        console.warn('Failed loading commits:', commitErr);
      }
    } catch (err: any) {
      addGitLog(`Failed loading repository tree: ${err.message}`);
    } finally {
      setIsLoadingRepo(false);
      setRepoLoadProgress(null);
    }
  };

  // Explicit user trigger: Reload repo files
  const handleLoadRepoFilesExplicit = async () => {
    if (!githubToken || !selectedRepo) return;
    const client = new GitHubApiClient(githubToken);
    await loadRemoteRepoTree(client, selectedRepo, activeBranch);
  };

  // Handle Disconnect
  const handleDisconnect = () => {
    setIsAuthenticated(false);
    setGithubToken(null);
    setGithubUser(null);
    setRepos([]);
    setSelectedRepo(null);
    localStorage.removeItem('zipstudio_github_token');
    addGitLog('Disconnected from GitHub account.');
  };

  // Select target repository
  const handleSelectRepo = async (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setActiveBranch(repo.defaultBranch);
    addGitLog(`Switched active repository to ${repo.fullName}`);

    if (githubToken) {
      const client = new GitHubApiClient(githubToken);
      await loadRemoteRepoTree(client, repo, repo.defaultBranch);
    }
  };

  // Create repository on GitHub or locally
  const handleCreateRepo = async (name: string, description: string, isPrivate: boolean) => {
    if (!githubToken) {
      const newRepo: GitHubRepo = {
        id: Date.now(),
        name,
        fullName: `workspace/${name}`,
        description: description || 'Local workspace repository',
        private: isPrivate,
        defaultBranch: 'main',
        htmlUrl: '#',
        updatedAt: new Date().toISOString(),
      };
      setRepos((prev) => [newRepo, ...prev.filter((r) => r.fullName !== newRepo.fullName)]);
      setSelectedRepo(newRepo);
      setActiveBranch('main');
      setBranches([{ name: 'main', isCurrent: true, isDefault: true, commitSha: 'HEAD' }]);
      addGitLog(`Initialized new local workspace repository "${newRepo.fullName}".`);
      triggerAlert(
        t?.repoCreatedSuccess || 'Repository Created',
        `Repository "${name}" initialized successfully as your active workspace repository.`,
        'success'
      );
      return;
    }
    try {
      addGitLog(`Creating repository "${name}" on GitHub...`);
      const client = new GitHubApiClient(githubToken);
      const newRepo = await client.createRepo(name, description, isPrivate);
      setRepos((prev) => [newRepo, ...prev]);
      await handleSelectRepo(newRepo);
      addGitLog(`Repository "${newRepo.fullName}" created successfully on GitHub.`);
      triggerAlert(
        t?.repoCreatedSuccess || 'Repository Created',
        `Repository "${newRepo.fullName}" created successfully on GitHub!`,
        'success'
      );
    } catch (err: any) {
      addGitLog(`Error creating repo: ${err.message}`);
      triggerAlert('Create Repository Failed', `Failed to create repository on GitHub: ${err.message}`, 'error');
      throw err;
    }
  };

  // Switch branch
  const handleSwitchBranch = async (branchName: string) => {
    setActiveBranch(branchName);
    setBranches((prev) =>
      prev.map((b) => ({
        ...b,
        isCurrent: b.name === branchName,
      }))
    );
    addGitLog(`Switched local HEAD branch to "${branchName}"`);

    if (githubToken && selectedRepo) {
      const client = new GitHubApiClient(githubToken);
      await loadRemoteRepoTree(client, selectedRepo, branchName);
    }
  };

  // Create branch
  const handleCreateBranch = async (branchName: string) => {
    if (!githubToken || !selectedRepo) {
      // Local fallback
      setBranches((prev) => [
        ...prev.map((b) => ({ ...b, isCurrent: false })),
        { name: branchName, isCurrent: true, isDefault: false, commitSha: 'HEAD' },
      ]);
      setActiveBranch(branchName);
      addGitLog(`Created and switched to local branch "${branchName}"`);
      return;
    }

    try {
      addGitLog(`Creating branch "${branchName}" on GitHub...`);
      const [owner, repoName] = selectedRepo.fullName.split('/');
      const client = new GitHubApiClient(githubToken);
      await client.createBranch(owner, repoName, branchName, activeBranch);
      setBranches((prev) => [
        ...prev.map((b) => ({ ...b, isCurrent: false })),
        { name: branchName, isCurrent: true, isDefault: false, commitSha: 'HEAD' },
      ]);
      setActiveBranch(branchName);
      addGitLog(`Branch "${branchName}" created on GitHub and set as active.`);
    } catch (err: any) {
      addGitLog(`Error creating branch: ${err.message}`);
      triggerAlert('Create Branch Failed', `Failed to create branch: ${err.message}`, 'error');
    }
  };

  // Compute live git diffs against baseFiles
  const diffs = useMemo(() => {
    return computeWorkingTreeChanges(baseFiles, files);
  }, [baseFiles, files]);

  // Refresh commit history on demand
  const handleRefreshCommits = async () => {
    if (!githubToken || !selectedRepo) return;
    try {
      const [owner, repoName] = selectedRepo.fullName.split('/');
      const client = new GitHubApiClient(githubToken);
      addGitLog(`Refreshing commit history for ${selectedRepo.fullName}@${activeBranch}...`);
      const repoCommits = await client.getRepoCommits(owner, repoName, activeBranch);
      setCommits(repoCommits);
      addGitLog(`Refreshed ${repoCommits.length} commits for ${activeBranch}.`);
    } catch (err: any) {
      addGitLog(`Commit refresh notice: ${err.message}`);
    }
  };

  // Commit and Push changes
  const handleCommitAndPush = async (message: string) => {
    if (!githubToken || !selectedRepo) {
      // Offline local commit
      const commit = createCommit(
        message,
        activeBranch,
        githubUser?.name || 'Local User',
        githubUser?.login ? `${githubUser.login}@users.noreply.github.com` : 'user@local',
        diffs.length || Object.keys(files).length
      );
      setCommits((prev) => [commit, ...prev]);
      setBaseFiles({ ...files });
      setIsCleanZipImport(false);
      addGitLog(`Committed locally [${commit.shortId}] on ${activeBranch}: "${message}"`);
      return;
    }

    try {
      addGitLog(`Creating commit on GitHub (${selectedRepo.fullName}@${activeBranch})...`);
      const [owner, repoName] = selectedRepo.fullName.split('/');
      const client = new GitHubApiClient(githubToken);

      // Only upload and include files that actually changed
      let filesToCommit: Record<string, VFile> = {};
      const deletedPaths: string[] = [];

      if (isCleanZipImport) {
        filesToCommit = files;
      } else {
        for (const diff of diffs) {
          if (diff.status === 'deleted') {
            deletedPaths.push(diff.path);
          } else if (files[diff.path]) {
            filesToCommit[diff.path] = files[diff.path];
          }
        }

        if (Object.keys(filesToCommit).length === 0 && deletedPaths.length === 0) {
          addGitLog('Working tree clean. There are no changes to commit.');
          triggerAlert('Working Tree Clean', 'There are no changes to commit.', 'info');
          return;
        }
      }

      const commitSha = await client.commitAndPushFiles(
        owner,
        repoName,
        activeBranch,
        message,
        filesToCommit,
        isCleanZipImport,
        deletedPaths
      );

      const commit: GitCommit = {
        id: commitSha,
        shortId: commitSha.substring(0, 7),
        message,
        author: {
          name: githubUser?.name || githubUser?.login || 'Developer',
          email: `${githubUser?.login || 'user'}@users.noreply.github.com`,
          avatarUrl: githubUser?.avatarUrl,
        },
        timestamp: Date.now(),
        branch: activeBranch,
        filesChanged: diffs.length || Object.keys(filesToCommit).length,
      };

      setCommits((prev) => [commit, ...prev]);
      setBaseFiles({ ...files });
      setIsCleanZipImport(false);
      addGitLog(
        `Successfully pushed commit [${commit.shortId}] to https://github.com/${selectedRepo.fullName}/commit/${commitSha}`
      );
    } catch (err: any) {
      addGitLog(`Commit error: ${err.message}`);
      triggerAlert('Commit Failed', `Failed to commit & push to GitHub: ${err.message}`, 'error');
    }
  };

  // Create Pull Request
  const handleCreatePullRequest = async (
    title: string,
    head: string,
    base: string,
    body: string
  ) => {
    if (githubToken && selectedRepo) {
      try {
        addGitLog(`Creating pull request "${title}" on GitHub...`);
        const [owner, repoName] = selectedRepo.fullName.split('/');
        const client = new GitHubApiClient(githubToken);
        const newPr = await client.createPullRequest(owner, repoName, title, head, base, body);
        setPullRequests((prev) => [
          {
            id: newPr.id,
            number: newPr.number,
            title: newPr.title,
            description: newPr.body || '',
            headBranch: newPr.head?.ref || head,
            baseBranch: newPr.base?.ref || base,
            state: newPr.state as any,
            author: {
              login: newPr.user?.login || githubUser?.login || 'author',
              avatarUrl: newPr.user?.avatar_url || githubUser?.avatarUrl,
            },
            createdAt: Date.now(),
            reviews: [],
            diffs: [],
          },
          ...prev,
        ]);
        addGitLog(`Created real GitHub PR #${newPr.number}: "${title}"`);
        return;
      } catch (err: any) {
        addGitLog(`PR creation notice: ${err.message}`);
      }
    }

    const pr: PullRequest = {
      id: Math.floor(Math.random() * 10000),
      number: pullRequests.length + 1,
      title,
      description: body,
      headBranch: head,
      baseBranch: base,
      state: 'open',
      author: {
        login: githubUser?.login || 'developer',
        avatarUrl: githubUser?.avatarUrl || '',
      },
      createdAt: Date.now(),
      reviews: [],
      diffs,
    };
    setPullRequests((prev) => [pr, ...prev]);
    addGitLog(`Created pull request #${pr.number}: "${title}" from ${head} into ${base}`);
  };

  // Submit Pull Request Review
  const handleSubmitPRReview = async (
    prId: number,
    state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED',
    body: string
  ) => {
    if (githubToken && selectedRepo) {
      try {
        const [owner, repoName] = selectedRepo.fullName.split('/');
        const targetPR = pullRequests.find((p) => p.id === prId);
        if (targetPR) {
          const client = new GitHubApiClient(githubToken);
          const eventType: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' =
            state === 'APPROVED' ? 'APPROVE' : state === 'CHANGES_REQUESTED' ? 'REQUEST_CHANGES' : 'COMMENT';
          await client.submitPullRequestReview(owner, repoName, targetPR.number, eventType, body);
        }
      } catch (err: any) {
        addGitLog(`PR review notice: ${err.message}`);
      }
    }

    setPullRequests((prev) =>
      prev.map((pr) => {
        if (pr.id === prId) {
          return {
            ...pr,
            reviews: [
              ...pr.reviews,
              {
                id: Math.random().toString(),
                author: githubUser?.login || 'reviewer',
                avatarUrl: githubUser?.avatarUrl,
                state,
                body,
                submittedAt: Date.now(),
              },
            ],
          };
        }
        return pr;
      })
    );
    addGitLog(`Submitted ${state} review on PR #${prId}: "${body}"`);
  };

  // Execute Git Reset (--soft, --mixed, --hard) with optional remote force-push
  const handleGitReset = async (
    mode: 'soft' | 'mixed' | 'hard',
    count: number,
    forcePushRemote: boolean
  ) => {
    if (count <= 0) return;
    const targetCommitIndex = Math.min(count, commits.length);
    const targetCommit = commits[targetCommitIndex]; // The commit we are resetting TO
    const targetSha = targetCommit ? targetCommit.id : 'HEAD';

    addGitLog(`Executing: git reset --${mode} HEAD~${count}${forcePushRemote ? ' && git push origin HEAD --force' : ''}`);

    // Remote branch reset if requested and authenticated
    if (forcePushRemote && selectedRepo && githubToken && targetCommit) {
      try {
        addGitLog(`Force-pushing reset ref to GitHub (${selectedRepo.fullName}@${activeBranch})...`);
        const [owner, repoName] = selectedRepo.fullName.split('/');
        const client = new GitHubApiClient(githubToken);
        await client.resetBranch(owner, repoName, activeBranch, targetCommit.id, true);
        addGitLog(`Successfully updated remote ${activeBranch} ref to ${targetCommit.shortId} (force-push).`);
      } catch (err: any) {
        addGitLog(`Remote force-push failed: ${err.message}`);
        triggerAlert('Remote Reset Failed', `Failed to update remote branch on GitHub: ${err.message}`, 'error');
        throw err;
      }
    }

    // Adjust local commit history
    setCommits((prev) => prev.slice(count));

    if (mode === 'hard') {
      if (githubToken && selectedRepo && targetCommit) {
        try {
          addGitLog(`Restoring workspace tree from commit ${targetCommit.shortId}...`);
          const client = new GitHubApiClient(githubToken);
          await loadRemoteRepoTree(client, selectedRepo, targetCommit.id);
        } catch (e: any) {
          console.warn('Failed restoring tree from target commit:', e);
        }
      }
      addGitLog(`HEAD is now at [${targetCommit?.shortId || 'HEAD'}] ${targetCommit?.message || ''}`);
    } else if (mode === 'soft') {
      addGitLog(`Soft reset complete. Commits peeled back by ${count}. Your working directory and staged changes remain preserved.`);
    } else {
      addGitLog(`Mixed reset complete. HEAD moved back by ${count}. Changes remain in working tree.`);
    }

    triggerAlert(
      'Git Reset Executed',
      `Successfully performed git reset --${mode} HEAD~${count}${forcePushRemote ? ' (force-pushed to remote)' : ''}.`,
      'success'
    );
  };

  // Handle .ZIP Import directly in browser (CLEAN OVERWRITE)
  const handleUploadZip = async (file: File) => {
    try {
      addGitLog(`Extracting archive "${file.name}" in browser...`);
      const extracted = await extractZipInBrowser(file);
      const count = Object.keys(extracted).length;

      if (count === 0) {
        triggerAlert('Empty Archive', t.emptyArchiveAlert, 'warning');
        return;
      }

      // Completely remove all original files and replace with the imported zip
      setFiles(extracted);
      setBaseFiles({}); // Set base to empty so all zip files are staged
      setIsCleanZipImport(true); // Flag for clean commit overwrite on GitHub

      const defaultFile = extracted['index.html'] ? 'index.html' : Object.keys(extracted)[0];
      setOpenTabs([defaultFile]);
      setActiveFilePath(defaultFile);

      if (isMobile) {
        setMobileTab('editor');
      } else {
        setActivePanel('git');
      }

      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          type: 'info',
          message: `Extracted ${count} files directly from "${file.name}". All previous files replaced. Ready to commit clean overwrite.`,
          timestamp: Date.now(),
        },
      ]);
      addGitLog(
        `Extracted ${count} files from "${file.name}". Replaced previous project files. Ready for clean overwrite commit.`
      );
    } catch (err: any) {
      console.error('Extraction error:', err);
      triggerAlert('Extraction Failed', `${t.extractFailed}: ${err.message}`, 'error');
    }
  };

  // Handle .ZIP Export
  const handleExportZip = async () => {
    try {
      addGitLog('Packaging current workspace into .zip archive...');
      const blob = await packageZipFromFiles(files);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedRepo?.name || 'zipstudio-project'}-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addGitLog(`Exported .zip archive: ${a.download}`);
    } catch (err: any) {
      triggerAlert('Export Failed', `${t.exportFailed}: ${err.message}`, 'error');
    }
  };

  // File Operations
  const handleSelectFile = (path: string) => {
    if (!openTabs.includes(path)) {
      setOpenTabs((prev) => [...prev, path]);
    }
    setActiveFilePath(path);
    if (isMobile) {
      setMobileTab('editor');
    }
  };

  const handleCloseTab = (path: string) => {
    const nextTabs = openTabs.filter((tab) => tab !== path);
    setOpenTabs(nextTabs);
    if (activeFilePath === path) {
      setActiveFilePath(nextTabs[nextTabs.length - 1] || '');
    }
  };

  const handleUpdateContent = (path: string, newContent: string) => {
    setFiles((prev) => {
      const file = prev[path];
      if (!file) return prev;
      return {
        ...prev,
        [path]: {
          ...file,
          content: newContent,
          lastModified: Date.now(),
        },
      };
    });
  };

  const handleCreateFile = (path: string) => {
    const normalized = normalizePath(path);
    if (files[normalized]) {
      triggerAlert('File Already Exists', t.fileAlreadyExists, 'warning');
      return;
    }
    const newFile: VFile = {
      path: normalized,
      name: getFileName(normalized),
      content: '',
      isBinary: false,
      size: 0,
      lastModified: Date.now(),
    };
    setFiles((prev) => ({ ...prev, [normalized]: newFile }));
    handleSelectFile(normalized);
    addGitLog(`Created new file: ${normalized}`);
  };

  const handleCreateFolder = (path: string) => {
    const normalized = normalizePath(path);
    const placeholder = `${normalized}/.gitkeep`;
    handleCreateFile(placeholder);
  };

  const handleDeleteNode = (path: string) => {
    setFiles((prev) => {
      const updated = { ...prev };
      for (const k of Object.keys(updated)) {
        if (k === path || k.startsWith(`${path}/`)) {
          delete updated[k];
        }
      }
      return updated;
    });
    setOpenTabs((prev) => prev.filter((p) => p !== path && !p.startsWith(`${path}/`)));
    if (activeFilePath === path || activeFilePath.startsWith(`${path}/`)) {
      setActiveFilePath(openTabs[0] || '');
    }
    addGitLog(`Deleted: ${path}`);
  };

  const handleRenameNode = (oldPath: string, newPath: string) => {
    const normOld = normalizePath(oldPath);
    const normNew = normalizePath(newPath);
    if (!normNew || normOld === normNew) return;

    if (files[normNew]) {
      triggerAlert('File Already Exists', t.fileAlreadyExists, 'warning');
      return;
    }

    setFiles((prev) => {
      const updated = { ...prev };
      if (updated[normOld]) {
        const file = updated[normOld];
        delete updated[normOld];
        updated[normNew] = {
          ...file,
          path: normNew,
          name: getFileName(normNew),
          lastModified: Date.now(),
        };
      } else {
        const prefix = `${normOld}/`;
        for (const [key, file] of Object.entries(updated)) {
          if (key.startsWith(prefix)) {
            const suffix = key.slice(prefix.length);
            const renamedKey = `${normNew}/${suffix}`;
            delete updated[key];
            updated[renamedKey] = {
              ...file,
              path: renamedKey,
              name: getFileName(renamedKey),
              lastModified: Date.now(),
            };
          }
        }
      }
      return updated;
    });

    setOpenTabs((prev) =>
      prev.map((tab) => {
        if (tab === normOld) return normNew;
        if (tab.startsWith(`${normOld}/`)) {
          return `${normNew}/${tab.slice(normOld.length + 1)}`;
        }
        return tab;
      })
    );

    setActiveFilePath((curr) => {
      if (curr === normOld) return normNew;
      if (curr.startsWith(`${normOld}/`)) {
        return `${normNew}/${curr.slice(normOld.length + 1)}`;
      }
      return curr;
    });

    addGitLog(`Renamed "${normOld}" to "${normNew}".`);
  };

  // Search in Code Handlers
  const handleSelectSearchResult = (filePath: string, lineNumber: number) => {
    handleSelectFile(filePath);
    setTargetSearchLine(lineNumber);
    if (isMobile) {
      setMobileTab('editor');
    }
  };

  const handleReplaceAllInCode = (
    searchQuery: string,
    replaceQuery: string,
    caseSensitive: boolean,
    isRegex: boolean
  ) => {
    let regex: RegExp;
    try {
      const pattern = isRegex ? searchQuery : searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
    } catch {
      triggerAlert('Invalid Search Pattern', t.invalidRegex, 'error');
      return;
    }

    let totalReplaced = 0;
    const updatedFiles = { ...files };

    for (const [path, file] of Object.entries(updatedFiles)) {
      if (file.isBinary) continue;
      const matches = file.content.match(regex);
      if (matches) {
        totalReplaced += matches.length;
        updatedFiles[path] = {
          ...file,
          content: file.content.replace(regex, replaceQuery),
          lastModified: Date.now(),
        };
      }
    }

    setFiles(updatedFiles);
    addGitLog(`Search & Replace: replaced ${totalReplaced} occurrences in code.`);
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        type: 'info',
        message: `Search & Replace: replaced ${totalReplaced} occurrences of "${searchQuery}" with "${replaceQuery}".`,
        timestamp: Date.now(),
      },
    ]);
  };

  // Preview console messages
  const handlePreviewConsole = (type: 'log' | 'warn' | 'error' | 'info', message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        type,
        message,
        timestamp: Date.now(),
      },
    ]);
  };

  const tree = useMemo(() => buildFileTree(files), [files]);

  // Session Recovery Modal component (shared desktop/mobile)
  const sessionRecoveryModal = (
    <AnimatedSessionRecoveryModal
      pendingSession={pendingSession}
      backupBeforeRestore={backupBeforeRestore}
      onBackupChange={setBackupBeforeRestore}
      onRestore={handleRestoreSession}
      onDiscard={handleDiscardSession}
      t={t}
    />
  );

  // In-UI Alert & Notification Dialog (Material 3 Expressive, replacing external browser alert)
  const inUiAlertModal = (
    <AnimatedInUiAlertModal
      alert={inUiAlert}
      onClose={() => setInUiAlert(null)}
      t={t}
    />
  );

  // Full-Screen Drag and Drop Overlay
  const dragOverlay = isDragOver ? (
    <div className="fixed inset-0 z-50 pointer-events-none bg-[#001d3d]/85 backdrop-blur-md flex flex-col items-center justify-center p-6 border-4 border-dashed border-[#a8c7fa] m3-dialog-smooth text-white select-none">
      <div className="w-20 h-20 rounded-full bg-[#00468b]/70 border-2 border-[#a8c7fa] flex items-center justify-center text-[#a8c7fa] mb-4 shadow-2xl animate-pulse">
        <M3Icon name="folder_zip" size={42} />
      </div>
      <h2 className="text-xl font-bold mb-2 text-[#a8c7fa]">{t.dragFolderNotice}</h2>
      <p className="text-xs text-[#c4c6d0] max-w-sm text-center leading-relaxed">
        {t.clearWorkspaceDesc}
      </p>
    </div>
  ) : null;

  // -----------------------------------------------------------------
  // DEDICATED MOBILE USER INTERFACE
  // -----------------------------------------------------------------
  if (isMobile) {
    return (
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] flex flex-col bg-[#f8fafd] dark:bg-[#121316] text-[#191c20] dark:text-[#e2e2e6] overflow-hidden select-none"
      >
        {/* Mobile Top Header */}
        <header className="h-12 px-3 bg-white dark:bg-[#1e1f22] border-b border-[#d8dae5] dark:border-[#43474e]/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 truncate">
            <M3Icon name="folder_zip" size={20} className="text-[#0b57d0] dark:text-[#a8c7fa]" />
            <span className="font-bold text-xs text-[#0b57d0] dark:text-[#a8c7fa]">{t.appName}</span>
            <span className="text-[#d8dae5] dark:text-[#43474e]">/</span>
            <span className="text-[11px] font-mono text-[#191c20] dark:text-white truncate max-w-[100px]">
              {selectedRepo?.name || 'repo'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Settings Screen Trigger Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-8 h-8 rounded-xl bg-[#f0f2f8] dark:bg-[#2b2d30] hover:bg-[#e4e7ef] dark:hover:bg-[#383a3e] border border-[#d8dae5] dark:border-[#43474e]/50 text-[#191c20] dark:text-[#e2e2e6] flex items-center justify-center cursor-pointer transition-colors shadow-xs"
              title={t.settingsLabel}
            >
              <M3Icon name="settings" size={17} className="text-[#0b57d0] dark:text-[#a8c7fa]" />
            </button>

            {/* Live Collab Trigger Button */}
            <button
              onClick={() => setIsCollabModalOpen(true)}
              className="px-2 py-1 rounded-xl bg-[#f0f2f8] dark:bg-[#2b2d30] hover:bg-[#e4e7ef] dark:hover:bg-[#383a3e] border border-[#d8dae5] dark:border-[#43474e]/50 text-[11px] text-[#191c20] dark:text-[#e2e2e6] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              title={t.liveCollaboration}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${collabConnected ? 'bg-[#3ddc84] animate-pulse' : 'bg-[#ff5449]'}`} />
              <M3Icon name="group" size={13} className="text-[#0b57d0] dark:text-[#a8c7fa]" />
              {collabPeers.length > 0 && (
                <span className="font-mono text-[10px] text-[#0b57d0] dark:text-[#a8c7fa]">+{collabPeers.length}</span>
              )}
            </button>


            {/* Quick Commit Button */}
            <button
              onClick={() => setMobileTab('git')}
              className="px-2.5 py-1 rounded-lg bg-[#0b57d0] hover:bg-[#0842a0] text-white border border-[#0b57d0] text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
            >
              <M3Icon name="cloud_upload" size={14} className="text-white" />
              <span className="text-white">{t.commit}</span>
            </button>
          </div>
        </header>

        {/* Mobile Main Body View (Instant Tab Switching via Preserved Mounting) */}
        <main className="flex-1 min-h-0 overflow-hidden relative flex flex-col">
          <div className={`flex-1 w-full h-full overflow-y-auto flex flex-col ${mobileTab === 'files' ? '' : 'hidden'}`}>
            <Sidebar
              tree={tree}
              activeFilePath={activeFilePath}
              files={files}
              t={t}
              onSelectFile={handleSelectFile}
              onUploadZip={handleUploadZip}
              onExportZip={handleExportZip}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onDeleteNode={handleDeleteNode}
              onRenameNode={handleRenameNode}
            />
          </div>

          <div className={`flex-1 w-full h-full overflow-hidden flex flex-col ${mobileTab === 'editor' ? '' : 'hidden'}`}>
            <Editor
              openTabs={openTabs}
              activeFilePath={activeFilePath}
              files={files}
              t={t}
              currentLang={currentLang}
              settings={settings}
              onSelectTab={setActiveFilePath}
              onCloseTab={handleCloseTab}
              onUpdateContent={handleUpdateContent}
              onSaveFile={() => addGitLog(`Saved file: ${activeFilePath}`)}
              onFindInFiles={() => setMobileTab('search')}
              targetLine={targetSearchLine}
            />
          </div>

          <div className={`flex-1 w-full h-full overflow-hidden flex flex-col ${mobileTab === 'preview' ? '' : 'hidden'}`}>
            <Preview
              files={files}
              activeFile={files[activeFilePath] || null}
              activeFilePath={activeFilePath}
              t={t}
              onConsoleMessage={handlePreviewConsole}
            />
          </div>

          <div className={`flex-1 w-full h-full overflow-hidden flex flex-col ${mobileTab === 'search' ? '' : 'hidden'}`}>
            <SearchPanel
              files={files}
              t={t}
              onSelectResult={handleSelectSearchResult}
              onReplaceAll={handleReplaceAllInCode}
              onClose={() => setMobileTab('editor')}
            />
          </div>

          <div className={`flex-1 w-full h-full overflow-hidden flex flex-col ${mobileTab === 'git' ? '' : 'hidden'}`}>
            <GitHubPanel
              isAuthenticated={isAuthenticated}
              user={githubUser}
              repos={repos}
              selectedRepo={selectedRepo}
              branches={branches}
              activeBranch={activeBranch}
              diffs={diffs}
              commits={commits}
              pullRequests={pullRequests}
              oauthConfigured={oauthConfigured}
              callbackUrl={callbackUrl}
              t={t}
              isCleanZipImport={isCleanZipImport}
              isLoadingRepo={isLoadingRepo}
              repoLoadProgress={repoLoadProgress}
              onConnectOAuth={handleConnectOAuth}
              onConnectToken={handleConnectToken}
              onDisconnect={handleDisconnect}
              onSelectRepo={handleSelectRepo}
              onLoadRepoFiles={handleLoadRepoFilesExplicit}
              onCreateRepo={handleCreateRepo}
              onSwitchBranch={handleSwitchBranch}
              onCreateBranch={handleCreateBranch}
              onCommitAndPush={handleCommitAndPush}
              onRefreshCommits={handleRefreshCommits}
              onCreatePullRequest={handleCreatePullRequest}
              onSubmitPRReview={handleSubmitPRReview}
              onGitReset={handleGitReset}
            />
          </div>

          <div className={`flex-1 w-full h-full overflow-hidden flex flex-col ${mobileTab === 'terminal' ? '' : 'hidden'}`}>
            <Terminal
              files={files}
              logs={logs}
              gitLogs={gitLogs}
              activeBranch={activeBranch}
              branches={branches}
              commits={commits}
              onClearLogs={() => setLogs([])}
              onClearGitLogs={() => setGitLogs([])}
              onClose={() => setMobileTab('editor')}
              onGitReset={handleGitReset}
              t={t}
              isMobile={true}
            />
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav
          className="bg-white dark:bg-[#1e1f22] border-t border-[#d8dae5] dark:border-[#43474e]/40 flex items-center justify-around shrink-0 px-1 z-30 shadow-lg"
          style={{
            height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <button
            onClick={() => setMobileTab('files')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-colors ${
              mobileTab === 'files' ? 'text-[#0b57d0] dark:text-[#a8c7fa] font-semibold' : 'text-[#5d6168] dark:text-[#8e9199]'
            }`}
          >
            <M3Icon name="folder_zip" size={20} />
            <span className="text-[10px] mt-0.5">{t.explorer}</span>
          </button>

          <button
            onClick={() => setMobileTab('editor')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-colors ${
              mobileTab === 'editor' ? 'text-[#0b57d0] dark:text-[#a8c7fa] font-semibold' : 'text-[#5d6168] dark:text-[#8e9199]'
            }`}
          >
            <M3Icon name="code" size={20} />
            <span className="text-[10px] mt-0.5">{t.editor}</span>
          </button>

          <button
            onClick={() => setMobileTab('preview')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-colors ${
              mobileTab === 'preview' ? 'text-[#0b57d0] dark:text-[#a8c7fa] font-semibold' : 'text-[#5d6168] dark:text-[#8e9199]'
            }`}
          >
            <M3Icon name="visibility" size={20} />
            <span className="text-[10px] mt-0.5">{t.preview}</span>
          </button>

          <button
            onClick={() => setMobileTab('search')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-colors ${
              mobileTab === 'search' ? 'text-[#0b57d0] dark:text-[#a8c7fa] font-semibold' : 'text-[#5d6168] dark:text-[#8e9199]'
            }`}
          >
            <M3Icon name="search" size={20} />
            <span className="text-[10px] mt-0.5">{t.search}</span>
          </button>

          <button
            onClick={() => setMobileTab('git')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-colors relative ${
              mobileTab === 'git' ? 'text-[#0b57d0] dark:text-[#a8c7fa] font-semibold' : 'text-[#5d6168] dark:text-[#8e9199]'
            }`}
          >
            <M3Icon name="sync" size={20} />
            <span className="text-[10px] mt-0.5">{t.sourceControl}</span>
            {diffs.length > 0 && (
              <span className="absolute top-1 right-3 w-4 h-4 rounded-full bg-[#0b57d0] dark:bg-[#a8c7fa] text-white dark:text-[#003062] font-bold text-[9px] flex items-center justify-center">
                {diffs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileTab('terminal')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-colors ${
              mobileTab === 'terminal' ? 'text-[#0b57d0] dark:text-[#a8c7fa] font-semibold' : 'text-[#5d6168] dark:text-[#8e9199]'
            }`}
          >
            <M3Icon name="terminal" size={20} />
            <span className="text-[10px] mt-0.5">{t.terminal}</span>
          </button>
        </nav>

        {sessionRecoveryModal}
        {inUiAlertModal}

        {/* Live Real-Time Collaboration Modal */}
        <CollabModal
          isOpen={isCollabModalOpen}
          onClose={() => setIsCollabModalOpen(false)}
          t={t}
        />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={(newSettings) => setSettings((prev) => ({ ...prev, ...newSettings }))}
          onResetWorkspace={handleResetWorkspace}
          currentLang={currentLang}
          onLanguageChange={handleLanguageChange}
          fileCount={Object.keys(files).length}
          t={t}
          selectedRepo={selectedRepo}
          activeBranch={activeBranch}
          isAuthenticated={isAuthenticated}
          onCreateRepo={handleCreateRepo}
        />

        {dragOverlay}
      </div>
    );
  }

  // -----------------------------------------------------------------
  // DESKTOP FULL-FEATURED IDE
  // -----------------------------------------------------------------
  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="h-screen w-screen flex flex-col bg-[#f8fafd] dark:bg-[#121316] text-[#191c20] dark:text-[#e2e2e6] overflow-hidden select-none"
    >
      {/* Top VS Code Style Menu Bar */}
      <header className="h-9 px-3 bg-white dark:bg-[#1e1f22] border-b border-[#d8dae5] dark:border-[#43474e]/40 flex items-center justify-between shrink-0 text-xs">
        {/* Left: Branding & Breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold tracking-wide text-[#0b57d0] dark:text-[#a8c7fa]">
            <M3Icon name="folder_zip" size={18} />
            <span>{t.appName}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[#74777f] dark:text-[#8e9199]">
            <span>/</span>
            <span className="text-[#191c20] dark:text-white font-mono">{selectedRepo?.name || 'local-workspace'}</span>
            <span>/</span>
            <span className="text-[#0b57d0] dark:text-[#a8c7fa] font-mono text-[11px] bg-[#f0f4f9] dark:bg-[#121316] px-1.5 py-0.5 rounded border border-[#d8dae5] dark:border-[#43474e]/40 font-semibold">
              {activeBranch}
            </span>
          </div>
        </div>

        {/* Center: Quick View Mode Toggles */}
        <div className="flex items-center bg-[#f0f2f8] dark:bg-[#121316] rounded-lg p-0.5 border border-[#d8dae5] dark:border-[#43474e]/40">
          <button
            title={t.codeOnly}
            onClick={() => setViewMode('code')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              viewMode === 'code' ? 'bg-white dark:bg-[#2b2d30] text-[#0b57d0] dark:text-[#a8c7fa] shadow-xs' : 'text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white'
            }`}
          >
            <M3Icon name="code" size={14} />
            <span>{t.code}</span>
          </button>
          <button
            title={t.splitEditorPreview}
            onClick={() => setViewMode('split')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              viewMode === 'split' ? 'bg-white dark:bg-[#2b2d30] text-[#0b57d0] dark:text-[#a8c7fa] shadow-xs' : 'text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white'
            }`}
          >
            <M3Icon name="vertical_split" size={14} />
            <span>{t.splitView}</span>
          </button>
          <button
            title={t.previewOnly}
            onClick={() => setViewMode('preview')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              viewMode === 'preview' ? 'bg-white dark:bg-[#2b2d30] text-[#0b57d0] dark:text-[#a8c7fa] shadow-xs' : 'text-[#5d6168] dark:text-[#8e9199] hover:text-[#191c20] dark:hover:text-white'
            }`}
          >
            <M3Icon name="visibility" size={14} />
            <span>{t.preview}</span>
          </button>
        </div>

        {/* Right: Actions, Language & Status */}
        <div className="flex items-center gap-2">
          {/* Live Real-Time Collaboration Button */}
          <button
            onClick={() => setIsCollabModalOpen(true)}
            className="px-2.5 py-1 rounded-xl bg-[#f0f2f8] dark:bg-[#1e1f22] hover:bg-[#e4e7ef] dark:hover:bg-[#2b2d30] border border-[#d8dae5] dark:border-[#43474e]/50 text-xs text-[#191c20] dark:text-[#e2e2e6] flex items-center gap-2 transition-colors cursor-pointer"
            title={t.liveCollaboration}
          >
            <span className={`w-2 h-2 rounded-full ${collabConnected ? 'bg-[#3ddc84] animate-pulse' : 'bg-[#ff5449]'}`} />
            <M3Icon name="group" size={15} className="text-[#0b57d0] dark:text-[#a8c7fa]" />
            <span className="font-semibold hidden md:inline">{t.collabTab}</span>
            {collabPeers.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#d3e3fd] dark:bg-[#00468b] text-[#041e49] dark:text-[#d6e3ff] font-mono text-[10px] font-bold">
                +{collabPeers.length}
              </span>
            )}
          </button>


          {/* Settings Button */}
          <button
            title={t.settingsLabel}
            onClick={() => setIsSettingsOpen(true)}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1 text-[11px] text-[#5d6168] dark:text-[#8e9199] hover:text-[#0b57d0] dark:hover:text-[#a8c7fa]"
          >
            <M3Icon name="settings" size={16} />
            <span className="hidden sm:inline">{t.settingsLabel}</span>
          </button>

          {/* Terminal Toggle Button */}
          <button
            title={showTerminal ? t.hideTerminal : t.showTerminal}
            onClick={() => setShowTerminal(!showTerminal)}
            className={`p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1 text-[11px] ${
              showTerminal ? 'text-[#0b57d0] dark:text-[#a8c7fa]' : 'text-[#5d6168] dark:text-[#8e9199]'
            }`}
          >
            <M3Icon name="terminal" size={16} />
            <span className="hidden sm:inline">{t.terminal}</span>
          </button>

          {/* GitHub Connection Badge */}
          {isAuthenticated ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00468b]/30 border border-[#a8c7fa]/30 text-[11px] text-[#a8c7fa]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#b4f3b7]" />
              <span className="font-mono">@{githubUser?.login}</span>
            </div>
          ) : (
            <button
              onClick={() => setActivePanel('git')}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2b2d30] hover:bg-[#35383d] text-[11px] text-white border border-[#43474e]/50 cursor-pointer"
            >
              <M3Icon name="account_circle" size={14} className="text-[#a8c7fa]" />
              <span>{t.connectGitHub}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main IDE Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left VS Code Activity Bar */}
        <nav className="w-12 bg-[#121316] border-r border-[#43474e]/30 flex flex-col items-center py-2 shrink-0 select-none">
          {/* Explorer Tab */}
          <button
            aria-label={t.explorer}
            title={t.explorer}
            onClick={() => setActivePanel(activePanel === 'explorer' ? null : 'explorer')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1 transition-colors cursor-pointer relative ${
              activePanel === 'explorer'
                ? 'bg-[#2b2d30] text-[#a8c7fa] border-l-2 border-[#a8c7fa]'
                : 'text-[#8e9199] hover:text-white hover:bg-white/5'
            }`}
          >
            <M3Icon name="folder_zip" size={22} />
          </button>

          {/* Search in Code Tab */}
          <button
            aria-label={t.search}
            title={t.search}
            onClick={() => setActivePanel(activePanel === 'search' ? null : 'search')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1 transition-colors cursor-pointer relative ${
              activePanel === 'search'
                ? 'bg-[#2b2d30] text-[#a8c7fa] border-l-2 border-[#a8c7fa]'
                : 'text-[#8e9199] hover:text-white hover:bg-white/5'
            }`}
          >
            <M3Icon name="search" size={22} />
          </button>

          {/* GitHub / Version Control Tab */}
          <button
            aria-label={t.sourceControl}
            title={t.sourceControl}
            onClick={() => setActivePanel(activePanel === 'git' ? null : 'git')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1 transition-colors cursor-pointer relative ${
              activePanel === 'git'
                ? 'bg-[#2b2d30] text-[#a8c7fa] border-l-2 border-[#a8c7fa]'
                : 'text-[#8e9199] hover:text-white hover:bg-white/5'
            }`}
          >
            <M3Icon name="sync" size={22} />
            {diffs.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#a8c7fa] text-[#003062] font-bold text-[9px] flex items-center justify-center">
                {diffs.length}
              </span>
            )}
          </button>

          {/* Settings Button at bottom of Activity Bar */}
          <div className="mt-auto flex flex-col items-center gap-1 mb-2">
            <button
              aria-label="Settings"
              title="IDE Settings"
              onClick={() => setIsSettingsOpen(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[#8e9199] hover:text-[#a8c7fa] hover:bg-white/5 transition-colors cursor-pointer"
            >
              <M3Icon name="settings" size={22} />
            </button>
          </div>
        </nav>

        {/* Collapsible & Mouse Resizable Sidebar Content Area */}
        {activePanel && (
          <div
            style={{ width: `${sidebarWidth}px` }}
            className="h-full relative shrink-0 flex flex-col overflow-hidden select-none bg-[#18191c]"
          >
            {activePanel === 'explorer' && (
              <Sidebar
                tree={tree}
                activeFilePath={activeFilePath}
                files={files}
                t={t}
                onSelectFile={handleSelectFile}
                onUploadZip={handleUploadZip}
                onExportZip={handleExportZip}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                onDeleteNode={handleDeleteNode}
                onRenameNode={handleRenameNode}
              />
            )}

            {activePanel === 'search' && (
              <SearchPanel
                files={files}
                t={t}
                onSelectResult={handleSelectSearchResult}
                onReplaceAll={handleReplaceAllInCode}
                onClose={() => setActivePanel(null)}
              />
            )}

            {activePanel === 'git' && (
              <GitHubPanel
                isAuthenticated={isAuthenticated}
                user={githubUser}
                repos={repos}
                selectedRepo={selectedRepo}
                branches={branches}
                activeBranch={activeBranch}
                diffs={diffs}
                commits={commits}
                pullRequests={pullRequests}
                oauthConfigured={oauthConfigured}
                callbackUrl={callbackUrl}
                t={t}
                isCleanZipImport={isCleanZipImport}
                isLoadingRepo={isLoadingRepo}
                repoLoadProgress={repoLoadProgress}
                onConnectOAuth={handleConnectOAuth}
                onConnectToken={handleConnectToken}
                onDisconnect={handleDisconnect}
                onSelectRepo={handleSelectRepo}
                onLoadRepoFiles={handleLoadRepoFilesExplicit}
                onCreateRepo={handleCreateRepo}
                onSwitchBranch={handleSwitchBranch}
                onCreateBranch={handleCreateBranch}
                onCommitAndPush={handleCommitAndPush}
                onRefreshCommits={handleRefreshCommits}
                onCreatePullRequest={handleCreatePullRequest}
                onSubmitPRReview={handleSubmitPRReview}
                onGitReset={handleGitReset}
              />
            )}

            {/* Mouse Drag Resize Handle for Sidebar */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDragging('sidebar');
              }}
              onDoubleClick={() => setSidebarWidth(270)}
              title={t.resizeSidebar}
              className="absolute top-0 -right-1 bottom-0 w-2.5 hover:bg-[#a8c7fa]/50 cursor-col-resize z-20 group transition-colors flex items-center justify-center"
            >
              <div className="w-0.5 h-8 rounded-full bg-[#43474e]/60 group-hover:bg-[#a8c7fa] group-active:bg-[#a8c7fa] transition-colors" />
            </div>
          </div>
        )}

        {/* Central Workspace (Editor, Resizer, Preview, and Terminal) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div ref={centralWorkspaceRef} className="flex-1 flex overflow-hidden relative">
            {/* Editor Pane (Code Viewer) */}
            {(viewMode === 'code' || viewMode === 'split') && (
              <div
                style={{
                  width: viewMode === 'split' ? `${splitRatio}%` : '100%',
                }}
                className="h-full overflow-hidden flex flex-col"
              >
                <Editor
                  openTabs={openTabs}
                  activeFilePath={activeFilePath}
                  files={files}
                  t={t}
                  currentLang={currentLang}
                  settings={settings}
                  onSelectTab={setActiveFilePath}
                  onCloseTab={handleCloseTab}
                  onUpdateContent={handleUpdateContent}
                  onSaveFile={() => addGitLog(`Saved file: ${activeFilePath}`)}
                  onFindInFiles={() => setActivePanel('search')}
                  targetLine={targetSearchLine}
                  isMaximized={viewMode === 'code'}
                  onMaximize={() => setViewMode(viewMode === 'code' ? 'split' : 'code')}
                />
              </div>
            )}

            {/* Vertical Splitter Resizer Handle between Editor and Preview */}
            {viewMode === 'split' && (
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsDragging('splitter');
                }}
                onDoubleClick={() => setSplitRatio(50)}
                title={`${t.resizeSplitter} (${t.resetSplit})`}
                className="w-2.5 hover:w-3 -mx-1 bg-[#1e1f22] border-x border-[#43474e]/30 hover:bg-[#a8c7fa]/50 active:bg-[#a8c7fa] cursor-col-resize z-20 flex items-center justify-center group transition-colors"
              >
                <div className="w-0.5 h-10 rounded-full bg-[#43474e] group-hover:bg-[#a8c7fa] group-active:bg-[#a8c7fa] transition-colors" />
              </div>
            )}

            {/* Live Preview Pane (Markdown, SVG, Vector XML, and HTML Viewer) */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div
                style={{
                  width: viewMode === 'split' ? `${100 - splitRatio}%` : '100%',
                }}
                className="h-full overflow-hidden flex flex-col"
              >
                <Preview
                  files={files}
                  activeFile={files[activeFilePath] || null}
                  activeFilePath={activeFilePath}
                  t={t}
                  onConsoleMessage={handlePreviewConsole}
                  isMaximized={viewMode === 'preview'}
                  onMaximize={() => setViewMode(viewMode === 'preview' ? 'split' : 'preview')}
                />
              </div>
            )}
          </div>

          {/* Bottom VS Code Terminal Dock with Mouse Drag Resize & Controls */}
          {showTerminal && (
            <Terminal
              files={files}
              logs={logs}
              gitLogs={gitLogs}
              activeBranch={activeBranch}
              branches={branches}
              commits={commits}
              onClearLogs={() => setLogs([])}
              onClearGitLogs={() => setGitLogs([])}
              onClose={() => setShowTerminal(false)}
              onGitReset={handleGitReset}
              t={t}
              height={terminalHeight}
              onResizeStart={(e) => {
                e.preventDefault();
                setIsDragging('terminal');
              }}
              isMaximized={terminalMaximized}
              onToggleMaximize={() => setTerminalMaximized(!terminalMaximized)}
              onMinimize={() => setShowTerminal(false)}
            />
          )}
        </div>
      </div>

      {sessionRecoveryModal}
      {inUiAlertModal}

      {/* Live Real-Time Collaboration Modal */}
      <CollabModal
        isOpen={isCollabModalOpen}
        onClose={() => setIsCollabModalOpen(false)}
        t={t}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings((prev) => ({ ...prev, ...newSettings }))}
        onResetWorkspace={handleResetWorkspace}
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        fileCount={Object.keys(files).length}
        t={t}
        selectedRepo={selectedRepo}
        activeBranch={activeBranch}
        isAuthenticated={isAuthenticated}
        onCreateRepo={handleCreateRepo}
      />

      {dragOverlay}
    </div>
  );
}

// -----------------------------------------------------------------
// ANIMATED DIALOG COMPONENTS (Fluid Material 3 Enter & Exit Transitions)
// -----------------------------------------------------------------

function AnimatedSessionRecoveryModal({
  pendingSession,
  backupBeforeRestore,
  onBackupChange,
  onRestore,
  onDiscard,
  t,
}: {
  pendingSession: SavedSession | null;
  backupBeforeRestore: boolean;
  onBackupChange: (val: boolean) => void;
  onRestore: () => void;
  onDiscard: () => void;
  t: any;
}) {
  const { isRendered, backdropClass, dialogClass, triggerClose } = useDialogAnimation(
    Boolean(pendingSession),
    onDiscard
  );
  if (!isRendered || !pendingSession) return null;

  return (
    <div
      onClick={triggerClose}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 ${backdropClass}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-[#1e1f22] border border-[#d8dae5] dark:border-[#a8c7fa]/40 rounded-2xl p-5 max-w-md w-full shadow-2xl ${dialogClass}`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#d3e3fd] text-[#041e49] dark:bg-[#00468b]/30 dark:text-[#a8c7fa] flex items-center justify-center shrink-0">
            <M3Icon name="history" size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#191c20] dark:text-white">{t.restoreSessionTitle}</h3>
            <p className="text-xs text-[#5d6168] dark:text-[#8e9199]">
              {t.restoreSessionDesc}
            </p>
          </div>
        </div>

        <div className="bg-[#f8fafd] dark:bg-[#121316] rounded-xl p-3 border border-[#d8dae5] dark:border-[#43474e]/40 my-3 text-xs space-y-1.5 text-[#191c20] dark:text-[#c4c6d0]">
          <div className="flex justify-between">
            <span className="text-[#5d6168] dark:text-[#8e9199]">Workspace:</span>
            <span className="font-mono text-[#191c20] dark:text-white truncate max-w-[200px]">
              {pendingSession.repoName || 'Local Project'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5d6168] dark:text-[#8e9199]">{t.fileCountLabel}:</span>
            <span className="font-mono text-[#0b57d0] dark:text-[#a8c7fa] font-semibold">
              {Object.keys(pendingSession.files).length} files
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5d6168] dark:text-[#8e9199]">{t.lastModified}:</span>
            <span className="font-mono text-[#74777f] dark:text-[#8e9199]">
              {new Date(pendingSession.savedAt).toLocaleTimeString()} ({new Date(pendingSession.savedAt).toLocaleDateString()})
            </span>
          </div>
        </div>

        <div className="bg-[#f8fafd] dark:bg-[#121316] p-3 rounded-xl border border-[#d8dae5] dark:border-[#43474e]/40 my-3">
          <M3Switch
            selected={backupBeforeRestore}
            onChange={onBackupChange}
            label="Backup current workspace"
            sublabel="Preserve existing files before applying restored session"
          />
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <M3Button variant="text" size="sm" onClick={triggerClose}>
            {t.startFresh}
          </M3Button>
          <M3Button
            variant="filled"
            size="sm"
            icon="restore"
            onClick={() => {
              triggerClose();
              onRestore();
            }}
          >
            {t.restoreSession}
          </M3Button>
        </div>
      </div>
    </div>
  );
}

function AnimatedInUiAlertModal({
  alert,
  onClose,
  t,
}: {
  alert: { title: string; message: string; type?: 'info' | 'warning' | 'error' | 'success' } | null;
  onClose: () => void;
  t: any;
}) {
  const { isRendered, backdropClass, dialogClass, triggerClose } = useDialogAnimation(
    Boolean(alert),
    onClose
  );
  if (!isRendered || !alert) return null;

  return (
    <div
      onClick={triggerClose}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 ${backdropClass}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-[#1e1f22] border border-[#d8dae5] dark:border-[#a8c7fa]/40 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-3 ${dialogClass}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              alert.type === 'error'
                ? 'bg-[#ffdad6] text-[#ba1a1a] dark:bg-[#690005]/40 dark:border dark:border-[#ff8585]/40 dark:text-[#ff8585]'
                : alert.type === 'warning'
                ? 'bg-[#ffdf99] text-[#7e5700] dark:bg-[#e09b00]/30 dark:border dark:border-[#ffd54f]/40 dark:text-[#ffd54f]'
                : alert.type === 'success'
                ? 'bg-[#c4eed0] text-[#0a6640] dark:bg-[#1b5e20]/40 dark:border dark:border-[#b4f3b7]/40 dark:text-[#b4f3b7]'
                : 'bg-[#d3e3fd] text-[#041e49] dark:bg-[#00468b]/40 dark:border dark:border-[#a8c7fa]/40 dark:text-[#a8c7fa]'
            }`}
          >
            <M3Icon
              name={
                alert.type === 'error'
                  ? 'error'
                  : alert.type === 'warning'
                  ? 'warning'
                  : alert.type === 'success'
                  ? 'check_circle'
                  : 'info'
              }
              size={24}
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#191c20] dark:text-white">{alert.title}</h3>
            <p className="text-xs text-[#5d6168] dark:text-[#8e9199] mt-0.5">ZipStudio Notice</p>
          </div>
        </div>

        <p className="text-xs text-[#44474e] dark:text-[#c4c6d0] leading-relaxed whitespace-pre-wrap">
          {alert.message}
        </p>

        <div className="flex justify-end pt-2">
          <M3Button
            variant="filled"
            size="sm"
            onClick={triggerClose}
          >
            {t.close || 'OK'}
          </M3Button>
        </div>
      </div>
    </div>
  );
}
