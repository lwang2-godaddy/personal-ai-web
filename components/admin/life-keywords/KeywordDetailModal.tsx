'use client';

import React from 'react';
import Link from 'next/link';
import { DetailModalShell, InfoGrid, formatDateFull } from '@/components/admin/shared';
import type { LifeKeyword } from '@/components/admin/shared';

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

interface KeywordDetailModalProps {
  keyword: LifeKeyword;
  onClose: () => void;
  execution?: PromptExecution | null;
  loadingExecution?: boolean;
}

const CATEGORIES: Record<string, { label: string; color: string }> = {
  health: { label: 'Health', color: '#F44336' },
  fitness: { label: 'Fitness', color: '#FF5722' },
  nutrition: { label: 'Nutrition', color: '#FF9800' },
  sleep: { label: 'Sleep', color: '#3F51B5' },
  social: { label: 'Social', color: '#E91E63' },
  work: { label: 'Work', color: '#607D8B' },
  hobby: { label: 'Hobby', color: '#9C27B0' },
  travel: { label: 'Travel', color: '#00BCD4' },
  emotion: { label: 'Emotion', color: '#FFC107' },
  productivity: { label: 'Productivity', color: '#4CAF50' },
  learning: { label: 'Learning', color: '#03A9F4' },
  general: { label: 'General', color: '#795548' },
};

const PERIOD_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

