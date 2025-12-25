import { LocationData } from '@/lib/models';

interface LocationDataCardProps {
  data: LocationData[];
}

export function LocationDataCard({ data }: LocationDataCardProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📍 Recent Locations
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No location data collected yet. Enable location tracking in the mobile app to see where you've been.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        📍 Recent Locations
      </h3>
      <div className="space-y-3">
        {data.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <div className="flex items-center justify-between mb-2">
              {item.activity ? (
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400 capitalize">
                  {item.activity}
                </span>
              ) : (
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Unknown Activity
                </span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(item.timestamp).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-1 line-clamp-1">
              {item.address || `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`}
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>Visits: {item.visitCount}</span>
              {item.duration > 0 && (
                <span>Duration: {Math.floor(item.duration / 60)} min</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
