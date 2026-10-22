# Inkwell — project context for Claude Code

A lightweight, cross-platform markdown editor. Desktop-first (macOS), built so the
same React UI can later target iOS/Android. Keep it lean — "lightweight" is a
product value, not just a nice-to-have.

## Stack & why
- **Tauri 2** (Rust core + system WebView) — tiny binaries, no bundled Chromium, and
  iOS/Android reachable from one codebase later. Chosen over SwiftUI specifically to
  keep Android open; the React frontend is the portable asset.
- **React 19 + Vite 8**, **CodeMirror 6** (`@uiw/react-codemirror`) for the editor,
  **react-markdown + remark-gfm** for preview, **zustand** for state.

## Run
```zsh
npm install
npm run tauri dev     # first run compiles the Rust core (minutes), then hot-reloads
npm run tauri build   # .app + .dmg in src-tauri/target/release/bundle/
```
Requires Rust on PATH (`source "$HOME/.cargo/env"`), Node 20+, Xcode CLT.

## Gotcha already hit
Tauri enforces that each `@tauri-apps/*` npm package and its matching Rust crate sit
on the same major/minor. The Rust crates float (Cargo uses `"2"`); if the JS side
lags, the build errors. Fix: `npm install @tauri-apps/api@latest @tauri-apps/cli@latest @tauri-apps/plugin-dialog@latest`.

## File map
```
src/
  App.tsx                 shell: toolbar, layout, resizable split, ⌘-shortcuts
  components/
    Sidebar.tsx           collapsible file tree
    Tabs.tsx              open-file tabs + dirty dots
    Editor.tsx            CodeMirror 6, palette-matched theme, line-wrap
    Preview.tsx           react-markdown + GFM; task toggles, links, copy buttons
  state/store.ts          zustand: folder, tree, tabs, activeTab, viewMode, themePref/theme
  lib/fs.ts               invoke() bridge + native open/save dialogs
  lib/useScrollSync.ts    editor ⇄ preview scroll sync
  styles.css              design tokens + light/dark themes
src-tauri/
  src/commands.rs         read_directory, read_file, write_file
  src/lib.rs              Tauri builder + command registration + plugins
  tauri.conf.json         window, bundle; identifier is PLACEHOLDER com.inkwell.editor
  capabilities/default.json
```

## Conventions
- Markdown is the source of truth; the editor buffer is plain text.
- Rust command arg names are single words (`path`, `contents`) so JS/Rust casing matches.
- Custom Rust commands need no capability entry; plugins do (see capabilities/default.json).
- Change the bundle identifier before any code signing.

## Current state
Editor and preview are both interactive:
- Task checkboxes toggle `[ ]`/`[x]` in source. Mapping uses the `li` hast node's
  `position.start.offset` (not an Nth-marker count), so code fences can't misalign it.
- Links (http/https/mailto/tel) open via `@tauri-apps/plugin-opener`; relative links are
  swallowed for now (opening linked .md files in a tab is a natural next step).
- Split-view scroll sync by scroll %, in `lib/useScrollSync.ts` (capture-phase listener
  on the split root, rAF-throttled, echo guard).
- Code blocks have a hover Copy button (`navigator.clipboard`, execCommand fallback).
- Theme preference is System / Light / Dark (toolbar button cycles). "System" follows
  macOS live via `prefers-color-scheme`; the native title bar follows via
  `window.setTheme()` (needs `core:window:allow-set-theme`). `data-theme` is set
  synchronously in the store so the CodeMirror theme reads the new CSS vars.

## Bigger decision: "more Notion-like" (the real lift)
Justin wants to keep the pure markdown editor AND gain Notion-style inline formatting
(type `# ` → heading renders inline, `/` slash menu for blocks, click-to-toggle, etc.).
Two paths — pick deliberately, don't drift into one:

- **(A) CodeMirror live-preview decorations** (the Obsidian approach). One editor;
  decorations hide markdown syntax and render inline while the buffer stays plain
  markdown. Preserves markdown-as-source and the existing architecture. Medium lift.
  Best match for "pure editor and Notion-like in the same surface."
- **(B) ProseMirror-based WYSIWYG** (TipTap or Milkdown) with a `/` slash menu. Fuller
  Notion feel, but markdown becomes serialization rather than the live buffer — a
  larger rebuild of the editor pane, and a second code path if the raw editor is kept
  as a mode. Bigger lift.

Recommendation: spike (A) first behind a view toggle; only reach for (B) if block
drag/drop and rich embeds become requirements.

## Later
Code signing + notarization (Developer ID, paid Apple account) before distributing;
universal binary via `--target universal-apple-darwin`; set a real CSP before shipping.
