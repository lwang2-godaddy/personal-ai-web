# Events

This document describes the Events and Calendar feature in Personal AI Web.

## Overview

The Events feature provides:

- Calendar views (month, week, day, agenda)
- Event management (create, edit, delete)
- Smart reminders
- Conflict detection
- Event search

## Page Location

**File**: `app/(dashboard)/events/page.tsx`

**Route**: `/events`

**Guard**: `AuthGuard` (requires authentication)

---

## Calendar Views

### EventCalendar

**File**: `components/events/EventCalendar.tsx`

Full calendar component using react-big-calendar.

**Views**:

| View | Description |
|------|-------------|
| Month | Traditional month grid |
| Week | 7-day view with time slots |
| Day | Single day with time slots |
| Agenda | List view of upcoming events |

**Features**:
- Color-coded by event type
- Click event to view details
- Navigation controls (prev/next/today)
- Responsive layout

**Event Colors**:

| Type | Color |
|------|-------|
| Appointment | Blue |
| Meeting | Purple |
| Reminder | Orange |
| Todo | Green |
| Intention | Teal |
| Plan | Pink |

### MiniCalendar

**File**: `components/events/MiniCalendar.tsx`

Compact calendar widget for date selection.

Used in:
- Event creation modal
- Date range filters

---

## Event Types

```typescript
type EventType = 'appointment' | 'meeting' | 'intention' | 'plan' | 'reminder' | 'todo';
```

| Type | Description | Example |
|------|-------------|---------|
| Appointment | Scheduled time with others | Doctor visit |
| Meeting | Work/social gatherings | Team standup |
| Intention | Goals without specific time | "Exercise more" |
| Plan | Planned activities | Weekend trip |
| Reminder | Time-sensitive alerts | Pay bills |
| Todo | Tasks to complete | Buy groceries |

---

## Event Status

```typescript
type EventStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'draft';
```

| Status | Description | Actions Available |
|--------|-------------|-------------------|
| Draft | Extracted, not confirmed | Confirm, Edit, Delete |
| Pending | Awaiting confirmation | Confirm, Edit, Delete |
| Confirmed | User confirmed | Complete, Cancel, Edit |
| Completed | Finished | Edit, Delete |
| Cancelled | User cancelled | Delete |

### Status Flow

```
Draft → Pending → Confirmed → Completed
                     ↓
                  Cancelled
```

---

## Event Sources

Events can be created from various sources:

```typescript
type EventSourceType = 'voice' | 'text' | 'photo' | 'health' | 'location' | 'manual';
```

| Source | Description |
|--------|-------------|
| Voice | Extracted from voice note transcription |
| Text | Extracted from diary entry |
| Photo | Inferred from photo metadata |
| Health | Generated from health patterns |
| Location | Inferred from location visits |
| Manual | Created manually by user |

---

## Components

### EventModal

**File**: `components/events/EventModal.tsx`

Multi-mode modal for viewing/editing/creating events.

**Modes**:
- View: Read-only display
- Edit: Modify existing event
- Create: New event form

**Fields**:

| Field | Type | Required |
|-------|------|----------|
| Title | text | Yes |
| Description | textarea | No |
| Start Date/Time | datetime | Yes |
| End Date/Time | datetime | No |
| All Day | checkbox | No |
| Type | select | Yes |
| Status | select | No |
| Location | text | No |
| Participants | tags | No |
| Reminders | reminder manager | No |
| Recurrence | select | No |

**Actions** (based on status):

| Status | Actions |
|--------|---------|
| Draft | Confirm, Delete |
| Pending | Confirm, Delete |
| Confirmed | Complete, Cancel |
| Completed | Edit, Delete |
| Cancelled | Delete |

### EventTooltip

**File**: `components/events/EventTooltip.tsx`

Floating tooltip on calendar event click.

**Displays**:
- Event title
- Date/time
- Location (if set)
- Quick action buttons

### EventSearchBar

**File**: `components/events/EventSearchBar.tsx`

Search and filter interface.

**Features**:
- Text search with fuzzy matching
- Type filter dropdown
- Status filter dropdown
- Date range picker
- Clear filters button

### ReminderManager

**File**: `components/events/ReminderManager.tsx`

Reminder configuration UI.

**Features**:
- Add preset reminders (15min, 1hr, 1 day)
- Add custom reminder timing
- Remove reminders
- View reminder status

### TimezoneSelector

**File**: `components/events/TimezoneSelector.tsx`

Timezone selection dropdown.

Used for:
- Events spanning timezones
- User preference setting

