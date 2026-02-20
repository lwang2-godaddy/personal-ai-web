'use client';

import { formatDateShort, truncate } from '../shared/utils';

interface SummaryMetrics {
  steps?: number;
  stepsGoal?: number;
  calories?: number;
  sleepHours?: number;
  sleepQuality?: string;
  heartRate?: number;
  workoutsCount?: number;
  workoutTypes?: string[];
  workoutMinutes?: number;
  distance?: number;
  placesVisited?: number;
  activitiesLogged?: number;
  topActivities?: Array<{ name: string; count: number }>;
  eventsTotal?: number;
  eventsCompleted?: number;
  voiceNotesCount?: number;
  activeMinutes?: number;
}

interface SummaryHighlight {
  icon: string;
  title: string;
  description: string;
  type: string;
}

interface DailySummary {
  id: string;
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  date: string;
  startDate?: string;
  endDate?: string;
  textSummary: string;
  generationMethod: 'ai' | 'template';
  notificationSent: boolean;
  metrics: SummaryMetrics;
  highlights: SummaryHighlight[];
  comparison: {
    stepsChange: number;
    workoutsChange: number;
    sleepChange: number;
    trend: 'improving' | 'stable' | 'declining';
  } | null;
  generatedAt?: string;
  viewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const PERIOD_COLORS: Record<string, { bg: string; text: string }> = {
  daily: { bg: 'bg-blue-50', text: 'text-blue-700' },
  weekly: { bg: 'bg-green-50', text: 'text-green-700' },
  monthly: { bg: 'bg-purple-50', text: 'text-purple-700' },
};

const PERIOD_ICONS: Record<string, string> = {
  daily: '1D',
  weekly: '1W',
  monthly: '1M',
};

const TREND_DISPLAY: Record<string, { icon: string; color: string }> = {
  improving: { icon: '\u2191', color: 'text-green-600' },
  stable: { icon: '\u2192', color: 'text-gray-500' },
  declining: { icon: '\u2193', color: 'text-red-600' },
};

interface SummaryCardProps {
  summary: DailySummary;
  isSelected: boolean;
  onViewDetails: () => void;
}

export default function SummaryCard({ summary, isSelected, onViewDetails }: SummaryCardProps) {
  const periodStyle = PERIOD_COLORS[summary.period] || PERIOD_COLORS.daily;
  const periodIcon = PERIOD_ICONS[summary.period] || '1D';
  const trend = summary.comparison ? TREND_DISPLAY[summary.comparison.trend] : null;

  return (
    <div
      className={`rounded-xl border p-4 transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500 border-blue-300' : 'border-gray-200'
      }`}
    >
      {/* Header: Period badge + Date */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${periodStyle.bg} ${periodStyle.text}`}>
            {periodIcon}
          </span>
          <div>
            <div className="font-semibold text-sm text-gray-900">{summary.date}</div>
            <div className="text-xs text-gray-500">
              {summary.generatedAt ? formatDateShort(summary.generatedAt) : '\u2014'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Generation method badge */}
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            summary.generationMethod === 'ai'
              ? 'bg-green-50 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {summary.generationMethod === 'ai' ? 'AI' : 'Template'}
          </span>
          {/* Trend indicator */}
          {trend && (
            <span className={`text-sm font-bold ${trend.color}`} title={summary.comparison!.trend}>
              {trend.icon}
            </span>
          )}
        </div>
      </div>

      {/* Summary text */}
      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
        {truncate(summary.textSummary, 120)}
      </p>

      {/* Metric badges (non-zero only) */}
      <div className="flex flex-wrap gap-2 mb-3">
        {(summary.metrics.steps ?? 0) > 0 && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            👟 {summary.metrics.steps!.toLocaleString()}
          </span>
        )}
        {(summary.metrics.calories ?? 0) > 0 && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            🔥 {summary.metrics.calories!.toLocaleString()} cal
          </span>
        )}
        {(summary.metrics.workoutsCount ?? 0) > 0 && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            💪 {summary.metrics.workoutsCount} workout{summary.metrics.workoutsCount! > 1 ? 's' : ''}
          </span>
        )}
        {(summary.metrics.sleepHours ?? 0) > 0 && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            😴 {summary.metrics.sleepHours!.toFixed(1)}h
          </span>
        )}
        {(summary.metrics.placesVisited ?? 0) > 0 && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            📍 {summary.metrics.placesVisited} place{summary.metrics.placesVisited! > 1 ? 's' : ''}
          </span>
        )}
        {(summary.metrics.activitiesLogged ?? 0) > 0 && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            🏃 {summary.metrics.activitiesLogged} activit{summary.metrics.activitiesLogged! > 1 ? 'ies' : 'y'}
          </span>
        )}
        {(summary.metrics.eventsTotal ?? 0) > 0 && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            📅 {summary.metrics.eventsTotal} event{summary.metrics.eventsTotal! > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {summary.highlights.length > 0 && (
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
              {summary.highlights.length} highlight{summary.highlights.length > 1 ? 's' : ''}
            </span>
          )}
          {summary.notificationSent && (
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
              notified
            </span>
          )}
        </div>
        <button
          onClick={onViewDetails}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          View Details →
        </button>
      </div>
    </div>
  );
}
