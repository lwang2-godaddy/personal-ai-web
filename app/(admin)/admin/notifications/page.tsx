'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { useAppSelector } from '@/lib/store/hooks';

// ============================================================================
// Types
// ============================================================================

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  data: Record<string, unknown> | null;
  createdAt: string | null;
}

interface UserWithNotifications {
  id: string;
  email: string;
  displayName: string;
  notificationCount: number;
  lastNotificationAt: string | null;
}

interface NotificationsResponse {
  notifications: Notification[];
  hasMore: boolean;
  totalCount: number;
}

interface UsersResponse {
  users: UserWithNotifications[];
}

// ============================================================================
// Constants
// ============================================================================

const NOTIFICATION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'content_comment', label: 'Comment', color: 'bg-blue-100 text-blue-800' },
  { value: 'content_like', label: 'Like', color: 'bg-red-100 text-red-800' },
  { value: 'life_feed_like', label: 'Life Feed Like', color: 'bg-pink-100 text-pink-800' },
  { value: 'life_feed_comment', label: 'Life Feed Comment', color: 'bg-purple-100 text-purple-800' },
  { value: 'circle_member_joined', label: 'Circle Join', color: 'bg-green-100 text-green-800' },
  { value: 'daily_summary', label: 'Daily Summary', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'weekly_insights', label: 'Weekly Insights', color: 'bg-teal-100 text-teal-800' },
  { value: 'fun_fact', label: 'Fun Fact', color: 'bg-amber-100 text-amber-800' },
  { value: 'achievement', label: 'Achievement', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'check_in_suggestion', label: 'Check-In', color: 'bg-cyan-100 text-cyan-800' },
];

const READ_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'read', label: 'Read' },
  { value: 'unread', label: 'Unread' },
];

