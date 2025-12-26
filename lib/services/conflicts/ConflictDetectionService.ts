import { Event } from '@/lib/models/Event';
import GoogleMapsService from '@/lib/services/maps/GoogleMapsService';
import FirestoreService from '@/lib/api/firebase/firestore';
import { where, orderBy, QueryConstraint } from 'firebase/firestore';

export type ConflictType = 'overlap' | 'travel_time' | 'back_to_back';
export type ConflictSeverity = 'warning' | 'error';

export interface EventConflict {
  conflictingEventId: string;
  conflictingEventTitle: string;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  message: string;
  travelTimeMinutes?: number;
}

export interface TravelTimeConfig {
  enabled: boolean;
  defaultBuffer: number; // Minutes (e.g., 30)
  useGoogleMaps: boolean; // Distance Matrix API or static buffer
  transportMode: 'driving' | 'walking' | 'transit' | 'bicycling';
}

const DEFAULT_CONFIG: TravelTimeConfig = {
  enabled: true,
  defaultBuffer: 30,
  useGoogleMaps: true,
  transportMode: 'driving',
};

/**
 * ConflictDetectionService - Web version
 * Detects scheduling conflicts between events
 */
class ConflictDetectionService {
  private static instance: ConflictDetectionService;
  private config: TravelTimeConfig = DEFAULT_CONFIG;
  private googleMapsService = GoogleMapsService;

  private constructor() {}

  static getInstance(): ConflictDetectionService {
    if (!ConflictDetectionService.instance) {
      ConflictDetectionService.instance = new ConflictDetectionService();
    }
    return ConflictDetectionService.instance;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<TravelTimeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): TravelTimeConfig {
    return { ...this.config };
  }

  /**
   * Detect conflicts for a specific event
   */
  async detectConflicts(
    userId: string,
    targetEvent: Partial<Event> & { datetime: Date; endDatetime?: Date },
    excludeEventId?: string
  ): Promise<EventConflict[]> {
    const conflicts: EventConflict[] = [];

    // Fetch potentially conflicting events (within ±7 days)
    const startWindow = new Date(targetEvent.datetime);
    startWindow.setDate(startWindow.getDate() - 7);

    const endWindow = new Date(targetEvent.datetime);
    endWindow.setDate(endWindow.getDate() + 7);

    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
      where('datetime', '>=', startWindow),
      where('datetime', '<=', endWindow),
      where('status', 'in', ['pending', 'confirmed']),
      orderBy('datetime', 'asc'),
    ];

    const docs = await FirestoreService.getDocuments<any>('events', constraints);

    const existingEvents: Event[] = docs
      .map((doc: any) => ({
        id: doc.id,
        userId: doc.userId,
        title: doc.title,
        description: doc.description,
        datetime: doc.datetime?.toDate ? doc.datetime.toDate() : new Date(doc.datetime),
        endDatetime: doc.endDatetime?.toDate
          ? doc.endDatetime.toDate()
          : doc.endDatetime
          ? new Date(doc.endDatetime)
          : undefined,
        isAllDay: doc.isAllDay,
        type: doc.type,
        sourceType: doc.sourceType,
        sourceId: doc.sourceId,
        sourceText: doc.sourceText,
        location: doc.location,
        locationId: doc.locationId,
        participants: doc.participants || [],
        recurrence: doc.recurrence,
        recurrenceEndDate: doc.recurrenceEndDate?.toDate
          ? doc.recurrenceEndDate.toDate()
          : doc.recurrenceEndDate
          ? new Date(doc.recurrenceEndDate)
          : undefined,
        status: doc.status,
        confidence: doc.confidence,
        reminders: doc.reminders || [],
        notificationScheduled: doc.notificationScheduled,
        notificationSentAt: doc.notificationSentAt?.toDate
          ? doc.notificationSentAt.toDate()
          : doc.notificationSentAt
          ? new Date(doc.notificationSentAt)
          : undefined,
        notificationId: doc.notificationId,
        userConfirmed: doc.userConfirmed,
        userModified: doc.userModified,
        completedAt: doc.completedAt?.toDate
          ? doc.completedAt.toDate()
          : doc.completedAt
          ? new Date(doc.completedAt)
          : undefined,
        createdAt: doc.createdAt?.toDate ? doc.createdAt.toDate() : new Date(doc.createdAt),
        updatedAt: doc.updatedAt?.toDate ? doc.updatedAt.toDate() : new Date(doc.updatedAt),
        embeddingId: doc.embeddingId,
      }))
      .filter((event) => event.id !== excludeEventId);

    // Check each existing event for conflicts
    for (const existingEvent of existingEvents) {
      // Skip all-day events (no time-specific conflicts)
      if (targetEvent.isAllDay || existingEvent.isAllDay) {
        continue;
      }

      // 1. Check for temporal overlap
      const overlapConflict = this.checkTemporalOverlap(targetEvent, existingEvent);
      if (overlapConflict) {
        conflicts.push(overlapConflict);
        continue; // Skip other checks if overlapping
      }

      // 2. Check for travel time conflicts
      if (this.config.enabled && targetEvent.location && existingEvent.location) {
        const travelConflict = await this.checkTravelTimeConflict(targetEvent, existingEvent);
        if (travelConflict) {
          conflicts.push(travelConflict);
          continue;
        }
      }

      // 3. Check for back-to-back events (<15 min gap)
      const backToBackConflict = this.checkBackToBackConflict(targetEvent, existingEvent);
      if (backToBackConflict) {
        conflicts.push(backToBackConflict);
      }
    }

