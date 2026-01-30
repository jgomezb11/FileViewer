import { open } from '@tauri-apps/api/dialog';
import { useVideoStore } from '../stores/videoStore';

export const FileSelector = () => {
  const setVideoFile = useVideoStore((state) => state.setVideoFile);

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

  return (
    <div className="flex flex-1 items-center justify-center">
      <button
        type="button"
        onClick={handleSelectFile}
        className="rounded-lg border-2 border-dashed border-gray-600 px-12 py-8 text-gray-400 transition-colors hover:border-blue-500 hover:text-blue-400"
      >
        <p className="text-lg font-medium">Select a video file</p>
        <p className="mt-2 text-sm">Click to browse or drag and drop</p>
      </button>
    </div>
  );
};
