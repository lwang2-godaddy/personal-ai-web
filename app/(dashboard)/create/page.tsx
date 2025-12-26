'use client';

/**
 * Templates & Bulk Operations Page
 * Advanced creation features for power users
 *
 * Features:
 * - Diary templates (pre-filled content for common entry types)
 * - Bulk import (CSV, JSON)
 * - Scheduled posts (future feature)
 * - Drafts management (future feature)
 */

import { useState } from 'react';
import { useAppDispatch } from '@/lib/store/hooks';
import { openQuickCreate } from '@/lib/store/slices/quickCreateSlice';

interface Template {
  id: string;
  title: string;
  emoji: string;
  description: string;
  category: 'productivity' | 'wellness' | 'reflection';
  content: string;
}

const diaryTemplates: Template[] = [
  {
    id: 'morning-routine',
    title: 'Morning Routine',
    emoji: '🌅',
    description: 'Log your morning activities and set intentions for the day',
    category: 'productivity',
    content: `**Morning Wake-up Time:**
**Morning Mood:**
**Breakfast:**
**Morning Exercise:**
**Today's Main Goals:**
1.
2.
3.

**Gratitude:** What am I grateful for today?
`,
  },
  {
    id: 'workout-log',
    title: 'Workout Log',
    emoji: '💪',
    description: 'Track your exercise routine and progress',
    category: 'wellness',
    content: `**Workout Type:**
**Duration:**
**Exercises:**
-
-
-

**Sets & Reps:**
**Notes:** How did I feel? Any PRs?
`,
  },
  {
    id: 'gratitude-journal',
    title: 'Gratitude Journal',
    emoji: '🙏',
    description: 'Practice daily gratitude',
    category: 'reflection',
    content: `**Three things I'm grateful for today:**
1.
2.
3.

**One person who made my day better:**

**A small win I want to celebrate:**
`,
  },
  {
    id: 'evening-reflection',
    title: 'Evening Reflection',
    emoji: '🌙',
    description: 'Reflect on your day before bed',
    category: 'reflection',
    content: `**Best part of today:**

**Challenges I faced:**

**What I learned:**

**Tomorrow's priorities:**
1.
2.
3.

**Sleep plan:** What time will I go to bed?
`,
  },
  {
    id: 'weekly-review',
    title: 'Weekly Review',
    emoji: '📊',
    description: 'Review your week and plan ahead',
    category: 'productivity',
    content: `**Week of:** [Date]

**Wins this week:**
-
-

**Challenges:**
-
-

**Key learnings:**

**Next week's focus:**
1.
2.
3.
`,
  },
  {
    id: 'mood-tracker',
    title: 'Mood Check-in',
    emoji: '😊',
    description: 'Track your emotional state',
    category: 'wellness',
    content: `**Current mood:** (1-10)

**Physical energy:** (1-10)

**What's affecting my mood:**

**Self-care actions today:**
-
-

**One thing that would make me feel better:**
`,
  },
];

export default function TemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'productivity' | 'wellness' | 'reflection'>('all');
  const dispatch = useAppDispatch();

  const categories = [
    { id: 'all' as const, label: 'All Templates', emoji: '📋' },
    { id: 'productivity' as const, label: 'Productivity', emoji: '⚡' },
    { id: 'wellness' as const, label: 'Wellness', emoji: '🧘' },
    { id: 'reflection' as const, label: 'Reflection', emoji: '💭' },
  ];

  const filteredTemplates = selectedCategory === 'all'
    ? diaryTemplates
    : diaryTemplates.filter((t) => t.category === selectedCategory);

  const handleUseTemplate = (template: Template) => {
    // For now, open the quick create modal
    // In the future, this could open the full DiaryEditor with pre-filled content
    dispatch(openQuickCreate('diary'));
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Templates & Tools
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Jumpstart your entries with templates, or use bulk operations for advanced tasks
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Quick Tip: Use the blue + button!
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                For quick diary entries, voice notes, or photos, use the floating action button in the bottom-right corner.
                This page is for templates and advanced operations.
              </p>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                }`}
              >
                <span className="mr-2">{category.emoji}</span>
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-4xl">{template.emoji}</span>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                  {template.category}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {template.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {template.description}
              </p>
              <button
                onClick={() => handleUseTemplate(template)}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Use Template
              </button>
            </div>
          ))}
        </div>

        {/* Bulk Operations Section (Coming Soon) */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Bulk Operations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CSV Import */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Import from CSV
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Bulk import diary entries from a CSV file
                  </p>
                  <button
                    disabled
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 font-medium rounded-lg cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>

            {/* Bulk Photo Upload */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Bulk Photo Upload
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Upload multiple photos at once
                  </p>
                  <button
                    disabled
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 font-medium rounded-lg cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
