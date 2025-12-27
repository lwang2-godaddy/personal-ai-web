'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { submitQuickDiary } from '@/lib/store/slices/quickCreateSlice';
import { fetchDashboardData } from '@/lib/store/slices/dashboardSlice';

export default function QuickDiaryForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});

  const titleInputRef = useRef<HTMLInputElement>(null);
  const { isSubmitting, error, prefillData } = useAppSelector((state) => state.quickCreate);
  const userId = useAppSelector((state) => state.auth.user?.uid);
  const dispatch = useAppDispatch();

  // Load prefill data on mount
  useEffect(() => {
    if (prefillData?.diary) {
      const { title: prefillTitle, content: prefillContent, tags: prefillTags } = prefillData.diary;

      if (prefillTitle) setTitle(prefillTitle);
      if (prefillContent) setContent(prefillContent);
      if (prefillTags) setTags(prefillTags.join(', '));

      // Clear any errors when prefilling
      setErrors({});

      console.log('[QuickDiaryForm] Loaded prefill data from voice note');
    }
  }, [prefillData]);

  // Auto-focus title input when component mounts
  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  const validate = () => {
    const newErrors: { title?: string; content?: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!content.trim()) {
      newErrors.content = 'Content is required';
    } else if (content.trim().length < 10) {
      newErrors.content = 'Content must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    await dispatch(submitQuickDiary({
      title: title.trim(),
      content: content.trim(),
      tags: tagArray,
    }));

    // Refresh dashboard data
    if (userId) {
      dispatch(fetchDashboardData(userId));
    }
  };

  const characterCount = content.length;
  const minCharacters = 10;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          ref={titleInputRef}
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your note a title..."
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          disabled={isSubmitting}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.title}
          </p>
        )}
      </div>

      {/* Content */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Content <span className="text-red-500">*</span>
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"
          disabled={isSubmitting}
        />
        <div className="mt-1 flex items-center justify-between">
          <div>
            {errors.content && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.content}
              </p>
            )}
          </div>
          <p
            className={`text-sm ${
              characterCount < minCharacters
                ? 'text-gray-400 dark:text-gray-500'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {characterCount} characters
            {characterCount < minCharacters && ` (minimum ${minCharacters})`}
          </p>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Tags <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="tags"
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="work, personal, ideas (comma-separated)"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          disabled={isSubmitting}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Separate tags with commas
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
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
          'Save Note'
        )}
      </button>
    </form>
  );
}
