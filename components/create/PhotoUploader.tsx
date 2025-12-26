'use client';

/**
 * Photo Uploader Component
 * Browser-based photo upload with:
 * - Image processing (3 versions: original, medium, thumbnail)
 * - OpenAI Vision auto-description
 * - Location correlation with activity tagging
 * - Firebase Storage upload with progress tracking
 */

import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import ImageProcessorService from '@/lib/services/imageProcessor';
import GeolocationService from '@/lib/services/geolocation';
import LocationCorrelationService from '@/lib/services/locationCorrelation';
import { StorageService } from '@/lib/api/firebase/storage';
import { FirestoreService } from '@/lib/api/firebase/firestore';

export function PhotoUploader() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { isOnline } = useAppSelector((state) => state.input);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedImages, setProcessedImages] = useState<any | null>(null);
  const [previewUrls, setPreviewUrls] = useState<{
    original: string | null;
    medium: string | null;
    thumbnail: string | null;
  }>({ original: null, medium: null, thumbnail: null });

  const [autoDescription, setAutoDescription] = useState<string>('');
  const [userDescription, setUserDescription] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string | null;
    activity: string | null;
    locationId: string | null;
  } | null>(null);
  const [showLocationSection, setShowLocationSection] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const imageProcessor = ImageProcessorService.getInstance();
  const geolocationService = GeolocationService.getInstance();
  const locationCorrelation = LocationCorrelationService.getInstance();
  const storageService = StorageService.getInstance();
  const firestoreService = FirestoreService.getInstance();

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      if (previewUrls.original) imageProcessor.revokePreviewUrl(previewUrls.original);
      if (previewUrls.medium) imageProcessor.revokePreviewUrl(previewUrls.medium);
      if (previewUrls.thumbnail) imageProcessor.revokePreviewUrl(previewUrls.thumbnail);
    };
  }, [previewUrls]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await handleFileProcess(file);
  };

  const handleFileDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    await handleFileProcess(file);
  };

  const handleFileProcess = async (file: File) => {
    if (!isOnline) {
      setError('You are offline. Please connect to the internet to upload photos.');
      return;
    }

    setError(null);
    setIsProcessing(true);
    setCurrentStep('Processing image...');

    try {
      // Process image into 3 versions
      const processed = await imageProcessor.processImage(file);
      setProcessedImages(processed);
      setSelectedFile(file);

      // Create preview URLs
      setPreviewUrls({
        original: imageProcessor.createPreviewUrl(processed.original),
        medium: imageProcessor.createPreviewUrl(processed.medium),
        thumbnail: imageProcessor.createPreviewUrl(processed.thumbnail),
      });

      // Get location
      setCurrentStep('Getting location...');
      await handleGetLocation();

      // Generate description
      setCurrentStep('Generating description...');
      await handleGenerateDescription(processed.medium);

      setIsProcessing(false);
      setCurrentStep(null);
    } catch (err: any) {
      console.error('Error processing image:', err);
      setError(err.message || 'Failed to process image');
      setIsProcessing(false);
      setCurrentStep(null);
    }
  };

  const handleGetLocation = async () => {
    try {
      const result = await geolocationService.getCurrentPositionWithAddress();

      // Correlate with location history
      if (user) {
        const match = await locationCorrelation.findClosestLocation(
          user.uid,
          result.latitude,
          result.longitude,
          100 // 100m radius
        );

        setLocation({
          latitude: result.latitude,
          longitude: result.longitude,
          address: result.address || null,
          activity: match?.activity || null,
          locationId: match?.locationId || null,
        });
      } else {
        setLocation({
          latitude: result.latitude,
          longitude: result.longitude,
          address: result.address || null,
          activity: null,
          locationId: null,
        });
      }
    } catch (err: any) {
      console.warn('Failed to get location:', err);
      // Non-fatal error, continue without location
    }
  };

  const handleGenerateDescription = async (mediumBlob: Blob) => {
    try {
      // Upload medium version temporarily to get a URL for Vision API
      const tempUrl = await storageService.uploadFile(
        `temp/${Date.now()}.jpg`,
        mediumBlob,
        undefined
      );

      // Call Vision API
      const response = await fetch('/api/describe-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: tempUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate description');
      }

      const data = await response.json();
      setAutoDescription(data.description || '');
    } catch (err: any) {
      console.warn('Failed to generate description:', err);
      setAutoDescription('A photo from my life.');
    }
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    // Cleanup
    if (previewUrls.original) imageProcessor.revokePreviewUrl(previewUrls.original);
    if (previewUrls.medium) imageProcessor.revokePreviewUrl(previewUrls.medium);
    if (previewUrls.thumbnail) imageProcessor.revokePreviewUrl(previewUrls.thumbnail);

    // Reset state
    setSelectedFile(null);
    setProcessedImages(null);
    setPreviewUrls({ original: null, medium: null, thumbnail: null });
    setAutoDescription('');
    setUserDescription('');
    setTags([]);
    setLocation(null);
    setShowLocationSection(false);
    setUploadProgress(0);
    setCurrentStep(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!user) {
      setError('Please sign in to upload photos');
      return;
    }

    if (!processedImages) {
      setError('No image selected');
      return;
    }

    if (!isOnline) {
      setError('You are offline. Please connect to upload.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Upload 3 versions to Storage
      setCurrentStep('Uploading images...');
      const uploads = [
        {
          path: `users/${user.uid}/photos/${photoId}_original.jpg`,
          file: processedImages.original,
        },
        {
          path: `users/${user.uid}/photos/${photoId}_medium.jpg`,
          file: processedImages.medium,
        },
        {
          path: `users/${user.uid}/photos/${photoId}_thumbnail.jpg`,
          file: processedImages.thumbnail,
        },
      ];

      const urls = await storageService.uploadFiles(uploads, (progress) => {
        setUploadProgress(Math.round(progress * 0.7)); // 0-70%
      });

      setUploadProgress(70);

      // Create photoMemory object
      setCurrentStep('Saving to database...');
      const photoMemory = {
        id: photoId,
        userId: user.uid,
        imageUrl: urls[0],
        mediumUrl: urls[1],
        thumbnailUrl: urls[2],
        autoDescription,
        userDescription: userDescription.trim() || null,
        tags,
        takenAt: new Date().toISOString(),
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        address: location?.address || null,
        activity: location?.activity || null,
        locationId: location?.locationId || null,
        uploadedAt: new Date().toISOString(),
        textEmbeddingId: null,
        visualEmbeddingId: null,
      };

      setUploadProgress(90);

      // Store in Firestore (will trigger Cloud Function for embeddings)
      await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId, photoMemory }),
      });

      setUploadProgress(100);
      setCurrentStep('Complete!');

      // Reset
      setTimeout(() => {
        handleCancel();
        setIsUploading(false);
      }, 1000);

      alert('Photo uploaded successfully!');
    } catch (err: any) {
      console.error('Failed to upload photo:', err);
      setError(`Upload failed: ${err.message}`);
      setIsUploading(false);
      setCurrentStep(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Upload a Photo
        </h2>

        {/* Offline Warning */}
        {!isOnline && (
          <div className="mb-4 p-4 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-700 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              You are offline. Photo upload requires an internet connection.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* File Selection */}
        {!selectedFile && !isProcessing && (
          <div
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center hover:border-blue-500 transition-colors cursor-pointer"
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
              id="photo-input"
              disabled={!isOnline}
            />
            <label htmlFor="photo-input" className="cursor-pointer">
              <div className="text-6xl mb-4">📸</div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                Click to select or drag & drop
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                JPEG, PNG, or WebP (max 10MB)
              </p>
            </label>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <p className="text-gray-700 dark:text-gray-300">{currentStep}</p>
          </div>
        )}

        {/* Preview & Edit */}
        {selectedFile && processedImages && !isProcessing && (
          <div className="space-y-6">
            {/* Image Previews */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Thumbnail (256px)</p>
                {previewUrls.thumbnail && (
                  <img
                    src={previewUrls.thumbnail}
                    alt="Thumbnail"
                    className="w-full h-auto rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                )}
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Medium (1024px)</p>
                {previewUrls.medium && (
                  <img
                    src={previewUrls.medium}
                    alt="Medium"
                    className="w-full h-auto rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                )}
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Original ({processedImages.metadata.originalWidth}x
                  {processedImages.metadata.originalHeight})
                </p>
                {previewUrls.original && (
                  <img
                    src={previewUrls.original}
                    alt="Original"
                    className="w-full h-auto rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                )}
              </div>
            </div>

            {/* Auto Description */}
            {autoDescription && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                  AI-Generated Description:
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">{autoDescription}</p>
              </div>
            )}

            {/* User Description Override */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Description (optional, overrides AI)
              </label>
              <textarea
                value={userDescription}
                onChange={(e) => setUserDescription(e.target.value)}
                placeholder="Describe this photo..."
                maxLength={500}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {userDescription.length} / 500 characters
              </p>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags (optional)
              </label>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(index)}
                        className="ml-2 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Type a tag and press Enter..."
                  maxLength={30}
                  disabled={tags.length >= 10}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-200 dark:disabled:bg-gray-600"
                />
                <button
                  onClick={handleAddTag}
                  disabled={tags.length >= 10}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {tags.length} / 10 tags
              </p>
            </div>

            {/* Location Info */}
            {location && (
              <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg">
                <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                  📍 Location Detected
                </p>
                {location.activity && (
                  <p className="text-sm text-green-700 dark:text-green-300 mb-1">
                    Activity: {location.activity}
                  </p>
                )}
                {location.address && (
                  <p className="text-xs text-green-600 dark:text-green-400">{location.address}</p>
                )}
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </p>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>{currentStep}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={isUploading}
                className="flex-1 px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading || !isOnline}
                className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : 'Upload Photo'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
