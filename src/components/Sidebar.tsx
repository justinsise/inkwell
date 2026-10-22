import { useState } from "react";
import type { FileNode } from "../lib/types";
import { useStore } from "../state/store";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`chevron ${open ? "open" : ""}`}
      width="10"
      height="10"
      viewBox="0 0 10 10"
      aria-hidden="true"
    >
      <path d="M3 2l4 3-4 3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TreeNode({ node, depth }: { node: FileNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const openFile = useStore((s) => s.openFile);
  const activePath = useStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.path ?? null;
  });

  const pad = { paddingLeft: `${8 + depth * 14}px` };

  if (node.is_dir) {
    return (
      <div>
        <button className="tree-row folder" style={pad} onClick={() => setOpen((o) => !o)}>
          <ChevronIcon open={open} />
          <span className="tree-label">{node.name}</span>
        </button>
        {open && (
          <div>
            {node.children.map((child) => (
              <TreeNode key={child.path} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = node.path === activePath;
  return (
    <button
      className={`tree-row file ${isActive ? "active" : ""}`}
      style={pad}
      onClick={() => openFile(node.path)}
      title={node.path}
    >
      <span className="file-dot" aria-hidden="true" />
      <span className="tree-label">{node.name}</span>
    </button>
  );
}

export default function Sidebar() {
  const tree = useStore((s) => s.tree);
  const openFolder = useStore((s) => s.openFolder);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">{tree ? tree.name : "Explorer"}</span>
        <button className="icon-btn" onClick={openFolder} title="Open folder">
          Open
        </button>
      </div>
      <div className="tree-scroll">
        {tree ? (
          tree.children.length > 0 ? (
            tree.children.map((child) => (
              <TreeNode key={child.path} node={child} depth={0} />
            ))
          ) : (
            <p className="sidebar-empty">No markdown files in this folder.</p>
          )
        ) : (
          <button className="sidebar-cta" onClick={openFolder}>
            Open a folder to browse
          </button>
        )}
      </div>
    </aside>
  );
}
