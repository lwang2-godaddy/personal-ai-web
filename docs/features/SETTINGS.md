# Settings

This document describes the Settings feature in Personal AI Web.

## Overview

The Settings page allows users to configure:

- Profile information
- Notification preferences
- Quiet hours
- Life Feed settings
- Storage usage

## Page Location

**File**: `app/(dashboard)/settings/page.tsx`

**Route**: `/settings`

**Guard**: `AuthGuard` (requires authentication)

---

## Settings Sections

### Profile Settings

Basic user information.

**Fields**:

| Field | Description | Editable |
|-------|-------------|----------|
| Display Name | User's name | Yes |
| Email | Account email | No (via Firebase) |
| Profile Photo | Avatar image | Yes (via Google) |
| Timezone | User's timezone | Yes |
| Locale | Preferred language | Yes |

**Supported Locales**:
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Japanese (ja)
- Chinese (zh)

### Notification Preferences

Control push notifications.

**Component**: `components/settings/NotificationSettings.tsx`

#### Web Push Setup

```typescript
// Check browser support
const isPushSupported = 'Notification' in window && 'serviceWorker' in navigator;

// Request permission
const permission = await Notification.requestPermission();
// 'granted', 'denied', or 'default'
```

**UI States**:

| State | Display |
|-------|---------|
| Not supported | "Your browser doesn't support push notifications" |
| Not granted | "Enable Notifications" button |
| Granted | Toggle controls |
| Blocked | Instructions to unblock |

#### Notification Types

| Type | Category | Description |
|------|----------|-------------|
| Daily Summary | Scheduled | Daily activity recap |
| Weekly Insights | Scheduled | Weekly patterns and trends |
| Fun Facts | Scheduled | Interesting facts about your data |
| Pattern Reminders | Instant | Behavior pattern alerts |
| Achievements | Instant | Milestone notifications |
| Location Alerts | Instant | Significant location changes |

#### Scheduled Notifications

```typescript
interface ScheduledNotifications {
  dailySummary: {
    enabled: boolean;
    time: string;           // "09:00"
  };
  weeklyInsights: {
    enabled: boolean;
    dayOfWeek: number;      // 0 = Sunday
    time: string;
  };
  funFacts: {
    enabled: boolean;
    frequency: 'daily' | 'weekly';
  };
}
```

#### Test Notification

Button to send a test notification:

```typescript
async function sendTestNotification() {
  if (Notification.permission === 'granted') {
    new Notification('Personal AI Test', {
      body: 'Notifications are working!',
      icon: '/icon.png',
    });
  }
}
```

### Quiet Hours

Do Not Disturb schedules.

**Model**:

```typescript
interface QuietHours {
  id: string;
  name: string;
  startTime: string;        // "22:00"
  endTime: string;          // "07:00"
  daysOfWeek: number[];     // 0-6 (Sun-Sat)
  timezone?: string;
  allowUrgent: boolean;
}
```

**Features**:
- Multiple quiet hour schedules
- Per-day configuration
- Override for urgent notifications
- Timezone awareness

### Life Feed Preferences

Configure AI-generated life updates (mobile feature).

```typescript
interface LifeFeedPreferences {
  enabled: boolean;
  frequency: 'low' | 'medium' | 'high' | 'smart';
  maxPostsPerDay: number;
  cooldowns: {
    lifeSummary: number;
    milestone: number;
    // ... per type
  };
  enabledTypes: LifeFeedEnabledTypes;
  smartFrequencyConfig: SmartFrequencyConfig;
  voiceStyle: 'casual' | 'professional' | 'enthusiastic' | 'minimal';
  useEmojis: boolean;
  useHashtags: boolean;
  notifyOnPost: boolean;
}
```

**Enabled Types**:
- Life summaries
- Milestones
- Streak achievements
- Pattern predictions
- Reflective insights
- Memory highlights
- Comparisons
- Seasonal reflections

