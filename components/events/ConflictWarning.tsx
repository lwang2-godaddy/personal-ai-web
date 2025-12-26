'use client';

import React from 'react';
import { EventConflict } from '@/lib/services/conflicts/ConflictDetectionService';
import ConflictDetectionService from '@/lib/services/conflicts/ConflictDetectionService';

interface ConflictWarningProps {
  conflicts: EventConflict[];
  onConflictClick?: (conflictingEventId: string) => void;
}

export default function ConflictWarning({ conflicts, onConflictClick }: ConflictWarningProps) {
  const conflictService = ConflictDetectionService;

  if (conflicts.length === 0) {
    return null;
  }

  const errorConflicts = conflicts.filter((c) => c.severity === 'error');
  const warningConflicts = conflicts.filter((c) => c.severity === 'warning');

  return (
    <div className="space-y-3">
      {/* Error Conflicts */}
      {errorConflicts.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 mb-2">
                {errorConflicts.length} Scheduling {errorConflicts.length === 1 ? 'Conflict' : 'Conflicts'}
              </h4>
              <ul className="space-y-2">
                {errorConflicts.map((conflict, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">
                      {conflictService.getConflictIcon(conflict.conflictType)}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-red-800">{conflict.message}</p>
                      {onConflictClick && (
                        <button
                          onClick={() => onConflictClick(conflict.conflictingEventId)}
                          className="text-xs text-red-700 hover:text-red-900 underline mt-1"
                        >
                          View conflicting event
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Warning Conflicts */}
      {warningConflicts.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-900 mb-2">
                {warningConflicts.length} Scheduling {warningConflicts.length === 1 ? 'Warning' : 'Warnings'}
              </h4>
              <ul className="space-y-2">
                {warningConflicts.map((conflict, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">
                      {conflictService.getConflictIcon(conflict.conflictType)}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-yellow-800">{conflict.message}</p>
                      {conflict.travelTimeMinutes && (
                        <p className="text-xs text-yellow-700 mt-1">
                          Estimated travel time: {conflict.travelTimeMinutes} minutes
                        </p>
                      )}
                      {onConflictClick && (
                        <button
                          onClick={() => onConflictClick(conflict.conflictingEventId)}
                          className="text-xs text-yellow-700 hover:text-yellow-900 underline mt-1"
                        >
                          View related event
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500 italic">
        {errorConflicts.length > 0
          ? 'Please resolve time conflicts before saving this event.'
          : 'You can still save this event, but consider adjusting the time or location.'}
      </div>
    </div>
  );
}
