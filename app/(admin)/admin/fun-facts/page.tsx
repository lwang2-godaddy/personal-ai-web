'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  useAdminDataViewer,
  UserSelector,
  PaginationControls,
  ErrorMessage,
  LoadingSpinner,
  EmptyState,
} from '@/components/admin/shared';
import type { FunFact } from '@/components/admin/shared';
import { FunFactCard, FunFactDetailModal, FunFactAlgorithmReference } from '@/components/admin/fun-facts';

// ============================================================================
// Constants
// ============================================================================

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'pattern', label: 'Pattern' },
  { value: 'statistic', label: 'Statistic' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'health', label: 'Health' },
  { value: 'activity', label: 'Activity' },
  { value: 'location', label: 'Location' },
  { value: 'social', label: 'Social' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'general', label: 'General' },
];

const PERIOD_TYPES = [
  { value: '', label: 'All Periods' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const INSIGHT_TYPES = [
  { value: '', label: 'All Insight Types' },
  { value: 'patterns', label: '📊 Patterns' },
  { value: 'surprising', label: '✨ Surprising' },
  { value: 'recommendation', label: '💡 Recommendation' },
  { value: 'health_stat', label: '📈 Health Stat' },
  { value: 'activity_stat', label: '🏃 Activity Stat' },
  { value: 'location_stat', label: '📍 Location Stat' },
];

const VISIBILITY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'viewed', label: 'Viewed Only' },
  { value: 'hidden', label: 'Hidden Only' },
];

// ============================================================================
// Types
// ============================================================================

