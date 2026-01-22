'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchDashboardData } from '@/lib/store/slices/dashboardSlice';
import { openQuickCreate } from '@/lib/store/slices/quickCreateSlice';
import {
  HealthDataCard,
  LocationDataCard,
  VoiceNoteCard,
  PhotoCard,
  TextNoteCard,
  QuickThoughtInput,
  ClickableStatCard,
  InfoModal,
} from '@/components/dashboard';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

export default function DashboardPage() {
  // Track page view
  useTrackPage(TRACKED_SCREENS.dashboard);
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const {
    stats,
    recentHealth,
    recentLocations,
    recentVoiceNotes,
    recentPhotos,
    recentTextNotes,
    isLoading,
    error,
  } = useAppSelector((state) => state.dashboard);

  // State for info modals
  const [showHealthInfo, setShowHealthInfo] = useState(false);
  const [showLocationInfo, setShowLocationInfo] = useState(false);

  // Fetch dashboard data on mount
  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchDashboardData(user.uid));
    }
  }, [user?.uid, dispatch]);

  // Click handlers for stat cards
  const handleDiaryClick = () => dispatch(openQuickCreate({ type: 'diary' }));
  const handleVoiceClick = () => dispatch(openQuickCreate({ type: 'voice' }));
  const handlePhotoClick = () => dispatch(openQuickCreate({ type: 'photo' }));
  const handleHealthClick = () => setShowHealthInfo(true);
  const handleLocationClick = () => setShowLocationInfo(true);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {user?.displayName || 'User'}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Your SirCharge dashboard
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {/* Quick Thought Input with Voice Recorder */}
      <div className="mb-8">
        <QuickThoughtInput />
      </div>

      {/* Stats Grid - Now Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <ClickableStatCard
          title="Health Data"
          value={isLoading ? '...' : stats.healthCount.toString()}
          subtitle="Records synced"
          icon="💪"
          onClick={handleHealthClick}
          ariaLabel="View health data information"
        />
        <ClickableStatCard
          title="Locations"
          value={isLoading ? '...' : stats.locationCount.toString()}
          subtitle="Places visited"
          icon="📍"
          onClick={handleLocationClick}
          ariaLabel="View location data information"
        />
        <ClickableStatCard
          title="Voice Notes"
          value={isLoading ? '...' : stats.voiceCount.toString()}
          subtitle="Recordings"
          icon="🎤"
          onClick={handleVoiceClick}
          ariaLabel="Create new voice note"
        />
        <ClickableStatCard
          title="Photos"
          value={isLoading ? '...' : stats.photoCount.toString()}
          subtitle="Memories"
          icon="📸"
          onClick={handlePhotoClick}
          ariaLabel="Upload new photo"
        />
        <ClickableStatCard
          title="Diary"
          value={isLoading ? '...' : stats.textNoteCount.toString()}
          subtitle="Entries"
          icon="📝"
          onClick={handleDiaryClick}
          ariaLabel="Create new diary entry"
        />
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          📱 Data Collection
        </h2>
        <p className="text-blue-800 dark:text-blue-200 mb-4">
          This web dashboard is <strong>view-only</strong> for your data. To collect health data,
          location history, voice notes, and photos, please use the SirCharge mobile app.
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Once you&apos;ve collected data on mobile, it will automatically sync and appear here for
          analysis and chat.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ActionCard
          title="Chat with AI"
          description="Ask questions about your personal data"
          href="/chat"
          icon="💬"
        />
        <ActionCard
          title="Search Data"
          description="Find specific activities and memories"
          href="/search"
          icon="🔍"
        />
        <ActionCard
          title="Settings"
          description="Manage your preferences and account"
          href="/settings"
          icon="⚙️"
        />
      </div>

      {/* Recent Data Section */}
      {!isLoading && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Recent Activity
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TextNoteCard data={recentTextNotes} />
            <HealthDataCard data={recentHealth} />
            <LocationDataCard data={recentLocations} />
            <VoiceNoteCard data={recentVoiceNotes} />
            <PhotoCard data={recentPhotos} />
          </div>
        </div>
      )}

      {/* Info Modals */}
      {showHealthInfo && (
        <InfoModal title="Health Data Collection" onClose={() => setShowHealthInfo(false)}>
          <p className="mb-4">
            Health data is collected via the mobile app using <strong>HealthKit</strong> (iOS) or <strong>Google Fit</strong> (Android).
          </p>
          <p className="mb-4">To start tracking your health data:</p>
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

      {showLocationInfo && (
        <InfoModal title="Location Data Collection" onClose={() => setShowLocationInfo(false)}>
          <p className="mb-4">
            Location data is collected via the mobile app with background location tracking.
          </p>
          <p className="mb-4">To enable location tracking:</p>
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
    </div>
  );
}

function ActionCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
}) {
  return (
    <a
      href={href}
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </a>
  );
}
