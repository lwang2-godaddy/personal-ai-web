/**
 * Circle Models
 *
 * Data models for Close Friend Circles feature.
 * Enables users to create private group circles, share data based on custom per-circle rules,
 * engage in RAG-powered group chats, and participate in circle-specific challenges and analytics.
 */

import { ContextReference } from './ChatMessage';

// ============================================================================
// CIRCLE
// ============================================================================

// Privacy tiers for predefined circles
export type PrivacyTier = 'acquaintances' | 'friends' | 'close_friends' | 'inner_circle';

export interface Circle {
  id: string;
  name: string; // "Badminton Crew", "Running Buddies"
  description?: string;
  emoji?: string; // 🏸, 🏃, 💪
  createdBy: string; // userId
  memberIds: string[]; // Array of userIds
  type: 'open' | 'private';
  dataSharing: CircleDataSharing;
  settings: CircleSettings;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp

  // Predefined privacy circle fields
  isPredefined?: boolean; // true for auto-created privacy tiers
  privacyTier?: PrivacyTier; // Which tier this circle represents
  ownerUserId?: string; // User who owns these predefined circles (different from createdBy for system)
  systemCreatedAt?: string; // When system auto-created this circle
}

export interface CircleDataSharing {
  shareHealth: boolean; // Steps, workouts, sleep
  shareLocation: boolean; // GPS history, places visited
  shareActivities: boolean; // Activity tags, shared activities
  shareVoiceNotes: boolean; // Audio transcriptions
  sharePhotos: boolean; // Photo metadata
}

export interface CircleSettings {
  allowMemberInvites: boolean; // Members can invite their friends
  allowChallenges: boolean; // Enable circle challenges
  allowGroupChat: boolean; // Enable circle chat
  notifyOnNewMember: boolean; // Notify when someone joins
  notifyOnActivity: boolean; // Notify on new activities
}

// ============================================================================
// CIRCLE MEMBER
// ============================================================================

export interface CircleMember {
  id: string; // {circleId}_{userId}
  circleId: string;
  userId: string;
  role: 'creator' | 'admin' | 'member';
  joinedAt: string; // ISO timestamp
  invitedBy: string; // userId who invited
  personalDataSharing?: Partial<CircleDataSharing>; // Override circle defaults
  status: 'active' | 'left' | 'removed';
  leftAt?: string; // ISO timestamp
  removedBy?: string; // userId who removed
  removedReason?: string;
}

// ============================================================================
// CIRCLE INVITE
// ============================================================================

export interface CircleInvite {
  id: string;
  circleId: string;
  fromUserId: string;
  toUserId: string;
  message?: string; // Optional personal message
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string; // ISO timestamp
  respondedAt?: string; // ISO timestamp
  expiresAt: string; // ISO timestamp (30 days from creation)
}

// ============================================================================
// CIRCLE MESSAGE
// ============================================================================

export interface CircleMessage {
  id: string;
  circleId: string;
  userId: string; // 'ai' for AI responses
  content: string;
  type: 'text' | 'voice' | 'system';
  voiceNoteUrl?: string;
  voiceNoteDuration?: number; // seconds
  contextUsed?: ContextReference[]; // RAG sources with attribution
  isAIResponse?: boolean;
  createdAt: string; // ISO timestamp
  editedAt?: string; // ISO timestamp
  deletedAt?: string; // ISO timestamp
  reactions?: Reaction[];
}

export interface Reaction {
  userId: string;
  emoji: string;
  createdAt: string; // ISO timestamp
}

// ============================================================================
// CIRCLE ANALYTICS
// ============================================================================

export interface CircleAnalytics {
  id: string; // Same as circleId
  circleId: string;
  generatedAt: string; // ISO timestamp
  totalActivities: number;
  totalMessages: number;
  activeMemberCount: number;
  activeChallenges: number;
  completedChallenges: number;
  topContributors: CircleContributor[];
  insights: CircleInsight[];
  peakActivityTimes: PeakActivityTime[];
}

export interface CircleContributor {
  userId: string;
  activityCount: number;
  messageCount: number;
}

export interface CircleInsight {
  type: 'pattern' | 'achievement' | 'suggestion';
  title: string;
  description: string;
  confidence: number; // 0-100
}

export interface PeakActivityTime {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  hourOfDay: number; // 0-23
  activityCount: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isCircleCreator(circle: Circle, userId: string): boolean {
  return circle.createdBy === userId;
}

export function isCircleMember(circle: Circle, userId: string): boolean {
  return circle.memberIds.includes(userId);
}

export function isCircleAdmin(member: CircleMember): boolean {
  return member.role === 'creator' || member.role === 'admin';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get default circle data sharing settings (all enabled)
 */
export function getDefaultDataSharing(): CircleDataSharing {
  return {
    shareHealth: true,
    shareLocation: true,
    shareActivities: true,
    shareVoiceNotes: false, // Voice notes private by default
    sharePhotos: true,
  };
}

/**
 * Get default circle settings
 */
export function getDefaultCircleSettings(): CircleSettings {
  return {
    allowMemberInvites: true,
    allowChallenges: true,
    allowGroupChat: true,
    notifyOnNewMember: true,
    notifyOnActivity: false,
  };
}

/**
 * Generate circle member ID
 */
export function generateCircleMemberId(circleId: string, userId: string): string {
  return `${circleId}_${userId}`;
}

/**
 * Calculate invite expiration date (30 days from now)
 */
export function calculateInviteExpiration(): string {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  return expiresAt.toISOString();
}

/**
 * Check if invite is expired
 */
export function isInviteExpired(invite: CircleInvite): boolean {
  return new Date(invite.expiresAt) < new Date();
}

/**
 * Format circle member count
 */
export function formatMemberCount(count: number): string {
  if (count === 1) return '1 member';
  return `${count} members`;
}

/**
 * Check if circle is a predefined privacy tier circle
 */
export function isPredefinedCircle(circle: Circle): boolean {
  return circle.isPredefined === true && !!circle.privacyTier;
}

/**
 * Check if user is owner of predefined circle
 */
export function isPredefinedCircleOwner(circle: Circle, userId: string): boolean {
  return circle.isPredefined === true && circle.ownerUserId === userId;
}

/**
 * Get privacy tier display info
 */
export function getPrivacyTierInfo(tier: PrivacyTier): { name: string; emoji: string; description: string } {
  const tierInfo: Record<PrivacyTier, { name: string; emoji: string; description: string }> = {
    acquaintances: {
      name: 'Acquaintances',
      emoji: '👋',
      description: 'Life Feed summaries only',
    },
    friends: {
      name: 'Friends',
      emoji: '🤝',
      description: 'Life Feed + Activity stats',
    },
    close_friends: {
      name: 'Close Friends',
      emoji: '💫',
      description: 'Life Feed + Photos + Activity stats',
    },
    inner_circle: {
      name: 'Inner Circle',
      emoji: '❤️',
      description: 'Everything (diary, voice, photos, health)',
    },
  };
  return tierInfo[tier];
}
