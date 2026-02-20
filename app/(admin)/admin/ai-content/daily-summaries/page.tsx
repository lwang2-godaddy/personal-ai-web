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
import { SummaryCard, SummaryDetailModal, SummaryAlgorithmReference } from '@/components/admin/daily-summaries';

interface SummaryMetrics {
  steps?: number;
  stepsGoal?: number;
  calories?: number;
  sleepHours?: number;
  sleepQuality?: string;
  heartRate?: number;
  workoutsCount?: number;
  workoutTypes?: string[];
  workoutMinutes?: number;
  distance?: number;
  placesVisited?: number;
  activitiesLogged?: number;
  topActivities?: Array<{ name: string; count: number }>;
  eventsTotal?: number;
  eventsCompleted?: number;
  voiceNotesCount?: number;
  activeMinutes?: number;
}

interface SummaryHighlight {
  icon: string;
  title: string;
  description: string;
  type: string;
}

interface DailySummary {
  id: string;
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  date: string;
  startDate?: string;
  endDate?: string;
  textSummary: string;
  generationMethod: 'ai' | 'template';
  notificationSent: boolean;
  metrics: SummaryMetrics;
  highlights: SummaryHighlight[];
  comparison: {
    stepsChange: number;
    workoutsChange: number;
    sleepChange: number;
    trend: 'improving' | 'stable' | 'declining';
  } | null;
  generatedAt?: string;
  viewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const PERIOD_OPTIONS = [
  { value: '', label: 'All Periods' },
  { value: 'daily', label: '1D Daily' },
  { value: 'weekly', label: '1W Weekly' },
  { value: 'monthly', label: '1M Monthly' },
];

export default function DailySummariesPage() {
  const [periodFilter, setPeriodFilter] = useState('');
  const [generatePeriod, setGeneratePeriod] = useState('daily');
  const [generateDate, setGenerateDate] = useState('');

  const {
    users,
    loadingUsers,
    selectedUserId,
    setSelectedUserId,
    userSearchQuery,
    setUserSearchQuery,
    filteredUsers,
    selectedUser,
    data: summaries,
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
  } = useAdminDataViewer<DailySummary>({
    endpoint: '/api/admin/daily-summaries',
    responseKey: 'summaries',
    params: {
      ...(periodFilter ? { period: periodFilter } : {}),
    },
  });

  // Quick stats
  const stats = useMemo(() => {
    if (!summaries.length) return null;
    const avgSteps = Math.round(
      summaries.reduce((sum, s) => sum + (s.metrics.steps || 0), 0) / summaries.length
    );
    const periodBreakdown = summaries.reduce<Record<string, number>>((acc, s) => {
      acc[s.period] = (acc[s.period] || 0) + 1;
      return acc;
    }, {});
    const aiCount = summaries.filter((s) => s.generationMethod === 'ai').length;
    const templateCount = summaries.length - aiCount;
    const avgHighlights = summaries.length > 0
      ? (summaries.reduce((sum, s) => sum + s.highlights.length, 0) / summaries.length).toFixed(1)
      : '0';
    return { avgSteps, periodBreakdown, aiCount, templateCount, avgHighlights };
  }, [summaries]);

  const selectedSummary = summaries.find((s) => s.id === selectedItemId);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📊 Daily Summaries</h1>
        <p className="text-gray-500 mt-1">View and debug AI-generated activity summaries (daily/weekly/monthly) per user.</p>
      </div>

      {/* Algorithm Reference */}
      <div className="mb-6">
        <SummaryAlgorithmReference />
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
              <label className="block text-xs font-medium text-gray-500 mb-1">Period</label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <GeneratePanel
              endpoint="/api/admin/daily-summaries"
              buttonLabel="Generate Summary"
              userId={selectedUserId}
              extraParams={{
                period: generatePeriod,
                ...(generateDate ? { date: generateDate } : {}),
              }}
              onSuccess={handleRefresh}
            >
              <div className="flex items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Period</label>
                  <select
                    value={generatePeriod}
                    onChange={(e) => setGeneratePeriod(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Date (optional)</label>
                  <input
                    type="date"
                    value={generateDate}
                    onChange={(e) => setGenerateDate(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Default: yesterday"
                  />
                </div>
              </div>
            </GeneratePanel>
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
              {Object.entries(stats.periodBreakdown).map(([period, count]) => (
                <div key={period} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-500">{period}:</span>{' '}
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <span className="text-gray-500">AI:</span>{' '}
                <span className="font-semibold text-green-600">{stats.aiCount}</span>
                <span className="text-gray-400 mx-1">/</span>
                <span className="text-gray-500">Template:</span>{' '}
                <span className="font-semibold text-gray-600">{stats.templateCount}</span>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <span className="text-gray-500">Avg Highlights:</span>{' '}
                <span className="font-semibold">{stats.avgHighlights}</span>
              </div>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorMessage message={error} onRetry={handleRefresh} />
          ) : summaries.length === 0 ? (
            <EmptyState message="No daily summaries found for this user." />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {summaries.map((summary) => (
                  <SummaryCard
                    key={summary.id}
                    summary={summary}
                    isSelected={selectedItemId === summary.id}
                    onViewDetails={() => handleViewDetails(summary.id)}
                  />
                ))}
              </div>

              <PaginationControls
                currentPage={currentPage}
                itemCount={summaries.length}
                hasMore={hasMore}
                onPrevPage={handlePrevPage}
                onNextPage={handleNextPage}
              />
            </>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedSummary && (
        <SummaryDetailModal
          summary={selectedSummary}
          onClose={() => handleViewDetails(selectedSummary.id)}
        />
      )}
    </div>
  );
}
