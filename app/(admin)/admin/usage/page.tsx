'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { useAppSelector } from '@/lib/store/hooks';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';
import {
  getOperationLabel,
  getOperationIcon,
  getServicesForOperation,
  OPERATION_LABELS,
  type OperationType,
} from '@/lib/models/ServiceOperations';
import type {
  AggregatedInfrastructureCosts,
  InfrastructureCostTotals,
  InfrastructureCostResponse,
} from '@/lib/models/InfrastructureCost';
import BillingComparisonCard from '@/components/admin/BillingComparisonCard';
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

interface UsageData {
  date?: string;
  month?: string;
  totalCostUSD: number;
  totalApiCalls: number;
  totalTokens: number;
  operationCounts: Record<string, number>;
  operationCosts: Record<string, number>;
  userCount?: number;
}

interface SamplingInfo {
  service: string;
  rate: number;
  description: string;
}

interface UsageResponse {
  usage: UsageData[];
  totals: {
    totalCost: number;
    totalApiCalls: number;
    totalTokens: number;
  };
  topUsers: TopUser[];
  modelBreakdown?: ModelBreakdown;
  endpointBreakdown?: EndpointBreakdown;
  featureBreakdown?: FeatureBreakdown[];
  startDate: string;
  endDate: string;
  groupBy: 'day' | 'month';
  samplingInfo?: SamplingInfo[];
}

interface TopUser {
  userId: string;
  email?: string;
  displayName?: string;
  totalCost: number;
  totalApiCalls: number;
  totalTokens?: number;
}

interface ModelBreakdown {
  [model: string]: { cost: number; calls: number; tokens: number };
}

interface EndpointBreakdown {
  [endpoint: string]: { cost: number; calls: number; tokens: number };
}

interface FeatureBreakdown {
  feature: string;
  icon: string;
  cost: number;
  calls: number;
  tokens: number;
  avgCostPerCall: number;
  percentOfTotal: number;
  // Source breakdown
  mobileCost: number;
  mobileCalls: number;
  webCost: number;
  webCalls: number;
}

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#ec4899', '#d946ef', '#0ea5e9', '#10b981', '#a855f7',
  '#f43f5e', '#e879f9', '#2dd4bf', '#fbbf24', '#818cf8',
  '#fb923c', '#34d399', '#c084fc', '#38bdf8', '#a3e635',
];

// Legacy labels for backwards compatibility (not in ServiceOperations.ts)
const LEGACY_OPERATION_LABELS: Record<string, string> = {
  image_description: 'Photo Description',
};

// Endpoint display labels
const ENDPOINT_LABELS: Record<string, string> = {
  'embeddings': 'Embeddings',
  'chat/completions': 'Chat Completions',
  'audio/transcriptions': 'Whisper',
  'audio/speech': 'TTS',
};

// Endpoint icons
const ENDPOINT_ICONS: Record<string, string> = {
  'embeddings': '📊',
  'chat/completions': '💬',
  'audio/transcriptions': '🎤',
  'audio/speech': '🔊',
};

// Model colors for pie chart
const MODEL_COLORS: Record<string, string> = {
  'gpt-4o': '#10b981',
  'gpt-4o-mini': '#3b82f6',
  'text-embedding-3-small': '#f59e0b',
  'whisper-1': '#ef4444',
  'tts-1': '#8b5cf6',
};

/**
 * Admin Usage Analytics Dashboard
 * System-wide usage metrics and cost analysis
 */
