import { invoke } from '@tauri-apps/api/tauri';
import { useCallback, useEffect } from 'react';
import { FileSelector } from './components/FileSelector';
import { PartitionConfig } from './components/PartitionConfig';
import { PhotoViewer } from './components/PhotoViewer';
import { ProgressBar } from './components/ProgressBar';
import { ShortcutsBar } from './components/ShortcutsBar';
import { Timeline } from './components/Timeline';
import { ToastContainer } from './components/Toast';
import { VideoPlayer } from './components/VideoPlayer';
import { useDirectoryStore } from './stores/directoryStore';
import { usePartitionStore } from './stores/partitionStore';
import { useToastStore } from './stores/toastStore';
import { useVideoStore } from './stores/videoStore';

export const App = () => {
  const videoFile = useVideoStore((state) => state.videoFile);
  const resetVideo = useVideoStore((state) => state.reset);
  const setVideoFile = useVideoStore((state) => state.setVideoFile);
  const resetPartition = usePartitionStore((state) => state.reset);

  const currentTime = useVideoStore((state) => state.currentTime);
  const setTogglePlay = useVideoStore((state) => state.setTogglePlay);
  const addToast = useToastStore((state) => state.addToast);

  const directoryPath = useDirectoryStore((state) => state.directoryPath);
  const files = useDirectoryStore((state) => state.files);
  const currentIndex = useDirectoryStore((state) => state.currentIndex);
  const setCurrentIndex = useDirectoryStore((state) => state.setCurrentIndex);
  const removeFile = useDirectoryStore((state) => state.removeFile);
  const resetDirectory = useDirectoryStore((state) => state.reset);

  const currentFile = directoryPath ? files[currentIndex] : null;
  const isDirectoryMode = directoryPath !== null;
  const isVideoFile = currentFile?.fileType === 'video';
  const isImageFile = currentFile?.fileType === 'image';

  // When navigating to a video in directory mode, set it in the video store
  useEffect(() => {
    if (isDirectoryMode && isVideoFile && currentFile) {
      resetPartition();
      resetVideo();
      setVideoFile(currentFile.path);
    } else if (isDirectoryMode && isImageFile) {
      resetVideo();
      resetPartition();
    }
  }, [
    isDirectoryMode,
    isVideoFile,
    isImageFile,
    currentFile,
    resetPartition,
    resetVideo,
    setVideoFile,
  ]);

  const handleChangeVideo = () => {
    resetVideo();
    resetPartition();
    resetDirectory();
  };

  const handleDeleteFile = useCallback(async () => {
    if (!isDirectoryMode || !currentFile) return;
    try {
      await invoke('move_to_trash', { filePath: currentFile.path });
      resetVideo();
      resetPartition();
      removeFile(currentIndex);
    } catch (err) {
      console.error('Failed to move to trash:', err);
    }
  }, [isDirectoryMode, currentFile, currentIndex, removeFile, resetVideo, resetPartition]);

  const handleScreenshot = useCallback(async () => {
    if (!videoFile) return;
    try {
      const outputPath: string = await invoke('capture_frame', {
        videoPath: videoFile,
        timestampSecs: currentTime,
      });
      const fileName = outputPath.split('\\').pop() ?? outputPath.split('/').pop() ?? outputPath;
      addToast(`Saved: ${fileName}`, 'success');
    } catch (err) {
      addToast(`Screenshot failed: ${err}`, 'error');
    }
  }, [videoFile, currentTime, addToast]);

  const navigateFiles = useCallback(
    (direction: -1 | 1) => {
      if (!isDirectoryMode || files.length === 0) return;
      const newIndex = currentIndex + direction;
      if (newIndex >= 0 && newIndex < files.length) {
        setCurrentIndex(newIndex);
      }
    },
    [isDirectoryMode, files.length, currentIndex, setCurrentIndex]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        navigateFiles(-1);
      } else if (e.key === 'ArrowRight') {
        navigateFiles(1);
      } else if (e.key === 'Delete') {
        e.preventDefault();
        handleDeleteFile();
      } else if (e.key === ' ') {
        e.preventDefault();
        setTogglePlay();
      } else if (e.key === 's' || e.key === 'S') {
        handleScreenshot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateFiles, handleDeleteFile, setTogglePlay, handleScreenshot]);

  const showFileSelector = !videoFile && !isDirectoryMode;
  const showDirectoryVideo = isDirectoryMode && isVideoFile && videoFile;
  const showDirectoryImage = isDirectoryMode && isImageFile;
  const showSingleVideo = !isDirectoryMode && videoFile;

  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white">
      <header className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
        <h1 className="text-xl font-bold">Video Partitioner</h1>
        <div className="flex items-center gap-3">
          {isDirectoryMode && files.length > 0 && (
            <span className="text-sm text-gray-400">
              {currentIndex + 1} / {files.length}
            </span>
          )}
          {(videoFile || isDirectoryMode) && (
            <button
              type="button"
              onClick={handleChangeVideo}
              className="rounded bg-gray-700 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-600"
            >
              {isDirectoryMode ? 'Change Directory' : 'Change Video'}
            </button>
          )}
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {showFileSelector && <FileSelector />}

        {showDirectoryImage && <PhotoViewer />}

        {(showDirectoryVideo || showSingleVideo) && (
          <>
            <div className="flex flex-1 flex-col">
              <VideoPlayer />
              <Timeline />
            </div>
            <aside className="w-80 overflow-y-auto border-l border-gray-700 p-4">
              <PartitionConfig />
            </aside>
          </>
        )}
      </main>

      <footer className="flex items-center justify-between border-t border-gray-700 px-6 py-2">
        <ShortcutsBar />
        <ProgressBar />
      </footer>

      <ToastContainer />
    </div>
  );
};
