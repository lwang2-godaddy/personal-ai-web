'use client';

import React from 'react';
import { Circle } from '@/lib/models/Circle';
import { DataSharingBadges } from './DataSharingBadges';

interface CircleCardProps {
  circle: Circle;
  onPress: () => void;
}

/**
 * Circle preview card component (Web)
 * Shows circle emoji, name, member count, and last activity
 */
export const CircleCard: React.FC<CircleCardProps> = ({ circle, onPress }) => {
  const formatLastActivity = (updatedAt: string): string => {
    const date = new Date(updatedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      onClick={onPress}
      className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Circle emoji icon */}
      <div className="flex-shrink-0 w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-3xl">
        {circle.emoji || '👥'}
      </div>

      {/* Circle info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold text-gray-900 truncate">{circle.name}</h3>

        {circle.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mt-1">{circle.description}</p>
        )}

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>
              {circle.memberIds.length} {circle.memberIds.length === 1 ? 'member' : 'members'}
            </span>
            <span>•</span>
            <span>{formatLastActivity(circle.updatedAt)}</span>
          </div>
          <DataSharingBadges dataSharing={circle.dataSharing} size="sm" />
        </div>
      </div>

      {/* Type badge */}
      {circle.type === 'private' && (
        <div className="flex-shrink-0 text-lg">🔒</div>
      )}
    </div>
  );
};

export default CircleCard;
