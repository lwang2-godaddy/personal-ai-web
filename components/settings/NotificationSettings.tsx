'use client';

import { useNotifications } from '@/lib/hooks/useNotifications';
import { useState } from 'react';

/**
 * NotificationSettings Component
 * UI for managing web push notification preferences
 */
export default function NotificationSettings() {
  const {
    isSupported,
    permission,
    isInitialized,
    isLoading,
    error,
    requestPermission,
    initializeNotifications,
    testNotification,
  } = useNotifications(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY);

  const [showTestSuccess, setShowTestSuccess] = useState(false);

  const handleEnableNotifications = async () => {
    await initializeNotifications();
  };

  const handleTestNotification = async () => {
    await testNotification();
    setShowTestSuccess(true);
    setTimeout(() => setShowTestSuccess(false), 3000);
  };

  // Browser doesn't support notifications
  if (!isSupported) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          Notifications Not Supported
        </h3>
        <p className="text-sm text-gray-600">
          Your browser doesn't support web push notifications. Please try using a modern browser
          like Chrome, Firefox, or Edge.
        </p>
      </div>
    );
  }

  // Permission denied
  if (permission === 'denied') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h3 className="mb-2 text-lg font-semibold text-red-900">
          Notifications Blocked
        </h3>
        <p className="mb-4 text-sm text-red-700">
          You have blocked notifications for this site. To enable notifications:
        </p>
        <ol className="ml-4 list-decimal space-y-1 text-sm text-red-700">
          <li>Click the lock icon in your browser's address bar</li>
          <li>Find "Notifications" in the permissions list</li>
          <li>Change the setting to "Allow"</li>
          <li>Refresh this page</li>
        </ol>
      </div>
    );
  }

  // Permission granted and initialized
  if (permission === 'granted' && isInitialized) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="mb-2 text-lg font-semibold text-green-900">
              ✅ Notifications Enabled
            </h3>
            <p className="text-sm text-green-700">
              You will receive notifications for your event reminders.
            </p>
          </div>
        </div>

        {/* Test Notification Button */}
        <div className="mt-4 space-y-3 border-t border-green-200 pt-4">
          <button
            onClick={handleTestNotification}
            disabled={isLoading}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send Test Notification'}
          </button>

          {showTestSuccess && (
            <p className="text-sm text-green-700">
              ✓ Test notification sent! Check your browser notifications.
            </p>
          )}

          <p className="text-xs text-green-600">
            Test notifications to make sure everything is working correctly.
          </p>
        </div>
      </div>
    );
  }

  // Permission prompt
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
      <h3 className="mb-2 text-lg font-semibold text-blue-900">
        Enable Event Reminders
      </h3>
      <p className="mb-4 text-sm text-blue-700">
        Get notified about upcoming events and reminders directly in your browser, even when the
        app is closed.
      </p>

      {/* Features List */}
      <ul className="mb-4 space-y-2 text-sm text-blue-700">
        <li className="flex items-start">
          <span className="mr-2">📅</span>
          <span>Receive reminders before your events</span>
        </li>
        <li className="flex items-start">
          <span className="mr-2">🔔</span>
          <span>Get notified even when the app is closed</span>
        </li>
        <li className="flex items-start">
          <span className="mr-2">⏰</span>
          <span>Customize reminder timing for each event</span>
        </li>
      </ul>

      {/* Enable Button */}
      <button
        onClick={handleEnableNotifications}
        disabled={isLoading}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Enabling...' : 'Enable Notifications'}
      </button>

      {/* Error Message */}
      {error && (
        <div className="mt-4 rounded-lg bg-red-100 p-3">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {/* Privacy Note */}
      <p className="mt-4 text-xs text-blue-600">
        Your notification preferences are stored securely and you can disable them at any time.
      </p>
    </div>
  );
}
