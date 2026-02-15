'use client';

import React from 'react';
import Link from 'next/link';
import { DetailModalShell, InfoGrid, formatDateFull, isExpired } from '@/components/admin/shared';
import type { FunFact } from '@/components/admin/shared';

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

interface FunFactDetailModalProps {
  fact: FunFact;
  onClose: () => void;
  execution?: PromptExecution | null;
  loadingExecution?: boolean;
}

const CATEGORIES: Record<string, { label: string; color: string }> = {
  health: { label: 'Health', color: '#F44336' },
  activity: { label: 'Activity', color: '#FF5722' },
  location: { label: 'Location', color: '#4CAF50' },
  social: { label: 'Social', color: '#E91E63' },
  productivity: { label: 'Productivity', color: '#3F51B5' },
  general: { label: 'General', color: '#607D8B' },
  pattern: { label: 'Pattern', color: '#9C27B0' },
  statistic: { label: 'Statistic', color: '#00BCD4' },
  achievement: { label: 'Achievement', color: '#FF9800' },
  milestone: { label: 'Milestone', color: '#795548' },
};

const PERIOD_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

function getCategoryMeta(category: string | undefined) {
  if (!category) return { label: 'Unknown', color: '#999' };
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

export default function FunFactDetailModal({ fact, onClose, execution, loadingExecution }: FunFactDetailModalProps) {
  const catMeta = getCategoryMeta(fact.category);
  const expired = isExpired(fact.expiresAt);

  return (
    <DetailModalShell
      icon={fact.emoji || '🎲'}
      title="Fun Fact Details"
      subtitle={`${catMeta.label} · AI-generated`}
      onClose={onClose}
    >
      {/* Basic Info */}
      <InfoGrid
        items={[
          { label: 'Fact ID', value: fact.id, mono: true },
          { label: 'User ID', value: fact.userId, mono: true },
          { label: 'Generated', value: formatDateFull(fact.generatedAt) },
          {
            label: 'Confidence',
            value: fact.confidence !== undefined ? `${(fact.confidence * 100).toFixed(1)}%` : '-',
          },
        ]}
      />

      {/* Fact Content */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <span>📝</span> Content
        </h3>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-start gap-2">
            {fact.emoji && <span className="text-2xl">{fact.emoji}</span>}
            <p className="text-gray-900 whitespace-pre-wrap flex-1">{fact.text || '-'}</p>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-2">
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: catMeta.color }}
            >
              {catMeta.label}
            </span>
            {fact.insightType && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                ['health_stat', 'activity_stat', 'location_stat'].includes(fact.insightType)
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {fact.insightType}
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              ['health_stat', 'activity_stat', 'location_stat'].includes(fact.insightType || '')
                ? 'bg-blue-50 text-blue-600'
                : 'bg-purple-50 text-purple-600'
            }`}>
              {['health_stat', 'activity_stat', 'location_stat'].includes(fact.insightType || '') ? 'Data Stat' : 'AI Insight'}
            </span>
          </div>

          {(fact.periodStart || fact.periodEnd) && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Period:</p>
              <p className="text-sm text-gray-700">
                {fact.periodType && <span className="font-medium mr-2">[{PERIOD_LABELS[fact.periodType] || fact.periodType}]</span>}
                {fact.periodLabel && <span className="text-gray-500 mr-2">({fact.periodLabel})</span>}
                {formatDateFull(fact.periodStart)} - {formatDateFull(fact.periodEnd)}
              </p>
            </div>
          )}

          {fact.expiresAt && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Expires:</p>
              <p className={`text-sm ${expired ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                {formatDateFull(fact.expiresAt)}
                {expired && ' (Expired)'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Scores & Metrics */}
      {(
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>📊</span> Scores & Metrics
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-md p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {fact.confidence !== undefined ? `${(fact.confidence * 100).toFixed(0)}%` : '-'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Confidence</p>
            </div>
            <div className="bg-gray-50 rounded-md p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{fact.dataPointCount ?? '-'}</p>
              <p className="text-xs text-gray-500 mt-1">Data Points</p>
            </div>
            <div className="bg-gray-50 rounded-md p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {fact.periodType ? (PERIOD_LABELS[fact.periodType] || fact.periodType) : '-'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Period Type</p>
            </div>
          </div>
        </div>
      )}

      {/* Generation Info */}
      {(
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>🤖</span> Generation Info
          </h3>

          {loadingExecution ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
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
                    href={`/admin/prompts/CarouselInsights?prompt=${execution.promptId}`}
                    className="ml-1 font-mono text-orange-600 hover:text-orange-800 hover:underline"
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
                  <span className="text-gray-500">Service:</span>
                  <span className="ml-1 font-mono text-gray-900">CarouselInsights</span>
                </div>
                <div>
                  <span className="text-gray-500">Model:</span>
                  <span className="ml-1 font-mono text-gray-900">gpt-4o-mini</span>
                </div>
                <div>
                  <span className="text-gray-500">Temperature:</span>
                  <span className="ml-1 text-gray-900">0.7</span>
                </div>
                <div>
                  <span className="text-gray-500">Prompt ID:</span>
                  <Link
                    href="/admin/prompts/CarouselInsights"
                    className="ml-1 font-mono text-orange-600 hover:text-orange-800 hover:underline"
                  >
                    {fact.periodType}_{fact.insightType || 'patterns'}
                  </Link>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Execution records are matched heuristically by service, userId, promptId, and timestamp proximity.
                The record may have been pruned or the fact was generated before execution tracking was enabled.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Data Points */}
      {fact.dataPoints && fact.dataPoints.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>📋</span> Data Points ({fact.dataPoints.length})
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {fact.dataPoints.map((dp, index) => (
              <div key={index} className="bg-gray-50 rounded-md p-3 border border-gray-200 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
                    {dp.type}
                  </span>
                  <span className="font-mono text-xs text-gray-400">{dp.id}</span>
                </div>
                {dp.snippet && <p className="text-gray-700">{dp.snippet}</p>}
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
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-md p-3 text-center">
            <span className="text-xl">{fact.viewed ? '✓' : '○'}</span>
            <p className="text-xs text-gray-500 mt-1">Viewed</p>
          </div>
          <div className="bg-gray-50 rounded-md p-3 text-center">
            <span className="text-xl">{fact.hidden ? '🚫' : '○'}</span>
            <p className="text-xs text-gray-500 mt-1">Hidden</p>
          </div>
        </div>
      </div>
    </DetailModalShell>
  );
}
