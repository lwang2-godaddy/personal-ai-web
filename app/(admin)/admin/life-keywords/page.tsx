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
  GeneratePanel,
} from '@/components/admin/shared';
import type { LifeKeyword } from '@/components/admin/shared';
import { KeywordCard, KeywordDetailModal, KeywordAlgorithmReference } from '@/components/admin/life-keywords';

// ============================================================================
// Constants
// ============================================================================

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'health', label: 'Health' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'social', label: 'Social' },
  { value: 'work', label: 'Work' },
  { value: 'hobby', label: 'Hobby' },
  { value: 'travel', label: 'Travel' },
  { value: 'emotion', label: 'Emotion' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'learning', label: 'Learning' },
  { value: 'general', label: 'General' },
];

const PERIOD_TYPES = [
  { value: '', label: 'All Periods' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
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

export default function LifeKeywordsViewerPage() {
  // Filters (page-specific state)
  const [categoryFilter, setCategoryFilter] = useState('');
  const [periodTypeFilter, setPeriodTypeFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');

  // Generate panel state
  const [genPeriodType, setGenPeriodType] = useState('weekly');

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
    data: keywords,
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
  } = useAdminDataViewer<LifeKeyword>({
    endpoint: '/api/admin/life-keywords',
    responseKey: 'keywords',
    params: {
      category: categoryFilter,
      periodType: periodTypeFilter,
      visibility: visibilityFilter,
    },
  });

  // Fetch execution data for a keyword
  const fetchExecutionData = useCallback(async (keywordId: string) => {
    // Check cache first
    if (keywordId in executionCacheRef.current) {
      setExecutionData(executionCacheRef.current[keywordId]);
      return;
    }

    setLoadingExecution(true);
    setExecutionData(null);

    try {
      const response = await fetch(`/api/admin/life-keywords/${keywordId}`);
      if (response.ok) {
        const data = await response.json();
        const exec = data.execution || null;
        executionCacheRef.current[keywordId] = exec;
        setExecutionData(exec);
      } else {
        executionCacheRef.current[keywordId] = null;
        setExecutionData(null);
      }
    } catch {
      executionCacheRef.current[keywordId] = null;
      setExecutionData(null);
    } finally {
      setLoadingExecution(false);
    }
  }, []);

  // Enhanced view details handler
  const handleViewKeywordDetails = useCallback((keywordId: string) => {
    handleViewDetails(keywordId);
    // If we're opening (not closing), fetch execution data
    if (selectedItemId !== keywordId) {
      fetchExecutionData(keywordId);
    }
  }, [handleViewDetails, selectedItemId, fetchExecutionData]);

  // ============================================================================
  // Stats
  // ============================================================================

  const avgConfidence =
    keywords.length > 0
      ? keywords.reduce((sum, k) => sum + (k.confidence || 0), 0) / keywords.length
      : 0;

  const viewedCount = keywords.filter((k) => k.viewed).length;
  const hiddenCount = keywords.filter((k) => k.hidden).length;

  const categoryBreakdown = keywords.reduce<Record<string, number>>((acc, k) => {
    acc[k.category] = (acc[k.category] || 0) + 1;
    return acc;
  }, {});

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm text-gray-500">
        <Link href="/admin" className="hover:text-gray-700">Admin</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">Life Keywords</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Life Keywords</h1>
          <p className="mt-1 text-gray-600">
            Browse AI-generated life keywords with category and period filtering
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || loadingUsers}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm"
        >
          {loading || loadingUsers ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Algorithm Reference */}
      <KeywordAlgorithmReference />

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
        countLabel="total keywords"
      />

      {/* Generate Panel */}
      <GeneratePanel
        endpoint="/api/admin/life-keywords"
        buttonLabel="Generate Keywords"
        userId={selectedUserId}
        extraParams={{ periodType: genPeriodType }}
        onSuccess={handleRefresh}
      >
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Period Type</label>
          <select
            value={genPeriodType}
            onChange={(e) => setGenPeriodType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </GeneratePanel>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Period Type</label>
            <select
              value={periodTypeFilter}
              onChange={(e) => setPeriodTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {VISIBILITY_OPTIONS.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Stats */}
        {keywords.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-sm">
            <span className="text-gray-500">
              Showing <span className="font-medium text-gray-900">{keywords.length}</span> of{' '}
              <span className="font-medium text-gray-900">{totalCount}</span> keywords
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600">
              Avg Confidence: {(avgConfidence * 100).toFixed(0)}%
            </span>
            <span className="text-green-600">{viewedCount} viewed</span>
            {hiddenCount > 0 && <span className="text-red-600">{hiddenCount} hidden</span>}
            {Object.entries(categoryBreakdown).slice(0, 3).map(([cat, count]) => (
              <span key={cat} className="text-gray-500">{cat}: {count}</span>
            ))}
          </div>
        )}
      </div>

      {/* Status States */}
      {error && <ErrorMessage message={error} onRetry={handleRefresh} />}
      {loading && <LoadingSpinner />}
      {!selectedUserId && !loadingUsers && (
        <EmptyState message="Select a user to view their life keywords" />
      )}

      {/* Keywords Grid */}
      {!loading && !error && selectedUserId && (
        <>
          {keywords.length === 0 ? (
            <EmptyState
              message="No keywords found matching the current filters."
              hint="Try adjusting your filters."
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {keywords.map((kw) => (
                <KeywordCard
                  key={kw.id}
                  keyword={kw}
                  isSelected={selectedItemId === kw.id}
                  onViewDetails={() => handleViewKeywordDetails(kw.id)}
                />
              ))}
            </div>
          )}

          {keywords.length > 0 && (
            <PaginationControls
              currentPage={currentPage}
              itemCount={keywords.length}
              hasMore={hasMore}
              itemLabel="keywords"
              onPrevPage={handlePrevPage}
              onNextPage={handleNextPage}
            />
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedItemId && keywords.find((k) => k.id === selectedItemId) && (
        <KeywordDetailModal
          keyword={keywords.find((k) => k.id === selectedItemId)!}
          onClose={() => handleViewDetails(selectedItemId)}
          execution={executionData}
          loadingExecution={loadingExecution}
        />
      )}
    </div>
  );
}
