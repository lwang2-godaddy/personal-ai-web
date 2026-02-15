'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  currentMonthCost: number;
  currentMonthApiCalls: number;
}

/**
 * Admin Dashboard Overview Page
 * Displays key statistics and quick action cards
 */
export default function AdminDashboardPage() {
  // Track page view
  useTrackPage(TRACKED_SCREENS.adminOverview);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<DashboardStats>('/api/admin/stats');
      setStats(data);
    } catch (err: any) {
      console.error('Failed to fetch admin stats:', err);
      setError(err.message || 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Dashboard</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No statistics available</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Monitor system statistics and manage users
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeUsers}</p>
              <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        {/* Suspended Users */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Suspended Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.suspendedUsers}</p>
            </div>
            <div className="text-4xl">🚫</div>
          </div>
        </div>

        {/* Monthly Cost */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Month Cost</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                ${stats.currentMonthCost.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.currentMonthApiCalls.toLocaleString()} API calls
              </p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Manage Users */}
          <Link
            href="/admin/users"
            className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 hover:border-indigo-300"
          >
            <div className="flex items-center space-x-4">
              <div className="text-5xl">👥</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Users</h3>
                <p className="text-sm text-gray-600 mt-1">
                  View, search, and manage all users
                </p>
              </div>
            </div>
            <div className="mt-4 text-indigo-600 font-medium text-sm flex items-center">
              Go to Users →
            </div>
          </Link>

          {/* Usage Analytics */}
          <Link
            href="/admin/usage"
            className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 hover:border-indigo-300"
          >
            <div className="flex items-center space-x-4">
              <div className="text-5xl">📈</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Usage Analytics</h3>
                <p className="text-sm text-gray-600 mt-1">
                  View system-wide usage and costs
                </p>
              </div>
            </div>
            <div className="mt-4 text-indigo-600 font-medium text-sm flex items-center">
              View Analytics →
            </div>
          </Link>

          {/* Subscription Plans */}
          <Link
            href="/admin/subscriptions"
            className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 hover:border-indigo-300"
          >
            <div className="flex items-center space-x-4">
              <div className="text-5xl">💳</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Subscription Plans</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Configure tier quotas and features
                </p>
              </div>
            </div>
            <div className="mt-4 text-indigo-600 font-medium text-sm flex items-center">
              Manage Plans →
            </div>
          </Link>

          {/* AI Models Configuration */}
          <Link
            href="/admin/ai-models"
            className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 hover:border-indigo-300"
          >
            <div className="flex items-center space-x-4">
              <div className="text-5xl">🤖</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">AI Models</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Configure OpenAI models for services
                </p>
              </div>
            </div>
            <div className="mt-4 text-indigo-600 font-medium text-sm flex items-center">
              Configure Models →
            </div>
          </Link>
        </div>
      </div>

      {/* External Service Links */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Service Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* OpenAI Usage */}
          <a
            href="https://platform.openai.com/settings/organization/usage"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 hover:border-indigo-300"
          >
            <div className="flex items-center space-x-4">
              <div className="text-4xl">🤖</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">OpenAI Usage</h3>
                <p className="text-sm text-gray-600 mt-1">API usage & costs</p>
              </div>
              <span className="text-gray-400">↗</span>
            </div>
          </a>

          {/* Firebase Console */}
          <a
            href="https://console.firebase.google.com/project/personalaiapp-90131"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 hover:border-indigo-300"
          >
            <div className="flex items-center space-x-4">
              <div className="text-4xl">🔥</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Firebase Console</h3>
                <p className="text-sm text-gray-600 mt-1">Auth, Firestore, Functions</p>
              </div>
              <span className="text-gray-400">↗</span>
            </div>
          </a>

          {/* Pinecone Console */}
          <a
            href="https://app.pinecone.io"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 hover:border-indigo-300"
          >
            <div className="flex items-center space-x-4">
              <div className="text-4xl">🌲</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Pinecone Console</h3>
                <p className="text-sm text-gray-600 mt-1">Vector database</p>
              </div>
              <span className="text-gray-400">↗</span>
            </div>
          </a>

          {/* Vercel Dashboard */}
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 hover:border-indigo-300"
          >
            <div className="flex items-center space-x-4">
              <div className="text-4xl">▲</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Vercel Dashboard</h3>
                <p className="text-sm text-gray-600 mt-1">Deployments & analytics</p>
              </div>
              <span className="text-gray-400">↗</span>
            </div>
          </a>

          {/* Google Cloud Console */}
          <a
            href="https://console.cloud.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 hover:border-indigo-300"
          >
            <div className="flex items-center space-x-4">
              <div className="text-4xl">☁️</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Google Cloud</h3>
                <p className="text-sm text-gray-600 mt-1">Cloud services & APIs</p>
              </div>
              <span className="text-gray-400">↗</span>
            </div>
          </a>

          {/* OpenAI API Keys */}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 hover:border-indigo-300"
          >
            <div className="flex items-center space-x-4">
              <div className="text-4xl">🔑</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">OpenAI API Keys</h3>
                <p className="text-sm text-gray-600 mt-1">Manage API keys</p>
              </div>
              <span className="text-gray-400">↗</span>
            </div>
          </a>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
        <p className="text-gray-600 text-center py-8">
          Activity monitoring coming soon...
        </p>
      </div>
    </div>
  );
}
