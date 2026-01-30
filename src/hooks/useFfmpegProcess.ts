import { invoke } from '@tauri-apps/api/tauri';
import { useCallback } from 'react';
import { usePartitionStore } from '../stores/partitionStore';
import { useVideoStore } from '../stores/videoStore';

export const useFfmpegProcess = () => {
  const videoFile = useVideoStore((state) => state.videoFile);
  const targetSizeGb = usePartitionStore((state) => state.targetSizeGb);
  const exclusions = usePartitionStore((state) => state.exclusions);
  const outputDir = usePartitionStore((state) => state.outputDir);
  const setStatus = usePartitionStore((state) => state.setStatus);
  const setProgress = usePartitionStore((state) => state.setProgress);
  const setError = usePartitionStore((state) => state.setError);

  const startSplit = useCallback(async () => {
    if (!videoFile || !outputDir) {
      setError('Please select a video file and output directory');
      return;
    }

    setStatus('processing');
    setProgress(0);

    try {
      await invoke('execute_split', {
        request: {
          inputPath: videoFile,
          outputDir,
          targetSizeBytes: Math.round(targetSizeGb * 1024 * 1024 * 1024),
          exclusions,
        },
      });
      setStatus('complete');
      setProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  }, [videoFile, outputDir, targetSizeGb, exclusions, setStatus, setProgress, setError]);

  return { startSplit };
};
