import { usePartitionStore } from '../stores/partitionStore';

export const ProgressBar = () => {
  const status = usePartitionStore((state) => state.status);
  const progress = usePartitionStore((state) => state.progress);
  const errorMessage = usePartitionStore((state) => state.errorMessage);
  const setStatus = usePartitionStore((state) => state.setStatus);
  const setProgress = usePartitionStore((state) => state.setProgress);

  const handleReset = () => {
    setStatus('idle');
    setProgress(0);
  };

  if (status === 'idle') {
    return <p className="text-xs text-gray-500">Ready</p>;
  }

  if (status === 'complete') {
    return (
      <div className="flex items-center gap-3">
        <p className="text-xs text-green-400">Complete</p>
        <button
          type="button"
          onClick={handleReset}
          className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300 transition-colors hover:bg-gray-600"
        >
          Reset
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-3">
        <p className="text-xs text-red-400">{errorMessage}</p>
        <button
          type="button"
          onClick={handleReset}
          className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300 transition-colors hover:bg-gray-600"
        >
          Reset
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-700">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-gray-400">{progress.toFixed(0)}%</span>
    </div>
  );
};
