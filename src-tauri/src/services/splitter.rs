use std::path::Path;

use crate::models::partition::{SplitRequest, TimeInterval};
use crate::services::calculator::calculate_partition_points;
use crate::utils::ffmpeg_wrapper::{format_ffmpeg_time, run_ffmpeg};

/// A time range in the original video timeline.
struct Segment {
    start: f64,
    end: f64,
}

/// Executes the video split operation using `FFmpeg` stream copy.
///
/// Calculates partition points, maps each partition to original-timeline segments
/// (skipping excluded intervals), extracts them, and concatenates if needed.
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

    let duration_secs = get_duration_from_ffmpeg(&request.input_path).await?;

    let metadata = crate::models::video::VideoMetadata {
        file_path: request.input_path.clone(),
        file_name: file_stem.clone(),
        file_size: fs_meta.len(),
        duration_secs,
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
        return Err(
            "No partition points calculated. Check file size and target partition size.".to_string(),
        );
    }

    let included = compute_included_intervals(&request.exclusions, duration_secs);
    let mut output_files = Vec::new();

    for point in &points {
        let segments =
            map_partition_to_original_segments(point.start_secs, point.end_secs, &included);

        let output_name = if points.len() == 1 {
            format!("{file_stem}_part1.{extension}")
        } else {
            format!("{file_stem}_part{}.{extension}", point.index + 1)
        };

        let final_path = output_dir.join(&output_name);
        let final_str = final_path.to_string_lossy().to_string();

        if segments.len() == 1 {
            // Single continuous segment — extract directly
            extract_segment(
                &request.input_path,
                &final_str,
                segments[0].start,
                segments[0].end,
            )
            .await?;
        } else {
            // Multiple segments — extract each, then concatenate
            let mut temp_paths = Vec::new();

            for (i, seg) in segments.iter().enumerate() {
                let temp_name = format!(
                    "_temp_{file_stem}_p{}_s{i}.{extension}",
                    point.index + 1
                );
                let temp_path = output_dir.join(&temp_name);
                let temp_str = temp_path.to_string_lossy().to_string();

                extract_segment(&request.input_path, &temp_str, seg.start, seg.end).await?;
                temp_paths.push(temp_str);
            }

            concat_segments(&temp_paths, &final_str, output_dir).await?;

            // Clean up temp segment files
            for p in &temp_paths {
                let _ = std::fs::remove_file(p);
            }
        }

        output_files.push(final_str);
    }

    Ok(output_files)
}

/// Computes the included intervals (complement of exclusions within `[0, duration]`).
fn compute_included_intervals(exclusions: &[TimeInterval], duration: f64) -> Vec<Segment> {
    let mut sorted = exclusions.to_vec();
    sorted.sort_by(|a, b| {
        a.start_secs
            .partial_cmp(&b.start_secs)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    let mut included = Vec::new();
    let mut pos = 0.0;

    for excl in &sorted {
        if excl.start_secs > pos {
            included.push(Segment {
                start: pos,
                end: excl.start_secs,
            });
        }
        if excl.end_secs > pos {
            pos = excl.end_secs;
        }
    }

    if pos < duration {
        included.push(Segment {
            start: pos,
            end: duration,
        });
    }

    included
}

/// Maps a partition (defined in effective time) to a list of original-timeline segments.
///
/// Walks through the included intervals, tracking cumulative effective time,
/// and clips them to the partition boundaries.
fn map_partition_to_original_segments(
    effective_start: f64,
    effective_end: f64,
    included: &[Segment],
) -> Vec<Segment> {
    let mut effective_pos = 0.0;
    let mut segments = Vec::new();

    for interval in included {
        let interval_duration = interval.end - interval.start;
        let interval_effective_end = effective_pos + interval_duration;

        if interval_effective_end > effective_start && effective_pos < effective_end {
            // This included interval overlaps with our partition
            let overlap_eff_start = effective_start.max(effective_pos);
            let overlap_eff_end = effective_end.min(interval_effective_end);

            // Map the effective overlap back to original timestamps
            let offset_start = overlap_eff_start - effective_pos;
            let offset_end = overlap_eff_end - effective_pos;

            segments.push(Segment {
                start: interval.start + offset_start,
                end: interval.start + offset_end,
            });
        }

        effective_pos = interval_effective_end;
        if effective_pos >= effective_end {
            break;
        }
    }

    segments
}

/// Gets video duration by running ffmpeg -i and parsing the output.
async fn get_duration_from_ffmpeg(file_path: &str) -> Result<f64, String> {
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

    Err("Could not determine video duration from FFmpeg output".to_string())
}

/// Extracts a single segment from the input using `ffmpeg -c copy`.
async fn extract_segment(
    input_path: &str,
    output_path: &str,
    start_secs: f64,
    end_secs: f64,
) -> Result<(), String> {
    let start_str = format_ffmpeg_time(start_secs);
    let end_str = format_ffmpeg_time(end_secs);

    let (_, stderr, exit_code) = run_ffmpeg(&[
        "-i",
        input_path,
        "-ss",
        &start_str,
        "-to",
        &end_str,
        "-c",
        "copy",
        "-avoid_negative_ts",
        "make_zero",
        "-y",
        output_path,
    ])
    .await?;

    match exit_code {
        Some(0) => Ok(()),
        Some(code) => Err(format!("FFmpeg exited with code {code}: {stderr}")),
        None => {
            if Path::new(output_path).exists() {
                Ok(())
            } else {
                Err(format!("FFmpeg terminated unexpectedly: {stderr}"))
            }
        }
    }
}

/// Concatenates multiple segment files into a single output using the concat demuxer.
async fn concat_segments(
    segment_paths: &[String],
    output_path: &str,
    work_dir: &Path,
) -> Result<(), String> {
    // Write the concat list file
    let list_path = work_dir.join("_temp_concat_list.txt");
    let list_str = list_path.to_string_lossy().to_string();

    let mut list_content = String::new();
    for path in segment_paths {
        // FFmpeg concat demuxer needs forward slashes or escaped backslashes
        let escaped = path.replace('\\', "/");
        list_content.push_str(&format!("file '{escaped}'\n"));
    }

    std::fs::write(&list_path, &list_content)
        .map_err(|e| format!("Failed to write concat list: {e}"))?;

    let (_, stderr, exit_code) = run_ffmpeg(&[
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        &list_str,
        "-c",
        "copy",
        "-y",
        output_path,
    ])
    .await?;

    // Clean up the list file
    let _ = std::fs::remove_file(&list_path);

    match exit_code {
        Some(0) => Ok(()),
        Some(code) => Err(format!(
            "FFmpeg concat exited with code {code}: {stderr}"
        )),
        None => {
            if Path::new(output_path).exists() {
                Ok(())
            } else {
                Err(format!("FFmpeg concat failed: {stderr}"))
            }
        }
    }
}
