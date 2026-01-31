import { useDirectoryStore } from '../stores/directoryStore';
import { useVideoStore } from '../stores/videoStore';

const Shortcut = ({ keys, label }: { keys: string; label: string }) => (
  <span className="flex items-center gap-1.5 text-gray-400">
    <kbd className="rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5 font-mono text-xs text-gray-300">
      {keys}
    </kbd>
    <span className="text-xs">{label}</span>
  </span>
);

export const ShortcutsBar = () => {
  const videoFile = useVideoStore((state) => state.videoFile);
  const directoryPath = useDirectoryStore((state) => state.directoryPath);

  const hasVideo = videoFile !== null;
  const isDirectoryMode = directoryPath !== null;

  return (
    <div className="flex items-center gap-4">
      {hasVideo && (
        <>
          <Shortcut keys="Space" label="Play/Pause" />
          <Shortcut keys="S" label="Screenshot" />
        </>
      )}
      {isDirectoryMode && (
        <>
          <Shortcut keys="&#8592; &#8594;" label="Prev/Next" />
          <Shortcut keys="Del" label="Trash" />
        </>
      )}
    </div>
  );
};
