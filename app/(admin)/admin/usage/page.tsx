'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api/client';
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

interface UsageResponse {
  usage: UsageData[];
  totals: {
    totalCost: number;
    totalApiCalls: number;
    totalTokens: number;
  };
  startDate: string;
  endDate: string;
  groupBy: 'day' | 'month';
}

interface TopUser {
  userId: string;
  email: string;
  displayName?: string;
  totalCost: number;
  totalApiCalls: number;
}

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6'];

const OPERATION_LABELS: Record<string, string> = {
  embedding: 'Embeddings',
  chat_completion: 'Chat Completion',
  transcription: 'Transcription',
  image_description: 'Image Description',
  tts: 'Text-to-Speech',
  pinecone_query: 'Vector Query',
  pinecone_upsert: 'Vector Upsert',
  pinecone_delete: 'Vector Delete',
};

/**
 * Admin Usage Analytics Dashboard
 * System-wide usage metrics and cost analysis
 */
export default function AdminUsageAnalyticsPage() {
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range states
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Top users state
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);

  useEffect(() => {
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchUsageData();
    }
  }, [startDate, endDate, groupBy]);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        startDate,
        endDate,
        groupBy,
      });

      const data = await apiGet<UsageResponse>(`/api/admin/usage?${queryParams.toString()}`);
      setUsageData(data.usage);
      setTotals(data.totals);

      // Calculate top users from usage data
      calculateTopUsers(data.usage);
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
    name: OPERATION_LABELS[operation] || operation,
    value: cost,
  }));

  const topUsersChartData = topUsers.map((user) => ({
    name: user.displayName || user.email.split('@')[0],
    cost: user.totalCost,
    apiCalls: user.totalApiCalls,
  }));

  const handleQuickRange = (days: number) => {
    const today = new Date();
    const pastDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(pastDate.toISOString().split('T')[0]);
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group By</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'day' | 'month')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="day">Day</option>
                <option value="month">Month</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleExportCSV}
                disabled={loading || !usageData || usageData.length === 0}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchUsageData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      {!loading && totals && (
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

      {/* Cost Breakdown by Operation */}
      {!loading && operationBreakdownData.length > 0 && (
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
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">% of Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {operationBreakdownData
                      .sort((a, b) => b.value - a.value)
                      .map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{item.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                            ${item.value.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500 text-right">
                            {((item.value / totals.totalCost) * 100).toFixed(1)}%
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

      {/* Daily Usage Trend */}
      {!loading && timeSeriesData.length > 0 && (
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
      {!loading && topUsersChartData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top 10 Users by Cost</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topUsersChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip />
              <Legend />
              <Bar dataKey="cost" fill="#ef4444" name="Total Cost ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && usageData.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-600 text-lg">No usage data found for the selected date range</p>
          <p className="text-gray-500 text-sm mt-2">Try adjusting the date range or check back later</p>
        </div>
      )}
    </div>
  );
}
