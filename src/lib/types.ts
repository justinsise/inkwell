export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children: FileNode[];
}

export interface OpenTab {
  /** Stable client-side id (a file may be reopened as a fresh untitled buffer). */
  id: string;
  /** Absolute path on disk, or null for an unsaved buffer. */
  path: string | null;
  /** Display name shown in the tab. */
  name: string;
  /** Current editor buffer. */
  content: string;
  /** Content as of the last successful save, used to compute the dirty flag. */
  savedContent: string;
}

export type ViewMode = "editor" | "split" | "preview";
export type Theme = "light" | "dark";
/** User preference; "system" follows the macOS appearance setting. */
export type ThemePref = Theme | "system";
