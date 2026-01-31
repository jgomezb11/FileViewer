import { create } from 'zustand';

export interface DirectoryEntry {
  path: string;
  name: string;
  fileType: 'video' | 'image';
}

interface DirectoryState {
  directoryPath: string | null;
  files: DirectoryEntry[];
  currentIndex: number;
  setDirectory: (path: string, files: DirectoryEntry[]) => void;
  setCurrentIndex: (index: number) => void;
  removeFile: (index: number) => void;
  reset: () => void;
}

export const useDirectoryStore = create<DirectoryState>()((set) => ({
  directoryPath: null,
  files: [],
  currentIndex: 0,
  setDirectory: (path, files) => set({ directoryPath: path, files, currentIndex: 0 }),
  setCurrentIndex: (index) => set({ currentIndex: index }),
  removeFile: (index) =>
    set((state) => {
      const newFiles = state.files.filter((_, i) => i !== index);
      let newIndex = state.currentIndex;
      if (newFiles.length === 0) {
        return { files: newFiles, currentIndex: 0, directoryPath: null };
      }
      if (newIndex >= newFiles.length) {
        newIndex = newFiles.length - 1;
      }
      return { files: newFiles, currentIndex: newIndex };
    }),
  reset: () => set({ directoryPath: null, files: [], currentIndex: 0 }),
}));
