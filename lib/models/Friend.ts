/**
 * Friend Model
 *
 * Represents a friendship relationship between two users.
 * The friendship document ID is {userId}_{friendUid} or {friendUid}_{userId}.
 */

export interface Friendship {
  id: string; // {userId}_{friendUid}
  userId: string; // The user who initiated the friendship
  friendUid: string; // The friend's user ID
  createdAt: string; // ISO timestamp
  privacySettings?: FriendPrivacySettings;
}

export interface FriendPrivacySettings {
  shareHealth: boolean;
  shareLocation: boolean;
  shareActivities: boolean;
  shareDiary: boolean;
  shareVoiceNotes: boolean;
  sharePhotos: boolean;
}

/**
 * Friend with user profile information
 * Used when displaying friends list with names and avatars
 */
export interface FriendWithProfile {
  friendshipId: string;
  friendUserId: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: string;
}
