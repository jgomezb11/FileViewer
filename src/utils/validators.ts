/** Validates that a partition size in GB is within acceptable range. */
export const isValidPartitionSize = (sizeGb: number): boolean => {
  return sizeGb > 0 && sizeGb <= 100 && Number.isFinite(sizeGb);
};

/** Validates that a file path looks like a video file. */
export const isVideoFile = (path: string): boolean => {
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'];
  const lower = path.toLowerCase();
  return videoExtensions.some((ext) => lower.endsWith(ext));
};
