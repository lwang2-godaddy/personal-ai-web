'use client';

import React from 'react';
import { DetailModalShell, InfoGrid, formatDateFull } from '@/components/admin/shared';
import type { LifeKeyword } from '@/components/admin/shared';

interface KeywordDetailModalProps {
  keyword: LifeKeyword;
  onClose: () => void;
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

export default function KeywordDetailModal({ keyword, onClose }: KeywordDetailModalProps) {
  const catMeta = getCategoryMeta(keyword.category);

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
