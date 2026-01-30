use serde::{Deserialize, Serialize};

/// Metadata extracted from a video file.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoMetadata {
    /// Full file path
    pub file_path: String,
    /// File name without path
    pub file_name: String,
    /// File size in bytes
    pub file_size: u64,
    /// Duration in seconds
    pub duration_secs: f64,
    /// Video width in pixels
    pub width: u32,
    /// Video height in pixels
    pub height: u32,
    /// Video codec (e.g., "h264", "hevc")
    pub video_codec: String,
    /// Audio codec (e.g., "aac", "mp3")
    pub audio_codec: Option<String>,
    /// Overall bitrate in bits per second
    pub bitrate: u64,
    /// Container format (e.g., "mp4", "mkv")
    pub format: String,
}
