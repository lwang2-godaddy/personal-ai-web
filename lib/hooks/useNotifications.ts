import { useState, useEffect, useCallback } from 'react';
import NotificationService from '@/lib/services/notifications/NotificationService';
import { MessagePayload } from 'firebase/messaging';
import { useAppSelector } from '@/lib/store/hooks';

interface UseNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  initializeNotifications: () => Promise<void>;
  testNotification: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
}

/**
 * React hook for managing web push notifications
 * Handles permission requests, FCM token management, and notification display
 *
 * @param vapidKey - Firebase VAPID key for web push (from Firebase Console)
 * @returns Notification state and control functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     isSupported,
 *     permission,
 *     requestPermission,
 *     initializeNotifications
 *   } = useNotifications(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!);
 *
 *   if (!isSupported) return <div>Notifications not supported</div>;
 *
 *   return (
 *     <button onClick={initializeNotifications}>
 *       Enable Notifications
 *     </button>
 *   );
 * }
 * ```
 */
export function useNotifications(vapidKey?: string): UseNotificationsReturn {
  const user = useAppSelector((state) => state.auth.user);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if notifications are supported
  useEffect(() => {
    const supported = NotificationService.isSupported();
    setIsSupported(supported);

    if (supported) {
      const currentPermission = NotificationService.getPermissionStatus();
      setPermission(currentPermission);

      // Check if already initialized (has FCM token)
      const token = NotificationService.getCurrentToken();
      setIsInitialized(!!token);
    }
  }, []);

  /**
   * Request notification permission from user
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Notifications are not supported in this browser');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const granted = await NotificationService.requestPermission();
      setPermission(granted ? 'granted' : 'denied');
      return granted;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request permission';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  /**
   * Initialize notifications (request permission + get FCM token + save to Firestore)
   */
  const initializeNotifications = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      setError('Notifications are not supported in this browser');
      return;
    }

    if (!user?.uid) {
      setError('User must be logged in to enable notifications');
      return;
    }

    if (!vapidKey) {
      setError('VAPID key not configured. Please add NEXT_PUBLIC_FIREBASE_VAPID_KEY to .env.local');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await NotificationService.initializeNotifications(user.uid, vapidKey);
      setPermission('granted');
      setIsInitialized(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize notifications';
      setError(errorMessage);
      console.error('Error initializing notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user?.uid, vapidKey]);

  /**
   * Test notification (for debugging)
   */
  const testNotification = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      setError('Notifications are not supported');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await NotificationService.testNotification();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send test notification';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  /**
   * Clear all active notifications
   */
  const clearAllNotifications = useCallback(async (): Promise<void> => {
    if (!isSupported) return;

    try {
      await NotificationService.clearAllNotifications();
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    isInitialized,
    isLoading,
    error,
    requestPermission,
    initializeNotifications,
    testNotification,
    clearAllNotifications,
  };
}

/**
 * Hook for listening to foreground notifications
 * Use this to handle notifications when the app is open
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useNotificationListener((payload) => {
 *     console.log('Received notification:', payload);
 *     // Show toast, update UI, etc.
 *   });
 *
 *   return <div>Listening for notifications...</div>;
 * }
 * ```
 */
export function useNotificationListener(
  onNotification: (payload: MessagePayload) => void
): void {
  useEffect(() => {
    const unsubscribe = NotificationService.onNotification(onNotification);

    return () => {
      unsubscribe();
    };
  }, [onNotification]);
}
