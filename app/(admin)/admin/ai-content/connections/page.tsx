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
import type { LifeConnection } from '@/components/admin/shared';
import { ConnectionCard, ConnectionDetailModal, ConnectionAlgorithmReference } from '@/components/admin/life-connections';

// ============================================================================
// Constants
// ============================================================================

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'health-activity', label: 'Health-Activity' },
  { value: 'mood-activity', label: 'Mood-Activity' },
  { value: 'mood-health', label: 'Mood-Health' },
  { value: 'health-time', label: 'Health-Time' },
  { value: 'activity-sequence', label: 'Activity Sequence' },
];

const STRENGTHS = [
  { value: '', label: 'All Strengths' },
  { value: 'strong', label: 'Strong' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'weak', label: 'Weak' },
];

const DIRECTIONS = [
  { value: '', label: 'All Directions' },
  { value: 'positive', label: 'Positive' },
  { value: 'negative', label: 'Negative' },
];

const DISMISSED_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'false', label: 'Active Only' },
  { value: 'true', label: 'Dismissed Only' },
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

export default function LifeConnectionsViewerPage() {
  // Filters (page-specific state)
  const [categoryFilter, setCategoryFilter] = useState('');
  const [strengthFilter, setStrengthFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [dismissedFilter, setDismissedFilter] = useState('');

  // Generate panel state
  const [genLookbackDays, setGenLookbackDays] = useState('90');

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
    data: connections,
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
  } = useAdminDataViewer<LifeConnection>({
    endpoint: '/api/admin/life-connections',
    responseKey: 'connections',
    params: {
      category: categoryFilter,
      strength: strengthFilter,
      direction: directionFilter,
      dismissed: dismissedFilter,
    },
  });

  // Fetch execution data for a connection
  const fetchExecutionData = useCallback(async (connectionId: string) => {
    // Check cache first
    if (connectionId in executionCacheRef.current) {
      setExecutionData(executionCacheRef.current[connectionId]);
      return;
    }

    setLoadingExecution(true);
    setExecutionData(null);

    try {
      const response = await fetch(
        `/api/admin/life-connections/${connectionId}?userId=${selectedUserId}`
      );
      if (response.ok) {
        const data = await response.json();
        const exec = data.execution || null;
        executionCacheRef.current[connectionId] = exec;
        setExecutionData(exec);
      } else {
        executionCacheRef.current[connectionId] = null;
        setExecutionData(null);
      }
    } catch {
      executionCacheRef.current[connectionId] = null;
      setExecutionData(null);
    } finally {
      setLoadingExecution(false);
    }
  }, [selectedUserId]);

  // Enhanced view details handler
  const handleViewConnectionDetails = useCallback((connectionId: string) => {
    handleViewDetails(connectionId);
    // If we're opening (not closing), fetch execution data
    if (selectedItemId !== connectionId) {
      fetchExecutionData(connectionId);
    }
  }, [handleViewDetails, selectedItemId, fetchExecutionData]);

  // ============================================================================
  // Stats
  // ============================================================================

  const avgEffectSize =
    connections.length > 0
      ? connections.reduce((sum, c) => sum + Math.abs(c.metrics.effectSize), 0) / connections.length
      : 0;

  const strongCount = connections.filter((c) => c.strength === 'strong').length;
  const moderateCount = connections.filter((c) => c.strength === 'moderate').length;
  const weakCount = connections.filter((c) => c.strength === 'weak').length;
  const dismissedCount = connections.filter((c) => c.dismissed).length;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm text-gray-500">
        <Link href="/admin" className="hover:text-gray-700">Admin</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">Life Connections</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Life Connections</h1>
          <p className="mt-1 text-gray-600">
            Browse AI-discovered cross-domain correlations with statistical analysis
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
      <ConnectionAlgorithmReference />

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
        countLabel="total connections"
      />

      {/* Generate Panel */}
      <GeneratePanel
        endpoint="/api/admin/life-connections"
        buttonLabel="Analyze Connections"
        userId={selectedUserId}
        extraParams={{ lookbackDays: parseInt(genLookbackDays, 10) }}
        onSuccess={handleRefresh}
      >
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Lookback Days</label>
          <select
            value={genLookbackDays}
            onChange={(e) => setGenLookbackDays(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days (default)</option>
            <option value="180">180 days</option>
          </select>
        </div>
      </GeneratePanel>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Strength</label>
            <select
              value={strengthFilter}
              onChange={(e) => setStrengthFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {STRENGTHS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Direction</label>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {DIRECTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Status</label>
            <select
              value={dismissedFilter}
              onChange={(e) => setDismissedFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {DISMISSED_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Stats */}
        {connections.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-sm">
            <span className="text-gray-500">
              Showing <span className="font-medium text-gray-900">{connections.length}</span> of{' '}
              <span className="font-medium text-gray-900">{totalCount}</span> connections
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600">
              Avg Effect Size: {avgEffectSize.toFixed(2)}
            </span>
            {strongCount > 0 && <span className="text-red-600">{strongCount} strong</span>}
            {moderateCount > 0 && <span className="text-amber-600">{moderateCount} moderate</span>}
            {weakCount > 0 && <span className="text-gray-500">{weakCount} weak</span>}
            {dismissedCount > 0 && <span className="text-gray-400">{dismissedCount} dismissed</span>}
          </div>
        )}
      </div>

      {/* Status States */}
      {error && <ErrorMessage message={error} onRetry={handleRefresh} />}
      {loading && <LoadingSpinner />}
      {!selectedUserId && !loadingUsers && (
        <EmptyState message="Select a user to view their life connections" />
      )}

      {/* Connections Grid */}
      {!loading && !error && selectedUserId && (
        <>
          {connections.length === 0 ? (
            <EmptyState
              message="No connections found matching the current filters."
              hint="Try adjusting your filters or generate new connections."
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {connections.map((conn) => (
                <ConnectionCard
                  key={conn.id}
                  connection={conn}
                  isSelected={selectedItemId === conn.id}
                  onViewDetails={() => handleViewConnectionDetails(conn.id)}
                />
              ))}
            </div>
          )}

          {connections.length > 0 && (
            <PaginationControls
              currentPage={currentPage}
              itemCount={connections.length}
              hasMore={hasMore}
              itemLabel="connections"
              onPrevPage={handlePrevPage}
              onNextPage={handleNextPage}
            />
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedItemId && connections.find((c) => c.id === selectedItemId) && (
        <ConnectionDetailModal
          connection={connections.find((c) => c.id === selectedItemId)!}
          onClose={() => handleViewDetails(selectedItemId)}
          execution={executionData}
          loadingExecution={loadingExecution}
        />
      )}
    </div>
  );
}
