'use client';

import React from 'react';

interface CircleInsight {
  type: 'pattern' | 'achievement' | 'suggestion';
  title: string;
  description: string;
  confidence: number; // 0-100
}

interface CircleInsightCardProps {
  insight: CircleInsight;
}

export const CircleInsightCard: React.FC<CircleInsightCardProps> = ({ insight }) => {
  const getInsightIcon = () => {
    switch (insight.type) {
      case 'pattern':
        return '📊';
      case 'achievement':
        return '🏆';
      case 'suggestion':
        return '💡';
      default:
        return '🤖';
    }
  };

  const getInsightBorderColor = () => {
    switch (insight.type) {
      case 'pattern':
        return 'border-blue-200';
      case 'achievement':
        return 'border-yellow-200';
      case 'suggestion':
        return 'border-green-200';
      default:
        return 'border-gray-200';
    }
  };

  const getInsightBgColor = () => {
    switch (insight.type) {
      case 'pattern':
        return 'bg-blue-50';
      case 'achievement':
        return 'bg-yellow-50';
      case 'suggestion':
        return 'bg-green-50';
      default:
        return 'bg-gray-50';
    }
  };

  const getConfidenceColor = () => {
    if (insight.confidence >= 80) return 'text-green-600';
    if (insight.confidence >= 60) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div
      className={`p-4 rounded-lg border-2 ${getInsightBorderColor()} ${getInsightBgColor()}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-2">
        <span className="text-2xl flex-shrink-0">{getInsightIcon()}</span>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{insight.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
        </div>
      </div>

      {/* Confidence Meter */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs text-gray-500">AI Confidence:</span>
        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${
              insight.confidence >= 80
                ? 'bg-green-600'
                : insight.confidence >= 60
                ? 'bg-yellow-600'
                : 'bg-gray-600'
            }`}
            style={{ width: `${insight.confidence}%` }}
          />
        </div>
        <span className={`text-xs font-semibold ${getConfidenceColor()}`}>
          {insight.confidence}%
        </span>
      </div>
    </div>
  );
};
