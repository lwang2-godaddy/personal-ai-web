'use client';

import { formatDateShort, truncate } from '../shared/utils';

interface DailySnapshot {
  id: string;
  userId: string;
  date: string;
  summary: string;
  emoji: string;
  mood: 'active' | 'calm' | 'busy' | 'rest';
  language: string;
  metrics: {
    steps: number;
    calories: number;
    workoutCount: number;
    locationCount: number;
  };
  generatedAt: string;
  cachedAt: string;
  fromCache: boolean;
}

const MOOD_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  active: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  calm: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  busy: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  rest: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

const MOOD_ICONS: Record<string, string> = {
  active: '🏃',
  calm: '🍃',
  busy: '⚡',
  rest: '🌙',
};

interface SnapshotCardProps {
  snapshot: DailySnapshot;
  isSelected: boolean;
  onViewDetails: () => void;
}

export default function SnapshotCard({ snapshot, isSelected, onViewDetails }: SnapshotCardProps) {
  const moodStyle = MOOD_COLORS[snapshot.mood] || MOOD_COLORS.calm;
  const moodIcon = MOOD_ICONS[snapshot.mood] || '🍃';

  return (
    <div
      className={`rounded-xl border p-4 transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500 border-blue-300' : 'border-gray-200'
      }`}
    >
      {/* Header: Emoji + Date */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{snapshot.emoji}</span>
          <div>
            <div className="font-semibold text-sm text-gray-900">{snapshot.date}</div>
            <div className="text-xs text-gray-500">
              {snapshot.generatedAt ? formatDateShort(snapshot.generatedAt) : '—'}
            </div>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${moodStyle.bg} ${moodStyle.text}`}>
          {moodIcon} {snapshot.mood}
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
        {truncate(snapshot.summary, 120)}
      </p>

      {/* Metrics Row */}
      <div className="flex flex-wrap gap-2 mb-3">
        {snapshot.metrics.steps > 0 && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            👟 {snapshot.metrics.steps.toLocaleString()}
          </span>
        )}
        {snapshot.metrics.calories > 0 && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            🔥 {snapshot.metrics.calories} cal
          </span>
        )}
        {snapshot.metrics.workoutCount > 0 && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            💪 {snapshot.metrics.workoutCount} workout{snapshot.metrics.workoutCount > 1 ? 's' : ''}
          </span>
        )}
        {snapshot.metrics.locationCount > 0 && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            📍 {snapshot.metrics.locationCount} location{snapshot.metrics.locationCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
            {snapshot.language}
          </span>
          {snapshot.fromCache && (
            <span className="text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded">
              cached
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
