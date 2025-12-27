# Web Push Notifications Setup Guide

This guide explains how to set up web push notifications with Firebase Cloud Messaging (FCM) for the Personal AI web dashboard.

## Overview

The web push notification system allows users to receive event reminders directly in their browser, even when the app is closed. It uses:
- **Firebase Cloud Messaging (FCM)** for push notification delivery
- **Service Workers** for background message handling
- **Notification API** for displaying notifications
- **Cloud Tasks** for scheduled notification delivery

## Prerequisites

1. Firebase project with Cloud Messaging enabled
2. Web app registered in Firebase Console
3. HTTPS domain (required for service workers, localhost also works)

## Setup Steps

### 1. Generate VAPID Key

VAPID (Voluntary Application Server Identification) keys are required for web push notifications.

```bash
# Go to Firebase Console
# Project Settings > Cloud Messaging > Web Push certificates
# Click "Generate key pair"
```

This will generate a public VAPID key that looks like:
```
BNxxx...xxxx (base64 string)
```

### 2. Add Environment Variables

Add the VAPID key to your `.env.local` file:

```bash
# Firebase VAPID Key for Web Push
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BNxxx...xxxx

# Existing Firebase config
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

**Important:** All environment variables used in the browser MUST have the `NEXT_PUBLIC_` prefix.

### 3. Update Service Worker Configuration

Edit `/public/firebase-messaging-sw.js` and replace the placeholder values with your actual Firebase config:

```javascript
firebase.initializeApp({
  apiKey: 'YOUR_API_KEY',           // From Firebase Console
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
});
```

**Note:** Service workers cannot access environment variables, so these must be hardcoded.

### 4. Add Notification Icons

Create notification icons in `/public`:

```bash
# Create icon files (PNG format recommended)
# - icon-192x192.png (App icon for notifications)
# - badge-72x72.png (Badge icon for notification tray)
```

Or use the provided SVG placeholders (browser will convert to PNG).

### 5. Deploy Cloud Functions

The backend Cloud Functions handle scheduled notification delivery:

```bash
cd PersonalAIApp/firebase/functions

# Install dependencies (if not already done)
npm install

# Build TypeScript
npm run build

# Deploy functions
cd ..
firebase deploy --only functions:sendReminder
firebase deploy --only functions:onEventCreated,onEventUpdated,onEventDeleted
```

### 6. Test Notifications

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open the app in a browser:**
   - Chrome, Firefox, or Edge recommended
   - Safari 16.4+ also supports web push

3. **Enable notifications:**
   - Go to Settings page
   - Click "Enable Notifications"
   - Accept the browser permission prompt

4. **Test notification:**
   - Click "Send Test Notification" button
   - You should see a browser notification

5. **Test event reminders:**
   - Create an event with a reminder (e.g., 1 minute before)
   - Wait for the scheduled time
   - You should receive a notification

## Architecture

### Components

```
User Creates Event
        ↓
Frontend saves to Firestore with reminders
        ↓
Cloud Function: onEventCreated
        ↓
ReminderScheduler creates Cloud Tasks
        ↓
Cloud Tasks wait until scheduled time
        ↓
Cloud Function: sendReminder
        ↓
FCM sends push notification
        ↓
Service Worker receives message
        ↓
Browser displays notification
```

### Files Structure

```
personal-ai-web/
├── public/
│   ├── firebase-messaging-sw.js        # Service worker (background messages)
│   ├── icon-192x192.png                # Notification icon
│   └── badge-72x72.png                 # Badge icon
├── lib/
│   ├── services/
│   │   └── notifications/
│   │       └── NotificationService.ts  # FCM client-side service
│   └── hooks/
│       └── useNotifications.ts         # React hook for notifications
├── components/
│   └── settings/
│       └── NotificationSettings.tsx    # UI for enabling notifications
└── docs/
    └── WEB_PUSH_SETUP.md              # This file
```

### Service Worker Lifecycle

1. **Registration:** Browser registers `/firebase-messaging-sw.js`
2. **Token Generation:** FCM generates unique token for this device
3. **Token Storage:** Token saved to Firestore `users/{userId}/fcmToken`
4. **Background Messages:** Service worker handles messages when app is closed
5. **Foreground Messages:** NotificationService handles messages when app is open

## Usage in Components

### Enable Notifications

```tsx
import { useNotifications } from '@/lib/hooks/useNotifications';

function MyComponent() {
  const {
    isSupported,
    permission,
    initializeNotifications,
    isLoading,
  } = useNotifications(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY);

  if (!isSupported) {
    return <div>Notifications not supported</div>;
  }

  return (
    <button
      onClick={initializeNotifications}
      disabled={isLoading || permission === 'granted'}
    >
      {permission === 'granted' ? 'Notifications Enabled' : 'Enable Notifications'}
    </button>
  );
}
```

### Listen for Foreground Notifications

```tsx
import { useNotificationListener } from '@/lib/hooks/useNotifications';

function MyComponent() {
  useNotificationListener((payload) => {
    console.log('Received notification:', payload);
    // Show toast, update UI, etc.
  });

  return <div>Listening for notifications...</div>;
}
```

### Send Test Notification

```tsx
import NotificationService from '@/lib/services/notifications/NotificationService';

