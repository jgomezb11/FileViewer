import { convertFileSrc } from '@tauri-apps/api/tauri';
import { useRef } from 'react';
import { useVideoMetadata } from '../hooks/useVideoMetadata';
import { useVideoStore } from '../stores/videoStore';

export const VideoPlayer = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoFile = useVideoStore((state) => state.videoFile);
  const setCurrentTime = useVideoStore((state) => state.setCurrentTime);
  const setMetadata = useVideoStore((state) => state.setMetadata);
  const metadata = useVideoStore((state) => state.metadata);
  const { fetchMetadata } = useVideoMetadata();

  if (!videoFile) {
    return null;
  }

  const videoSrc = convertFileSrc(videoFile);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video || metadata) return;

    const fileName = videoFile.split('\\').pop() ?? videoFile.split('/').pop() ?? videoFile;

    // Set initial metadata from the HTML5 video element
    setMetadata({
      filePath: videoFile,
      fileName,
      fileSize: 0,
      durationSecs: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      videoCodec: 'unknown',
      audioCodec: null,
      bitrate: 0,
      format: fileName.split('.').pop() ?? 'unknown',
    });

    // Fetch full metadata from the backend (file size, codecs, bitrate)
    fetchMetadata(videoFile);
  };

  return (
    <div className="flex-1 bg-black">
      <video
        ref={videoRef}
        src={videoSrc}
        controls
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        className="h-full w-full object-contain"
      >
        <track kind="captions" />
      </video>
    </div>
  );
};
