'use client';

import React from 'react';
import { CircleDataSharing } from '@/lib/models/Circle';

interface DataSharingTogglesProps {
  dataSharing: CircleDataSharing;
  onChange: (dataSharing: CircleDataSharing) => void;
  disabled?: boolean;
}

interface ToggleItem {
  key: keyof CircleDataSharing;
  label: string;
  icon: string;
  description: string;
}

const TOGGLE_ITEMS: ToggleItem[] = [
  {
    key: 'shareHealth',
    label: 'Health Data',
    icon: '💪',
    description: 'Steps, workouts, sleep, heart rate',
  },
  {
    key: 'shareLocation',
    label: 'Location History',
    icon: '📍',
    description: 'GPS history, places visited',
  },
  {
    key: 'shareActivities',
    label: 'Activities',
    icon: '🏃',
    description: 'Activity tags, shared activities',
  },
  {
    key: 'shareVoiceNotes',
    label: 'Voice Notes',
    icon: '🎤',
    description: 'Audio transcriptions',
  },
  {
    key: 'sharePhotos',
    label: 'Photos',
    icon: '📸',
    description: 'Photo metadata',
  },
];

/**
 * Data sharing toggles component (Web)
 * 5 toggles for different data types
 */
export const DataSharingToggles: React.FC<DataSharingTogglesProps> = ({
  dataSharing,
  onChange,
  disabled = false,
}) => {
  const handleToggle = (key: keyof CircleDataSharing) => {
    onChange({
      ...dataSharing,
      [key]: !dataSharing[key],
    });
  };

  const noTypesSelected = !Object.values(dataSharing).some((value) => value);

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Data Sharing Settings</h3>
      <p className="text-sm text-gray-600 mb-4">
        Choose what data types members can share in this circle
      </p>

      <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden">
        {TOGGLE_ITEMS.map((item, index) => (
          <div
            key={item.key}
            className={`flex items-center justify-between p-4 bg-white ${
              index !== TOGGLE_ITEMS.length - 1 ? 'border-b border-gray-200' : ''
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <div className="text-sm font-medium text-gray-900">{item.label}</div>
                <div className="text-xs text-gray-500">{item.description}</div>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={dataSharing[item.key]}
              disabled={disabled}
              onClick={() => handleToggle(item.key)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                dataSharing[item.key] ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  dataSharing[item.key] ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Warning if no data types selected */}
      {noTypesSelected && (
        <div className="mt-4 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <span className="text-lg">⚠️</span>
          <p className="text-sm text-yellow-800">
            No data types selected. Circle members won't be able to share any data.
          </p>
        </div>
      )}
    </div>
  );
};

export default DataSharingToggles;
