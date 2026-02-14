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
import { EventCard, EventDetailModal } from '@/components/admin/events';
import type { AdminEvent } from '@/components/admin/events';

// ============================================================================
// Constants
// ============================================================================

const EVENT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'intention', label: 'Intention' },
  { value: 'plan', label: 'Plan' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'todo', label: 'To-Do' },
];

const EVENT_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'draft', label: 'Draft' },
];

const SOURCE_TYPES = [
  { value: '', label: 'All Sources' },
  { value: 'voice', label: 'Voice' },
  { value: 'text', label: 'Text' },
  { value: 'photo', label: 'Photo' },
  { value: 'health', label: 'Health' },
  { value: 'location', label: 'Location' },
  { value: 'manual', label: 'Manual' },
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

export default function EventsViewerPage() {
  // Filters (page-specific state)
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('');

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
    data: events,
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
  } = useAdminDataViewer<AdminEvent>({
    endpoint: '/api/admin/events',
    responseKey: 'events',
    params: {
      type: typeFilter,
      status: statusFilter,
      sourceType: sourceTypeFilter,
    },
  });

  // Fetch execution data for an event
  const fetchExecutionData = useCallback(async (eventId: string) => {
    // Check cache first
    if (eventId in executionCacheRef.current) {
      setExecutionData(executionCacheRef.current[eventId]);
      return;
    }

    setLoadingExecution(true);
    setExecutionData(null);

    try {
      const response = await fetch(`/api/admin/events/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        const exec = data.execution || null;
        executionCacheRef.current[eventId] = exec;
        setExecutionData(exec);
      } else {
        executionCacheRef.current[eventId] = null;
        setExecutionData(null);
      }
    } catch {
      executionCacheRef.current[eventId] = null;
      setExecutionData(null);
    } finally {
      setLoadingExecution(false);
    }
  }, []);

  // Enhanced view details handler
  const handleViewEventDetails = useCallback((eventId: string) => {
    handleViewDetails(eventId);
    // If we're opening (not closing), fetch execution data
    if (selectedItemId !== eventId) {
      fetchExecutionData(eventId);
    }
  }, [handleViewDetails, selectedItemId, fetchExecutionData]);

  // ============================================================================
  // Stats
  // ============================================================================

  const avgConfidence =
    events.length > 0
      ? events.reduce((sum, e) => sum + (e.confidence || 0), 0) / events.length
      : 0;

  const embeddedCount = events.filter((e) => e.embeddingId).length;

  const typeBreakdown = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});

  const statusBreakdown = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
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
        <span className="text-gray-900 font-medium">Events</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <p className="mt-1 text-gray-600">
            Browse auto-extracted events from voice notes, text notes, and photos
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
        countLabel="total events"
      />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Event Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {EVENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Source Type</label>
            <select
              value={sourceTypeFilter}
              onChange={(e) => setSourceTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {SOURCE_TYPES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Stats */}
        {events.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-sm">
            <span className="text-gray-500">
              Showing <span className="font-medium text-gray-900">{events.length}</span> of{' '}
              <span className="font-medium text-gray-900">{totalCount}</span> events
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600">
              Avg Confidence: {(avgConfidence * 100).toFixed(0)}%
            </span>
            <span className="text-green-600">{embeddedCount} embedded</span>
            {Object.entries(typeBreakdown).slice(0, 3).map(([type, count]) => (
              <span key={type} className="text-gray-500">{type}: {count}</span>
            ))}
            {Object.entries(statusBreakdown).slice(0, 3).map(([st, count]) => (
              <span key={st} className="text-gray-500">{st}: {count}</span>
            ))}
          </div>
        )}
      </div>

      {/* Status States */}
      {error && <ErrorMessage message={error} onRetry={handleRefresh} />}
      {loading && <LoadingSpinner />}
      {!selectedUserId && !loadingUsers && (
        <EmptyState message="Select a user to view their events" />
      )}

      {/* Events Grid */}
      {!loading && !error && selectedUserId && (
        <>
          {events.length === 0 ? (
            <EmptyState
              message="No events found matching the current filters."
              hint="Try adjusting your filters or selecting a different user."
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isSelected={selectedItemId === event.id}
                  onViewDetails={() => handleViewEventDetails(event.id)}
                />
              ))}
            </div>
          )}

          {events.length > 0 && (
            <PaginationControls
              currentPage={currentPage}
              itemCount={events.length}
              hasMore={hasMore}
              itemLabel="events"
              onPrevPage={handlePrevPage}
              onNextPage={handleNextPage}
            />
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedItemId && events.find((e) => e.id === selectedItemId) && (
        <EventDetailModal
          event={events.find((e) => e.id === selectedItemId)!}
          onClose={() => handleViewDetails(selectedItemId)}
          execution={executionData}
          loadingExecution={loadingExecution}
        />
      )}
    </div>
  );
}
