import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar";
import Tabs from "./components/Tabs";
import Editor from "./components/Editor";
import Preview from "./components/Preview";
import { isDirty, useStore } from "./state/store";
import { useScrollSync } from "./lib/useScrollSync";
import type { ThemePref, ViewMode } from "./lib/types";

const VIEW_ICONS: Record<ViewMode, string> = {
  editor: "Edit",
  split: "Split",
  preview: "Read",
};

const THEME_LABELS: Record<ThemePref, { icon: string; label: string }> = {
  system: { icon: "◐", label: "System" },
  light: { icon: "☀", label: "Light" },
  dark: { icon: "☾", label: "Dark" },
};

export default function App() {
  const {
    tabs,
    activeTabId,
    viewMode,
    theme,
    themePref,
    sidebarVisible,
    status,
    newFile,
    openFolder,
    updateContent,
    saveActive,
    setViewMode,
    cycleViewMode,
    cycleTheme,
    toggleSidebar,
    closeTab,
    setStatus,
  } = useStore();

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  const [split, setSplit] = useState(50); // editor width %, for split view
  const dragging = useRef(false);
  const splitBodyRef = useRef<HTMLDivElement>(null);

  useScrollSync(splitBodyRef, viewMode === "split" && activeTab !== null);

  // Clear transient status messages.
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 2200);
    return () => clearTimeout(t);
  }, [status, setStatus]);

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      switch (e.key.toLowerCase()) {
        case "s":
          e.preventDefault();
          saveActive();
          break;
        case "n":
          e.preventDefault();
          newFile();
          break;
        case "o":
          e.preventDefault();
          openFolder();
          break;
        case "w":
          if (activeTabId) {
            e.preventDefault();
            closeTab(activeTabId);
          }
          break;
        case "b":
          e.preventDefault();
          toggleSidebar();
          break;
        case "\\":
          e.preventDefault();
          cycleViewMode();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveActive, newFile, openFolder, closeTab, toggleSidebar, cycleViewMode, activeTabId]);

  // Divider drag handling for split view.
  const onDividerDown = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const container = document.querySelector(".split-body");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplit(Math.min(80, Math.max(20, pct)));
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const dirty = activeTab ? isDirty(activeTab) : false;

  return (
    <div className="app">
      <header className="toolbar">
        <div className="toolbar-left">
          <button className="icon-btn" onClick={toggleSidebar} title="Toggle sidebar (⌘B)">
            ☰
          </button>
          <span className="brand">Inkwell</span>
        </div>

        <div className="toolbar-center">
          {(["editor", "split", "preview"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              className={`seg ${viewMode === mode ? "active" : ""}`}
              onClick={() => setViewMode(mode)}
              title={`${VIEW_ICONS[mode]} view`}
            >
              {VIEW_ICONS[mode]}
            </button>
          ))}
        </div>

        <div className="toolbar-right">
          <button className="icon-btn" onClick={newFile} title="New file (⌘N)">
            New
          </button>
          <button
            className="icon-btn"
            onClick={saveActive}
            disabled={!activeTab}
            title="Save (⌘S)"
          >
            Save
          </button>
          <button
            className="icon-btn"
            onClick={cycleTheme}
            title={`Theme: ${THEME_LABELS[themePref].label}${
              themePref === "system" ? ` (${theme})` : ""
            } — click to change`}
          >
            {THEME_LABELS[themePref].icon}
          </button>
        </div>
      </header>

      <div className="body">
        {sidebarVisible && <Sidebar />}

        <main className="workspace">
          <Tabs />

          {activeTab ? (
            <div ref={splitBodyRef} className={`split-body mode-${viewMode}`}>
              {viewMode !== "preview" && (
                <div
                  className="pane editor-wrap"
                  style={viewMode === "split" ? { width: `${split}%` } : undefined}
                >
                  <Editor
                    key={activeTab.id}
                    value={activeTab.content}
                    onChange={(v) => updateContent(activeTab.id, v)}
                    theme={theme}
                  />
                </div>
              )}

              {viewMode === "split" && (
                <div className="divider" onMouseDown={onDividerDown} title="Drag to resize">
                  <span className="divider-grip" />
                </div>
              )}

              {viewMode !== "editor" && (
                <div className="pane preview-wrap">
                  <Preview
                    content={activeTab.content}
                    onChange={(v) => updateContent(activeTab.id, v)}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <h1>Inkwell</h1>
              <p>A quiet place to write markdown.</p>
              <div className="empty-actions">
                <button className="cta" onClick={newFile}>
                  New file
                </button>
                <button className="cta ghost" onClick={openFolder}>
                  Open folder
                </button>
              </div>
              <ul className="shortcut-hints">
                <li><kbd>⌘</kbd><kbd>N</kbd> new</li>
                <li><kbd>⌘</kbd><kbd>O</kbd> open folder</li>
                <li><kbd>⌘</kbd><kbd>S</kbd> save</li>
                <li><kbd>⌘</kbd><kbd>\</kbd> cycle view</li>
              </ul>
            </div>
          )}
        </main>
      </div>

      <footer className="statusbar">
        <span className="status-left">
          {activeTab ? (
            <>
              {activeTab.path ?? "unsaved buffer"}
              {dirty && <span className="dirty-badge">• unsaved</span>}
            </>
          ) : (
            "Ready"
          )}
        </span>
        <span className="status-right">{status}</span>
      </footer>
    </div>
  );
}
