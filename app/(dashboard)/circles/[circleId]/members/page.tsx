'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks';
import { CircleMemberListItem } from '@/components/circles';
import { CircleMember } from '@/lib/models/Circle';

export default function CircleMembersPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const circleId = params.circleId as string;

  const { user } = useAppSelector((state) => state.auth);
  const { circles, circleMembers, isLoading } = useAppSelector((state) => state.circles);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string>('');
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const circle = circles.find((c) => c.id === circleId);
  const members = circleMembers[circleId] || [];
  const currentMember = members.find((m) => m.userId === user?.uid);

  useEffect(() => {
    if (!circle || !user) return;

    // Fetch members if not loaded
    if (!circleMembers[circleId]) {
      fetchMembers();
    }
  }, [circleId, user?.uid]);

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/circles/${circleId}/members`, {
        headers: {
          Authorization: `Bearer ${await user?.getIdToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }

      const data = await response.json();
      // TODO: Dispatch to Redux store
      console.log('Members:', data.members);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      setError(error.message);
    }
  };

  const handleAction = async (
    action: 'promote' | 'demote' | 'remove',
    memberId: string
  ) => {
    try {
      setError(null);
      const member = members.find((m) => m.id === memberId);
      if (!member) return;

      if (action === 'promote') {
        // Update role to admin
        const response = await fetch(
          `/api/circles/${circleId}/members/${member.userId}/role`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${await user?.getIdToken()}`,
            },
            body: JSON.stringify({ role: 'admin' }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to promote member');
        }

        alert('Member promoted to admin');
        fetchMembers();
      } else if (action === 'demote') {
        // Update role to member
        const response = await fetch(
          `/api/circles/${circleId}/members/${member.userId}/role`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${await user?.getIdToken()}`,
            },
            body: JSON.stringify({ role: 'member' }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to demote member');
        }

        alert('Member demoted to member');
        fetchMembers();
      } else if (action === 'remove') {
        // Remove member
        const response = await fetch(
          `/api/circles/${circleId}/members/${member.userId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${await user?.getIdToken()}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to remove member');
        }

        alert('Member removed from circle');
        fetchMembers();
      }
    } catch (error: any) {
      console.error('Error performing action:', error);
      setError(error.message);
    }
  };

  const handleInvite = async () => {
    if (!selectedFriendId) return;

    try {
      setIsInviting(true);
      setError(null);

      const response = await fetch(`/api/circles/${circleId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user?.getIdToken()}`,
        },
        body: JSON.stringify({ friendId: selectedFriendId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invite');
      }

      alert('Invite sent successfully');
      setShowInviteModal(false);
      setSelectedFriendId('');
    } catch (error: any) {
      console.error('Error sending invite:', error);
      setError(error.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleLeave = async () => {
    if (currentMember?.role === 'creator') {
      alert('Creators cannot leave the circle. Please transfer ownership first.');
      return;
    }

    if (!confirm('Are you sure you want to leave this circle?')) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(`/api/circles/${circleId}/leave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await user?.getIdToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to leave circle');
      }

      alert('You have left the circle');
      router.push('/circles');
    } catch (error: any) {
      console.error('Error leaving circle:', error);
      setError(error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-gray-600">Loading members...</div>
        </div>
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-gray-600">Circle not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => router.push(`/circles/${circleId}`)}
            className="text-blue-600 hover:text-blue-700 text-sm mb-2"
          >
            ← Back to Circle
          </button>
          <h1 className="text-3xl font-bold">Circle Members</h1>
          <p className="text-gray-600 mt-1">
            {circle.name} • {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex gap-2">
          {(currentMember?.role === 'creator' || currentMember?.role === 'admin') && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Invite Friends
            </button>
          )}
          {currentMember?.role !== 'creator' && (
            <button
              onClick={handleLeave}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Leave Circle
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-3">
        {members.map((member) => (
          <CircleMemberListItem
            key={member.id}
            member={member}
            displayName={member.userId} // TODO: Fetch actual display name
            currentUserRole={currentMember?.role || 'member'}
            isCurrentUser={member.userId === user?.uid}
            onAction={handleAction}
          />
        ))}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Invite Friends to Circle</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Friend
              </label>
              <select
                value={selectedFriendId}
                onChange={(e) => setSelectedFriendId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select a friend...</option>
                {/* TODO: Fetch friends list and filter out existing members */}
              </select>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!selectedFriendId || isInviting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isInviting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
