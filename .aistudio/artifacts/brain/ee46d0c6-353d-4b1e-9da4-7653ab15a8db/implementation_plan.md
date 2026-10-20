# Media Playback, Font Specimen Viewer, MD3E Animations & Source Control Commit History

A comprehensive upgrade to stabilize all binary asset formats (.mp3, .ttf, .otf, .mp4, etc.), add rich interactive media and font players, implement Material Design 3 Expressive entry/exit animations for menus and dialogs, enforce Undo/Redo button availability states, and display complete GitHub repository commit history in Source Control.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> - **Font Previews**: Fonts (.ttf, .otf, .woff, .woff2) will be rendered in a dedicated typography specimen viewer in both the Editor and Preview panes, featuring custom sample text input, a live font size slider, an alphabet glyph specimen grid, and a typography waterfall.
> - **Media Playback**: Audio (.mp3, .ogg, .wav) and video (.mp4, .webm, .mkv) files will use a tailored Material 3 media player with responsive playback controls, duration, track title, and format badge.
> - **Binary Crash Prevention**: All media and font extensions will be registered in `isBinaryExtension` and `getMimeType`, preventing raw binary decoding errors and memory spikes.
> - **Source Control History**: Will fetch and display the remote GitHub repository's actual commit log (`/repos/:owner/:repo/commits`), showing commit SHA, message, author name, timestamp, and branch details.

---

### 1. Overview & Core Concept

1. **Crash Prevention & Safe Binary Handling**:
   - Update `isBinaryExtension` and `getMimeType` to support all font types (`ttf`, `otf`, `woff`, `woff2`, `eot`) and media types (`mp3`, `wav`, `ogg`, `mp4`, `webm`, `mkv`, `aac`, `flac`, `m4a`).
   - Fix `gitService.ts` blob fetching to detect all binary types using a centralized extension matcher and construct proper data URLs (`data:audio/mp3;base64,...`, `data:font/ttf;base64,...`, `data:video/mp4;base64,...`) instead of falling back to text decoding or `data:image/` URLs.

