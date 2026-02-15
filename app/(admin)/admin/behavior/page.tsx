'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { useAppSelector } from '@/lib/store/hooks';
import type { BehaviorOverview, PostHogOverview } from '@/lib/models/BehaviorEvent';
import { useTrackPage, useTrackFeature } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS, TRACKED_FEATURES } from '@/lib/models/BehaviorEvent';
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

// Screen categories for hierarchical display - derived from TRACKED_SCREENS
const SCREEN_CATEGORIES: Record<string, { label: string; screens: string[] }> = {
  dashboard: {
    label: 'Dashboard',
    screens: [
      TRACKED_SCREENS.dashboard,
      TRACKED_SCREENS.chat,
      TRACKED_SCREENS.create,
      TRACKED_SCREENS.search,
    ],
  },
  events: {
    label: 'Events',
    screens: [
      TRACKED_SCREENS.events,
      TRACKED_SCREENS.eventsSearch,
    ],
  },
  circles: {
    label: 'Circles',
    screens: [
      TRACKED_SCREENS.circles,
      TRACKED_SCREENS.circlesCreate,
      TRACKED_SCREENS.circlesInvites,
      TRACKED_SCREENS.circleDetail,
      TRACKED_SCREENS.circleChat,
      TRACKED_SCREENS.circleMembers,
      TRACKED_SCREENS.circleChallenges,
      TRACKED_SCREENS.circleAnalytics,
    ],
  },
  settings: {
    label: 'Settings',
    screens: [
      TRACKED_SCREENS.settings,
      TRACKED_SCREENS.settingsNotifications,
      TRACKED_SCREENS.settingsQuietHours,
      TRACKED_SCREENS.settingsLifeFeed,
    ],
  },
  admin: {
    label: 'Admin',
    screens: [
      TRACKED_SCREENS.adminOverview,
      TRACKED_SCREENS.adminUsers,
      TRACKED_SCREENS.adminUserDetail,
      TRACKED_SCREENS.adminUsage,
      TRACKED_SCREENS.adminUsageTest,
      TRACKED_SCREENS.adminBehavior,
      TRACKED_SCREENS.adminSubscriptions,
      TRACKED_SCREENS.adminPricing,
      TRACKED_SCREENS.adminAiModels,
      TRACKED_SCREENS.adminPrompts,
      TRACKED_SCREENS.adminPromptDetail,
      TRACKED_SCREENS.adminVoiceCategories,
      TRACKED_SCREENS.adminAppSettings,
      TRACKED_SCREENS.adminMigrations,
      TRACKED_SCREENS.adminMigrationDetail,
      TRACKED_SCREENS.adminAskQuestions,
      TRACKED_SCREENS.adminDocs,
    ],
  },
  notifications: {
    label: 'Notifications',
    screens: [
      TRACKED_SCREENS.notificationsHistory,
    ],
  },
  auth: {
    label: 'Auth',
    screens: [
      TRACKED_SCREENS.login,
    ],
  },
  mobile: {
    label: 'Mobile Only',
    screens: [
      TRACKED_SCREENS.home,
      TRACKED_SCREENS.diary,
      TRACKED_SCREENS.diaryEditor,
      TRACKED_SCREENS.profile,
    ],
  },
};

type TabType = 'overview' | 'screens' | 'features' | 'providers';

/**
 * Admin Behavior Analytics Dashboard
 * System-wide user behavior metrics and engagement analysis
 */
