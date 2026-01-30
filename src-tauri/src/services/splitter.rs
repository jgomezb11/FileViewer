use std::path::Path;

use tauri::api::process::{Command, CommandEvent};

use crate::models::partition::{SplitRequest, TimeInterval};
use crate::services::calculator::calculate_partition_points;
use crate::utils::ffmpeg_wrapper::format_ffmpeg_time;

/// Executes the video split operation using `FFmpeg` stream copy.
///
/// Calculates partition points, then runs `ffmpeg -c copy` for each segment.
/// Returns the list of output file paths on success.
#[allow(clippy::cast_possible_truncation)]
pub async fn split_video(request: &SplitRequest) -> Result<Vec<String>, String> {
    let input_path = Path::new(&request.input_path);
    if !input_path.exists() {
        return Err(format!("Input file not found: {}", request.input_path));
    }

    let output_dir = Path::new(&request.output_dir);
    if !output_dir.is_dir() {
        return Err(format!("Output directory not found: {}", request.output_dir));
    }

    let fs_meta = std::fs::metadata(input_path)
        .map_err(|e| format!("Failed to read file metadata: {e}"))?;

    let file_stem = input_path
        .file_stem()
        .map_or_else(|| "output".to_string(), |s| s.to_string_lossy().to_string());

    let extension = input_path
        .extension()
        .map_or_else(|| "mp4".to_string(), |e| e.to_string_lossy().to_string());

    // Build a minimal metadata struct for the calculator
    let metadata = crate::models::video::VideoMetadata {
        file_path: request.input_path.clone(),
        file_name: file_stem.clone(),
        file_size: fs_meta.len(),
        duration_secs: get_duration_from_ffmpeg(&request.input_path).await?,
        width: 0,
        height: 0,
        video_codec: String::new(),
        audio_codec: None,
        bitrate: 0,
        format: extension.clone(),
    };

    let points = calculate_partition_points(
        &metadata,
        request.target_size_bytes,
        &request.exclusions,
    );

    if points.is_empty() {
        return Err("No partition points calculated. Check file size and target partition size.".to_string());
    }

    let mut output_files = Vec::new();

    for point in &points {
        let start_original = effective_to_original_time(point.start_secs, &request.exclusions);
        let end_original = effective_to_original_time(point.end_secs, &request.exclusions);

        let output_name = if points.len() == 1 {
            format!("{file_stem}_part1.{extension}")
        } else {
            format!("{file_stem}_part{}.{extension}", point.index + 1)
        };

        let output_path = output_dir.join(&output_name);
        let output_str = output_path.to_string_lossy().to_string();

        run_ffmpeg_split(
            &request.input_path,
            &output_str,
            start_original,
            end_original,
        )
        .await?;

        output_files.push(output_str);
    }

    Ok(output_files)
}

/// Gets video duration by running ffmpeg -i and parsing the output.
async fn get_duration_from_ffmpeg(file_path: &str) -> Result<f64, String> {
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

    Err("Could not determine video duration from FFmpeg output".to_string())
}

/// Maps a time in the effective timeline (excluding excluded intervals) back to the
/// original video timestamp.
fn effective_to_original_time(effective_secs: f64, exclusions: &[TimeInterval]) -> f64 {
    let mut sorted: Vec<&TimeInterval> = exclusions.iter().collect();
    sorted.sort_by(|a, b| a.start_secs.partial_cmp(&b.start_secs).unwrap_or(std::cmp::Ordering::Equal));

    let mut accumulated_skip = 0.0;
    for excl in &sorted {
        let excl_duration = excl.end_secs - excl.start_secs;
        let effective_excl_start = excl.start_secs - accumulated_skip;

        if effective_secs >= effective_excl_start {
            accumulated_skip += excl_duration;
        } else {
            break;
        }
    }

    effective_secs + accumulated_skip
}

/// Runs a single `FFmpeg` split command: `ffmpeg -i input -ss start -to end -c copy output`
async fn run_ffmpeg_split(
    input_path: &str,
    output_path: &str,
    start_secs: f64,
    end_secs: f64,
) -> Result<(), String> {
    let start_str = format_ffmpeg_time(start_secs);
    let end_str = format_ffmpeg_time(end_secs);

    let (mut rx, _child) = Command::new_sidecar("binaries/ffmpeg")
        .map_err(|e| format!("FFmpeg not found: {e}"))?
        .args([
            "-i", input_path,
            "-ss", &start_str,
            "-to", &end_str,
            "-c", "copy",
            "-avoid_negative_ts", "make_zero",
            "-y",
            output_path,
        ])
        .spawn()
        .map_err(|e| format!("Failed to run FFmpeg: {e}"))?;

    let mut stderr = String::new();
    let mut exit_code = None;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stderr(line) => {
                stderr.push_str(&line);
                stderr.push('\n');
            }
            CommandEvent::Terminated(payload) => {
                exit_code = Some(payload.code.unwrap_or(-1));
                break;
            }
            _ => {}
        }
    }

    match exit_code {
        Some(0) => Ok(()),
        Some(code) => Err(format!("FFmpeg exited with code {code}: {stderr}")),
        None => {
            // Check if output file was created (ffmpeg sometimes doesn't report exit code properly)
            if Path::new(output_path).exists() {
                Ok(())
            } else {
                Err(format!("FFmpeg terminated unexpectedly: {stderr}"))
            }
        }
    }
}
