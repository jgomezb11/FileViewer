use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryEntry {
    pub path: String,
    pub name: String,
    pub file_type: String,
}

const VIDEO_EXTENSIONS: &[&str] = &[
    "mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "m4v", "ts", "mts",
];

const IMAGE_EXTENSIONS: &[&str] = &[
    "jpg", "jpeg", "png", "gif", "bmp", "webp", "tiff", "tif", "svg",
];

fn classify_extension(ext: &str) -> Option<&'static str> {
    let lower = ext.to_lowercase();
    if VIDEO_EXTENSIONS.contains(&lower.as_str()) {
        Some("video")
    } else if IMAGE_EXTENSIONS.contains(&lower.as_str()) {
        Some("image")
    } else {
        None
    }
}

/// Lists all video and image files in a directory.
#[tauri::command]
pub fn list_directory(dir_path: String) -> Result<Vec<DirectoryEntry>, String> {
    let path = Path::new(&dir_path);
    if !path.is_dir() {
        return Err(format!("Not a directory: {dir_path}"));
    }

    let entries = fs::read_dir(path).map_err(|e| format!("Failed to read directory: {e}"))?;

    let mut files: Vec<DirectoryEntry> = Vec::new();

    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let file_path = entry.path();
        if !file_path.is_file() {
            continue;
        }

        let ext = match file_path.extension().and_then(|e| e.to_str()) {
            Some(e) => e,
            None => continue,
        };

        if let Some(file_type) = classify_extension(ext) {
            let name = file_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();
            files.push(DirectoryEntry {
                path: file_path.to_string_lossy().to_string(),
                name,
                file_type: file_type.to_string(),
            });
        }
    }

    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(files)
}

/// Permanently deletes a file from the filesystem.
#[tauri::command]
pub fn delete_file(file_path: String) -> Result<(), String> {
    fs::remove_file(&file_path).map_err(|e| format!("Failed to delete file: {e}"))
}

/// Moves a file to the system recycle bin / trash.
#[tauri::command]
pub fn move_to_trash(file_path: String) -> Result<(), String> {
    trash::delete(&file_path).map_err(|e| format!("Failed to move to trash: {e}"))
}
