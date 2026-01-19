'use client';

import { useState } from 'react';
import { MigrationRun, formatDuration } from '@/lib/models/Migration';
import MigrationStatusBadge from './MigrationStatusBadge';

interface MigrationRunHistoryProps {
  runs: MigrationRun[];
  onViewRun?: (run: MigrationRun) => void;
  onResume?: (run: MigrationRun) => void;
}

/**
 * Table component for displaying migration run history
 */
export default function MigrationRunHistory({
  runs,
  onViewRun,
  onResume,
}: MigrationRunHistoryProps) {
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (runs.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-500">No migration runs yet</p>
        <p className="text-sm text-gray-400 mt-1">Run this migration to see history</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Started
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Duration
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Options
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Result
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {runs.map((run) => {
            const isExpanded = expandedRunId === run.id;

            return (
              <tr key={run.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <MigrationStatusBadge status={run.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  <div>{formatDate(run.startedAt)}</div>
                  {run.triggeredByEmail && (
                    <div className="text-xs text-gray-400">{run.triggeredByEmail}</div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {run.durationMs ? formatDuration(run.durationMs) : '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <div className="flex flex-wrap gap-1">
                    {run.options.dryRun && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Dry Run
                      </span>
                    )}
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      Batch: {run.options.batchSize}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  {run.result ? (
                    <div className="flex flex-col gap-0.5">
                      <div className="flex gap-2 text-xs">
                        <span className="text-gray-500">
                          Processed: <strong>{run.result.usersProcessed}</strong>
                        </span>
                        <span className="text-green-600">
                          Created: <strong>{run.result.usersCreated}</strong>
                        </span>
                      </div>
                      {run.result.errors.length > 0 && (
                        <span className="text-xs text-red-600">
                          {run.result.errors.length} error(s)
                        </span>
                      )}
                    </div>
                  ) : run.progress ? (
                    <div className="text-xs text-gray-500">
                      {run.progress.current} / {run.progress.total}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    {isExpanded ? 'Hide' : 'Details'}
                  </button>
                  {run.status === 'partial' &&
                    run.result?.lastProcessedUserId &&
                    onResume && (
                      <button
                        onClick={() => onResume(run)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Resume
                      </button>
                    )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Expanded Details */}
      {expandedRunId && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          {(() => {
            const run = runs.find((r) => r.id === expandedRunId);
            if (!run) return null;

            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">Run Details</h4>
                    <dl className="space-y-1">
                      <div className="flex">
                        <dt className="text-gray-500 w-24">Run ID:</dt>
                        <dd className="font-mono text-xs">{run.id}</dd>
                      </div>
                      <div className="flex">
                        <dt className="text-gray-500 w-24">Triggered by:</dt>
                        <dd>{run.triggeredByEmail || run.triggeredBy}</dd>
                      </div>
                      {run.completedAt && (
                        <div className="flex">
                          <dt className="text-gray-500 w-24">Completed:</dt>
                          <dd>{formatDate(run.completedAt)}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">Options</h4>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(run.options, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Errors */}
                {run.result?.errors && run.result.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">
                      Errors ({run.result.errors.length})
                    </h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {run.result.errors.map((error, index) => (
                        <div
                          key={index}
                          className="text-xs text-red-700 bg-red-100 p-2 rounded"
                        >
                          <span className="text-gray-500 mr-2">
                            {new Date(error.timestamp).toLocaleTimeString()}
                          </span>
                          {error.userId && (
                            <span className="font-mono mr-2">[{error.userId}]</span>
                          )}
                          {error.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resume Cursor */}
                {run.result?.lastProcessedUserId && (
                  <div className="text-sm">
                    <span className="text-gray-500">Last processed user: </span>
                    <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                      {run.result.lastProcessedUserId}
                    </code>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
