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
        const metadata = await invoke<VideoMetadata>('get_video_metadata', {
          filePath,
        });
        setMetadata(metadata);
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
