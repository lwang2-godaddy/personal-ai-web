'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/lib/store/hooks';
import {
  NotificationRecord,
  NotificationType,
  getNotificationTypeLabel,
  getNotificationTypeIcon,
  getStatusLabel,
  getStatusColor,
} from '@/lib/models/NotificationRecord';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

const NOTIFICATION_TYPES: { label: string; value: NotificationType | 'all' }[] = [
  { label: 'All Types', value: 'all' },
  { label: 'Event Reminders', value: 'event_reminder' },
  { label: 'Urgent Reminders', value: 'escalated_reminder' },
  { label: 'Daily Summary', value: 'daily_summary' },
  { label: 'Weekly Insights', value: 'weekly_insights' },
  { label: 'Fun Facts', value: 'fun_fact' },
  { label: 'Achievements', value: 'achievement' },
  { label: 'Location Alerts', value: 'location_alert' },
  { label: 'Pattern Reminders', value: 'pattern_reminder' },
];

const NOTIFICATION_STATUSES: { label: string; value: NotificationRecord['status'] | 'all' }[] = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Sent', value: 'sent' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Opened', value: 'opened' },
  { label: 'Suppressed', value: 'suppressed' },
  { label: 'Dismissed', value: 'dismissed' },
];

const TIME_RANGES = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'All Time', days: 0 },
];

export default function NotificationHistoryPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<NotificationType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<NotificationRecord['status'] | 'all'>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState(30); // days
  const [selectedNotification, setSelectedNotification] = useState<NotificationRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, selectedType, selectedStatus, selectedTimeRange]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Build query parameters
      const params = new URLSearchParams({
        userId: user.uid,
        limit: '100', // Fetch more for client-side pagination
      });

      if (selectedType !== 'all') {
        params.append('type', selectedType);
      }

      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }

      if (selectedTimeRange > 0) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - selectedTimeRange);
        params.append('startDate', startDate.toISOString());
      }

      const response = await fetch(`/api/notifications?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();

      // Convert date strings back to Date objects
      const processedNotifications = data.notifications.map((n: any) => ({
        ...n,
        sentAt: new Date(n.sentAt),
        scheduledFor: n.scheduledFor ? new Date(n.scheduledFor) : undefined,
        deliveredAt: n.deliveredAt ? new Date(n.deliveredAt) : undefined,
        openedAt: n.openedAt ? new Date(n.openedAt) : undefined,
        createdAt: new Date(n.createdAt),
        updatedAt: new Date(n.updatedAt),
      }));

      setNotifications(processedNotifications);
      setCurrentPage(1); // Reset to first page when filters change
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Pagination
  const totalPages = Math.ceil(notifications.length / itemsPerPage);
  const paginatedNotifications = notifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Notification History
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View all sent and suppressed notifications
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as NotificationType | 'all')}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {NOTIFICATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) =>
                setSelectedStatus(e.target.value as NotificationRecord['status'] | 'all')
              }
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {NOTIFICATION_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Range
            </label>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(parseInt(e.target.value))}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {TIME_RANGES.map((range) => (
                <option key={range.days} value={range.days}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
              No notifications found
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              Notifications will appear here once they are sent
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedNotifications.map((notification) => (
                    <tr
                      key={notification.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => setSelectedNotification(notification)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-2xl mr-2">
                            {getNotificationTypeIcon(notification.type)}
                          </span>
                          <span className="text-sm text-gray-900 dark:text-white">
                            {getNotificationTypeLabel(notification.type)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white max-w-md truncate">
                          {notification.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white"
                          style={{ backgroundColor: getStatusColor(notification.status) }}
                        >
                          {getStatusLabel(notification.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatTime(notification.sentAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNotification(notification);
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => setSelectedNotification(notification)}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">
                        {getNotificationTypeIcon(notification.type)}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {getNotificationTypeLabel(notification.type)}
                      </span>
                    </div>
                    <span
                      className="px-2 py-1 text-xs font-semibold rounded-full text-white"
                      style={{ backgroundColor: getStatusColor(notification.status) }}
                    >
                      {getStatusLabel(notification.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {notification.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(notification.sentAt)}
                  </p>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, notifications.length)} of{' '}
                  {notifications.length} notifications
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Details Modal */}
      {selectedNotification && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedNotification(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Notification Details
                </h2>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Icon and Type */}
              <div className="text-center mb-6">
                <div className="text-6xl mb-3">
                  {getNotificationTypeIcon(selectedNotification.type)}
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {getNotificationTypeLabel(selectedNotification.type)}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Title
                  </label>
                  <p className="text-gray-900 dark:text-white">{selectedNotification.title}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Message
                  </label>
                  <p className="text-gray-900 dark:text-white">{selectedNotification.body}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Status
                  </label>
                  <span
                    className="px-3 py-1 inline-flex text-sm font-semibold rounded-full text-white"
                    style={{ backgroundColor: getStatusColor(selectedNotification.status) }}
                  >
                    {getStatusLabel(selectedNotification.status)}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Category
                  </label>
                  <p className="text-gray-900 dark:text-white capitalize">
                    {selectedNotification.category}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Sent At
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {selectedNotification.sentAt.toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>

                {selectedNotification.deliveredAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Delivered At
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {selectedNotification.deliveredAt.toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                )}

                {selectedNotification.openedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Opened At
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {selectedNotification.openedAt.toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                )}

                {selectedNotification.status === 'suppressed' &&
                  selectedNotification.suppressionReason && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Suppression Reason
                      </label>
                      <p className="text-orange-600 dark:text-orange-400 font-medium">
                        {selectedNotification.suppressionReason.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                  )}

                {selectedNotification.channel && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Channel
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {selectedNotification.channel}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
