'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { submitQuickThought } from '@/lib/store/slices/quickCreateSlice';
import { fetchDashboardData } from '@/lib/store/slices/dashboardSlice';

const MAX_LENGTH = 280;

export default function QuickThoughtForm() {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isSubmitting, error: submitError } = useAppSelector((state) => state.quickCreate);
  const userId = useAppSelector((state) => state.auth.user?.uid);
  const dispatch = useAppDispatch();

  // Auto-focus textarea when component mounts
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const validate = () => {
    if (!content.trim()) {
      setError('Thought cannot be empty');
      return false;
    }

    if (content.length > MAX_LENGTH) {
      setError(`Thought must be ${MAX_LENGTH} characters or less`);
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    await dispatch(submitQuickThought({
      content: content.trim(),
      tags: tagArray,
    }));

    // Refresh dashboard data
    if (userId) {
      dispatch(fetchDashboardData(userId));
    }
  };

  const characterCount = content.length;
  const remaining = MAX_LENGTH - characterCount;
  const isNearLimit = remaining <= 20;
  const isOverLimit = remaining < 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Info */}
      <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <svg
          className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium">Quick thoughts are like tweets</p>
          <p className="mt-1">Capture ideas, reminders, or fleeting thoughts in 280 characters or less.</p>
        </div>
      </div>

      {/* Content */}
      <div>
        <label htmlFor="thought-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Your thought <span className="text-red-500">*</span>
        </label>
        <textarea
          ref={textareaRef}
          id="thought-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={4}
          maxLength={MAX_LENGTH}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none text-lg ${
            isOverLimit
              ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
          }`}
          disabled={isSubmitting}
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex-1">
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
          </div>
          <p
            className={`text-sm font-medium ${
              isOverLimit
                ? 'text-red-600 dark:text-red-400'
                : isNearLimit
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {remaining} characters left
          </p>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="thought-tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Tags <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="thought-tags"
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="idea, reminder, todo"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          disabled={isSubmitting}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Separate tags with commas
        </p>
      </div>

      {/* Error message */}
      {submitError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting || isOverLimit}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Saving...
          </span>
        ) : (
          'Save Thought'
        )}
      </button>
    </form>
  );
}
