/**
 * PhotoMemory Model
 *
 * Represents a photo uploaded by the user with:
 * - Dual embeddings (text 1536D + visual CLIP 512D)
 * - Hybrid descriptions (auto-generated + user-edited)
 * - Smart location/activity auto-tagging
 * - Multi-resolution storage (original, thumbnail, medium)
 */

export interface PhotoMemory {
  id?: string;
  userId: string;

  // Storage URLs (Firebase Storage)
  imageUrl: string;              // Original upload
  thumbnailUrl: string;          // 256x256 for UI galleries
  mediumUrl: string;             // 1024x1024 for CLIP processing
  localImagePath?: string;       // Local file path before upload

  // Hybrid Descriptions
  autoDescription: string;       // OpenAI Vision API generated
  userDescription: string | null; // User-edited description (overrides auto)

  // Location Correlation
  latitude: number | null;
  longitude: number | null;
  locationId: string | null;     // Reference to correlated location_data record
  activity: string | null;       // Auto-tagged from location (e.g., 'badminton')
  address: string | null;        // Reverse geocoded or from correlated location

  // Metadata
  takenAt: number | Date;        // EXIF timestamp or upload time (timestamp or Date)
  uploadedAt: number | Date;     // When uploaded to Firebase (timestamp or Date)
  fileSize: number;              // Original file size in bytes
  dimensions: { width: number; height: number };

  // Dual Embeddings
  textEmbeddingId: string | null;   // Points to primary index (1536D)
  visualEmbeddingId: string | null; // Points to visual index (512D CLIP)

  // Organization & Tags
  tags: string[];                // User/AI tags
  isFavorite: boolean;           // User favorited

  // Timestamps
  createdAt?: string;            // Local DB creation time
  updatedAt?: string;            // Local DB update time
}

/**
 * Photo upload state for UI progress tracking
 */
export interface PhotoUploadState {
  isUploading: boolean;
  uploadProgress: number;        // 0-100
  currentPhotoId: string | null;
}

/**
 * Photo gallery item (lightweight for grid views)
 */
export interface PhotoGalleryItem {
  id: string;
  thumbnailUrl: string;
  takenAt: string;
  activity: string | null;
  userDescription: string | null;
  autoDescription: string;
}

/**
 * Processed image data from ImageProcessor
 */
export interface ProcessedImage {
  originalUri: string;
  thumbnailUri: string;
  mediumUri: string;
  dimensions: { width: number; height: number };
  fileSize: number;
  takenAt: Date;
  latitude: number | null;
  longitude: number | null;
}
