'use client';

import React, { useState } from 'react';
import { StorageUsage } from '@/lib/models/StorageUsage';
import {
  formatBytes,
  getStorageColorClass,
  getStorageTextColorClass,
} from '@/lib/utils/storage';

interface StorageUsageCardProps {
  storageUsage: StorageUsage | null;
  isLoading: boolean;
  onRefresh: () => void;
}

/**
 * Storage Usage Card Component
 * Displays storage usage breakdown with progress bar and category details
 */
export function StorageUsageCard({
  storageUsage,
  isLoading,
  onRefresh,
}: StorageUsageCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  // Loading skeleton
  if (isLoading && !storageUsage) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
        <div className="flex justify-between items-center mb-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        </div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-full mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4"></div>
        <div className="space-y-3">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  // No data state
  if (!storageUsage) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Storage Usage
          </h2>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50"
          >
            {isRefreshing ? 'Loading...' : 'Calculate'}
          </button>
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          Click Calculate to view your storage usage.
        </p>
      </div>
    );
  }

  const { total, photos, voiceNotes, calculatedAt, quotaBytes, quotaPercentage } = storageUsage;
  const progressBarColor = getStorageColorClass(quotaPercentage);
  const percentageTextColor = getStorageTextColorClass(quotaPercentage);

  // Format the calculated time
  const lastUpdated = new Date(calculatedAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Storage Usage
        </h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 flex items-center gap-1"
        >
          {isRefreshing ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Refreshing</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Refresh</span>
            </>
          )}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
            style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Usage Summary */}
      <div className="flex justify-between items-baseline mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {total.sizeFormatted} of {formatBytes(quotaBytes)} used
        </p>
        <span className={`text-lg font-semibold ${percentageTextColor}`}>
          {quotaPercentage.toFixed(1)}%
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700 my-4" />

      {/* Category Breakdown */}
      <div className="space-y-3">
        {/* Photos */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📸</span>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Photos</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {photos.count} {photos.count === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            {photos.sizeFormatted}
          </span>
        </div>

        {/* Voice Notes */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎤</span>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Voice Notes</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {voiceNotes.count} {voiceNotes.count === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            {voiceNotes.sizeFormatted}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700 my-4" />

      {/* Last Updated */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Last updated: {lastUpdated}
      </p>
    </div>
  );
}
