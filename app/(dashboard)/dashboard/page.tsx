'use client';

import { useAppSelector } from '@/lib/store/hooks';

export default function DashboardPage() {
  const { user } = useAppSelector((state) => state.auth);

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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Health Data"
          value="0"
          subtitle="Records synced"
          icon="💪"
        />
        <StatCard
          title="Locations"
          value="0"
          subtitle="Places visited"
          icon="📍"
        />
        <StatCard
          title="Voice Notes"
          value="0"
          subtitle="Recordings"
          icon="🎤"
        />
        <StatCard
          title="Photos"
          value="0"
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
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
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