interface ExecutionData {
  id: string;
  userId: string;
  service: string;
  promptId: string;
  language: string;
  promptVersion: string;
  promptSource: string;
  model: string;
  temperature: number;
  maxTokens: number;
  inputSummary: string;
  inputTokens: number;
  outputSummary: string;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  executedAt: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function FunFactsViewerPage() {
  // Filters (page-specific state)
  const [categoryFilter, setCategoryFilter] = useState('');
  const [periodTypeFilter, setPeriodTypeFilter] = useState('');
  const [insightTypeFilter, setInsightTypeFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');

  // Execution data state
  const [executionData, setExecutionData] = useState<ExecutionData | null>(null);
  const [loadingExecution, setLoadingExecution] = useState(false);
  const executionCacheRef = useRef<Record<string, ExecutionData | null>>({});

  // Shared data viewer hook
  const {
    users,
    loadingUsers,
    selectedUserId,
    setSelectedUserId,
    userSearchQuery,
    setUserSearchQuery,
    filteredUsers,
    selectedUser,
    data: facts,
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
  } = useAdminDataViewer<FunFact>({
    endpoint: '/api/admin/fun-facts',
    responseKey: 'facts',
    params: {
      category: categoryFilter,
    },
  });

  // Client-side filtering for period type, insight type, and visibility (not supported by API)
  const filteredFacts = facts.filter((f) => {
    if (periodTypeFilter && f.periodType !== periodTypeFilter) return false;
    if (insightTypeFilter && f.insightType !== insightTypeFilter) return false;
    if (visibilityFilter === 'viewed' && !f.viewed) return false;
    if (visibilityFilter === 'hidden' && !f.hidden) return false;
    return true;
  });

  // Fetch execution data for a fact
  const fetchExecutionData = useCallback(async (factId: string) => {
    // Check cache first
    if (factId in executionCacheRef.current) {
      setExecutionData(executionCacheRef.current[factId]);
      return;
    }

    setLoadingExecution(true);
    setExecutionData(null);

    try {
      const response = await fetch(`/api/admin/fun-facts/${encodeURIComponent(factId)}`);
      if (response.ok) {
        const data = await response.json();
        const exec = data.execution || null;
        executionCacheRef.current[factId] = exec;
        setExecutionData(exec);
      } else {
        executionCacheRef.current[factId] = null;
        setExecutionData(null);
      }
    } catch {
      executionCacheRef.current[factId] = null;
      setExecutionData(null);
    } finally {
      setLoadingExecution(false);
    }
  }, []);

  // Enhanced view details handler
  const handleViewFactDetails = useCallback((factId: string) => {
    handleViewDetails(factId);
    // If we're opening (not closing), fetch execution data
    if (selectedItemId !== factId) {
      fetchExecutionData(factId);
    }
  }, [handleViewDetails, selectedItemId, fetchExecutionData]);

  // ============================================================================
  // Stats
  // ============================================================================

  const avgConfidence =
    filteredFacts.length > 0
      ? filteredFacts.reduce((sum, f) => sum + (f.confidence || 0), 0) / filteredFacts.length
      : 0;

  const viewedCount = filteredFacts.filter((f) => f.viewed).length;
  const hiddenCount = filteredFacts.filter((f) => f.hidden).length;

  const categoryBreakdown = filteredFacts.reduce<Record<string, number>>((acc, f) => {
    const cat = f.category || 'unknown';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const insightBreakdown = filteredFacts.reduce<Record<string, number>>((acc, f) => {
    const t = f.insightType || 'unknown';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const aiInsightCount = (insightBreakdown['patterns'] || 0) + (insightBreakdown['surprising'] || 0) + (insightBreakdown['recommendation'] || 0);
  const dataStatCount = (insightBreakdown['health_stat'] || 0) + (insightBreakdown['activity_stat'] || 0) + (insightBreakdown['location_stat'] || 0);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm text-gray-500">
        <Link href="/admin" className="hover:text-gray-700">Admin</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">Fun Facts</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fun Facts</h1>
          <p className="mt-1 text-gray-600">
            Browse AI-generated fun facts (3&ndash;6 per period: insights + data stats)
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || loadingUsers}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
        >
          {loading || loadingUsers ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Algorithm Reference */}
      <FunFactAlgorithmReference />

      {/* User Selector */}
      <UserSelector
        users={users}
        loadingUsers={loadingUsers}
        selectedUserId={selectedUserId}
        onSelectUser={setSelectedUserId}
        userSearchQuery={userSearchQuery}
        onSearchChange={setUserSearchQuery}
        filteredUsers={filteredUsers}
        selectedUser={selectedUser}
        totalCount={totalCount}
        countLabel="total facts"
      />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Insight Type</label>
            <select
              value={insightTypeFilter}
              onChange={(e) => setInsightTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {INSIGHT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Period Type</label>
            <select
              value={periodTypeFilter}
              onChange={(e) => setPeriodTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {PERIOD_TYPES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Visibility</label>
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {VISIBILITY_OPTIONS.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Stats */}
        {filteredFacts.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-sm">
            <span className="text-gray-500">
              Showing <span className="font-medium text-gray-900">{filteredFacts.length}</span> of{' '}
              <span className="font-medium text-gray-900">{totalCount}</span> facts
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600">
              Avg Confidence: {(avgConfidence * 100).toFixed(0)}%
            </span>
            {aiInsightCount > 0 && <span className="text-purple-600">{aiInsightCount} AI insights</span>}
            {dataStatCount > 0 && <span className="text-blue-600">{dataStatCount} data stats</span>}
            <span className="text-green-600">{viewedCount} viewed</span>
            {hiddenCount > 0 && <span className="text-red-600">{hiddenCount} hidden</span>}
          </div>
        )}
      </div>

      {/* Status States */}
      {error && <ErrorMessage message={error} onRetry={handleRefresh} />}
      {loading && <LoadingSpinner />}
      {!selectedUserId && !loadingUsers && (
        <EmptyState message="Select a user to view their fun facts" />
      )}

      {/* Facts Grid */}
      {!loading && !error && selectedUserId && (
        <>
          {filteredFacts.length === 0 ? (
            <EmptyState
              message="No fun facts found matching the current filters."
              hint="Try adjusting your filters or selecting a different category."
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredFacts.map((fact) => (
                <FunFactCard
                  key={fact.id}
                  fact={fact}
                  isSelected={selectedItemId === fact.id}
                  onViewDetails={() => handleViewFactDetails(fact.id)}
                />
              ))}
            </div>
          )}

          {filteredFacts.length > 0 && (
            <PaginationControls
              currentPage={currentPage}
              itemCount={filteredFacts.length}
              hasMore={hasMore}
              itemLabel="facts"
              onPrevPage={handlePrevPage}
              onNextPage={handleNextPage}
            />
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedItemId && filteredFacts.find((f) => f.id === selectedItemId) && (
        <FunFactDetailModal
          fact={filteredFacts.find((f) => f.id === selectedItemId)!}
          onClose={() => handleViewDetails(selectedItemId)}
          execution={executionData}
          loadingExecution={loadingExecution}
        />
      )}
    </div>
  );
}
