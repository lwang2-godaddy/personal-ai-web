'use client';

import React from 'react';
import { DetailModalShell, InfoGrid, formatDateFull, isExpired } from '@/components/admin/shared';
import type { FunFact } from '@/components/admin/shared';

interface FunFactDetailModalProps {
  fact: FunFact;
  onClose: () => void;
}

const CATEGORIES: Record<string, { label: string; color: string }> = {
  health: { label: 'Health', color: '#F44336' },
  activity: { label: 'Activity', color: '#FF5722' },
  location: { label: 'Location', color: '#4CAF50' },
  social: { label: 'Social', color: '#E91E63' },
  productivity: { label: 'Productivity', color: '#3F51B5' },
  general: { label: 'General', color: '#607D8B' },
};

function getCategoryMeta(category: string | undefined) {
  if (!category) return { label: 'Unknown', color: '#999' };
  return CATEGORIES[category] || { label: category, color: '#999' };
}

export default function FunFactDetailModal({ fact, onClose }: FunFactDetailModalProps) {
  const catMeta = getCategoryMeta(fact.category);
  const expired = isExpired(fact.expiresAt);

  return (
    <DetailModalShell
      icon={fact.emoji || '🎲'}
      title="Fun Fact Details"
      subtitle={`${catMeta.label} · ${fact.source === 'fun_facts' ? 'Template-based' : 'AI Legacy'}`}
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
            {fact.type && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                {fact.type}
              </span>
            )}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                fact.source === 'fun_facts'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-purple-100 text-purple-700'
              }`}
            >
              {fact.source === 'fun_facts' ? 'Template' : 'AI Legacy'}
            </span>
          </div>

          {(fact.periodStart || fact.periodEnd) && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Period:</p>
              <p className="text-sm text-gray-700">
                {fact.periodType && <span className="font-medium mr-2">[{fact.periodType}]</span>}
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

      {/* Template Details */}
      {fact.source === 'fun_facts' && fact.templateKey && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>🧩</span> Template Details
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Template Key:</p>
              <p className="font-mono text-sm text-gray-900 bg-white px-2 py-1 rounded border border-gray-200">
                {fact.templateKey}
              </p>
            </div>
            {fact.templateValues && Object.keys(fact.templateValues).length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Template Values:</p>
                <div className="bg-white rounded border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-3 py-1.5 text-xs text-gray-500 font-medium">Key</th>
                        <th className="text-left px-3 py-1.5 text-xs text-gray-500 font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(fact.templateValues).map(([key, value]) => (
                        <tr key={key} className="border-b border-gray-50">
                          <td className="px-3 py-1.5 font-mono text-xs text-gray-600">{key}</td>
                          <td className="px-3 py-1.5 text-gray-900">{String(value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legacy AI Details */}
      {fact.source === 'funFacts' && fact.insightType && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>🤖</span> AI Generation Details
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Insight Type</p>
                <p className="text-gray-900">{fact.insightType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Data Point Count</p>
                <p className="text-gray-900">{fact.dataPointCount ?? '-'}</p>
              </div>
            </div>
          </div>
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
    </DetailModalShell>
  );
}
