/**
 * Friend Invite data models
 * Used for shareable invite links and QR codes
 */

export type FriendInviteType = 'single' | 'reusable';
export type FriendInviteStatus = 'active' | 'expired' | 'revoked' | 'exhausted';

export interface FriendInvite {
  id: string;
  token: string;              // 12-char alphanumeric unique token
  inviterId: string;          // User ID of person who created the invite
  inviterEmail: string;
  inviterDisplayName: string;
  inviterPhotoURL: string | null;
  type: FriendInviteType;     // 'single' = one-time use, 'reusable' = multiple uses
  maxUses: number | null;     // null = unlimited (for reusable)
  currentUses: number;        // How many times this invite has been used
  message?: string;           // Optional personal message
  status: FriendInviteStatus;
  acceptedByUserIds: string[]; // List of users who accepted this invite
  createdAt: string;          // ISO 8601 timestamp
  expiresAt: string;          // ISO 8601 timestamp (30 days from creation)
}

/**
 * Preview of an invite (for unauthenticated users viewing invite page)
 */
export interface FriendInvitePreview {
  token: string;
  inviterDisplayName: string;
  inviterPhotoURL: string | null;
  message?: string;
  isValid: boolean;           // Whether invite can still be accepted
  invalidReason?: 'expired' | 'revoked' | 'exhausted' | 'not_found';
}

/**
 * Create invite request payload
 */
export interface CreateFriendInviteRequest {
  type: FriendInviteType;
  message?: string;
  maxUses?: number;           // Only for 'reusable' type
}

/**
 * Accept invite request payload
 */
export interface AcceptFriendInviteRequest {
  token: string;
}

/**
 * Accept invite response
 */
export interface AcceptFriendInviteResponse {
  success: boolean;
  friendshipId?: string;
  inviterDisplayName?: string;
  error?: string;
}

/**
 * Generate the full invite URL
 */
export function getInviteUrl(token: string): string {
  return `https://sircharge.ai/invite/${token}`;
}

/**
 * Generate a random 12-character alphanumeric token
 */
export function generateInviteToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Check if an invite is still valid
 */
export function isInviteValid(invite: FriendInvite): boolean {
  if (invite.status !== 'active') {
    return false;
  }

  const now = new Date();
  const expiresAt = new Date(invite.expiresAt);
  if (now > expiresAt) {
    return false;
  }

  if (invite.type === 'single' && invite.currentUses >= 1) {
    return false;
  }

  if (invite.maxUses !== null && invite.currentUses >= invite.maxUses) {
    return false;
  }

  return true;
}

/**
 * Get the reason why an invite is invalid
 */
export function getInvalidReason(invite: FriendInvite): FriendInvitePreview['invalidReason'] | undefined {
  if (invite.status === 'revoked') {
    return 'revoked';
  }

  const now = new Date();
  const expiresAt = new Date(invite.expiresAt);
  if (now > expiresAt || invite.status === 'expired') {
    return 'expired';
  }

  if (invite.status === 'exhausted') {
    return 'exhausted';
  }

  if (invite.type === 'single' && invite.currentUses >= 1) {
    return 'exhausted';
  }

  if (invite.maxUses !== null && invite.currentUses >= invite.maxUses) {
    return 'exhausted';
  }

  return undefined;
}
