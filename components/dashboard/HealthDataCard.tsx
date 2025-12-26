'use client';

import { useState } from 'react';
import { HealthData } from '@/lib/models';
import { PanelHeader } from './PanelHeader';
import { InfoModal } from './InfoModal';

interface HealthDataCardProps {
  data: HealthData[];
}

export function HealthDataCard({ data }: HealthDataCardProps) {
  const [showInfoModal, setShowInfoModal] = useState(false);

  const handleInfoClick = () => {
    setShowInfoModal(true);
  };

  if (data.length === 0) {
    return (
      <>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <PanelHeader
            title="Recent Health Data"
            emoji="💪"
            actionType="info"
            onActionClick={handleInfoClick}
            ariaLabel="Learn about health data collection"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No health data collected yet. Click the &apos;i&apos; icon above to learn how to start tracking.
          </p>
        </div>

        {showInfoModal && (
          <InfoModal
            title="Health Data Collection"
            onClose={() => setShowInfoModal(false)}
          >
            <p className="mb-4">
              Health data is collected via the mobile app using <strong>HealthKit</strong> (iOS) or <strong>Google Fit</strong> (Android).
            </p>
            <p className="mb-4">
              To start tracking your health data:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>Download the SirCharge mobile app</li>
              <li>Grant health permissions when prompted</li>
              <li>Your data will automatically sync to this dashboard</li>
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tracked data includes: steps, workouts, sleep, heart rate, and more.
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
          title="Recent Health Data"
          emoji="💪"
          actionType="info"
          onActionClick={handleInfoClick}
          ariaLabel="Learn about health data collection"
        />
      <div className="space-y-3">
        {data.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {item.type}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(item.startDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {item.value.toLocaleString()} {item.unit}
              </span>
              {item.metadata.workoutType && (
                <span className="text-xs text-gray-600 dark:text-gray-300 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                  {item.metadata.workoutType}
                </span>
              )}
            </div>
            {item.metadata.distance && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Distance: {item.metadata.distance.toFixed(2)} km
              </p>
            )}
          </div>
        ))}
      </div>
    </div>

    {showInfoModal && (
      <InfoModal
        title="Health Data Collection"
        onClose={() => setShowInfoModal(false)}
      >
        <p className="mb-4">
          Health data is collected via the mobile app using <strong>HealthKit</strong> (iOS) or <strong>Google Fit</strong> (Android).
        </p>
        <p className="mb-4">
          To start tracking your health data:
        </p>
        <ul className="list-disc list-inside space-y-2 mb-4">
          <li>Download the SirCharge mobile app</li>
          <li>Grant health permissions when prompted</li>
          <li>Your data will automatically sync to this dashboard</li>
        </ul>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tracked data includes: steps, workouts, sleep, heart rate, and more.
        </p>
      </InfoModal>
    )}
  </>
  );
}
