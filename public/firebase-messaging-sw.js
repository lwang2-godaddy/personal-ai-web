// Firebase Cloud Messaging Service Worker
// This file must be in the /public directory and served at the root

// Import Firebase scripts from CDN
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase app in the service worker
// Note: Replace these with your actual Firebase config values
firebase.initializeApp({
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
});

// Retrieve Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  // Extract notification data
  const notificationTitle = payload.notification?.title || 'Personal AI Reminder';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192x192.png', // Add your app icon
    badge: '/badge-72x72.png', // Add your badge icon
    tag: payload.data?.eventId || 'default',
    data: payload.data,
    requireInteraction: true, // Keep notification visible until user interacts
    actions: [
      {
        action: 'view',
        title: 'View Event',
      },
      {
        action: 'snooze',
        title: 'Snooze',
      },
    ],
  };

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  const action = event.action;
  const eventId = event.notification.data?.eventId;

  if (action === 'view' && eventId) {
    // Open the event in the app
    event.waitUntil(
      clients.openWindow(`/events?eventId=${eventId}`)
    );
  } else if (action === 'snooze' && eventId) {
    // Handle snooze action (would need to communicate with backend)
    console.log('Snooze action clicked for event:', eventId);
    // TODO: Implement snooze logic
  } else {
    // Default action: open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activated');
});
