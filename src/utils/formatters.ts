/** Formats bytes to a human-readable size string. */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / 1024 ** i;
  return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
};

/** Formats seconds to HH:MM:SS format. */
export const formatDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const parts: string[] = [];
  if (hours > 0) parts.push(String(hours).padStart(2, '0'));
  parts.push(String(minutes).padStart(2, '0'));
  parts.push(String(seconds).padStart(2, '0'));
  return parts.join(':');
};

/** Converts gigabytes to bytes. */
export const gbToBytes = (gb: number): number => Math.round(gb * 1024 * 1024 * 1024);

/** Converts bytes to gigabytes. */
export const bytesToGb = (bytes: number): number => bytes / (1024 * 1024 * 1024);
