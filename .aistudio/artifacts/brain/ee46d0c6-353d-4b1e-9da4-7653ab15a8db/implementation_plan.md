# ZipStudio Pro: Markdown & Vector Previews, Context Menus, Resizing & Session Recovery

Upgrade ZipStudio with multi-format live previews (Markdown, SVG, and Android Vector Drawables), a full file-system context menu with mobile long-press support, productivity hotkeys, complete mobile viewport and scrolling repair, dynamic Source Control sidebar resizing, live repository loading ETA, and an uncommitted session restore prompt.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and user experience decisions have been aligned based on your preferences:
> - **Session Persistence**: On page startup, ZipStudio will detect any unsaved or uncommitted work from previous sessions and present a prompt allowing you to restore your workspace or start fresh.
> - **Android Vector & SVG Previews**: Render Android Vector Drawable `.xml` files by converting vector paths to interactive SVGs with zoom and pan controls alongside native SVG rendering.
> - **Context Menu Trigger**: 500ms touch-and-hold with haptic touch feel on mobile devices, and standard right-click on desktop.
> - **Template Cleanup**: Completely removes the redundant starter templates to streamline the sidebar.

---

### 1. Overview & Core Concept

ZipStudio is a browser-native web IDE and GitHub repository manager for editing, previewing, and committing zip archives and remote repositories. This update resolves usability friction points and adds requested capabilities:

1. **Multi-Format Previews**: Adds dedicated preview engines for GitHub-flavored Markdown (`.md`), Scalable Vector Graphics (`.svg`), and Android Vector Drawables (`.xml`), featuring interactive pan, zoom, and background grid toggling.
2. **File Explorer Context Menu**: Right-click on desktop or 500ms long-press on mobile brings up a context menu with "Add File" (for folders), "Rename", "Delete", "Download", and a detailed "Properties" modal.
3. **Productivity Hotkeys & Editor Controls**: `Ctrl+Shift+F` for Find in Files, `Ctrl+Z` for Undo, `Ctrl+Y` / `Ctrl+Shift+Z` for Redo, and `Ctrl+Shift+K` / `Ctrl+D` for Delete Line, backed by dedicated toolbar buttons.
4. **Mobile Layout & Scroll Fixes**: Replaces rigid viewport bounds with dynamic `100dvh` flex columns, ensuring the bottom tab bar is always 100% visible and internal views scroll with smooth touch gestures.
5. **Dynamic Source Control Sizing**: Fixes hardcoded width constraints in the GitHub panel so Source Control expands and contracts dynamically with the mouse-resizable sidebar.
6. **Repository Loading with ETA**: Shows file-by-file loading progress, percentage completed, and a live remaining-time countdown during remote tree downloads.
7. **Uncommitted Session History Recovery**: Auto-saves workspace snapshots to browser storage and displays a session restoration dialog upon reload.

---

### 2. User Experience & Visual Design

#### A. Multi-Format Live Preview
- **Markdown (`.md`)**: Rendered using a clean GFM stylesheet with formatted headings, code syntax blocks, task lists, blockquotes, and tables. Includes a toggle to switch between rendered view and raw source.
- **SVG Graphics (`.svg`)**: Interactive viewport rendering with Zoom In, Zoom Out, 100% Reset, and Fit-to-Screen controls, plus a dark/checkerboard background switcher.
- **Android Vector Drawables (`.xml`)**: Automatically detects `<vector>` XML root elements, parses `android:viewportWidth`, `android:viewportHeight`, `android:pathData`, `android:fillColor`, and `android:strokeColor`, and translates them into an interactive SVG preview with zoom/pan and vector inspection.
- **Web App Mode**: For HTML/JS/CSS projects, the existing sandboxed iframe preview remains active with console log streaming.

#### B. File Explorer Context Menu & Modals
- **Trigger**: Desktop secondary click (`contextmenu`) or 500ms continuous press on touch devices.
- **Menu Actions**:
  - `Add File` (visible only on folder nodes): Opens inline file creation under that directory.
  - `Rename`: Opens an inline prompt to rename the node and updates all open tabs and paths.
  - `Delete`: Displays a confirmation prompt before cleanly pruning the file or folder subtree.
  - `Download`: Immediately downloads the selected file, or packages the folder as a standalone `.zip`.
  - `Properties`: Opens a modal displaying File Name, Relative Path, MIME/Format, File Size (bytes & formatted KB), Line Count, and Last Modified timestamp.

#### C. Mobile Viewport & Ergonomics
- Fixed container using `h-[100dvh] max-h-[100dvh] overflow-hidden` preventing the browser URL bar from pushing the bottom navigation offscreen.
- Pinned bottom tab bar with `pb-safe h-16` ensuring tap targets satisfy the $44 \times 44\text{px}$ touch standard.
- Inner view containers configured with `overflow-y-auto overscroll-contain` to enable smooth vertical finger scrolling on phones and tablets.

