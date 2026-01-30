use std::path::Path;

use tauri::api::process::{Command, CommandEvent};

use crate::models::video::VideoMetadata;

/// Retrieves metadata from a video file using the filesystem and `FFmpeg`.
///
/// Returns duration, file size, resolution, and codec information.
#[tauri::command]
#[allow(clippy::cast_possible_truncation)]
pub async fn get_video_metadata(file_path: String) -> Result<VideoMetadata, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("File not found: {file_path}"));
    }

    let fs_meta = std::fs::metadata(path).map_err(|e| format!("Failed to read file metadata: {e}"))?;
    let file_size = fs_meta.len();

    let file_name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    let format = path
        .extension()
        .map(|e| e.to_string_lossy().to_string())
        .unwrap_or_default();

    // Run ffmpeg -i to extract media info from stderr
    let stderr = run_ffmpeg_info(&file_path).await.unwrap_or_default();

    let duration_secs = parse_duration(&stderr);
    let (width, height) = parse_resolution(&stderr);
    let video_codec = parse_video_codec(&stderr);
    let audio_codec = parse_audio_codec(&stderr);
    let bitrate = parse_bitrate(&stderr);

    Ok(VideoMetadata {
        file_path,
        file_name,
        file_size,
        duration_secs,
        width,
        height,
        video_codec,
        audio_codec,
        bitrate,
        format,
    })
}

/// Runs `ffmpeg -i <path> -hide_banner` and collects stderr output.
async fn run_ffmpeg_info(file_path: &str) -> Result<String, String> {
    let (mut rx, _child) = Command::new_sidecar("binaries/ffmpeg")
        .map_err(|e| format!("FFmpeg not found: {e}"))?
        .args(["-i", file_path, "-hide_banner"])
        .spawn()
        .map_err(|e| format!("Failed to run FFmpeg: {e}"))?;

    let mut stderr = String::new();
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stderr(line) => {
                stderr.push_str(&line);
                stderr.push('\n');
            }
            CommandEvent::Terminated(_) => break,
            _ => {}
        }
    }

    Ok(stderr)
}

/// Parses duration from `FFmpeg` output like `Duration: 01:30:00.50,`
fn parse_duration(output: &str) -> f64 {
    for line in output.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("Duration:") {
            let time_str = rest.trim().split(',').next().unwrap_or("").trim();
            return parse_time_to_secs(time_str);
        }
        if trimmed.contains("Duration:") {
            if let Some(idx) = trimmed.find("Duration:") {
                let after = &trimmed[idx + 9..];
                let time_str = after.trim().split(',').next().unwrap_or("").trim();
                return parse_time_to_secs(time_str);
            }
        }
    }
    0.0
}

/// Converts "HH:MM:SS.ms" to seconds.
fn parse_time_to_secs(time_str: &str) -> f64 {
    let parts: Vec<&str> = time_str.split(':').collect();
    if parts.len() == 3 {
        let hours: f64 = parts[0].parse().unwrap_or(0.0);
        let minutes: f64 = parts[1].parse().unwrap_or(0.0);
        let seconds: f64 = parts[2].parse().unwrap_or(0.0);
        hours.mul_add(3600.0, minutes.mul_add(60.0, seconds))
    } else {
        0.0
    }
}

/// Parses video resolution from `FFmpeg` output like `1920x1080`.
fn parse_resolution(output: &str) -> (u32, u32) {
    for line in output.lines() {
        if line.contains("Video:") {
            // Look for patterns like "1920x1080" or "1280x720"
            for part in line.split([' ', ',']) {
                let part = part.trim();
                if let Some((w, h)) = part.split_once('x') {
                    if let (Ok(width), Ok(height)) = (w.parse::<u32>(), h.parse::<u32>()) {
                        if width >= 16 && height >= 16 && width <= 15360 && height <= 8640 {
                            return (width, height);
                        }
                    }
                }
            }
        }
    }
    (0, 0)
}

/// Parses video codec from `FFmpeg` output like `Stream #0:0: Video: h264`
fn parse_video_codec(output: &str) -> String {
    for line in output.lines() {
        if line.contains("Video:") {
            if let Some(idx) = line.find("Video:") {
                let after = &line[idx + 6..];
                let codec = after.trim().split([' ', ',']).next().unwrap_or("unknown");
                return codec.to_string();
            }
        }
    }
    "unknown".to_string()
}

/// Parses audio codec from `FFmpeg` output like `Stream #0:1: Audio: aac`
fn parse_audio_codec(output: &str) -> Option<String> {
    for line in output.lines() {
        if line.contains("Audio:") {
            if let Some(idx) = line.find("Audio:") {
                let after = &line[idx + 6..];
                let codec = after.trim().split([' ', ',']).next().unwrap_or("");
                if !codec.is_empty() {
                    return Some(codec.to_string());
                }
            }
        }
    }
    None
}

/// Parses overall bitrate from `FFmpeg` output like `bitrate: 5000 kb/s`
fn parse_bitrate(output: &str) -> u64 {
    for line in output.lines() {
        if let Some(idx) = line.find("bitrate:") {
            let after = &line[idx + 8..];
            let trimmed = after.trim();
            if let Some(num_str) = trimmed.split_whitespace().next() {
                if let Ok(kbps) = num_str.parse::<u64>() {
                    return kbps * 1000; // Convert kb/s to b/s
                }
            }
        }
    }
    0
}
