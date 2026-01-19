'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '@/lib/api/client';
import {
  MigrationProgressResponse,
  MigrationRunStatus,
  formatDuration,
} from '@/lib/models/Migration';
import MigrationStatusBadge from './MigrationStatusBadge';

interface MigrationProgressTrackerProps {
  migrationId: string;
  runId: string;
  onComplete?: (result: MigrationProgressResponse) => void;
  pollInterval?: number;
}

/**
 * Component that polls for migration progress and displays real-time updates
 */
export default function MigrationProgressTracker({
  migrationId,
  runId,
  onComplete,
  pollInterval = 2000,
}: MigrationProgressTrackerProps) {
  const [progress, setProgress] = useState<MigrationProgressResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  const fetchProgress = useCallback(async () => {
    try {
      const data = await apiGet<MigrationProgressResponse>(
        `/api/admin/migrations/${migrationId}/runs/${runId}/progress`
      );
      setProgress(data);
      setError(null);

      // Check if migration is complete
      if (
        data.status !== 'running' &&
        data.status !== 'idle'
      ) {
        setIsPolling(false);
        onComplete?.(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch progress');
    }
  }, [migrationId, runId, onComplete]);

  useEffect(() => {
    // Initial fetch
    fetchProgress();

    // Set up polling
    let intervalId: NodeJS.Timeout | null = null;
    if (isPolling) {
      intervalId = setInterval(fetchProgress, pollInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchProgress, isPolling, pollInterval]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <span className="text-red-500 text-xl">Error</span>
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <button
          onClick={() => {
            setError(null);
            fetchProgress();
          }}
          className="mt-2 text-sm text-red-600 hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-600">Loading progress...</p>
        </div>
      </div>
    );
  }

  const progressPercent =
    progress.progress && progress.progress.total > 0
      ? Math.round((progress.progress.current / progress.progress.total) * 100)
      : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MigrationStatusBadge status={progress.status} />
          {progress.status === 'running' && (
            <span className="text-sm text-gray-500">
              {isPolling ? 'Updating...' : 'Paused'}
            </span>
          )}
        </div>
        {progress.durationMs !== undefined && (
          <span className="text-sm text-gray-500">
            Duration: {formatDuration(progress.durationMs)}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {progress.status === 'running' && progress.progress && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>{progress.progress.phase}</span>
            <span>
              {progress.progress.current} / {progress.progress.total} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Result Summary (when complete) */}
      {progress.result && (
        <div
          className={`p-3 rounded-md ${
            progress.result.success ? 'bg-green-50' : 'bg-red-50'
          }`}
        >
          <h4
            className={`text-sm font-medium mb-2 ${
              progress.result.success ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {progress.result.success ? 'Migration Completed' : 'Migration Failed'}
          </h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Processed:</span>
              <span className="ml-1 font-medium">{progress.result.usersProcessed}</span>
            </div>
            <div>
              <span className="text-gray-500">Created:</span>
              <span className="ml-1 font-medium">{progress.result.usersCreated}</span>
            </div>
            <div>
              <span className="text-gray-500">Skipped:</span>
              <span className="ml-1 font-medium">{progress.result.usersSkipped}</span>
            </div>
          </div>

          {/* Errors */}
          {progress.result.errors.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h5 className="text-sm font-medium text-red-800 mb-2">
                Errors ({progress.result.errors.length})
              </h5>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {progress.result.errors.slice(0, 10).map((error, index) => (
                  <div key={index} className="text-xs text-red-700 bg-red-100 p-2 rounded">
                    {error.userId && (
                      <span className="font-mono mr-2">[{error.userId}]</span>
                    )}
                    {error.message}
                  </div>
                ))}
                {progress.result.errors.length > 10 && (
                  <p className="text-xs text-red-600">
                    ...and {progress.result.errors.length - 10} more errors
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Resume Cursor */}
          {progress.result.lastProcessedUserId && progress.status === 'partial' && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                Resume cursor:{' '}
                <code className="bg-gray-100 px-1 py-0.5 rounded">
                  {progress.result.lastProcessedUserId}
                </code>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
