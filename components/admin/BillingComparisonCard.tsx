'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api/client';
import type { CombinedBillingResponse, CombinedBillingData } from '@/lib/models/BillingData';

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

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const handleRefresh = () => {
    fetchBillingData(true);
  };

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

            {/* Pinecone Row */}
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
