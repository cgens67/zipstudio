/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VFileRef {
  path: string;
  name: string;
  content: string;
  isBinary: boolean;
  size: number;
  lastModified: number;
}

export interface GitCommit {
  id: string;
  shortId: string;
  message: string;
  author: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  timestamp: number;
  branch: string;
  filesChanged: number;
}

export interface GitBranch {
  name: string;
  isCurrent: boolean;
  isDefault: boolean;
  commitSha: string;
}

export interface FileDiffLine {
  type: 'add' | 'delete' | 'normal';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface FileDiff {
  path: string;
  status: 'modified' | 'added' | 'deleted';
  lines: FileDiffLine[];
  additions: number;
  deletions: number;
}

export interface PullRequestReview {
  id: string;
  author: string;
  avatarUrl?: string;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED';
  body: string;
  submittedAt: number;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  description: string;
  headBranch: string;
  baseBranch: string;
  state: 'open' | 'closed' | 'merged';
  author: {
    login: string;
    avatarUrl: string;
  };
  createdAt: number;
  reviews: PullRequestReview[];
  diffs: FileDiff[];
}

export interface GitHubUser {
  login: string;
  name: string;
  avatarUrl: string;
  htmlUrl: string;
  publicRepos: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description?: string;
  defaultBranch: string;
  private: boolean;
  htmlUrl: string;
  updatedAt: string;
}

/**
 * Computes a line-by-line diff between original content and current content.
 */
export function computeFileDiff(path: string, originalContent: string | null, currentContent: string | null): FileDiff {
  if (originalContent === null && currentContent !== null) {
    // Added file
    const newLines = currentContent.split('\n');
    const lines: FileDiffLine[] = newLines.map((line, idx) => ({
      type: 'add',
      newLineNumber: idx + 1,
      content: line,
    }));
    return {
      path,
      status: 'added',
      lines,
      additions: newLines.length,
      deletions: 0,
    };
  }

  if (originalContent !== null && currentContent === null) {
    // Deleted file
    const oldLines = originalContent.split('\n');
    const lines: FileDiffLine[] = oldLines.map((line, idx) => ({
      type: 'delete',
      oldLineNumber: idx + 1,
      content: line,
    }));
    return {
      path,
      status: 'deleted',
      lines,
      additions: 0,
      deletions: oldLines.length,
    };
  }

  const oldLines = (originalContent || '').split('\n');
  const newLines = (currentContent || '').split('\n');
  const diffLines: FileDiffLine[] = [];
  let additions = 0;
  let deletions = 0;

  // Simple Myers/LCS approximation for clean readable visual diffs
  let oldIdx = 0;
  let newIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (oldIdx < oldLines.length && newIdx < newLines.length) {
      if (oldLines[oldIdx] === newLines[newIdx]) {
        diffLines.push({
          type: 'normal',
          oldLineNumber: oldIdx + 1,
          newLineNumber: newIdx + 1,
          content: oldLines[oldIdx],
        });
        oldIdx++;
        newIdx++;
      } else {
        // Lookahead to see if next line matches
        const nextMatchInNew = newLines.slice(newIdx, newIdx + 5).indexOf(oldLines[oldIdx]);
        const nextMatchInOld = oldLines.slice(oldIdx, oldIdx + 5).indexOf(newLines[newIdx]);

        if (nextMatchInNew > 0 && (nextMatchInOld === -1 || nextMatchInNew <= nextMatchInOld)) {
          // New lines were added
          diffLines.push({
            type: 'add',
            newLineNumber: newIdx + 1,
            content: newLines[newIdx],
          });
          newIdx++;
          additions++;
        } else if (nextMatchInOld > 0) {
          // Old lines were deleted
          diffLines.push({
            type: 'delete',
            oldLineNumber: oldIdx + 1,
            content: oldLines[oldIdx],
          });
          oldIdx++;
          deletions++;
        } else {
          // Changed line (delete old, add new)
          diffLines.push({
            type: 'delete',
            oldLineNumber: oldIdx + 1,
            content: oldLines[oldIdx],
          });
          oldIdx++;
          deletions++;

          diffLines.push({
            type: 'add',
            newLineNumber: newIdx + 1,
            content: newLines[newIdx],
          });
          newIdx++;
          additions++;
        }
      }
    } else if (oldIdx < oldLines.length) {
      diffLines.push({
        type: 'delete',
        oldLineNumber: oldIdx + 1,
        content: oldLines[oldIdx],
      });
      oldIdx++;
      deletions++;
    } else if (newIdx < newLines.length) {
      diffLines.push({
        type: 'add',
        newLineNumber: newIdx + 1,
        content: newLines[newIdx],
      });
      newIdx++;
      additions++;
    }
  }

  return {
    path,
    status: 'modified',
    lines: diffLines,
    additions,
    deletions,
  };
}

export type VFile = VFileRef;

/**
 * Computes all changed files between snapshot (base) and current files.
 */
