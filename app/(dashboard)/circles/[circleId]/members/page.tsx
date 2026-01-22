'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/store/hooks';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/client';
import { CircleMemberListItem } from '@/components/circles';
import { CircleMember, CircleInvite } from '@/lib/models/Circle';
import { FriendWithProfile } from '@/lib/models/Friend';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

interface PendingInviteInfo {
  friendId: string;
  status: 'pending';
}

export default function CircleMembersPage() {
  useTrackPage(TRACKED_SCREENS.circleMembers);
  const params = useParams();
  const router = useRouter();
  const circleId = params.circleId as string;

  const { user } = useAppSelector((state) => state.auth);
  const { circles, circleMembers, isLoading } = useAppSelector((state) => state.circles);

  // Main state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invite modal state
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [inviteMessage, setInviteMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<Set<string>>(new Set());

  const circle = circles.find((c) => c.id === circleId);
  const members = circleMembers[circleId] || [];
  const currentMember = members.find((m) => m.userId === user?.uid);

  // Get set of existing member user IDs
  const existingMemberIds = useMemo(() => {
    return new Set(members.map((m) => m.userId));
  }, [members]);

  // Filter friends based on search query
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;

    const query = searchQuery.toLowerCase();
    return friends.filter((friend) => {
      const name = friend.displayName?.toLowerCase() || '';
      const email = friend.email?.toLowerCase() || '';
      return name.includes(query) || email.includes(query);
    });
  }, [friends, searchQuery]);

  // Categorize friends
  const { availableFriends, unavailableFriends } = useMemo(() => {
    const available: FriendWithProfile[] = [];
    const unavailable: Array<FriendWithProfile & { reason: string }> = [];

    filteredFriends.forEach((friend) => {
      if (existingMemberIds.has(friend.friendUserId)) {
        unavailable.push({ ...friend, reason: 'Already a member' });
      } else if (pendingInvites.has(friend.friendUserId)) {
        unavailable.push({ ...friend, reason: 'Invite pending' });
      } else {
        available.push(friend);
      }
    });

    return { availableFriends: available, unavailableFriends: unavailable };
  }, [filteredFriends, existingMemberIds, pendingInvites]);

  useEffect(() => {
    if (!circle || !user) return;

    // Fetch members if not loaded
    if (!circleMembers[circleId]) {
      fetchMembers();
    }
  }, [circleId, user?.uid]);

  const fetchMembers = async () => {
    try {
      const data = await apiGet<{ members: CircleMember[] }>(`/api/circles/${circleId}/members`);
      // TODO: Dispatch to Redux store
      console.log('Members:', data.members);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      setError(error.message);
    }
  };

  const fetchFriends = useCallback(async () => {
    try {
      setIsLoadingFriends(true);
      setInviteError(null);
      const data = await apiGet<{ friends: FriendWithProfile[] }>('/api/friends');
      setFriends(data.friends);
    } catch (error: any) {
      console.error('Error fetching friends:', error);
      setInviteError('Failed to load friends list');
    } finally {
      setIsLoadingFriends(false);
    }
  }, []);

  const openInviteModal = () => {
    setShowInviteModal(true);
    setSelectedFriendIds(new Set());
    setInviteMessage('');
    setSearchQuery('');
    setInviteError(null);
    fetchFriends();
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setSelectedFriendIds(new Set());
    setInviteMessage('');
    setSearchQuery('');
    setInviteError(null);
  };

  const toggleFriendSelection = (friendId: string) => {
    const newSelection = new Set(selectedFriendIds);
    if (newSelection.has(friendId)) {
      newSelection.delete(friendId);
    } else {
      newSelection.add(friendId);
    }
    setSelectedFriendIds(newSelection);
  };

  const handleInvite = async () => {
    if (selectedFriendIds.size === 0) return;

    try {
      setIsInviting(true);
      setInviteError(null);

      const friendIdsArray = Array.from(selectedFriendIds);
      const results: { friendId: string; success: boolean; error?: string }[] = [];

      // Send invites one by one (could be batched in future)
      for (const friendId of friendIdsArray) {
        try {
          await apiPost(`/api/circles/${circleId}/invite`, {
            friendId,
            message: inviteMessage || undefined,
          });
          results.push({ friendId, success: true });
          // Add to pending invites
          setPendingInvites((prev) => new Set([...prev, friendId]));
        } catch (error: any) {
          results.push({ friendId, success: false, error: error.message });
        }
      }

      // Count successes and failures
      const successes = results.filter((r) => r.success);
      const failures = results.filter((r) => !r.success);

      if (failures.length === 0) {
        // All succeeded
        alert(`${successes.length} invite${successes.length !== 1 ? 's' : ''} sent successfully!`);
        closeInviteModal();
      } else if (successes.length === 0) {
        // All failed
        const errorMessages = failures.map((f) => f.error).join('; ');
        setInviteError(`Failed to send invites: ${errorMessages}`);
      } else {
        // Some succeeded, some failed
        alert(
          `${successes.length} invite${successes.length !== 1 ? 's' : ''} sent. ` +
            `${failures.length} failed: ${failures.map((f) => f.error).join('; ')}`
        );
        // Clear only successful selections
        const failedIds = new Set(failures.map((f) => f.friendId));
        setSelectedFriendIds(failedIds);
      }
    } catch (error: any) {
      console.error('Error sending invites:', error);
      setInviteError(error.message);
    } finally {
      setIsInviting(false);
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
        await apiPatch(`/api/circles/${circleId}/members/${member.userId}/role`, { role: 'admin' });
        alert('Member promoted to admin');
        fetchMembers();
      } else if (action === 'demote') {
        await apiPatch(`/api/circles/${circleId}/members/${member.userId}/role`, { role: 'member' });
        alert('Member demoted to member');
        fetchMembers();
      } else if (action === 'remove') {
        await apiDelete(`/api/circles/${circleId}/members/${member.userId}`);
        alert('Member removed from circle');
        fetchMembers();
      }
    } catch (error: any) {
      console.error('Error performing action:', error);
      setError(error.message);
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
      await apiPost(`/api/circles/${circleId}/leave`, {});
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
          <div className="text-gray-600 dark:text-gray-400">Loading members...</div>
        </div>
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-gray-600 dark:text-gray-400">Circle not found</div>
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
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm mb-2"
          >
            &larr; Back to Circle
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Circle Members</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {circle.name} &bull; {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex gap-2">
          {(currentMember?.role === 'creator' || currentMember?.role === 'admin') && (
            <button
              onClick={openInviteModal}
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
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
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
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Invite Friends to {circle.name}
              </h2>
              <button
                onClick={closeInviteModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search friends..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Friends List */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingFriends ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">Loading friends...</p>
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No friends found.</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Add friends to invite them to your circles.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Available Friends */}
                  {availableFriends.map((friend) => (
                    <button
                      key={friend.friendUserId}
                      onClick={() => toggleFriendSelection(friend.friendUserId)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        selectedFriendIds.has(friend.friendUserId)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      {/* Selection indicator */}
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedFriendIds.has(friend.friendUserId)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {selectedFriendIds.has(friend.friendUserId) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                        {friend.photoURL ? (
                          <img
                            src={friend.photoURL}
                            alt={friend.displayName || 'Friend'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400 text-lg">
                            {(friend.displayName || friend.email || '?')[0].toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Name and email */}
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {friend.displayName || 'Unknown'}
                        </p>
                        {friend.email && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{friend.email}</p>
                        )}
                      </div>
                    </button>
                  ))}

                  {/* Unavailable Friends (existing members / pending invites) */}
                  {unavailableFriends.length > 0 && (
                    <>
                      {availableFriends.length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-700 my-4" />
                      )}
                      {unavailableFriends.map((friend) => (
                        <div
                          key={friend.friendUserId}
                          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed"
                        >
                          {/* Disabled indicator */}
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                            <div className="w-2 h-0.5 bg-gray-400 dark:bg-gray-500"></div>
                          </div>

                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                            {friend.photoURL ? (
                              <img
                                src={friend.photoURL}
                                alt={friend.displayName || 'Friend'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400 text-lg">
                                {(friend.displayName || friend.email || '?')[0].toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Name and status */}
                          <div className="flex-1 text-left">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {friend.displayName || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{friend.reason}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* No results from search */}
                  {searchQuery && filteredFriends.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-gray-500 dark:text-gray-400">
                        No friends matching &quot;{searchQuery}&quot;
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Invite Message */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Add a message (optional)
              </label>
              <textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Join our circle!"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
              />
            </div>

            {/* Error Message */}
            {inviteError && (
              <div className="px-4 pb-4">
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{inviteError}</p>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={closeInviteModal}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={selectedFriendIds.size === 0 || isInviting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInviting ? (
                  <span className="flex items-center justify-center gap-2">
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
                    Sending...
                  </span>
                ) : (
                  `Send Invite${selectedFriendIds.size > 1 ? `s (${selectedFriendIds.size})` : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
