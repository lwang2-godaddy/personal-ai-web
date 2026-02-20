'use client';

import React from 'react';
import { truncate } from '@/components/admin/shared';
import type { LifeConnection } from '@/components/admin/shared';

interface ConnectionCardProps {
  connection: LifeConnection;
  onViewDetails: () => void;
  isSelected?: boolean;
}

const CATEGORIES: Record<string, { label: string; color: string }> = {
  'health-activity': { label: 'Health-Activity', color: '#4CAF50' },
  'mood-activity': { label: 'Mood-Activity', color: '#E91E63' },
  'mood-health': { label: 'Mood-Health', color: '#9C27B0' },
  'health-time': { label: 'Health-Time', color: '#2196F3' },
  'activity-sequence': { label: 'Activity Sequence', color: '#FF9800' },
};

const STRENGTH_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  strong: { bg: 'bg-red-100', text: 'text-red-700', label: 'Strong' },
  moderate: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Moderate' },
  weak: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Weak' },
};

function getCategoryMeta(category: string) {
  return CATEGORIES[category] || { label: category, color: '#999' };
}

function getStrengthMeta(strength: string) {
  return STRENGTH_COLORS[strength] || { bg: 'bg-gray-100', text: 'text-gray-600', label: strength };
}

function formatDetectedAt(ts: number): string {
  if (!ts) return '-';
  try {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '-';
  }
}

export default function ConnectionCard({ connection, onViewDetails, isSelected }: ConnectionCardProps) {
  const catMeta = getCategoryMeta(connection.category);
  const strengthMeta = getStrengthMeta(connection.strength);

  return (
    <div
      className={`bg-white rounded-lg border p-4 transition-all ${
        isSelected
          ? 'border-indigo-400 ring-2 ring-indigo-100'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      } ${connection.dismissed ? 'opacity-60' : ''}`}
    >
      {/* Header badges */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: catMeta.color }}
          >
            {catMeta.label}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${strengthMeta.bg} ${strengthMeta.text}`}>
            {strengthMeta.label}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            connection.direction === 'positive' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {connection.direction === 'positive' ? '+ Positive' : '- Negative'}
          </span>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {formatDetectedAt(connection.detectedAt)}
        </span>
      </div>

      {/* Title + description */}
      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-900">{connection.title}</p>
        <p className="text-sm text-gray-600 mt-1 leading-relaxed">
          {truncate(connection.description, 120)}
        </p>
      </div>

      {/* Domains row */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
          {connection.domainA.displayName}
        </span>
        <span className="text-gray-400">{connection.direction === 'positive' ? '↔' : '↔'}</span>
        <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-medium">
          {connection.domainB.displayName}
        </span>
      </div>

      {/* With/Without comparison summary */}
      {connection.withWithout && (
        <div className="flex items-center gap-2 text-xs mb-2">
          <span className="text-gray-500">With:</span>
          <span className="font-semibold text-gray-800">{connection.withWithout.withActivity.mean.toFixed(1)}</span>
          <span className="text-gray-400">vs</span>
          <span className="text-gray-500">Without:</span>
          <span className="font-semibold text-gray-800">{connection.withWithout.withoutActivity.mean.toFixed(1)}</span>
          <span className={`font-bold ${connection.withWithout.percentDifference > 0 ? 'text-green-600' : 'text-red-600'}`}>
            ({connection.withWithout.percentDifference > 0 ? '+' : ''}{connection.withWithout.percentDifference.toFixed(0)}%)
          </span>
        </div>
      )}

      {/* Metrics row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
        <span title="Spearman rho">{connection.metrics.correlationType === 'spearman' ? '\u03C1' : 'r'} = {connection.metrics.coefficient.toFixed(3)}</span>
        <span title={connection.metrics.adjustedPValue !== undefined ? `Raw: ${connection.metrics.pValue.toFixed(4)}` : ''}>
          p{connection.metrics.adjustedPValue !== undefined ? '(adj)' : ''} = {(connection.metrics.adjustedPValue ?? connection.metrics.pValue).toFixed(4)}
        </span>
        <span>d = {connection.metrics.effectSize.toFixed(2)}</span>
        <span title={connection.metrics.effectiveSampleSize !== undefined ? `Effective: ${connection.metrics.effectiveSampleSize}` : ''}>
          n = {connection.metrics.sampleSize}{connection.metrics.effectiveSampleSize !== undefined && connection.metrics.effectiveSampleSize !== connection.metrics.sampleSize ? ` (${connection.metrics.effectiveSampleSize} eff)` : ''}
        </span>
      </div>

      {/* Status badges row */}
      <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400 mb-3">
        {connection.survivesConfounderControl !== undefined && (
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
            connection.survivesConfounderControl
              ? 'bg-green-50 text-green-700'
              : 'bg-amber-50 text-amber-700'
          }`}>
            {connection.survivesConfounderControl ? 'Survives weekday control' : 'Weekend-driven'}
          </span>
        )}
        {connection.trendDirection && (
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
            connection.trendDirection === 'strengthening' ? 'bg-green-50 text-green-700' :
            connection.trendDirection === 'weakening' ? 'bg-red-50 text-red-700' :
            'bg-gray-50 text-gray-600'
          }`}>
            {connection.trendDirection === 'strengthening' ? 'Strengthening' :
             connection.trendDirection === 'weakening' ? 'Weakening' : 'Stable'}
          </span>
        )}
        {connection.timeLag && (
          <span className="text-amber-600">
            {connection.timeLag.days}d lag ({connection.timeLag.direction.replace('_', ' ')})
          </span>
        )}
        {connection.dismissed && <span>Dismissed</span>}
        {connection.userRating && (
          <span>{connection.userRating === 'helpful' ? 'Rated helpful' : 'Rated not helpful'}</span>
        )}
        {!connection.aiGenerated && <span className="text-orange-500">Template fallback</span>}
      </div>

      {/* View button */}
      <button
        onClick={onViewDetails}
        className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          isSelected
            ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {isSelected ? 'Hide Details' : 'View Details'}
      </button>
    </div>
  );
}
