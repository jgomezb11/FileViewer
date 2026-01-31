import { useCallback } from 'react';
import { usePartitionStore } from '../stores/partitionStore';
import { useVideoStore } from '../stores/videoStore';
import type { PartitionPoint, TimeInterval } from '../types/partition';
import { gbToBytes } from '../utils/formatters';

/** Maps a time in the effective timeline back to the original video timestamp. */
const effectiveToOriginal = (effectiveSecs: number, sorted: TimeInterval[]): number => {
  let accumulated = 0;
  for (const excl of sorted) {
    const effectiveExclStart = excl.startSecs - accumulated;
    if (effectiveSecs >= effectiveExclStart) {
      accumulated += excl.endSecs - excl.startSecs;
    } else {
      break;
    }
  }
  return effectiveSecs + accumulated;
};

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

    // Sort exclusions once for the mapping function
    const sorted = [...exclusions].sort((a, b) => a.startSecs - b.startSecs);

    const timePerPartition = effectiveDuration / partitionCount;
    const points: PartitionPoint[] = [];

    for (let i = 0; i < partitionCount; i++) {
      const effStart = i * timePerPartition;
      const effEnd = Math.min((i + 1) * timePerPartition, effectiveDuration);

      points.push({
        index: i,
        startSecs: effectiveToOriginal(effStart, sorted),
        endSecs: effectiveToOriginal(effEnd, sorted),
        estimatedSizeBytes: Math.min(targetBytes, effectiveSize - i * targetBytes),
      });
    }

    setPartitionPoints(points);
  }, [metadata, targetSizeGb, exclusions, setPartitionPoints]);

  return { calculate };
};
