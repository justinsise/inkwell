import { useMemo } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import type { Theme } from "../lib/types";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  theme: Theme;
}

/** Colors read from the active palette so CodeMirror blends into the app. */
function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function buildTheme(theme: Theme) {
  const bg = cssVar("--surface", theme === "dark" ? "#1E1D1A" : "#FFFFFF");
  const text = cssVar("--text", theme === "dark" ? "#E8E4DB" : "#23201B");
  const muted = cssVar("--muted", "#8A8478");
  const accent = cssVar("--accent", theme === "dark" ? "#6FB3AD" : "#2F6F6A");
  const selection = cssVar("--accent-weak", "rgba(47,111,106,0.14)");
  const border = cssVar("--border", theme === "dark" ? "#2C2925" : "#E7E3DA");

  return EditorView.theme(
    {
      "&": {
        backgroundColor: bg,
        color: text,
        height: "100%",
        fontSize: "15px",
      },
      ".cm-scroller": {
        fontFamily: "var(--font-mono)",
        lineHeight: "1.7",
        padding: "12px 8px 40vh 8px",
      },
      ".cm-content": { caretColor: accent, maxWidth: "80ch", margin: "0 auto" },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: accent },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
        backgroundColor: selection,
      },
      ".cm-gutters": {
        backgroundColor: bg,
        color: muted,
        border: "none",
      },
      ".cm-activeLine": { backgroundColor: "transparent" },
      ".cm-activeLineGutter": { backgroundColor: "transparent", color: text },
      ".cm-lineNumbers .cm-gutterElement": { padding: "0 12px 0 8px" },
      // Markdown syntax accents
      ".cm-header": { color: text, fontWeight: "600" },
      ".cm-strong": { color: text, fontWeight: "700" },
      ".cm-emphasis": { fontStyle: "italic" },
      ".cm-link": { color: accent },
      ".cm-url": { color: muted },
      ".cm-quote": { color: muted, fontStyle: "italic" },
      ".cm-monospace, .cm-inline-code": {
        fontFamily: "var(--font-mono)",
        color: accent,
      },
      ".cm-panels": { backgroundColor: bg, color: text, borderColor: border },
      "&.cm-editor.cm-focused": { outline: "none" },
    },
    { dark: theme === "dark" }
  );
}

export default function Editor({ value, onChange, theme }: EditorProps) {
  const extensions = useMemo(
    () => [
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      EditorView.lineWrapping,
      buildTheme(theme),
    ],
    [theme]
  );

  return (
    <div className="editor-pane">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
          bracketMatching: true,
          autocompletion: false,
        }}
        theme={theme}
        style={{ height: "100%" }}
      />
    </div>
  );
}
