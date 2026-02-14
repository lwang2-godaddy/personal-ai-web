'use client';

import React from 'react';
import { formatDateShort, truncate } from '@/components/admin/shared';
import type { LifeKeyword } from '@/components/admin/shared';

interface KeywordCardProps {
  keyword: LifeKeyword;
  onViewDetails: () => void;
  isSelected?: boolean;
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

export default function KeywordCard({ keyword, onViewDetails, isSelected }: KeywordCardProps) {
  const catMeta = getCategoryMeta(keyword.category);

  return (
    <div
      className={`bg-white rounded-lg border p-4 transition-all ${
        isSelected
          ? 'border-red-400 ring-2 ring-red-100'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      } ${keyword.hidden ? 'opacity-60' : ''}`}
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
            {PERIOD_LABELS[keyword.periodType] || keyword.periodType}
          </span>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {formatDateShort(keyword.generatedAt)}
        </span>
      </div>

      {/* Keyword + description */}
      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-900">
          {keyword.emoji && <span className="mr-1">{keyword.emoji}</span>}
          {keyword.keyword}
        </p>
        <p className="text-sm text-gray-600 mt-1 leading-relaxed">
          {truncate(keyword.description, 120)}
        </p>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
        {keyword.confidence !== undefined && (
          <span>{(keyword.confidence * 100).toFixed(0)}% confidence</span>
        )}
        {keyword.dominanceScore !== undefined && (
          <span>Dominance: {(keyword.dominanceScore * 100).toFixed(0)}%</span>
        )}
        {keyword.dataPointCount !== undefined && keyword.dataPointCount > 0 && (
          <span>{keyword.dataPointCount} data points</span>
        )}
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
        <span>{keyword.viewed ? '✓ Viewed' : '○ Not viewed'}</span>
        <span>{keyword.expanded ? '✓ Expanded' : '○ Not expanded'}</span>
        {keyword.hidden && <span>🚫 Hidden</span>}
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
