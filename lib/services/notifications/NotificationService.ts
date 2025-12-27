import { getMessaging, getToken, onMessage, Messaging, MessagePayload } from 'firebase/messaging';
import { app } from '@/lib/api/firebase/config';
import FirestoreService from '@/lib/api/firebase/firestore';

/**
 * NotificationService - Web Push Notifications with FCM
 * Handles requesting notification permissions, managing FCM tokens,
 * and receiving foreground notifications
 */
export class NotificationService {
  private static instance: NotificationService;
  private messaging: Messaging | null = null;
  private currentToken: string | null = null;
  private notificationHandlers: Array<(payload: MessagePayload) => void> = [];

  private constructor() {
    // Initialize FCM only on client side
    if (typeof window !== 'undefined') {
      try {
        this.messaging = getMessaging(app);
        this.setupForegroundListener();
      } catch (error) {
        console.error('Error initializing Firebase Messaging:', error);
      }
    }
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Check if notifications are supported in this browser
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      this.messaging !== null
    );
  }

  /**
   * Get current notification permission status
   */
  getPermissionStatus(): NotificationPermission | null {
    if (!this.isSupported()) return null;
    return Notification.permission;
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('Notifications are not supported in this browser');
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw new Error('Failed to request notification permission');
    }
  }

  /**
   * Get FCM registration token
   * This token is used by the backend to send push notifications
   */
  async getRegistrationToken(vapidKey: string): Promise<string> {
    if (!this.isSupported() || !this.messaging) {
      throw new Error('Notifications are not supported');
    }

    try {
      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered:', registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Get FCM token
      const token = await getToken(this.messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        this.currentToken = token;
        console.log('FCM token obtained:', token);
        return token;
      } else {
        throw new Error('No registration token available');
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      throw new Error('Failed to get FCM registration token');
    }
  }

  /**
   * Save FCM token to Firestore for the current user
   */
  async saveFCMToken(userId: string, token: string): Promise<void> {
    try {
      await FirestoreService.updateDocument('users', userId, {
        fcmToken: token,
        fcmTokenUpdatedAt: new Date(),
        platform: 'web',
      });
      console.log('FCM token saved to Firestore');
    } catch (error) {
      console.error('Error saving FCM token:', error);
      throw new Error('Failed to save FCM token');
    }
  }

  /**
   * Initialize notifications for a user
   * Requests permission, gets token, and saves to Firestore
   */
  async initializeNotifications(userId: string, vapidKey: string): Promise<string> {
    // Check if already have permission
    const permission = this.getPermissionStatus();

    if (permission === 'denied') {
      throw new Error('Notification permission denied by user');
    }

    // Request permission if not granted
    if (permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        throw new Error('User did not grant notification permission');
      }
    }

    // Get FCM token
    const token = await this.getRegistrationToken(vapidKey);

    // Save token to Firestore
    await this.saveFCMToken(userId, token);

    return token;
  }

  /**
   * Set up listener for foreground messages
   * Background messages are handled by the service worker
   */
  private setupForegroundListener(): void {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('Foreground message received:', payload);

      // Show notification using Notification API
      if (payload.notification) {
        this.showNotification(
          payload.notification.title || 'Personal AI Reminder',
          {
            body: payload.notification.body || '',
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: payload.data?.eventId || 'default',
            data: payload.data,
          }
        );
      }

      // Call registered handlers
      this.notificationHandlers.forEach((handler) => handler(payload));
    });
  }

  /**
   * Show a browser notification
   */
  private async showNotification(title: string, options: NotificationOptions): Promise<void> {
    if (!this.isSupported()) return;

    try {
      // Check if service worker is available
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
    } catch (error) {
      console.error('Error showing notification:', error);
      // Fallback to regular Notification API
      if (Notification.permission === 'granted') {
        new Notification(title, options);
      }
    }
  }

  /**
   * Register a handler for foreground notifications
   */
  onNotification(handler: (payload: MessagePayload) => void): () => void {
    this.notificationHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.notificationHandlers.indexOf(handler);
      if (index > -1) {
        this.notificationHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Get current FCM token (cached)
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Test notification (for debugging)
   */
  async testNotification(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Notifications not supported');
    }

    await this.showNotification('Test Notification', {
      body: 'This is a test notification from Personal AI',
      icon: '/icon-192x192.png',
      tag: 'test',
    });
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    if (!this.isSupported()) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const notifications = await registration.getNotifications();
      notifications.forEach((notification) => notification.close());
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Get all active notifications
   */
  async getActiveNotifications(): Promise<Notification[]> {
    if (!this.isSupported()) return [];

    try {
      const registration = await navigator.serviceWorker.ready;
      return await registration.getNotifications();
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }
}

export default NotificationService.getInstance();
