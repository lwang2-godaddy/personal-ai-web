/**
 * Privacy Utility Functions
 *
 * Provides utilities for computing effective sharing settings when
 * per-friend privacy settings intersect with circle sharing rules.
 *
 * Key concept: Per-friend settings define the MAXIMUM you're willing to share
 * with that friend. Circle settings can only request UP TO that limit.
 *
 * Example:
 * - Alice has shareHealth=false for Bob (per-friend setting)
 * - Both are in "Inner Circle" with shareHealth=true (circle setting)
 * - Result: Bob CANNOT see Alice's health data (per-friend wins)
 */

import { CircleDataSharing } from '../models/Circle';
import { FriendPrivacySettings } from '../models/Friend';

/**
 * Compute effective sharing by taking the intersection of circle and per-friend settings.
 *
 * For each data type, sharing is only enabled if BOTH:
 * 1. The circle allows it (circleSharing)
 * 2. The user allows it for that specific friend (friendSettings)
 *
 * @param circleSharing - The circle's data sharing configuration
 * @param friendSettings - The per-friend privacy settings
 * @returns CircleDataSharing with effective (intersected) values
 */
export function computeEffectiveSharing(
  circleSharing: CircleDataSharing,
  friendSettings: FriendPrivacySettings
): CircleDataSharing {
  return {
    shareHealth: circleSharing.shareHealth && friendSettings.shareHealth,
    shareLocation: circleSharing.shareLocation && friendSettings.shareLocation,
    shareActivities: circleSharing.shareActivities && friendSettings.shareActivities,
    shareDiary: circleSharing.shareDiary && friendSettings.shareDiary,
    shareVoiceNotes: circleSharing.shareVoiceNotes && friendSettings.shareVoiceNotes,
    sharePhotos: circleSharing.sharePhotos && friendSettings.sharePhotos,
  };
}

/**
 * Get the default privacy settings for a new friendship.
 * By default, all sharing is enabled (user can restrict later).
 */
export function getDefaultPrivacySettings(): FriendPrivacySettings {
  return {
    shareHealth: true,
    shareLocation: true,
    shareActivities: true,
    shareDiary: true,
    shareVoiceNotes: true,
    sharePhotos: true,
  };
}

/**
 * Check if any data type is restricted by per-friend settings
 * compared to what the circle would allow.
 *
 * @param circleSharing - The circle's data sharing configuration
 * @param friendSettings - The per-friend privacy settings
 * @returns Object with boolean flags for each restricted data type
 */
export function getRestrictedDataTypes(
  circleSharing: CircleDataSharing,
  friendSettings: FriendPrivacySettings
): {
  healthRestricted: boolean;
  locationRestricted: boolean;
  activitiesRestricted: boolean;
  voiceNotesRestricted: boolean;
  photosRestricted: boolean;
} {
  return {
    // A data type is "restricted" if circle allows it but friend settings don't
    healthRestricted: circleSharing.shareHealth && !friendSettings.shareHealth,
    locationRestricted: circleSharing.shareLocation && !friendSettings.shareLocation,
    activitiesRestricted: circleSharing.shareActivities && !friendSettings.shareActivities,
    voiceNotesRestricted: circleSharing.shareVoiceNotes && !friendSettings.shareVoiceNotes,
    photosRestricted: circleSharing.sharePhotos && !friendSettings.sharePhotos,
  };
}

/**
 * Check if the effective sharing is different from circle sharing
 * (i.e., some data types are restricted by per-friend settings).
 *
 * @param circleSharing - The circle's data sharing configuration
 * @param friendSettings - The per-friend privacy settings
 * @returns true if any data type is restricted by per-friend settings
 */
export function hasRestrictedSharing(
  circleSharing: CircleDataSharing,
  friendSettings: FriendPrivacySettings
): boolean {
  const restrictions = getRestrictedDataTypes(circleSharing, friendSettings);
  return (
    restrictions.healthRestricted ||
    restrictions.locationRestricted ||
    restrictions.activitiesRestricted ||
    restrictions.voiceNotesRestricted ||
    restrictions.photosRestricted
  );
}

/**
 * Format a human-readable description of what data types are restricted.
 *
 * @param circleSharing - The circle's data sharing configuration
 * @param friendSettings - The per-friend privacy settings
 * @param friendName - The friend's display name (for personalized message)
 * @returns Array of restricted data type descriptions
 */
export function getRestrictedSharingDescriptions(
  circleSharing: CircleDataSharing,
  friendSettings: FriendPrivacySettings,
  friendName: string
): string[] {
  const descriptions: string[] = [];
  const restrictions = getRestrictedDataTypes(circleSharing, friendSettings);

  if (restrictions.healthRestricted) {
    descriptions.push(`Health (limited by your settings for ${friendName})`);
  }
  if (restrictions.locationRestricted) {
    descriptions.push(`Locations (limited by your settings for ${friendName})`);
  }
  if (restrictions.activitiesRestricted) {
    descriptions.push(`Activities (limited by your settings for ${friendName})`);
  }
  if (restrictions.voiceNotesRestricted) {
    descriptions.push(`Voice Notes (limited by your settings for ${friendName})`);
  }
  if (restrictions.photosRestricted) {
    descriptions.push(`Photos (limited by your settings for ${friendName})`);
  }

  return descriptions;
}
