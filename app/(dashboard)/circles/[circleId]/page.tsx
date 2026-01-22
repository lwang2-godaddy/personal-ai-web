'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppSelector } from '@/lib/store/hooks';
import Link from 'next/link';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

/**
 * Circle detail page
 * Shows circle info with navigation to sub-pages
 */
export default function CircleDetailPage() {
  useTrackPage(TRACKED_SCREENS.circleDetail);
  const router = useRouter();
  const params = useParams();
  const circleId = params.circleId as string;
  const { circles } = useAppSelector((state) => state.circles);

  const circle = circles.find((c) => c.id === circleId);

  if (!circle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Circle Not Found</h2>
        <button
          onClick={() => router.push('/circles')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Circles
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center mb-6">
        <div className="text-6xl mb-4">{circle.emoji || '👥'}</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{circle.name}</h1>
        {circle.description && (
          <p className="text-gray-600 mb-4">{circle.description}</p>
        )}

        <div className="flex items-center justify-center gap-8 mt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{circle.memberIds.length}</div>
            <div className="text-sm text-gray-600">Members</div>
          </div>
          <div className="text-center">
            <div className="text-2xl">{circle.type === 'private' ? '🔒' : '🌐'}</div>
            <div className="text-sm text-gray-600">{circle.type === 'private' ? 'Private' : 'Open'}</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Link
          href={`/circles/${circleId}/chat`}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center"
        >
          <div className="text-4xl mb-2">💬</div>
          <div className="font-medium text-gray-900">Chat</div>
        </Link>
        <Link
          href={`/circles/${circleId}/members`}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center"
        >
          <div className="text-4xl mb-2">👥</div>
          <div className="font-medium text-gray-900">Members</div>
        </Link>
        <Link
          href={`/circles/${circleId}/challenges`}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center"
        >
          <div className="text-4xl mb-2">🏆</div>
          <div className="font-medium text-gray-900">Challenges</div>
        </Link>
        <Link
          href={`/circles/${circleId}/analytics`}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center"
        >
          <div className="text-4xl mb-2">📊</div>
          <div className="font-medium text-gray-900">Analytics</div>
        </Link>
      </div>

      {/* Data Sharing Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Sharing</h2>
        <div className="flex flex-wrap gap-2">
          {circle.dataSharing.shareHealth && (
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">
              💪 Health Data
            </span>
          )}
          {circle.dataSharing.shareLocation && (
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">
              📍 Location
            </span>
          )}
          {circle.dataSharing.shareActivities && (
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">
              🏃 Activities
            </span>
          )}
          {circle.dataSharing.shareVoiceNotes && (
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">
              🎤 Voice Notes
            </span>
          )}
          {circle.dataSharing.sharePhotos && (
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">
              📸 Photos
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
