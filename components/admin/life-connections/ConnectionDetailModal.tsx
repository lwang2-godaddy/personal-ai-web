'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DetailModalShell, InfoGrid, formatDateFull } from '@/components/admin/shared';
import type { LifeConnection } from '@/components/admin/shared';

interface PromptExecution {
  id: string;
  userId: string;
  service: string;
  promptId: string;
  language: string;
  promptVersion: string;
  promptSource: string;
  model: string;
  temperature: number;
  maxTokens: number;
  inputSummary: string;
  inputTokens: number;
  outputSummary: string;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  executedAt: string;
  metadata?: Record<string, unknown>;
}

interface ConnectionDetailModalProps {
  connection: LifeConnection;
  onClose: () => void;
  execution?: PromptExecution | null;
  loadingExecution?: boolean;
}

const CATEGORIES: Record<string, { label: string; color: string }> = {
  'health-activity': { label: 'Health-Activity', color: '#4CAF50' },
  'mood-activity': { label: 'Mood-Activity', color: '#E91E63' },
  'mood-health': { label: 'Mood-Health', color: '#9C27B0' },
  'health-time': { label: 'Health-Time', color: '#2196F3' },
  'activity-sequence': { label: 'Activity Sequence', color: '#FF9800' },
};

function getCategoryMeta(category: string) {
  return CATEGORIES[category] || { label: category, color: '#999' };
}

function formatTimestamp(ts: number | string | undefined): string {
  if (!ts) return '-';
  try {
    const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
    return date.toLocaleString();
  } catch {
    return String(ts);
  }
}

