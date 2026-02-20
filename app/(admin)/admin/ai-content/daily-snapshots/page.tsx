'use client';

import { useState, useMemo } from 'react';
import {
  UserSelector,
  PaginationControls,
  GeneratePanel,
  ErrorMessage,
  LoadingSpinner,
  EmptyState,
  useAdminDataViewer,
} from '@/components/admin/shared';
import { SnapshotCard, SnapshotDetailModal } from '@/components/admin/daily-snapshots';

interface DailySnapshot {
  id: string;
  userId: string;
  date: string;
  summary: string;
  emoji: string;
  mood: 'active' | 'calm' | 'busy' | 'rest';
  language: string;
  metrics: {
    steps: number;
    calories: number;
    workoutCount: number;
    locationCount: number;
  };
  generatedAt: string;
  cachedAt: string;
  fromCache: boolean;
}

const MOOD_OPTIONS = [
  { value: '', label: 'All Moods' },
  { value: 'active', label: '🏃 Active' },
  { value: 'calm', label: '🍃 Calm' },
  { value: 'busy', label: '⚡ Busy' },
  { value: 'rest', label: '🌙 Rest' },
];

export default function DailySnapshotsPage() {
  const [moodFilter, setMoodFilter] = useState('');

  const {
    users,
    loadingUsers,
    selectedUserId,
    setSelectedUserId,
    userSearchQuery,
    setUserSearchQuery,
    filteredUsers,
    selectedUser,
    data: snapshots,
    totalCount,
    hasMore,
    loading,
    error,
    currentPage,
    handleNextPage,
    handlePrevPage,
    handleRefresh,
    selectedItemId,
    handleViewDetails,
  } = useAdminDataViewer<DailySnapshot>({
    endpoint: '/api/admin/daily-snapshots',
    responseKey: 'snapshots',
    params: {
      ...(moodFilter ? { mood: moodFilter } : {}),
    },
  });

  // Quick stats
  const stats = useMemo(() => {
    if (!snapshots.length) return null;
    const avgSteps = Math.round(
      snapshots.reduce((sum, s) => sum + (s.metrics.steps || 0), 0) / snapshots.length
    );
    const moodBreakdown = snapshots.reduce<Record<string, number>>((acc, s) => {
      acc[s.mood] = (acc[s.mood] || 0) + 1;
      return acc;
    }, {});
    return { avgSteps, moodBreakdown };
  }, [snapshots]);

  const selectedSnapshot = snapshots.find((s) => s.id === selectedItemId);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📷 Daily Snapshots</h1>
        <p className="text-gray-500 mt-1">View and debug AI-generated daily insight snapshots per user.</p>
      </div>

      {/* User Selector */}
      <UserSelector
        filteredUsers={filteredUsers}
        loadingUsers={loadingUsers}
        selectedUserId={selectedUserId}
        onSelectUser={setSelectedUserId}
        userSearchQuery={userSearchQuery}
        onSearchChange={setUserSearchQuery}
        selectedUser={selectedUser}
        totalCount={totalCount}
        users={users}
      />

      {selectedUserId && (
        <>
          {/* Filters + Generate */}
          <div className="flex flex-wrap items-end gap-4 mt-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Mood</label>
              <select
                value={moodFilter}
                onChange={(e) => setMoodFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {MOOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <GeneratePanel
              endpoint="/api/admin/daily-snapshots"
              buttonLabel="Generate Snapshot"
              userId={selectedUserId}
              onSuccess={handleRefresh}
            />
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <span className="text-gray-500">Total:</span>{' '}
                <span className="font-semibold">{totalCount}</span>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <span className="text-gray-500">Avg Steps:</span>{' '}
                <span className="font-semibold">{stats.avgSteps.toLocaleString()}</span>
              </div>
              {Object.entries(stats.moodBreakdown).map(([mood, count]) => (
                <div key={mood} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-500">{mood}:</span>{' '}
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorMessage message={error} onRetry={handleRefresh} />
          ) : snapshots.length === 0 ? (
            <EmptyState message="No daily snapshots found for this user." />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {snapshots.map((snapshot) => (
                  <SnapshotCard
                    key={snapshot.id}
                    snapshot={snapshot}
                    isSelected={selectedItemId === snapshot.id}
                    onViewDetails={() => handleViewDetails(snapshot.id)}
                  />
                ))}
              </div>

              <PaginationControls
                currentPage={currentPage}
                itemCount={snapshots.length}
                hasMore={hasMore}
                onPrevPage={handlePrevPage}
                onNextPage={handleNextPage}
              />
            </>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedSnapshot && (
        <SnapshotDetailModal
          snapshot={selectedSnapshot}
          onClose={() => handleViewDetails(selectedSnapshot.id)}
        />
      )}
    </div>
  );
}
