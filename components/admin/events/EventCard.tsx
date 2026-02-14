'use client';

import React from 'react';

// ============================================================================
// Types
// ============================================================================

export interface AdminEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  datetime: string;
  endDatetime?: string | null;
  isAllDay?: boolean;
  type: string;
  sourceType: string;
  sourceId?: string;
  sourceText?: string;
  location?: string | null;
  locationId?: string | null;
  participants?: string[];
  recurrence?: string | null;
  recurrenceEndDate?: string | null;
  status: string;
  confidence: number;
  reminders?: Array<{
    id: string;
    type: string;
    timing: number;
    status: string;
  }>;
  userConfirmed?: boolean;
  userModified?: boolean;
  completedAt?: string | null;
  embeddingId?: string | null;
  embeddingCreatedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface EventCardProps {
  event: AdminEvent;
  onViewDetails: () => void;
  isSelected?: boolean;
}

// ============================================================================
// Metadata
// ============================================================================

const EVENT_TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  appointment: { label: 'Appointment', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '📅' },
  meeting: { label: 'Meeting', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '👥' },
  intention: { label: 'Intention', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: '💡' },
  plan: { label: 'Plan', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: '🗺️' },
  reminder: { label: 'Reminder', color: 'bg-red-100 text-red-700 border-red-200', icon: '⏰' },
  todo: { label: 'To-Do', color: 'bg-green-100 text-green-700 border-green-200', icon: '✅' },
};

const EVENT_STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500 border-gray-200' },
  draft: { label: 'Draft', color: 'bg-orange-100 text-orange-700 border-orange-200' },
};

const SOURCE_TYPE_META: Record<string, { label: string; color: string }> = {
  voice: { label: 'Voice', color: 'bg-indigo-100 text-indigo-700' },
  text: { label: 'Text', color: 'bg-teal-100 text-teal-700' },
  photo: { label: 'Photo', color: 'bg-pink-100 text-pink-700' },
  health: { label: 'Health', color: 'bg-red-100 text-red-700' },
  location: { label: 'Location', color: 'bg-emerald-100 text-emerald-700' },
  manual: { label: 'Manual', color: 'bg-gray-100 text-gray-700' },
};

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const d = typeof dateStr === 'object' && (dateStr as Record<string, unknown>)._seconds
      ? new Date((dateStr as unknown as { _seconds: number })._seconds * 1000)
      : new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return String(dateStr);
  }
}

// ============================================================================
// Component
// ============================================================================

export default function EventCard({ event, onViewDetails, isSelected }: EventCardProps) {
  const typeMeta = EVENT_TYPE_META[event.type] || { label: event.type, color: 'bg-gray-100 text-gray-700 border-gray-200', icon: '📅' };
  const statusMeta = EVENT_STATUS_META[event.status] || { label: event.status, color: 'bg-gray-100 text-gray-700 border-gray-200' };
  const sourceMeta = SOURCE_TYPE_META[event.sourceType] || { label: event.sourceType, color: 'bg-gray-100 text-gray-700' };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border p-4 transition-all ${
        isSelected
          ? 'border-red-400 shadow-md ring-1 ring-red-200'
          : 'border-gray-200 hover:shadow-md hover:border-gray-300'
      }`}
    >
      {/* Header: Type + Status badges */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${typeMeta.color}`}>
            {typeMeta.icon} {typeMeta.label}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusMeta.color}`}>
            {statusMeta.label}
          </span>
        </div>
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${sourceMeta.color}`}>
          {sourceMeta.label}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
        {event.title}
      </h3>

      {/* DateTime */}
      <p className="text-xs text-gray-500 mb-2">
        {formatDate(event.datetime)}
        {event.location && (
          <span className="ml-2 text-gray-400">
            @ {event.location}
          </span>
        )}
      </p>

      {/* Description (truncated) */}
      {event.description && (
        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
          {event.description}
        </p>
      )}

      {/* Metrics row */}
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
        <span>Confidence: {Math.round((event.confidence || 0) * 100)}%</span>
        {event.embeddingId && (
          <span className="text-green-600">Embedded</span>
        )}
        {event.userConfirmed && (
          <span className="text-blue-600">Confirmed</span>
        )}
        {event.participants && event.participants.length > 0 && (
          <span>{event.participants.length} participant{event.participants.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {/* View Details button */}
      <button
        onClick={onViewDetails}
        className="w-full px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
      >
        {isSelected ? 'Hide Details' : 'View Details'}
      </button>
    </div>
  );
}
