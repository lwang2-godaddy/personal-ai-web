'use client';

/**
 * Diary Editor Component
 * Allows users to create diary/journal entries with:
 * - Title and content
 * - Tags for organization
 * - Optional location tagging
 * - Auto-save to localStorage every 30s
 * - Restore draft on mount
 */

import { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
  saveTextNote,
  setTextNoteDraft,
  updateTextNoteDraft,
  setTextNoteLastSaved,
  fetchCurrentLocation,
  clearTextNoteError,
  resetTextNoteState,
} from '@/lib/store/slices/inputSlice';
import { TextNote, TextNoteDraft } from '@/lib/models/TextNote';
import { APP_CONSTANTS } from '@/lib/constants';
import TextNoteService from '@/lib/services/textNoteService';

export function DiaryEditor() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { textNote, geolocation, isOnline } = useAppSelector((state) => state.input);

  // Local state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showLocationSection, setShowLocationSection] = useState(false);
  const [manualLocation, setManualLocation] = useState<{
    latitude: string;
    longitude: string;
    address: string;
  }>({ latitude: '', longitude: '', address: '' });

  // Refs
  const isDraftRestored = useRef(false);

  // Load draft on mount
  useEffect(() => {
    if (!isDraftRestored.current) {
      const draft = TextNoteService.loadDraftFromLocalStorage();
      if (draft) {
        setTitle(draft.title);
        setContent(draft.content);
        setTags(draft.tags);
        if (draft.location) {
          setShowLocationSection(true);
          setManualLocation({
            latitude: draft.location.latitude.toString(),
            longitude: draft.location.longitude.toString(),
            address: draft.location.address || '',
          });
        }
        dispatch(setTextNoteDraft(draft));
        console.log('[DiaryEditor] Restored draft from localStorage');
      }
      isDraftRestored.current = true;
    }
  }, [dispatch]);

  // Auto-save effect
  useEffect(() => {
    const getDraftData = (): TextNoteDraft => ({
      title,
      content,
      tags,
      location: showLocationSection
        ? {
            latitude: parseFloat(manualLocation.latitude) || 0,
            longitude: parseFloat(manualLocation.longitude) || 0,
            address: manualLocation.address || null,
            locationId: null, // Will be null in draft
          }
        : undefined,
      lastSaved: new Date().toISOString(),
    });

    TextNoteService.startAutoSave(getDraftData);

    return () => {
      TextNoteService.stopAutoSave();
    };
  }, [title, content, tags, showLocationSection, manualLocation]);

  // Update Redux draft state
  useEffect(() => {
    dispatch(
      setTextNoteDraft({
        title,
        content,
        tags,
        location: showLocationSection
          ? {
              latitude: parseFloat(manualLocation.latitude) || 0,
              longitude: parseFloat(manualLocation.longitude) || 0,
              address: manualLocation.address || null,
              locationId: null, // Will be null in draft
            }
          : undefined,
      })
    );
  }, [title, content, tags, showLocationSection, manualLocation, dispatch]);

  // Handle tag input
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < APP_CONSTANTS.TEXT_NOTE_MAX_TAGS) {
      if (trimmedTag.length <= APP_CONSTANTS.TEXT_NOTE_MAX_TAG_LENGTH) {
        setTags([...tags, trimmedTag]);
        setTagInput('');
      }
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  // Handle location fetching
  const handleFetchLocation = async () => {
    try {
      await dispatch(fetchCurrentLocation()).unwrap();
      if (geolocation.currentLocation) {
        setManualLocation({
          latitude: geolocation.currentLocation.latitude.toString(),
          longitude: geolocation.currentLocation.longitude.toString(),
          address: geolocation.currentLocation.address || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch location:', error);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!user) {
      alert('Please sign in to save your diary entry');
      return;
    }

    if (!isOnline) {
      alert('You are offline. Please connect to the internet to save your entry.');
      return;
    }

    // Validate
    if (title.trim().length === 0) {
      alert('Please enter a title');
      return;
    }

    if (content.trim().length < APP_CONSTANTS.TEXT_NOTE_MIN_CONTENT_LENGTH) {
      alert(`Content must be at least ${APP_CONSTANTS.TEXT_NOTE_MIN_CONTENT_LENGTH} characters`);
      return;
    }

    try {
      // Prepare text note
      const textNoteData: Omit<
        TextNote,
        'id' | 'userId' | 'createdAt' | 'updatedAt' | 'embeddingId'
      > = {
        title,
        content,
        tags,
        location: showLocationSection
          ? {
              latitude: parseFloat(manualLocation.latitude),
              longitude: parseFloat(manualLocation.longitude),
              address: manualLocation.address || null,
              locationId: null,
            }
          : undefined,
      };

      // Save via Redux thunk
      await dispatch(saveTextNote({ textNote: textNoteData, userId: user.uid })).unwrap();

      // Clear draft and reset form
      TextNoteService.clearDraftFromLocalStorage();
      setTitle('');
      setContent('');
      setTags([]);
      setShowLocationSection(false);
      setManualLocation({ latitude: '', longitude: '', address: '' });

      alert('Diary entry saved successfully!');
    } catch (error: any) {
      console.error('Failed to save diary entry:', error);
      alert(`Failed to save: ${error.message || 'Unknown error'}`);
    }
  };

  // Handle clear
  const handleClear = () => {
    if (
      title.trim().length > 0 ||
      content.trim().length > 0 ||
      tags.length > 0
    ) {
      if (confirm('Are you sure you want to clear all content?')) {
        setTitle('');
        setContent('');
        setTags([]);
        setShowLocationSection(false);
        setManualLocation({ latitude: '', longitude: '', address: '' });
        TextNoteService.clearDraftFromLocalStorage();
        dispatch(resetTextNoteState());
      }
    }
  };

  // Character counts
  const titleLength = title.length;
  const contentLength = content.length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Write a Diary Entry
        </h2>

        {/* Offline Warning */}
        {!isOnline && (
          <div className="mb-4 p-4 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-700 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              You are offline. Your draft will be auto-saved locally, but you need to be online to
              save to the cloud.
            </p>
          </div>
        )}

        {/* Error */}
        {textNote.error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded-lg flex justify-between items-center">
            <p className="text-sm text-red-800 dark:text-red-200">{textNote.error}</p>
            <button
              onClick={() => dispatch(clearTextNoteError())}
              className="text-red-800 dark:text-red-200 hover:text-red-600 dark:hover:text-red-400"
            >
              ✕
            </button>
          </div>
        )}

        {/* Title */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={APP_CONSTANTS.TEXT_NOTE_MAX_TITLE_LENGTH}
            placeholder="Give your entry a title..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
            {titleLength} / {APP_CONSTANTS.TEXT_NOTE_MAX_TITLE_LENGTH}
          </p>
        </div>

        {/* Content */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Content
            <span className="text-red-500 ml-1">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={APP_CONSTANTS.TEXT_NOTE_MAX_CONTENT_LENGTH}
            rows={12}
            placeholder="Write your thoughts, experiences, or daily reflections..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
            {contentLength} / {APP_CONSTANTS.TEXT_NOTE_MAX_CONTENT_LENGTH} (min:{' '}
            {APP_CONSTANTS.TEXT_NOTE_MIN_CONTENT_LENGTH})
          </p>
        </div>

        {/* Tags */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tags (optional)
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
              >
                {tag}
                <button
                  onClick={() => removeTag(index)}
                  className="ml-2 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              onBlur={addTag}
              maxLength={APP_CONSTANTS.TEXT_NOTE_MAX_TAG_LENGTH}
              placeholder="Type a tag and press Enter..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={tags.length >= APP_CONSTANTS.TEXT_NOTE_MAX_TAGS}
            />
            <button
              onClick={addTag}
              disabled={tags.length >= APP_CONSTANTS.TEXT_NOTE_MAX_TAGS}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {tags.length} / {APP_CONSTANTS.TEXT_NOTE_MAX_TAGS} tags
          </p>
        </div>

        {/* Location Section */}
        <div className="mb-6">
          <button
            onClick={() => setShowLocationSection(!showLocationSection)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showLocationSection ? '− Hide Location' : '+ Add Location (optional)'}
          </button>

          {showLocationSection && (
            <div className="mt-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Location Details
                </h3>
                <button
                  onClick={handleFetchLocation}
                  disabled={geolocation.isFetching}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {geolocation.isFetching ? 'Fetching...' : 'Get Current Location'}
                </button>
              </div>

              {geolocation.error && (
                <div className="mb-3 p-2 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded text-sm text-red-800 dark:text-red-200">
                  {geolocation.error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={manualLocation.latitude}
                    onChange={(e) =>
                      setManualLocation({ ...manualLocation, latitude: e.target.value })
                    }
                    placeholder="e.g., 37.7749"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={manualLocation.longitude}
                    onChange={(e) =>
                      setManualLocation({ ...manualLocation, longitude: e.target.value })
                    }
                    placeholder="e.g., -122.4194"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Address (optional)
                </label>
                <input
                  type="text"
                  value={manualLocation.address}
                  onChange={(e) =>
                    setManualLocation({ ...manualLocation, address: e.target.value })
                  }
                  placeholder="e.g., San Francisco, CA"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {textNote.lastSaved && (
              <span>Last saved: {new Date(textNote.lastSaved).toLocaleTimeString()}</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClear}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Clear
            </button>
            <button
              onClick={handleSave}
              disabled={textNote.isSaving || !isOnline}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {textNote.isSaving ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
