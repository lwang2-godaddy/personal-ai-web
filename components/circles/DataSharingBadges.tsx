'use client';

/**
 * DataSharingBadges - Compact display of enabled data sharing types
 *
 * Shows emoji icons for each enabled data type in a circle.
 * Used in CircleCard footer and ChatHeader to give users instant
 * visibility into what data is being shared.
 */

import React from 'react';
import { CircleDataSharing } from '@/lib/models/Circle';

interface DataSharingBadgesProps {
  dataSharing: CircleDataSharing;
  size?: 'sm' | 'md';
}

const DATA_TYPES: {
  key: keyof CircleDataSharing;
  icon: string;
  label: string;
}[] = [
  { key: 'shareHealth', icon: '❤️', label: 'Health' },
  { key: 'shareLocation', icon: '📍', label: 'Location' },
  { key: 'shareActivities', icon: '🎯', label: 'Activities' },
  { key: 'shareDiary', icon: '📝', label: 'Diary' },
  { key: 'shareVoiceNotes', icon: '🎤', label: 'Voice' },
  { key: 'sharePhotos', icon: '📸', label: 'Photos' },
];

export const DataSharingBadges: React.FC<DataSharingBadgesProps> = ({
  dataSharing,
  size = 'sm',
}) => {
  const enabledTypes = DATA_TYPES.filter((type) => dataSharing[type.key]);

  if (enabledTypes.length === 0) return null;

  const tooltipText = `Sharing: ${enabledTypes.map((t) => t.label).join(', ')}`;
  const iconClass = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div
      className={`flex items-center gap-0.5 ${iconClass}`}
      title={tooltipText}
    >
      {enabledTypes.map((type) => (
        <span key={type.key} className="opacity-70">
          {type.icon}
        </span>
      ))}
    </div>
  );
};

export default DataSharingBadges;
