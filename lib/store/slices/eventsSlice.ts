import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Event, EventsState, EventType, EventStatus } from '@/lib/models/Event';
import FirestoreService from '@/lib/api/firebase/firestore';
import { where, orderBy, QueryConstraint } from 'firebase/firestore';

const initialState: EventsState = {
  events: [],
  isLoading: false,
  error: null,
  selectedEvent: null,
  filters: {
    type: 'all',
    status: 'all',
  },
};

/**
 * Fetch events for a user
 */
export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',
  async (
    {
      userId,
      startDate,
      endDate,
    }: {
      userId: string;
      startDate?: Date;
      endDate?: Date;
    },
    { rejectWithValue }
  ) => {
    try {
      const constraints: QueryConstraint[] = [where('userId', '==', userId)];

      if (startDate) {
        constraints.push(where('datetime', '>=', startDate));
      }
      if (endDate) {
        constraints.push(where('datetime', '<=', endDate));
      }
      constraints.push(orderBy('datetime', 'desc'));

      const docs = await FirestoreService.getDocuments<any>('events', constraints);

      const events: Event[] = docs.map((doc: any) => ({
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
        reminders: doc.reminders || [], // NEW: Multiple reminders support
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
      }));

      return events.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
    } catch (error: any) {
      console.error('Error fetching events:', error);
      return rejectWithValue(error.message || 'Failed to fetch events');
    }
  }
);

/**
 * Create a new event
 */
export const createEvent = createAsyncThunk(
  'events/createEvent',
  async (
    {
      userId,
      eventData,
    }: {
      userId: string;
      eventData: Omit<Event, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
    },
    { rejectWithValue }
  ) => {
    try {
      const now = new Date();
      const docData = {
        userId,
        ...eventData,
        createdAt: now,
        updatedAt: now,
      };

      const docId = await FirestoreService.addDocument('events', docData);

      const newEvent: Event = {
        id: docId,
        userId,
        ...eventData,
        createdAt: now,
        updatedAt: now,
      };

      return newEvent;
    } catch (error: any) {
      console.error('Error creating event:', error);
      return rejectWithValue(error.message || 'Failed to create event');
    }
  }
);

/**
 * Update an existing event
 */
export const updateEvent = createAsyncThunk(
  'events/updateEvent',
  async (
    {
      eventId,
      updates,
    }: {
      eventId: string;
      updates: Partial<Omit<Event, 'id' | 'userId' | 'createdAt'>>;
    },
    { rejectWithValue }
  ) => {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date(),
        userModified: true,
      };

      await FirestoreService.updateDocument('events', eventId, updateData);

      return { eventId, updates: updateData };
    } catch (error: any) {
      console.error('Error updating event:', error);
      return rejectWithValue(error.message || 'Failed to update event');
    }
  }
);

/**
 * Delete an event
 */
export const deleteEvent = createAsyncThunk(
  'events/deleteEvent',
  async (eventId: string, { rejectWithValue }) => {
    try {
      await FirestoreService.deleteDocument('events', eventId);
      return eventId;
    } catch (error: any) {
      console.error('Error deleting event:', error);
      return rejectWithValue(error.message || 'Failed to delete event');
    }
  }
);

/**
 * Confirm a draft event
 */
export const confirmEvent = createAsyncThunk(
  'events/confirmEvent',
  async (eventId: string, { rejectWithValue }) => {
    try {
      const updates = {
        status: 'confirmed' as EventStatus,
        userConfirmed: true,
        updatedAt: new Date(),
      };

      await FirestoreService.updateDocument('events', eventId, updates);

      return { eventId, updates };
    } catch (error: any) {
      console.error('Error confirming event:', error);
      return rejectWithValue(error.message || 'Failed to confirm event');
    }
  }
);

/**
 * Complete an event
 */
export const completeEvent = createAsyncThunk(
  'events/completeEvent',
  async (eventId: string, { rejectWithValue }) => {
    try {
      const now = new Date();
      const updates = {
        status: 'completed' as EventStatus,
        completedAt: now,
        updatedAt: now,
      };

      await FirestoreService.updateDocument('events', eventId, updates);

      return { eventId, updates };
    } catch (error: any) {
      console.error('Error completing event:', error);
      return rejectWithValue(error.message || 'Failed to complete event');
    }
  }
);

