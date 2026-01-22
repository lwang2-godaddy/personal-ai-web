'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiDelete } from '@/lib/api/client';
import {
  MigrationDefinition,
  MigrationRun,
  MigrationRunOptions,
  MigrationStatusResponse,
  MigrationStats,
  TriggerMigrationResponse,
  MIGRATION_CATEGORIES,
} from '@/lib/models/Migration';
import {
  MigrationStatusBadge,
  MigrationOptionsForm,
  MigrationProgressTracker,
  MigrationRunHistory,
  ConfirmMigrationModal,
} from '@/components/admin/migrations';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

interface MigrationDetailResponse {
  migration: MigrationDefinition;
  stats: MigrationStats;
  recentRuns: MigrationRun[];
}

interface PageProps {
  params: Promise<{ migrationId: string }>;
}

/**
 * Individual Migration Detail Page
 * Configure and run migrations, view history
 */
export default function MigrationDetailPage({ params }: PageProps) {
  // Track page view
  useTrackPage(TRACKED_SCREENS.adminMigrationDetail);

  const router = useRouter();
  const { migrationId } = use(params);

  const [migration, setMigration] = useState<MigrationDefinition | null>(null);
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [runs, setRuns] = useState<MigrationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Migration status
  const [status, setStatus] = useState<MigrationStatusResponse | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Run options
  const [options, setOptions] = useState<MigrationRunOptions>({
    dryRun: true,
    batchSize: 100,
  });

  // Active run tracking
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  // Fetch migration details
  const fetchMigration = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await apiGet<MigrationDetailResponse>(
        `/api/admin/migrations/${migrationId}`
      );
      setMigration(data.migration);
      setStats(data.stats);
      setRuns(data.recentRuns);

      // Check if there's an active run
      const activeRun = data.recentRuns.find((run) => run.status === 'running');
      if (activeRun) {
        setActiveRunId(activeRun.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch migration');
    } finally {
      setLoading(false);
    }
  }, [migrationId]);

  // Initial fetch
  useEffect(() => {
    fetchMigration();
  }, [fetchMigration]);

  // Check status
  const handleCheckStatus = async () => {
    try {
      setCheckingStatus(true);
      const data = await apiGet<MigrationStatusResponse>(
        `/api/admin/migrations/${migrationId}/status`
      );
      setStatus(data);
    } catch (err: any) {
      console.error('Failed to check status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  // Trigger migration
  const handleTriggerMigration = async () => {
    try {
      setIsTriggering(true);
      const response = await apiPost<TriggerMigrationResponse>(
        `/api/admin/migrations/${migrationId}`,
        { options }
      );

      if (response.success) {
        setActiveRunId(response.runId);
        setShowConfirmModal(false);
        fetchMigration();
      }
    } catch (err: any) {
      alert('Failed to trigger migration: ' + err.message);
    } finally {
      setIsTriggering(false);
    }
  };

  // Cancel migration
  const handleCancelMigration = async () => {
    if (!activeRunId) return;
    if (!confirm('Are you sure you want to cancel this migration?')) return;

    try {
      await apiDelete(`/api/admin/migrations/${migrationId}/runs/${activeRunId}`);
      setActiveRunId(null);
      fetchMigration();
    } catch (err: any) {
      alert('Failed to cancel migration: ' + err.message);
    }
  };

  // Handle migration completion
  const handleMigrationComplete = () => {
    setActiveRunId(null);
    fetchMigration();
  };

  // Resume from a partial run
  const handleResumeRun = (run: MigrationRun) => {
    if (run.result?.lastProcessedUserId) {
      setOptions((prev) => ({
        ...prev,
        startAfterUserId: run.result?.lastProcessedUserId,
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-4 border-gray-300 border-t-red-600 rounded-full animate-spin" />
        <span className="ml-3 text-gray-600">Loading migration...</span>
      </div>
    );
  }

  if (error || !migration) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
        <p className="text-sm text-red-700">{error || 'Migration not found'}</p>
        <Link
          href="/admin/migrations"
          className="mt-4 inline-block text-sm text-red-600 hover:text-red-800"
        >
          Back to Migrations
        </Link>
      </div>
    );
  }

  const category = MIGRATION_CATEGORIES.find((c) => c.id === migration.category);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/admin/migrations"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Migrations
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-sm text-gray-900">{migration.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <span className="text-4xl">{category?.icon || '📦'}</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{migration.name}</h1>
              <p className="text-sm text-gray-500 font-mono mt-1">{migration.id}</p>
              <p className="text-gray-600 mt-2">{migration.description}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {category?.label}
                </span>
                {migration.supportsDryRun && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Supports Dry Run
                  </span>
                )}
                {migration.supportsResume && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Resumable
                  </span>
                )}
                {migration.destructive && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Destructive
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="text-right">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalRuns}</div>
                  <div className="text-gray-500">Total Runs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.successfulRuns}
                  </div>
                  <div className="text-gray-500">Successful</div>
                </div>
              </div>
              {stats.lastRunAt && (
                <p className="text-xs text-gray-400 mt-2">
                  Last run: {new Date(stats.lastRunAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active Migration Progress */}
      {activeRunId && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Running Migration</h2>
            <button
              onClick={handleCancelMigration}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Cancel
            </button>
          </div>
          <MigrationProgressTracker
            migrationId={migrationId}
            runId={activeRunId}
            onComplete={handleMigrationComplete}
          />
        </div>
      )}

      {/* Configuration and Trigger */}
      {!activeRunId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Options Form */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h2>
            <MigrationOptionsForm
              migration={migration}
              initialOptions={options}
              onChange={setOptions}
            />

            {/* Status Check */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleCheckStatus}
                disabled={checkingStatus}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                {checkingStatus ? 'Checking...' : 'Check Current Status'}
              </button>

              {status && (
                <div className="mt-4 bg-gray-50 rounded-md p-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Total Users:</span>
                      <span className="ml-1 font-medium">{status.totalUsers}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Processed:</span>
                      <span className="ml-1 font-medium">{status.usersProcessed}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Remaining:</span>
                      <span className="ml-1 font-medium">{status.usersRemaining}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Completion:</span>
                      <span className="ml-1 font-medium">{status.percentComplete}%</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${status.percentComplete}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Run Button Panel */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Run Migration</h2>

            {/* Warnings */}
            {migration.destructive && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <p className="text-sm text-red-800 font-medium">
                  This is a destructive migration. Data may be permanently deleted.
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Always run a dry run first to verify what will be affected.
                </p>
              </div>
            )}

            {!options.dryRun && !migration.destructive && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  Live mode is enabled. This will modify data in your database.
                </p>
              </div>
            )}

            {options.dryRun && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                <p className="text-sm text-blue-800">
                  Dry run mode. No changes will be made - only a simulation.
                </p>
              </div>
            )}

            {/* Summary */}
            <div className="text-sm text-gray-600 mb-6 space-y-1">
              <p>
                <strong>Mode:</strong> {options.dryRun ? 'Dry Run' : 'Live'}
              </p>
              <p>
                <strong>Batch Size:</strong> {options.batchSize} users per batch
              </p>
              {options.startAfterUserId && (
                <p>
                  <strong>Resume From:</strong>{' '}
                  <code className="text-xs bg-gray-100 px-1 rounded">
                    {options.startAfterUserId}
                  </code>
                </p>
              )}
            </div>

            {/* Run Button */}
            <button
              onClick={() => setShowConfirmModal(true)}
              className={`w-full px-4 py-3 text-sm font-medium text-white rounded-md transition-colors ${
                migration.destructive && !options.dryRun
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {options.dryRun ? 'Start Dry Run' : 'Start Migration'}
            </button>
          </div>
        </div>
      )}

      {/* Run History */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Run History</h2>
        <MigrationRunHistory
          runs={runs}
          onResume={handleResumeRun}
        />
      </div>

      {/* Confirmation Modal */}
      <ConfirmMigrationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleTriggerMigration}
        migration={migration}
        options={options}
        status={status}
        isTriggering={isTriggering}
      />
    </div>
  );
}
