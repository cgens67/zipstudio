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
  code: string;
  splitView: string;
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
  searchFiles: string;
  noFilesLoaded: string;
  noFilesLoadedDesc: string;
  noFileOpen: string;
  noFileOpenDesc: string;
  linesLabel: string;
  spaces: string;
  ready: string;
  reload: string;
  close: string;
  maximize: string;
  restore: string;
  clear: string;
  decreaseFont: string;
  increaseFont: string;
  toggleWordWrap: string;
  diff: string;
  closeDiff: string;
  history: string;
  changes: string;
  allLogs: string;
  errorsOnly: string;
  warnings: string;
  infoLogs: string;
  clearTerminal: string;
  clearLogs: string;
  clearGitLogs: string;
  noLogs: string;
  noGitLogs: string;
  noDiagnostics: string;
  pushSnapshot: string;
  privateRepo: string;
  cancel: string;
  create: string;
  openPR: string;
  reviews: string;
  matchCase: string;
  matchWholeWord: string;
  useRegex: string;
  matchesInFiles: string;
  // Extended keys
  editorViewOnly: string;
  previewViewOnly: string;
  toggleTerminal: string;
  extendTerminal: string;
  minimizeTerminal: string;
  maximizeTerminal: string;
  restoreTerminal: string;
  resizeTerminal: string;
  resizeSidebar: string;
  resizeSplitter: string;
  resetSplit: string;
  maximizeEditor: string;
  maximizePreview: string;
  commitDirectTooltip: string;
  downloadZipTooltip: string;
  connectedAs: string;
  workspace: string;
  repoLabel: string;
  generateTokenLink: string;
  createTokenNotice: string;
  viewOAuthInfo: string;
  hideOAuthInfo: string;
  oauthConfiguredLabel: string;
  oauthNotConfiguredLabel: string;
  callbackUrlLabel: string;
  recentCommits: string;
  noCommitsYet: string;
  reviewPRTitle: string;
  reviewNotesPlaceholder: string;
  createBranchTitle: string;
  branchFrom: string;
  branchNamePlaceholder: string;
  createRepoTitle: string;
  repoNamePlaceholder: string;
  repoDescPlaceholder: string;
  createOnGitHub: string;
  emptyArchiveAlert: string;
  extractFailed: string;
  exportFailed: string;
  fileAlreadyExists: string;
  invalidRegex: string;
  chooseTemplate: string;
  loadTemplate: string;
  noFilesMatch: string;
  terminalTitle: string;
  typeCommandPrompt: string;
  welcomeTerminal: string;
  typeHelp: string;
  connectedWorkspace: string;
  binaryAsset: string;
  openInNewWindow: string;
  sandboxedPreview: string;
  searchAcrossWorkspace: string;
  filesCount: string;
  jumpToLine: string;
  hideReplace: string;
  toggleReplace: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, Translations> = {
  en: {
    appName: 'ZipStudio',
    explorer: 'Explorer',
    search: 'Search in Code',
    sourceControl: 'Source Control',
    editor: 'Editor',
    code: 'Code',
    splitView: 'Split View',
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
    searchFiles: 'Search files...',
    noFilesLoaded: 'No files loaded',
    noFilesLoadedDesc: 'Import a .zip archive or select a starter template.',
    noFileOpen: 'No File Open',
    noFileOpenDesc: 'Select a file from the explorer on the left or import a .zip.',
    linesLabel: 'lines',
    spaces: 'Spaces',
    ready: 'Ready',
    reload: 'Reload Preview',
    close: 'Close',
    maximize: 'Maximize',
    restore: 'Restore',
    clear: 'Clear',
    decreaseFont: 'Decrease Font',
    increaseFont: 'Increase Font',
    toggleWordWrap: 'Toggle Word Wrap',
    diff: 'Diff',
    closeDiff: 'Close Diff',
    history: 'History',
    changes: 'Changes',
    allLogs: 'All Logs',
    errorsOnly: 'Errors Only',
    warnings: 'Warnings',
    infoLogs: 'Logs',
    clearTerminal: 'Clear Terminal',
    clearLogs: 'Clear Logs',
    clearGitLogs: 'Clear Git Logs',
    noLogs: 'No preview console logs. Logs from your app will appear here.',
    noGitLogs: 'No git output yet. Connect to GitHub or run version control operations.',
    noDiagnostics: 'No syntax or build errors found.',
    pushSnapshot: 'Push Project Snapshot to GitHub',
    privateRepo: 'Private repository',
    cancel: 'Cancel',
    create: 'Create',
    openPR: 'Open PR on GitHub',
    reviews: 'reviews',
    matchCase: 'Match Case (Alt+C)',
    matchWholeWord: 'Match Whole Word (Alt+W)',
    useRegex: 'Use Regular Expression (Alt+R)',
    matchesInFiles: 'matches in files',
    // Extended keys
    editorViewOnly: 'Code Only',
    previewViewOnly: 'Preview Only',
    toggleTerminal: 'Toggle Terminal',
    extendTerminal: 'Extend Terminal',
    minimizeTerminal: 'Minimize Terminal',
    maximizeTerminal: 'Maximize Terminal',
    restoreTerminal: 'Restore Terminal',
    resizeTerminal: 'Drag vertically to resize terminal',
    resizeSidebar: 'Drag horizontally to resize sidebar',
    resizeSplitter: 'Drag horizontally to resize code & preview',
    resetSplit: 'Double-click to reset 50/50 split',
    maximizeEditor: 'Maximize Code Viewer',
    maximizePreview: 'Maximize HTML Viewer',
    commitDirectTooltip: 'Commit and push changes directly without using the terminal',
    downloadZipTooltip: 'Download current workspace as .zip',
    connectedAs: 'Connected as',
    workspace: 'workspace',
    repoLabel: 'repo',
    generateTokenLink: 'Generate Token ↗',
    createTokenNotice: 'Create a classic token with repo scope for full read/write access.',
    viewOAuthInfo: 'View OAuth setup configuration',
    hideOAuthInfo: 'Hide OAuth setup info',
    oauthConfiguredLabel: 'CLIENT_ID Configured',
    oauthNotConfiguredLabel: 'CLIENT_ID Not in .env',
    callbackUrlLabel: 'Callback URL',
    recentCommits: 'Recent Commits',
    noCommitsYet: 'No commits found in this branch.',
    reviewPRTitle: 'Review PR',
    reviewNotesPlaceholder: 'Leave review comments, feedback, or approval notes...',
    createBranchTitle: 'Create Branch on GitHub',
    branchFrom: 'Will branch from',
    branchNamePlaceholder: 'New branch name (e.g. feature-login)',
    createRepoTitle: 'Create New GitHub Repository',
    repoNamePlaceholder: 'Repository name (e.g. my-app)',
    repoDescPlaceholder: 'Description (optional)',
    createOnGitHub: 'Create on GitHub',
    emptyArchiveAlert: 'The uploaded archive appears to be empty or contains no supported files.',
    extractFailed: 'Failed to extract .zip file',
    exportFailed: 'Failed to export archive',
    fileAlreadyExists: 'A file with this path already exists.',
    invalidRegex: 'Invalid regular expression.',
    chooseTemplate: 'Choose a starter project',
    loadTemplate: 'Load Template',
    noFilesMatch: 'No files match your search filter.',
    terminalTitle: 'Virtual Terminal',
    typeCommandPrompt: "Type 'help' or run commands...",
    welcomeTerminal: 'ZipStudio Virtual Environment v1.0.0 (Linux x86_64)',
    typeHelp: 'Type "help" for a list of available commands.',
    connectedWorkspace: 'Connected to project workspace. Active branch:',
    binaryAsset: 'Binary Asset',
    openInNewWindow: 'Open Preview in New Window',
    sandboxedPreview: 'Sandboxed Live Execution',
    searchAcrossWorkspace: 'Search across all files in workspace',
    filesCount: 'files',
    jumpToLine: 'Click line number to jump to line in code',
    hideReplace: 'Hide Replace',
    toggleReplace: 'Toggle Replace',
  },
  'zh-CN': {
    appName: 'ZipStudio',
    explorer: '资源管理器',
    search: '代码搜索',
    sourceControl: '源代码管理',
    editor: '编辑器',
    code: '代码',
    splitView: '分屏视图',
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
    searchFiles: '搜索文件...',
    noFilesLoaded: '未加载任何文件',
    noFilesLoadedDesc: '导入 .zip 压缩包或选择初始模板。',
    noFileOpen: '未打开文件',
    noFileOpenDesc: '请从左侧资源管理器选择文件或导入 .zip。',
    linesLabel: '行',
    spaces: '空格',
    ready: '就绪',
    reload: '重新加载预览',
    close: '关闭',
    maximize: '最大化',
    restore: '还原',
    clear: '清空',
    decreaseFont: '缩小字体',
    increaseFont: '放大字体',
    toggleWordWrap: '自动换行',
    diff: '差异对比',
    closeDiff: '关闭差异',
    history: '历史记录',
    changes: '更改',
    allLogs: '所有日志',
    errorsOnly: '仅显示错误',
    warnings: '警告',
    infoLogs: '常规日志',
    clearTerminal: '清空终端',
    clearLogs: '清空日志',
    clearGitLogs: '清空 Git 日志',
    noLogs: '暂无预览控制台日志，应用运行日志将在此显示。',
    noGitLogs: '暂无 Git 输出，连接 GitHub 或执行版本控制操作将在此记录。',
    noDiagnostics: '未发现语法或构建错误。',
    pushSnapshot: '推送项目完整快照到 GitHub',
    privateRepo: '私有仓库',
    cancel: '取消',
    create: '创建',
    openPR: '在 GitHub 上开启 PR',
    reviews: '次审核',
    matchCase: '区分大小写 (Alt+C)',
    matchWholeWord: '全词匹配 (Alt+W)',
    useRegex: '使用正则表达式 (Alt+R)',
    matchesInFiles: '个匹配项',
    // Extended keys
    editorViewOnly: '仅代码',
    previewViewOnly: '仅预览',
    toggleTerminal: '切换终端',
    extendTerminal: '扩大终端',
    minimizeTerminal: '最小化终端',
    maximizeTerminal: '最大化终端',
    restoreTerminal: '还原终端',
    resizeTerminal: '垂直拖动调整终端高度',
    resizeSidebar: '水平拖动调整侧边栏宽度',
    resizeSplitter: '水平拖动调整代码与预览比例',
    resetSplit: '双击重置为 50/50 分屏',
    maximizeEditor: '最大化代码视图',
    maximizePreview: '最大化 HTML 预览',
    commitDirectTooltip: '无需命令行终端，直接提交并推送到 GitHub',
    downloadZipTooltip: '将当前项目工作区导出为 .zip 压缩包',
    connectedAs: '已登录账号',
    workspace: '工作区',
    repoLabel: '仓库',
    generateTokenLink: '生成令牌 ↗',
    createTokenNotice: '请创建具有 repo 完整权限的经典访问令牌。',
    viewOAuthInfo: '查看 OAuth 配置详情',
    hideOAuthInfo: '隐藏 OAuth 配置详情',
    oauthConfiguredLabel: 'CLIENT_ID 已配置',
    oauthNotConfiguredLabel: 'CLIENT_ID 未在 .env 配置',
    callbackUrlLabel: '回调地址 (Callback URL)',
    recentCommits: '最近提交记录',
    noCommitsYet: '此分支暂无提交记录。',
    reviewPRTitle: '审核 PR',
    reviewNotesPlaceholder: '填写审核反馈、修改建议或批准留言...',
    createBranchTitle: '在 GitHub 上创建分支',
    branchFrom: '基于分支创建',
    branchNamePlaceholder: '新分支名称 (例如: feature-login)',
    createRepoTitle: '创建新的 GitHub 仓库',
    repoNamePlaceholder: '仓库名称 (例如: my-awesome-app)',
    repoDescPlaceholder: '描述说明 (可选)',
    createOnGitHub: '在 GitHub 上创建',
    emptyArchiveAlert: '上传的压缩包为空或不包含受支持的代码文件。',
    extractFailed: '解压 .zip 压缩包失败',
    exportFailed: '导出压缩包失败',
    fileAlreadyExists: '该路径下已存在同名文件。',
    invalidRegex: '正则表达式格式错误。',
    chooseTemplate: '选择一个初始模板',
    loadTemplate: '加载模板',
    noFilesMatch: '没有找到匹配的文件。',
    terminalTitle: '虚拟交互终端',
    typeCommandPrompt: "输入 'help' 或执行命令...",
    welcomeTerminal: 'ZipStudio 虚拟终端环境 v1.0.0 (Linux x86_64)',
    typeHelp: '输入 "help" 查看所有支持的交互命令。',
    connectedWorkspace: '已连接项目工作区。当前分支:',
    binaryAsset: '二进制资源文件',
    openInNewWindow: '在新窗口中打开预览',
    sandboxedPreview: '沙箱隔离安全运行',
    searchAcrossWorkspace: '在项目所有文件中全局搜索',
    filesCount: '个文件',
    jumpToLine: '点击行号快速定位到代码行',
    hideReplace: '收起替换',
    toggleReplace: '展开替换',
  },
  ms: {
    appName: 'ZipStudio',
    explorer: 'Penjelajah Fail',
    search: 'Cari dalam Kod',
    sourceControl: 'Kawalan Versi',
    editor: 'Editor',
    code: 'Kod',
    splitView: 'Paparan Pisah',
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
    searchFiles: 'Cari fail...',
    noFilesLoaded: 'Tiada fail dimuatkan',
    noFilesLoadedDesc: 'Import arkib .zip atau pilih templat permulaan.',
    noFileOpen: 'Tiada Fail Dibuka',
    noFileOpenDesc: 'Pilih fail dari penjelajah di sebelah kiri atau import .zip.',
    linesLabel: 'baris',
    spaces: 'Ruang',
    ready: 'Sedia',
    reload: 'Muat Semula Pratonton',
    close: 'Tutup',
    maximize: 'Maksimumkan',
    restore: 'Pulihkan',
    clear: 'Kosongkan',
    decreaseFont: 'Kecilkan Fon',
    increaseFont: 'Besarkan Fon',
    toggleWordWrap: 'Balut Baris',
    diff: 'Perbezaan',
    closeDiff: 'Tutup Perbezaan',
    history: 'Sejarah',
    changes: 'Perubahan',
    allLogs: 'Semua Log',
    errorsOnly: 'Ralat Sahaja',
    warnings: 'Amaran',
    infoLogs: 'Log',
    clearTerminal: 'Kosongkan Terminal',
    clearLogs: 'Kosongkan Log',
    clearGitLogs: 'Kosongkan Log Git',
    noLogs: 'Tiada log konsol pratonton. Log aplikasi akan dipaparkan di sini.',
    noGitLogs: 'Tiada output Git lagi. Sambung ke GitHub atau jalankan kawalan versi.',
    noDiagnostics: 'Tiada ralat sintaks atau binaan ditemui.',
    pushSnapshot: 'Tolak Salinan Projek ke GitHub',
    privateRepo: 'Repositori peribadi',
    cancel: 'Batal',
    create: 'Cipta',
    openPR: 'Buka PR di GitHub',
    reviews: 'semakan',
    matchCase: 'Padan Huruf Besar/Kecil (Alt+C)',
    matchWholeWord: 'Padan Seluruh Perkataan (Alt+W)',
    useRegex: 'Guna Ungkapan Nalar (Alt+R)',
    matchesInFiles: 'padanan dalam fail',
    // Extended keys
    editorViewOnly: 'Kod Sahaja',
    previewViewOnly: 'Pratonton Sahaja',
    toggleTerminal: 'Togol Terminal',
    extendTerminal: 'Panjangkan Terminal',
    minimizeTerminal: 'Minimumkan Terminal',
    maximizeTerminal: 'Maksimumkan Terminal',
    restoreTerminal: 'Pulihkan Terminal',
    resizeTerminal: 'Seret menegak untuk ubah saiz terminal',
    resizeSidebar: 'Seret mendatar untuk ubah saiz bar sisi',
    resizeSplitter: 'Seret mendatar untuk ubah saiz kod & pratonton',
    resetSplit: 'Klik dua kali untuk tetapkan semula pisah 50/50',
    maximizeEditor: 'Maksimumkan Paparan Kod',
    maximizePreview: 'Maksimumkan Paparan HTML',
    commitDirectTooltip: 'Komit dan tolak perubahan terus tanpa menggunakan terminal',
    downloadZipTooltip: 'Muat turun ruang kerja semasa sebagai .zip',
    connectedAs: 'Disambungkan sebagai',
    workspace: 'ruang kerja',
    repoLabel: 'repo',
    generateTokenLink: 'Jana Token ↗',
    createTokenNotice: 'Cipta token klasik dengan skop repo untuk akses baca/tulis penuh.',
    viewOAuthInfo: 'Lihat konfigurasi persediaan OAuth',
    hideOAuthInfo: 'Sembunyikan maklumat OAuth',
    oauthConfiguredLabel: 'CLIENT_ID Telah Dikonfigurasikan',
    oauthNotConfiguredLabel: 'CLIENT_ID Tiada dalam .env',
    callbackUrlLabel: 'URL Panggilan Balik',
    recentCommits: 'Komit Terkini',
    noCommitsYet: 'Tiada komit ditemui dalam cawangan ini.',
    reviewPRTitle: 'Semak PR',
    reviewNotesPlaceholder: 'Tinggalkan komen semakan, maklum balas, atau nota kelulusan...',
    createBranchTitle: 'Cipta Cawangan di GitHub',
    branchFrom: 'Akan bercabang dari',
    branchNamePlaceholder: 'Nama cawangan baharu (cth: feature-login)',
    createRepoTitle: 'Cipta Repositori GitHub Baharu',
    repoNamePlaceholder: 'Nama repositori (cth: aplikasi-hebat)',
    repoDescPlaceholder: 'Penerangan (pilihan)',
    createOnGitHub: 'Cipta di GitHub',
    emptyArchiveAlert: 'Arkib yang dimuat naik kelihatan kosong atau tidak mengandungi fail yang disokong.',
    extractFailed: 'Gagal mengekstrak fail .zip',
    exportFailed: 'Gagal mengeksport arkib',
    fileAlreadyExists: 'Fail dengan laluan ini sudah wujud.',
    invalidRegex: 'Ungkapan nalar tidak sah.',
    chooseTemplate: 'Pilih projek permulaan',
    loadTemplate: 'Muat Templat',
    noFilesMatch: 'Tiada fail sepadan dengan penapis anda.',
    terminalTitle: 'Terminal Maya',
    typeCommandPrompt: "Taip 'help' atau jalankan arahan...",
    welcomeTerminal: 'Persekitaran Maya ZipStudio v1.0.0 (Linux x86_64)',
    typeHelp: 'Taip "help" untuk senarai arahan yang tersedia.',
    connectedWorkspace: 'Disambungkan ke ruang kerja projek. Cawangan aktif:',
    binaryAsset: 'Aset Binari',
    openInNewWindow: 'Buka Pratonton dalam Tetingkap Baharu',
    sandboxedPreview: 'Pelaksanaan Langsung Kotak Pasir',
    searchAcrossWorkspace: 'Cari merentasi semua fail dalam ruang kerja',
    filesCount: 'fail',
    jumpToLine: 'Klik nombor baris untuk melompat ke baris kod',
    hideReplace: 'Sembunyikan Ganti',
    toggleReplace: 'Togol Ganti',
  },
};
