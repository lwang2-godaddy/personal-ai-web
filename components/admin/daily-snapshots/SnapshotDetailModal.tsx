'use client';

import DetailModalShell from '../shared/DetailModalShell';
import InfoGrid from '../shared/InfoGrid';
import { formatDateFull } from '../shared/utils';

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

interface SnapshotDetailModalProps {
  snapshot: DailySnapshot;
  onClose: () => void;
}

export default function SnapshotDetailModal({ snapshot, onClose }: SnapshotDetailModalProps) {
  return (
    <DetailModalShell
      title={`${snapshot.emoji} Daily Snapshot`}
      subtitle={snapshot.date}
      icon="📷"
      onClose={onClose}
    >
      {/* Full Summary */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Summary
        </h3>
        <p className="text-gray-800 leading-relaxed bg-gray-50 rounded-lg p-4">
          {snapshot.summary}
        </p>
      </div>

      {/* Basic Info */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Details
        </h3>
        <InfoGrid
          items={[
            { label: 'Document ID', value: snapshot.id },
            { label: 'User ID', value: snapshot.userId },
            { label: 'Date', value: snapshot.date },
            { label: 'Mood', value: `${snapshot.mood}` },
            { label: 'Language', value: snapshot.language },
            { label: 'Emoji', value: snapshot.emoji },
          ]}
        />
      </div>

      {/* Metrics */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-blue-700">
              {snapshot.metrics.steps.toLocaleString()}
            </div>
            <div className="text-xs text-blue-500">Steps</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-red-700">
              {snapshot.metrics.calories.toLocaleString()}
            </div>
            <div className="text-xs text-red-500">Calories</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-700">
              {snapshot.metrics.workoutCount}
            </div>
            <div className="text-xs text-green-500">Workouts</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-purple-700">
              {snapshot.metrics.locationCount}
            </div>
            <div className="text-xs text-purple-500">Locations</div>
          </div>
        </div>
      </div>

      {/* Cache Info */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Cache Info
        </h3>
        <InfoGrid
          items={[
            { label: 'Generated At', value: snapshot.generatedAt ? formatDateFull(snapshot.generatedAt) : '—' },
            { label: 'Cached At', value: snapshot.cachedAt ? formatDateFull(snapshot.cachedAt) : '—' },
            { label: 'From Cache', value: snapshot.fromCache ? 'Yes' : 'No' },
          ]}
        />
      </div>
    </DetailModalShell>
  );
}
