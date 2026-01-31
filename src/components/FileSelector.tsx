import { open } from '@tauri-apps/api/dialog';
import { invoke } from '@tauri-apps/api/tauri';
import type { DirectoryEntry } from '../stores/directoryStore';
import { useDirectoryStore } from '../stores/directoryStore';
import { useVideoStore } from '../stores/videoStore';

export const FileSelector = () => {
  const setVideoFile = useVideoStore((state) => state.setVideoFile);
  const setDirectory = useDirectoryStore((state) => state.setDirectory);

  const handleSelectFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: 'Video',
          extensions: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm'],
        },
      ],
    });

    if (typeof selected === 'string') {
      setVideoFile(selected);
    }
  };

  const handleSelectDirectory = async () => {
    const selected = await open({
      directory: true,
      title: 'Select a directory to browse',
    });

    if (typeof selected !== 'string') return;

    try {
      const files = await invoke<DirectoryEntry[]>('list_directory', {
        dirPath: selected,
      });

      if (files.length === 0) {
        console.warn('No video or image files found in directory');
        return;
      }

      setDirectory(selected, files);
    } catch (err) {
      console.error('Failed to list directory:', err);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center gap-6">
      <button
        type="button"
        onClick={handleSelectFile}
        className="rounded-lg border-2 border-dashed border-gray-600 px-12 py-8 text-gray-400 transition-colors hover:border-blue-500 hover:text-blue-400"
      >
        <p className="text-lg font-medium">Select a video file</p>
        <p className="mt-2 text-sm">Open a single video</p>
      </button>

      <button
        type="button"
        onClick={handleSelectDirectory}
        className="rounded-lg border-2 border-dashed border-gray-600 px-12 py-8 text-gray-400 transition-colors hover:border-green-500 hover:text-green-400"
      >
        <p className="text-lg font-medium">Open Directory</p>
        <p className="mt-2 text-sm">Browse videos and photos</p>
      </button>
    </div>
  );
};
