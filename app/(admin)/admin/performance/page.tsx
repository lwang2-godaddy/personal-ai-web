'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiDelete } from '@/lib/api/client';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';
import type {
  PerformanceOverview,
  DailyPerformanceAggregate,
  PerformanceMetric,
  PerformanceMetricType,
} from '@/lib/models/PerformanceMetric';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Tab types
type TabType = 'overview' | 'transitions' | 'scroll' | 'api' | 'renders' | 'raw';

const TAB_LABELS: Record<TabType, string> = {
  overview: 'Overview',
  transitions: 'Transitions',
  scroll: 'Scroll FPS',
  api: 'API Latency',
  renders: 'Slow Renders',
  raw: 'Raw Data',
};

// Colors
const COLORS = {
  startup: '#3b82f6',
  fps: '#22c55e',
  transition: '#f59e0b',
  api: '#8b5cf6',
  render: '#ef4444',
  grid: '#e5e7eb',
};

export default function PerformanceDashboardPage() {
  useTrackPage(TRACKED_SCREENS.adminPerformance);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PerformanceOverview | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [userIdFilter, setUserIdFilter] = useState<string>('');
  const [rawMetricType, setRawMetricType] = useState<string>('');
  const [backfillDate, setBackfillDate] = useState('');
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [purgeAge, setPurgeAge] = useState<number>(90);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  // Set default date range
  useEffect(() => {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(sevenDaysAgo.toISOString().split('T')[0]);
  }, []);

  // Fetch distinct user IDs for the dropdown
  const fetchUsers = async (start: string, end: string) => {
    try {
      setUsersLoading(true);
      const params = new URLSearchParams({ startDate: start, endDate: end, mode: 'users' });
      const result = await apiGet<{ userIds: string[] }>(
        `/api/admin/performance?${params.toString()}`
      );
      setAvailableUsers(result.userIds || []);
    } catch {
      setAvailableUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch users when dates are set initially
  useEffect(() => {
    if (startDate && endDate) {
      fetchUsers(startDate, endDate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const handleQuickRange = (days: number) => {
    const today = new Date();
    const start = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
    setDataLoaded(false);
  };

  const fetchData = async () => {
    if (!startDate || !endDate) return;
    try {
      setLoading(true);
      setError(null);

      const mode = activeTab === 'raw' ? 'raw' : 'aggregated';
      const params = new URLSearchParams({ startDate, endDate, mode });
      if (mode === 'raw' && rawMetricType) {
        params.set('metricType', rawMetricType);
      }
      if (userIdFilter.trim()) {
        params.set('userId', userIdFilter.trim());
      }

      const result = await apiGet<PerformanceOverview>(
        `/api/admin/performance?${params.toString()}`
      );
      setData(result);
      setDataLoaded(true);
    } catch (err: any) {
      console.error('Failed to fetch performance data:', err);
      setError(err.message || 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleBackfill = async () => {
    if (!backfillDate) return;
    try {
      setBackfillLoading(true);
      const result = await apiPost<{ success: boolean; message: string }>(
        '/api/admin/performance',
        { date: backfillDate }
      );
      alert(result.message);
      fetchData();
    } catch (err: any) {
      alert(`Backfill failed: ${err.message}`);
    } finally {
      setBackfillLoading(false);
    }
  };

  const handlePurge = async () => {
    if (!purgeAge || purgeAge < 1) return;
    const cutoff = new Date(Date.now() - purgeAge * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    if (!confirm(`Delete all raw performance metrics older than ${purgeAge} days (before ${cutoff})?\n\nAggregates will be preserved. This cannot be undone.`)) {
      return;
    }
    try {
      setPurgeLoading(true);
      setPurgeResult(null);
      const result = await apiDelete<{ success: boolean; message: string; deleted: number }>(
        '/api/admin/performance',
        { olderThanDays: purgeAge }
      );
      setPurgeResult(result.message);
    } catch (err: any) {
      setPurgeResult(`Purge failed: ${err.message}`);
    } finally {
      setPurgeLoading(false);
    }
  };

  // Computed data helpers
  const aggregates = data?.aggregates || [];
  const rawMetrics = data?.rawMetrics || [];

  const latestAggregate = aggregates.length > 0 ? aggregates[aggregates.length - 1] : null;

  // Startup trend data
  const startupTrendData = aggregates
    .filter(a => a.startup)
    .map(a => ({
      date: new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      avgMs: a.startup!.avgMs,
      p50Ms: a.startup!.p50Ms,
      p95Ms: a.startup!.p95Ms,
    }));

  // JS FPS trend data
  const fpsTrendData = aggregates
    .filter(a => a.jsThreadFps)
    .map(a => ({
      date: new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      avgFps: a.jsThreadFps!.avgFps,
      minFps: a.jsThreadFps!.minFps,
    }));

  // Aggregate transitions across all days
  const allTransitions: Record<string, { count: number; totalMs: number; values: number[] }> = {};
  aggregates.forEach(a => {
    Object.entries(a.screenTransitions).forEach(([screen, t]) => {
      if (!allTransitions[screen]) allTransitions[screen] = { count: 0, totalMs: 0, values: [] };
      allTransitions[screen].count += t.count;
      allTransitions[screen].totalMs += t.avgMs * t.count;
      allTransitions[screen].values.push(t.avgMs);
    });
  });
  const transitionData = Object.entries(allTransitions)
    .map(([screen, d]) => ({
      screen,
      avgMs: Math.round(d.totalMs / d.count),
      count: d.count,
    }))
    .sort((a, b) => b.avgMs - a.avgMs);

  // Aggregate scroll FPS
  const allScrollFps: Record<string, { count: number; totalFps: number; minFps: number; totalDropped: number }> = {};
  aggregates.forEach(a => {
    Object.entries(a.scrollFps).forEach(([screen, s]) => {
      if (!allScrollFps[screen]) allScrollFps[screen] = { count: 0, totalFps: 0, minFps: 999, totalDropped: 0 };
      allScrollFps[screen].count += s.count;
      allScrollFps[screen].totalFps += s.avgFps * s.count;
      allScrollFps[screen].minFps = Math.min(allScrollFps[screen].minFps, s.minFps);
      allScrollFps[screen].totalDropped += s.avgDroppedFrames * s.count;
    });
  });
  const scrollFpsData = Object.entries(allScrollFps)
    .map(([screen, d]) => ({
      screen,
      avgFps: Math.round(d.totalFps / d.count),
      minFps: d.minFps === 999 ? 0 : d.minFps,
      avgDropped: Math.round(d.totalDropped / d.count),
      count: d.count,
    }))
    .sort((a, b) => a.avgFps - b.avgFps);

  // Aggregate API latency
  const allApiLatency: Record<string, { count: number; totalMs: number; errors: number }> = {};
  aggregates.forEach(a => {
    Object.entries(a.apiLatency).forEach(([endpoint, l]) => {
      if (!allApiLatency[endpoint]) allApiLatency[endpoint] = { count: 0, totalMs: 0, errors: 0 };
      allApiLatency[endpoint].count += l.count;
      allApiLatency[endpoint].totalMs += l.avgMs * l.count;
      allApiLatency[endpoint].errors += l.errorCount;
    });
  });
  const apiLatencyData = Object.entries(allApiLatency)
    .map(([endpoint, d]) => ({
      endpoint,
      avgMs: Math.round(d.totalMs / d.count),
      count: d.count,
      errors: d.errors,
    }))
    .sort((a, b) => b.avgMs - a.avgMs);

  // Aggregate slow renders
  const allRenders: Record<string, { count: number; totalMs: number; maxMs: number; screenName: string }> = {};
  aggregates.forEach(a => {
    a.slowRenders.forEach(r => {
      const key = `${r.componentName}:${r.screenName}`;
      if (!allRenders[key]) allRenders[key] = { count: 0, totalMs: 0, maxMs: 0, screenName: r.screenName };
      allRenders[key].count += r.count;
      allRenders[key].totalMs += r.avgDurationMs * r.count;
      allRenders[key].maxMs = Math.max(allRenders[key].maxMs, r.maxDurationMs);
    });
  });
  const slowRenderData = Object.entries(allRenders)
    .map(([key, d]) => {
      const [componentName, screenName] = key.split(':');
      return {
        componentName,
        screenName,
        count: d.count,
        avgMs: Math.round(d.totalMs / d.count),
        maxMs: d.maxMs,
      };
    })
    .sort((a, b) => b.avgMs - a.avgMs);

  // Total metrics across period
  const totalMetrics = aggregates.reduce((s, a) => s + a.totalMetrics, 0);
  const totalUniqueUsers = aggregates.reduce((max, a) => Math.max(max, a.uniqueUsers), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Monitoring</h1>
          <p className="text-sm text-gray-500 mt-1">
            App startup, FPS, screen transitions, API latency, and render performance
          </p>
          {userIdFilter.trim() && dataLoaded && (
            <p className="text-xs text-orange-600 mt-1 font-medium">
              Filtered by user: <span className="font-mono">{userIdFilter.trim()}</span>
              {userIdFilter.startsWith('e2e-perf-') ? ' (test data)' : ' (real data)'}
              {' — '}aggregated on-the-fly from raw metrics
            </p>
          )}
        </div>
      </div>

      {/* Date Range Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* Quick buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleQuickRange(1)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Today
            </button>
            <button
              onClick={() => handleQuickRange(7)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              7 Days
            </button>
            <button
              onClick={() => handleQuickRange(30)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              30 Days
            </button>
          </div>

          {/* Custom date pickers */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setDataLoaded(false); }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setDataLoaded(false); }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          {/* User ID filter */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">User {usersLoading ? '(loading...)' : `(${availableUsers.length} found)`}</label>
            <select
              value={userIdFilter}
              onChange={(e) => { setUserIdFilter(e.target.value); setDataLoaded(false); }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm w-56"
            >
              <option value="">All users</option>
              {availableUsers.map((uid) => (
                <option key={uid} value={uid}>
                  {uid.startsWith('e2e-perf-') ? `${uid} (test)` : uid.length > 20 ? `${uid.slice(0, 8)}...${uid.slice(-8)}` : uid}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchData}
            disabled={loading || !startDate || !endDate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {loading ? 'Loading...' : 'Load Data'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px overflow-x-auto">
          {(Object.keys(TAB_LABELS) as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setDataLoaded(false); }}
              className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </nav>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading performance data...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm">
            Retry
          </button>
        </div>
      )}

      {/* Pre-load State */}
      {!dataLoaded && !loading && !error && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">⚡</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Analyze Performance</h3>
          <p className="text-gray-600 mb-4">Select a date range and click &quot;Load Data&quot; to view performance metrics.</p>
          <p className="text-gray-500 text-sm">
            No data yet?{' '}
            <a href="/admin/testing" className="text-blue-600 hover:text-blue-800 underline font-medium">
              Seed synthetic performance data
            </a>
            {' '}from the Testing page to verify the dashboard end-to-end.
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/* OVERVIEW TAB */}
      {/* ============================================================ */}
      {dataLoaded && !loading && !error && activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Startup Time */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <p className="text-sm font-medium text-gray-600">Avg Startup</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {latestAggregate?.startup ? `${latestAggregate.startup.avgMs}ms` : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {latestAggregate?.startup ? `p95: ${latestAggregate.startup.p95Ms}ms` : 'No data'}
              </p>
            </div>

            {/* JS Thread FPS */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <p className="text-sm font-medium text-gray-600">JS Thread FPS</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {latestAggregate?.jsThreadFps ? `${latestAggregate.jsThreadFps.avgFps}` : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {latestAggregate?.jsThreadFps ? `min: ${latestAggregate.jsThreadFps.minFps}` : 'No data'}
              </p>
            </div>

            {/* Transitions */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
              <p className="text-sm font-medium text-gray-600">Screen Transitions</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {transitionData.length > 0
                  ? `${Math.round(transitionData.reduce((s, t) => s + t.avgMs * t.count, 0) / transitionData.reduce((s, t) => s + t.count, 0))}ms`
                  : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">avg across all screens</p>
            </div>

            {/* Total Metrics */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
              <p className="text-sm font-medium text-gray-600">Total Metrics</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalMetrics.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{totalUniqueUsers} unique users</p>
            </div>
          </div>

          {/* Startup Trend Chart */}
          {startupTrendData.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Startup Time Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={startupTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                  <XAxis dataKey="date" />
                  <YAxis unit="ms" />
                  <Tooltip formatter={(value: any) => `${value}ms`} />
                  <Legend />
                  <Line type="monotone" dataKey="avgMs" stroke={COLORS.startup} name="Average" strokeWidth={2} />
                  <Line type="monotone" dataKey="p50Ms" stroke="#60a5fa" name="p50" strokeWidth={1} strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="p95Ms" stroke="#ef4444" name="p95" strokeWidth={1} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* JS Thread FPS Trend */}
          {fpsTrendData.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">JS Thread FPS Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={fpsTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 65]} />
                  <Tooltip formatter={(value: any) => `${value} fps`} />
                  <Legend />
                  <Line type="monotone" dataKey="avgFps" stroke={COLORS.fps} name="Avg FPS" strokeWidth={2} />
                  <Line type="monotone" dataKey="minFps" stroke="#ef4444" name="Min FPS" strokeWidth={1} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Empty overview */}
          {aggregates.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-gray-600 text-lg">No aggregated data found for this date range</p>
              <p className="text-gray-500 text-sm mt-2">Performance data will appear after the daily aggregation runs (2 AM UTC) or you trigger a manual backfill below.</p>
              <p className="text-gray-500 text-sm mt-3">
                Need test data?{' '}
                <a href="/admin/testing" className="text-blue-600 hover:text-blue-800 underline font-medium">
                  Seed synthetic performance data
                </a>
                {' '}from the Testing page (Performance tab).
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TRANSITIONS TAB */}
      {/* ============================================================ */}
      {dataLoaded && !loading && !error && activeTab === 'transitions' && (
        <div className="space-y-6">
          {transitionData.length > 0 ? (
            <>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Screen Transition Times</h3>
                <ResponsiveContainer width="100%" height={Math.max(300, transitionData.length * 40)}>
                  <BarChart data={transitionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" unit="ms" />
                    <YAxis dataKey="screen" type="category" width={150} />
                    <Tooltip formatter={(value: any) => `${value}ms`} />
                    <Bar dataKey="avgMs" fill={COLORS.transition} name="Avg ms" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Transition Details</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Screen</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg (ms)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {transitionData.map((t, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono text-gray-900">{t.screen}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{t.count}</td>
                          <td className={`px-4 py-3 text-sm text-right font-semibold ${t.avgMs > 300 ? 'text-red-600' : t.avgMs > 150 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {t.avgMs}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">🔄</div>
              <p className="text-gray-600">No screen transition data for this period</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* SCROLL FPS TAB */}
      {/* ============================================================ */}
      {dataLoaded && !loading && !error && activeTab === 'scroll' && (
        <div className="space-y-6">
          {scrollFpsData.length > 0 ? (
            <>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Scroll FPS by Screen</h3>
                <ResponsiveContainer width="100%" height={Math.max(300, scrollFpsData.length * 50)}>
                  <BarChart data={scrollFpsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 65]} />
                    <YAxis dataKey="screen" type="category" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgFps" fill={COLORS.fps} name="Avg FPS" />
                    <Bar dataKey="minFps" fill="#ef4444" name="Min FPS" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Scroll Details</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Screen</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Samples</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg FPS</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Min FPS</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Dropped</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {scrollFpsData.map((s, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono text-gray-900">{s.screen}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{s.count}</td>
                          <td className={`px-4 py-3 text-sm text-right font-semibold ${s.avgFps < 30 ? 'text-red-600' : s.avgFps < 50 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {s.avgFps}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right ${s.minFps < 20 ? 'text-red-600' : 'text-gray-600'}`}>
                            {s.minFps}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{s.avgDropped}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">📜</div>
              <p className="text-gray-600">No scroll FPS data for this period</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* API LATENCY TAB */}
      {/* ============================================================ */}
      {dataLoaded && !loading && !error && activeTab === 'api' && (
        <div className="space-y-6">
          {apiLatencyData.length > 0 ? (
            <>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">API Latency by Endpoint</h3>
                <ResponsiveContainer width="100%" height={Math.max(300, apiLatencyData.length * 40)}>
                  <BarChart data={apiLatencyData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" unit="ms" />
                    <YAxis dataKey="endpoint" type="category" width={200} />
                    <Tooltip formatter={(value: any) => `${value}ms`} />
                    <Bar dataKey="avgMs" fill={COLORS.api} name="Avg ms" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Endpoint Details</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Calls</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg (ms)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {apiLatencyData.map((a, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono text-gray-900">{a.endpoint}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{a.count}</td>
                          <td className={`px-4 py-3 text-sm text-right font-semibold ${a.avgMs > 2000 ? 'text-red-600' : a.avgMs > 1000 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {a.avgMs}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right ${a.errors > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                            {a.errors}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">🌐</div>
              <p className="text-gray-600">No API latency data for this period</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* SLOW RENDERS TAB */}
      {/* ============================================================ */}
      {dataLoaded && !loading && !error && activeTab === 'renders' && (
        <div className="space-y-6">
          {slowRenderData.length > 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Slow Component Renders (&gt;16ms)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Component</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Screen</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg (ms)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Max (ms)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {slowRenderData.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-900">{r.componentName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{r.screenName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{r.count}</td>
                        <td className={`px-4 py-3 text-sm text-right font-semibold ${r.avgMs > 50 ? 'text-red-600' : r.avgMs > 32 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {r.avgMs}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right ${r.maxMs > 100 ? 'text-red-600' : 'text-gray-600'}`}>
                          {r.maxMs}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">🎨</div>
              <p className="text-gray-600">No slow render data for this period</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* RAW DATA TAB */}
      {/* ============================================================ */}
      {dataLoaded && !loading && !error && activeTab === 'raw' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-4 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Raw Metrics</h3>
              <select
                value={rawMetricType}
                onChange={(e) => { setRawMetricType(e.target.value); setDataLoaded(false); }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Types</option>
                <option value="app_startup">App Startup</option>
                <option value="screen_transition">Screen Transition</option>
                <option value="scroll_fps">Scroll FPS</option>
                <option value="js_thread_fps">JS Thread FPS</option>
                <option value="api_response_time">API Response Time</option>
                <option value="component_render">Component Render</option>
              </select>
              <span className="text-sm text-gray-500">{rawMetrics.length} metrics (limit 500)</span>
            </div>

            {rawMetrics.length > 0 ? (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Screen</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rawMetrics.map((m, i) => (
                      <tr key={i} className="hover:bg-gray-50 text-xs">
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                          {new Date(m.timestamp).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            m.metricType === 'app_startup' ? 'bg-blue-100 text-blue-700' :
                            m.metricType === 'scroll_fps' ? 'bg-green-100 text-green-700' :
                            m.metricType === 'screen_transition' ? 'bg-yellow-100 text-yellow-700' :
                            m.metricType === 'api_response_time' ? 'bg-purple-100 text-purple-700' :
                            m.metricType === 'component_render' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {m.metricType}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600 font-mono">{m.screenName || '-'}</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-900">{m.value}</td>
                        <td className="px-3 py-2 text-gray-500 font-mono max-w-xs truncate">
                          {m.metadata ? JSON.stringify(m.metadata) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No raw metrics found. Make sure to click &quot;Load Data&quot; with the Raw Data tab active.</p>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BACKFILL SECTION (always visible) */}
      {/* ============================================================ */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔧</span>
          <div className="flex-1">
            <h3 className="text-blue-800 font-semibold mb-2">Manual Aggregation (Backfill)</h3>
            <p className="text-blue-700 text-sm mb-3">
              The scheduled function runs daily at 2 AM UTC. Use this to manually aggregate data for a specific date.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={backfillDate}
                onChange={(e) => setBackfillDate(e.target.value)}
                className="px-3 py-2 border border-blue-300 rounded-md text-sm"
              />
              <button
                onClick={handleBackfill}
                disabled={backfillLoading || !backfillDate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {backfillLoading ? 'Aggregating...' : 'Aggregate'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* PURGE SECTION (always visible) */}
      {/* ============================================================ */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{'🗑️'}</span>
          <div className="flex-1">
            <h3 className="text-red-800 font-semibold mb-2">Purge Raw Metrics (Retention)</h3>
            <p className="text-red-700 text-sm mb-3">
              Delete raw performance metrics older than the specified number of days.
              Daily aggregates are preserved for long-term trend analysis.
            </p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Older than</span>
              <select
                value={purgeAge}
                onChange={(e) => setPurgeAge(Number(e.target.value))}
                className="px-3 py-2 border border-red-300 rounded-md text-sm"
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
              </select>
              <button
                onClick={handlePurge}
                disabled={purgeLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
              >
                {purgeLoading ? 'Purging...' : 'Purge'}
              </button>
            </div>
            {purgeResult && (
              <p className={`text-sm mt-2 ${purgeResult.startsWith('Purge failed') ? 'text-red-600' : 'text-green-700'}`}>
                {purgeResult}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div className="flex-1">
            <h3 className="text-gray-800 font-semibold mb-2">About Performance Monitoring</h3>
            <ul className="text-gray-700 text-sm space-y-1">
              <li><strong>App Startup</strong> = Time from JS bundle load to NavigationContainer ready</li>
              <li><strong>Screen Transitions</strong> = Time to render a new screen after navigation</li>
              <li><strong>Scroll FPS</strong> = Frame rate during FlatList scrolling (50% sampled)</li>
              <li><strong>JS Thread FPS</strong> = Continuous JS thread frame rate (10% of sessions sampled)</li>
              <li><strong>API Latency</strong> = HTTP requests and Firebase callable function response times</li>
              <li><strong>Slow Renders</strong> = React component renders exceeding 16ms (one frame budget)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Phase 1 Optimization Notes */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{'⚡'}</span>
          <div className="flex-1">
            <h3 className="text-gray-800 font-semibold mb-2">Phase 1 Optimizations (Deployed)</h3>
            <ul className="text-gray-700 text-sm space-y-1">
              <li><strong>Console Stripping</strong> — All console.* calls removed in production builds (babel-plugin-transform-remove-console)</li>
              <li><strong>React.memo</strong> — 5 feed card components memoized with custom comparators to prevent unnecessary re-renders</li>
              <li><strong>FlatList Tuning</strong> — removeClippedSubviews, windowSize, maxToRenderPerBatch on DiaryList, LifeFeed, Chat screens</li>
              <li><strong>Deferred Service Init</strong> — Analytics/monitoring services deferred 5s after app startup; non-critical services run in parallel</li>
            </ul>

            <h4 className="text-gray-800 font-semibold mt-4 mb-1">{'🔍'} React Profiler — Temporary (Remove After Validation)</h4>
            <p className="text-gray-600 text-sm mb-2">
              React.Profiler wrappers are active on 5 components to measure render frequency and duration.
              They have minimal overhead (one function call per render, early-return for {'<'}16ms) but are <strong>not recommended
              for long-term production use</strong>. Once you confirm the optimizations are working (fewer Slow Renders events,
              stable Scroll FPS), remove the Profiler wrappers and keep only React.memo.
            </p>
            <ul className="text-gray-700 text-sm space-y-1 ml-4">
              <li>{'•'} <code className="bg-gray-100 px-1 rounded text-xs">StatsFeedCard.tsx</code> — HomeFeed</li>
              <li>{'•'} <code className="bg-gray-100 px-1 rounded text-xs">DiaryFeedCard.tsx</code> — HomeFeed</li>
              <li>{'•'} <code className="bg-gray-100 px-1 rounded text-xs">PhotoFeedCard.tsx</code> — HomeFeed</li>
              <li>{'•'} <code className="bg-gray-100 px-1 rounded text-xs">VoiceNoteFeedCard.tsx</code> — HomeFeed</li>
              <li>{'•'} <code className="bg-gray-100 px-1 rounded text-xs">LifeFeedPostCard.tsx</code> — LifeFeed</li>
            </ul>

            <h4 className="text-gray-800 font-semibold mt-4 mb-1">{'📊'} What to Look For</h4>
            <ul className="text-gray-700 text-sm space-y-1">
              <li><strong>app_startup</strong> p50/p95 — Should decrease 20-30% (console stripping + deferred init)</li>
              <li><strong>scroll_fps</strong> avgFps — Should trend toward 60fps (FlatList tuning)</li>
              <li><strong>component_render</strong> event count — Fewer events = React.memo is working</li>
              <li><strong>screen_transition</strong> p95 — Should decrease (FlatList tuning + deferred init)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
