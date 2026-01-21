'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch } from '@/lib/api/client';
import { useRef } from 'react';
import { useAppSelector } from '@/lib/store/hooks';

interface User {
  id: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'user';
  accountStatus: 'active' | 'suspended';
  subscription?: 'free' | 'premium' | 'pro';
  createdAt: string;
  lastLoginAt?: string;
  currentMonthCost?: number;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Admin Users Management Page
 * List, search, and manage all users
 */
export default function AdminUsersPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAppSelector((state) => state.auth);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [openDropdownUserId, setOpenDropdownUserId] = useState<string | null>(null);
  const [updatingSubscription, setUpdatingSubscription] = useState<string | null>(null);
  const [calculatingCosts, setCalculatingCosts] = useState(false);
  const [costsCalculated, setCostsCalculated] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Wait for auth to be ready before fetching
    if (!authLoading && isAuthenticated) {
      fetchUsers();
    }
  }, [page, searchQuery, authLoading, isAuthenticated]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });

      if (searchQuery.trim()) {
        queryParams.append('search', searchQuery.trim());
      }

      const data = await apiGet<UsersResponse>(`/api/admin/users?${queryParams.toString()}`);
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
      setCostsCalculated(false); // Reset when users change
    }
  };

  const calculateCosts = async () => {
    if (users.length === 0) return;

    try {
      setCalculatingCosts(true);
      const userIds = users.map(u => u.id);
      const data = await apiGet<{ costs: Record<string, number> }>(
        `/api/admin/users/costs?userIds=${userIds.join(',')}`
      );

      // Merge costs into users
      setUsers(prevUsers =>
        prevUsers.map(user => ({
          ...user,
          currentMonthCost: data.costs[user.id] || 0,
        }))
      );
      setCostsCalculated(true);
    } catch (err: any) {
      console.error('Failed to calculate costs:', err);
      alert(`Failed to calculate costs: ${err.message}`);
    } finally {
      setCalculatingCosts(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
    fetchUsers();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownUserId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubscriptionChange = async (userId: string, newTier: 'free' | 'premium' | 'pro') => {
    if (!confirm(`Are you sure you want to change this user's subscription to ${newTier}?`)) {
      return;
    }

    try {
      setUpdatingSubscription(userId);
      await apiPatch(`/api/admin/users/${userId}/subscription`, { tier: newTier });
      setOpenDropdownUserId(null);
      // Refresh users list
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to update subscription:', err);
      alert(`Failed to update subscription: ${err.message}`);
    } finally {
      setUpdatingSubscription(null);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: 'active' | 'suspended') => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const action = newStatus === 'suspended' ? 'suspend' : 'activate';

    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    try {
      await apiPatch(`/api/admin/users/${userId}`, { accountStatus: newStatus });
      // Refresh users list
      fetchUsers();
    } catch (err: any) {
      console.error(`Failed to ${action} user:`, err);
      alert(`Failed to ${action} user: ${err.message}`);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    return role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';
  };

  const getStatusBadgeColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getSubscriptionBadgeColor = (subscription?: string) => {
    switch (subscription) {
      case 'pro':
        return 'bg-purple-100 text-purple-800';
      case 'premium':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getCostColor = (cost: number) => {
    if (cost > 50) return 'text-red-600 font-semibold';
    if (cost > 10) return 'text-orange-600 font-medium';
    if (cost > 1) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatCost = (cost?: number) => {
    if (cost === undefined || cost === null || cost === 0) {
      return '$0.00';
    }
    return `$${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="mt-2 text-gray-600">
            Manage all users - {total.toLocaleString()} total users
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email or name..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
          >
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading || authLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">{authLoading ? 'Checking authentication...' : 'Loading users...'}</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchUsers}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600 text-lg">
              {searchQuery ? 'No users found matching your search' : 'No users found'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subscription
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <span>Cost (This Month)</span>
                        {!costsCalculated && (
                          <button
                            onClick={calculateCosts}
                            disabled={calculatingCosts}
                            className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 transition-colors"
                          >
                            {calculatingCosts ? 'Calculating...' : 'Calculate'}
                          </button>
                        )}
                        {costsCalculated && (
                          <span className="text-green-600 text-xs">✓</span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.displayName || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(user.accountStatus)}`}
                        >
                          {user.accountStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative" ref={openDropdownUserId === user.id ? dropdownRef : null}>
                          <button
                            onClick={() => setOpenDropdownUserId(openDropdownUserId === user.id ? null : user.id)}
                            disabled={updatingSubscription === user.id}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 transition-all ${getSubscriptionBadgeColor(user.subscription)} ${updatingSubscription === user.id ? 'opacity-50' : ''}`}
                          >
                            {updatingSubscription === user.id ? 'Updating...' : (user.subscription || 'free')}
                          </button>
                          {openDropdownUserId === user.id && (
                            <div className="absolute z-10 mt-1 w-32 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                              <div className="py-1">
                                {['free', 'premium', 'pro'].map((tier) => (
                                  <button
                                    key={tier}
                                    onClick={() => handleSubscriptionChange(user.id, tier as 'free' | 'premium' | 'pro')}
                                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                      user.subscription === tier || (!user.subscription && tier === 'free')
                                        ? 'bg-gray-50 font-semibold'
                                        : ''
                                    }`}
                                  >
                                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                      tier === 'pro' ? 'bg-purple-500' :
                                      tier === 'premium' ? 'bg-blue-500' : 'bg-gray-400'
                                    }`}></span>
                                    {tier}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm ${getCostColor(user.currentMonthCost || 0)}`}>
                        {formatCost(user.currentMonthCost)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="inline-block px-3 py-1 text-sm text-red-600 hover:text-red-800 font-medium"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleToggleStatus(user.id, user.accountStatus)}
                          className={`px-3 py-1 text-sm font-medium rounded ${
                            user.accountStatus === 'active'
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {user.accountStatus === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {page} of {totalPages} ({total} total users)
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
