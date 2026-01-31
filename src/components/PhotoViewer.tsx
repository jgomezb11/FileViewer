import { convertFileSrc } from '@tauri-apps/api/tauri';
import { invoke } from '@tauri-apps/api/tauri';
import { useCallback, useEffect } from 'react';
import { useDirectoryStore } from '../stores/directoryStore';

export const PhotoViewer = () => {
  const files = useDirectoryStore((state) => state.files);
  const currentIndex = useDirectoryStore((state) => state.currentIndex);
  const removeFile = useDirectoryStore((state) => state.removeFile);

  const currentFile = files[currentIndex];

  const handleDelete = useCallback(async () => {
    if (!currentFile) return;

    try {
      await invoke('move_to_trash', { filePath: currentFile.path });
      removeFile(currentIndex);
    } catch (err) {
      console.error('Failed to move to trash:', err);
    }
  }, [currentFile, currentIndex, removeFile]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete') {
        e.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDelete]);

  if (!currentFile) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-500">
        No image to display
      </div>
    );
  }

  const imgSrc = convertFileSrc(currentFile.path);

  return (
    <div className="relative flex flex-1 items-center justify-center bg-black">
      <img src={imgSrc} alt={currentFile.name} className="max-h-full max-w-full object-contain" />
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-4 py-2 text-center text-sm text-gray-300">
        {currentFile.name}
        <span className="ml-4 text-gray-500">Press Delete to move to trash</span>
      </div>
    </div>
  );
};
