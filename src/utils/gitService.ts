/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { isBinaryExtension, getMimeType } from './fileSystem';

export interface VFileRef {
  path: string;
  name: string;
  content: string;
  isBinary: boolean;
  size: number;
  lastModified: number;
  mode?: string;
  sha?: string;
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

export interface RepoLoadProgress {
  loaded: number;
  total: number;
  estimatedSecondsRemaining: number;
  currentFile: string;
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

  async getRepoCommits(owner: string, repo: string, branch?: string): Promise<GitCommit[]> {
    const query = branch ? `?sha=${encodeURIComponent(branch)}&per_page=30` : '?per_page=30';
    try {
      const data: any[] = await this.request(`/repos/${owner}/${repo}/commits${query}`);
      return data.map((item: any) => ({
        id: item.sha,
        shortId: item.sha.substring(0, 7),
        message: item.commit?.message?.split('\n')[0] || 'Commit',
        author: {
          name: item.commit?.author?.name || item.author?.login || 'Developer',
          email: item.commit?.author?.email || 'dev@example.com',
          avatarUrl:
            item.author?.avatar_url ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${item.commit?.author?.name || 'Developer'}`,
        },
        timestamp: new Date(
          item.commit?.author?.date || item.commit?.committer?.date || Date.now()
        ).getTime(),
        branch: branch || 'main',
        filesChanged: item.stats?.total || 1,
      }));
    } catch (err: any) {
      console.warn(`Could not load commits for ${owner}/${repo}:`, err.message);
      return [];
    }
  }

  async fetchRepoTree(
    owner: string,
    repo: string,
    branch: string,
    onProgress?: (progress: RepoLoadProgress) => void
  ): Promise<Record<string, VFileRef>> {
    const files: Record<string, VFileRef> = {};
    try {
      const treeData: any = await this.request(
        `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
      );

      if (!treeData.tree || !Array.isArray(treeData.tree)) {
        return files;
      }

      // Filter blobs (files, not directories)
      const blobs = treeData.tree.filter((item: any) => item.type === 'blob');
      const total = blobs.length;
      let loaded = 0;
      const startTime = performance.now();

      // Initial progress report
      onProgress?.({
        loaded: 0,
        total,
        estimatedSecondsRemaining: Math.ceil(total * 0.08),
        currentFile: '',
      });

      // Fetch file contents in parallel batches of 8 to avoid rate limit spikes
      const batchSize = 8;
      for (let i = 0; i < blobs.length; i += batchSize) {
        const batch = blobs.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (blobItem: any) => {
            try {
              const blobRes: any = await this.request(
                `/repos/${owner}/${repo}/git/blobs/${blobItem.sha}`
              );

              const path = blobItem.path;
              const name = path.split('/').pop() || path;
              const ext = name.split('.').pop() || '';
              const isBinary = isBinaryExtension(ext);

              let content = '';
              if (blobRes.encoding === 'base64') {
                if (isBinary) {
                  const mime = getMimeType(ext);
                  content = `data:${mime};base64,${blobRes.content.replace(/\s/g, '')}`;
                } else {
                  // Decode base64 to text (handles UTF-8)
                  try {
                    content = decodeURIComponent(
                      atob(blobRes.content.replace(/\s/g, ''))
                        .split('')
                        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                        .join('')
                    );
                  } catch {
                    try {
                      content = atob(blobRes.content.replace(/\s/g, ''));
                    } catch {
                      // Fallback as binary data URL if decoding fails
                      const mime = getMimeType(ext);
                      content = `data:${mime};base64,${blobRes.content.replace(/\s/g, '')}`;
                    }
                  }
                }
              } else {
                content = blobRes.content || '';
              }

              files[path] = {
                path,
                name,
                content,
                isBinary,
                size: blobRes.size || content.length,
                lastModified: Date.now(),
                mode: blobItem.mode || (name === 'gradlew' || path.endsWith('.sh') ? '100755' : '100644'),
                sha: blobItem.sha,
              };
            } catch (blobErr) {
              console.warn(`Failed to fetch blob ${blobItem.path}:`, blobErr);
            }
          })
        );

        loaded = Math.min(total, i + batch.length);
        const elapsedSec = (performance.now() - startTime) / 1000;
        const avgTimePerFile = elapsedSec / (loaded || 1);
        const remaining = total - loaded;
        const estimatedSecondsRemaining = Math.max(0, Math.ceil(remaining * avgTimePerFile));

        onProgress?.({
          loaded,
          total,
          estimatedSecondsRemaining,
          currentFile: batch[batch.length - 1]?.path || '',
        });
      }
    } catch (err: any) {
      console.warn(`Could not load tree for ${owner}/${repo}@${branch}:`, err.message);
    }
    return files;
  }

  async commitAndPushFiles(
    owner: string,
    repo: string,
    branch: string,
    message: string,
    changedFiles: Record<string, VFileRef>,
    cleanOverwrite = false,
    deletedPaths: string[] = []
  ): Promise<string> {
    // 1. Get latest commit SHA on branch
    const refData: any = await this.request(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
    const parentCommitSha = refData.object.sha;

    // 2. Get tree SHA of the parent commit
    const commitData: any = await this.request(`/repos/${owner}/${repo}/git/commits/${parentCommitSha}`);
    const baseTreeSha = commitData.tree.sha;

    // 3. Separate binary files that require blob creation
    const entries = Object.entries(changedFiles);
    const binaryEntries = entries.filter(
      ([, file]) => file.isBinary && file.content.startsWith('data:')
    );
    const textEntries = entries.filter(
      ([, file]) => !file.isBinary || !file.content.startsWith('data:')
    );

    // Upload binary blobs in parallel batches of 6 for speed
    const uploadedBlobMap = new Map<string, string>();
    const batchSize = 6;
    for (let i = 0; i < binaryEntries.length; i += batchSize) {
      const batch = binaryEntries.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async ([filePath, file]) => {
          const base64Data = file.content.substring(file.content.indexOf(',') + 1);
          const blobRes: any = await this.request(`/repos/${owner}/${repo}/git/blobs`, {
            method: 'POST',
            body: JSON.stringify({ content: base64Data, encoding: 'base64' }),
          });
          uploadedBlobMap.set(filePath, blobRes.sha);
        })
      );
    }

    // 4. Create tree items for changed files
    const treeItems: any[] = [];

    // Handle deleted files (setting sha to null tells GitHub to remove the path from base_tree)
    for (const delPath of deletedPaths) {
      treeItems.push({
        path: delPath,
        mode: '100644',
        type: 'blob',
        sha: null,
      });
    }

    // Handle text files
    for (const [filePath, file] of textEntries) {
      const mode =
        file.mode ||
        (file.name === 'gradlew' || filePath.endsWith('.sh') || filePath.endsWith('.bash')
          ? '100755'
          : '100644');
      treeItems.push({
        path: filePath,
        mode,
        type: 'blob',
        content: file.content,
      });
    }

    // Handle binary files with their uploaded blob SHAs
    for (const [filePath, file] of binaryEntries) {
      const blobSha = uploadedBlobMap.get(filePath);
      if (blobSha) {
        const mode =
          file.mode ||
          (file.name === 'gradlew' || filePath.endsWith('.sh') || filePath.endsWith('.bash')
            ? '100755'
            : '100644');
        treeItems.push({
          path: filePath,
          mode,
          type: 'blob',
          sha: blobSha,
        });
      }
    }

    // 5. Create new tree.
    // When cleanOverwrite is true, omit base_tree so that previous files in the repo are completely replaced!
    const treePayload: any = { tree: treeItems };
    if (!cleanOverwrite) {
      treePayload.base_tree = baseTreeSha;
    }

    const newTree: any = await this.request(`/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      body: JSON.stringify(treePayload),
    });

    // 6. Create commit
    const newCommit: any = await this.request(`/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        tree: newTree.sha,
        parents: [parentCommitSha],
      }),
    });

    // 7. Update branch reference
    await this.request(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: JSON.stringify({
        sha: newCommit.sha,
        force: cleanOverwrite,
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