2. **Interactive Font Specimen Viewer**:
   - When a font file is selected, dynamically load and register the font using standard Web Font APIs (`@font-face` with base64 data URL).
   - Display font metadata (format, size, font name).
   - Editable live preview sentence ("The quick brown fox jumps over the lazy dog").
   - Font scale slider (12px to 96px).
   - Character matrix displaying Uppercase (A-Z), Lowercase (a-z), Numerals (0-9), and Symbols (!@#$%...).
   - Typographic scale waterfall (12px, 14px, 16px, 20px, 24px, 32px, 48px, 64px).

3. **Playable Audio & Video Player**:
   - Provide an integrated player directly within the Editor and Preview panes.
   - For audio: track title, audio player controls, duration, file size, and animated waveform effect.
   - For video: standard responsive video player container with native controls and format indicator.

4. **MD3E Spring Animations for Dialogs & Context Menu**:
   - Enhance the right-click/long-press context menu with Material 3 Expressive spring animation: `scale(0.92) -> scale(1.0)` with `opacity: 0 -> 1` and `cubic-bezier(0.34, 1.56, 0.64, 1)`.
   - Upgrade modal dialogs (Session Restore, Rename, Delete confirmation) with MD3E backdrop blur and expressive scale/bounce transitions.

5. **Undo/Redo Button Disabled State**:
   - Track `historyPointer` and `historyStack.length` in `Editor.tsx`.
   - Grey out Undo (`opacity-30 cursor-not-allowed disabled:pointer-events-none`) when pointer is at 0.
   - Grey out Redo (`opacity-30 cursor-not-allowed disabled:pointer-events-none`) when pointer is at the top of the stack.

6. **Source Control Remote Commit History**:
   - Add GitHub API integration to fetch commits from `/repos/:owner/:repo/commits`.
   - Display commit author, avatar, relative date, full commit message, and short commit hash.
   - Provide fallback to local session commits when offline or unauthenticated.

---

### 2. User Experience & Visual Design

```
┌────────────────────────────────────────────────────────────────────────┐
│ Editor Header: active file tab, lang badge, Undo [disabled] Redo [off]  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │  Font Specimen Viewer / Media Player Card                    │     │
│   │                                                              │     │
│   │  Aa  Inter-Bold.ttf (142 KB)                                 │     │
│   │  Sample: [ The quick brown fox jumps over the lazy dog   ]   │     │
│   │  Size: [ ───●────────────────── ] 36px                       │     │
│   │                                                              │     │
│   │  ABCDEFGHIJKLMNOPQRSTUVWXYZ                                  │     │
│   │  abcdefghijklmnopqrstuvwxyz 0123456789                       │     │
│   └──────────────────────────────────────────────────────────────┘     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

- **Right-Click Context Menu**:
  - Spring-morph entry from cursor position.
  - Smooth rounded-2xl container (`rounded-2xl shadow-2xl border border-[#43474e]/40`).
- **Modal Dialogs**:
  - MD3E dialog scale curve `cubic-bezier(0.34, 1.56, 0.64, 1)`.

---

### 3. Technical Architecture & File Changes

```
┌────────────────────────┐      ┌──────────────────────────────┐
│     gitService.ts      │ ───► │        fileSystem.ts         │
│  Centralized binary    │      │  MIME & binary detection     │
│  fetching & commit API │      │  (.mp3, .otf, .ttf, .mp4)    │
└────────────────────────┘      └──────────────────────────────┘
            │                                  │
            ▼                                  ▼
┌────────────────────────┐      ┌──────────────────────────────┐
│       Editor.tsx       │      │         Preview.tsx          │
│  - Font Specimen View  │      │  - Audio & Video Player      │
│  - Audio/Video Player  │      │  - Font Specimen Rendering   │
│  - Undo/Redo States    │      │  - MD3E Animation Transitions│
└────────────────────────┘      └──────────────────────────────┘
            │                                  │
            ▼                                  ▼
┌────────────────────────┐      ┌──────────────────────────────┐
│     Sidebar.tsx        │      │      GitHubPanel.tsx         │
│  - MD3E Context Menu   │      │  - Repo Commit History API   │
│  - Animated Dialogs    │      │  - Remote Commit Cards       │
└────────────────────────┘      └──────────────────────────────┘
```

1. **`src/utils/fileSystem.ts`**:
   - Add `.otf`, `.ttf`, `.woff`, `.woff2`, `.eot`, `.mp3`, `.wav`, `.ogg`, `.mp4`, `.webm`, `.mkv`, `.flac`, `.aac` to `isBinaryExtension` and `getMimeType`.
2. **`src/utils/gitService.ts`**:
   - Fix `fetchRepoTree` binary regex to include `.otf`, `.woff`, `.woff2`, `.mp4`, `.webm`, `.ogg`, `.mkv`.
   - Build MIME-accurate data URLs (`getMimeType(ext)`).
   - Add `fetchRepoCommits(owner, repo, branch)` to fetch remote GitHub commit history.
3. **`src/components/Editor.tsx`**:
   - Provide integrated font specimen and media playback cards for binary files.
   - Maintain `canUndo` / `canRedo` state and disable buttons when stacks are empty.
4. **`src/components/Preview.tsx`**:
   - Support dedicated previews for fonts and audio/video files in addition to Markdown and SVG/Vector.
5. **`src/components/Sidebar.tsx`**:
   - Add MD3E spring physics animations to the context menu and rename/properties modals.
6. **`src/components/GitHubPanel.tsx`**:
   - Upgrade the History view to fetch and display the repository's real commit timeline with commit hashes, author info, and commit messages.

---

### 4. Verification Plan

1. **Compilation**: Run `compile_applet` and `lint_applet` to ensure TypeScript builds cleanly with zero errors.
2. **Font Preview Test**: Verify `.ttf` and `.otf` files open smoothly in Editor and Preview without crashing, displaying the interactive font specimen and glyphs.
3. **Audio/Video Playback Test**: Verify `.mp3`, `.mp4`, `.ogg`, and `.webm` files display an interactive player with working controls.
4. **Undo/Redo States**: Verify Undo and Redo buttons are greyed out (`disabled`) when no undo or redo actions are available, and become enabled as changes are made.
5. **Animations**: Test right-click and mobile long-press context menu entry transitions and dialog animations.
6. **Commit History**: Verify Source Control displays the repository's remote commit history.