const DATE_PRESETS = [
  { value: '', label: 'All Time' },
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

function getTypeBadgeColor(type: string): string {
  const found = NOTIFICATION_TYPES.find((t) => t.value === type);
  return found?.color || 'bg-gray-100 text-gray-800';
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

// ============================================================================
// Notification Detail Modal
// ============================================================================

function NotificationDetailModal({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Notification Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Type */}
          <div>
            <p className="text-sm font-medium text-gray-500">Type</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(notification.type)}`}>
              {notification.type}
            </span>
          </div>

          {/* Title */}
          <div>
            <p className="text-sm font-medium text-gray-500">Title</p>
            <p className="text-gray-900">{notification.title || '(no title)'}</p>
          </div>

          {/* Body */}
          <div>
            <p className="text-sm font-medium text-gray-500">Body</p>
            <p className="text-gray-900 whitespace-pre-wrap">{notification.body || '(no body)'}</p>
          </div>

          {/* Read Status */}
          <div>
            <p className="text-sm font-medium text-gray-500">Read Status</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              notification.read
                ? 'bg-green-100 text-green-800'
                : 'bg-orange-100 text-orange-800'
            }`}>
              {notification.read ? 'Read' : 'Unread'}
            </span>
          </div>

          {/* Created At */}
          <div>
            <p className="text-sm font-medium text-gray-500">Created At</p>
            <p className="text-gray-900">{formatDateTime(notification.createdAt)}</p>
          </div>

          {/* Document ID */}
          <div>
            <p className="text-sm font-medium text-gray-500">Document ID</p>
            <code className="text-sm bg-gray-100 px-2 py-1 rounded">{notification.id}</code>
          </div>

          {/* Data Object */}
          {notification.data && Object.keys(notification.data).length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Data</p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {Object.entries(notification.data).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2">
                    <code className="text-xs bg-gray-200 px-1.5 py-0.5 rounded font-medium text-gray-700 shrink-0">
                      {key}
                    </code>
                    <span className="text-sm text-gray-900 break-all">
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Documentation Section (Collapsible)
// ============================================================================

function NotificationDocs() {
  return (
    <details className="bg-white rounded-lg shadow-sm border border-gray-200">
      <summary className="px-6 py-4 cursor-pointer select-none hover:bg-gray-50">
        <span className="text-lg font-semibold text-gray-900">
          Notification System Documentation
        </span>
        <span className="ml-2 text-sm text-gray-500">(click to expand)</span>
      </summary>
      <div className="px-6 pb-6 border-t border-gray-200 pt-4 space-y-6">
        {/* Architecture Diagram */}
        <div>
          <h3 className="text-md font-semibold text-gray-800 mb-2">Architecture</h3>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <pre className="text-gray-700">{`
Trigger (Schedule/Firestore) --> Cloud Function --> Push Notification (FCM/APNs)
                                      |
                                      v
                              Content Source (Insights System)
                              /         |           \\
                     Fun Facts    Life Feed     Event System
                         |            |              |
                     AI Prompts   AI Prompts    User Events
            `}</pre>
          </div>
        </div>

        {/* Notification Types Reference */}
        <div>
          <h3 className="text-md font-semibold text-gray-800 mb-2">Notification Types</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Trigger</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Function</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[
                  { type: 'daily_summary', trigger: 'Scheduled', channel: 'daily_summaries', fn: 'sendDailySummary' },
                  { type: 'weekly_insights', trigger: 'Scheduled', channel: 'insights', fn: 'sendWeeklyInsights' },
                  { type: 'fun_fact', trigger: 'Scheduled', channel: 'fun_facts', fn: 'sendDailyFunFact' },
                  { type: 'achievement', trigger: 'Firestore', channel: 'insights', fn: 'checkAchievements' },
                  { type: 'event_reminder', trigger: 'Scheduled', channel: 'event_reminders', fn: 'eventNotificationScheduler' },
                  { type: 'pattern_reminder', trigger: 'Scheduled', channel: 'pattern_reminders', fn: 'schedulePatternNotifications' },
                  { type: 'content_comment', trigger: 'Realtime', channel: 'social', fn: 'onCommentCreated' },
                  { type: 'content_like', trigger: 'Realtime', channel: 'social', fn: 'onLikeCreated' },
                  { type: 'circle_member_joined', trigger: 'Realtime', channel: 'social', fn: 'onCircleMemberJoined' },
                ].map((row) => (
                  <tr key={row.type} className="hover:bg-gray-50">
                    <td className="px-4 py-2"><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{row.type}</code></td>
                    <td className="px-4 py-2 text-gray-600">{row.trigger}</td>
                    <td className="px-4 py-2"><code className="text-xs">{row.channel}</code></td>
                    <td className="px-4 py-2"><code className="text-xs">{row.fn}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Android Channels */}
        <div>
          <h3 className="text-md font-semibold text-gray-800 mb-2">Android Channels</h3>
          <div className="flex flex-wrap gap-2">
            {['reminders', 'important_events', 'daily_summaries', 'insights', 'fun_facts', 'pattern_reminders', 'event_reminders', 'social', 'location', 'health', 'general'].map((ch) => (
              <code key={ch} className="bg-gray-100 px-2 py-1 rounded text-xs">{ch}</code>
            ))}
          </div>
        </div>

        {/* Testing */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-md font-semibold text-yellow-900 mb-1">Testing Notifications</h3>
          <div className="bg-gray-800 text-green-400 text-sm p-3 rounded font-mono overflow-x-auto">
            <p>cd PersonalAIApp/firebase/functions</p>
            <p>firebase functions:shell</p>
            <p className="mt-1">{`testFunFactNotification({"data": {"userId": "USER_ID"}})`}</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <a href="/admin/insights" className="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <div>
              <p className="font-medium text-blue-900 text-sm">Insights Config</p>
              <p className="text-xs text-blue-700">Configure AI features</p>
            </div>
          </a>
          <a href="/admin/prompts" className="flex items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
            <div>
              <p className="font-medium text-purple-900 text-sm">Prompt Editor</p>
              <p className="text-xs text-purple-700">Edit AI content</p>
            </div>
          </a>
          <a href="/admin/behavior" className="flex items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <div>
              <p className="font-medium text-green-900 text-sm">Behavior Analytics</p>
              <p className="text-xs text-green-700">Notification engagement</p>
            </div>
          </a>
        </div>
      </div>
    </details>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function NotificationsViewerPage() {
  const { isAuthenticated, isLoading: authLoading } = useAppSelector((state) => state.auth);

  // Users data
  const [users, setUsers] = useState<UserWithNotifications[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Notifications data
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [readStatus, setReadStatus] = useState('all');
  const [datePreset, setDatePreset] = useState('');

  // Pagination
  const [cursors, setCursors] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  // Selected notification for detail modal
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  // ============================================================================
  // Fetch Users
  // ============================================================================

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const data = await apiGet<UsersResponse>('/api/admin/notifications/users');
      setUsers(data.users);
      // Auto-select first user if none selected
      if (data.users.length > 0 && !selectedUserId) {
        setSelectedUserId(data.users[0].id);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchUsers();
    }
  }, [authLoading, isAuthenticated, fetchUsers]);

  // ============================================================================
  // Fetch Notifications
  // ============================================================================

  const fetchNotifications = useCallback(
    async (cursor?: string) => {
      if (!selectedUserId) return;

      try {
        setLoadingNotifications(true);
        setError(null);

        const params = new URLSearchParams({
          userId: selectedUserId,
          limit: '20',
        });

        if (typeFilter) params.append('type', typeFilter);
        if (readStatus !== 'all') params.append('readStatus', readStatus);

        // Calculate date range from preset
        if (datePreset) {
          const days = parseInt(datePreset, 10);
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
          params.append('startDate', startDate.toISOString());
        }

        if (cursor) params.append('startAfter', cursor);

        const data = await apiGet<NotificationsResponse>(
          `/api/admin/notifications?${params.toString()}`
        );

        setNotifications(data.notifications);
        setHasMore(data.hasMore);
        setTotalCount(data.totalCount);
      } catch (err: unknown) {
        console.error('Failed to fetch notifications:', err);
        const message = err instanceof Error ? err.message : 'Failed to load notifications';
        setError(message);
      } finally {
        setLoadingNotifications(false);
      }
    },
    [selectedUserId, typeFilter, readStatus, datePreset]
  );

  useEffect(() => {
    if (selectedUserId) {
      setCursors([]);
      setCurrentPage(0);
      fetchNotifications();
    }
  }, [selectedUserId, typeFilter, readStatus, datePreset, fetchNotifications]);

  // ============================================================================
  // Pagination
  // ============================================================================

  const handleNextPage = () => {
    if (notifications.length === 0) return;
    const lastId = notifications[notifications.length - 1].id;
    setCursors((prev) => [...prev, lastId]);
    setCurrentPage((prev) => prev + 1);
    fetchNotifications(lastId);
  };

  const handlePrevPage = () => {
    if (currentPage <= 0) return;
    const newCursors = cursors.slice(0, -1);
    setCursors(newCursors);
    setCurrentPage((prev) => prev - 1);
    const prevCursor = newCursors.length > 0 ? newCursors[newCursors.length - 1] : undefined;
    fetchNotifications(prevCursor);
  };

  const handleRefresh = () => {
    fetchUsers();
    setCursors([]);
    setCurrentPage(0);
    fetchNotifications();
  };

  // ============================================================================
  // Filtered Users for Dropdown
  // ============================================================================

  const filteredUsers = users.filter(
    (user) =>
      user.displayName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const selectedUser = users.find((u) => u.id === selectedUserId);

  // ============================================================================
  // Calculate Stats
  // ============================================================================

  const readCount = notifications.filter((n) => n.read).length;
  const unreadCount = notifications.filter((n) => !n.read).length;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm text-gray-500">
        <Link href="/admin" className="hover:text-gray-700">
          Admin
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">Notifications</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notification Viewer</h1>
          <p className="mt-1 text-gray-600">
            Browse notification data per user from Firestore
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loadingNotifications || loadingUsers}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
        >
          {loadingNotifications || loadingUsers ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Collapsible Documentation */}
      <NotificationDocs />

      {/* User Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* User Search/Select */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
              Select User
            </label>
            <div className="relative">
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              {userSearchQuery && filteredUsers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setUserSearchQuery('');
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                        selectedUserId === user.id ? 'bg-red-50' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">{user.displayName}</div>
                      <div className="text-xs text-gray-500">
                        {user.email} &middot; {user.notificationCount} notifications &middot; Last:{' '}
                        {formatRelativeTime(user.lastNotificationAt)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {!userSearchQuery && (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={loadingUsers}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                {loadingUsers ? (
                  <option>Loading users...</option>
                ) : users.length === 0 ? (
                  <option>No users with notifications</option>
                ) : (
                  users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName} ({user.notificationCount} notifications)
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* User Stats */}
          {selectedUser && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <span className="font-medium text-gray-900">{selectedUser.notificationCount}</span>
                <span>total</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Last:</span>
                <span className="font-medium text-gray-900">
                  {formatRelativeTime(selectedUser.lastNotificationAt)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Notification Type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {NOTIFICATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Read Status */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
              Read Status
            </label>
            <select
              value={readStatus}
              onChange={(e) => setReadStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {READ_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
              Date Range
            </label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Stats */}
        {notifications.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-sm">
            <span className="text-gray-500">
              Showing <span className="font-medium text-gray-900">{notifications.length}</span> of{' '}
              <span className="font-medium text-gray-900">{totalCount}</span> notifications
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-green-600">
              {readCount} Read
            </span>
            <span className="text-orange-600">
              {unreadCount} Unread
            </span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loadingNotifications && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* No User Selected */}
      {!selectedUserId && !loadingUsers && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">Select a user to view their notifications</p>
        </div>
      )}

      {/* Notification List */}
      {!loadingNotifications && !error && selectedUserId && (
        <>
          {notifications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500 text-lg">No notifications found matching the current filters.</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => setSelectedNotification(notif)}
                  className="w-full text-left bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:border-red-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Type badge + read indicator */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(notif.type)}`}>
                          {notif.type}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${
                          notif.read
                            ? 'bg-green-50 text-green-700'
                            : 'bg-orange-50 text-orange-700 font-medium'
                        }`}>
                          {notif.read ? 'Read' : 'Unread'}
                        </span>
                      </div>

                      {/* Title */}
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notif.title || '(no title)'}
                      </p>

                      {/* Body preview */}
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                        {notif.body || '(no body)'}
                      </p>
                    </div>

                    {/* Relative time */}
                    <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {currentPage + 1} &middot; Showing {notifications.length} notifications
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 0}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={!hasMore}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedNotification && (
        <NotificationDetailModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
        />
      )}
    </div>
  );
}
