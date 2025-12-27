'use client';

import React, { useState } from 'react';
import { CircleMember } from '@/lib/models/Circle';

interface CircleMemberListItemProps {
  member: CircleMember;
  displayName: string;
  currentUserRole: 'creator' | 'admin' | 'member';
  isCurrentUser: boolean;
  onAction: (action: 'promote' | 'demote' | 'remove', memberId: string) => void;
}

export const CircleMemberListItem: React.FC<CircleMemberListItemProps> = ({
  member,
  displayName,
  currentUserRole,
  isCurrentUser,
  onAction,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const getRoleLabel = () => {
    switch (member.role) {
      case 'creator':
        return 'Creator';
      case 'admin':
        return 'Admin';
      case 'member':
        return 'Member';
      default:
        return 'Member';
    }
  };

  const getRoleBadgeColor = () => {
    switch (member.role) {
      case 'creator':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'member':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canPromote = currentUserRole === 'creator' && member.role === 'member';
  const canDemote = currentUserRole === 'creator' && member.role === 'admin';
  const canRemove =
    (currentUserRole === 'creator' || currentUserRole === 'admin') &&
    member.role !== 'creator' &&
    !isCurrentUser;

  const hasActions = canPromote || canDemote || canRemove;

  const handlePromote = () => {
    onAction('promote', member.id);
    setShowMenu(false);
  };

  const handleDemote = () => {
    onAction('demote', member.id);
    setShowMenu(false);
  };

  const handleRemove = () => {
    if (confirm(`Are you sure you want to remove ${displayName} from this circle?`)) {
      onAction('remove', member.id);
      setShowMenu(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
          {displayName.charAt(0).toUpperCase()}
        </div>

        {/* Name and Role */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {displayName}
              {isCurrentUser && <span className="text-gray-500 ml-1">(You)</span>}
            </span>
          </div>
          <span
            className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full mt-1 ${getRoleBadgeColor()}`}
          >
            {getRoleLabel()}
          </span>
        </div>
      </div>

      {/* Actions Menu */}
      {hasActions && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              {canPromote && (
                <button
                  onClick={handlePromote}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Promote to Admin
                </button>
              )}
              {canDemote && (
                <button
                  onClick={handleDemote}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Demote to Member
                </button>
              )}
              {canRemove && (
                <button
                  onClick={handleRemove}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Remove from Circle
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
