'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { useAppSelector } from '@/lib/store/hooks';
import { CheckInCard, CheckInDetailModal } from '@/components/admin/check-ins';

// ============================================================================
// Types
// ============================================================================

interface CheckIn {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
  activity: string | null;
  activityTaggedAt: string | null;
  address: string;
  placeName: string | null;
  duration: number;
  visitCount: number;
  embeddingId: string | null;
  isManualCheckIn: boolean;
  savedPlaceId: string | null;
  note: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface UserWithCheckIns {
  id: string;
  email: string;
  displayName: string;
  checkInCount: number;
  lastCheckInAt: string | null;
}

interface CheckInsResponse {
  checkIns: CheckIn[];
  hasMore: boolean;
  totalCount: number;
}

interface UsersResponse {
  users: UserWithCheckIns[];
}

// ============================================================================
// Constants
// ============================================================================

const ACTIVITIES = [
  { value: '', label: 'All Activities' },
  { value: 'work', label: 'Work', icon: '💼' },
  { value: 'gym', label: 'Gym', icon: '🏋️' },
  { value: 'coffee', label: 'Coffee', icon: '☕' },
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'home', label: 'Home', icon: '🏠' },
  { value: 'school', label: 'School', icon: '🎓' },
  { value: 'park', label: 'Park', icon: '🌳' },
  { value: 'badminton', label: 'Badminton', icon: '🏸' },
  { value: 'tennis', label: 'Tennis', icon: '🎾' },
  { value: 'swimming', label: 'Swimming', icon: '🏊' },
  { value: 'running', label: 'Running', icon: '🏃' },
  { value: 'hiking', label: 'Hiking', icon: '🥾' },
  { value: 'yoga', label: 'Yoga', icon: '🧘' },
  { value: 'grocery', label: 'Grocery', icon: '🛒' },
  { value: 'travel', label: 'Travel', icon: '✈️' },
  { value: 'bar', label: 'Bar', icon: '🍺' },
  { value: 'library', label: 'Library', icon: '📚' },
  { value: 'hospital', label: 'Hospital', icon: '🏥' },
];

