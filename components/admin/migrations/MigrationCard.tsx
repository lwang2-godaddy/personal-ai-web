'use client';

import Link from 'next/link';
import { MigrationWithStats, MIGRATION_CATEGORIES, formatDuration } from '@/lib/models/Migration';
import MigrationStatusBadge from './MigrationStatusBadge';

interface MigrationCardProps {
  migration: MigrationWithStats;
  onCheckStatus?: () => void;
  onRun?: () => void;
  isCheckingStatus?: boolean;
}

/**
 * Card component for displaying a migration in the list
 */
export default function MigrationCard({
  migration,
  onCheckStatus,
  onRun,
  isCheckingStatus = false,
}: MigrationCardProps) {
  const category = MIGRATION_CATEGORIES.find((c) => c.id === migration.category);
  const hasRecentRun = migration.stats.lastRunAt;
  const isCurrentlyRunning = migration.recentRuns.some((run) => run.status === 'running');

  // Calculate completion percentage from last successful run
  const lastSuccessfulRun = migration.recentRuns.find((run) => run.status === 'completed');
  const completionText = lastSuccessfulRun?.result
    ? `${lastSuccessfulRun.result.usersProcessed} users processed`
    : migration.stats.totalRuns > 0
      ? 'Ran before'
      : 'Never run';

  // Format last run time
  const getLastRunTime = () => {
    if (!migration.stats.lastRunAt) return 'Never';
    const date = new Date(migration.stats.lastRunAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-5 border border-gray-200 hover:shadow-lg transition-shadow ${
        migration.destructive ? 'border-l-4 border-l-red-500' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{category?.icon || '📦'}</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{migration.name}</h3>
            <span className="text-xs text-gray-500 font-mono">{migration.id}</span>
          </div>
        </div>
        {isCurrentlyRunning && <MigrationStatusBadge status="running" />}
        {migration.destructive && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            Destructive
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{migration.description}</p>

      {/* Stats Row */}
      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
        <div className="flex items-center gap-1">
          <span className="text-gray-400">Runs:</span>
          <span className="font-medium">{migration.stats.totalRuns}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-green-500">Success:</span>
          <span className="font-medium">{migration.stats.successfulRuns}</span>
        </div>
        {migration.stats.failedRuns > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-red-500">Failed:</span>
            <span className="font-medium">{migration.stats.failedRuns}</span>
          </div>
        )}
      </div>

      {/* Last Run Info */}
      <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-3 mb-4">
        <div>
          <span className="text-gray-500">Last run: </span>
          <span className="font-medium">{getLastRunTime()}</span>
        </div>
        {migration.stats.lastRunStatus && (
          <MigrationStatusBadge status={migration.stats.lastRunStatus} />
        )}
      </div>

      {/* Features */}
      <div className="flex flex-wrap gap-2 mb-4">
        {migration.supportsDryRun && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            Dry Run
          </span>
        )}
        {migration.supportsResume && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
            Resumable
          </span>
        )}
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
          {category?.label}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onCheckStatus}
          disabled={isCheckingStatus || isCurrentlyRunning}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCheckingStatus ? 'Checking...' : 'Check Status'}
        </button>
        <Link
          href={`/admin/migrations/${migration.id}`}
          className="flex-1 px-3 py-2 text-sm font-medium text-center text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
        >
          {isCurrentlyRunning ? 'View Progress' : 'Run'}
        </Link>
      </div>
    </div>
  );
}
