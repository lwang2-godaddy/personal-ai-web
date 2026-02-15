'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiGet } from '@/lib/api/client';
import type { CombinedBillingResponse, CombinedBillingData } from '@/lib/models/BillingData';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface BillingComparisonCardProps {
  startDate: string;
  endDate: string;
}

/**
 * BillingComparisonCard Component
 * Displays actual vs estimated costs with variance indicators
 */
export default function BillingComparisonCard({ startDate, endDate }: BillingComparisonCardProps) {
  const [billingData, setBillingData] = useState<CombinedBillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchBillingData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const queryParams = new URLSearchParams({
        startDate,
        endDate,
        ...(forceRefresh && { refresh: 'true' }),
      });

      const response = await apiGet<CombinedBillingResponse>(
        `/api/admin/billing?${queryParams.toString()}`
      );

      setBillingData(response.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch billing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startDate, endDate]);

  // Always force refresh on first load to avoid stale cached data
  useEffect(() => {
    fetchBillingData(true);
  }, [fetchBillingData]);

  const handleRefresh = () => {
    fetchBillingData(true);
  };

  // Provider colors for charts
  const PROVIDER_COLORS = {
    openai: '#10b981',    // Green
    pinecone: '#06b6d4',  // Cyan
    gcp: '#f59e0b',       // Amber
  };

  // Process trend data for the chart
  const trendData = useMemo(() => {
    if (!billingData) return [];

    const { openai, pinecone, gcp } = billingData;

    // Collect all unique dates from all providers
    const dateSet = new Set<string>();
    openai.byDate.forEach(d => dateSet.add(d.date));
    pinecone.byDate.forEach(d => dateSet.add(d.date));
    gcp.byDate.forEach(d => dateSet.add(d.date));

    // Create lookup maps for each provider
    const openaiByDate = new Map(openai.byDate.map(d => [d.date, d.costUSD]));
    const pineconeByDate = new Map(pinecone.byDate.map(d => [d.date, d.costUSD]));
    const gcpByDate = new Map(gcp.byDate.map(d => [d.date, d.costUSD]));

    // Sort dates and create combined data
    const sortedDates = Array.from(dateSet).sort();

    return sortedDates.map(date => ({
      date,
      displayDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      openai: openaiByDate.get(date) || 0,
      pinecone: pineconeByDate.get(date) || 0,
      gcp: gcpByDate.get(date) || 0,
      total: (openaiByDate.get(date) || 0) + (pineconeByDate.get(date) || 0) + (gcpByDate.get(date) || 0),
    }));
  }, [billingData]);

  // Check if there's any trend data to show
  const hasTrendData = trendData.length > 0 && trendData.some(d => d.total > 0);

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value < 0.01 && value > 0) {
      return `$${value.toFixed(6)}`;
    }
    return `$${value.toFixed(2)}`;
  };

  // Format variance percentage
  const formatVariance = (value: number | null): string => {
    if (value === null) return 'N/A';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  // Get variance color class
  const getVarianceColor = (value: number | null): string => {
    if (value === null) return 'text-gray-500';
    if (value > 20) return 'text-red-600';
    if (value > 0) return 'text-amber-600';
    if (value < -20) return 'text-green-600';
    return 'text-green-500';
  };

  // Get data source badge
  const getDataSourceBadge = (source: string): React.ReactElement => {
    switch (source) {
      case 'api':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            Live API
          </span>
        );
      case 'cached':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            Cached
          </span>
        );
      case 'unavailable':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            Estimated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
            {source}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Actual vs Estimated Costs</h2>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">Loading billing data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Actual vs Estimated Costs</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => fetchBillingData()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!billingData) {
    return null;
  }

  const { totals, openai, pinecone, gcp } = billingData;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Actual vs Estimated Costs</h2>
          <p className="text-sm text-gray-500 mt-1">
            Compare real billing data with our tracking estimates
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-gray-400">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
          >
            {refreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Refreshing...
              </>
            ) : (
              <>
                <span>🔄</span>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Provider
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estimated
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actual
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Variance
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* OpenAI Row */}
            <tr>
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <span className="text-xl mr-2">🤖</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">OpenAI</div>
                    <div className="text-xs text-gray-500">GPT-4, Embeddings, Whisper</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatCurrency(totals.estimated.openai)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                {formatCurrency(totals.actual.openai)}
              </td>
              <td className={`px-4 py-4 whitespace-nowrap text-right text-sm font-medium ${getVarianceColor(totals.variance.openaiPercent)}`}>
                {formatVariance(totals.variance.openaiPercent)}
                <div className="text-xs font-normal text-gray-500">
                  ({totals.variance.openai >= 0 ? '+' : ''}{formatCurrency(totals.variance.openai)})
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-center">
                {getDataSourceBadge(openai.dataSource)}
              </td>
            </tr>

            {/* OpenAI Sub-Rows (per model) */}
            {openai.dataSource !== 'unavailable' && Object.entries(openai.byModel)
              .filter(([, stats]) => stats.costUSD > 0)
              .sort((a, b) => b[1].costUSD - a[1].costUSD)
              .map(([model, stats]) => (
                <tr key={`openai-${model}`} className="bg-gray-50/50">
                  <td className="px-4 py-2 whitespace-nowrap pl-12">
                    <div className="text-xs text-gray-500">
                      {model}
                      {stats.requests > 0 && ` (${stats.requests.toLocaleString()} requests)`}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right text-xs text-gray-500">
                    —
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right text-xs text-gray-600">
                    {formatCurrency(stats.costUSD)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right text-xs text-gray-400">
                    {stats.tokens >= 1_000_000
                      ? `${(stats.tokens / 1_000_000).toFixed(1)}M tokens`
                      : stats.tokens >= 1_000
                        ? `${(stats.tokens / 1_000).toFixed(1)}K tokens`
                        : stats.tokens > 0
                          ? `${stats.tokens} tokens`
                          : ''}
                  </td>
                  <td className="px-4 py-2"></td>
                </tr>
              ))}

            {/* Pinecone Total Row */}
            <tr>
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <span className="text-xl mr-2">🌲</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Pinecone</div>
                    <div className="text-xs text-gray-500">Vector storage & queries</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatCurrency(totals.estimated.pinecone)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                {formatCurrency(totals.actual.pinecone)}
              </td>
              <td className={`px-4 py-4 whitespace-nowrap text-right text-sm font-medium ${getVarianceColor(totals.variance.pineconePercent)}`}>
                {formatVariance(totals.variance.pineconePercent)}
                <div className="text-xs font-normal text-gray-500">
                  ({totals.variance.pinecone >= 0 ? '+' : ''}{formatCurrency(totals.variance.pinecone)})
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-center">
                {getDataSourceBadge(pinecone.dataSource)}
              </td>
            </tr>

            {/* Pinecone Storage Sub-Row */}
            <tr className="bg-gray-50/50">
              <td className="px-4 py-2 whitespace-nowrap pl-12">
                <div className="text-xs text-gray-500">Storage ({pinecone.storageGB.toFixed(4)} GB)</div>
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-right text-xs text-gray-500">
                —
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-right text-xs text-gray-600">
                {formatCurrency(pinecone.storageCostUSD || 0)}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-right text-xs text-gray-400">
                ${(pinecone.storageGB * 0.25).toFixed(2)}/mo
              </td>
              <td className="px-4 py-2"></td>
            </tr>

            {/* Pinecone Operations Sub-Row */}
            <tr className="bg-gray-50/50">
              <td className="px-4 py-2 whitespace-nowrap pl-12">
                <div className="text-xs text-gray-500">
                  Operations ({pinecone.readUnits.toLocaleString()} reads, {pinecone.writeUnits.toLocaleString()} writes)
                </div>
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-right text-xs text-gray-500">
                —
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-right text-xs text-gray-600">
                {formatCurrency(pinecone.operationsCostUSD || 0)}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-right text-xs text-gray-400">
                R: $0.40/1M · W: $2.00/1M
              </td>
              <td className="px-4 py-2"></td>
            </tr>

            {/* GCP/Firebase Row */}
            <tr>
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <span className="text-xl mr-2">🔥</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">GCP / Firebase</div>
                    <div className="text-xs text-gray-500">Firestore, Storage, Functions</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatCurrency(totals.estimated.infrastructure)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                {formatCurrency(totals.actual.gcp)}
              </td>
              <td className={`px-4 py-4 whitespace-nowrap text-right text-sm font-medium ${getVarianceColor(totals.variance.infrastructurePercent)}`}>
                {formatVariance(totals.variance.infrastructurePercent)}
                <div className="text-xs font-normal text-gray-500">
                  ({totals.variance.infrastructure >= 0 ? '+' : ''}{formatCurrency(totals.variance.infrastructure)})
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-center">
                {getDataSourceBadge(gcp.dataSource)}
              </td>
            </tr>

            {/* GCP Sub-Rows (per service) */}
            {gcp.dataSource !== 'unavailable' && Object.entries(gcp.byService)
              .filter(([, cost]) => cost > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([service, cost]) => (
                <tr key={`gcp-${service}`} className="bg-gray-50/50">
                  <td className="px-4 py-2 whitespace-nowrap pl-12">
                    <div className="text-xs text-gray-500 capitalize">{service}</div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right text-xs text-gray-500">
                    —
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right text-xs text-gray-600">
                    {formatCurrency(cost)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right text-xs text-gray-400">
                  </td>
                  <td className="px-4 py-2"></td>
                </tr>
              ))}

            {/* Total Row */}
            <tr className="bg-gray-50">
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <span className="text-xl mr-2">💰</span>
                  <div className="text-sm font-bold text-gray-900">Grand Total</div>
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                {formatCurrency(totals.estimated.grandTotal)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                {formatCurrency(totals.actual.grandTotal)}
              </td>
              <td className={`px-4 py-4 whitespace-nowrap text-right text-sm font-bold ${getVarianceColor(totals.variance.grandTotalPercent)}`}>
                {formatVariance(totals.variance.grandTotalPercent)}
                <div className="text-xs font-normal text-gray-500">
                  ({totals.variance.grandTotal >= 0 ? '+' : ''}{formatCurrency(totals.variance.grandTotal)})
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-center">
                {/* No badge for total */}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Cost Trend by Provider */}
      {hasTrendData && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Trend by Provider</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOpenai" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PROVIDER_COLORS.openai} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={PROVIDER_COLORS.openai} stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorPinecone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PROVIDER_COLORS.pinecone} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={PROVIDER_COLORS.pinecone} stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorGcp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PROVIDER_COLORS.gcp} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={PROVIDER_COLORS.gcp} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value, name) => [
                    `$${(typeof value === 'number' ? value : 0).toFixed(4)}`,
                    name === 'openai' ? 'OpenAI' : name === 'pinecone' ? 'Pinecone' : 'GCP/Firebase'
                  ]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend
                  formatter={(value) =>
                    value === 'openai' ? 'OpenAI' : value === 'pinecone' ? 'Pinecone' : 'GCP/Firebase'
                  }
                />
                <Area
                  type="monotone"
                  dataKey="openai"
                  stackId="1"
                  stroke={PROVIDER_COLORS.openai}
                  fill="url(#colorOpenai)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="pinecone"
                  stackId="1"
                  stroke={PROVIDER_COLORS.pinecone}
                  fill="url(#colorPinecone)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="gcp"
                  stackId="1"
                  stroke={PROVIDER_COLORS.gcp}
                  fill="url(#colorGcp)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PROVIDER_COLORS.openai }} />
                <span className="text-gray-600">OpenAI</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PROVIDER_COLORS.pinecone }} />
                <span className="text-gray-600">Pinecone</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PROVIDER_COLORS.gcp }} />
                <span className="text-gray-600">GCP/Firebase</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Provider Details */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* OpenAI Details */}
        {openai.dataSource !== 'unavailable' && Object.keys(openai.byModel).length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">OpenAI by Model</h4>
            <div className="space-y-1">
              {Object.entries(openai.byModel)
                .sort((a, b) => b[1].costUSD - a[1].costUSD)
                .slice(0, 5)
                .map(([model, stats]) => (
                  <div key={model} className="flex justify-between text-xs">
                    <span className="text-gray-600">{model}</span>
                    <span className="text-gray-900 font-medium">${stats.costUSD.toFixed(4)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Pinecone Details */}
        {pinecone.dataSource !== 'unavailable' && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Pinecone Usage</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Read Units</span>
                <span className="text-gray-900 font-medium">{pinecone.readUnits.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Write Units</span>
                <span className="text-gray-900 font-medium">{pinecone.writeUnits.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Storage</span>
                <span className="text-gray-900 font-medium">{pinecone.storageGB.toFixed(4)} GB</span>
              </div>
            </div>
          </div>
        )}

        {/* GCP Details */}
        {gcp.dataSource !== 'unavailable' && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">GCP by Service</h4>
            <div className="space-y-1 text-xs">
              {Object.entries(gcp.byService)
                .filter((entry) => entry[1] > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([service, cost]) => (
                  <div key={service} className="flex justify-between">
                    <span className="text-gray-600 capitalize">{service}</span>
                    <span className="text-gray-900 font-medium">${cost.toFixed(4)}</span>
                  </div>
                ))}
              {Object.values(gcp.byService).every(cost => cost === 0) && (
                <p className="text-gray-500 italic">No costs recorded</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <span className="text-blue-500">ℹ️</span>
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">About Billing Data Sources</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Live API:</strong> Real-time data from provider APIs (most accurate)
              </li>
              <li>
                <strong>Cached:</strong> Data cached for performance (refreshes periodically)
              </li>
              <li>
                <strong>Estimated:</strong> Calculated from our tracking (may differ from actual billing)
              </li>
            </ul>
            {!gcp.billingExportEnabled && (
              <p className="mt-2 text-xs">
                <strong>Note:</strong> GCP billing uses estimates. For accurate data, enable{' '}
                <a
                  href="https://cloud.google.com/billing/docs/how-to/export-data-bigquery"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-800"
                >
                  BigQuery billing export
                </a>.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
