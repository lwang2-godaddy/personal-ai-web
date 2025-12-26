'use client';

import { useState } from 'react';
import { LocationData } from '@/lib/models';
import { PanelHeader } from './PanelHeader';
import { InfoModal } from './InfoModal';

interface LocationDataCardProps {
  data: LocationData[];
}

export function LocationDataCard({ data }: LocationDataCardProps) {
  const [showInfoModal, setShowInfoModal] = useState(false);

  const handleInfoClick = () => {
    setShowInfoModal(true);
  };

  if (data.length === 0) {
    return (
      <>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <PanelHeader
            title="Recent Locations"
            emoji="📍"
            actionType="info"
            onActionClick={handleInfoClick}
            ariaLabel="Learn about location data collection"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No location data collected yet. Click the &apos;i&apos; icon above to learn how to start tracking.
          </p>
        </div>

        {showInfoModal && (
          <InfoModal
            title="Location Data Collection"
            onClose={() => setShowInfoModal(false)}
          >
            <p className="mb-4">
              Location data is collected via the mobile app with background location tracking.
            </p>
            <p className="mb-4">
              To enable location tracking:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>Download the SirCharge mobile app</li>
              <li>Enable location permissions (Always)</li>
              <li>The app will track significant locations automatically</li>
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Location data includes: addresses, visit counts, duration, and activity detection.
            </p>
          </InfoModal>
        )}
      </>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <PanelHeader
          title="Recent Locations"
          emoji="📍"
          actionType="info"
          onActionClick={handleInfoClick}
          ariaLabel="Learn about location data collection"
        />
      <div className="space-y-3">
        {data.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <div className="flex items-center justify-between mb-2">
              {item.activity ? (
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400 capitalize">
                  {item.activity}
                </span>
              ) : (
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Unknown Activity
                </span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(item.timestamp).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-1 line-clamp-1">
              {item.address || `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`}
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>Visits: {item.visitCount}</span>
              {item.duration > 0 && (
                <span>Duration: {Math.floor(item.duration / 60)} min</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>

    {showInfoModal && (
      <InfoModal
        title="Location Data Collection"
        onClose={() => setShowInfoModal(false)}
      >
        <p className="mb-4">
          Location data is collected via the mobile app with background location tracking.
        </p>
        <p className="mb-4">
          To enable location tracking:
        </p>
        <ul className="list-disc list-inside space-y-2 mb-4">
          <li>Download the SirCharge mobile app</li>
          <li>Enable location permissions (Always)</li>
          <li>The app will track significant locations automatically</li>
        </ul>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Location data includes: addresses, visit counts, duration, and activity detection.
        </p>
      </InfoModal>
    )}
  </>
  );
}
