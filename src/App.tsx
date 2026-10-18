/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from './utils/gitService';
import { STARTER_TEMPLATES, StarterTemplate } from './utils/starterTemplates';
import { SupportedLanguage, TRANSLATIONS } from './utils/i18n';
import { M3Icon } from './components/M3Components';
import { Sidebar } from './components/Sidebar';
import { SearchPanel } from './components/SearchPanel';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { Terminal, ConsoleLogEntry } from './components/Terminal';
import { GitHubPanel } from './components/GitHubPanel';

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

  // File System State
  const defaultTemplate = STARTER_TEMPLATES[0];
  const [files, setFiles] = useState<Record<string, VFile>>(defaultTemplate.files);
  const [baseFiles, setBaseFiles] = useState<Record<string, VFile>>(defaultTemplate.files);
  const [openTabs, setOpenTabs] = useState<string[]>(['index.html', 'style.css', 'app.js']);
  const [activeFilePath, setActiveFilePath] = useState<string>('index.html');
  const [targetSearchLine, setTargetSearchLine] = useState<number | undefined>(undefined);

  // Clean zip import overwrite flag
  const [isCleanZipImport, setIsCleanZipImport] = useState(false);

  // Loading GitHub repo files state
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);

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

  // Compute file tree and working tree diffs
  const tree = useMemo(() => buildFileTree(files), [files]);
  const diffs = useMemo(() => computeWorkingTreeChanges(baseFiles, files), [baseFiles, files]);

  // Log to Git Output
  const addGitLog = useCallback((msg: string) => {
    setGitLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Check OAuth endpoint configuration and check for saved token
  useEffect(() => {
    fetch('/api/auth/github/url')
      .then((res) => res.json())
      .then((data) => {
        setOauthConfigured(!!data.configured);
        setCallbackUrl(data.redirectUri || '');
      })
      .catch((err) => console.error('OAuth check error:', err));

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
        alert(
          'GitHub OAuth CLIENT_ID is not configured in server environment variables.\n\nPlease enter a GitHub Personal Access Token (PAT) with "repo" scope to connect immediately.'
        );
        return;
      }

      const authWindow = window.open(
        data.url,
        'github_oauth_popup',
        'width=600,height=720,menubar=no,toolbar=no'
      );

      if (!authWindow) {
        alert('Popup was blocked by your browser. Please allow popups to connect your GitHub account.');
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

  // Helper: Load remote repository files directly into editor and preview
  const loadRemoteRepoTree = async (
    client: GitHubApiClient,
    repo: GitHubRepo,
    branch: string
  ) => {
    setIsLoadingRepo(true);
    addGitLog(`Downloading full file tree for ${repo.fullName}@${branch}...`);

    try {
      const [owner, repoName] = repo.fullName.split('/');
      const repoFiles = await client.fetchRepoTree(owner, repoName, branch);
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
    } catch (err: any) {
      addGitLog(`Failed loading repository tree: ${err.message}`);
    } finally {
      setIsLoadingRepo(false);
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

  // Create repository on GitHub
  const handleCreateRepo = async (name: string, description: string, isPrivate: boolean) => {
    if (!githubToken) {
      alert('Please connect your GitHub account first.');
      return;
    }
    try {
      addGitLog(`Creating repository "${name}" on GitHub...`);
      const client = new GitHubApiClient(githubToken);
      const newRepo = await client.createRepo(name, description, isPrivate);
      setRepos((prev) => [newRepo, ...prev]);
      await handleSelectRepo(newRepo);
      addGitLog(`Repository "${newRepo.fullName}" created successfully on GitHub.`);
    } catch (err: any) {
      addGitLog(`Error creating repo: ${err.message}`);
      alert(`Failed to create repository on GitHub: ${err.message}`);
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
    addGitLog(`Switched working branch to '${branchName}'`);

    if (githubToken && selectedRepo) {
      const client = new GitHubApiClient(githubToken);
      await loadRemoteRepoTree(client, selectedRepo, branchName);
    }
  };

  // Create branch on GitHub
  const handleCreateBranch = async (branchName: string) => {
    const cleanName = branchName.trim();
    if (branches.some((b) => b.name === cleanName)) {
      alert('A branch with this name already exists.');
      return;
    }

    if (githubToken && selectedRepo) {
      try {
        const [owner, repoName] = selectedRepo.fullName.split('/');
        addGitLog(`Creating remote branch '${cleanName}' on ${selectedRepo.fullName}...`);
        const client = new GitHubApiClient(githubToken);
        await client.createBranch(owner, repoName, cleanName, activeBranch);
        addGitLog(`Branch '${cleanName}' created successfully on GitHub.`);
      } catch (err: any) {
        addGitLog(`GitHub branch creation note: ${err.message}`);
      }
    }

    const newBranch: GitBranch = {
      name: cleanName,
      isCurrent: true,
      isDefault: false,
      commitSha: 'HEAD',
    };
    setBranches((prev) => [...prev.map((b) => ({ ...b, isCurrent: false })), newBranch]);
    setActiveBranch(cleanName);
  };

  // Commit and Push to real GitHub repo
  const handleCommitAndPush = async (message: string) => {
    if (!githubToken || !selectedRepo) {
      alert('Please connect your GitHub account and select a repository before committing.');
      return;
    }

    const [owner, repoName] = selectedRepo.fullName.split('/');
    addGitLog(
      `Pushing changes to ${selectedRepo.fullName} on branch ${activeBranch} (Clean Overwrite: ${isCleanZipImport ? 'YES' : 'NO'})...`
    );

    try {
      const client = new GitHubApiClient(githubToken);
      const commitSha = await client.commitAndPushFiles(
        owner,
        repoName,
        activeBranch,
        message,
        files,
        isCleanZipImport // When true, completely removes old repo files not in the zip!
      );

      const commit: GitCommit = {
        id: commitSha,
        shortId: commitSha.substring(0, 7),
        message,
        author: {
          name: githubUser?.name || githubUser?.login || 'Developer',
          email: githubUser?.login ? `${githubUser.login}@users.noreply.github.com` : 'dev@zipstudio.local',
          avatarUrl: githubUser?.avatarUrl,
        },
        timestamp: Date.now(),
        branch: activeBranch,
        filesChanged: Object.keys(files).length,
      };

      setCommits((prev) => [commit, ...prev]);
      setBaseFiles({ ...files }); // reset diffs
      setIsCleanZipImport(false); // reset clean overwrite flag

      addGitLog(`Pushed commit ${commit.shortId} to GitHub: ${message}`);
      addGitLog(`Commit URL: https://github.com/${selectedRepo.fullName}/commit/${commitSha}`);
    } catch (err: any) {
      addGitLog(`Commit error: ${err.message}`);
      alert(`GitHub push failed: ${err.message}\nMake sure your token has "repo" write permissions.`);
    }
  };

  // Create Pull Request on real GitHub repo
  const handleCreatePullRequest = async (title: string, head: string, base: string, body: string) => {
    if (!githubToken || !selectedRepo) {
      alert('Please connect your GitHub account and select a repository.');
      return;
    }

    try {
      const [owner, repoName] = selectedRepo.fullName.split('/');
      addGitLog(`Opening Pull Request on ${selectedRepo.fullName} (${head} -> ${base})...`);
      const client = new GitHubApiClient(githubToken);
      const prData = await client.createPullRequest(owner, repoName, title, head, base, body);

      const newPR: PullRequest = {
        id: prData.id,
        number: prData.number,
        title: prData.title,
        description: prData.body || '',
        headBranch: head,
        baseBranch: base,
        state: 'open',
        author: {
          login: prData.user?.login || githubUser?.login || '',
          avatarUrl: prData.user?.avatar_url || githubUser?.avatarUrl || '',
        },
        createdAt: Date.now(),
        reviews: [],
        diffs: [...diffs],
      };

      setPullRequests((prev) => [newPR, ...prev]);
      addGitLog(`Pull Request #${prData.number} successfully opened: ${prData.html_url}`);
    } catch (err: any) {
      addGitLog(`PR creation error: ${err.message}`);
      alert(`Failed to create Pull Request on GitHub: ${err.message}`);
    }
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

  // Handle .ZIP Import directly in browser (CLEAN OVERWRITE)
  const handleUploadZip = async (file: File) => {
    try {
      addGitLog(`Extracting archive "${file.name}" in browser...`);
      const extracted = await extractZipInBrowser(file);
      const count = Object.keys(extracted).length;

      if (count === 0) {
        alert('The uploaded archive appears to be empty or contains no supported files.');
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
      alert(`Failed to extract .zip file: ${err.message}`);
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
      alert(`Failed to export archive: ${err.message}`);
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
    const nextTabs = openTabs.filter((t) => t !== path);
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
      alert('A file with this path already exists.');
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

  const handleLoadTemplate = (template: StarterTemplate) => {
    setFiles(template.files);
    setBaseFiles(template.files);
    setIsCleanZipImport(false);
    const keys = Object.keys(template.files);
    const initial = keys.includes('index.html') ? 'index.html' : keys[0];
    setOpenTabs(keys.slice(0, 3));
    setActiveFilePath(initial);
    addGitLog(`Loaded template "${template.name}".`);
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
      alert('Invalid regular expression.');
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
    addGitLog(`Replaced ${totalReplaced} occurrences across files.`);
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

  // -----------------------------------------------------------------
  // DEDICATED MOBILE USER INTERFACE
  // -----------------------------------------------------------------
  if (isMobile) {
    return (
      <div className="h-screen w-screen flex flex-col bg-[#121316] text-[#e2e2e6] overflow-hidden select-none">
        {/* Mobile Top Header */}
        <header className="h-12 px-3 bg-[#1e1f22] border-b border-[#43474e]/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 truncate">
            <M3Icon name="folder_zip" size={20} className="text-[#a8c7fa]" />
            <span className="font-bold text-xs text-[#a8c7fa]">{t.appName}</span>
            <span className="text-[#43474e]">/</span>
            <span className="text-[11px] font-mono text-white truncate max-w-[100px]">
              {selectedRepo?.name || 'repo'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Language Selector */}
            <select
              value={currentLang}
              onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
              className="bg-[#121316] border border-[#43474e]/50 rounded-lg px-2 py-1 text-[11px] text-[#a8c7fa] focus:outline-none"
            >
              <option value="en">EN</option>
              <option value="zh-CN">中文</option>
              <option value="ms">MY</option>
            </select>

            {/* Quick Commit Button */}
            <button
              onClick={() => setMobileTab('git')}
              className="px-2 py-1 rounded-lg bg-[#00468b]/40 hover:bg-[#00468b]/60 border border-[#a8c7fa]/40 text-[#a8c7fa] text-[11px] font-semibold flex items-center gap-1"
            >
              <M3Icon name="cloud_upload" size={14} />
              <span>{t.commit}</span>
            </button>
          </div>
        </header>

        {/* Mobile Main Body View (Full-Screen View Switching) */}
        <main className="flex-1 overflow-hidden relative flex flex-col">
          {mobileTab === 'files' && (
            <div className="flex-1 w-full h-full overflow-hidden flex flex-col">
              <Sidebar
                tree={tree}
                activeFilePath={activeFilePath}
                onSelectFile={handleSelectFile}
                onUploadZip={handleUploadZip}
                onExportZip={handleExportZip}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                onDeleteNode={handleDeleteNode}
                onRenameNode={() => {}}
                onLoadTemplate={handleLoadTemplate}
                onExplainCode={() => {}}
              />
            </div>
          )}

          {mobileTab === 'editor' && (
            <div className="flex-1 w-full h-full overflow-hidden flex flex-col">
              <Editor
                openTabs={openTabs}
                activeFilePath={activeFilePath}
                files={files}
                onSelectTab={setActiveFilePath}
                onCloseTab={handleCloseTab}
                onUpdateContent={handleUpdateContent}
                onSaveFile={() => addGitLog(`Saved file: ${activeFilePath}`)}
                targetLine={targetSearchLine}
              />
            </div>
          )}

          {mobileTab === 'preview' && (
            <div className="flex-1 w-full h-full overflow-hidden flex flex-col">
              <Preview
                files={files}
                onConsoleMessage={handlePreviewConsole}
              />
            </div>
          )}

          {mobileTab === 'search' && (
            <div className="flex-1 w-full h-full overflow-hidden flex flex-col">
              <SearchPanel
                files={files}
                onSelectResult={handleSelectSearchResult}
                onReplaceAll={handleReplaceAllInCode}
                onClose={() => setMobileTab('editor')}
              />
            </div>
          )}

          {mobileTab === 'git' && (
            <div className="flex-1 w-full h-full overflow-hidden flex flex-col">
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
                onConnectOAuth={handleConnectOAuth}
                onConnectToken={handleConnectToken}
                onDisconnect={handleDisconnect}
                onSelectRepo={handleSelectRepo}
                onLoadRepoFiles={handleLoadRepoFilesExplicit}
                onCreateRepo={handleCreateRepo}
                onSwitchBranch={handleSwitchBranch}
                onCreateBranch={handleCreateBranch}
                onCommitAndPush={handleCommitAndPush}
                onCreatePullRequest={handleCreatePullRequest}
                onSubmitPRReview={handleSubmitPRReview}
              />
            </div>
          )}

          {mobileTab === 'terminal' && (
            <div className="flex-1 w-full h-full overflow-hidden flex flex-col">
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
              />
            </div>
          )}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="h-14 bg-[#1e1f22] border-t border-[#43474e]/40 flex items-center justify-around shrink-0 px-1">
          <button
            onClick={() => setMobileTab('files')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-colors ${
              mobileTab === 'files' ? 'text-[#a8c7fa]' : 'text-[#8e9199]'
            }`}
          >
            <M3Icon name="folder_zip" size={20} />
            <span className="text-[10px] mt-0.5">{t.explorer}</span>
          </button>

          <button
            onClick={() => setMobileTab('editor')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-colors ${
              mobileTab === 'editor' ? 'text-[#a8c7fa]' : 'text-[#8e9199]'
            }`}
          >
            <M3Icon name="code" size={20} />
            <span className="text-[10px] mt-0.5">{t.editor}</span>
          </button>

          <button
            onClick={() => setMobileTab('preview')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-colors ${
              mobileTab === 'preview' ? 'text-[#a8c7fa]' : 'text-[#8e9199]'
            }`}
          >
            <M3Icon name="visibility" size={20} />
            <span className="text-[10px] mt-0.5">{t.preview}</span>
          </button>

          <button
            onClick={() => setMobileTab('search')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-colors ${
              mobileTab === 'search' ? 'text-[#a8c7fa]' : 'text-[#8e9199]'
            }`}
          >
            <M3Icon name="search" size={20} />
            <span className="text-[10px] mt-0.5">{t.search}</span>
          </button>

          <button
            onClick={() => setMobileTab('git')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-colors relative ${
              mobileTab === 'git' ? 'text-[#a8c7fa]' : 'text-[#8e9199]'
            }`}
          >
            <M3Icon name="sync" size={20} />
            <span className="text-[10px] mt-0.5">{t.sourceControl}</span>
            {diffs.length > 0 && (
              <span className="absolute top-1 right-2 w-3.5 h-3.5 rounded-full bg-[#a8c7fa] text-[#003062] font-bold text-[8px] flex items-center justify-center">
                {diffs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileTab('terminal')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-colors ${
              mobileTab === 'terminal' ? 'text-[#a8c7fa]' : 'text-[#8e9199]'
            }`}
          >
            <M3Icon name="terminal" size={20} />
            <span className="text-[10px] mt-0.5">{t.terminal}</span>
          </button>
        </nav>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // DESKTOP FULL-FEATURED USER INTERFACE
  // -----------------------------------------------------------------
  return (
    <div className="h-screen w-screen flex flex-col bg-[#121316] text-[#e2e2e6] overflow-hidden select-none">
      {/* Top Application Bar */}
      <header className="h-11 px-3 bg-[#1e1f22] border-b border-[#43474e]/40 flex items-center justify-between shrink-0">
        {/* Brand & Workspace Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[#a8c7fa] font-bold text-sm">
            <M3Icon name="folder_zip" size={22} className="text-[#a8c7fa]" />
            <span>{t.appName}</span>
          </div>
          <span className="text-[#43474e]">/</span>
          <div className="flex items-center gap-1.5 text-xs text-[#c4c6d0]">
            <M3Icon name="bookmark" size={14} className="text-[#8e9199]" />
            <span className="font-mono text-white">{selectedRepo?.name || 'workspace'}</span>
            <span className="px-2 py-0.5 rounded-full bg-[#00468b]/40 text-[#a8c7fa] text-[11px] font-mono border border-[#a8c7fa]/20">
              {activeBranch}
            </span>
          </div>
        </div>

        {/* View Mode Switcher (Editor / Split / Preview) */}
        <div className="flex items-center gap-1 bg-[#121316] p-0.5 rounded-lg border border-[#43474e]/30">
          <button
            onClick={() => setViewMode('code')}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
              viewMode === 'code' ? 'bg-[#a8c7fa] text-[#003062] font-semibold' : 'text-[#8e9199] hover:text-white'
            }`}
            title="Editor View Only"
          >
            <M3Icon name="code" size={14} />
            <span className="hidden md:inline">{t.editor}</span>
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
              viewMode === 'split' ? 'bg-[#a8c7fa] text-[#003062] font-semibold' : 'text-[#8e9199] hover:text-white'
            }`}
            title="Split Code & Live Preview"
          >
            <M3Icon name="vertical_split" size={14} />
            <span className="hidden md:inline">Split View</span>
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
              viewMode === 'preview' ? 'bg-[#a8c7fa] text-[#003062] font-semibold' : 'text-[#8e9199] hover:text-white'
            }`}
            title="Live Preview Only"
          >
            <M3Icon name="visibility" size={14} />
            <span className="hidden md:inline">{t.preview}</span>
          </button>
        </div>

        {/* Quick Actions (Language, Commit, Terminal toggle, Export, GitHub Status) */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <select
            value={currentLang}
            onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
            className="bg-[#121316] border border-[#43474e]/50 rounded-lg px-2 py-1 text-xs text-[#a8c7fa] focus:outline-none"
            title="Language / 语言 / Bahasa"
          >
            <option value="en">English</option>
            <option value="zh-CN">简体中文</option>
            <option value="ms">Bahasa Melayu</option>
          </select>

          {/* One-Click Commit Button without Terminal */}
          <button
            onClick={() => setActivePanel('git')}
            className="px-2.5 py-1 rounded-lg bg-[#00468b]/30 hover:bg-[#00468b]/50 border border-[#a8c7fa]/40 text-[#a8c7fa] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Commit and push changes directly without using the terminal"
          >
            <M3Icon name="cloud_upload" size={16} />
            <span>
              {t.commit} ({diffs.length > 0 ? diffs.length : Object.keys(files).length})
            </span>
          </button>

          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border ${
              showTerminal
                ? 'bg-[#2b2d30] border-[#a8c7fa]/40 text-[#a8c7fa]'
                : 'bg-transparent border-[#43474e]/40 text-[#8e9199] hover:text-white'
            }`}
            title="Toggle Bottom Terminal"
          >
            <M3Icon name="terminal" size={16} />
            <span className="hidden sm:inline">{t.terminal}</span>
          </button>

          <button
            onClick={handleExportZip}
            className="px-2.5 py-1 rounded-lg bg-[#a8c7fa] hover:bg-[#c2e7ff] text-[#003062] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download current workspace as .zip"
          >
            <M3Icon name="download" size={16} />
            <span className="hidden sm:inline">{t.exportZip}</span>
          </button>

          {/* Real GitHub Account Status Pill */}
          {isAuthenticated ? (
            <div
              onClick={() => setActivePanel('git')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0f5223]/30 border border-[#308745] text-[#b4f3b7] text-xs font-medium cursor-pointer"
              title="GitHub Connected (Real)"
            >
              <M3Icon name="check_circle" size={14} />
              <span className="hidden md:inline">@{githubUser?.login}</span>
            </div>
          ) : (
            <button
              onClick={() => setActivePanel('git')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#690005]/30 border border-[#ff8585]/40 text-[#ffdad6] text-xs font-medium hover:bg-[#690005]/50 transition-colors cursor-pointer"
              title="Connect GitHub"
            >
              <M3Icon name="lock" size={14} />
              <span className="hidden md:inline">{t.connectGitHub}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Layout Area */}
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
        </nav>

        {/* Collapsible Sidebar Content Area */}
        {activePanel === 'explorer' && (
          <Sidebar
            tree={tree}
            activeFilePath={activeFilePath}
            onSelectFile={handleSelectFile}
            onUploadZip={handleUploadZip}
            onExportZip={handleExportZip}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDeleteNode={handleDeleteNode}
            onRenameNode={() => {}}
            onLoadTemplate={handleLoadTemplate}
            onExplainCode={() => {}}
          />
        )}

        {activePanel === 'search' && (
          <SearchPanel
            files={files}
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
            onConnectOAuth={handleConnectOAuth}
            onConnectToken={handleConnectToken}
            onDisconnect={handleDisconnect}
            onSelectRepo={handleSelectRepo}
            onLoadRepoFiles={handleLoadRepoFilesExplicit}
            onCreateRepo={handleCreateRepo}
            onSwitchBranch={handleSwitchBranch}
            onCreateBranch={handleCreateBranch}
            onCommitAndPush={handleCommitAndPush}
            onCreatePullRequest={handleCreatePullRequest}
            onSubmitPRReview={handleSubmitPRReview}
          />
        )}

        {/* Central Workspace (Editor and Preview) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {/* Editor Pane */}
            {(viewMode === 'code' || viewMode === 'split') && (
              <div className="flex-1 h-full overflow-hidden flex flex-col">
                <Editor
                  openTabs={openTabs}
                  activeFilePath={activeFilePath}
                  files={files}
                  onSelectTab={setActiveFilePath}
                  onCloseTab={handleCloseTab}
                  onUpdateContent={handleUpdateContent}
                  onSaveFile={() => addGitLog(`Saved file: ${activeFilePath}`)}
                  targetLine={targetSearchLine}
                />
              </div>
            )}

            {/* Live Preview Pane */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className="flex-1 h-full overflow-hidden flex flex-col">
                <Preview
                  files={files}
                  onConsoleMessage={handlePreviewConsole}
                />
              </div>
            )}
          </div>

          {/* Bottom VS Code Terminal Dock */}
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
            />
          )}
        </div>
      </div>
    </div>
  );
}
