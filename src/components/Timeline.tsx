import { useCallback, useRef, useState } from 'react';
import { useThumbnails } from '../hooks/useThumbnails';
import { usePartitionStore } from '../stores/partitionStore';
import { useVideoStore } from '../stores/videoStore';
import { formatDuration } from '../utils/formatters';

type DragMode =
  | { type: 'create'; startTime: number; endTime: number }
  | { type: 'resize-start'; index: number; time: number }
  | { type: 'resize-end'; index: number; time: number };

export const Timeline = () => {
  const metadata = useVideoStore((state) => state.metadata);
  const currentTime = useVideoStore((state) => state.currentTime);
  const setSeekTo = useVideoStore((state) => state.setSeekTo);
  const thumbnails = useVideoStore((state) => state.thumbnails);
  const partitionPoints = usePartitionStore((state) => state.partitionPoints);
  const exclusions = usePartitionStore((state) => state.exclusions);
  const addExclusion = usePartitionStore((state) => state.addExclusion);
  const updateExclusion = usePartitionStore((state) => state.updateExclusion);

  useThumbnails();

  const barRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragMode | null>(null);

  const pixelToTime = useCallback(
    (clientX: number): number => {
      if (!barRef.current || !metadata) return 0;
      const rect = barRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * metadata.durationSecs;
    },
    [metadata]
  );

  const handleBarMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const time = pixelToTime(e.clientX);
      setDrag({ type: 'create', startTime: time, endTime: time });
    },
    [pixelToTime]
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      const time = pixelToTime(e.clientX);
      setDrag({ type: 'resize-start', index, time });
    },
    [pixelToTime]
  );

  const handleResizeEnd = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      const time = pixelToTime(e.clientX);
      setDrag({ type: 'resize-end', index, time });
    },
    [pixelToTime]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drag) return;
      const time = pixelToTime(e.clientX);

      if (drag.type === 'create') {
        setDrag({ ...drag, endTime: time });
      } else if (drag.type === 'resize-start') {
        setDrag({ ...drag, time });
        setSeekTo(time);
      } else if (drag.type === 'resize-end') {
        setDrag({ ...drag, time });
        setSeekTo(time);
      }
    },
    [drag, pixelToTime, setSeekTo]
  );

  const commitDrag = useCallback(() => {
    if (!drag || !metadata) {
      setDrag(null);
      return;
    }

    const minDuration = metadata.durationSecs * 0.005;

    if (drag.type === 'create') {
      const start = Math.min(drag.startTime, drag.endTime);
      const end = Math.max(drag.startTime, drag.endTime);
      if (end - start >= minDuration) {
        addExclusion({ startSecs: start, endSecs: end });
      }
    } else if (drag.type === 'resize-start') {
      const excl = exclusions[drag.index];
      const newStart = Math.min(drag.time, excl.endSecs);
      const newEnd = Math.max(drag.time, excl.endSecs);
      if (newEnd - newStart >= minDuration) {
        updateExclusion(drag.index, { startSecs: newStart, endSecs: newEnd });
      }
    } else if (drag.type === 'resize-end') {
      const excl = exclusions[drag.index];
      const newStart = Math.min(excl.startSecs, drag.time);
      const newEnd = Math.max(excl.startSecs, drag.time);
      if (newEnd - newStart >= minDuration) {
        updateExclusion(drag.index, { startSecs: newStart, endSecs: newEnd });
      }
    }

    setDrag(null);
  }, [drag, metadata, exclusions, addExclusion, updateExclusion]);

  const handleMouseUp = useCallback(() => {
    commitDrag();
  }, [commitDrag]);

  const handleMouseLeave = useCallback(() => {
    commitDrag();
  }, [commitDrag]);

  if (!metadata) {
    return (
      <div className="h-24 border-t border-gray-700 bg-gray-800 p-4">
        <p className="text-sm text-gray-500">Load a video to see the timeline</p>
      </div>
    );
  }

  const progressPercent = (currentTime / metadata.durationSecs) * 100;

  // Find the nearest thumbnail to the current playback position
  const nearestThumbIndex =
    thumbnails.length > 0
      ? Math.min(
          thumbnails.length - 1,
          Math.max(0, Math.floor((currentTime / metadata.durationSecs) * thumbnails.length))
        )
      : -1;
  const nearestThumbUrl = nearestThumbIndex >= 0 ? thumbnails[nearestThumbIndex] : null;

  // Compute preview positions for active drag
  const getExclusionStyle = (index: number) => {
    const excl = exclusions[index];
    let startSecs = excl.startSecs;
    let endSecs = excl.endSecs;

    if (drag?.type === 'resize-start' && drag.index === index) {
      startSecs = Math.min(drag.time, excl.endSecs);
      endSecs = Math.max(drag.time, excl.endSecs);
    } else if (drag?.type === 'resize-end' && drag.index === index) {
      startSecs = Math.min(excl.startSecs, drag.time);
      endSecs = Math.max(excl.startSecs, drag.time);
    }

    const left = (startSecs / metadata.durationSecs) * 100;
    const width = ((endSecs - startSecs) / metadata.durationSecs) * 100;
    return { left: `${left}%`, width: `${width}%` };
  };

  // Active create-drag selection preview
  const dragLeft =
    drag?.type === 'create'
      ? (Math.min(drag.startTime, drag.endTime) / metadata.durationSecs) * 100
      : 0;
  const dragWidth =
    drag?.type === 'create'
      ? (Math.abs(drag.endTime - drag.startTime) / metadata.durationSecs) * 100
      : 0;

  return (
    <div className="border-t border-gray-700 bg-gray-800 px-4 pb-3 pt-2">
      {/* Current-position thumbnail preview */}
      {nearestThumbUrl && (
        <div className="relative mb-1 h-16">
          <div
            className="pointer-events-none absolute top-0"
            style={{
              left: `clamp(40px, ${progressPercent}%, calc(100% - 40px))`,
              transform: 'translateX(-50%)',
            }}
          >
            <img
              src={nearestThumbUrl}
              alt="Current frame"
              className="h-14 rounded border-2 border-blue-400 shadow-lg"
              draggable={false}
            />
          </div>
        </div>
      )}

      <div
        ref={barRef}
        role="slider"
        tabIndex={0}
        aria-label="Video timeline"
        aria-valuenow={currentTime}
        aria-valuemin={0}
        aria-valuemax={metadata.durationSecs}
        className="relative h-8 w-full cursor-crosshair overflow-hidden rounded bg-gray-700"
        onMouseDown={handleBarMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Thumbnail strip */}
        {thumbnails.length > 0 && (
          <div className="absolute inset-0 z-0 flex">
            {thumbnails.map((url, i) => (
              <img
                key={url}
                src={url}
                alt={`Thumbnail ${i + 1}`}
                className="h-full object-cover"
                style={{ width: `${100 / thumbnails.length}%` }}
                draggable={false}
              />
            ))}
          </div>
        )}

        {/* Exclusion zones with resize handles */}
        {exclusions.map((excl, index) => {
          const style = getExclusionStyle(index);
          return (
            <div
              key={`${excl.startSecs}-${excl.endSecs}`}
              className="absolute top-0 z-10 h-full bg-red-900/50"
              style={style}
            >
              {/* Left resize handle */}
              <div
                role="separator"
                tabIndex={0}
                className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize bg-red-400/70 hover:bg-red-400"
                onMouseDown={(e) => handleResizeStart(e, index)}
              />
              {/* Right resize handle */}
              <div
                role="separator"
                tabIndex={0}
                className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-red-400/70 hover:bg-red-400"
                onMouseDown={(e) => handleResizeEnd(e, index)}
              />
            </div>
          );
        })}

        {/* Active drag selection */}
        {drag?.type === 'create' && (
          <div
            className="absolute top-0 z-10 h-full border border-red-400/50 bg-red-500/30"
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
              className="absolute top-0 z-10 h-full w-0.5 bg-yellow-400"
              style={{ left: `${position}%` }}
            />
          );
        })}

        {/* Playback position */}
        <div
          className="absolute top-0 z-20 h-full w-0.5 bg-blue-400"
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      <div className="mt-1 flex justify-between text-xs text-gray-400">
        <span>
          Partitions: {partitionPoints.length} | Exclusions: {exclusions.length}
          {drag?.type === 'create' && ' | Drag to select exclusion'}
        </span>
        <span>
          {formatDuration(currentTime)} / {formatDuration(metadata.durationSecs)}
        </span>
      </div>
    </div>
  );
};