    return conflicts;
  }

  /**
   * Check for temporal overlap between events
   */
  private checkTemporalOverlap(
    event1: Partial<Event> & { datetime: Date; endDatetime?: Date },
    event2: Event
  ): EventConflict | null {
    const start1 = event1.datetime.getTime();
    const end1 = event1.endDatetime ? event1.endDatetime.getTime() : start1 + 60 * 60 * 1000; // Default 1 hour

    const start2 = event2.datetime.getTime();
    const end2 = event2.endDatetime ? event2.endDatetime.getTime() : start2 + 60 * 60 * 1000;

    // Check if time ranges overlap
    const overlaps = start1 < end2 && end1 > start2;

    if (overlaps) {
      return {
        conflictingEventId: event2.id,
        conflictingEventTitle: event2.title,
        conflictType: 'overlap',
        severity: 'error',
        message: `Overlaps with "${event2.title}" at ${event2.datetime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })}`,
      };
    }

    return null;
  }

  /**
   * Check for travel time conflicts
   */
  private async checkTravelTimeConflict(
    event1: Partial<Event> & { datetime: Date; endDatetime?: Date; location?: string },
    event2: Event
  ): Promise<EventConflict | null> {
    if (!event1.location || !event2.location) {
      return null;
    }

    // Skip if locations are the same
    if (event1.location.toLowerCase().trim() === event2.location.toLowerCase().trim()) {
      return null;
    }

    const start1 = event1.datetime.getTime();
    const end1 = event1.endDatetime ? event1.endDatetime.getTime() : start1 + 60 * 60 * 1000;

    const start2 = event2.datetime.getTime();
    const end2 = event2.endDatetime ? event2.endDatetime.getTime() : start2 + 60 * 60 * 1000;

    let travelTimeMinutes: number;

    if (this.config.useGoogleMaps) {
      try {
        // Determine which event comes first
        const isEvent1First = start1 < start2;

        if (isEvent1First) {
          // Travel from event1 to event2
          const result = await this.googleMapsService.calculateTravelTime(
            event1.location,
            event2.location,
            new Date(end1),
            this.config.transportMode
          );
          travelTimeMinutes = result.durationMinutes;
        } else {
          // Travel from event2 to event1
          const result = await this.googleMapsService.calculateTravelTime(
            event2.location,
            event1.location,
            new Date(end2),
            this.config.transportMode
          );
          travelTimeMinutes = result.durationMinutes;
        }
      } catch (error) {
        console.error('[ConflictDetectionService] Error calculating travel time:', error);
        travelTimeMinutes = this.config.defaultBuffer;
      }
    } else {
      travelTimeMinutes = this.config.defaultBuffer;
    }

    // Check if there's enough time for travel
    const gapMinutes = Math.abs(start2 - end1) / (60 * 1000);

    if (gapMinutes < travelTimeMinutes) {
      const isEvent1First = start1 < start2;
      const location1 = isEvent1First ? event1.location : event2.location;
      const location2 = isEvent1First ? event2.location : event1.location;

      return {
        conflictingEventId: event2.id,
        conflictingEventTitle: event2.title,
        conflictType: 'travel_time',
        severity: 'warning',
        message: `Insufficient travel time to "${event2.title}" at ${event2.location}. Need ${travelTimeMinutes} min, have ${Math.floor(gapMinutes)} min.`,
        travelTimeMinutes,
      };
    }

    return null;
  }

  /**
   * Check for back-to-back events (<15 min gap)
   */
  private checkBackToBackConflict(
    event1: Partial<Event> & { datetime: Date; endDatetime?: Date },
    event2: Event
  ): EventConflict | null {
    const start1 = event1.datetime.getTime();
    const end1 = event1.endDatetime ? event1.endDatetime.getTime() : start1 + 60 * 60 * 1000;

    const start2 = event2.datetime.getTime();
    const end2 = event2.endDatetime ? event2.endDatetime.getTime() : start2 + 60 * 60 * 1000;

    const isEvent1First = end1 <= start2;
    const isEvent2First = end2 <= start1;

    if (!isEvent1First && !isEvent2First) {
      return null; // Overlapping (handled by temporal overlap check)
    }

    const gapMinutes = isEvent1First
      ? (start2 - end1) / (60 * 1000)
      : (start1 - end2) / (60 * 1000);

    if (gapMinutes < 15 && gapMinutes >= 0) {
      return {
        conflictingEventId: event2.id,
        conflictingEventTitle: event2.title,
        conflictType: 'back_to_back',
        severity: 'warning',
        message: `Only ${Math.floor(gapMinutes)} min gap before "${event2.title}". Consider adding buffer time.`,
      };
    }

    return null;
  }

  /**
   * Format conflict message for display
   */
  formatConflictMessage(conflict: EventConflict): string {
    return conflict.message;
  }

  /**
   * Get conflict severity color
   */
  getConflictColor(severity: ConflictSeverity): string {
    return severity === 'error' ? '#EF4444' : '#F59E0B';
  }

  /**
   * Get conflict icon
   */
  getConflictIcon(type: ConflictType): string {
    const icons = {
      overlap: '⚠️',
      travel_time: '🚗',
      back_to_back: '⏱️',
    };
    return icons[type] || '⚠️';
  }
}

export default ConflictDetectionService.getInstance();
