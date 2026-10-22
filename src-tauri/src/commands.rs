use serde::Serialize;
use std::fs;
use std::path::Path;

/// A node in the sidebar file tree. Mirrors the `FileNode` TypeScript interface.
#[derive(Serialize)]
pub struct FileNode {
    name: String,
    path: String,
    is_dir: bool,
    children: Vec<FileNode>,
}

const MARKDOWN_EXTS: [&str; 4] = ["md", "markdown", "mdx", "txt"];

fn is_markdown(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| MARKDOWN_EXTS.contains(&e.to_lowercase().as_str()))
        .unwrap_or(false)
}

fn should_skip(name: &str) -> bool {
    name.starts_with('.') || matches!(name, "node_modules" | "target" | "dist" | ".git")
}

fn sort_children(children: &mut [FileNode]) {
    children.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
}

/// Build a node for a child path. Returns `None` for entries that should be
/// hidden (non-markdown files, skipped folders, or folders with no markdown
/// descendants).
fn build_node(path: &Path) -> Option<FileNode> {
    let name = path.file_name()?.to_string_lossy().to_string();
    if should_skip(&name) {
        return None;
    }

    let is_dir = path.is_dir();
    if !is_dir {
        return if is_markdown(path) {
            Some(FileNode {
                name,
                path: path.to_string_lossy().to_string(),
                is_dir: false,
                children: Vec::new(),
            })
        } else {
            None
        };
    }

    let mut children = Vec::new();
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Some(node) = build_node(&entry.path()) {
                children.push(node);
            }
        }
    }

    // Hide folders that contain no markdown anywhere beneath them.
    if children.is_empty() {
        return None;
    }

    sort_children(&mut children);
    Some(FileNode {
        name,
        path: path.to_string_lossy().to_string(),
        is_dir: true,
        children,
    })
}

/// Read a folder into a tree of markdown files. The root folder is always
/// returned (even if empty) so the user can see where they opened.
#[tauri::command]
pub fn read_directory(path: String) -> Result<FileNode, String> {
    let root = Path::new(&path);
    if !root.is_dir() {
        return Err(format!("Not a folder: {path}"));
    }

    let name = root
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.clone());

    let mut children = Vec::new();
    if let Ok(entries) = fs::read_dir(root) {
        for entry in entries.flatten() {
            if let Some(node) = build_node(&entry.path()) {
                children.push(node);
            }
        }
    }
    sort_children(&mut children);

    Ok(FileNode {
        name,
        path: root.to_string_lossy().to_string(),
        is_dir: true,
        children,
    })
}

/// Read a UTF-8 text file.
#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Write text to a file, creating or overwriting it.
#[tauri::command]
pub fn write_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| e.to_string())
}
