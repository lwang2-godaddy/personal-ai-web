'use client';

import Link from 'next/link';
import { MigrationRun, formatDuration } from '@/lib/models/Migration';

interface ActiveMigrationBannerProps {
  activeMigrations: MigrationRun[];
  onCancel?: (run: MigrationRun) => void;
}

/**
 * Banner showing currently running migrations
 */
export default function ActiveMigrationBanner({
  activeMigrations,
  onCancel,
}: ActiveMigrationBannerProps) {
  if (activeMigrations.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse" />
        <h3 className="text-sm font-semibold text-blue-800">
          {activeMigrations.length === 1
            ? 'Migration Running'
            : `${activeMigrations.length} Migrations Running`}
        </h3>
      </div>

      <div className="space-y-3">
        {activeMigrations.map((run) => {
          const progress = run.progress;
          const progressPercent =
            progress && progress.total > 0
              ? Math.round((progress.current / progress.total) * 100)
              : 0;
          const elapsedMs = Date.now() - new Date(run.startedAt).getTime();

          return (
            <div
              key={run.id}
              className="bg-white rounded-md p-3 border border-blue-100"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium text-gray-900">{run.migrationId}</span>
                  {run.options.dryRun && (
                    <span className="ml-2 text-xs text-blue-600">(Dry Run)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {formatDuration(elapsedMs)}
                  </span>
                  <Link
                    href={`/admin/migrations/${run.migrationId}`}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    View
                  </Link>
                  {onCancel && (
                    <button
                      onClick={() => onCancel(run)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Progress */}
              {progress && (
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>{progress.phase}</span>
                    <span>
                      {progress.current} / {progress.total} ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
