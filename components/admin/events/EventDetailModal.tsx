'use client';

import React from 'react';
import {
  DetailModalShell,
  InfoGrid,
  LoadingSpinner,
} from '@/components/admin/shared';
import type { AdminEvent } from './EventCard';

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

interface EventDetailModalProps {
  event: AdminEvent;
  onClose: () => void;
  execution?: ExecutionData | null;
  loadingExecution?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string | undefined | null): string {
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
      second: '2-digit',
    });
  } catch {
    return String(dateStr);
  }
}

const EVENT_TYPE_META: Record<string, { label: string; icon: string }> = {
  appointment: { label: 'Appointment', icon: '📅' },
  meeting: { label: 'Meeting', icon: '👥' },
  intention: { label: 'Intention', icon: '💡' },
  plan: { label: 'Plan', icon: '🗺️' },
  reminder: { label: 'Reminder', icon: '⏰' },
  todo: { label: 'To-Do', icon: '✅' },
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
  draft: 'bg-orange-100 text-orange-700',
};

// ============================================================================
// Component
// ============================================================================

export default function EventDetailModal({
  event,
  onClose,
  execution,
  loadingExecution,
}: EventDetailModalProps) {
  const typeMeta = EVENT_TYPE_META[event.type] || { label: event.type, icon: '📅' };

  return (
    <DetailModalShell
      icon={typeMeta.icon}
      title={event.title}
      subtitle={`${typeMeta.label} Event`}
      onClose={onClose}
    >
      <div className="space-y-6 p-4">
        {/* Basic Info */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>ℹ️</span> Basic Info
          </h3>
          <InfoGrid
            items={[
              { label: 'Event ID', value: event.id, mono: true },
              { label: 'User ID', value: event.userId, mono: true },
              { label: 'Created', value: formatDate(event.createdAt) },
              { label: 'Confidence', value: `${Math.round((event.confidence || 0) * 100)}%` },
            ]}
          />
        </div>

        {/* Event Details */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>📋</span> Event Details
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_COLORS[event.status] || 'bg-gray-100 text-gray-700'}`}>
                {event.status}
              </span>
              <span className="text-xs text-gray-500">Type: {typeMeta.label}</span>
              {event.isAllDay && <span className="text-xs text-blue-600">All Day</span>}
              {event.userConfirmed && <span className="text-xs text-green-600">User Confirmed</span>}
              {event.userModified && <span className="text-xs text-purple-600">User Modified</span>}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Start:</span>
                <span className="ml-1 text-gray-900">{formatDate(event.datetime)}</span>
              </div>
              {event.endDatetime && (
                <div>
                  <span className="text-gray-500">End:</span>
                  <span className="ml-1 text-gray-900">{formatDate(event.endDatetime)}</span>
                </div>
              )}
            </div>

            {event.description && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Description:</p>
                <p className="text-sm text-gray-700">{event.description}</p>
              </div>
            )}

            {event.location && (
              <div>
                <span className="text-gray-500 text-sm">Location:</span>
                <span className="ml-1 text-sm text-gray-900">{event.location}</span>
              </div>
            )}

            {event.participants && event.participants.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Participants:</p>
                <div className="flex flex-wrap gap-1">
                  {event.participants.map((p, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {event.recurrence && (
              <div>
                <span className="text-gray-500 text-sm">Recurrence:</span>
                <span className="ml-1 text-sm text-gray-900">{event.recurrence}</span>
                {event.recurrenceEndDate && (
                  <span className="text-xs text-gray-400 ml-2">until {formatDate(event.recurrenceEndDate)}</span>
                )}
              </div>
            )}

            {event.completedAt && (
              <div>
                <span className="text-gray-500 text-sm">Completed:</span>
                <span className="ml-1 text-sm text-gray-900">{formatDate(event.completedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Source */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>📝</span> Source
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Source Type:</span>
                <span className="ml-1 text-gray-900 capitalize">{event.sourceType}</span>
              </div>
              {event.sourceId && (
                <div>
                  <span className="text-gray-500">Source ID:</span>
                  <span className="ml-1 font-mono text-xs text-gray-900 break-all">{event.sourceId}</span>
                </div>
              )}
            </div>
            {event.sourceText && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Original Source Text:</p>
                <p className="text-xs text-gray-700 font-mono bg-white p-2 rounded border whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {event.sourceText}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Embedding */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>🔗</span> Embedding
          </h3>
          <InfoGrid
            items={[
              { label: 'Embedding ID', value: event.embeddingId || 'Not embedded', mono: true },
              { label: 'Embedded At', value: event.embeddingCreatedAt ? formatDate(event.embeddingCreatedAt) : 'N/A' },
            ]}
          />
        </div>

        {/* Reminders */}
        {event.reminders && event.reminders.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span>🔔</span> Reminders ({event.reminders.length})
            </h3>
            <div className="space-y-2">
              {event.reminders.map((reminder, i) => (
                <div key={i} className="bg-gray-50 rounded-md p-3 border border-gray-200 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
                      {reminder.type}
                    </span>
                    <span className="text-gray-700">{reminder.timing} min before</span>
                    <span className={`text-xs ${reminder.status === 'sent' ? 'text-green-600' : reminder.status === 'cancelled' ? 'text-red-600' : 'text-yellow-600'}`}>
                      {reminder.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Execution Data */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>⚙️</span> Generation Info
          </h3>
          {loadingExecution ? (
            <div className="flex items-center gap-2 py-4">
              <LoadingSpinner />
              <span className="text-sm text-gray-500">Loading execution data...</span>
            </div>
          ) : execution ? (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-md p-2 text-center border">
                  <span className="text-lg font-bold text-gray-900">{execution.totalTokens.toLocaleString()}</span>
                  <p className="text-xs text-gray-500">Total Tokens</p>
                </div>
                <div className="bg-white rounded-md p-2 text-center border">
                  <span className="text-lg font-bold text-green-600">${execution.estimatedCostUSD?.toFixed(4)}</span>
                  <p className="text-xs text-gray-500">Cost</p>
                </div>
                <div className="bg-white rounded-md p-2 text-center border">
                  <span className="text-lg font-bold text-blue-600">{execution.latencyMs?.toLocaleString()}ms</span>
                  <p className="text-xs text-gray-500">Latency</p>
                </div>
                <div className="bg-white rounded-md p-2 text-center border">
                  <span className={`text-lg font-bold ${execution.success ? 'text-green-600' : 'text-red-600'}`}>
                    {execution.success ? 'OK' : 'ERR'}
                  </span>
                  <p className="text-xs text-gray-500">Status</p>
                </div>
              </div>

              {/* Execution metadata */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Model:</span>
                  <span className="ml-1 font-mono text-gray-900">{execution.model}</span>
                </div>
                <div>
                  <span className="text-gray-500">Temperature:</span>
                  <span className="ml-1 text-gray-900">{execution.temperature}</span>
                </div>
                <div>
                  <span className="text-gray-500">Prompt:</span>
                  <span className="ml-1 font-mono text-gray-900">{execution.promptId}</span>
                </div>
                <div>
                  <span className="text-gray-500">Source:</span>
                  <span className="ml-1 text-gray-900">{execution.promptSource}</span>
                </div>
                <div>
                  <span className="text-gray-500">Executed:</span>
                  <span className="ml-1 text-gray-900">{formatDate(execution.executedAt)}</span>
                </div>
              </div>

              {/* Input/Output Summaries */}
              {(execution.inputSummary || execution.outputSummary) && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  {execution.inputSummary && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Input Summary:</p>
                      <p className="text-xs text-gray-700 font-mono bg-white p-2 rounded border whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {execution.inputSummary}
                      </p>
                    </div>
                  )}
                  {execution.outputSummary && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Output Summary:</p>
                      <p className="text-xs text-gray-700 font-mono bg-white p-2 rounded border whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {execution.outputSummary}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-3">
                No matching execution record found. Known generation parameters:
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Model:</span>
                  <span className="ml-1 font-mono text-gray-900">gpt-4o-mini</span>
                </div>
                <div>
                  <span className="text-gray-500">Service:</span>
                  <span className="ml-1 text-gray-900">EventExtractionService</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Execution records are matched heuristically by service, userId, and timestamp proximity.
                The record may have been pruned or the event was generated before execution tracking was enabled.
              </p>
            </div>
          )}
        </div>
      </div>
    </DetailModalShell>
  );
}