export function computeWorkingTreeChanges(
  baseFiles: Record<string, VFileRef>,
  currentFiles: Record<string, VFileRef>
): FileDiff[] {
  const diffs: FileDiff[] = [];
  const allPaths = new Set([...Object.keys(baseFiles), ...Object.keys(currentFiles)]);

  for (const path of allPaths) {
    const base = baseFiles[path];
    const curr = currentFiles[path];

    if (!base && curr) {
      diffs.push(computeFileDiff(path, null, curr.content));
    } else if (base && !curr) {
      diffs.push(computeFileDiff(path, base.content, null));
    } else if (base && curr && base.content !== curr.content) {
      diffs.push(computeFileDiff(path, base.content, curr.content));
    }
  }

  return diffs;
}

/**
 * Generates an initial commit object.
 */
export function createCommit(
  message: string,
  branch: string,
  authorName = 'Developer',
  authorEmail = 'dev@example.com',
  filesChanged = 1
): GitCommit {
  const id = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return {
    id,
    shortId: id.substring(0, 7),
    message,
    author: {
      name: authorName,
      email: authorEmail,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${authorName}`,
    },
    timestamp: Date.now(),
    branch,
    filesChanged,
  };
}

/**
 * Client for GitHub REST API calls using Personal Access Token or OAuth Bearer.
 */
export class GitHubApiClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`https://api.github.com${endpoint}`, {
      ...options,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.message || `GitHub API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  async getAuthenticatedUser(): Promise<GitHubUser> {
    const data: any = await this.request('/user');
    return {
      login: data.login,
      name: data.name || data.login,
      avatarUrl: data.avatar_url,
      htmlUrl: data.html_url,
      publicRepos: data.public_repos || 0,
    };
  }

  async getUserRepos(): Promise<GitHubRepo[]> {
    const data: any[] = await this.request('/user/repos?sort=updated&per_page=50');
    return data.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      defaultBranch: r.default_branch || 'main',
      private: r.private,
      htmlUrl: r.html_url,
      updatedAt: r.updated_at,
    }));
  }

  async createRepo(name: string, description: string, isPrivate = false): Promise<GitHubRepo> {
    const data: any = await this.request('/user/repos', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        private: isPrivate,
        auto_init: true,
      }),
    });
    return {
      id: data.id,
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      defaultBranch: data.default_branch || 'main',
      private: data.private,
      htmlUrl: data.html_url,
      updatedAt: data.updated_at,
    };
  }

  async getBranches(owner: string, repo: string): Promise<string[]> {
    const data: any[] = await this.request(`/repos/${owner}/${repo}/branches`);
    return data.map((b) => b.name);
  }

  async getPullRequests(owner: string, repo: string): Promise<any[]> {
    return await this.request(`/repos/${owner}/${repo}/pulls?state=all&per_page=20`);
  }

  async createPullRequest(owner: string, repo: string, title: string, head: string, base: string, body: string): Promise<any> {
    return await this.request(`/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      body: JSON.stringify({ title, head, base, body }),
    });
  }

  async createBranch(owner: string, repo: string, branchName: string, baseBranch = 'main'): Promise<void> {
    const baseRef: any = await this.request(`/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`);
    const sha = baseRef.object.sha;
    await this.request(`/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha,
      }),
    });
  }

  async commitAndPushFiles(
    owner: string,
    repo: string,
    branch: string,
    message: string,
    changedFiles: Record<string, VFileRef>
  ): Promise<string> {
    // 1. Get latest commit SHA on branch
    const refData: any = await this.request(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
    const parentCommitSha = refData.object.sha;

    // 2. Get tree SHA of the parent commit
    const commitData: any = await this.request(`/repos/${owner}/${repo}/git/commits/${parentCommitSha}`);
    const baseTreeSha = commitData.tree.sha;

    // 3. Create tree items for changed files
    const treeItems = [];
    for (const [filePath, file] of Object.entries(changedFiles)) {
      if (file.isBinary && file.content.startsWith('data:')) {
        const base64Data = file.content.substring(file.content.indexOf(',') + 1);
        const blobRes: any = await this.request(`/repos/${owner}/${repo}/git/blobs`, {
          method: 'POST',
          body: JSON.stringify({ content: base64Data, encoding: 'base64' }),
        });
        treeItems.push({
          path: filePath,
          mode: '100644',
          type: 'blob',
          sha: blobRes.sha,
        });
      } else {
        treeItems.push({
          path: filePath,
          mode: '100644',
          type: 'blob',
          content: file.content,
        });
      }
    }

    // 4. Create new tree
    const newTree: any = await this.request(`/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    });

    // 5. Create commit
    const newCommit: any = await this.request(`/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        tree: newTree.sha,
        parents: [parentCommitSha],
      }),
    });

    // 6. Update branch reference
    await this.request(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: JSON.stringify({
        sha: newCommit.sha,
        force: false,
      }),
    });

    return newCommit.sha;
  }

  async submitPullRequestReview(owner: string, repo: string, pullNumber: number, event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT', body: string): Promise<any> {
    return await this.request(`/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ event, body }),
    });
  }
}
