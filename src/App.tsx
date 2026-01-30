import { FileSelector } from './components/FileSelector';
import { PartitionConfig } from './components/PartitionConfig';
import { ProgressBar } from './components/ProgressBar';
import { Timeline } from './components/Timeline';
import { VideoPlayer } from './components/VideoPlayer';
import { usePartitionStore } from './stores/partitionStore';
import { useVideoStore } from './stores/videoStore';

export const App = () => {
  const videoFile = useVideoStore((state) => state.videoFile);
  const resetVideo = useVideoStore((state) => state.reset);
  const resetPartition = usePartitionStore((state) => state.reset);

  const handleChangeVideo = () => {
    resetVideo();
    resetPartition();
  };

  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white">
      <header className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
        <h1 className="text-xl font-bold">Video Partitioner</h1>
        {videoFile && (
          <button
            type="button"
            onClick={handleChangeVideo}
            className="rounded bg-gray-700 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-600"
          >
            Change Video
          </button>
        )}
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Left panel: Video player and timeline */}
        <div className="flex flex-1 flex-col">
          {videoFile ? (
            <>
              <VideoPlayer />
              <Timeline />
            </>
          ) : (
            <FileSelector />
          )}
        </div>

        {/* Right panel: Configuration */}
        <aside className="w-80 overflow-y-auto border-l border-gray-700 p-4">
          <PartitionConfig />
        </aside>
      </main>

      <footer className="border-t border-gray-700 px-6 py-2">
        <ProgressBar />
      </footer>
    </div>
  );
};
