use tauri::api::process::{Command, CommandEvent};

/// Spawns the `FFmpeg` sidecar with the given arguments and collects all stderr output.
pub async fn run_ffmpeg(args: &[&str]) -> Result<(String, String, Option<i32>), String> {
    let (mut rx, _child) = Command::new_sidecar("ffmpeg")
        .map_err(|e| format!("FFmpeg sidecar not found: {e}"))?
        .args(args)
        .spawn()
        .map_err(|e| format!("Failed to run FFmpeg: {e}"))?;

    let mut stdout = String::new();
    let mut stderr = String::new();
    let mut exit_code = None;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                stdout.push_str(&line);
                stdout.push('\n');
            }
            CommandEvent::Stderr(line) => {
                stderr.push_str(&line);
                stderr.push('\n');
            }
            CommandEvent::Terminated(payload) => {
                exit_code = payload.code;
                break;
            }
            _ => {}
        }
    }

    Ok((stdout, stderr, exit_code))
}

/// Formats a duration in seconds to `FFmpeg`'s HH:MM:SS.mmm format.
pub fn format_ffmpeg_time(seconds: f64) -> String {
    let hours = (seconds / 3600.0).floor() as u32;
    let minutes = ((seconds % 3600.0) / 60.0).floor() as u32;
    let secs = seconds % 60.0;
    format!("{hours:02}:{minutes:02}:{secs:06.3}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_zero() {
        assert_eq!(format_ffmpeg_time(0.0), "00:00:00.000");
    }

    #[test]
    fn test_format_minutes_seconds() {
        assert_eq!(format_ffmpeg_time(61.5), "00:01:01.500");
    }

    #[test]
    fn test_format_hours() {
        assert_eq!(format_ffmpeg_time(3723.0), "01:02:03.000");
    }
}
