import { create } from 'zustand';
import type { PartitionPoint, ProcessingStatus, TimeInterval } from '../types/partition';

interface PartitionState {
  targetSizeGb: number;
  exclusions: TimeInterval[];
  partitionPoints: PartitionPoint[];
  outputDir: string | null;
  status: ProcessingStatus;
  progress: number;
  errorMessage: string | null;
  setTargetSizeGb: (size: number) => void;
  addExclusion: (interval: TimeInterval) => void;
  removeExclusion: (index: number) => void;
  setPartitionPoints: (points: PartitionPoint[]) => void;
  setOutputDir: (dir: string | null) => void;
  setStatus: (status: ProcessingStatus) => void;
  setProgress: (progress: number) => void;
  setError: (message: string | null) => void;
  reset: () => void;
}

export const usePartitionStore = create<PartitionState>()((set) => ({
  targetSizeGb: 4,
  exclusions: [],
  partitionPoints: [],
  outputDir: null,
  status: 'idle',
  progress: 0,
  errorMessage: null,
  setTargetSizeGb: (size) => set({ targetSizeGb: size }),
  addExclusion: (interval) => set((state) => ({ exclusions: [...state.exclusions, interval] })),
  removeExclusion: (index) =>
    set((state) => ({
      exclusions: state.exclusions.filter((_, i) => i !== index),
    })),
  setPartitionPoints: (points) => set({ partitionPoints: points }),
  setOutputDir: (dir) => set({ outputDir: dir }),
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setError: (message) => set({ errorMessage: message, status: 'error' }),
  reset: () =>
    set({
      targetSizeGb: 4,
      exclusions: [],
      partitionPoints: [],
      outputDir: null,
      status: 'idle',
      progress: 0,
      errorMessage: null,
    }),
}));
