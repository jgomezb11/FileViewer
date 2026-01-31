import { convertFileSrc } from '@tauri-apps/api/tauri';
import { useDirectoryStore } from '../stores/directoryStore';

export const PhotoViewer = () => {
  const files = useDirectoryStore((state) => state.files);
  const currentIndex = useDirectoryStore((state) => state.currentIndex);

  const currentFile = files[currentIndex];

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
