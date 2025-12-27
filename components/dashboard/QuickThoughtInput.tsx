'use client';

import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { submitQuickThought } from '@/lib/store/slices/quickCreateSlice';
import { fetchDashboardData } from '@/lib/store/slices/dashboardSlice';
import { QuickVoiceRecorder } from './QuickVoiceRecorder';

const MAX_LENGTH = 280;

/**
 * QuickThoughtInput Component
 *
 * Inline compose box for quick thoughts with voice recording.
 * Displays at the top of the dashboard for immediate engagement.
 */
export function QuickThoughtInput() {
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const dispatch = useAppDispatch();
  const { isSubmitting } = useAppSelector((state) => state.quickCreate);
  const userId = useAppSelector((state) => state.auth.user?.uid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() || content.length > MAX_LENGTH) return;

    await dispatch(submitQuickThought({
      content: content.trim(),
      tags: [],
    }));

    // Clear form immediately
    setContent('');
    setIsFocused(false);

    // Refresh dashboard immediately to show the new note (will show "Processing...")
    if (userId) {
      dispatch(fetchDashboardData(userId));

      // Refresh again after 3 seconds to show "Indexed" status
      // (gives Cloud Function time to generate embedding)
      setTimeout(() => {
        dispatch(fetchDashboardData(userId));
      }, 3000);
    }
  };

  const characterCount = content.length;
  const remaining = MAX_LENGTH - characterCount;
  const isNearLimit = remaining <= 20;
  const isOverLimit = remaining < 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
      <form onSubmit={handleSubmit}>
        <div className="flex items-start gap-3">
          {/* Avatar placeholder */}
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
            <span className="text-lg" role="img" aria-label="thought bubble">
              💭
            </span>
          </div>

          {/* Input area */}
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              placeholder="What's on your mind?"
              rows={isFocused ? 3 : 1}
              maxLength={MAX_LENGTH}
              className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-all text-gray-900 dark:text-white placeholder-gray-500 dark:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              disabled={isSubmitting}
            />

            {/* Actions and character count - show when focused or has content */}
            {(isFocused || content) && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Quick thoughts are limited to 280 characters
                </p>
                <div className="flex items-center gap-3">
                  <p
                    className={`text-sm font-medium ${
                      isOverLimit
                        ? 'text-red-600 dark:text-red-400'
                        : isNearLimit
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {remaining}
                  </p>
                  <button
                    type="submit"
                    disabled={isSubmitting || !content.trim() || isOverLimit}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Post'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Voice Recording Button */}
          <div className="flex-shrink-0">
            <QuickVoiceRecorder />
          </div>
        </div>
      </form>
    </div>
  );
}
