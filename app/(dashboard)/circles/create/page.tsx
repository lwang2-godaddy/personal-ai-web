'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { createCircle } from '@/lib/store/slices/circleSlice';
import DataSharingToggles from '@/components/circles/DataSharingToggles';
import { Circle, CircleDataSharing, CircleSettings } from '@/lib/models/Circle';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

/**
 * Create circle page
 * Form to create a new circle with friends
 */
export default function CreateCirclePage() {
  useTrackPage(TRACKED_SCREENS.circlesCreate);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { isLoading } = useAppSelector((state) => state.circles);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('👥');
  const [type, setType] = useState<'open' | 'private'>('private');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  const [dataSharing, setDataSharing] = useState<CircleDataSharing>({
    shareHealth: true,
    shareLocation: true,
    shareActivities: true,
    shareVoiceNotes: false,
    sharePhotos: false,
    shareDiary: false,
  });

  const [settings, setSettings] = useState<CircleSettings>({
    allowMemberInvites: true,
    allowChallenges: true,
    allowGroupChat: true,
    notifyOnNewMember: true,
    notifyOnActivity: false,
  });

  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Please enter a circle name');
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    // For now, create circle with just current user
    // In full implementation, this would include friend selection
    const circleData: Omit<Circle, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      description: description.trim() || undefined,
      emoji: emoji || '👥',
      createdBy: user.uid,
      memberIds: [user.uid, ...selectedFriendIds],
      type,
      dataSharing,
      settings,
    };

    try {
      await dispatch(createCircle(circleData)).unwrap();
      router.push('/circles');
    } catch (err: any) {
      setError(err || 'Failed to create circle');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Circle</h1>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Info</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Circle Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Badminton Crew, Running Buddies"
                maxLength={50}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this circle about?"
                maxLength={200}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emoji Icon</label>
              <input
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="👥"
                maxLength={2}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Circle Type</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setType('open')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                    type === 'open'
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => setType('private')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                    type === 'private'
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Private 🔒
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Data Sharing Settings */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <DataSharingToggles dataSharing={dataSharing} onChange={setDataSharing} />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Create Circle'}
          </button>
        </div>
      </div>
    </div>
  );
}