### Storage Usage

View storage consumption.

**Component**: `components/settings/StorageUsageCard.tsx`

**API**: `GET /api/storage-usage`

**Displays**:

| Metric | Description |
|--------|-------------|
| Total Used | Sum of all storage |
| Quota | Storage limit (1GB default) |
| Usage % | Percentage of quota used |
| Photos | Count and size of photos |
| Voice Notes | Count and size of audio |
| Last Updated | Calculation timestamp |

**Progress Bar Colors**:
- Green: < 50%
- Yellow: 50-80%
- Red: > 80%

**Refresh Button**:
Recalculates storage from Firestore.

---

## API Integration

### Update Preferences

**Endpoint**: `PATCH /api/users/[userId]`

**Request**:
```typescript
{
  timezone?: string;
  locale?: string;
  notificationPreferences?: NotificationPreferences;
  lifeFeedPreferences?: LifeFeedPreferences;
  quietHours?: QuietHours[];
}
```

### Get Storage Usage

**Endpoint**: `GET /api/storage-usage`

**Response**:
```typescript
{
  total: {
    count: number;
    sizeBytes: number;
    sizeFormatted: string;
  };
  photos: {
    count: number;
    sizeBytes: number;
    sizeFormatted: string;
  };
  voiceNotes: {
    count: number;
    sizeBytes: number;
    sizeFormatted: string;
  };
  quotaBytes: number;
  quotaPercentage: number;
  calculatedAt: string;
}
```

---

## State Management

Settings are stored in the user document and managed via Redux auth slice.

### Update Flow

```
User Changes Setting
        │
        ▼
dispatch(updateUserPreferencesThunk({
  userId,
  preferences: newPreferences
}))
        │
        ▼
PATCH /api/users/[userId]
        │
        ▼
Redux State Updated
        │
        ▼
UI Re-renders
```

### Optimistic Updates

Some settings update optimistically:

```typescript
builder.addCase(updateUserPreferencesThunk.pending, (state, action) => {
  // Optimistically update
  if (state.user) {
    state.user = {
      ...state.user,
      ...action.meta.arg.preferences,
    };
  }
});

builder.addCase(updateUserPreferencesThunk.rejected, (state, action) => {
  // Revert on failure
  state.error = action.payload as string;
  // Could restore previous state here
});
```

---

## Data Models

### User Preferences

```typescript
interface UserPreferences {
  dataCollection: {
    health: boolean;
    location: boolean;
    voice: boolean;
  };
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'manual';
  privacy: {
    analyticsEnabled: boolean;
    crashReportingEnabled: boolean;
  };
  language?: string;
  savedSearches?: SavedSearch[];
}
```

### Notification Preferences

```typescript
interface NotificationPreferences {
  enabled: boolean;
  scheduled: {
    dailySummary: { enabled: boolean; time: string };
    weeklyInsights: { enabled: boolean; dayOfWeek: number; time: string };
    funFacts: { enabled: boolean; frequency: 'daily' | 'weekly' };
  };
  instant: {
    patternReminders: boolean;
    achievements: boolean;
    locationAlerts: boolean;
  };
  androidChannels?: Record<string, { sound: boolean; vibration: boolean }>;
}
```

---

## Web Push Implementation

### Service Worker

Web push requires a service worker:

```typescript
// public/sw.js
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge.png',
    data: data.url,
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
```

### FCM Token

Firebase Cloud Messaging token for push delivery:

```typescript
import { getMessaging, getToken } from 'firebase/messaging';

async function getFCMToken() {
  const messaging = getMessaging();
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  });
  return token;
}

// Store token in user document
await updateDoc(userRef, { fcmToken: token });
```

---

## Related Documentation

- [Database Schema - User](../DATABASE_SCHEMA.md#user-data)
- [API Reference - Users](../API_REFERENCE.md#user--account)
- [Authentication](../infrastructure/AUTHENTICATION.md)