async function handleTest() {
  await NotificationService.testNotification();
}
```

## Security Considerations

### FCM Token Storage

- FCM tokens are stored in Firestore: `users/{userId}/fcmToken`
- Firestore security rules ensure users can only write their own token
- Tokens are automatically refreshed by Firebase when needed

### Notification Permissions

- Users must explicitly grant notification permission
- Permission is stored by the browser (not our app)
- Users can revoke permission at any time in browser settings

### Service Worker Security

- Service workers ONLY work on HTTPS (or localhost for development)
- Service workers are scoped to the domain they're served from
- Firebase automatically validates message authenticity

## Troubleshooting

### "Notifications not supported"

**Cause:** Browser doesn't support Notification API or Service Workers
**Solution:** Use Chrome 50+, Firefox 44+, Safari 16.4+, or Edge 17+

### "No registration token available"

**Causes:**
1. User denied notification permission
2. Service worker failed to register
3. VAPID key is incorrect

**Solutions:**
1. Check browser console for errors
2. Verify VAPID key in `.env.local`
3. Ensure service worker file is accessible at `/firebase-messaging-sw.js`
4. Check browser's Application tab → Service Workers

### "Service worker registration failed"

**Causes:**
1. Not using HTTPS (localhost is OK)
2. Service worker file has syntax errors
3. File not found (must be at `/firebase-messaging-sw.js`)

**Solutions:**
1. Check browser console for detailed error
2. Validate JavaScript syntax in service worker
3. Ensure file is in `/public` directory (Next.js serves it at root)

### Notifications not showing

**Causes:**
1. Notification permission denied
2. Browser settings block notifications
3. Do Not Disturb mode enabled (macOS/Windows)
4. Service worker not active

**Solutions:**
1. Check `Notification.permission` in browser console
2. Check browser notification settings
3. Disable Do Not Disturb mode
4. Check Application tab → Service Workers → Status should be "activated"

### "FCM token not saved to Firestore"

**Causes:**
1. User not authenticated
2. Firestore security rules blocking write
3. Network error

**Solutions:**
1. Ensure user is logged in
2. Check Firestore rules allow users to write their own token
3. Check browser Network tab for failed requests

## Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 50+ | Full support |
| Firefox | 44+ | Full support |
| Safari | 16.4+ | macOS 13+ / iOS 16.4+ |
| Edge | 17+ | Full support |
| Opera | 37+ | Full support |

**Not Supported:**
- Internet Explorer (all versions)
- Safari < 16.4
- Mobile browsers in private/incognito mode

## Notification Payload Structure

### Background Message (Service Worker)

```typescript
{
  notification: {
    title: "📅 Appointment Reminder",
    body: "Doctor's appointment in 1 hour"
  },
  data: {
    type: "event_reminder",
    eventId: "abc123",
    reminderId: "xyz789",
    eventType: "appointment"
  }
}
```

### Foreground Message (Web App)

Same structure as background messages, handled by `NotificationService.onMessage()`.

## Best Practices

1. **Always request permission at the right time** - Don't ask on page load
2. **Explain why you need permission** - Show benefits to the user
3. **Test on multiple browsers** - Behavior varies slightly
4. **Handle permission denial gracefully** - Provide clear instructions to re-enable
5. **Clear old notifications** - Don't spam the notification tray
6. **Use meaningful titles and bodies** - Help users understand what's happening
7. **Group related notifications** - Use the `tag` property
8. **Add action buttons** - Allow users to act directly from notifications

## Cost Considerations

### Free Tier Limits

- **FCM:** Unlimited messages (free)
- **Cloud Tasks:** 1 million operations/month (free)
- **Cloud Functions:** 2 million invocations/month (free)

### Estimated Costs (After Free Tier)

Assuming 1,000 active users with 5 events/week (avg 3 reminders each):
- **Total reminders/month:** 1,000 × 5 × 4 × 3 = 60,000
- **Cloud Tasks:** $0 (well within free tier)
- **Cloud Functions:** $0 (well within free tier)
- **FCM:** $0 (always free)

**Conclusion:** Web push notifications are essentially free for most use cases.

## Production Checklist

- [ ] VAPID key generated and added to `.env.local`
- [ ] Service worker updated with real Firebase config
- [ ] Notification icons created (192x192 and 72x72)
- [ ] Cloud Functions deployed with Cloud Tasks integration
- [ ] HTTPS certificate configured (for production domain)
- [ ] Firestore security rules allow FCM token writes
- [ ] Tested on Chrome, Firefox, Safari
- [ ] Tested background notifications (app closed)
- [ ] Tested foreground notifications (app open)
- [ ] Notification action buttons working
- [ ] Error handling implemented
- [ ] Analytics tracking added (optional)

## Resources

- [Firebase Cloud Messaging Web](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)

## Support

For issues or questions:
1. Check browser console for errors
2. Review Firebase Cloud Messaging logs
3. Check Cloud Functions logs: `firebase functions:log`
4. Review this documentation
5. File an issue in the project repository
