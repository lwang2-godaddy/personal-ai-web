'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiDelete } from '@/lib/api/client';
import {
  MigrationsListResponse,
  MigrationWithStats,
  MigrationRun,
  MigrationCategory,
  MIGRATION_CATEGORIES,
  MigrationStatusResponse,
} from '@/lib/models/Migration';
import {
  MigrationCard,
  ActiveMigrationBanner,
  MigrationDocs,
} from '@/components/admin/migrations';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

/**
 * Migrations Admin Page
 * List all available migrations with stats and recent runs
 */
export default function MigrationsPage() {
  // Track page view
  useTrackPage(TRACKED_SCREENS.adminMigrations);

  const [migrations, setMigrations] = useState<MigrationWithStats[]>([]);
  const [activeMigrations, setActiveMigrations] = useState<MigrationRun[]>([]);
  const [totalRuns, setTotalRuns] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<MigrationCategory | 'all'>('all');

  // Status checking
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
  const [statusResults, setStatusResults] = useState<Record<string, MigrationStatusResponse>>({});

  // Fetch migrations
  const fetchMigrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await apiGet<MigrationsListResponse>('/api/admin/migrations');
      setMigrations(data.migrations);
      setActiveMigrations(data.activeMigrations);
      setTotalRuns(data.totalRuns);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch migrations');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchMigrations();
  }, [fetchMigrations]);

  // Poll for active migrations
  useEffect(() => {
    if (activeMigrations.length === 0) return;

    const intervalId = setInterval(fetchMigrations, 5000);
    return () => clearInterval(intervalId);
  }, [activeMigrations.length, fetchMigrations]);

  // Check status for a migration
  const handleCheckStatus = async (migrationId: string) => {
    try {
      setCheckingStatusId(migrationId);
      const data = await apiGet<MigrationStatusResponse>(
        `/api/admin/migrations/${migrationId}/status`
      );
      setStatusResults((prev) => ({ ...prev, [migrationId]: data }));
    } catch (err: any) {
      console.error('Failed to check status:', err);
    } finally {
      setCheckingStatusId(null);
    }
  };

  // Cancel a running migration
  const handleCancelMigration = async (run: MigrationRun) => {
    if (!confirm('Are you sure you want to cancel this migration?')) return;

    try {
      await apiDelete(`/api/admin/migrations/${run.migrationId}/runs/${run.id}`);
      fetchMigrations();
    } catch (err: any) {
      console.error('Failed to cancel migration:', err);
      alert('Failed to cancel migration: ' + err.message);
    }
  };

  // Filter migrations by category
  const filteredMigrations =
    selectedCategory === 'all'
      ? migrations
      : migrations.filter((m) => m.category === selectedCategory);

  // Get recent runs across all migrations
  const recentRuns = migrations
    .flatMap((m) => m.recentRuns)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 10);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Migrations</h1>
          <p className="text-sm text-gray-500">
            Manage data migrations and view execution history
          </p>
        </div>
        <button
          onClick={fetchMigrations}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Active Migrations Banner */}
      <ActiveMigrationBanner
        activeMigrations={activeMigrations}
        onCancel={handleCancelMigration}
      />

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={fetchMigrations}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            selectedCategory === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({migrations.length})
        </button>
        {MIGRATION_CATEGORIES.map((cat) => {
          const count = migrations.filter((m) => m.category === cat.id).length;
          if (count === 0) return null;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{migrations.length}</div>
          <div className="text-sm text-gray-500">Total Migrations</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{activeMigrations.length}</div>
          <div className="text-sm text-gray-500">Running Now</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {migrations.reduce((sum, m) => sum + m.stats.successfulRuns, 0)}
          </div>
          <div className="text-sm text-gray-500">Successful Runs</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{totalRuns}</div>
          <div className="text-sm text-gray-500">Total Runs</div>
        </div>
      </div>

      {/* Loading */}
      {loading && migrations.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 border-4 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
          <span className="ml-3 text-gray-600">Loading migrations...</span>
        </div>
      )}

      {/* Migrations Grid */}
      {!loading && filteredMigrations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Available Migrations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMigrations.map((migration) => (
              <MigrationCard
                key={migration.id}
                migration={migration}
                onCheckStatus={() => handleCheckStatus(migration.id)}
                isCheckingStatus={checkingStatusId === migration.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Status Results */}
      {Object.keys(statusResults).length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Status Results</h3>
          <div className="space-y-3">
            {Object.entries(statusResults).map(([id, status]) => {
              const migration = migrations.find((m) => m.id === id);
              return (
                <div key={id} className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {migration?.name || id}
                    </span>
                    <button
                      onClick={() =>
                        setStatusResults((prev) => {
                          const next = { ...prev };
                          delete next[id];
                          return next;
                        })
                      }
                      className="text-gray-400 hover:text-gray-600"
                    >
                      Close
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
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
                      <span
                        className={`ml-1 font-medium ${
                          status.percentComplete >= 100
                            ? 'text-green-600'
                            : status.percentComplete >= 50
                              ? 'text-yellow-600'
                              : 'text-gray-900'
                        }`}
                      >
                        {status.percentComplete}%
                      </span>
                    </div>
                  </div>
                  {status.percentComplete < 100 && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${status.percentComplete}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Runs */}
      {recentRuns.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden mb-8">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Runs</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Migration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Started
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Result
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentRuns.map((run) => {
                const migration = migrations.find((m) => m.id === run.migrationId);
                return (
                  <tr key={run.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {migration?.name || run.migrationId}
                      </div>
                      <div className="text-xs text-gray-500">
                        {run.options.dryRun && '(Dry Run)'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          run.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : run.status === 'running'
                              ? 'bg-blue-100 text-blue-800'
                              : run.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {new Date(run.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {run.result ? (
                        <span>
                          {run.result.usersProcessed} processed
                          {run.result.errors.length > 0 && (
                            <span className="text-red-600 ml-2">
                              ({run.result.errors.length} errors)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Documentation */}
      <MigrationDocs />
    </div>
  );
}
