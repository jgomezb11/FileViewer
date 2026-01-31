import { invoke } from '@tauri-apps/api/tauri';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { useEffect } from 'react';
import { useVideoStore } from '../stores/videoStore';

const THUMBNAIL_COUNT = 20;
const THUMBNAIL_HEIGHT = 60;

export const useThumbnails = () => {
  const videoFile = useVideoStore((state) => state.videoFile);
  const setThumbnails = useVideoStore((state) => state.setThumbnails);

  useEffect(() => {
    if (!videoFile) {
      setThumbnails([]);
      return;
    }

    let cancelled = false;

    const generate = async () => {
      try {
        const paths = await invoke<string[]>('generate_thumbnails', {
          videoPath: videoFile,
          count: THUMBNAIL_COUNT,
          height: THUMBNAIL_HEIGHT,
        });

        if (cancelled) return;

        const urls = paths.map((p) => convertFileSrc(p));
        setThumbnails(urls);
      } catch {
        if (!cancelled) {
          setThumbnails([]);
        }
      }
    };

    generate();

    return () => {
      cancelled = true;
    };
  }, [videoFile, setThumbnails]);
};
