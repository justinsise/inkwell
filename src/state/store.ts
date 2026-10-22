import { create } from "zustand";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { FileNode, OpenTab, Theme, ThemePref, ViewMode } from "../lib/types";
import {
  basename,
  pickFolder,
  pickSavePath,
  readDirectory,
  readFile,
  writeFile,
} from "../lib/fs";

const THEME_KEY = "inkwell.theme";

const THEME_ORDER: ThemePref[] = ["system", "light", "dark"];
const darkQuery = window.matchMedia?.("(prefers-color-scheme: dark)");

function initialThemePref(): ThemePref {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

function resolveTheme(pref: ThemePref): Theme {
  if (pref !== "system") return pref;
  return darkQuery?.matches ? "dark" : "light";
}

/**
 * Apply the theme synchronously, before React re-renders, so components that read
 * CSS variables during render (the CodeMirror theme) see the new palette.
 */
function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

/** Match native window chrome (title bar, traffic lights). null = follow macOS. */
function applyWindowTheme(pref: ThemePref) {
  if (!isTauri()) return;
  getCurrentWindow()
    .setTheme(pref === "system" ? null : pref)
    .catch(() => {});
}

const startPref = initialThemePref();
applyTheme(resolveTheme(startPref));
applyWindowTheme(startPref);

function uid(): string {
  return crypto.randomUUID();
}

interface AppState {
  folder: string | null;
  tree: FileNode | null;
  tabs: OpenTab[];
  activeTabId: string | null;
  viewMode: ViewMode;
  themePref: ThemePref;
  /** Resolved light/dark palette actually in use. */
  theme: Theme;
  sidebarVisible: boolean;
  status: string | null;

  openFolder: () => Promise<void>;
  refreshTree: () => Promise<void>;
  openFile: (path: string) => Promise<void>;
  newFile: () => void;
  setActiveTab: (id: string) => void;
  closeTab: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  saveActive: () => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
  cycleViewMode: () => void;
  cycleTheme: () => void;
  toggleSidebar: () => void;
  setStatus: (message: string | null) => void;
}

export const isDirty = (tab: OpenTab): boolean => tab.content !== tab.savedContent;

export const useStore = create<AppState>((set, get) => ({
  folder: null,
  tree: null,
  tabs: [],
  activeTabId: null,
  viewMode: "split",
  themePref: startPref,
  theme: resolveTheme(startPref),
  sidebarVisible: true,
  status: null,

  openFolder: async () => {
    const path = await pickFolder();
    if (!path) return;
    try {
      const tree = await readDirectory(path);
      set({ folder: path, tree });
    } catch (err) {
      set({ status: `Could not open folder: ${String(err)}` });
    }
  },

  refreshTree: async () => {
    const { folder } = get();
    if (!folder) return;
    try {
      const tree = await readDirectory(folder);
      set({ tree });
    } catch (err) {
      set({ status: `Could not refresh: ${String(err)}` });
    }
  },

  openFile: async (path: string) => {
    // If the file is already open, just focus its tab.
    const existing = get().tabs.find((t) => t.path === path);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }
    try {
      const content = await readFile(path);
      const tab: OpenTab = {
        id: uid(),
        path,
        name: basename(path),
        content,
        savedContent: content,
      };
      set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
    } catch (err) {
      set({ status: `Could not open file: ${String(err)}` });
    }
  },

  newFile: () => {
    const tab: OpenTab = {
      id: uid(),
      path: null,
      name: "untitled.md",
      content: "",
      savedContent: "",
    };
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
  },

  setActiveTab: (id: string) => set({ activeTabId: id }),

  closeTab: (id: string) => {
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.id === id);
      if (idx === -1) return s;
      const tabs = s.tabs.filter((t) => t.id !== id);
      let activeTabId = s.activeTabId;
      if (activeTabId === id) {
        const next = tabs[idx] ?? tabs[idx - 1] ?? null;
        activeTabId = next ? next.id : null;
      }
      return { tabs, activeTabId };
    });
  },

  updateContent: (id: string, content: string) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, content } : t)),
    }));
  },

  saveActive: async () => {
    const { tabs, activeTabId } = get();
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return;

    let targetPath = tab.path;
    if (!targetPath) {
      targetPath = await pickSavePath(tab.name);
      if (!targetPath) return; // user cancelled
    }

    try {
      await writeFile(targetPath, tab.content);
      set((s) => ({
        tabs: s.tabs.map((t) =>
          t.id === tab.id
            ? { ...t, path: targetPath, name: basename(targetPath!), savedContent: t.content }
            : t
        ),
        status: `Saved ${basename(targetPath!)}`,
      }));
      // A newly created file may now belong in the tree.
      await get().refreshTree();
    } catch (err) {
      set({ status: `Could not save: ${String(err)}` });
    }
  },

  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),

  cycleViewMode: () => {
    const order: ViewMode[] = ["editor", "split", "preview"];
    const current = get().viewMode;
    const next = order[(order.indexOf(current) + 1) % order.length];
    set({ viewMode: next });
  },

  cycleTheme: () => {
    const current = get().themePref;
    const themePref = THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
    if (themePref === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, themePref);
    const theme = resolveTheme(themePref);
    applyTheme(theme);
    applyWindowTheme(themePref);
    set({ themePref, theme });
  },

  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),

  setStatus: (message) => set({ status: message }),
}));

// Follow live macOS appearance changes while the preference is "system".
darkQuery?.addEventListener("change", () => {
  const { themePref, theme } = useStore.getState();
  if (themePref !== "system") return;
  const next = resolveTheme("system");
  if (next === theme) return;
  applyTheme(next);
  useStore.setState({ theme: next });
});
