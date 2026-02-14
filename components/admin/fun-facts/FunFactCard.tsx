'use client';

import React from 'react';
import { formatDateShort, truncate, isExpired } from '@/components/admin/shared';
import type { FunFact } from '@/components/admin/shared';

interface FunFactCardProps {
  fact: FunFact;
  onViewDetails: () => void;
  isSelected?: boolean;
}

const CATEGORIES: Record<string, { label: string; color: string }> = {
  health: { label: 'Health', color: '#F44336' },
  activity: { label: 'Activity', color: '#FF5722' },
  location: { label: 'Location', color: '#4CAF50' },
  social: { label: 'Social', color: '#E91E63' },
  productivity: { label: 'Productivity', color: '#3F51B5' },
  general: { label: 'General', color: '#607D8B' },
};

const TYPES: Record<string, { label: string; icon: string }> = {
  comparison: { label: 'Comparison', icon: '📊' },
  streak: { label: 'Streak', icon: '🔥' },
  record: { label: 'Record', icon: '🏆' },
  pattern: { label: 'Pattern', icon: '🔄' },
  milestone: { label: 'Milestone', icon: '🎯' },
};

function getCategoryMeta(category: string | undefined) {
  if (!category) return { label: 'Unknown', color: '#999' };
  return CATEGORIES[category] || { label: category, color: '#999' };
}

function getTypeMeta(type: string | undefined) {
  if (!type) return { label: 'Unknown', icon: '📝' };
  return TYPES[type] || { label: type, icon: '📝' };
}

export default function FunFactCard({ fact, onViewDetails, isSelected }: FunFactCardProps) {
  const catMeta = getCategoryMeta(fact.category);
  const typeMeta = getTypeMeta(fact.type);
  const expired = isExpired(fact.expiresAt);

  return (
    <div
      className={`bg-white rounded-lg border p-4 transition-all ${
        isSelected
          ? 'border-red-400 ring-2 ring-red-100'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      } ${expired ? 'opacity-60' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: catMeta.color }}
          >
            {catMeta.label}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {typeMeta.icon} {typeMeta.label}
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              fact.source === 'fun_facts'
                ? 'bg-green-100 text-green-700'
                : 'bg-purple-100 text-purple-700'
            }`}
          >
            {fact.source === 'fun_facts' ? 'Template' : 'AI Legacy'}
          </span>
          {expired && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
              Expired
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {formatDateShort(fact.generatedAt)}
        </span>
      </div>

      {/* Content */}
      <div className="mb-3">
        <p className="text-sm text-gray-900 leading-relaxed">
          {fact.emoji && <span className="mr-1">{fact.emoji}</span>}
          {truncate(fact.text || '', 150)}
        </p>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
        {fact.confidence !== undefined && (
          <span>{(fact.confidence * 100).toFixed(0)}% confidence</span>
        )}
        {fact.dataPointCount !== undefined && fact.dataPointCount > 0 && (
          <span>{fact.dataPointCount} data points</span>
        )}
        {fact.periodType && <span>{fact.periodType}</span>}
        {fact.expiresAt && !expired && (
          <span>Expires: {formatDateShort(fact.expiresAt)}</span>
        )}
      </div>

      {/* View button */}
      <button
        onClick={onViewDetails}
        className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          isSelected
            ? 'bg-red-100 text-red-700 hover:bg-red-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {isSelected ? 'Hide Details' : 'View Details'}
      </button>
    </div>
  );
}
