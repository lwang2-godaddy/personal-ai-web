'use client';

import { useAppSelector } from '@/lib/store/hooks';

export default function SettingsPage() {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account and preferences
        </p>
      </div>

      {/* User Profile Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Profile Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <p className="text-gray-900 dark:text-white">
              {user?.displayName || 'Not set'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <p className="text-gray-900 dark:text-white">
              {user?.email}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User ID
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
              {user?.uid}
            </p>
          </div>
        </div>
      </div>

      {/* App Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          App Information
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Version</span>
            <span className="text-gray-900 dark:text-white">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Platform</span>
            <span className="text-gray-900 dark:text-white">Web</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Backend</span>
            <span className="text-gray-900 dark:text-white">Firebase + OpenAI + Pinecone</span>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          🚧 More Settings Coming Soon
        </h3>
        <p className="text-blue-800 dark:text-blue-200 mb-3">
          Additional settings will be available in future updates:
        </p>
        <ul className="list-disc list-inside text-blue-700 dark:text-blue-300 space-y-1 text-sm">
          <li>Notification preferences</li>
          <li>Data export options</li>
          <li>Privacy settings</li>
          <li>Account management</li>
          <li>Language preferences</li>
        </ul>
      </div>
    </div>
  );
}