export default function ConnectionDetailModal({
  connection,
  onClose,
  execution,
  loadingExecution,
}: ConnectionDetailModalProps) {
  const catMeta = getCategoryMeta(connection.category);
  const [showAllDataPoints, setShowAllDataPoints] = useState(false);

  const displayedDataPoints = showAllDataPoints
    ? connection.dataPoints
    : connection.dataPoints.slice(0, 10);

  return (
    <DetailModalShell
      icon="🔗"
      title="Connection Details"
      subtitle={`${catMeta.label} · ${connection.strength} · ${connection.direction}`}
      onClose={onClose}
    >
      {/* Basic Info */}
      <InfoGrid
        items={[
          { label: 'Connection ID', value: connection.id, mono: true },
          { label: 'User ID', value: connection.userId, mono: true },
          { label: 'Detected', value: formatTimestamp(connection.detectedAt) },
          { label: 'Expires', value: formatTimestamp(connection.expiresAt) },
        ]}
      />

      {/* Domains */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <span>🔗</span> Connected Domains
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-xs font-medium text-blue-600 mb-1">Domain A</p>
            <p className="text-lg font-semibold text-blue-900">{connection.domainA.displayName}</p>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{connection.domainA.type}</span>
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono">{connection.domainA.metric}</span>
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <p className="text-xs font-medium text-purple-600 mb-1">Domain B</p>
            <p className="text-lg font-semibold text-purple-900">{connection.domainB.displayName}</p>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{connection.domainB.type}</span>
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-mono">{connection.domainB.metric}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistical Metrics */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <span>📊</span> Statistical Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded-md p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{connection.metrics.coefficient.toFixed(3)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {connection.metrics.correlationType === 'spearman' ? 'Spearman \u03C1' : 'Pearson r'}
            </p>
            {connection.metrics.pearsonR !== undefined && (
              <p className="text-[10px] text-gray-400 mt-0.5">Pearson r = {connection.metrics.pearsonR.toFixed(3)}</p>
            )}
          </div>
          <div className="bg-gray-50 rounded-md p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {(connection.metrics.adjustedPValue ?? connection.metrics.pValue).toFixed(4)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {connection.metrics.adjustedPValue !== undefined ? 'Adjusted p-value' : 'p-value'}
            </p>
            {connection.metrics.adjustedPValue !== undefined && (
              <p className="text-[10px] text-gray-400 mt-0.5">Raw: {connection.metrics.pValue.toFixed(4)}</p>
            )}
          </div>
          <div className="bg-gray-50 rounded-md p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{connection.metrics.effectSize.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Cohen&apos;s d</p>
          </div>
          <div className="bg-gray-50 rounded-md p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{connection.metrics.sampleSize}</p>
            <p className="text-xs text-gray-500 mt-1">Sample Size</p>
            {connection.metrics.effectiveSampleSize !== undefined && connection.metrics.effectiveSampleSize !== connection.metrics.sampleSize && (
              <p className="text-[10px] text-gray-400 mt-0.5">Effective: {connection.metrics.effectiveSampleSize}</p>
            )}
          </div>
        </div>
        {connection.metrics.confidenceInterval && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            95% CI: [{connection.metrics.confidenceInterval.lower.toFixed(3)}, {connection.metrics.confidenceInterval.upper.toFixed(3)}]
            {connection.metrics.autocorrelation !== undefined && (
              <span className="ml-3">Lag-1 autocorr: {connection.metrics.autocorrelation.toFixed(3)}</span>
            )}
          </div>
        )}
        <div className="mt-2 flex items-center justify-center gap-4 text-xs">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium text-white`}
            style={{ backgroundColor: catMeta.color }}
          >
            {catMeta.label}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
            connection.direction === 'positive' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {connection.direction === 'positive' ? 'Positive' : 'Negative'}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
            connection.strength === 'strong' ? 'bg-red-100 text-red-700' :
            connection.strength === 'moderate' ? 'bg-amber-100 text-amber-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {connection.strength.charAt(0).toUpperCase() + connection.strength.slice(1)}
          </span>
        </div>
      </div>

      {/* With vs Without Comparison */}
      {connection.withWithout && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>📊</span> With vs Without Comparison
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="text-center">
                <p className="text-xs font-medium text-green-600 mb-1">
                  With {connection.domainA.displayName}
                </p>
                <p className="text-2xl font-bold text-green-800">
                  {connection.withWithout.withActivity.mean.toFixed(1)}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  median: {connection.withWithout.withActivity.median.toFixed(1)} ({connection.withWithout.withActivity.count} days)
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Without {connection.domainA.displayName}
                </p>
                <p className="text-2xl font-bold text-gray-700">
                  {connection.withWithout.withoutActivity.mean.toFixed(1)}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  median: {connection.withWithout.withoutActivity.median.toFixed(1)} ({connection.withWithout.withoutActivity.count} days)
                </p>
              </div>
            </div>
            {/* Visual bar comparison */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 w-16 text-right">With</span>
                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (connection.withWithout.withActivity.mean / Math.max(connection.withWithout.withActivity.mean, connection.withWithout.withoutActivity.mean)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 w-16 text-right">Without</span>
                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gray-400 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (connection.withWithout.withoutActivity.mean / Math.max(connection.withWithout.withActivity.mean, connection.withWithout.withoutActivity.mean)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 text-center">
              <span className={`text-lg font-bold ${connection.withWithout.percentDifference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {connection.withWithout.percentDifference > 0 ? '+' : ''}{connection.withWithout.percentDifference.toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500 ml-1">
                ({connection.withWithout.absoluteDifference > 0 ? '+' : ''}{connection.withWithout.absoluteDifference.toFixed(1)} {connection.domainB.displayName})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Confounder Analysis */}
      {connection.survivesConfounderControl !== undefined && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>🔬</span> Confounder Analysis
          </h3>
          <div className={`rounded-lg p-4 border ${
            connection.survivesConfounderControl
              ? 'bg-green-50 border-green-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                connection.survivesConfounderControl
                  ? 'bg-green-100 text-green-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {connection.survivesConfounderControl ? 'Survives weekday control' : 'May be weekend-driven'}
              </span>
            </div>
            {connection.confounderPartialR !== undefined && (
              <p className="text-xs text-gray-600">
                Partial correlation (controlling for day-of-week): <span className="font-mono font-semibold">{connection.confounderPartialR.toFixed(3)}</span>
              </p>
            )}
            {connection.confounderNote && (
              <p className="text-xs text-gray-500 mt-1">{connection.confounderNote}</p>
            )}
          </div>
        </div>
      )}

      {/* Trend Direction */}
      {connection.trendDirection && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>📈</span> Correlation Trend
          </h3>
          <div className={`rounded-lg p-4 border ${
            connection.trendDirection === 'strengthening' ? 'bg-green-50 border-green-200' :
            connection.trendDirection === 'weakening' ? 'bg-red-50 border-red-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              connection.trendDirection === 'strengthening' ? 'bg-green-100 text-green-800' :
              connection.trendDirection === 'weakening' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-700'
            }`}>
              {connection.trendDirection === 'strengthening' ? 'Strengthening over time' :
               connection.trendDirection === 'weakening' ? 'Weakening over time' :
               'Stable over time'}
            </span>
          </div>
        </div>
      )}

      {/* AI Content */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <span>🤖</span> AI-Generated Content
          {!connection.aiGenerated && (
            <span className="text-xs text-orange-500 font-normal">(Template fallback)</span>
          )}
        </h3>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Title</p>
            <p className="text-sm font-semibold text-gray-900">{connection.title}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{connection.description}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Explanation</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{connection.explanation}</p>
          </div>
          {connection.recommendation && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                Recommendation ({connection.recommendation.actionType})
              </p>
              <p className="text-sm text-gray-700">{connection.recommendation.text}</p>
            </div>
          )}
        </div>
      </div>

      {/* Time Lag */}
      {connection.timeLag && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>⏱️</span> Time Lag
          </h3>
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-amber-600">Lag Days:</span>
                <span className="ml-1 font-bold text-amber-900">{connection.timeLag.days}</span>
              </div>
              <div>
                <span className="text-amber-600">Direction:</span>
                <span className="ml-1 font-bold text-amber-900">
                  {connection.timeLag.direction.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Points Table */}
      {connection.dataPoints && connection.dataPoints.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>📋</span> Data Points ({connection.dataPoints.length})
          </h3>
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Date</th>
                  <th className="text-right py-2 px-3 text-blue-600 font-medium">
                    {connection.domainA.displayName}
                  </th>
                  <th className="text-right py-2 px-3 text-purple-600 font-medium">
                    {connection.domainB.displayName}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedDataPoints.map((dp, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-1.5 px-3 text-gray-700 font-mono">{dp.date}</td>
                    <td className="py-1.5 px-3 text-right text-gray-900 font-mono">
                      {typeof dp.valueA === 'number' ? dp.valueA.toFixed(2) : dp.valueA}
                    </td>
                    <td className="py-1.5 px-3 text-right text-gray-900 font-mono">
                      {typeof dp.valueB === 'number' ? dp.valueB.toFixed(2) : dp.valueB}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {connection.dataPoints.length > 10 && (
            <button
              onClick={() => setShowAllDataPoints(!showAllDataPoints)}
              className="mt-2 text-xs text-indigo-600 hover:text-indigo-800"
            >
              {showAllDataPoints
                ? 'Show fewer'
                : `Show all ${connection.dataPoints.length} data points`}
            </button>
          )}
        </div>
      )}

      {/* Engagement Status */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <span>👁️</span> Engagement Status
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-md p-3 text-center">
            <span className="text-xl">{connection.dismissed ? '🚫' : '○'}</span>
            <p className="text-xs text-gray-500 mt-1">Dismissed</p>
          </div>
          <div className="bg-gray-50 rounded-md p-3 text-center">
            <span className="text-xl">
              {connection.userRating === 'helpful' ? '👍' :
               connection.userRating === 'not_helpful' ? '👎' : '○'}
            </span>
            <p className="text-xs text-gray-500 mt-1">Rating</p>
          </div>
          <div className="bg-gray-50 rounded-md p-3 text-center">
            <span className="text-xl">{connection.aiGenerated ? '🤖' : '📝'}</span>
            <p className="text-xs text-gray-500 mt-1">{connection.aiGenerated ? 'AI Generated' : 'Template'}</p>
          </div>
        </div>
      </div>

      {/* Execution Data */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <span>⚙️</span> Generation Info
        </h3>

        {loadingExecution ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            Loading execution data...
          </div>
        ) : execution ? (
          <div className="bg-white rounded-md border border-gray-200 p-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="bg-blue-50 rounded-md p-2 text-center">
                <p className="text-xs text-blue-600 font-medium">Total Tokens</p>
                <p className="text-lg font-bold text-blue-900">
                  {execution.totalTokens.toLocaleString()}
                </p>
                <p className="text-xs text-blue-500">
                  {execution.inputTokens.toLocaleString()} in / {execution.outputTokens.toLocaleString()} out
                </p>
              </div>
              <div className="bg-green-50 rounded-md p-2 text-center">
                <p className="text-xs text-green-600 font-medium">Cost</p>
                <p className="text-lg font-bold text-green-900">
                  ${execution.estimatedCostUSD.toFixed(6)}
                </p>
              </div>
              <div className="bg-amber-50 rounded-md p-2 text-center">
                <p className="text-xs text-amber-600 font-medium">Latency</p>
                <p className="text-lg font-bold text-amber-900">
                  {execution.latencyMs.toLocaleString()}ms
                </p>
              </div>
              <div className={`rounded-md p-2 text-center ${execution.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`text-xs font-medium ${execution.success ? 'text-green-600' : 'text-red-600'}`}>
                  Status
                </p>
                <p className={`text-lg font-bold ${execution.success ? 'text-green-900' : 'text-red-900'}`}>
                  {execution.success ? 'Success' : 'Failed'}
                </p>
                {execution.errorMessage && (
                  <p className="text-xs text-red-500 mt-1">{execution.errorMessage}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 text-sm border-t border-gray-100 pt-3">
              <div>
                <span className="text-gray-500">Model:</span>
                <span className="ml-1 font-mono text-gray-900">{execution.model}</span>
              </div>
              <div>
                <span className="text-gray-500">Temperature:</span>
                <span className="ml-1 text-gray-900">{execution.temperature}</span>
              </div>
              <div>
                <span className="text-gray-500">Prompt ID:</span>
                <Link
                  href={`/admin/prompts/LifeConnectionsService?prompt=${execution.promptId}`}
                  className="ml-1 font-mono text-teal-600 hover:text-teal-800 hover:underline"
                >
                  {execution.promptId}
                </Link>
              </div>
              <div>
                <span className="text-gray-500">Language:</span>
                <span className="ml-1 text-gray-900">{execution.language}</span>
              </div>
              <div>
                <span className="text-gray-500">Prompt Source:</span>
                <span className="ml-1 text-gray-900">{execution.promptSource}</span>
              </div>
              <div>
                <span className="text-gray-500">Executed:</span>
                <span className="ml-1 text-gray-900">{formatDateFull(execution.executedAt)}</span>
              </div>
            </div>

            {(execution.inputSummary || execution.outputSummary) && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                {execution.inputSummary && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Input Summary:</p>
                    <p className="text-xs text-gray-700 font-mono bg-gray-50 p-2 rounded whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {execution.inputSummary}
                    </p>
                  </div>
                )}
                {execution.outputSummary && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Output Summary:</p>
                    <p className="text-xs text-gray-700 font-mono bg-gray-50 p-2 rounded whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {execution.outputSummary}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-3">
              No matching execution record found. Known generation parameters:
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Model:</span>
                <span className="ml-1 font-mono text-gray-900">gpt-4o-mini</span>
              </div>
              <div>
                <span className="text-gray-500">Prompt IDs:</span>
                <Link
                  href="/admin/prompts/LifeConnectionsService"
                  className="ml-1 font-mono text-teal-600 hover:text-teal-800 hover:underline"
                >
                  generate_title, explain_correlation, generate_recommendation
                </Link>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Execution records are matched heuristically by service, userId, and timestamp proximity.
              The record may have been pruned or the connection was generated before execution tracking was enabled.
            </p>
          </div>
        )}
      </div>
    </DetailModalShell>
  );
}
