use crate::models::partition::SplitRequest;
use crate::services::splitter::split_video;

/// Executes an `FFmpeg` split operation using stream copy mode.
///
/// Uses `-c copy` to avoid re-encoding, preserving original quality.
#[tauri::command]
pub async fn execute_split(request: SplitRequest) -> Result<String, String> {
    let output_files = split_video(&request).await?;
    let count = output_files.len();
    Ok(format!("Split complete: {count} partition(s) created"))
}
