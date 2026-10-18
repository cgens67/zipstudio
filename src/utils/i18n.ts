/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SupportedLanguage = 'en' | 'zh-CN' | 'ms';

export interface Translations {
  appName: string;
  explorer: string;
  search: string;
  sourceControl: string;
  editor: string;
  preview: string;
  terminal: string;
  logs: string;
  gitOutput: string;
  diagnostics: string;
  importZip: string;
  exportZip: string;
  templates: string;
  newFile: string;
  newFolder: string;
  delete: string;
  save: string;
  plainEnglish: string;
  plainEnglishDesc: string;
  commit: string;
  commitMessagePlaceholder: string;
  commitAndPush: string;
  cleanOverwriteNotice: string;
  branch: string;
  newBranch: string;
  repository: string;
  newRepo: string;
  pullRequests: string;
  newPR: string;
  reviewPR: string;
  approve: string;
  requestChanges: string;
  comment: string;
  connectGitHub: string;
  githubAccessRequired: string;
  patLabel: string;
  connectWithToken: string;
  oauthSignIn: string;
  workingTreeClean: string;
  stagedFiles: string;
  replaceAll: string;
  searchPlaceholder: string;
  replacePlaceholder: string;
  noResults: string;
  loadRepoFiles: string;
  loadingRepo: string;
  desktop: string;
  tablet: string;
  mobile: string;
  language: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, Translations> = {
  en: {
    appName: 'ZipStudio',
    explorer: 'Explorer',
    search: 'Search in Code',
    sourceControl: 'Source Control',
    editor: 'Editor',
    preview: 'Preview',
    terminal: 'Terminal',
    logs: 'Preview Logs',
    gitOutput: 'Git Output',
    diagnostics: 'Diagnostics',
    importZip: 'Import .ZIP',
    exportZip: 'Export .ZIP',
    templates: 'Templates',
    newFile: 'New File',
    newFolder: 'New Folder',
    delete: 'Delete',
    save: 'Save',
    plainEnglish: 'Plain English',
    plainEnglishDesc: 'Translate code into plain English for non-coders',
    commit: 'Commit',
    commitMessagePlaceholder: 'Commit message (e.g. Update components)',
    commitAndPush: 'Commit & Push to GitHub',
    cleanOverwriteNotice: 'Imported zip will completely replace all original repo files upon commit.',
    branch: 'Branch',
    newBranch: 'New Branch',
    repository: 'Repository',
    newRepo: 'New Repo',
    pullRequests: 'Pull Requests',
    newPR: 'New PR',
    reviewPR: 'Review PR',
    approve: 'Approve',
    requestChanges: 'Request Changes',
    comment: 'Comment',
    connectGitHub: 'Connect GitHub',
    githubAccessRequired: 'GitHub Access Required',
    patLabel: 'Personal Access Token (PAT)',
    connectWithToken: 'Connect with GitHub Token',
    oauthSignIn: 'Sign In via GitHub OAuth',
    workingTreeClean: 'Working tree clean',
    stagedFiles: 'Staged Files',
    replaceAll: 'Replace All',
    searchPlaceholder: 'Search in code...',
    replacePlaceholder: 'Replace with...',
    noResults: 'No results found',
    loadRepoFiles: 'Load Repo Files',
    loadingRepo: 'Loading repository files from GitHub...',
    desktop: 'Desktop',
    tablet: 'Tablet',
    mobile: 'Mobile',
    language: 'Language',
  },
  'zh-CN': {
    appName: 'ZipStudio',
    explorer: '资源管理器',
    search: '代码搜索',
    sourceControl: '源代码管理',
    editor: '编辑器',
    preview: '实时预览',
    terminal: '终端',
    logs: '预览日志',
    gitOutput: 'Git 输出',
    diagnostics: '代码诊断',
    importZip: '导入 .ZIP',
    exportZip: '导出 .ZIP',
    templates: '模板库',
    newFile: '新建文件',
    newFolder: '新建文件夹',
    delete: '删除',
    save: '保存',
    plainEnglish: '通俗易懂模式',
    plainEnglishDesc: '为非技术人员将代码翻译为通俗生活比喻',
    commit: '提交',
    commitMessagePlaceholder: '提交说明 (例如: 更新组件与样式)',
    commitAndPush: '提交并推送到 GitHub',
    cleanOverwriteNotice: '导入的压缩包将在提交时完全覆盖并清理原仓库旧文件。',
    branch: '分支',
    newBranch: '新建分支',
    repository: '仓库',
    newRepo: '新建仓库',
    pullRequests: '拉取请求 (PR)',
    newPR: '创建 PR',
    reviewPR: '审核 PR',
    approve: '批准通过',
    requestChanges: '要求修改',
    comment: '发表评论',
    connectGitHub: '连接 GitHub',
    githubAccessRequired: '需要授权 GitHub 账户',
    patLabel: '个人访问令牌 (PAT)',
    connectWithToken: '使用令牌连接',
    oauthSignIn: '通过 GitHub OAuth 登录',
    workingTreeClean: '工作区干净，无未提交更改',
    stagedFiles: '已暂存的文件',
    replaceAll: '全部替换',
    searchPlaceholder: '在代码中搜索...',
    replacePlaceholder: '替换为...',
    noResults: '未找到匹配结果',
    loadRepoFiles: '加载仓库文件',
    loadingRepo: '正在从 GitHub 下载仓库全部文件...',
    desktop: '桌面端',
    tablet: '平板端',
    mobile: '移动端',
    language: '语言 (Language)',
  },
  ms: {
    appName: 'ZipStudio',
    explorer: 'Penjelajah Fail',
    search: 'Cari dalam Kod',
    sourceControl: 'Kawalan Versi',
    editor: 'Editor',
    preview: 'Pratonton Langsung',
    terminal: 'Terminal',
    logs: 'Log Pratonton',
    gitOutput: 'Output Git',
    diagnostics: 'Diagnostik Kod',
    importZip: 'Import .ZIP',
    exportZip: 'Eksport .ZIP',
    templates: 'Templat',
    newFile: 'Fail Baharu',
    newFolder: 'Folder Baharu',
    delete: 'Padam',
    save: 'Simpan',
    plainEnglish: 'Penerangan Mudah',
    plainEnglishDesc: 'Terangkan kod dalam bahasa harian untuk orang awam',
    commit: 'Komit',
    commitMessagePlaceholder: 'Mesej komit (cth: Kemas kini komponen)',
    commitAndPush: 'Komit & Tolak ke GitHub',
    cleanOverwriteNotice: 'Zip yang diimport akan menggantikan semua fail asal repositori sepenuhnya apabila dikomit.',
    branch: 'Cawangan (Branch)',
    newBranch: 'Cawangan Baharu',
    repository: 'Repositori',
    newRepo: 'Repo Baharu',
    pullRequests: 'Permintaan Tarik (PR)',
    newPR: 'Cipta PR',
    reviewPR: 'Semak PR',
    approve: 'Luluskan',
    requestChanges: 'Minta Perubahan',
    comment: 'Komen',
    connectGitHub: 'Sambung GitHub',
    githubAccessRequired: 'Akses GitHub Diperlukan',
    patLabel: 'Token Akses Peribadi (PAT)',
    connectWithToken: 'Sambung dengan Token',
    oauthSignIn: 'Log Masuk melalui GitHub OAuth',
    workingTreeClean: 'Ruang kerja bersih, tiada perubahan',
    stagedFiles: 'Fail Berperingkat',
    replaceAll: 'Ganti Semua',
    searchPlaceholder: 'Cari dalam kod...',
    replacePlaceholder: 'Ganti dengan...',
    noResults: 'Tiada hasil carian ditemui',
    loadRepoFiles: 'Muat Fail Repositori',
    loadingRepo: 'Memuat turun fail repositori dari GitHub...',
    desktop: 'Komputer Meja',
    tablet: 'Tablet',
    mobile: 'Telefon Mudah Alih',
    language: 'Bahasa (Language)',
  },
};
