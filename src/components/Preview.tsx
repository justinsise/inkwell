import { createContext, useContext, useRef, useState, type ComponentProps, type MouseEvent } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

interface PreviewProps {
  content: string;
  /** Called with the rewritten source when the preview edits it (task toggles). */
  onChange: (content: string) => void;
}

/** `- [ ]` / `1. [x]` at the start of a list item: captures the prefix and the mark. */
const TASK_MARKER = /^([ \t]*(?:[-*+]|\d+[.)])[ \t]+)\[([ xX])\]/;

/** Schemes handed to the system (browser, Mail, …) rather than the WebView. */
const EXTERNAL_LINK = /^(https?:|mailto:|tel:)/i;

/** Lets a task-list item's checkbox toggle the marker at its source offset. */
const TaskToggleContext = createContext<(() => void) | null>(null);

function TaskCheckbox(props: ComponentProps<"input">) {
  const toggle = useContext(TaskToggleContext);
  if (props.type !== "checkbox" || !toggle) return <input {...props} />;
  return (
    <input
      type="checkbox"
      checked={!!props.checked}
      onChange={toggle}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Older WebViews without async clipboard access.
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

function CodeBlock(props: ComponentProps<"pre">) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    // Strip the trailing newline the fenced block carries.
    await copyText((preRef.current?.textContent ?? "").replace(/\n$/, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="code-block">
      <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={onCopy} title="Copy code">
        {copied ? "Copied" : "Copy"}
      </button>
      <pre ref={preRef} {...props} />
    </div>
  );
}

function openLink(e: MouseEvent<HTMLAnchorElement>, href: string | undefined) {
  if (!href || href.startsWith("#")) return; // in-page anchors scroll natively
  e.preventDefault();
  if (!EXTERNAL_LINK.test(href)) return; // relative paths have nowhere to go yet
  if (isTauri()) openUrl(href).catch(() => {});
  else window.open(href, "_blank", "noopener");
}

export default function Preview({ content, onChange }: PreviewProps) {
  const trimmed = content.trim();

  // Flip the task marker of the list item starting at `offset`. Positions come
  // from the parsed source, so code fences and nesting can't misalign them.
  const toggleTaskAt = (offset: number) => {
    const match = TASK_MARKER.exec(content.slice(offset));
    if (!match) return;
    const at = offset + match[1].length + 1;
    const next = match[2] === " " ? "x" : " ";
    onChange(content.slice(0, at) + next + content.slice(at + 1));
  };

  const components: Components = {
    a: ({ node, href, ...props }) => {
      void node;
      return <a {...props} href={href} onClick={(e) => openLink(e, href)} />;
    },
    li: ({ node, className, ...props }) => {
      const offset = node?.position?.start.offset;
      const isTask = className?.includes("task-list-item") && offset !== undefined;
      return (
        <TaskToggleContext.Provider value={isTask ? () => toggleTaskAt(offset) : null}>
          <li className={className} {...props} />
        </TaskToggleContext.Provider>
      );
    },
    input: ({ node, ...props }) => {
      void node;
      return <TaskCheckbox {...props} />;
    },
    pre: ({ node, ...props }) => {
      void node;
      return <CodeBlock {...props} />;
    },
  };

  return (
    <div className="preview-pane">
      <div className="preview">
        {trimmed.length === 0 ? (
          <p className="preview-empty">Nothing to preview yet. Start typing on the left.</p>
        ) : (
          <Markdown remarkPlugins={[remarkGfm]} components={components}>
            {content}
          </Markdown>
        )}
      </div>
    </div>
  );
}