function getCategoryMeta(category: string) {
  return CATEGORIES[category] || { label: category, color: '#999' };
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

export default function KeywordDetailModal({ keyword, onClose, execution, loadingExecution }: KeywordDetailModalProps) {
  const catMeta = getCategoryMeta(keyword.category);

  // Compute cluster ranking score
  const confidence = keyword.confidence ?? 0;
  const dataPointCount = keyword.dataPointCount ?? 0;
  const clusterScore = confidence * Math.sqrt(dataPointCount);

  return (
    <DetailModalShell
      icon={keyword.emoji || '🔑'}
      title="Keyword Details"
      subtitle={`${catMeta.label} · ${PERIOD_LABELS[keyword.periodType] || keyword.periodType}`}
      onClose={onClose}
    >
      {/* Basic Info */}
      <InfoGrid
        items={[
          { label: 'Keyword ID', value: keyword.id, mono: true },
          { label: 'User ID', value: keyword.userId, mono: true },
          { label: 'Generated', value: formatDateFull(keyword.generatedAt) },
          {
            label: 'Confidence',
            value: keyword.confidence !== undefined ? `${(keyword.confidence * 100).toFixed(1)}%` : '-',
          },
        ]}
      />

      {/* Keyword Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <span>🔑</span> Keyword
        </h3>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-start gap-2">
            {keyword.emoji && <span className="text-2xl">{keyword.emoji}</span>}
            <div className="flex-1">
              <p className="text-lg font-semibold text-gray-900">{keyword.keyword}</p>
              <p className="text-gray-700 mt-2 whitespace-pre-wrap">{keyword.description}</p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-2">
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: catMeta.color }}
            >
              {catMeta.label}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
              {PERIOD_LABELS[keyword.periodType] || keyword.periodType}
            </span>
          </div>

          {(keyword.periodStart || keyword.periodEnd) && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Period Range:</p>
              <p className="text-sm text-gray-700">
                {formatDateFull(keyword.periodStart)} - {formatDateFull(keyword.periodEnd)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Scores */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <span>📊</span> Scores & Metrics
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-md p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {keyword.confidence !== undefined ? `${(keyword.confidence * 100).toFixed(0)}%` : '-'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Confidence</p>
          </div>
          <div className="bg-gray-50 rounded-md p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {keyword.dominanceScore !== undefined ? `${(keyword.dominanceScore * 100).toFixed(0)}%` : '-'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Dominance</p>
          </div>
          <div className="bg-gray-50 rounded-md p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{keyword.dataPointCount ?? '-'}</p>
            <p className="text-xs text-gray-500 mt-1">Data Points</p>
          </div>
        </div>
      </div>

      {/* Cluster Stats */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <span>🧮</span> Cluster Stats
        </h3>
        <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
          <p className="text-sm text-teal-800 mb-2">
            This keyword was generated from a cluster ranked by the formula:
          </p>
          <div className="bg-white rounded-md p-3 border border-teal-100 text-center">
            <p className="text-xs text-teal-600 mb-1">Ranking Score</p>
            <p className="text-sm font-mono text-teal-900">
              score = cohesion × √(cluster_size)
            </p>
            <p className="text-lg font-mono font-bold text-teal-800 mt-1">
              {confidence.toFixed(3)} × √({dataPointCount}) = {clusterScore.toFixed(3)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
            <div>
              <span className="text-teal-600">Cohesion (confidence):</span>
              <span className="ml-1 font-mono text-teal-900">{confidence.toFixed(3)}</span>
            </div>
            <div>
              <span className="text-teal-600">Cluster size:</span>
              <span className="ml-1 font-mono text-teal-900">{dataPointCount} vectors</span>
            </div>
            {keyword.dominanceScore !== undefined && (
              <div className="col-span-2">
                <span className="text-teal-600">Dominance (cluster/total):</span>
                <span className="ml-1 font-mono text-teal-900">{(keyword.dominanceScore * 100).toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generation Info */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <span>🤖</span> Generation Info
        </h3>

        {loadingExecution ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            Loading execution data...
          </div>
        ) : execution ? (
          <div className="bg-white rounded-md border border-gray-200 p-4">
            {/* Stats Grid */}
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

            {/* Execution Metadata */}
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
                  href={`/admin/prompts/KeywordGenerator?prompt=${execution.promptId}`}
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
                <span className="ml-1 text-gray-900">{formatDate(execution.executedAt)}</span>
              </div>
            </div>

            {/* Input/Output Summaries */}
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
          /* Fallback: no execution record found */
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
                <span className="text-gray-500">Temperature:</span>
                <span className="ml-1 text-gray-900">0.8</span>
              </div>
              <div>
                <span className="text-gray-500">Prompt ID:</span>
                <Link
                  href="/admin/prompts/KeywordGenerator"
                  className="ml-1 font-mono text-teal-600 hover:text-teal-800 hover:underline"
                >
                  {keyword.periodType}_keyword
                </Link>
              </div>
              <div>
                <span className="text-gray-500">Response format:</span>
                <span className="ml-1 text-gray-900">JSON mode</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Execution records are matched heuristically by service, category, period type, and timestamp proximity.
              The record may have been pruned or the keyword was generated before execution tracking was enabled.
            </p>
          </div>
        )}
      </div>

      {/* Related Data Types */}
      {keyword.relatedDataTypes && keyword.relatedDataTypes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>🔗</span> Related Data Types
          </h3>
          <div className="flex flex-wrap gap-2">
            {keyword.relatedDataTypes.map((dtype, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
              >
                {dtype}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sample Data Points */}
      {keyword.sampleDataPoints && keyword.sampleDataPoints.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>📋</span> Sample Data Points ({keyword.sampleDataPoints.length})
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {keyword.sampleDataPoints.map((dp, index) => (
              <div key={index} className="bg-gray-50 rounded-md p-3 border border-gray-200 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
                    {dp.type}
                  </span>
                  {dp.date && <span className="text-xs text-gray-400">{formatDateFull(dp.date)}</span>}
                </div>
                <p className="text-gray-700">{dp.snippet}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engagement Status */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <span>👁️</span> Engagement Status
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-md p-3 text-center">
            <span className="text-xl">{keyword.viewed ? '✓' : '○'}</span>
            <p className="text-xs text-gray-500 mt-1">Viewed</p>
          </div>
          <div className="bg-gray-50 rounded-md p-3 text-center">
            <span className="text-xl">{keyword.expanded ? '✓' : '○'}</span>
            <p className="text-xs text-gray-500 mt-1">Expanded</p>
          </div>
          <div className="bg-gray-50 rounded-md p-3 text-center">
            <span className="text-xl">{keyword.hidden ? '🚫' : '○'}</span>
            <p className="text-xs text-gray-500 mt-1">Hidden</p>
          </div>
        </div>
      </div>
    </DetailModalShell>
  );
}
