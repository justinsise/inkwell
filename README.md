# Inkwell

A lightweight, cross-platform markdown editor — file-tree sidebar, tabs, and a live editor/preview split. Built with **Tauri 2** (Rust core + system WebView) and **React 19**, so the desktop app stays tiny (~a few MB, no bundled Chromium) and the same React UI can later target iOS and Android.

The frontend is a clean React app. That's deliberate: the UI is the portable asset. If you later want mobile, the same code runs under Tauri's iOS/Android targets (or Capacitor) without a rewrite.

---

## Prerequisites (macOS)

1. **Rust** (stable), via rustup:
   ```zsh
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source "$HOME/.cargo/env"   # load cargo into the current shell
   ```
   The installer only wires up *new* shells, so run the `source` line above (or open a fresh terminal tab) before continuing — otherwise Tauri's CLI can't find `cargo` and bails with a `cargo metadata` error.
2. **Node.js 20 LTS or newer** (you likely have this; otherwise `brew install node`).
3. **Xcode Command Line Tools** (for compiling the macOS app):
   ```zsh
   xcode-select --install
   ```

That's all you need for the desktop build. (Full Xcode + CocoaPods are only needed later if you target iOS — see *Going mobile* below.)

---

## Run it

```zsh
cd inkwell
npm install
npm run tauri dev
```

The first `npm run tauri dev` compiles the Rust core, so it takes a few minutes; subsequent runs are fast. A native window titled **Inkwell** opens with hot-reload on the React side.

If `npm install` ever complains about peer dependencies on your machine, `npm install --legacy-peer-deps` clears it.

---

## Build a distributable

```zsh
npm run tauri build
```

This produces a `.app` and a `.dmg` under `src-tauri/target/release/bundle/`. Unsigned builds run locally fine; for distribution to other Macs you'll want an Apple Developer ID for code signing and notarization (see *Shipping* below).

---

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| New file | ⌘N |
| Open folder | ⌘O |
| Save | ⌘S |
| Close tab | ⌘W |
| Toggle sidebar | ⌘B |
| Cycle view (edit / split / read) | ⌘\ |

(On non-Mac, ⌘ maps to Ctrl.)

---

## Project structure

```
inkwell/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ src/                      # React frontend (the portable UI)
│  ├─ App.tsx                # shell: toolbar, layout, split, shortcuts
│  ├─ components/
│  │  ├─ Sidebar.tsx         # collapsible file tree
│  │  ├─ Tabs.tsx            # open-file tabs + dirty indicators
│  │  ├─ Editor.tsx          # CodeMirror 6 markdown editor
│  │  └─ Preview.tsx         # react-markdown + GFM live preview
│  ├─ state/store.ts         # zustand store (folder, tabs, view, theme)
│  ├─ lib/fs.ts              # invoke() bridge + native dialogs
│  └─ styles.css             # design tokens + light/dark themes
└─ src-tauri/                # Rust core
   ├─ src/commands.rs        # read_directory, read_file, write_file
   ├─ src/lib.rs             # Tauri builder + command registration
   ├─ tauri.conf.json        # window, bundle, identifier
   └─ capabilities/default.json
```

### How it talks to the disk
The sidebar, open, and save flows call three Rust commands (`read_directory`, `read_file`, `write_file`) over Tauri's `invoke` bridge. The folder picker and "save as" dialogs use the official `@tauri-apps/plugin-dialog`. There's no arbitrary filesystem access granted to the WebView — only those explicit commands — which keeps the security surface small.

---

## Rebranding

`Inkwell` is a working name; rename freely:

- **App name / window title:** `productName` and the window `title` in `src-tauri/tauri.conf.json`.
- **Bundle identifier:** change `identifier` (currently `com.inkwell.editor`) to something you own, e.g. `com.justinsise.<name>`. Required before you can ship to the App Store.
- **Icon:** drop a 1024×1024 PNG at `src-tauri/app-icon.png` and run `npm run tauri icon src-tauri/app-icon.png` — it regenerates the full icon set (including a proper `.icns`).

---

## Going mobile (later)

Tauri 2 targets iOS and Android from this same codebase. When you're ready:

```zsh
npm run tauri ios init      # requires full Xcode + CocoaPods
npm run tauri ios dev

npm run tauri android init  # requires Android Studio + NDK
npm run tauri android dev
```

Two honest caveats worth knowing before you lean on mobile commercially:

- **Mobile isn't fully first-class yet.** Tauri's desktop story is production-grade; mobile is a solid foundation, but not every desktop plugin is ported and the tooling is younger. Expect some rough edges.
- **App Store guideline 4.2.** A thin "it's just a website in a wrapper" app can be rejected. To pass, give the mobile build real native surface (native file handling, share sheets, offline behavior) rather than shipping the desktop layout verbatim. The file-tree layout in particular should collapse to a mobile pattern (bottom sheet / drawer).

If maximum native polish on Apple platforms becomes the whole selling point, that's the one scenario where a native SwiftUI rewrite would beat this — but you'd lose Android and the shared codebase.

---

## Shipping (distribution notes)

- **Code signing + notarization** (macOS): needs an Apple Developer ID. Tauri supports signing config in `tauri.conf.json` / env vars. Without it, other users see a Gatekeeper warning.
- **Auto-updates:** Tauri has an official updater plugin if you want in-app updates later.
- **Content Security Policy:** `security.csp` is currently `null` for development convenience. Before you ship, set a real CSP (allow `img-src` for remote images referenced in markdown, restrict the rest).

---

## Stack

| Layer | Choice |
| --- | --- |
| Shell | Tauri 2 (Rust, system WebView) |
| UI | React 19 + Vite 8 |
| Editor | CodeMirror 6 (`@uiw/react-codemirror`) |
| Preview | react-markdown + remark-gfm |
| State | zustand |
