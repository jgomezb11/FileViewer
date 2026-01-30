import { useCallback } from 'react';
import { usePartitionStore } from '../stores/partitionStore';
import { useVideoStore } from '../stores/videoStore';
import type { PartitionPoint } from '../types/partition';
import { gbToBytes } from '../utils/formatters';

export const usePartitionCalculator = () => {
  const metadata = useVideoStore((state) => state.metadata);
  const targetSizeGb = usePartitionStore((state) => state.targetSizeGb);
  const exclusions = usePartitionStore((state) => state.exclusions);
  const setPartitionPoints = usePartitionStore((state) => state.setPartitionPoints);

  const calculate = useCallback(() => {
    if (!metadata) return;

    const targetBytes = gbToBytes(targetSizeGb);
    const totalDuration = metadata.durationSecs;
    const totalSize = metadata.fileSize;

    const excludedDuration = exclusions.reduce((sum, e) => sum + (e.endSecs - e.startSecs), 0);

    const effectiveDuration = totalDuration - excludedDuration;
    const effectiveSize = (effectiveDuration / totalDuration) * totalSize;
    const partitionCount = Math.ceil(effectiveSize / targetBytes);

    if (partitionCount <= 0) {
      setPartitionPoints([]);
      return;
    }

    const timePerPartition = effectiveDuration / partitionCount;
    const points: PartitionPoint[] = [];

    for (let i = 0; i < partitionCount; i++) {
      points.push({
        index: i,
        startSecs: i * timePerPartition,
        endSecs: Math.min((i + 1) * timePerPartition, effectiveDuration),
        estimatedSizeBytes: Math.min(targetBytes, effectiveSize - i * targetBytes),
      });
    }

    setPartitionPoints(points);
  }, [metadata, targetSizeGb, exclusions, setPartitionPoints]);

  return { calculate };
};
