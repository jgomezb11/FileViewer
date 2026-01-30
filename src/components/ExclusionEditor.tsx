import { usePartitionStore } from '../stores/partitionStore';

export const ExclusionEditor = () => {
  const exclusions = usePartitionStore((state) => state.exclusions);
  const removeExclusion = usePartitionStore((state) => state.removeExclusion);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Excluded Intervals</h3>
      {exclusions.length === 0 ? (
        <p className="text-xs text-gray-500">No exclusions. Select intervals on the timeline.</p>
      ) : (
        <ul className="space-y-1">
          {exclusions.map((excl, index) => (
            <li
              key={`${excl.startSecs}-${excl.endSecs}`}
              className="flex items-center justify-between text-xs"
            >
              <span>
                {excl.startSecs.toFixed(1)}s - {excl.endSecs.toFixed(1)}s
              </span>
              <button
                type="button"
                onClick={() => removeExclusion(index)}
                className="text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
