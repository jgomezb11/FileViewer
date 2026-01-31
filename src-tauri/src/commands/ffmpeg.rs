use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::Path;

use crate::models::partition::SplitRequest;
use crate::services::splitter::split_video;
use crate::utils::ffmpeg_wrapper::{format_ffmpeg_time, run_ffmpeg};

/// Executes an `FFmpeg` split operation using stream copy mode.
///
/// Uses `-c copy` to avoid re-encoding, preserving original quality.
#[tauri::command]
pub async fn execute_split(request: SplitRequest) -> Result<String, String> {
    let output_files = split_video(&request).await?;
    let count = output_files.len();
    Ok(format!("Split complete: {count} partition(s) created"))
}

/// Generates evenly-spaced thumbnail images from a video using `FFmpeg`.
///
/// Uses per-frame input-level seeking (`-ss` before `-i`) for each thumbnail,
/// which is fast regardless of video length (keyframe seek, no full decode).
#[tauri::command]
pub async fn generate_thumbnails(
    video_path: String,
    count: u32,
    height: u32,
) -> Result<Vec<String>, String> {
    if count == 0 {
        return Err("Thumbnail count must be greater than 0".to_string());
    }

    let input = Path::new(&video_path);
    if !input.exists() {
        return Err(format!("Video file not found: {video_path}"));
    }

    // Create a deterministic subdirectory based on the video path
    let mut hasher = DefaultHasher::new();
    video_path.hash(&mut hasher);
    let hash = hasher.finish();

    let thumb_dir = std::env::temp_dir()
        .join("video-partitioner-thumbs")
        .join(format!("{hash:x}"));

    // Return cached thumbnails if they already exist for this video
    if thumb_dir.exists() {
        let mut cached: Vec<String> = Vec::new();
        for i in 1..=count {
            let p = thumb_dir.join(format!("thumb_{i:04}.jpg"));
            if p.exists() {
                cached.push(p.to_string_lossy().to_string());
            }
        }
        if cached.len() == count as usize {
            return Ok(cached);
        }
        let _ = std::fs::remove_dir_all(&thumb_dir);
    }

    std::fs::create_dir_all(&thumb_dir)
        .map_err(|e| format!("Failed to create thumbnail directory: {e}"))?;

    let duration = get_duration(&video_path).await?;
    if duration <= 0.0 {
        return Err("Video has no duration".to_string());
    }

    let interval = duration / f64::from(count);
    let scale_filter = format!("scale=-1:{height}");

    // Generate each thumbnail with fast input-level seeking
    for i in 0..count {
        let timestamp = interval * (f64::from(i) + 0.5);
        let ss_arg = format_ffmpeg_time(timestamp);
        let output_path = thumb_dir.join(format!("thumb_{:04}.jpg", i + 1));
        let output_str = output_path.to_string_lossy().to_string();

        let (_, stderr, exit_code) = run_ffmpeg(&[
            "-ss",
            &ss_arg,
            "-i",
            &video_path,
            "-vframes",
            "1",
            "-vf",
            &scale_filter,
            "-q:v",
            "5",
            "-y",
            &output_str,
        ])
        .await?;

        match exit_code {
            Some(0) | None => {}
            Some(code) => {
                return Err(format!(
                    "FFmpeg thumbnail {i} exited with code {code}: {stderr}"
                ));
            }
        }
    }

    // Collect generated thumbnail paths in order
    let mut paths = Vec::new();
    for i in 1..=count {
        let thumb_path = thumb_dir.join(format!("thumb_{i:04}.jpg"));
        if thumb_path.exists() {
            paths.push(thumb_path.to_string_lossy().to_string());
        }
    }

    if paths.is_empty() {
        return Err("No thumbnails were generated".to_string());
    }

    Ok(paths)
}

/// Captures a single video frame as a JPEG image.
///
/// Saves the frame to the same directory as the source video, named
/// `{stem}_frame_{HH_MM_SS_mmm}.jpg`.
#[tauri::command]
pub async fn capture_frame(video_path: String, timestamp_secs: f64) -> Result<String, String> {
    let input = Path::new(&video_path);
    if !input.exists() {
        return Err(format!("Video file not found: {video_path}"));
    }

    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("video");

    let parent = input
        .parent()
        .ok_or_else(|| "Cannot determine parent directory".to_string())?;

    let time_str = format_ffmpeg_time(timestamp_secs).replace(':', "_");
    let output_name = format!("{stem}_frame_{time_str}.jpg");
    let output_path = parent.join(&output_name);
    let output_str = output_path.to_string_lossy().to_string();

    let ss_arg = format_ffmpeg_time(timestamp_secs);

    let (_, stderr, exit_code) = run_ffmpeg(&[
        "-ss",
        &ss_arg,
        "-i",
        &video_path,
        "-vframes",
        "1",
        "-q:v",
        "2",
        "-y",
        &output_str,
    ])
    .await?;

    match exit_code {
        Some(0) | None => {}
        Some(code) => {
            return Err(format!(
                "FFmpeg frame capture exited with code {code}: {stderr}"
            ));
        }
    }

    if !output_path.exists() {
        return Err(format!(
            "Frame capture failed: output file was not created. FFmpeg output: {stderr}"
        ));
    }

    Ok(output_str)
}

/// Gets video duration by parsing `FFmpeg` stderr output.
async fn get_duration(file_path: &str) -> Result<f64, String> {
    let (_, stderr, _) = run_ffmpeg(&["-i", file_path, "-hide_banner"]).await?;

    for line in stderr.lines() {
        if let Some(idx) = line.find("Duration:") {
            let after = &line[idx + 9..];
            let time_str = after.trim().split(',').next().unwrap_or("").trim();
            let parts: Vec<&str> = time_str.split(':').collect();
            if parts.len() == 3 {
                let hours: f64 = parts[0].parse().unwrap_or(0.0);
                let minutes: f64 = parts[1].parse().unwrap_or(0.0);
                let seconds: f64 = parts[2].parse().unwrap_or(0.0);
                return Ok(hours.mul_add(3600.0, minutes.mul_add(60.0, seconds)));
            }
        }
    }

    Err("Could not determine video duration".to_string())
}
