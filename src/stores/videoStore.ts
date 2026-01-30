import { create } from 'zustand';
import type { VideoMetadata } from '../types/video';

interface VideoState {
  videoFile: string | null;
  metadata: VideoMetadata | null;
  currentTime: number;
  setVideoFile: (path: string | null) => void;
  setMetadata: (metadata: VideoMetadata | null) => void;
  setCurrentTime: (time: number) => void;
  reset: () => void;
}

export const useVideoStore = create<VideoState>()((set) => ({
  videoFile: null,
  metadata: null,
  currentTime: 0,
  setVideoFile: (path) => set({ videoFile: path }),
  setMetadata: (metadata) => set({ metadata }),
  setCurrentTime: (time) => set({ currentTime: time }),
  reset: () => set({ videoFile: null, metadata: null, currentTime: 0 }),
}));
