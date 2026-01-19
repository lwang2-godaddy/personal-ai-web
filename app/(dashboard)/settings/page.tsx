'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAppSelector } from '@/lib/store/hooks';
import { apiGet } from '@/lib/api/client';
import { StorageUsage } from '@/lib/models/StorageUsage';
import { StorageUsageCard } from '@/components/settings/StorageUsageCard';

interface SettingsLinkCardProps {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

function SettingsLinkCard({ href, title, description, icon }: SettingsLinkCardProps) {
  return (
    <Link
      href={href}
      className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow border border-transparent hover:border-blue-500 dark:hover:border-blue-400"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        </div>
        <div className="flex-shrink-0 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default function SettingsPage() {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchStorageUsage = useCallback(async () => {
    // Only fetch if authenticated and not already loading
    if (!isAuthenticated || !user?.uid || isLoadingStorage) return;

    try {
      setIsLoadingStorage(true);
      const data = await apiGet<StorageUsage>('/api/storage-usage');
      setStorageUsage(data);
      setHasFetched(true);
    } catch (error: any) {
      // Don't log auth errors as they're expected during initial load
      if (!error.message?.includes('not authenticated')) {
        console.error('Failed to fetch storage usage:', error);
      }
    } finally {
      setIsLoadingStorage(false);
    }
  }, [isAuthenticated, user?.uid, isLoadingStorage]);

  // Only auto-fetch once when authenticated
  useEffect(() => {
    if (isAuthenticated && user?.uid && !hasFetched && !isLoadingStorage) {
      fetchStorageUsage();
    }
  }, [isAuthenticated, user?.uid, hasFetched, isLoadingStorage, fetchStorageUsage]);

  // Manual refresh handler (resets hasFetched to allow re-fetch)
  const handleRefresh = useCallback(async () => {
    if (!isAuthenticated || !user?.uid || isLoadingStorage) return;

    try {
      setIsLoadingStorage(true);
      const data = await apiGet<StorageUsage>('/api/storage-usage');
      setStorageUsage(data);
    } catch (error: any) {
      console.error('Failed to refresh storage usage:', error);
    } finally {
      setIsLoadingStorage(false);
    }
  }, [isAuthenticated, user?.uid, isLoadingStorage]);

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
        </div>
      </div>

      {/* Storage Usage */}
      <div className="mb-6">
        <StorageUsageCard
          storageUsage={storageUsage}
          isLoading={isLoadingStorage}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Settings Navigation */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Preferences
        </h2>
        <div className="space-y-3">
          <SettingsLinkCard
            href="/settings/notifications"
            title="Notifications"
            description="Configure push notifications, daily summaries, and alerts"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            }
          />
          <SettingsLinkCard
            href="/settings/quiet-hours"
            title="Quiet Hours"
            description="Set Do Not Disturb schedules to pause notifications"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            }
          />
          <SettingsLinkCard
            href="/settings/life-feed"
            title="Life Feed"
            description="Customize AI-generated posts, frequency, and content style"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            }
          />
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
        </div>
      </div>

      {/* Coming Soon */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          More Settings Coming Soon
        </h3>
        <p className="text-blue-800 dark:text-blue-200 mb-3">
          Additional settings will be available in future updates:
        </p>
        <ul className="list-disc list-inside text-blue-700 dark:text-blue-300 space-y-1 text-sm">
          <li>Data export options</li>
          <li>Privacy settings</li>
          <li>Account management</li>
          <li>Language preferences</li>
        </ul>
      </div>
    </div>
  );
}
