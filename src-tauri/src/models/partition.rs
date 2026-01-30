use serde::{Deserialize, Serialize};

/// Request to split a video file into partitions.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SplitRequest {
    /// Path to the source video file
    pub input_path: String,
    /// Directory where partitions will be saved
    pub output_dir: String,
    /// Target size per partition in bytes
    pub target_size_bytes: u64,
    /// Time intervals to exclude from the output
    pub exclusions: Vec<TimeInterval>,
}

/// A time interval defined by start and end timestamps.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeInterval {
    /// Start time in seconds
    pub start_secs: f64,
    /// End time in seconds
    pub end_secs: f64,
}

/// A computed partition point.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PartitionPoint {
    /// Partition index (0-based)
    pub index: u32,
    /// Start time in seconds
    pub start_secs: f64,
    /// End time in seconds
    pub end_secs: f64,
    /// Estimated size in bytes
    pub estimated_size_bytes: u64,
}
