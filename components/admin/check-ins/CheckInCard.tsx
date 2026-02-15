'use client';

import React from 'react';

interface CheckIn {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
  activity: string | null;
  activityTaggedAt: string | null;
  address: string;
  placeName: string | null;
  duration: number;
  visitCount: number;
  embeddingId: string | null;
  isManualCheckIn: boolean;
  savedPlaceId: string | null;
  note: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface CheckInCardProps {
  checkIn: CheckIn;
  onViewDetails: () => void;
  isSelected?: boolean;
}

// Activity emoji mapping
const ACTIVITY_META: Record<string, { icon: string; color: string }> = {
  work: { icon: '💼', color: '#607D8B' },
  gym: { icon: '🏋️', color: '#F44336' },
  coffee: { icon: '☕', color: '#795548' },
  restaurant: { icon: '🍽️', color: '#FF9800' },
  shopping: { icon: '🛍️', color: '#E91E63' },
  home: { icon: '🏠', color: '#4CAF50' },
  school: { icon: '🎓', color: '#2196F3' },
  park: { icon: '🌳', color: '#8BC34A' },
  hospital: { icon: '🏥', color: '#F44336' },
  church: { icon: '⛪', color: '#9C27B0' },
  badminton: { icon: '🏸', color: '#00BCD4' },
  tennis: { icon: '🎾', color: '#CDDC39' },
  swimming: { icon: '🏊', color: '#03A9F4' },
  running: { icon: '🏃', color: '#FF5722' },
  hiking: { icon: '🥾', color: '#4CAF50' },
  yoga: { icon: '🧘', color: '#9C27B0' },
  grocery: { icon: '🛒', color: '#8BC34A' },
  travel: { icon: '✈️', color: '#00BCD4' },
  bar: { icon: '🍺', color: '#FF9800' },
  library: { icon: '📚', color: '#3F51B5' },
};

function getActivityMeta(activity: string | null) {
  if (!activity) return { icon: '📍', color: '#999' };
  const key = activity.toLowerCase();
  return ACTIVITY_META[key] || { icon: '📍', color: '#607D8B' };
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '-';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function CheckInCard({ checkIn, onViewDetails, isSelected }: CheckInCardProps) {
  const activityMeta = getActivityMeta(checkIn.activity);

  return (
    <div
      className={`bg-white rounded-lg border p-4 transition-all ${
        isSelected
          ? 'border-indigo-400 ring-2 ring-indigo-100'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {/* Activity badge */}
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: activityMeta.color }}
          >
            <span className="mr-1">{activityMeta.icon}</span>
            {checkIn.activity || 'Unknown'}
          </span>

          {/* Manual/Auto badge */}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              checkIn.isManualCheckIn
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {checkIn.isManualCheckIn ? 'Manual' : 'Auto'}
          </span>

          {/* Embedding status */}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              checkIn.embeddingId
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {checkIn.embeddingId ? 'Indexed' : 'Pending'}
          </span>
        </div>

        <span className="text-xs text-gray-400 whitespace-nowrap">
          {formatDate(checkIn.timestamp)}
        </span>
      </div>

      {/* Place name & address */}
      <div className="mb-3">
        {checkIn.placeName && (
          <p className="text-sm font-medium text-gray-900">{checkIn.placeName}</p>
        )}
        <p className="text-sm text-gray-600 leading-relaxed">
          {checkIn.address || `${checkIn.latitude.toFixed(4)}, ${checkIn.longitude.toFixed(4)}`}
        </p>
        {checkIn.note && (
          <p className="text-sm text-gray-500 italic mt-1">{checkIn.note}</p>
        )}
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
        {/* Visit count */}
        {checkIn.visitCount > 0 && (
          <span className="flex items-center gap-1">
            <span>#</span>
            Visit {checkIn.visitCount}
          </span>
        )}

        {/* Duration */}
        {checkIn.duration > 0 && (
          <span className="flex items-center gap-1">
            <span>⏱️</span>
            {formatDuration(checkIn.duration)}
          </span>
        )}

        {/* Coordinates */}
        <span className="text-gray-400 font-mono">
          {checkIn.latitude.toFixed(4)}, {checkIn.longitude.toFixed(4)}
        </span>
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