export default function AdminUsageAnalyticsPage() {
  // Track page view
  useTrackPage(TRACKED_SCREENS.adminUsage);

  const { isAuthenticated, isLoading: authLoading } = useAppSelector((state) => state.auth);
  const searchParams = useSearchParams();
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Date range states — default to last 7 days
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [startDate, setStartDate] = useState(sevenDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [activeRange, setActiveRange] = useState<number>(7);

  // Service filter from URL (e.g., /admin/usage?service=RAGEngine)
  const serviceFilter = searchParams.get('service');

  // Top users state
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);

  // Model, endpoint, and feature breakdown state
  const [modelBreakdown, setModelBreakdown] = useState<ModelBreakdown>({});
  const [endpointBreakdown, setEndpointBreakdown] = useState<EndpointBreakdown>({});
  const [featureBreakdown, setFeatureBreakdown] = useState<FeatureBreakdown[]>([]);

  // Sampling info state
  const [samplingInfo, setSamplingInfo] = useState<SamplingInfo[]>([]);

  // Infrastructure costs state (new)
  const [infrastructureData, setInfrastructureData] = useState<AggregatedInfrastructureCosts | null>(null);
  const [infrastructureTotals, setInfrastructureTotals] = useState<InfrastructureCostTotals | null>(null);

  // Auto-load data on mount
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Auto-load on mount and when date range changes
  useEffect(() => {
    if (startDate && endDate && !initialLoadDone) {
      setInitialLoadDone(true);
      fetchUsageData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const fetchUsageData = async (overrideStart?: string, overrideEnd?: string) => {
    const fetchStart = overrideStart || startDate;
    const fetchEnd = overrideEnd || endDate;

    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        startDate: fetchStart,
        endDate: fetchEnd,
        groupBy,
      });

      // Add service filter if present
      if (serviceFilter) {
        queryParams.set('service', serviceFilter);
      }

      const data = await apiGet<UsageResponse>(`/api/admin/usage?${queryParams.toString()}`);
      setUsageData(data.usage);
      setTotals(data.totals);

      // Use top users from API response
      if (data.topUsers && data.topUsers.length > 0) {
        setTopUsers(data.topUsers);
      } else {
        setTopUsers([]);
      }

      // Set model, endpoint, and feature breakdowns
      setModelBreakdown(data.modelBreakdown || {});
      setEndpointBreakdown(data.endpointBreakdown || {});
      setFeatureBreakdown(data.featureBreakdown || []);

      // Set sampling info
      setSamplingInfo(data.samplingInfo || []);

      // Fetch infrastructure costs in parallel
      try {
        const infraQueryParams = new URLSearchParams({ startDate: fetchStart, endDate: fetchEnd });
        const infraData = await apiGet<InfrastructureCostResponse>(
          `/api/admin/infrastructure?${infraQueryParams.toString()}`
        );
        setInfrastructureData(infraData.infrastructure);
        setInfrastructureTotals(infraData.totals);
      } catch (infraErr) {
        console.warn('Failed to fetch infrastructure costs:', infraErr);
        // Don't fail the whole page if infrastructure costs fail
        setInfrastructureData(null);
        setInfrastructureTotals(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch usage data:', err);
      setError(err.message || 'Failed to load usage analytics');
    } finally {
      setLoading(false);
    }
  };

  const calculateTopUsers = (usage: UsageData[]) => {
    // Aggregate by user
    const userMap = new Map<string, { totalCost: number; totalApiCalls: number; email: string; displayName?: string }>();

    // Note: This is a simplified version. In a real implementation,
    // we would need to fetch user details from the API or include them in the usage response
    usage.forEach((item: any) => {
      if (item.userId) {
        const existing = userMap.get(item.userId) || { totalCost: 0, totalApiCalls: 0, email: item.email || item.userId, displayName: item.displayName };
        existing.totalCost += item.totalCostUSD || 0;
        existing.totalApiCalls += item.totalApiCalls || 0;
        userMap.set(item.userId, existing);
      }
    });

    // Sort by cost and take top 10
    const topUsersList = Array.from(userMap.entries())
      .map(([userId, data]) => ({
        userId,
        ...data,
      }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);

    setTopUsers(topUsersList);
  };

  const handleExportCSV = () => {
    if (!usageData || usageData.length === 0) {
      alert('No data to export');
      return;
    }

    // Prepare CSV data
    const headers = ['Date', 'Total Cost (USD)', 'API Calls', 'Tokens', 'User Count'];
    const rows = usageData.map((item) => [
      item.date || item.month || '',
      item.totalCostUSD.toFixed(2),
      item.totalApiCalls,
      item.totalTokens,
      item.userCount || 0,
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
    link.setAttribute('download', `usage-analytics-${startDate}-to-${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Prepare chart data
  const timeSeriesData = usageData.map((item) => ({
    date: item.date
      ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : item.month || '',
    cost: item.totalCostUSD,
    apiCalls: item.totalApiCalls,
    tokens: item.totalTokens,
  }));

  // Aggregate operation breakdown
  const operationBreakdown = usageData.reduce((acc, item) => {
    if (item.operationCosts) {
      Object.entries(item.operationCosts).forEach(([operation, cost]) => {
        acc[operation] = (acc[operation] || 0) + (cost as number);
      });
    }
    return acc;
  }, {} as Record<string, number>);

  const operationBreakdownData = Object.entries(operationBreakdown).map(([operation, cost]) => ({
    operation, // Keep the raw operation type for service lookup
    name: getOperationLabel(operation) || LEGACY_OPERATION_LABELS[operation] || operation,
    icon: getOperationIcon(operation),
    value: cost,
    services: getServicesForOperation(operation as OperationType),
  }));

  const topUsersChartData = topUsers.map((user) => ({
    userId: user.userId,
    name: user.displayName || (user.email ? user.email.split('@')[0] : user.userId.substring(0, 8)),
    cost: user.totalCost,
    apiCalls: user.totalApiCalls,
  }));

  const handleQuickRange = (days: number) => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const newStart = pastDate.toISOString().split('T')[0];
    const newEnd = now.toISOString().split('T')[0];
    setStartDate(newStart);
    setEndDate(newEnd);
    setActiveRange(days);
    setDataLoaded(true);
    fetchUsageData(newStart, newEnd);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Usage Analytics</h1>
        <p className="mt-2 text-gray-600">
          System-wide usage metrics and cost analysis across all users
        </p>
      </div>

      {/* Date Range Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-gray-900">Date Range</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                fetchUsageData();
                setDataLoaded(true);
              }}
              disabled={loading || !startDate || !endDate}
              className="px-5 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={handleExportCSV}
              disabled={loading || !usageData || usageData.length === 0}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Quick Range Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { days: 7, label: 'Last 7 Days' },
            { days: 14, label: 'Last 14 Days' },
            { days: 30, label: 'Last 30 Days' },
            { days: 90, label: 'Last 90 Days' },
          ].map(({ days, label }) => (
            <button
              key={days}
              onClick={() => handleQuickRange(days)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeRange === days
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setActiveRange(0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setActiveRange(0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'day' | 'month')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="day">Day</option>
              <option value="month">Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {(loading || authLoading) && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">{authLoading ? 'Checking authentication...' : 'Loading analytics...'}</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => fetchUsageData()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      {!loading && dataLoaded && totals && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">${totals.totalCost.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {startDate} to {endDate}
                </p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total API Calls</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totals.totalApiCalls.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Across all users
                </p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tokens</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totals.totalTokens.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Prompt + Completion
                </p>
              </div>
              <div className="text-4xl">🔤</div>
            </div>
          </div>
        </div>
      )}

      {/* Sampling Notice - Important for understanding the data */}
      {!loading && dataLoaded && samplingInfo.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📊</span>
            <div className="flex-1">
              <h3 className="text-blue-800 font-semibold mb-2">Data Sampling in Effect</h3>
              <p className="text-blue-700 text-sm mb-3">
                To reduce Firestore storage costs, some high-volume services use statistical sampling.
                Costs and call counts shown are <strong>estimated totals</strong> calculated from sampled data.
              </p>

              <div className="bg-white/60 rounded-lg p-3">
                <h4 className="font-medium text-blue-800 mb-2">Sampling Rates:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {samplingInfo.map((info) => (
                    <div key={info.service} className="flex items-center gap-2 text-sm">
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                        {info.service}
                      </span>
                      <span className="text-blue-600">
                        → {info.description} (costs multiplied by {info.rate}×)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 text-xs text-blue-600">
                <strong>How it works:</strong> For EmbeddingService, we log 1 in every 100 calls.
                Each logged record represents ~100 actual calls, so we multiply the recorded cost by 100 to estimate the true total.
                This reduces Firestore writes by 99% while maintaining cost accuracy within ±10%.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature Cost Breakdown - For Subscription Quota Planning */}
      {!loading && dataLoaded && featureBreakdown.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">Cost by Feature</h2>
            <p className="text-sm text-gray-600 mt-1">
              Understand which features cost the most to define subscription quotas
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={featureBreakdown.map((f) => ({ name: f.feature, value: f.cost }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {featureBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${(value as number).toFixed(4)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Feature</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Source</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Calls</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Avg/Call</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {featureBreakdown.map((item, index) => (
                      <tr key={index} className={index === 0 ? 'bg-red-50' : ''}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          <span className="mr-2">{item.icon}</span>
                          {item.feature}
                          {index === 0 && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Most Expensive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-center">
                          <div className="flex flex-col gap-1">
                            {item.mobileCalls > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                📱 {item.mobileCalls.toLocaleString()} (${item.mobileCost.toFixed(4)})
                              </span>
                            )}
                            {item.webCalls > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                🌐 {item.webCalls.toLocaleString()} (${item.webCost.toFixed(4)})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                          ${item.cost.toFixed(4)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-right">
                          {item.calls.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-right">
                          ${item.avgCostPerCall.toFixed(6)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500 text-right">
                          {item.percentOfTotal.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Photo Description Highlight (if exists) */}
          {featureBreakdown.some((f) => f.feature === 'Photo Description') && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📷</span>
                <h3 className="font-semibold text-amber-800">Photo Description Deep Dive</h3>
              </div>
              {(() => {
                const photo = featureBreakdown.find((f) => f.feature === 'Photo Description');
                if (!photo) return null;
                return (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-amber-700">Photos Processed</p>
                      <p className="text-xl font-bold text-amber-900">{photo.calls.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-amber-700">Total Cost</p>
                      <p className="text-xl font-bold text-amber-900">${photo.cost.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-amber-700">Avg per Photo</p>
                      <p className="text-xl font-bold text-amber-900">${photo.avgCostPerCall.toFixed(4)}</p>
                    </div>
                  </div>
                );
              })()}
              <p className="text-xs text-amber-600 mt-3">
                Photo descriptions use GPT-4o vision (~$0.01-0.03 per image). Consider limiting free tier to 5-10 photos/month.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Infrastructure Cost Summary */}
      {!loading && dataLoaded && infrastructureData && infrastructureTotals && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Infrastructure Costs</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Firestore</p>
                  <p className="text-2xl font-bold text-gray-900">${infrastructureTotals.firestore.toFixed(4)}</p>
                  <p className="text-xs text-gray-500">{infrastructureData.firestore.reads.toLocaleString()} reads</p>
                </div>
                <div className="text-2xl">🔥</div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-cyan-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Storage</p>
                  <p className="text-2xl font-bold text-gray-900">${infrastructureTotals.storage.toFixed(4)}</p>
                  <p className="text-xs text-gray-500">{infrastructureData.storage.storageGB.toFixed(2)} GB</p>
                </div>
                <div className="text-2xl">📁</div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-violet-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Functions</p>
                  <p className="text-2xl font-bold text-gray-900">${infrastructureTotals.functions.toFixed(4)}</p>
                  <p className="text-xs text-gray-500">{infrastructureData.functions.invocations.toLocaleString()} calls</p>
                </div>
                <div className="text-2xl">⚡</div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pinecone Storage</p>
                  <p className="text-2xl font-bold text-gray-900">${infrastructureTotals.pinecone.toFixed(4)}</p>
                  <p className="text-xs text-gray-500">{infrastructureData.pinecone.vectors.toLocaleString()} vectors</p>
                </div>
                <div className="text-2xl">🌲</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Combined Total Cost Card */}
      {!loading && dataLoaded && totals && infrastructureTotals && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
          <h3 className="text-lg font-medium opacity-90">Total Infrastructure Cost</h3>
          <p className="text-4xl font-bold mt-2">
            ${(totals.totalCost + infrastructureTotals.grandTotal).toFixed(2)}
          </p>
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <p className="opacity-75">OpenAI API</p>
              <p className="font-medium text-lg">${totals.totalCost.toFixed(2)}</p>
            </div>
            <div>
              <p className="opacity-75">Infrastructure</p>
              <p className="font-medium text-lg">${infrastructureTotals.grandTotal.toFixed(4)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="grid grid-cols-4 gap-2 text-xs opacity-75">
              <div>
                <p>Firestore</p>
                <p className="font-medium">${infrastructureTotals.firestore.toFixed(4)}</p>
              </div>
              <div>
                <p>Storage</p>
                <p className="font-medium">${infrastructureTotals.storage.toFixed(4)}</p>
              </div>
              <div>
                <p>Functions</p>
                <p className="font-medium">${infrastructureTotals.functions.toFixed(4)}</p>
              </div>
              <div>
                <p>Pinecone</p>
                <p className="font-medium">${infrastructureTotals.pinecone.toFixed(4)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Infrastructure Tracking Info */}
      {!loading && dataLoaded && infrastructureData && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="text-amber-800 font-semibold mb-3">Infrastructure Cost Tracking - Limitations</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {/* What's Tracked */}
                <div className="bg-white/60 rounded-lg p-3">
                  <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-1">
                    <span>✅</span> What&apos;s Tracked
                  </h4>
                  <ul className="text-amber-700 space-y-1">
                    <li><strong>Firestore (Web App)</strong> - All CRUD operations from web dashboard</li>
                    <li><strong>Cloud Functions</strong> - queryRAG, photoMemoryCreated execution time</li>
                    <li><strong>Pinecone Storage</strong> - Daily snapshot of vector count &amp; estimated storage</li>
                  </ul>
                </div>

                {/* What's NOT Tracked */}
                <div className="bg-white/60 rounded-lg p-3">
                  <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-1">
                    <span>❌</span> What&apos;s NOT Tracked
                  </h4>
                  <ul className="text-amber-700 space-y-1">
                    <li><strong>Firestore (Cloud Functions)</strong> - Operations inside triggers</li>
                    <li><strong>Firebase Storage</strong> - Upload/download bandwidth</li>
                    <li><strong>Other Cloud Functions</strong> - healthDataCreated, locationDataCreated, etc.</li>
                    <li><strong>Mobile App</strong> - Direct Firestore operations from app</li>
                  </ul>
                </div>
              </div>

              {/* Accuracy & Calculation Method */}
              <div className="mt-4 bg-white/60 rounded-lg p-3">
                <h4 className="font-semibold text-amber-800 mb-2">Calculation Method</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-amber-700">
                  <div>
                    <p className="font-medium">Firestore</p>
                    <p>$0.06/100K reads</p>
                    <p>$0.18/100K writes</p>
                    <p className="text-amber-500 mt-1">~60% accuracy</p>
                  </div>
                  <div>
                    <p className="font-medium">Cloud Functions</p>
                    <p>$0.40/1M invocations</p>
                    <p>$0.0000025/GB-second</p>
                    <p className="text-amber-500 mt-1">~30% accuracy</p>
                  </div>
                  <div>
                    <p className="font-medium">Firebase Storage</p>
                    <p>$0.026/GB-month</p>
                    <p>$0.12/GB download</p>
                    <p className="text-red-500 mt-1">Not tracked</p>
                  </div>
                  <div>
                    <p className="font-medium">Pinecone Storage</p>
                    <p>$0.25/GB-month</p>
                    <p>vectors × 1536 × 4 bytes</p>
                    <p className="text-green-600 mt-1">~95% accuracy</p>
                  </div>
                </div>
              </div>

              {/* Real Billing Note */}
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm">
                  <strong>Actual Billing Available:</strong> See the &quot;Actual vs Estimated Costs&quot; section below for real billing data
                  from OpenAI, Pinecone, and GCP APIs.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actual vs Estimated Billing Comparison */}
      {!loading && dataLoaded && startDate && endDate && (
        <BillingComparisonCard startDate={startDate} endDate={endDate} />
      )}

      {/* Billing Data Sources Documentation */}
      {!loading && dataLoaded && (
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📊</span>
            <div className="flex-1">
              <h3 className="text-slate-800 font-semibold mb-3">How Billing Data Is Fetched</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {/* OpenAI */}
                <div className="bg-white/70 rounded-lg p-4 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🤖</span>
                    <h4 className="font-semibold text-slate-800">OpenAI</h4>
                  </div>
                  <div className="space-y-2 text-slate-600">
                    <div>
                      <p className="font-medium text-green-700">Primary: Costs API</p>
                      <p className="text-xs">Real-time billing from OpenAI organization dashboard</p>
                    </div>
                    <div>
                      <p className="font-medium text-blue-700">Fallback: Usage API</p>
                      <p className="text-xs">Token counts × model pricing rates</p>
                    </div>
                    <div>
                      <p className="font-medium text-amber-700">Last Resort: Estimates</p>
                      <p className="text-xs">From our usageEvents collection tracking</p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-500">
                        <strong>Env:</strong> <code className="bg-slate-100 px-1 rounded">OPENAI_ORG_API_KEY</code>
                      </p>
                      <p className="text-xs text-slate-500">Cache: 6 hours</p>
                    </div>
                  </div>
                </div>

                {/* Pinecone */}
                <div className="bg-white/70 rounded-lg p-4 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🌲</span>
                    <h4 className="font-semibold text-slate-800">Pinecone</h4>
                  </div>
                  <div className="space-y-2 text-slate-600">
                    <div>
                      <p className="font-medium text-green-700">Primary: Index Stats API</p>
                      <p className="text-xs">Vector count → storage calculation</p>
                    </div>
                    <div>
                      <p className="font-medium text-blue-700">Operations: Our Tracking</p>
                      <p className="text-xs">Read/write units from usageEvents collection</p>
                    </div>
                    <div>
                      <p className="font-medium text-amber-700">Scheduled: Daily Snapshot</p>
                      <p className="text-xs">Cloud Function runs at 2 AM UTC daily</p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-500">
                        <strong>Env:</strong> <code className="bg-slate-100 px-1 rounded">PINECONE_API_KEY</code> (existing)
                      </p>
                      <p className="text-xs text-slate-500">Cache: 12 hours</p>
                    </div>
                  </div>
                </div>

                {/* GCP / Firebase */}
                <div className="bg-white/70 rounded-lg p-4 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🔥</span>
                    <h4 className="font-semibold text-slate-800">GCP / Firebase</h4>
                  </div>
                  <div className="space-y-2 text-slate-600">
                    <div>
                      <p className="font-medium text-green-700">Primary: BigQuery Export</p>
                      <p className="text-xs">Real billing data exported to BigQuery</p>
                    </div>
                    <div>
                      <p className="font-medium text-amber-700">Fallback: Infrastructure Estimates</p>
                      <p className="text-xs">From infrastructureCosts collection</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-500">Note: 24-48h delay</p>
                      <p className="text-xs">GCP billing export has inherent latency</p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-500">
                        <strong>Env:</strong> <code className="bg-slate-100 px-1 rounded">GOOGLE_CLOUD_BILLING_*</code>
                      </p>
                      <p className="text-xs text-slate-500">Cache: 24 hours</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Caching Behavior */}
              <div className="mt-4 bg-white/70 rounded-lg p-4 border border-slate-100">
                <h4 className="font-semibold text-slate-800 mb-2">Caching Behavior</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                  <div>
                    <p className="font-medium mb-1">How It Works:</p>
                    <ul className="list-disc list-inside text-xs space-y-1">
                      <li>Billing data is cached in Firestore <code className="bg-slate-100 px-1 rounded">billingCache</code> collection</li>
                      <li>Cache key format: <code className="bg-slate-100 px-1 rounded">{'{provider}_{startDate}_{endDate}'}</code></li>
                      <li>Click &quot;Refresh&quot; button to force fetch fresh data</li>
                      <li>Expired cache entries are auto-cleaned on next request</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Why Different TTLs?</p>
                    <ul className="list-disc list-inside text-xs space-y-1">
                      <li><strong>OpenAI (6h):</strong> Usage data updates frequently during active use</li>
                      <li><strong>Pinecone (12h):</strong> Storage metrics change less frequently</li>
                      <li><strong>GCP (24h):</strong> BigQuery export has 24-48h delay anyway</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Environment Variables */}
              <div className="mt-4 bg-white/70 rounded-lg p-4 border border-slate-100">
                <h4 className="font-semibold text-slate-800 mb-2">Required Environment Variables</h4>
                <div className="text-xs font-mono bg-slate-800 text-green-400 rounded p-3 overflow-x-auto">
                  <p className="text-slate-400"># OpenAI Organization API Key (for billing data)</p>
                  <p className="text-slate-400"># Get from: https://platform.openai.com/organization/api-keys</p>
                  <p className="text-slate-400"># Requires &quot;org:usage:read&quot; permission</p>
                  <p>OPENAI_ORG_API_KEY=sk-admin-...</p>
                  <p className="mt-2 text-slate-400"># Optional: GCP BigQuery billing export</p>
                  <p className="text-slate-400"># Enable at: https://cloud.google.com/billing/docs/how-to/export-data-bigquery</p>
                  <p>GOOGLE_CLOUD_BILLING_PROJECT_ID=your-billing-project</p>
                  <p>GOOGLE_CLOUD_BILLING_DATASET=billing_export</p>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Without these variables, the system gracefully falls back to estimates from our tracking.
                </p>
              </div>

              {/* Accuracy Notes */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="font-semibold text-green-800 mb-1">High Accuracy (~95%+)</p>
                  <ul className="text-green-700 space-y-0.5">
                    <li>• OpenAI with Costs API</li>
                    <li>• Pinecone storage (vector count × dimensions)</li>
                    <li>• GCP with BigQuery export</li>
                  </ul>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="font-semibold text-amber-800 mb-1">Medium Accuracy (~60-80%)</p>
                  <ul className="text-amber-700 space-y-0.5">
                    <li>• OpenAI from Usage API (token estimates)</li>
                    <li>• Pinecone operations (tracked queries/upserts)</li>
                    <li>• Firestore from web app tracking</li>
                  </ul>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="font-semibold text-red-800 mb-1">Lower Accuracy (~30-50%)</p>
                  <ul className="text-red-700 space-y-0.5">
                    <li>• Cloud Functions (only some tracked)</li>
                    <li>• Firestore from Cloud Functions (not tracked)</li>
                    <li>• Firebase Storage (not tracked)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Filter Banner */}
      {serviceFilter && !loading && dataLoaded && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-blue-600 text-xl">🔍</span>
            <div>
              <p className="text-blue-800 font-medium">
                Filtering by service: <span className="font-bold">{serviceFilter}</span>
              </p>
              <p className="text-blue-600 text-sm">
                Showing usage data only for operations triggered by this service
              </p>
            </div>
          </div>
          <Link
            href="/admin/usage"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Clear Filter
          </Link>
        </div>
      )}

      {/* Info Section: Operations vs Services */}
      {!loading && dataLoaded && operationBreakdownData.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div className="flex-1">
              <h3 className="text-indigo-800 font-semibold mb-2">Understanding Operations vs Services</h3>
              <ul className="text-indigo-700 text-sm space-y-1">
                <li><strong>Operations</strong> = Type of AI action (e.g., embedding, chat_completion)</li>
                <li><strong>Services</strong> = Code that triggers operations (e.g., RAGEngine, MoodDetection)</li>
                <li>One service can trigger <strong>multiple operations</strong> (e.g., RAGEngine triggers embedding + search + chat)</li>
                <li>Multiple services can contribute to the <strong>same operation</strong></li>
              </ul>
              <div className="mt-3">
                <Link
                  href="/admin/prompts"
                  className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                >
                  View Services →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cost Breakdown by Operation */}
      {!loading && dataLoaded && operationBreakdownData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Cost Breakdown by Operation</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={operationBreakdownData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(0) : '0'}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {operationBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Operation</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Services</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">% of Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {operationBreakdownData
                      .sort((a, b) => b.value - a.value)
                      .map((item, index) => {
                        const maxServicesToShow = 2;
                        const visibleServices = item.services.slice(0, maxServicesToShow);
                        const hiddenCount = item.services.length - maxServicesToShow;

                        return (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              <span className="mr-2">{item.icon}</span>
                              {item.name}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              <div className="flex flex-wrap gap-1">
                                {visibleServices.map((service) => (
                                  <Link
                                    key={service.id}
                                    href={`/admin/prompts/${service.id}`}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                  >
                                    {service.shortName}
                                  </Link>
                                ))}
                                {hiddenCount > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-500">
                                    +{hiddenCount}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                              ${item.value.toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500 text-right">
                              {totals.totalCost > 0 ? ((item.value / totals.totalCost) * 100).toFixed(1) : '0.0'}%
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cost by OpenAI Model */}
      {!loading && dataLoaded && Object.keys(modelBreakdown).length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Cost by OpenAI Model</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(modelBreakdown).map(([model, stats]) => ({
                      name: model,
                      value: stats.cost,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(0) : '0'}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.keys(modelBreakdown).map((model, index) => (
                      <Cell key={`cell-${index}`} fill={MODEL_COLORS[model] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${value.toFixed(4)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Calls</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Tokens</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(modelBreakdown)
                      .sort((a, b) => b[1].cost - a[1].cost)
                      .map(([model, stats], index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">
                            <span
                              className="inline-block w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: MODEL_COLORS[model] || COLORS[index % COLORS.length] }}
                            />
                            {model}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right">
                            {stats.calls.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right">
                            {stats.tokens.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                            ${stats.cost.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cost by API Endpoint */}
      {!loading && dataLoaded && Object.keys(endpointBreakdown).length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Cost by API Endpoint</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(endpointBreakdown)
              .sort((a, b) => b[1].cost - a[1].cost)
              .map(([endpoint, stats]) => (
                <div
                  key={endpoint}
                  className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{ENDPOINT_ICONS[endpoint] || '📦'}</span>
                    <span className="text-lg font-bold text-gray-900">${stats.cost.toFixed(4)}</span>
                  </div>
                  <div className="text-sm font-medium text-gray-700">
                    {ENDPOINT_LABELS[endpoint] || endpoint}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {stats.calls.toLocaleString()} calls · {stats.tokens.toLocaleString()} tokens
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Daily Usage Trend */}
      {!loading && dataLoaded && timeSeriesData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Usage Trend Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="cost" stroke="#ef4444" name="Cost ($)" strokeWidth={2} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="apiCalls"
                stroke="#3b82f6"
                name="API Calls"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top 10 Users by Cost */}
      {!loading && dataLoaded && topUsersChartData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top 10 Users by Cost</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={topUsersChartData}
              layout="vertical"
              onClick={(data: any) => {
                if (data?.activePayload?.[0]?.payload?.userId) {
                  window.location.href = `/admin/users/${data.activePayload[0].payload.userId}`;
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip />
              <Legend />
              <Bar dataKey="cost" fill="#ef4444" name="Total Cost ($)" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-2 text-center">Click a bar to view detailed per-user breakdown</p>

          {/* All Users Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-600">
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">User</th>
                  <th className="py-2 px-3 text-right">Cost</th>
                  <th className="py-2 px-3 text-right">API Calls</th>
                  <th className="py-2 px-3 text-right">Tokens</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((user, index) => (
                  <tr key={user.userId} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-500">{index + 1}</td>
                    <td className="py-2 px-3">
                      <div className="font-medium text-gray-900">
                        {user.displayName || user.email?.split('@')[0] || user.userId.substring(0, 8)}
                      </div>
                      {user.email && (
                        <div className="text-xs text-gray-500">{user.email}</div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">${user.totalCost.toFixed(4)}</td>
                    <td className="py-2 px-3 text-right">{user.totalApiCalls.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{(user.totalTokens ?? 0).toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <Link
                        href={`/admin/users/${user.userId}`}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State - Data Loaded but No Results */}
      {!loading && !error && dataLoaded && usageData.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-600 text-lg">No usage data found for the selected date range</p>
          <p className="text-gray-500 text-sm mt-2">Try adjusting the date range or check back later</p>
        </div>
      )}
    </div>
  );
}
