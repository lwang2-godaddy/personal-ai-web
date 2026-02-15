'use client';

import React from 'react';
import { formatRelativeTime } from './utils';
import type { AdminUser } from './types';

interface UserSelectorProps {
  users: AdminUser[];
  loadingUsers: boolean;
  selectedUserId: string;
  onSelectUser: (userId: string) => void;
  userSearchQuery: string;
  onSearchChange: (query: string) => void;
  filteredUsers: AdminUser[];
  selectedUser?: AdminUser;
  /** Label for the count shown next to user, e.g. "total keywords" */
  countLabel?: string;
  /** Count value to show next to user (defaults to totalCount if provided) */
  totalCount?: number;
}

export default function UserSelector({
  users,
  loadingUsers,
  selectedUserId,
  onSelectUser,
  userSearchQuery,
  onSearchChange,
  filteredUsers,
  selectedUser,
  countLabel,
  totalCount,
}: UserSelectorProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
            Select User
          </label>
          <div className="relative">
            <input
              type="text"
              value={userSearchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search users..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {userSearchQuery && filteredUsers.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      onSelectUser(user.id);
                      onSearchChange('');
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      selectedUserId === user.id ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-900">{user.displayName}</div>
                    <div className="text-xs text-gray-500">
                      {user.email} &middot; {user.postCount} posts &middot; Last:{' '}
                      {formatRelativeTime(user.lastPostAt)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {!userSearchQuery && (
            <select
              value={selectedUserId}
              onChange={(e) => onSelectUser(e.target.value)}
              disabled={loadingUsers}
              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {loadingUsers ? (
                <option>Loading users...</option>
              ) : users.length === 0 ? (
                <option>No users found</option>
              ) : (
                users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName} ({user.postCount} posts)
                  </option>
                ))
              )}
            </select>
          )}
        </div>

        {selectedUser && (
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {totalCount !== undefined && countLabel && (
              <div className="flex items-center gap-1">
                <span className="font-medium text-gray-900">{totalCount}</span>
                <span>{countLabel}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span>Last:</span>
              <span className="font-medium text-gray-900">
                {formatRelativeTime(selectedUser.lastPostAt)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
