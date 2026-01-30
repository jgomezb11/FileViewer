import { useCallback, useRef, useState } from 'react';
import { usePartitionStore } from '../stores/partitionStore';
import { useVideoStore } from '../stores/videoStore';
import { formatDuration } from '../utils/formatters';

export const Timeline = () => {
  const metadata = useVideoStore((state) => state.metadata);
  const currentTime = useVideoStore((state) => state.currentTime);
  const partitionPoints = usePartitionStore((state) => state.partitionPoints);
  const exclusions = usePartitionStore((state) => state.exclusions);
  const addExclusion = usePartitionStore((state) => state.addExclusion);

  const barRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);

  const pixelToTime = useCallback(
    (clientX: number): number => {
      if (!barRef.current || !metadata) return 0;
      const rect = barRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * metadata.durationSecs;
    },
    [metadata]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // left click only
      const time = pixelToTime(e.clientX);
      setDragStart(time);
      setDragEnd(time);
    },
    [pixelToTime]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragStart === null) return;
      setDragEnd(pixelToTime(e.clientX));
    },
    [dragStart, pixelToTime]
  );

  const handleMouseUp = useCallback(() => {
    if (dragStart === null || dragEnd === null || !metadata) {
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const start = Math.min(dragStart, dragEnd);
    const end = Math.max(dragStart, dragEnd);
    const minDuration = metadata.durationSecs * 0.005; // Minimum 0.5% of video

    if (end - start >= minDuration) {
      addExclusion({ startSecs: start, endSecs: end });
    }

    setDragStart(null);
    setDragEnd(null);
  }, [dragStart, dragEnd, metadata, addExclusion]);

  const handleMouseLeave = useCallback(() => {
    if (dragStart !== null) {
      setDragStart(null);
      setDragEnd(null);
    }
  }, [dragStart]);

  if (!metadata) {
    return (
      <div className="h-24 border-t border-gray-700 bg-gray-800 p-4">
        <p className="text-sm text-gray-500">Load a video to see the timeline</p>
      </div>
    );
  }

  const progressPercent = (currentTime / metadata.durationSecs) * 100;

  // Active drag selection preview
  const dragLeft =
    dragStart !== null && dragEnd !== null
      ? (Math.min(dragStart, dragEnd) / metadata.durationSecs) * 100
      : 0;
  const dragWidth =
    dragStart !== null && dragEnd !== null
      ? (Math.abs(dragEnd - dragStart) / metadata.durationSecs) * 100
      : 0;

  return (
    <div className="h-24 border-t border-gray-700 bg-gray-800 p-4">
      <div
        ref={barRef}
        role="slider"
        tabIndex={0}
        aria-label="Video timeline"
        aria-valuenow={currentTime}
        aria-valuemin={0}
        aria-valuemax={metadata.durationSecs}
        className="relative h-8 w-full cursor-crosshair overflow-hidden rounded bg-gray-700"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Exclusion zones */}
        {exclusions.map((excl) => {
          const left = (excl.startSecs / metadata.durationSecs) * 100;
          const width = ((excl.endSecs - excl.startSecs) / metadata.durationSecs) * 100;
          return (
            <div
              key={`${excl.startSecs}-${excl.endSecs}`}
              className="absolute top-0 h-full bg-red-900/50"
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}

        {/* Active drag selection */}
        {dragStart !== null && dragEnd !== null && (
          <div
            className="absolute top-0 h-full bg-red-500/30 border border-red-400/50"
            style={{ left: `${dragLeft}%`, width: `${dragWidth}%` }}
          />
        )}

        {/* Partition markers */}
        {partitionPoints.map((point) => {
          if (point.index === 0) return null;
          const position = (point.startSecs / metadata.durationSecs) * 100;
          return (
            <div
              key={point.index}
              className="absolute top-0 h-full w-0.5 bg-yellow-400"
              style={{ left: `${position}%` }}
            />
          );
        })}

        {/* Playback position */}
        <div
          className="absolute top-0 h-full w-0.5 bg-blue-400"
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      <div className="mt-1 flex justify-between text-xs text-gray-400">
        <span>
          Partitions: {partitionPoints.length} | Exclusions: {exclusions.length}
          {dragStart !== null && ' | Drag to select exclusion'}
        </span>
        <span>
          {formatDuration(currentTime)} / {formatDuration(metadata.durationSecs)}
        </span>
      </div>
    </div>
  );
};
