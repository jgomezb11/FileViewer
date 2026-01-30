/// Opens a directory picker dialog for selecting the output directory.
#[tauri::command]
pub async fn select_output_directory() -> Result<Option<String>, String> {
    Err("Not yet implemented".to_string())
}
