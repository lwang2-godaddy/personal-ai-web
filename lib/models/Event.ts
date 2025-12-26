export type EventType = 'appointment' | 'meeting' | 'intention' | 'plan' | 'reminder' | 'todo';
export type EventSourceType = 'voice' | 'text' | 'photo' | 'health' | 'location' | 'manual';
export type EventStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'draft';
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly';

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
  notificationScheduled: boolean;
  notificationSentAt?: Date;
  notificationId?: string;
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