export default function AdminBehaviorAnalyticsPage() {
  // Track page view
  useTrackPage(TRACKED_SCREENS.adminBehavior);
  const { trackFeature } = useTrackFeature();

  const { isAuthenticated, isLoading: authLoading } = useAppSelector((state) => state.auth);
  const [behaviorData, setBehaviorData] = useState<BehaviorOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // PostHog state
  const [posthogData, setPosthogData] = useState<PostHogOverview | null>(null);
  const [posthogLoading, setPosthogLoading] = useState(false);
  const [posthogError, setPosthogError] = useState<string | null>(null);

  // Date range states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    // Set default date range (last 7 days) but don't auto-fetch
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(sevenDaysAgo.toISOString().split('T')[0]);
  }, []);

  const fetchBehaviorData = async () => {
    if (!startDate || !endDate) return;

    trackFeature(TRACKED_FEATURES.loadAnalyticsData, { category: 'system' });
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        startDate,
        endDate,
      });

      const data = await apiGet<BehaviorOverview>(`/api/admin/behavior?${queryParams.toString()}`);
      setBehaviorData(data);
      setDataLoaded(true);
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
    setDataLoaded(false); // Reset data loaded state when date changes
    trackFeature(TRACKED_FEATURES.changeDateRange, { metadata: { days } });
  };

  const handleExportCSV = () => {
    if (!behaviorData) {
      alert('No data to export');
      return;
    }

    trackFeature(TRACKED_FEATURES.exportData, { category: 'system' });

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

  const fetchPosthogData = async () => {
    if (!startDate || !endDate) return;
    try {
      setPosthogLoading(true);
      setPosthogError(null);
      const params = new URLSearchParams({ startDate, endDate });
      const data = await apiGet<PostHogOverview>(`/api/admin/behavior/posthog?${params.toString()}`);
      setPosthogData(data);
    } catch (err: any) {
      console.error('Failed to fetch PostHog data:', err);
      setPosthogError(err.message || 'Failed to load PostHog data');
    } finally {
      setPosthogLoading(false);
    }
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

  // Group screens by category for hierarchical view
  const getScreensByCategory = () => {
    if (!behaviorData?.topScreens) return [];

    const screenMap = new Map(behaviorData.topScreens.map(s => [s.screen, s]));

    return Object.entries(SCREEN_CATEGORIES).map(([key, { label, screens }]) => {
      const categoryScreens = screens
        .map(screen => screenMap.get(screen))
        .filter(Boolean) as typeof behaviorData.topScreens;

      const totalViews = categoryScreens.reduce((sum, s) => sum + s.count, 0);
      const uniqueUsers = new Set(categoryScreens.flatMap(s => [s.uniqueUsers])).size;

      return {
        category: key,
        label,
        totalViews,
        uniqueUsers: categoryScreens.reduce((max, s) => Math.max(max, s.uniqueUsers), 0),
        screens: categoryScreens,
      };
    }).filter(cat => cat.screens.length > 0);
  };

  const categorizedScreens = getScreensByCategory();

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDataLoaded(false);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDataLoaded(false);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchBehaviorData}
                disabled={loading || !startDate || !endDate}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Loading...' : dataLoaded ? 'Refresh Data' : 'Load Analytics'}
              </button>
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

      {/* Initial State - Show before data is loaded (but not on Providers tab) */}
      {!dataLoaded && !loading && !error && activeTab !== 'providers' && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Analyze Behavior Data</h3>
          <p className="text-gray-600 mb-4">
            Select a date range and click "Load Analytics" to view user behavior metrics.
          </p>
          <p className="text-sm text-gray-500">
            This page tracks screen views, feature usage, and session data across mobile and web platforms.
          </p>
          <button
            onClick={() => {
              setActiveTab('providers');
              if (!posthogData && !posthogLoading) {
                fetchPosthogData();
              }
            }}
            className="mt-4 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm text-gray-700"
          >
            View Analytics Providers →
          </button>
        </div>
      )}

      {/* Providers Tab (accessible without loading Firestore data) */}
      {!dataLoaded && !loading && activeTab === 'providers' && (
        <div className="space-y-6">
          {/* Tab bar for navigation back */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('overview')}
                  className="px-6 py-4 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('screens')}
                  className="px-6 py-4 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                >
                  Screens
                </button>
                <button
                  onClick={() => setActiveTab('features')}
                  className="px-6 py-4 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                >
                  Features
                </button>
                <button
                  className="px-6 py-4 text-sm font-medium border-b-2 border-indigo-500 text-indigo-600"
                >
                  Providers
                </button>
              </nav>
            </div>
          </div>

          {/* Provider Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                <span className="font-semibold text-gray-900 text-sm">Firestore</span>
              </div>
              <p className="text-gray-600 text-xs mb-3">Primary source. Load data above to see Overview, Screens, and Features.</p>
              <span className="inline-block text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active</span>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span>
                <span className="font-semibold text-gray-900 text-sm">Firebase Analytics</span>
              </div>
              <p className="text-gray-600 text-xs mb-3">Funnels, retention, audiences. 24-48h data delay.</p>
              <a href="https://console.firebase.google.com/project/personalaiapp-90131/analytics" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">Open Console →</a>
            </div>
            <div className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${posthogData?.configured ? 'border-purple-500' : posthogData === null ? 'border-purple-300' : 'border-gray-300'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2.5 h-2.5 rounded-full ${posthogData?.configured ? 'bg-green-500' : posthogData === null ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'}`}></span>
                <span className="font-semibold text-gray-900 text-sm">PostHog</span>
              </div>
              <p className="text-gray-600 text-xs mb-3">Session replays, real-time events, feature flags.</p>
              {posthogData?.configured ? (
                <a href="https://us.posthog.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 text-xs font-medium">Open Dashboard →</a>
              ) : posthogData === null ? (
                <span className="inline-block text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">{posthogLoading ? 'Checking...' : 'Loading...'}</span>
              ) : (
                <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">API key not set</span>
              )}
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span>
                <span className="font-semibold text-gray-900 text-sm">Crashlytics</span>
              </div>
              <p className="text-gray-600 text-xs mb-3">Crash reports and non-fatal errors. Mobile only.</p>
              <a href="https://console.firebase.google.com/project/personalaiapp-90131/crashlytics" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-800 text-xs font-medium">Open Console →</a>
            </div>
          </div>

          {/* PostHog Loading/Error/Data */}
          {posthogLoading && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-600 text-sm">Loading PostHog data...</p>
            </div>
          )}
          {posthogError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{posthogError}</p>
              <button onClick={fetchPosthogData} className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">Retry</button>
            </div>
          )}
          {posthogData && !posthogData.configured && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">PostHog Setup Required</h3>
              <p className="text-gray-600 text-sm mb-4">To see PostHog data here, you need a Personal API Key. The project API key (phx_...) is ingestion-only.</p>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">{posthogData.setupGuide}</pre>
              </div>
            </div>
          )}
          {posthogData && posthogData.configured && !posthogLoading && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">PostHog Event Overview</h3>
                <button onClick={fetchPosthogData} className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50">Refresh</button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-sm text-purple-700">Total Events</p>
                  <p className="text-2xl font-bold text-purple-900">{posthogData.totalEvents.toLocaleString()}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-sm text-purple-700">Unique Users</p>
                  <p className="text-2xl font-bold text-purple-900">{posthogData.uniqueUsers.toLocaleString()}</p>
                </div>
              </div>
              {posthogData.topEvents.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Top Events</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unique Users</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {posthogData.topEvents.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900 font-mono">{item.event}</td>
                            <td className="px-4 py-2 text-sm text-gray-600 text-right">{item.count.toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm text-gray-600 text-right">{item.uniqueUsers.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Firebase Analytics Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Firebase Analytics (GA4)</h3>
            <p className="text-gray-600 text-sm mb-4">Funnel analysis, retention cohorts, audience segmentation. 24-48h data delay.</p>
            <div className="flex flex-wrap gap-3">
              <a href="https://console.firebase.google.com/project/personalaiapp-90131/analytics/app/overview" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">Analytics Overview →</a>
              <a href="https://console.firebase.google.com/project/personalaiapp-90131/analytics/app/events" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-4 py-2 border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 text-sm font-medium">Events →</a>
              <a href="https://console.firebase.google.com/project/personalaiapp-90131/analytics/app/retention" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-4 py-2 border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 text-sm font-medium">Retention →</a>
            </div>
          </div>

          {/* Crashlytics Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Firebase Crashlytics</h3>
            <p className="text-gray-600 text-sm mb-4">Crash-free rates, non-fatal errors from critical services, ANR events. Mobile only.</p>
            <a href="https://console.firebase.google.com/project/personalaiapp-90131/crashlytics" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm font-medium">Open Crashlytics →</a>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analytics...</p>
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

      {/* Tabs - Only show after data is loaded */}
      {dataLoaded && behaviorData && !loading && (
        <>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'overview'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('screens')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'screens'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Screens
                </button>
                <button
                  onClick={() => setActiveTab('features')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'features'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Features
                </button>
                <button
                  onClick={() => {
                    setActiveTab('providers');
                    if (!posthogData && !posthogLoading) {
                      fetchPosthogData();
                    }
                  }}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'providers'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Providers
                </button>
              </nav>
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Cards */}
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

              {/* Platform Breakdown */}
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

              {/* Daily Active Users Trend */}
              {dailyTrendData.length > 0 && (
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
            </div>
          )}

          {/* Screens Tab */}
          {activeTab === 'screens' && (
            <div className="space-y-6">
              {/* Screen Hierarchy */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Screen Hierarchy</h2>
                <p className="text-gray-600 text-sm mb-4">
                  Screens grouped by category. Click a category to see individual screen metrics.
                </p>

                <div className="space-y-4">
                  {categorizedScreens.map((category) => (
                    <div key={category.category} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-900">{category.label}</span>
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                            {category.screens.length} screens
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600">
                            <span className="font-bold text-blue-600">{category.totalViews.toLocaleString()}</span> views
                          </span>
                          <span className="text-gray-600">
                            <span className="font-bold text-green-600">{category.uniqueUsers}</span> max users
                          </span>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {category.screens.map((screen, idx) => (
                          <div key={idx} className="px-4 py-2 flex items-center justify-between hover:bg-gray-50">
                            <span className="text-gray-700 pl-4">{screen.screen}</span>
                            <div className="flex items-center gap-6 text-sm">
                              <span className="text-gray-500">
                                {screen.count.toLocaleString()} views
                              </span>
                              <span className="text-gray-500">
                                {screen.uniqueUsers} users
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Screens Chart */}
              {topScreensData.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Top Screens by Views</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topScreensData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip
                        formatter={(value: any, name?: string) => [value, name === 'count' ? 'Views' : 'Unique Users']}
                        labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullName || label}
                      />
                      <Legend />
                      <Bar dataKey="count" fill="#3b82f6" name="Views" />
                      <Bar dataKey="uniqueUsers" fill="#22c55e" name="Unique Users" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* All Screens Table */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">All Screens</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Screen</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unique Users</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Views/User</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {behaviorData.topScreens.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.screen}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.count.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.uniqueUsers.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                            {item.uniqueUsers > 0 ? (item.count / item.uniqueUsers).toFixed(1) : '0'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className="space-y-6">
              {/* Features Chart */}
              {topFeaturesData.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Top Features by Usage</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topFeaturesData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={140} />
                      <Tooltip
                        formatter={(value: any, name?: string) => [value, name === 'count' ? 'Uses' : 'Unique Users']}
                        labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullName || label}
                      />
                      <Legend />
                      <Bar dataKey="count" fill="#f59e0b" name="Uses" />
                      <Bar dataKey="uniqueUsers" fill="#8b5cf6" name="Unique Users" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Features Table */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">All Features</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Uses</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unique Users</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Uses/User</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {behaviorData.topFeatures.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.feature}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.count.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.uniqueUsers.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                            {item.uniqueUsers > 0 ? (item.count / item.uniqueUsers).toFixed(1) : '0'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {behaviorData.topFeatures.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No feature usage data available</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Providers Tab */}
          {activeTab === 'providers' && (
            <div className="space-y-6">
              {/* Provider Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Firestore */}
                <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                    <span className="font-semibold text-gray-900 text-sm">Firestore</span>
                  </div>
                  <p className="text-gray-600 text-xs mb-3">
                    Primary source. Powers Overview, Screens, and Features tabs.
                  </p>
                  <span className="inline-block text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active</span>
                </div>

                {/* Firebase Analytics */}
                <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span>
                    <span className="font-semibold text-gray-900 text-sm">Firebase Analytics</span>
                  </div>
                  <p className="text-gray-600 text-xs mb-3">
                    Funnels, retention, audiences. 24-48h data delay.
                  </p>
                  <a
                    href="https://console.firebase.google.com/project/personalaiapp-90131/analytics"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    Open Console →
                  </a>
                </div>

                {/* PostHog */}
                <div className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${posthogData?.configured ? 'border-purple-500' : posthogData === null ? 'border-purple-300' : 'border-gray-300'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${posthogData?.configured ? 'bg-green-500' : posthogData === null ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'}`}></span>
                    <span className="font-semibold text-gray-900 text-sm">PostHog</span>
                  </div>
                  <p className="text-gray-600 text-xs mb-3">
                    Session replays, real-time events, feature flags.
                  </p>
                  {posthogData?.configured ? (
                    <a
                      href="https://us.posthog.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 text-xs font-medium"
                    >
                      Open Dashboard →
                    </a>
                  ) : posthogData === null ? (
                    <span className="inline-block text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">{posthogLoading ? 'Checking...' : 'Loading...'}</span>
                  ) : (
                    <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">API key not set</span>
                  )}
                </div>

                {/* Crashlytics */}
                <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span>
                    <span className="font-semibold text-gray-900 text-sm">Crashlytics</span>
                  </div>
                  <p className="text-gray-600 text-xs mb-3">
                    Crash reports and non-fatal errors. Mobile only.
                  </p>
                  <a
                    href="https://console.firebase.google.com/project/personalaiapp-90131/crashlytics"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-800 text-xs font-medium"
                  >
                    Open Console →
                  </a>
                </div>
              </div>

              {/* PostHog Section */}
              {posthogLoading && (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-600 text-sm">Loading PostHog data...</p>
                </div>
              )}

              {posthogError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{posthogError}</p>
                  <button
                    onClick={fetchPosthogData}
                    className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Retry
                  </button>
                </div>
              )}

              {posthogData && !posthogData.configured && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">PostHog Setup Required</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    To see PostHog data here, you need to add a Personal API Key. The project API key (phx_...) is ingestion-only and cannot query data.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">{posthogData.setupGuide}</pre>
                  </div>
                </div>
              )}

              {posthogData && posthogData.configured && !posthogLoading && (
                <>
                  {/* PostHog Summary */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">PostHog Event Overview</h3>
                      <button
                        onClick={fetchPosthogData}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Refresh
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <p className="text-sm text-purple-700">Total Events</p>
                        <p className="text-2xl font-bold text-purple-900">{posthogData.totalEvents.toLocaleString()}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <p className="text-sm text-purple-700">Unique Users</p>
                        <p className="text-2xl font-bold text-purple-900">{posthogData.uniqueUsers.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Top Events Table */}
                    {posthogData.topEvents.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Top Events (custom only, excluding $pageview etc.)</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unique Users</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {posthogData.topEvents.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm text-gray-900 font-mono">{item.event}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600 text-right">{item.count.toLocaleString()}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600 text-right">{item.uniqueUsers.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PostHog Daily Trend */}
                  {posthogData.dailyTrend.length > 0 && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">PostHog Daily Events</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart
                          data={posthogData.dailyTrend.map((d) => ({
                            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            events: d.events,
                            uniqueUsers: d.uniqueUsers,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Bar yAxisId="left" dataKey="events" fill="#8b5cf6" name="Events" />
                          <Bar yAxisId="right" dataKey="uniqueUsers" fill="#a78bfa" name="Unique Users" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Data Cross-Check */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Data Cross-Check</h3>
                    <p className="text-gray-600 text-xs mb-4">
                      Compare event counts between Firestore and PostHog to verify the analytics bridge is working.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <p className="text-xs text-green-700 mb-1">Firestore Events</p>
                        <p className="text-xl font-bold text-green-900">
                          {(behaviorData.totalScreenViews + behaviorData.totalFeatureUses).toLocaleString()}
                        </p>
                        <p className="text-xs text-green-600 mt-1">screen views + feature uses</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <p className="text-xs text-purple-700 mb-1">PostHog Events</p>
                        <p className="text-xl font-bold text-purple-900">
                          {posthogData.totalEvents.toLocaleString()}
                        </p>
                        <p className="text-xs text-purple-600 mt-1">custom events (excl. $pageview)</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-xs text-gray-700 mb-1">Difference</p>
                        {(() => {
                          const firestoreTotal = behaviorData.totalScreenViews + behaviorData.totalFeatureUses;
                          const diff = posthogData.totalEvents - firestoreTotal;
                          const pct = firestoreTotal > 0 ? ((diff / firestoreTotal) * 100).toFixed(1) : '0';
                          return (
                            <>
                              <p className="text-xl font-bold text-gray-900">
                                {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">{pct}% variance</p>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <p className="text-gray-500 text-xs mt-3">
                      Note: Counts may differ because PostHog includes events not tracked in Firestore (e.g., session events), and Firestore includes session_start/session_end events not forwarded to PostHog.
                    </p>
                  </div>
                </>
              )}

              {/* Firebase Analytics Card */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Firebase Analytics (GA4)</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Firebase Analytics provides funnel analysis, retention cohorts, audience segmentation, and conversion tracking.
                  Data has a 24-48 hour delay before appearing in the console.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://console.firebase.google.com/project/personalaiapp-90131/analytics/app/overview"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                  >
                    Analytics Overview →
                  </a>
                  <a
                    href="https://console.firebase.google.com/project/personalaiapp-90131/analytics/app/events"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-4 py-2 border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 text-sm font-medium"
                  >
                    Events →
                  </a>
                  <a
                    href="https://console.firebase.google.com/project/personalaiapp-90131/analytics/app/retention"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-4 py-2 border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 text-sm font-medium"
                  >
                    Retention →
                  </a>
                </div>
              </div>

              {/* Crashlytics Card */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Firebase Crashlytics</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Crashlytics reports crash-free rates, non-fatal errors from critical services (RAG, sync, embedding),
                  and ANR (Application Not Responding) events. Mobile only — no public API for embedding data here.
                </p>
                <a
                  href="https://console.firebase.google.com/project/personalaiapp-90131/crashlytics"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm font-medium"
                >
                  Open Crashlytics →
                </a>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State - After loading but no data */}
      {dataLoaded && !loading && !error && behaviorData && behaviorData.activeUsers === 0 && behaviorData.totalSessions === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-gray-600 text-lg">No behavior data found for the selected date range</p>
          <p className="text-gray-500 text-sm mt-2">Behavior tracking data will appear here once users start using the app with tracking enabled</p>
        </div>
      )}

      {/* Info Section */}
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
              <li><strong>Bridge Pattern</strong> = Events flow to Firestore + Firebase Analytics + PostHog simultaneously</li>
              <li><strong>Crashlytics</strong> = Non-fatal errors from critical services are reported to Firebase Crashlytics (mobile only)</li>
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
    </div>
  );
}
