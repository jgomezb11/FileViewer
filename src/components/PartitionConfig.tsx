import { open } from '@tauri-apps/api/dialog';
import { invoke } from '@tauri-apps/api/tauri';
import { useEffect } from 'react';
import { usePartitionCalculator } from '../hooks/usePartitionCalculator';
import { usePartitionStore } from '../stores/partitionStore';
import { useVideoStore } from '../stores/videoStore';
import { formatDuration, formatFileSize, gbToBytes } from '../utils/formatters';
import { ExclusionEditor } from './ExclusionEditor';

export const PartitionConfig = () => {
  const metadata = useVideoStore((state) => state.metadata);
  const videoFile = useVideoStore((state) => state.videoFile);
  const targetSizeGb = usePartitionStore((state) => state.targetSizeGb);
  const setTargetSizeGb = usePartitionStore((state) => state.setTargetSizeGb);
  const status = usePartitionStore((state) => state.status);
  const partitionPoints = usePartitionStore((state) => state.partitionPoints);
  const exclusions = usePartitionStore((state) => state.exclusions);
  const setStatus = usePartitionStore((state) => state.setStatus);
  const setProgress = usePartitionStore((state) => state.setProgress);
  const setError = usePartitionStore((state) => state.setError);
  const setOutputDir = usePartitionStore((state) => state.setOutputDir);

  const { calculate } = usePartitionCalculator();

  // Auto-recalculate partition points when inputs change
  useEffect(() => {
    calculate();
  }, [calculate]);

  const handleSplit = async () => {
    if (!metadata || !videoFile) return;

    const selectedDir = await open({
      title: 'Select output folder',
      directory: true,
    });

    if (typeof selectedDir !== 'string') return;

    setOutputDir(selectedDir);
    setStatus('processing');
    setProgress(0);

    try {
      await invoke('execute_split', {
        request: {
          inputPath: videoFile,
          outputDir: selectedDir,
          targetSizeBytes: gbToBytes(targetSizeGb),
          exclusions,
        },
      });
      setStatus('complete');
      setProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Partition Settings</h2>

      {metadata && (
        <div className="space-y-1 text-sm text-gray-400">
          <p>File: {metadata.fileName}</p>
          {metadata.fileSize > 0 && <p>Size: {formatFileSize(metadata.fileSize)}</p>}
          <p>Duration: {formatDuration(metadata.durationSecs)}</p>
          <p>
            Resolution: {metadata.width}x{metadata.height}
          </p>
          {metadata.videoCodec !== 'unknown' && <p>Codec: {metadata.videoCodec}</p>}
        </div>
      )}

      <div>
        <label htmlFor="partitionSize" className="block text-sm font-medium">
          Target partition size (GB)
        </label>
        <input
          id="partitionSize"
          type="number"
          min={0.1}
          step={0.1}
          value={targetSizeGb}
          onChange={(e) => setTargetSizeGb(Number(e.target.value))}
          className="mt-1 w-full rounded bg-gray-800 px-3 py-2 text-white"
        />
      </div>

      {partitionPoints.length > 0 && (
        <p className="text-sm text-gray-400">Estimated partitions: {partitionPoints.length}</p>
      )}

      <ExclusionEditor />

      <button
        type="button"
        disabled={!metadata || status === 'processing'}
        onClick={handleSplit}
        className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {status === 'processing' ? 'Processing...' : 'Split Video'}
      </button>
    </div>
  );
};