const DATE_PRESETS = [
  { value: '', label: 'All Time' },
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

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

// ============================================================================
// Main Page Component
// ============================================================================

export default function CheckInsViewerPage() {
  const { isAuthenticated, isLoading: authLoading } = useAppSelector((state) => state.auth);

  // Users data
  const [users, setUsers] = useState<UserWithCheckIns[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Check-ins data
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingCheckIns, setLoadingCheckIns] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activityFilter, setActivityFilter] = useState('');
  const [datePreset, setDatePreset] = useState('');

  // Pagination
  const [cursors, setCursors] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  // Selected check-in for detail modal
  const [selectedCheckInId, setSelectedCheckInId] = useState<string | null>(null);

  // ============================================================================
  // Fetch Users
  // ============================================================================

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const data = await apiGet<UsersResponse>('/api/admin/check-ins/users');
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
  // Fetch Check-Ins
  // ============================================================================

  const fetchCheckIns = useCallback(
    async (cursor?: string) => {
      if (!selectedUserId) return;

      try {
        setLoadingCheckIns(true);
        setError(null);

        const params = new URLSearchParams({
          userId: selectedUserId,
          limit: '20',
        });

        if (activityFilter) params.append('activity', activityFilter);

        // Calculate date range from preset
        if (datePreset) {
          const days = parseInt(datePreset, 10);
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
          params.append('startDate', startDate.toISOString());
        }

        if (cursor) params.append('startAfter', cursor);

        const data = await apiGet<CheckInsResponse>(`/api/admin/check-ins?${params.toString()}`);

        setCheckIns(data.checkIns);
        setHasMore(data.hasMore);
        setTotalCount(data.totalCount);
      } catch (err: unknown) {
        console.error('Failed to fetch check-ins:', err);
        const message = err instanceof Error ? err.message : 'Failed to load check-ins';
        setError(message);
      } finally {
        setLoadingCheckIns(false);
      }
    },
    [selectedUserId, activityFilter, datePreset]
  );

  useEffect(() => {
    if (selectedUserId) {
      setCursors([]);
      setCurrentPage(0);
      fetchCheckIns();
    }
  }, [selectedUserId, activityFilter, datePreset, fetchCheckIns]);

  // ============================================================================
  // Pagination
  // ============================================================================

  const handleNextPage = () => {
    if (checkIns.length === 0) return;
    const lastId = checkIns[checkIns.length - 1].id;
    setCursors((prev) => [...prev, lastId]);
    setCurrentPage((prev) => prev + 1);
    fetchCheckIns(lastId);
  };

  const handlePrevPage = () => {
    if (currentPage <= 0) return;
    const newCursors = cursors.slice(0, -1);
    setCursors(newCursors);
    setCurrentPage((prev) => prev - 1);
    const prevCursor = newCursors.length > 0 ? newCursors[newCursors.length - 1] : undefined;
    fetchCheckIns(prevCursor);
  };

  const handleRefresh = () => {
    fetchUsers();
    setCursors([]);
    setCurrentPage(0);
    fetchCheckIns();
  };

  // ============================================================================
  // Check-In Detail
  // ============================================================================

  const handleViewDetails = (checkInId: string) => {
    if (selectedCheckInId === checkInId) {
      setSelectedCheckInId(null);
      return;
    }
    setSelectedCheckInId(checkInId);
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

  const manualCount = checkIns.filter((c) => c.isManualCheckIn).length;
  const autoCount = checkIns.filter((c) => !c.isManualCheckIn).length;
  const indexedCount = checkIns.filter((c) => c.embeddingId).length;

  // Activity breakdown from current page
  const activityCounts: Record<string, number> = {};
  checkIns.forEach((c) => {
    const activity = c.activity || 'Unknown';
    activityCounts[activity] = (activityCounts[activity] || 0) + 1;
  });
  const topActivities = Object.entries(activityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

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
        <span className="text-gray-900 font-medium">Check-Ins</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Check-Ins Viewer</h1>
          <p className="mt-1 text-gray-600">
            Browse and analyze location check-in data from the mobile app
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loadingCheckIns || loadingUsers}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm"
        >
          {loadingCheckIns || loadingUsers ? 'Loading...' : 'Refresh'}
        </button>
      </div>

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
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                        selectedUserId === user.id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">{user.displayName}</div>
                      <div className="text-xs text-gray-500">
                        {user.email} &middot; {user.checkInCount} check-ins &middot; Last:{' '}
                        {formatRelativeTime(user.lastCheckInAt)}
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
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {loadingUsers ? (
                  <option>Loading users...</option>
                ) : users.length === 0 ? (
                  <option>No users with check-ins</option>
                ) : (
                  users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName} ({user.checkInCount} check-ins)
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
                <span className="font-medium text-gray-900">{selectedUser.checkInCount}</span>
                <span>total check-ins</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Last:</span>
                <span className="font-medium text-gray-900">
                  {formatRelativeTime(selectedUser.lastCheckInAt)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Activity */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
              Activity
            </label>
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {ACTIVITIES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.icon ? `${a.icon} ` : ''}
                  {a.label}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
        {checkIns.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-sm">
            <span className="text-gray-500">
              Showing <span className="font-medium text-gray-900">{checkIns.length}</span> of{' '}
              <span className="font-medium text-gray-900">{totalCount}</span> check-ins
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-blue-600">
              Manual: {manualCount}
            </span>
            <span className="text-gray-600">
              Auto: {autoCount}
            </span>
            <span className="text-green-600">
              Indexed: {indexedCount}
            </span>
            {topActivities.length > 0 && (
              <>
                <span className="text-gray-300">|</span>
                {topActivities.map(([activity, count]) => (
                  <span key={activity} className="text-gray-600">
                    {activity}: {count}
                  </span>
                ))}
              </>
            )}
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
      {loadingCheckIns && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* No User Selected */}
      {!selectedUserId && !loadingUsers && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">Select a user to view their check-ins</p>
        </div>
      )}

      {/* Check-Ins Grid */}
      {!loadingCheckIns && !error && selectedUserId && (
        <>
          {checkIns.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500 text-lg">No check-ins found matching the current filters.</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {checkIns.map((checkIn) => (
                <CheckInCard
                  key={checkIn.id}
                  checkIn={checkIn}
                  isSelected={selectedCheckInId === checkIn.id}
                  onViewDetails={() => handleViewDetails(checkIn.id)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {checkIns.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {currentPage + 1} &middot; Showing {checkIns.length} check-ins
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
      {selectedCheckInId && (
        <CheckInDetailModal
          checkIn={checkIns.find((c) => c.id === selectedCheckInId)!}
          onClose={() => setSelectedCheckInId(null)}
        />
      )}
    </div>
  );
}
