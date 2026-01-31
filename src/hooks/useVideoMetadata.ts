import { invoke } from '@tauri-apps/api/tauri';
import { useCallback, useState } from 'react';
import { useVideoStore } from '../stores/videoStore';
import type { VideoMetadata } from '../types/video';

export const useVideoMetadata = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setMetadata = useVideoStore((state) => state.setMetadata);

  const fetchMetadata = useCallback(
    async (filePath: string) => {
      setLoading(true);
      setError(null);
      try {
        const backend = await invoke<VideoMetadata>('get_video_metadata', {
          filePath,
        });
        // Read current store state at the time the response arrives,
        // avoiding stale closure values.
        const current = useVideoStore.getState().metadata;
        // Merge: prefer backend values, but keep HTML5 values for any
        // fields where the backend returned zero/empty (e.g. when FFmpeg
        // sidecar is unavailable).
        const merged: VideoMetadata = {
          filePath: backend.filePath || current?.filePath || filePath,
          fileName: backend.fileName || current?.fileName || '',
          fileSize: backend.fileSize || current?.fileSize || 0,
          durationSecs: backend.durationSecs || current?.durationSecs || 0,
          width: backend.width || current?.width || 0,
          height: backend.height || current?.height || 0,
          videoCodec:
            backend.videoCodec && backend.videoCodec !== 'unknown'
              ? backend.videoCodec
              : current?.videoCodec || 'unknown',
          audioCodec: backend.audioCodec || current?.audioCodec || null,
          bitrate: backend.bitrate || current?.bitrate || 0,
          format: backend.format || current?.format || 'unknown',
        };
        setMetadata(merged);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [setMetadata]
  );

  return { fetchMetadata, loading, error };
};
