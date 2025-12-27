export type EventType = 'appointment' | 'meeting' | 'intention' | 'plan' | 'reminder' | 'todo';
export type EventSourceType = 'voice' | 'text' | 'photo' | 'health' | 'location' | 'manual';
export type EventStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'draft';
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ReminderStatus = 'pending' | 'scheduled' | 'sent' | 'cancelled' | 'snoozed';

export interface EventReminder {
  id: string; // UUID for tracking
  type: 'smart' | 'custom';
  timing: number; // Minutes before event
  notificationId?: string; // FCM/local notification ID
  scheduledAt?: Date;
  sentAt?: Date;
  status: ReminderStatus;
  snoozeCount?: number; // Times snoozed (max 3)
  snoozeUntil?: Date; // Snooze expiration time
}

// Smart reminder defaults per event type (minutes before event)
export const SMART_REMINDER_DEFAULTS: Record<EventType, number[]> = {
  appointment: [10080, 1440, 60], // 1 week, 1 day, 1 hour
  meeting: [1440, 60, 15], // 1 day, 1 hour, 15 min
  intention: [1440], // 1 day
  plan: [10080, 1440], // 1 week, 1 day
  reminder: [60], // 1 hour
  todo: [1440, 60], // 1 day, 1 hour
};

export interface Event {
  id: string;
  userId: string;
  title: string;
  description: string;
  datetime: Date;
  endDatetime?: Date;
  isAllDay: boolean;
  type: EventType;
  sourceType: EventSourceType;
  sourceId: string;
  sourceText: string;
  location?: string;
  locationId?: string;
  participants: string[];
  recurrence?: RecurrenceType;
  recurrenceEndDate?: Date;
  status: EventStatus;
  confidence: number;
  timezone?: string; // IANA timezone (e.g., 'America/Los_Angeles')
  reminders: EventReminder[]; // NEW: Multiple reminders support
  notificationScheduled: boolean; // @deprecated Use reminders array
  notificationSentAt?: Date; // @deprecated Use reminders array
  notificationId?: string; // @deprecated Use reminders array
  userConfirmed: boolean;
  userModified: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  embeddingId?: string;
}

export interface EventsState {
  events: Event[];
  isLoading: boolean;
  error: string | null;
  selectedEvent: Event | null;
  filters: {
    type: EventType | 'all';
    status: EventStatus | 'all';
    startDate?: Date;
    endDate?: Date;
  };
}
