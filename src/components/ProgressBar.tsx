import { usePartitionStore } from '../stores/partitionStore';

export const ProgressBar = () => {
  const status = usePartitionStore((state) => state.status);
  const progress = usePartitionStore((state) => state.progress);
  const errorMessage = usePartitionStore((state) => state.errorMessage);

  if (status === 'idle') {
    return <p className="text-xs text-gray-500">Ready</p>;
  }

  if (status === 'complete') {
    return <p className="text-xs text-green-400">Complete</p>;
  }

  if (status === 'error') {
    return <p className="text-xs text-red-400">{errorMessage}</p>;
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
