'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchDashboardData } from '@/lib/store/slices/dashboardSlice';
import {
  HealthDataCard,
  LocationDataCard,
  VoiceNoteCard,
  PhotoCard,
} from '@/components/dashboard';

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const {
    stats,
    recentHealth,
    recentLocations,
    recentVoiceNotes,
    recentPhotos,
    isLoading,
    error,
  } = useAppSelector((state) => state.dashboard);

  // Fetch dashboard data on mount
  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchDashboardData(user.uid));
    }
  }, [user?.uid, dispatch]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {user?.displayName || 'User'}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Your personal AI dashboard
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Health Data"
          value={isLoading ? '...' : stats.healthCount.toString()}
          subtitle="Records synced"
          icon="💪"
        />
        <StatCard
          title="Locations"
          value={isLoading ? '...' : stats.locationCount.toString()}
          subtitle="Places visited"
          icon="📍"
        />
        <StatCard
          title="Voice Notes"
          value={isLoading ? '...' : stats.voiceCount.toString()}
          subtitle="Recordings"
          icon="🎤"
        />
        <StatCard
          title="Photos"
          value={isLoading ? '...' : stats.photoCount.toString()}
          subtitle="Memories"
          icon="📸"
        />
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          📱 Data Collection
        </h2>
        <p className="text-blue-800 dark:text-blue-200 mb-4">
          This web dashboard is <strong>view-only</strong> for your data. To collect health data,
          location history, voice notes, and photos, please use the PersonalAI mobile app.
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
            <HealthDataCard data={recentHealth} />
            <LocationDataCard data={recentLocations} />
            <VoiceNoteCard data={recentVoiceNotes} />
            <PhotoCard data={recentPhotos} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
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
