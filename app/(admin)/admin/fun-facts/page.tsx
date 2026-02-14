'use client';

import { useState } from 'react';
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
import { FunFactCard, FunFactDetailModal } from '@/components/admin/fun-facts';

// ============================================================================
// Constants
// ============================================================================

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'health', label: 'Health' },
  { value: 'activity', label: 'Activity' },
  { value: 'location', label: 'Location' },
  { value: 'social', label: 'Social' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'general', label: 'General' },
];

const TYPES = [
  { value: '', label: 'All Types' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'streak', label: 'Streak' },
  { value: 'record', label: 'Record' },
  { value: 'pattern', label: 'Pattern' },
  { value: 'milestone', label: 'Milestone' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'fun_facts', label: 'Template-based (fun_facts)' },
  { value: 'funFacts', label: 'AI Legacy (funFacts)' },
];

// ============================================================================
// Main Page Component
// ============================================================================

export default function FunFactsViewerPage() {
  // Filters (page-specific state)
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

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
      type: typeFilter,
      source: sourceFilter,
    },
  });

  // ============================================================================
  // Stats
  // ============================================================================

  const avgConfidence =
    facts.length > 0
      ? facts.reduce((sum, f) => sum + (f.confidence || 0), 0) / facts.length
      : 0;

  const templateCount = facts.filter((f) => f.source === 'fun_facts').length;
  const legacyCount = facts.filter((f) => f.source === 'funFacts').length;

  const categoryBreakdown = facts.reduce<Record<string, number>>((acc, f) => {
    const cat = f.category || 'unknown';
    acc[cat] = (acc[cat] || 0) + 1;
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
        <span className="text-gray-900 font-medium">Fun Facts</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fun Facts</h1>
          <p className="mt-1 text-gray-600">
            Browse fun facts from both template-based and AI-generated collections
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Fact Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Source Collection</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {SOURCE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Stats */}
        {facts.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-sm">
            <span className="text-gray-500">
              Showing <span className="font-medium text-gray-900">{facts.length}</span> of{' '}
              <span className="font-medium text-gray-900">{totalCount}</span> facts
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-green-600">{templateCount} template</span>
            <span className="text-purple-600">{legacyCount} AI legacy</span>
            <span className="text-gray-600">
              Avg Confidence: {(avgConfidence * 100).toFixed(0)}%
            </span>
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
        <EmptyState message="Select a user to view their fun facts" />
      )}

      {/* Facts Grid */}
      {!loading && !error && selectedUserId && (
        <>
          {facts.length === 0 ? (
            <EmptyState
              message="No fun facts found matching the current filters."
              hint="Try adjusting your filters or selecting a different source."
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {facts.map((fact) => (
                <FunFactCard
                  key={fact.id}
                  fact={fact}
                  isSelected={selectedItemId === fact.id}
                  onViewDetails={() => handleViewDetails(fact.id)}
                />
              ))}
            </div>
          )}

          {facts.length > 0 && (
            <PaginationControls
              currentPage={currentPage}
              itemCount={facts.length}
              hasMore={hasMore}
              itemLabel="facts"
              onPrevPage={handlePrevPage}
              onNextPage={handleNextPage}
            />
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedItemId && facts.find((f) => f.id === selectedItemId) && (
        <FunFactDetailModal
          fact={facts.find((f) => f.id === selectedItemId)!}
          onClose={() => handleViewDetails(selectedItemId)}
        />
      )}
    </div>
  );
}
