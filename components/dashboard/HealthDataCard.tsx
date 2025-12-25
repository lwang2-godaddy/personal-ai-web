import { HealthData } from '@/lib/models';

interface HealthDataCardProps {
  data: HealthData[];
}

export function HealthDataCard({ data }: HealthDataCardProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          💪 Recent Health Data
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No health data collected yet. Use the mobile app to sync health data from HealthKit or Google Fit.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        💪 Recent Health Data
      </h3>
      <div className="space-y-3">
        {data.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {item.type}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(item.startDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {item.value.toLocaleString()} {item.unit}
              </span>
              {item.metadata.workoutType && (
                <span className="text-xs text-gray-600 dark:text-gray-300 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                  {item.metadata.workoutType}
                </span>
              )}
            </div>
            {item.metadata.distance && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Distance: {item.metadata.distance.toFixed(2)} km
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
