import { useState, useCallback } from 'react';
import { Event } from '@/lib/models/Event';
import ConflictDetectionService from '@/lib/services/conflicts/ConflictDetectionService';

interface ValidationResult {
  valid: boolean;
  error?: string;
  conflicts?: Array<{
    conflictingEventId: string;
    conflictingEventTitle: string;
    conflictType: 'overlap' | 'travel_time' | 'back_to_back';
    severity: 'warning' | 'error';
    message: string;
  }>;
}

export function useCalendarDragDrop(
  userId: string,
  onEventUpdate: (event: Event, start: Date, end: Date) => Promise<boolean>
) {
  const [isValidating, setIsValidating] = useState(false);
  const conflictService = ConflictDetectionService;

  /**
   * Validate if an event can be moved to a new date/time
   */
  const validateEventDrop = useCallback(
    async (
      event: Event,
      newStart: Date,
      newEnd: Date
    ): Promise<ValidationResult> => {
      // Rule 1: No past dates
      if (newStart < new Date()) {
        return { valid: false, error: 'Cannot move event to past' };
      }

      // Rule 2: Valid duration
      if (newEnd <= newStart) {
        return { valid: false, error: 'End time must be after start time' };
      }

      // Rule 3: Check conflicts
      try {
        const conflicts = await conflictService.detectConflicts(
          userId,
          {
            ...event,
            datetime: newStart,
            endDatetime: newEnd,
          },
          event.id // Exclude current event from conflict detection
        );

        // Check for error-level conflicts
        const errorConflicts = conflicts.filter((c) => c.severity === 'error');
        if (errorConflicts.length > 0) {
          return {
            valid: false,
            error: `Event conflicts with ${errorConflicts.length} other event${
              errorConflicts.length !== 1 ? 's' : ''
            }`,
            conflicts,
          };
        }

        // Warning-level conflicts are allowed but should be shown
        if (conflicts.length > 0) {
          return {
            valid: true,
            conflicts,
          };
        }

        return { valid: true };
      } catch (error) {
        console.error('[useCalendarDragDrop] Error validating event drop:', error);
        return { valid: false, error: 'Failed to validate event drop' };
      }
    },
    [userId, conflictService]
  );

  /**
   * Validate if an event can be resized
   */
  const validateEventResize = useCallback(
    async (
      event: Event,
      newStart: Date,
      newEnd: Date
    ): Promise<ValidationResult> => {
      // Rule 1: No past dates
      if (newStart < new Date()) {
        return { valid: false, error: 'Cannot resize event to past' };
      }

      // Rule 2: Minimum duration (15 minutes)
      const durationMinutes = (newEnd.getTime() - newStart.getTime()) / (60 * 1000);
      if (durationMinutes < 15) {
        return { valid: false, error: 'Event duration must be at least 15 minutes' };
      }

      // Rule 3: Maximum duration (24 hours for non-all-day events)
      if (!event.isAllDay && durationMinutes > 24 * 60) {
        return { valid: false, error: 'Event duration cannot exceed 24 hours' };
      }

      // Rule 4: Check conflicts
      try {
        const conflicts = await conflictService.detectConflicts(
          userId,
          {
            ...event,
            datetime: newStart,
            endDatetime: newEnd,
          },
          event.id
        );

        // Check for error-level conflicts
        const errorConflicts = conflicts.filter((c) => c.severity === 'error');
        if (errorConflicts.length > 0) {
          return {
            valid: false,
            error: `Event conflicts with ${errorConflicts.length} other event${
              errorConflicts.length !== 1 ? 's' : ''
            }`,
            conflicts,
          };
        }

        // Warning-level conflicts are allowed but should be shown
        if (conflicts.length > 0) {
          return {
            valid: true,
            conflicts,
          };
        }

        return { valid: true };
      } catch (error) {
        console.error('[useCalendarDragDrop] Error validating event resize:', error);
        return { valid: false, error: 'Failed to validate event resize' };
      }
    },
    [userId, conflictService]
  );

  /**
   * Handle event drop with validation
   */
  const handleEventDrop = useCallback(
    async (event: Event, newStart: Date, newEnd: Date): Promise<boolean> => {
      setIsValidating(true);

      try {
        // Validate drop
        const validation = await validateEventDrop(event, newStart, newEnd);

        if (!validation.valid) {
          alert(validation.error || 'Cannot move event');
          return false;
        }

        // Show warnings if any
        if (validation.conflicts && validation.conflicts.length > 0) {
          const warningCount = validation.conflicts.filter(
            (c) => c.severity === 'warning'
          ).length;

          const confirmMessage = `This event has ${warningCount} scheduling warning${
            warningCount !== 1 ? 's' : ''
          }:\n\n${validation.conflicts
            .map((c) => `- ${c.message}`)
            .join('\n')}\n\nDo you want to proceed?`;

          if (!confirm(confirmMessage)) {
            return false;
          }
        }

        // Update event
        const success = await onEventUpdate(event, newStart, newEnd);
        return success;
      } catch (error) {
        console.error('[useCalendarDragDrop] Error handling event drop:', error);
        alert('Failed to update event');
        return false;
      } finally {
        setIsValidating(false);
      }
    },
    [validateEventDrop, onEventUpdate]
  );

  /**
   * Handle event resize with validation
   */
  const handleEventResize = useCallback(
    async (event: Event, newStart: Date, newEnd: Date): Promise<boolean> => {
      setIsValidating(true);

      try {
        // Validate resize
        const validation = await validateEventResize(event, newStart, newEnd);

        if (!validation.valid) {
          alert(validation.error || 'Cannot resize event');
          return false;
        }

        // Show warnings if any
        if (validation.conflicts && validation.conflicts.length > 0) {
          const warningCount = validation.conflicts.filter(
            (c) => c.severity === 'warning'
          ).length;

          const confirmMessage = `This event has ${warningCount} scheduling warning${
            warningCount !== 1 ? 's' : ''
          }:\n\n${validation.conflicts
            .map((c) => `- ${c.message}`)
            .join('\n')}\n\nDo you want to proceed?`;

          if (!confirm(confirmMessage)) {
            return false;
          }
        }

        // Update event
        const success = await onEventUpdate(event, newStart, newEnd);
        return success;
      } catch (error) {
        console.error('[useCalendarDragDrop] Error handling event resize:', error);
        alert('Failed to update event');
        return false;
      } finally {
        setIsValidating(false);
      }
    },
    [validateEventResize, onEventUpdate]
  );

  return {
    isValidating,
    validateEventDrop,
    validateEventResize,
    handleEventDrop,
    handleEventResize,
  };
}
