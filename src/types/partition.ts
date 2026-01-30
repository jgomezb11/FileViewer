export interface TimeInterval {
  startSecs: number;
  endSecs: number;
}

export interface PartitionPoint {
  index: number;
  startSecs: number;
  endSecs: number;
  estimatedSizeBytes: number;
}

export interface SplitRequest {
  inputPath: string;
  outputDir: string;
  targetSizeBytes: number;
  exclusions: TimeInterval[];
}

export type ProcessingStatus = 'idle' | 'calculating' | 'processing' | 'complete' | 'error';
