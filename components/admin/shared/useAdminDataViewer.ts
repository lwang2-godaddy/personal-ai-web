/**
 * Custom hook that encapsulates the shared logic for admin data viewer pages:
 * - User fetching + search/filtering
 * - Cursor-based pagination
 * - Data fetching with dynamic filter params
 * - Refresh, error handling, loading states
 */

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api/client';
import { useAppSelector } from '@/lib/store/hooks';
import type { AdminUser } from './types';

interface UseAdminDataViewerOptions {
  /** API endpoint to fetch data from, e.g. '/api/admin/life-keywords' */
  endpoint: string;
  /** Key in the API response that contains the data array, e.g. 'keywords' */
  responseKey: string;
  /** Additional filter params (empty strings are omitted) */
  params?: Record<string, string>;
}

interface UseAdminDataViewerResult<T> {
  // User state
  users: AdminUser[];
  loadingUsers: boolean;
  selectedUserId: string;
  setSelectedUserId: (id: string) => void;
  userSearchQuery: string;
  setUserSearchQuery: (q: string) => void;
  filteredUsers: AdminUser[];
  selectedUser: AdminUser | undefined;

  // Data state
  data: T[];
  totalCount: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;

  // Pagination
  currentPage: number;
  handleNextPage: () => void;
  handlePrevPage: () => void;
  handleRefresh: () => void;

  // Detail selection
  selectedItemId: string | null;
  handleViewDetails: (id: string) => void;
}

export function useAdminDataViewer<T extends { id: string }>(
  options: UseAdminDataViewerOptions
): UseAdminDataViewerResult<T> {
  const { isAuthenticated, isLoading: authLoading } = useAppSelector((state) => state.auth);

  // Users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Data
  const [data, setData] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [cursors, setCursors] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  // Detail
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Serialize params for dependency tracking
  const paramsStr = JSON.stringify(options.params || {});

  // ---- Fetch Users ----
  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const resp = await apiGet<{ users: AdminUser[] }>('/api/admin/life-feed/users');
      setUsers(resp.users);
      if (resp.users.length > 0 && !selectedUserId) {
        setSelectedUserId(resp.users[0].id);
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

  // ---- Fetch Data ----
  const fetchData = useCallback(
    async (cursor?: string) => {
      if (!selectedUserId) return;

      try {
        setLoading(true);
        setError(null);

        const urlParams = new URLSearchParams({
          userId: selectedUserId,
          limit: '20',
        });

        // Apply filter params (skip empty values)
        const filterParams: Record<string, string> = JSON.parse(paramsStr);
        Object.entries(filterParams).forEach(([key, value]) => {
          if (value) urlParams.append(key, value);
        });

        if (cursor) urlParams.append('startAfter', cursor);

        const resp = await apiGet<Record<string, unknown>>(
          `${options.endpoint}?${urlParams.toString()}`
        );

        setData(resp[options.responseKey] as T[]);
        setHasMore(resp.hasMore as boolean);
        setTotalCount(resp.totalCount as number);
      } catch (err: unknown) {
        console.error(`Failed to fetch data from ${options.endpoint}:`, err);
        const message = err instanceof Error ? err.message : 'Failed to load data';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [selectedUserId, paramsStr, options.endpoint, options.responseKey]
  );

  // Reset pagination and refetch when filters/user change
  useEffect(() => {
    if (selectedUserId) {
      setCursors([]);
      setCurrentPage(0);
      fetchData();
    }
  }, [selectedUserId, fetchData]);

  // ---- Pagination handlers ----
  const handleNextPage = useCallback(() => {
    if (data.length === 0) return;
    const lastId = data[data.length - 1].id;
    setCursors((prev) => [...prev, lastId]);
    setCurrentPage((prev) => prev + 1);
    fetchData(lastId);
  }, [data, fetchData]);

  const handlePrevPage = useCallback(() => {
    if (currentPage <= 0) return;
    const newCursors = cursors.slice(0, -1);
    setCursors(newCursors);
    setCurrentPage((prev) => prev - 1);
    const prevCursor = newCursors.length > 0 ? newCursors[newCursors.length - 1] : undefined;
    fetchData(prevCursor);
  }, [currentPage, cursors, fetchData]);

  const handleRefresh = useCallback(() => {
    fetchUsers();
    setCursors([]);
    setCurrentPage(0);
    fetchData();
  }, [fetchUsers, fetchData]);

  // ---- Detail toggle ----
  const handleViewDetails = useCallback(
    (id: string) => {
      setSelectedItemId(selectedItemId === id ? null : id);
    },
    [selectedItemId]
  );

  // ---- Derived state ----
  const filteredUsers = users.filter(
    (user) =>
      user.displayName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return {
    users,
    loadingUsers,
    selectedUserId,
    setSelectedUserId,
    userSearchQuery,
    setUserSearchQuery,
    filteredUsers,
    selectedUser,
    data,
    totalCount,
    hasMore,
    loading,
    error,
    currentPage,
    handleNextPage,
    handlePrevPage,
    handleRefresh,
    selectedItemId,
    handleViewDetails,
  };
}