### ConflictWarning

**File**: `components/events/ConflictWarning.tsx`

Warning indicator for scheduling conflicts.

**Conflict Types**:

| Type | Severity | Message |
|------|----------|---------|
| Overlap | Error | "Conflicts with [Event]" |
| Travel Time | Warning | "May not have enough time to travel" |
| Back-to-Back | Warning | "Less than 15 minutes between events" |

---

## Reminders

### Smart Reminders

Auto-generated based on event type:

| Event Type | Default Reminders |
|------------|-------------------|
| Meeting | 60 min, 5 min before |
| Appointment | 1 day, 60 min before |
| Deadline | 1 week, 1 day before |
| Social | 60 min before |
| Travel | 1 day, 2 hours before |

### Reminder Status

```typescript
type ReminderStatus = 'pending' | 'scheduled' | 'sent' | 'cancelled' | 'snoozed';
```

| Status | Description |
|--------|-------------|
| Pending | Not yet scheduled |
| Scheduled | Notification queued |
| Sent | Notification delivered |
| Cancelled | User cancelled |
| Snoozed | Delayed (max 3 times) |

### Reminder Model

```typescript
interface EventReminder {
  id: string;
  type: 'smart' | 'custom';
  timing: number;           // Minutes before event
  notificationId?: string;
  scheduledAt?: Date;
  sentAt?: Date;
  status: ReminderStatus;
  snoozeCount?: number;     // Max 3
  snoozeUntil?: Date;
}
```

---

## Search & Filtering

### Search Scoring

Events are ranked by relevance:

| Match Type | Score |
|------------|-------|
| Title exact | +100 |
| Title prefix | +50 |
| Title substring | +25 |
| Title fuzzy | +15 |
| Description substring | +10 |
| Location exact | +40 |
| Participant exact | +30 |
| Recent (< 30 days) | +5 |

### Fuzzy Matching

Uses Levenshtein distance for typo tolerance:

```typescript
// "meeting" matches "meetting" (distance 1)
// "appointment" matches "apointment" (distance 1)
// Max distance: 3
```

### Search History

Recent searches saved to localStorage:
- Max 10 searches
- Cleared on user request

---

## State Management

### eventsSlice

```typescript
interface EventsState {
  events: Event[];
  isLoading: boolean;
  error: string | null;
  selectedEvent: Event | null;
  filters: {
    type: 'all' | EventType;
    status: 'all' | EventStatus;
    startDate?: Date;
    endDate?: Date;
  };
}
```

### Key Actions

| Action | Description |
|--------|-------------|
| `fetchEvents` | Load events with optional date range |
| `createEvent` | Create new event |
| `updateEvent` | Update existing event |
| `deleteEvent` | Delete event |
| `confirmEvent` | Mark draft as confirmed |
| `completeEvent` | Mark as completed |
| `cancelEvent` | Cancel event |
| `setSelectedEvent` | Select for viewing/editing |
| `setTypeFilter` | Filter by type |
| `setStatusFilter` | Filter by status |
| `setDateRangeFilter` | Filter by date range |

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events` | GET | List events |
| `/api/events` | POST | Create event |
| `/api/events/[id]` | GET | Get event |
| `/api/events/[id]` | PATCH | Update event |
| `/api/events/[id]` | DELETE | Delete event |
| `/api/events/search` | GET | Search events |

See [API Reference](../API_REFERENCE.md) for full details.

---

## Conflict Detection

### Service

**File**: `lib/services/ConflictDetectionService.ts`

### Detection Types

1. **Temporal Overlap**: Events at same time
2. **Travel Time**: Not enough time between locations
3. **Back-to-Back**: Less than 15 min gap

### Configuration

```typescript
interface ConflictConfig {
  enabled: boolean;
  defaultBuffer: number;    // 30 min default
  useGoogleMaps: boolean;
  transportMode: 'driving' | 'walking' | 'transit' | 'bicycling';
}
```

### Google Maps Integration

For travel time conflicts:

```typescript
const travelTime = await googleMapsService.calculateTravelTime(
  event1.location,
  event2.location,
  event1.endDatetime,
  'driving'
);

if (timeBetweenEvents < travelTime.duration) {
  conflicts.push({
    type: 'travel_time',
    severity: 'warning',
    event: event2,
  });
}
```

---

## Related Documentation

- [Database Schema - Events](../DATABASE_SCHEMA.md#chat--events)
- [Services - Event Services](../SERVICES.md#event-services)
- [Components](../COMPONENTS.md#event-management)