#### D. Productivity Hotkeys & Action Bar
- Added quick action buttons in the editor header:
  - **Undo** (`Ctrl+Z`)
  - **Redo** (`Ctrl+Y` / `Ctrl+Shift+Z`)
  - **Delete Line** (`Ctrl+Shift+K` / `Ctrl+D`)
  - **Find in Files** (`Ctrl+Shift+F`)
- Line numbers remain accurately aligned with the editor text during rapid scrolling and editing.

#### E. Repository Loading Progress & ETA
- When downloading remote repository trees from GitHub:
  - Visual progress bar with percentage indicator.
  - Live throughput and ETA counter: *"Loading repository: 24 / 80 files (30%) · Estimated: ~3s remaining"*.

#### F. Session Recovery Modal
- Upon startup, if an uncommitted session is detected:
  - A modal banner notifies: *"Unsaved session from [Time] ([X] files). Would you like to resume your work?"*
  - Actions: `[Restore Workspace]` (restores files and active tab) or `[Start Fresh]` (dismisses).

---

### 3. Key Product Decisions & Trade-Offs

- **Android Vector XML Parsing**:
  - *Chosen Approach*: Client-side XML DOM parsing that extracts `<vector>`, `<path>`, and `<group>` elements and renders them directly via an inline SVG renderer.
  - *Why*: Zero external heavyweight dependencies, instant rendering, and full compatibility with Android Studio vector assets without server processing.
- **Client Storage for Session History**:
  - *Chosen Approach*: Debounced local session snapshots (1s debounce) storing active files, diffs, open tabs, and timestamps.
  - *Why*: Eliminates accidental data loss when the browser refreshes or disconnects from GitHub, while honoring user preference for a clear startup restoration prompt.
- **Source Control Sidebar Sizing**:
  - *Chosen Approach*: Remove hardcoded `w-80` classes from `GitHubPanel` and inherit the parent's `sidebarWidth` state (`180px` to `520px`).
  - *Why*: Allows users to extend or minimize the sidebar freely, with Source Control, Explorer, and Search respecting the user's chosen layout.
- **Templates Removal**:
  - *Chosen Approach*: Completely strip template modals, button references, and default boilerplate templates.
  - *Why*: Declutters the workspace header and file explorer so users can focus on their own code, imported zip files, and GitHub repositories.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          ZipStudio Workspace                           │
├────────────────────────────────────────────────────────────────────────┤
│ Top App Bar: App Name | Active Repo | Language (EN/ZH/MY) | Commit     │
├──────────────┬─────────────────────────────┬───────────────────────────┤
│ Activity Bar │ Resizable Sidebar           │ Editor & Preview Panes    │
│  [Explorer]  │  • File Tree (Context Menu) │  • Code Editor (Hotkeys)  │
│  [Search]    │  • Search in Code           │  • Multi-Format Preview:  │
│  [Git Sync]  │  • GitHub Source Control    │    - Markdown (.md)       │
│              │    (Matches Sidebar Width)  │    - SVG (.svg)           │
│              │                             │    - Vector XML (.xml)    │
│              │                             │    - Sandboxed Web App    │
├──────────────┴─────────────────────────────┴───────────────────────────┤
│ Mouse Resizable Terminal & Console Logs (Ctrl+` or Bottom Handle)       │
├────────────────────────────────────────────────────────────────────────┤
│ Background Services: Session Storage Autosave | Loading ETA Estimator  │
└────────────────────────────────────────────────────────────────────────┘
```

#### State & Storage Flow
1. **Workspace Store**:
   - `files: Record<string, VFile>`
   - `baseFiles: Record<string, VFile>`
   - `activeFilePath: string | null`
   - `openTabs: string[]`
   - `sidebarWidth: number`
   - `terminalHeight: number`
2. **Context Menu State**:
   - `contextMenu: { visible: boolean, x: number, y: number, node: FileTreeNode | null }`
   - `propertiesModalNode: FileTreeNode | null`
   - `renameModalNode: FileTreeNode | null`
3. **Session Persistence Store (`localStorage`)**:
   - Key: `zipstudio_saved_session`
   - Fields: `files`, `baseFiles`, `activeFilePath`, `openTabs`, `timestamp`, `repoName`
   - Debounced save: triggers 1000ms after the last file modification.
4. **Android Vector Engine**:
   - Parses `<vector android:width="..." android:height="..." android:viewportWidth="..." android:viewportHeight="...">`
   - Maps child `<path android:pathData="..." android:fillColor="..." android:strokeColor="..." android:strokeWidth="...">` to SVG `<path d="..." fill="..." stroke="..." stroke-width="..." />`.
