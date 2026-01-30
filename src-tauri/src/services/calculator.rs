use crate::models::partition::{PartitionPoint, TimeInterval};
use crate::models::video::VideoMetadata;

/// Calculates partition split points based on video metadata and target size.
///
/// Takes into account excluded intervals when computing where to split.
#[allow(clippy::cast_precision_loss)]
pub fn calculate_partition_points(
    metadata: &VideoMetadata,
    target_size_bytes: u64,
    exclusions: &[TimeInterval],
) -> Vec<PartitionPoint> {
    let excluded_duration = total_excluded_duration(exclusions);
    let effective_duration = metadata.duration_secs - excluded_duration;

    if effective_duration <= 0.0 || metadata.file_size == 0 || target_size_bytes == 0 {
        return Vec::new();
    }

    let effective_size =
        (effective_duration / metadata.duration_secs) * metadata.file_size as f64;
    let partition_count = (effective_size / target_size_bytes as f64).ceil() as u32;

    if partition_count == 0 {
        return Vec::new();
    }

    let time_per_partition = effective_duration / f64::from(partition_count);
    let mut points = Vec::with_capacity(partition_count as usize);

    for i in 0..partition_count {
        let start = f64::from(i) * time_per_partition;
        let end = if i == partition_count - 1 {
            effective_duration
        } else {
            f64::from(i + 1) * time_per_partition
        };

        let estimated_size = ((end - start) / effective_duration * effective_size) as u64;

        points.push(PartitionPoint {
            index: i,
            start_secs: start,
            end_secs: end,
            estimated_size_bytes: estimated_size,
        });
    }

    points
}

/// Calculates the total excluded duration in seconds.
pub fn total_excluded_duration(exclusions: &[TimeInterval]) -> f64 {
    exclusions.iter().map(|e| e.end_secs - e.start_secs).sum()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_metadata(file_size: u64, duration_secs: f64) -> VideoMetadata {
        VideoMetadata {
            file_path: String::new(),
            file_name: String::new(),
            file_size,
            duration_secs,
            width: 1920,
            height: 1080,
            video_codec: "h264".to_string(),
            audio_codec: None,
            bitrate: 0,
            format: "mp4".to_string(),
        }
    }

    #[test]
    fn test_no_exclusions_even_split() {
        let metadata = make_metadata(10_737_418_240, 100.0); // 10 GB, 100s
        let target = 4_294_967_296; // 4 GB
        let points = calculate_partition_points(&metadata, target, &[]);

        assert_eq!(points.len(), 3);
        assert_eq!(points[0].index, 0);
        assert_eq!(points[2].index, 2);
    }

    #[test]
    fn test_with_exclusions() {
        let metadata = make_metadata(10_737_418_240, 100.0); // 10 GB, 100s
        let target = 4_294_967_296; // 4 GB
        let exclusions = vec![TimeInterval {
            start_secs: 20.0,
            end_secs: 40.0,
        }]; // 20s excluded => 80s effective => ~8GB
        let points = calculate_partition_points(&metadata, target, &exclusions);

        assert_eq!(points.len(), 2);
    }

    #[test]
    fn test_total_excluded_duration() {
        let exclusions = vec![
            TimeInterval {
                start_secs: 0.0,
                end_secs: 10.0,
            },
            TimeInterval {
                start_secs: 50.0,
                end_secs: 60.0,
            },
        ];
        let total = total_excluded_duration(&exclusions);
        assert!((total - 20.0).abs() < f64::EPSILON);
    }
}
