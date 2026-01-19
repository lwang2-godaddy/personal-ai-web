'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { useAppSelector } from '@/lib/store/hooks';
import type { BehaviorOverview } from '@/lib/models/BehaviorEvent';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6'];

const PLATFORM_COLORS: Record<string, string> = {
  mobile: '#3b82f6',
  web: '#22c55e',
};

/**
 * Admin Behavior Analytics Dashboard
 * System-wide user behavior metrics and engagement analysis
 */
export default function AdminBehaviorAnalyticsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAppSelector((state) => state.auth);
  const [behaviorData, setBehaviorData] = useState<BehaviorOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    // Set default date range (last 7 days)
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(sevenDaysAgo.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    // Wait for auth to be ready before fetching
    if (startDate && endDate && !authLoading && isAuthenticated) {
      fetchBehaviorData();
    }
  }, [startDate, endDate, authLoading, isAuthenticated]);

  const fetchBehaviorData = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        startDate,
        endDate,
      });

      const data = await apiGet<BehaviorOverview>(`/api/admin/behavior?${queryParams.toString()}`);
      setBehaviorData(data);
    } catch (err: any) {
      console.error('Failed to fetch behavior data:', err);
      setError(err.message || 'Failed to load behavior analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRange = (days: number) => {
    const today = new Date();
    const pastDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(pastDate.toISOString().split('T')[0]);
  };

  const handleExportCSV = () => {
    if (!behaviorData) {
      alert('No data to export');
      return;
    }

    // Prepare CSV data from daily trend
    const headers = ['Date', 'Active Users', 'Sessions', 'Screen Views', 'Feature Uses'];
    const rows = behaviorData.dailyTrend.map((item) => [
      item.date,
      item.activeUsers,
      item.sessions,
      item.screenViews,
      item.featureUses,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `behavior-analytics-${startDate}-to-${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format duration in human-readable format
  const formatDuration = (ms: number): string => {
    if (ms < 60000) {
      return `${Math.round(ms / 1000)}s`;
    }
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    if (minutes < 60) {
      return `${minutes}m ${seconds}s`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Prepare chart data
  const dailyTrendData = behaviorData?.dailyTrend.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    activeUsers: item.activeUsers,
    sessions: item.sessions,
    screenViews: item.screenViews,
    featureUses: item.featureUses,
  })) || [];

  const platformData = behaviorData ? [
    { name: 'Mobile', users: behaviorData.platformBreakdown.mobile.users, sessions: behaviorData.platformBreakdown.mobile.sessions },
    { name: 'Web', users: behaviorData.platformBreakdown.web.users, sessions: behaviorData.platformBreakdown.web.sessions },
  ] : [];

  const topScreensData = behaviorData?.topScreens.map((item) => ({
    name: item.screen.length > 20 ? item.screen.substring(0, 20) + '...' : item.screen,
    fullName: item.screen,
    count: item.count,
    uniqueUsers: item.uniqueUsers,
  })) || [];

  const topFeaturesData = behaviorData?.topFeatures.map((item) => ({
    name: item.feature.length > 20 ? item.feature.substring(0, 20) + '...' : item.feature,
    fullName: item.feature,
    count: item.count,
    uniqueUsers: item.uniqueUsers,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Behavior Analytics</h1>
        <p className="mt-2 text-gray-600">
          User behavior metrics and engagement analysis across all platforms
        </p>
      </div>

      {/* Date Range Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Date Range</h2>
        <div className="space-y-4">
          {/* Quick Range Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickRange(7)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleQuickRange(30)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => handleQuickRange(90)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
            >
              Last 90 Days
            </button>
          </div>

          {/* Custom Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleExportCSV}
                disabled={loading || !behaviorData}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {(loading || authLoading) && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">{authLoading ? 'Checking authentication...' : 'Loading analytics...'}</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchBehaviorData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      {!loading && behaviorData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{behaviorData.activeUsers.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {behaviorData.newUsers} new users
                </p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{behaviorData.totalSessions.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {behaviorData.avgSessionsPerUser.toFixed(1)} per user
                </p>
              </div>
              <div className="text-4xl">📱</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Session Duration</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{formatDuration(behaviorData.avgSessionDurationMs)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Across all platforms
                </p>
              </div>
              <div className="text-4xl">⏱️</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Feature Uses</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{behaviorData.totalFeatureUses.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {behaviorData.totalScreenViews.toLocaleString()} screen views
                </p>
              </div>
              <div className="text-4xl">🎯</div>
            </div>
          </div>
        </div>
      )}

      {/* Platform Breakdown */}
      {!loading && behaviorData && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Platform Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Platform Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📱</span>
                  <span className="font-semibold text-blue-900">Mobile</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-blue-800">
                    <span className="font-bold text-xl">{behaviorData.platformBreakdown.mobile.users}</span> users
                  </p>
                  <p className="text-blue-600">
                    {behaviorData.platformBreakdown.mobile.sessions} sessions
                  </p>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🖥️</span>
                  <span className="font-semibold text-green-900">Web</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-green-800">
                    <span className="font-bold text-xl">{behaviorData.platformBreakdown.web.users}</span> users
                  </p>
                  <p className="text-green-600">
                    {behaviorData.platformBreakdown.web.sessions} sessions
                  </p>
                </div>
              </div>
            </div>

            {/* Platform Pie Chart */}
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(0) : '0'}%)`}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="sessions"
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PLATFORM_COLORS[entry.name.toLowerCase()] || COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `${value} sessions`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Daily Active Users Trend */}
      {!loading && dailyTrendData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Daily Activity Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="activeUsers" stroke="#3b82f6" name="Active Users" strokeWidth={2} />
              <Line yAxisId="left" type="monotone" dataKey="sessions" stroke="#22c55e" name="Sessions" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="screenViews" stroke="#f59e0b" name="Screen Views" strokeWidth={1} strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Screens and Features */}
      {!loading && behaviorData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Screens */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Top Screens</h2>
            {topScreensData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topScreensData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip
                      formatter={(value: any, name: string) => [value, name === 'count' ? 'Views' : 'Unique Users']}
                      labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullName || label}
                    />
                    <Legend />
                    <Bar dataKey="count" fill="#3b82f6" name="Views" />
                    <Bar dataKey="uniqueUsers" fill="#22c55e" name="Unique Users" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Screen</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Views</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Users</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {behaviorData.topScreens.map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-sm text-gray-900">{item.screen}</td>
                          <td className="px-3 py-2 text-sm text-gray-600 text-right">{item.count.toLocaleString()}</td>
                          <td className="px-3 py-2 text-sm text-gray-600 text-right">{item.uniqueUsers.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No screen view data available</p>
              </div>
            )}
          </div>

          {/* Top Features */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Top Features</h2>
            {topFeaturesData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topFeaturesData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip
                      formatter={(value: any, name: string) => [value, name === 'count' ? 'Uses' : 'Unique Users']}
                      labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullName || label}
                    />
                    <Legend />
                    <Bar dataKey="count" fill="#f59e0b" name="Uses" />
                    <Bar dataKey="uniqueUsers" fill="#8b5cf6" name="Unique Users" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Feature</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Uses</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Users</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {behaviorData.topFeatures.map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-sm text-gray-900">{item.feature}</td>
                          <td className="px-3 py-2 text-sm text-gray-600 text-right">{item.count.toLocaleString()}</td>
                          <td className="px-3 py-2 text-sm text-gray-600 text-right">{item.uniqueUsers.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No feature usage data available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && (!behaviorData || (behaviorData.activeUsers === 0 && behaviorData.totalSessions === 0)) && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-gray-600 text-lg">No behavior data found for the selected date range</p>
          <p className="text-gray-500 text-sm mt-2">Behavior tracking data will appear here once users start using the app</p>
        </div>
      )}

      {/* Info Section */}
      {!loading && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div className="flex-1">
              <h3 className="text-blue-800 font-semibold mb-2">About Behavior Tracking</h3>
              <ul className="text-blue-700 text-sm space-y-1">
                <li><strong>Sessions</strong> = App/page visits (new session after 30 min inactivity)</li>
                <li><strong>Screen Views</strong> = Page/screen navigation events</li>
                <li><strong>Feature Uses</strong> = Button clicks, form submissions, interactions</li>
                <li><strong>Platforms</strong> = Mobile (React Native app) vs Web (Dashboard)</li>
              </ul>
              <div className="mt-3">
                <Link
                  href="/admin/users"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  View individual user behavior →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
