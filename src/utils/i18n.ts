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
  // Context Menu & File Ops
  addFile: string;
  rename: string;
  download: string;
  properties: string;
  fileProperties: string;
  filePath: string;
  fileSize: string;
  fileType: string;
  fileLines: string;
  lastModified: string;
  renameFile: string;
  renameFolder: string;
  enterNewName: string;
  deleteConfirm: string;
  // Hotkeys & Buttons
  undo: string;
  redo: string;
  deleteLine: string;
  findInFiles: string;
  // Session Recovery
  restoreSessionTitle: string;
  restoreSessionDesc: string;
  restoreSession: string;
  startFresh: string;
  // Progress & Preview
  estimatedTime: string;
  estimatedRemaining: string;
  vectorPreview: string;
  markdownPreview: string;
  webAppPreview: string;
  zoomIn: string;
  zoomOut: string;
  resetZoom: string;
  fitToScreen: string;
  toggleBackground: string;
  pathsCount: string;
  codeOnly: string;
  splitEditorPreview: string;
  previewOnly: string;
  hideTerminal: string;
  showTerminal: string;
  fileCountLabel: string;
  findInFile: string;
  replaceInFile: string;
  nextMatch: string;
  prevMatch: string;
  noMatches: string;
  syntaxHighlighting: string;
  // Settings Modal
  settingsTitle: string;
  settingsSubtitle: string;
  appearanceTab: string;
  editorTab: string;
  collabTab: string;
  workspaceTab: string;
  colorTheme: string;
  darkMode: string;
  lightMode: string;
  systemAuto: string;
  languageLabel: string;
  codeEditorFont: string;
  editorFontSize: string;
  tabSizeLabel: string;
  twoSpaces: string;
  fourSpaces: string;
  wordWrapLabel: string;
  wordWrapDesc: string;
  lineNumbersLabel: string;
  lineNumbersDesc: string;
  collabSettings: string;
  autoConnectLabel: string;
  autoConnectDesc: string;
  displayNameLabel: string;
  displayNamePlaceholder: string;
  cursorColorLabel: string;
  workspaceMaintenance: string;
  cachedFilesLabel: string;
  clearWorkspaceTitle: string;
  clearWorkspaceDesc: string;
  clearWorkspaceBtn: string;
  confirmClear: string;
  confirmClearWarning: string;
  resetToDefaults: string;
  done: string;
  // Media & Audio Player
  audioReady: string;
  liveSpectrum: string;
  barsMode: string;
  waveMode: string;
  loopLabel: string;
  replayTenSec: string;
  forwardTenSec: string;
  mute: string;
  unmute: string;
  play: string;
  pause: string;
  speed: string;
  downloadOriginal: string;
  // Font Specimen Viewer
  sampleTextTab: string;
  glyphMatrixTab: string;
  waterfallTab: string;
  customPreviewText: string;
  typeCustomText: string;
  sizeLabel: string;
  spacingLabel: string;
  italicStyle: string;
  reset: string;
  uppercaseChars: string;
  lowercaseChars: string;
  numericChars: string;
  symbolChars: string;
  // Binary & APK Archive Inspector
  archiveContents: string;
  manifestInspector: string;
  appPackage: string;
  permissionsLabel: string;
  rawXml: string;
  noDecodedManifest: string;
  totalEntries: string;
  // Common App Headers & Drag Overlay
  liveCollaboration: string;
  settingsLabel: string;
  dragFolderNotice: string;
  createLocalRepo: string;
  repoCreatedSuccess: string;
  currentRepoLabel: string;
  localWorkspace: string;
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
    // Context Menu & File Ops
    addFile: 'Add File',
    rename: 'Rename',
    download: 'Download',
    properties: 'Properties',
    fileProperties: 'File Properties',
    filePath: 'Full Path',
    fileSize: 'File Size',
    fileType: 'Type',
    fileLines: 'Total Lines',
    lastModified: 'Last Modified',
    renameFile: 'Rename File',
    renameFolder: 'Rename Folder',
    enterNewName: 'Enter new name:',
    deleteConfirm: 'Are you sure you want to delete this item? This action cannot be undone.',
    // Hotkeys & Buttons
    undo: 'Undo (Ctrl+Z)',
    redo: 'Redo (Ctrl+Y)',
    deleteLine: 'Delete Line (Ctrl+Shift+K)',
    findInFiles: 'Find in Files (Ctrl+Shift+F)',
    // Session Recovery
    restoreSessionTitle: 'Unsaved Session Detected',
    restoreSessionDesc: 'You have uncommitted files and work in progress from a previous session.',
    restoreSession: 'Restore Session',
    startFresh: 'Start Fresh',
    // Progress & Preview
    estimatedTime: 'Estimated Time',
    estimatedRemaining: 'remaining',
    vectorPreview: 'Vector Graphic (.xml)',
    markdownPreview: 'Rendered Markdown (.md)',
    webAppPreview: 'Web App Preview',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    resetZoom: 'Reset Zoom (100%)',
    fitToScreen: 'Fit to Screen',
    toggleBackground: 'Toggle Background Grid',
    pathsCount: 'vector paths',
    codeOnly: 'Code Only',
    splitEditorPreview: 'Split Editor & Preview',
    previewOnly: 'Preview Only',
    hideTerminal: 'Hide Terminal',
    showTerminal: 'Show Terminal',
    fileCountLabel: 'File Count',
    findInFile: 'Find in file',
    replaceInFile: 'Replace in file',
    nextMatch: 'Next Match (Enter)',
    prevMatch: 'Previous Match (Shift+Enter)',
    noMatches: 'No matches',
    syntaxHighlighting: 'Syntax Highlighting',
    // Settings Modal
    settingsTitle: 'ZipStudio Settings',
    settingsSubtitle: 'Theme, Language, Editor, and Drag & Drop',
    appearanceTab: 'Appearance & Language',
    editorTab: 'Editor',
    collabTab: 'Live Collab',
    workspaceTab: 'Workspace',
    colorTheme: 'Color Theme',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    systemAuto: 'System Auto',
    languageLabel: 'Language',
    codeEditorFont: 'Code Editor Font',
    editorFontSize: 'Editor Font Size',
    tabSizeLabel: 'Indentation (Tab Size)',
    twoSpaces: '2 spaces (Default)',
    fourSpaces: '4 spaces',
    wordWrapLabel: 'Word Wrap',
    wordWrapDesc: 'Wrap long code lines to prevent horizontal scrolling',
    lineNumbersLabel: 'Line Numbers',
    lineNumbersDesc: 'Display line numbers in editor gutter',
    collabSettings: 'Live Collaboration Preferences',
    autoConnectLabel: 'Auto-Connect Collab',
    autoConnectDesc: 'Automatically discover and join peer mesh in current workspace',
    displayNameLabel: 'Display Name in Session',
    displayNamePlaceholder: 'e.g. Alex, Designer...',
    cursorColorLabel: 'Cursor & Presence Color',
    workspaceMaintenance: 'Workspace Storage & Maintenance',
    cachedFilesLabel: 'Cached Project Files',
    clearWorkspaceTitle: 'Clear Workspace & Reset Storage',
    clearWorkspaceDesc: 'Removes all current files and restores the default starting project',
    clearWorkspaceBtn: 'Reset Workspace',
    confirmClear: 'Confirm Clear',
    confirmClearWarning: 'Are you sure? All unsaved edits will be permanently wiped.',
    resetToDefaults: 'Reset to Defaults',
    done: 'Done',
    // Media & Audio Player
    audioReady: 'Audio Ready',
    liveSpectrum: 'Live Audio Spectrum (Web Audio API)',
    barsMode: 'Bars',
    waveMode: 'Wave',
    loopLabel: 'Loop',
    replayTenSec: 'Replay 10 seconds',
    forwardTenSec: 'Forward 10 seconds',
    mute: 'Mute',
    unmute: 'Unmute',
    play: 'Play',
    pause: 'Pause',
    speed: 'Speed',
    downloadOriginal: 'Download original file',
    // Font Specimen Viewer
    sampleTextTab: 'Sample Text',
    glyphMatrixTab: 'Glyph Matrix',
    waterfallTab: 'Type Waterfall',
    customPreviewText: 'Custom Preview Text',
    typeCustomText: 'Type custom text...',
    sizeLabel: 'Size',
    spacingLabel: 'Spacing',
    italicStyle: 'Italic Style',
    reset: 'Reset',
    uppercaseChars: 'Uppercase Characters (A-Z)',
    lowercaseChars: 'Lowercase Characters (a-z)',
    numericChars: 'Numbers (0-9)',
    symbolChars: 'Symbols & Punctuation',
    // Binary & APK Archive Inspector
    archiveContents: 'Archive Contents',
    manifestInspector: 'AndroidManifest.xml Inspector',
    appPackage: 'App Package',
    permissionsLabel: 'Permissions',
    rawXml: 'Raw Decoded XML',
    noDecodedManifest: 'No readable AndroidManifest found',
    totalEntries: 'Total entries',
    // Common App Headers & Drag Overlay
    liveCollaboration: 'Live Collaboration',
    settingsLabel: 'Settings',
    dragFolderNotice: 'Drop ZIP file or folder to import',
    createLocalRepo: 'Create Local Repository',
    repoCreatedSuccess: 'Repository created successfully!',
    currentRepoLabel: 'Active Repository',
    localWorkspace: 'Local Workspace',
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
    // Context Menu & File Ops
    addFile: '新建文件',
    rename: '重命名',
    download: '下载',
    properties: '属性',
    fileProperties: '文件属性',
    filePath: '完整路径',
    fileSize: '文件大小',
    fileType: '类型',
    fileLines: '代码行数',
    lastModified: '修改时间',
    renameFile: '重命名文件',
    renameFolder: '重命名文件夹',
    enterNewName: '输入新名称:',
    deleteConfirm: '确定要删除该项吗？此操作无法撤销。',
    // Hotkeys & Buttons
    undo: '撤销 (Ctrl+Z)',
    redo: '重做 (Ctrl+Y)',
    deleteLine: '删除整行 (Ctrl+Shift+K)',
    findInFiles: '全局查找 (Ctrl+Shift+F)',
    // Session Recovery
    restoreSessionTitle: '发现未提交的工作会话',
    restoreSessionDesc: '检测到您上次有未提交的代码与工作区文件。',
    restoreSession: '恢复工作区',
    startFresh: '重新开始',
    // Progress & Preview
    estimatedTime: '预计时间',
    estimatedRemaining: '剩余',
    vectorPreview: '矢量图形 (.xml)',
    markdownPreview: '渲染 Markdown (.md)',
    webAppPreview: 'Web 应用预览',
    zoomIn: '放大',
    zoomOut: '缩小',
    resetZoom: '重置缩放 (100%)',
    fitToScreen: '适应窗口',
    toggleBackground: '切换背景网格',
    pathsCount: '条矢量路径',
    codeOnly: '仅代码',
    splitEditorPreview: '分屏代码与预览',
    previewOnly: '仅预览',
    hideTerminal: '隐藏终端',
    showTerminal: '显示终端',
    fileCountLabel: '文件数量',
    findInFile: '在当前文件中查找',
    replaceInFile: '替换当前文件内容',
    nextMatch: '下一个匹配 (Enter)',
    prevMatch: '上一个匹配 (Shift+Enter)',
    noMatches: '无匹配结果',
    syntaxHighlighting: '代码高亮',
    // Settings Modal
    settingsTitle: 'ZipStudio 设置',
    settingsSubtitle: '主题、语言、编辑器与拖拽设置',
    appearanceTab: '外观与语言',
    editorTab: '编辑器',
    collabTab: '实时协同',
    workspaceTab: '工作区',
    colorTheme: '颜色主题',
    darkMode: '深色模式',
    lightMode: '浅色模式',
    systemAuto: '跟随系统',
    languageLabel: '界面语言',
    codeEditorFont: '代码编辑器字体',
    editorFontSize: '编辑器字号',
    tabSizeLabel: '缩进大小 (Tab Size)',
    twoSpaces: '2 空格 (默认)',
    fourSpaces: '4 空格',
    wordWrapLabel: '自动换行',
    wordWrapDesc: '长代码行自动折行，避免横向滚动',
    lineNumbersLabel: '行号显示',
    lineNumbersDesc: '在编辑器左侧栏显示代码行号',
    collabSettings: '实时协作偏好设置',
    autoConnectLabel: '自动连接协同网络',
    autoConnectDesc: '自动发现并加入当前工作区的对等协同网',
    displayNameLabel: '协同会话显示名称',
    displayNamePlaceholder: '例如：小明、架构师...',
    cursorColorLabel: '光标与在线指示颜色',
    workspaceMaintenance: '工作区存储与维护',
    cachedFilesLabel: '已缓存的项目文件',
    clearWorkspaceTitle: '清空工作区并重置存储',
    clearWorkspaceDesc: '清除所有当前文件并恢复默认起始项目',
    clearWorkspaceBtn: '重置工作区',
    confirmClear: '确认清空',
    confirmClearWarning: '确定重置吗？所有未保存的代码修改将被永久清空。',
    resetToDefaults: '恢复默认设置',
    done: '完成',
    // Media & Audio Player
    audioReady: '音频就绪',
    liveSpectrum: '实时音频频谱 (Web Audio API)',
    barsMode: '频谱柱',
    waveMode: '声波图',
    loopLabel: '循环播放',
    replayTenSec: '后退 10 秒',
    forwardTenSec: '快进 10 秒',
    mute: '静音',
    unmute: '取消静音',
    play: '播放',
    pause: '暂停',
    speed: '倍速',
    downloadOriginal: '下载原始文件',
    // Font Specimen Viewer
    sampleTextTab: '文本预览',
    glyphMatrixTab: '字形矩阵',
    waterfallTab: '字号阶梯',
    customPreviewText: '自定义预览文本',
    typeCustomText: '输入自定义文本...',
    sizeLabel: '字号',
    spacingLabel: '字距',
    italicStyle: '斜体样式',
    reset: '重置',
    uppercaseChars: '大写字母 (A-Z)',
    lowercaseChars: '小写字母 (a-z)',
    numericChars: '数字 (0-9)',
    symbolChars: '符号与标点',
    // Binary & APK Archive Inspector
    archiveContents: '压缩包内容',
    manifestInspector: 'AndroidManifest.xml 检查器',
    appPackage: '应用包名',
    permissionsLabel: '权限声明',
    rawXml: '原始已解码 XML',
    noDecodedManifest: '未找到可读的 AndroidManifest',
    totalEntries: '总条目数',
    // Common App Headers & Drag Overlay
    liveCollaboration: '实时协同',
    settingsLabel: '设置',
    dragFolderNotice: '拖放 ZIP 压缩包或文件夹以导入',
    createLocalRepo: '创建本地仓库',
    repoCreatedSuccess: '仓库创建成功！',
    currentRepoLabel: '当前活跃仓库',
    localWorkspace: '本地工作区',
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
    // Context Menu & File Ops
    addFile: 'Tambah Fail',
    rename: 'Namakan Semula',
    download: 'Muat Turun',
    properties: 'Ciri-ciri',
    fileProperties: 'Ciri-ciri Fail',
    filePath: 'Laluan Penuh',
    fileSize: 'Saiz Fail',
    fileType: 'Jenis',
    fileLines: 'Jumlah Baris',
    lastModified: 'Terakhir Diubah Suai',
    renameFile: 'Namakan Semula Fail',
    renameFolder: 'Namakan Semula Folder',
    enterNewName: 'Masukkan nama baharu:',
    deleteConfirm: 'Adakah anda pasti mahu memadamkan item ini? Tindakan ini tidak boleh dibuat asal.',
    // Hotkeys & Buttons
    undo: 'Buat Asal (Ctrl+Z)',
    redo: 'Buat Semula (Ctrl+Y)',
    deleteLine: 'Padam Baris (Ctrl+Shift+K)',
    findInFiles: 'Cari dalam Fail (Ctrl+Shift+F)',
    // Session Recovery
    restoreSessionTitle: 'Sesi Belum Disimpan Dikesan',
    restoreSessionDesc: 'Anda mempunyai fail belum dikomit dari sesi terdahulu.',
    restoreSession: 'Pulihkan Sesi',
    startFresh: 'Mula Baharu',
    // Progress & Preview
    estimatedTime: 'Anggaran Masa',
    estimatedRemaining: 'baki',
    vectorPreview: 'Grafik Vektor (.xml)',
    markdownPreview: 'Markdown Diterjemah (.md)',
    webAppPreview: 'Pratonton Aplikasi Web',
    zoomIn: 'Zum Masuk',
    zoomOut: 'Zum Keluar',
    resetZoom: 'Tetapkan Semula Zum (100%)',
    fitToScreen: 'Muat ke Skrin',
    toggleBackground: 'Togol Grid Latar Belakang',
    pathsCount: 'laluan vektor',
    codeOnly: 'Kod Sahaja',
    splitEditorPreview: 'Pisahkan Editor & Pratonton',
    previewOnly: 'Pratonton Sahaja',
    hideTerminal: 'Sembunyikan Terminal',
    showTerminal: 'Tunjukkan Terminal',
    fileCountLabel: 'Jumlah Fail',
    findInFile: 'Cari dalam fail',
    replaceInFile: 'Ganti dalam fail',
    nextMatch: 'Padanan Seterusnya (Enter)',
    prevMatch: 'Padanan Sebelumnya (Shift+Enter)',
    noMatches: 'Tiada padanan',
    syntaxHighlighting: 'Penyerlah Sintaks',
    // Settings Modal
    settingsTitle: 'Tetapan ZipStudio',
    settingsSubtitle: 'Tema, Bahasa, Editor dan Seret & Lepas',
    appearanceTab: 'Rupa & Bahasa',
    editorTab: 'Editor',
    collabTab: 'Kolaborasi Langsung',
    workspaceTab: 'Ruang Kerja',
    colorTheme: 'Tema Warna',
    darkMode: 'Mod Gelap',
    lightMode: 'Mod Cerah',
    systemAuto: 'Auto Sistem',
    languageLabel: 'Bahasa',
    codeEditorFont: 'Fon Editor Kod',
    editorFontSize: 'Saiz Fon Editor',
    tabSizeLabel: 'Saiz Lekukan (Tab)',
    twoSpaces: '2 ruang (Lalai)',
    fourSpaces: '4 ruang',
    wordWrapLabel: 'Balut Teks',
    wordWrapDesc: 'Balut baris kod panjang untuk elak penatalan mendatar',
    lineNumbersLabel: 'Nombor Baris',
    lineNumbersDesc: 'Papar nombor baris di tepi editor',
    collabSettings: 'Pilihan Kolaborasi Langsung',
    autoConnectLabel: 'Sambung Auto Kolaborasi',
    autoConnectDesc: 'Cari dan sertai rangkaian rakan di ruang kerja ini secara automatik',
    displayNameLabel: 'Nama Paparan Sesi',
    displayNamePlaceholder: 'cth. Alex, Pereka...',
    cursorColorLabel: 'Warna Kursor & Kehadiran',
    workspaceMaintenance: 'Penyimpanan & Penyelenggaraan Ruang Kerja',
    cachedFilesLabel: 'Fail Projek Tersembunyi',
    clearWorkspaceTitle: 'Kosongkan Ruang Kerja & Set Semula',
    clearWorkspaceDesc: 'Memadam semua fail semasa dan memulihkan projek permulaan lalai',
    clearWorkspaceBtn: 'Set Semula Ruang Kerja',
    confirmClear: 'Sahkan Kosongkan',
    confirmClearWarning: 'Adakah anda pasti? Semua suntingan belum disimpan akan dipadamkan.',
    resetToDefaults: 'Pulihkan Nilai Lalai',
    done: 'Selesai',
    // Media & Audio Player
    audioReady: 'Audio Sedia',
    liveSpectrum: 'Spektrum Audio Langsung (Web Audio API)',
    barsMode: 'Palang',
    waveMode: 'Gelombang',
    loopLabel: 'Ulang',
    replayTenSec: 'Undur 10 saat',
    forwardTenSec: 'Maju 10 saat',
    mute: 'Bisu',
    unmute: 'Nyahbisu',
    play: 'Main',
    pause: 'Jeda',
    speed: 'Kelajuan',
    downloadOriginal: 'Muat turun fail asal',
    // Font Specimen Viewer
    sampleTextTab: 'Teks Contoh',
    glyphMatrixTab: 'Matriks Glif',
    waterfallTab: 'Tangga Saiz',
    customPreviewText: 'Teks Pratonton Tersuai',
    typeCustomText: 'Taip teks tersuai...',
    sizeLabel: 'Saiz',
    spacingLabel: 'Jarak',
    italicStyle: 'Gaya Italik',
    reset: 'Set Semula',
    uppercaseChars: 'Huruf Besar (A-Z)',
    lowercaseChars: 'Huruf Kecil (a-z)',
    numericChars: 'Nombor (0-9)',
    symbolChars: 'Simbol & Tanda Baca',
    // Binary & APK Archive Inspector
    archiveContents: 'Kandungan Arkib',
    manifestInspector: 'Pemeriksa AndroidManifest.xml',
    appPackage: 'Pakej Apl',
    permissionsLabel: 'Keizinan',
    rawXml: 'XML Dinyahkod Mentah',
    noDecodedManifest: 'Tiada AndroidManifest boleh dibaca ditemui',
    totalEntries: 'Jumlah entri',
    // Common App Headers & Drag Overlay
    liveCollaboration: 'Kolaborasi Langsung',
    settingsLabel: 'Tetapan',
    dragFolderNotice: 'Lepaskan fail ZIP atau folder untuk import',
    createLocalRepo: 'Cipta Repositori Tempatan',
    repoCreatedSuccess: 'Repositori berjaya dicipta!',
    currentRepoLabel: 'Repositori Aktif',
    localWorkspace: 'Ruang Kerja Tempatan',
  },
};