/**
 * Cancel an event
 */
export const cancelEvent = createAsyncThunk(
  'events/cancelEvent',
  async (eventId: string, { rejectWithValue }) => {
    try {
      const updates = {
        status: 'cancelled' as EventStatus,
        updatedAt: new Date(),
      };

      await FirestoreService.updateDocument('events', eventId, updates);

      return { eventId, updates };
    } catch (error: any) {
      console.error('Error cancelling event:', error);
      return rejectWithValue(error.message || 'Failed to cancel event');
    }
  }
);

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    setSelectedEvent: (state, action: PayloadAction<Event | null>) => {
      state.selectedEvent = action.payload;
    },
    setTypeFilter: (state, action: PayloadAction<EventType | 'all'>) => {
      state.filters.type = action.payload;
    },
    setStatusFilter: (state, action: PayloadAction<EventStatus | 'all'>) => {
      state.filters.status = action.payload;
    },
    setDateRangeFilter: (
      state,
      action: PayloadAction<{ startDate?: Date; endDate?: Date }>
    ) => {
      state.filters.startDate = action.payload.startDate;
      state.filters.endDate = action.payload.endDate;
    },
    clearFilters: (state) => {
      state.filters = {
        type: 'all',
        status: 'all',
      };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch events
    builder.addCase(fetchEvents.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchEvents.fulfilled, (state, action) => {
      state.events = action.payload;
      state.isLoading = false;
    });
    builder.addCase(fetchEvents.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Create event
    builder.addCase(createEvent.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createEvent.fulfilled, (state, action) => {
      state.events.push(action.payload);
      state.events.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
      state.isLoading = false;
    });
    builder.addCase(createEvent.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Update event
    builder.addCase(updateEvent.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(updateEvent.fulfilled, (state, action) => {
      const { eventId, updates } = action.payload;
      const eventIndex = state.events.findIndex((e) => e.id === eventId);
      if (eventIndex !== -1) {
        state.events[eventIndex] = {
          ...state.events[eventIndex],
          ...updates,
        };
        state.events.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
      }
      if (state.selectedEvent?.id === eventId) {
        state.selectedEvent = { ...state.selectedEvent, ...updates };
      }
      state.isLoading = false;
    });
    builder.addCase(updateEvent.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Delete event
    builder.addCase(deleteEvent.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(deleteEvent.fulfilled, (state, action) => {
      state.events = state.events.filter((e) => e.id !== action.payload);
      if (state.selectedEvent?.id === action.payload) {
        state.selectedEvent = null;
      }
      state.isLoading = false;
    });
    builder.addCase(deleteEvent.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Confirm event
    builder.addCase(confirmEvent.fulfilled, (state, action) => {
      const { eventId, updates } = action.payload;
      const eventIndex = state.events.findIndex((e) => e.id === eventId);
      if (eventIndex !== -1) {
        state.events[eventIndex] = {
          ...state.events[eventIndex],
          ...updates,
        };
      }
      if (state.selectedEvent?.id === eventId) {
        state.selectedEvent = { ...state.selectedEvent, ...updates };
      }
    });

    // Complete event
    builder.addCase(completeEvent.fulfilled, (state, action) => {
      const { eventId, updates } = action.payload;
      const eventIndex = state.events.findIndex((e) => e.id === eventId);
      if (eventIndex !== -1) {
        state.events[eventIndex] = {
          ...state.events[eventIndex],
          ...updates,
        };
      }
      if (state.selectedEvent?.id === eventId) {
        state.selectedEvent = { ...state.selectedEvent, ...updates };
      }
    });

    // Cancel event
    builder.addCase(cancelEvent.fulfilled, (state, action) => {
      const { eventId, updates } = action.payload;
      const eventIndex = state.events.findIndex((e) => e.id === eventId);
      if (eventIndex !== -1) {
        state.events[eventIndex] = {
          ...state.events[eventIndex],
          ...updates,
        };
      }
      if (state.selectedEvent?.id === eventId) {
        state.selectedEvent = { ...state.selectedEvent, ...updates };
      }
    });
  },
});

export const {
  setSelectedEvent,
  setTypeFilter,
  setStatusFilter,
  setDateRangeFilter,
  clearFilters,
  clearError,
} = eventsSlice.actions;

export default eventsSlice.reducer;
