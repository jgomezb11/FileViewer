import { create } from 'zustand';
import type { VideoMetadata } from '../types/video';

interface VideoState {
  videoFile: string | null;
  metadata: VideoMetadata | null;
  currentTime: number;
  seekTo: number | null;
  thumbnails: string[];
  togglePlaySignal: number | null;
  setVideoFile: (path: string | null) => void;
  setMetadata: (metadata: VideoMetadata | null) => void;
  setCurrentTime: (time: number) => void;
  setSeekTo: (time: number | null) => void;
  setThumbnails: (urls: string[]) => void;
  setTogglePlay: () => void;
  clearTogglePlay: () => void;
  reset: () => void;
}

export const useVideoStore = create<VideoState>()((set) => ({
  videoFile: null,
  metadata: null,
  currentTime: 0,
  seekTo: null,
  thumbnails: [],
  togglePlaySignal: null,
  setVideoFile: (path) => set({ videoFile: path }),
  setMetadata: (metadata) => set({ metadata }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setSeekTo: (time) => set({ seekTo: time }),
  setThumbnails: (urls) => set({ thumbnails: urls }),
  setTogglePlay: () => set((state) => ({ togglePlaySignal: (state.togglePlaySignal ?? 0) + 1 })),
  clearTogglePlay: () => set({ togglePlaySignal: null }),
  reset: () =>
    set({
      videoFile: null,
      metadata: null,
      currentTime: 0,
      seekTo: null,
      thumbnails: [],
      togglePlaySignal: null,
    }),
}));
