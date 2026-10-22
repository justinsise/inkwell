import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { FileNode } from "./types";

const MARKDOWN_EXTENSIONS = ["md", "markdown", "mdx", "txt"];

/** Prompt the user to choose a folder to open in the sidebar. */
export async function pickFolder(): Promise<string | null> {
  const result = await open({
    directory: true,
    multiple: false,
    title: "Open folder",
  });
  return typeof result === "string" ? result : null;
}

/** Prompt the user for a destination path when saving an untitled buffer. */
export async function pickSavePath(defaultName = "untitled.md"): Promise<string | null> {
  const result = await save({
    title: "Save as",
    defaultPath: defaultName,
    filters: [{ name: "Markdown", extensions: MARKDOWN_EXTENSIONS }],
  });
  return result ?? null;
}

/** Read a directory tree (folders + markdown/text files only). */
export function readDirectory(path: string): Promise<FileNode> {
  return invoke<FileNode>("read_directory", { path });
}

/** Read a file's contents as UTF-8 text. */
export function readFile(path: string): Promise<string> {
  return invoke<string>("read_file", { path });
}

/** Write text to a file, creating or overwriting it. */
export function writeFile(path: string, contents: string): Promise<void> {
  return invoke<void>("write_file", { path, contents });
}

/** The leaf filename from an absolute path (cross-platform). */
export function basename(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}
