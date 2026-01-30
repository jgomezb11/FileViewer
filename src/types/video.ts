export interface VideoMetadata {
  filePath: string;
  fileName: string;
  fileSize: number;
  durationSecs: number;
  width: number;
  height: number;
  videoCodec: string;
  audioCodec: string | null;
  bitrate: number;
  format: string;
}
