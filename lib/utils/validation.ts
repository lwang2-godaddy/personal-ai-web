/**
 * Validation Utilities
 * Platform-agnostic validation logic that can be shared between web and mobile
 */

import { APP_CONSTANTS } from '../constants';
import { TextNote } from '../models/TextNote';
import { VoiceNote } from '../models/VoiceNote';
import { PhotoMemory } from '../models/PhotoMemory';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate Text Note (Diary/Journal Entry)
 */
export const validateTextNote = (note: Partial<TextNote>): ValidationResult => {
  const errors: string[] = [];

  // Title validation
  if (!note.title || note.title.trim().length === 0) {
    errors.push('Title is required');
  } else if (note.title.length > APP_CONSTANTS.TEXT_NOTE_MAX_TITLE_LENGTH) {
    errors.push(`Title must be less than ${APP_CONSTANTS.TEXT_NOTE_MAX_TITLE_LENGTH} characters`);
  }

  // Content validation
  if (!note.content || note.content.trim().length === 0) {
    errors.push('Content is required');
  } else if (note.type !== 'thought' && note.content.trim().length < APP_CONSTANTS.TEXT_NOTE_MIN_CONTENT_LENGTH) {
    // Skip minimum length check for quick thoughts (like Twitter)
    errors.push(`Content must be at least ${APP_CONSTANTS.TEXT_NOTE_MIN_CONTENT_LENGTH} characters`);
  } else if (note.content.length > APP_CONSTANTS.TEXT_NOTE_MAX_CONTENT_LENGTH) {
    errors.push(`Content must be less than ${APP_CONSTANTS.TEXT_NOTE_MAX_CONTENT_LENGTH} characters`);
  }

  // Tags validation
  if (note.tags) {
    if (note.tags.length > APP_CONSTANTS.TEXT_NOTE_MAX_TAGS) {
      errors.push(`Maximum ${APP_CONSTANTS.TEXT_NOTE_MAX_TAGS} tags allowed`);
    }

    note.tags.forEach((tag, index) => {
      if (tag.length > APP_CONSTANTS.TEXT_NOTE_MAX_TAG_LENGTH) {
        errors.push(`Tag ${index + 1} must be less than ${APP_CONSTANTS.TEXT_NOTE_MAX_TAG_LENGTH} characters`);
      }
    });
  }

  // Location validation (if provided)
  if (note.location) {
    if (typeof note.location.latitude !== 'number' || note.location.latitude < -90 || note.location.latitude > 90) {
      errors.push('Invalid latitude (-90 to 90)');
    }
    if (typeof note.location.longitude !== 'number' || note.location.longitude < -180 || note.location.longitude > 180) {
      errors.push('Invalid longitude (-180 to 180)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate Voice Note
 */
export const validateVoiceNote = (note: Partial<VoiceNote>): ValidationResult => {
  const errors: string[] = [];

  if (!note.audioUrl || note.audioUrl.trim().length === 0) {
    errors.push('Audio URL is required');
  }

  if (!note.transcription || note.transcription.trim().length === 0) {
    errors.push('Transcription is required');
  }

  if (typeof note.duration !== 'number' || note.duration <= 0) {
    errors.push('Valid duration is required');
  } else if (note.duration > APP_CONSTANTS.VOICE_NOTE_MAX_DURATION) {
    errors.push(`Voice note must be less than ${APP_CONSTANTS.VOICE_NOTE_MAX_DURATION} seconds`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate Photo Memory
 */
export const validatePhotoMemory = (photo: Partial<PhotoMemory>): ValidationResult => {
  const errors: string[] = [];

  if (!photo.imageUrl || photo.imageUrl.trim().length === 0) {
    errors.push('Image URL is required');
  }

  if (!photo.thumbnailUrl || photo.thumbnailUrl.trim().length === 0) {
    errors.push('Thumbnail URL is required');
  }

  if (!photo.autoDescription || photo.autoDescription.trim().length === 0) {
    errors.push('Auto-description is required');
  }

  if (photo.dimensions) {
    if (photo.dimensions.width < APP_CONSTANTS.PHOTO_MIN_DIMENSION ||
        photo.dimensions.height < APP_CONSTANTS.PHOTO_MIN_DIMENSION) {
      errors.push(`Photo dimensions must be at least ${APP_CONSTANTS.PHOTO_MIN_DIMENSION}x${APP_CONSTANTS.PHOTO_MIN_DIMENSION}`);
    }
    if (photo.dimensions.width > APP_CONSTANTS.PHOTO_MAX_DIMENSION ||
        photo.dimensions.height > APP_CONSTANTS.PHOTO_MAX_DIMENSION) {
      errors.push(`Photo dimensions must not exceed ${APP_CONSTANTS.PHOTO_MAX_DIMENSION}x${APP_CONSTANTS.PHOTO_MAX_DIMENSION}`);
    }
  }

  if (typeof photo.fileSize === 'number' && photo.fileSize > APP_CONSTANTS.PHOTO_MAX_SIZE) {
    errors.push(`Photo size must not exceed ${Math.round(APP_CONSTANTS.PHOTO_MAX_SIZE / 1024 / 1024)}MB`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Sanitize text input (remove leading/trailing whitespace, normalize newlines)
 */
export const sanitizeText = (text: string): string => {
  return text.trim().replace(/\r\n/g, '\n');
};

/**
 * Truncate text to max length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Validate tag (single tag string)
 */
export const validateTag = (tag: string): boolean => {
  return tag.length > 0 && tag.length <= APP_CONSTANTS.TEXT_NOTE_MAX_TAG_LENGTH;
};
