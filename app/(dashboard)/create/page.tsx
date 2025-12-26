'use client';

/**
 * Create Page
 * Data input page for sharing personal information with AI
 *
 * Features:
 * - Diary/Journal Entries (text notes)
 * - Voice Notes (audio recording + transcription)
 * - Photo Upload (image + AI description + location)
 */

import { useState } from 'react';
import { DiaryEditor } from '@/components/create/DiaryEditor';
import { VoiceRecorder } from '@/components/create/VoiceRecorder';
import { PhotoUploader } from '@/components/create/PhotoUploader';

type Tab = 'diary' | 'voice' | 'photo';

export default function CreatePage() {
  const [activeTab, setActiveTab] = useState<Tab>('diary');

  const tabs: Array<{ id: Tab; label: string; emoji: string; description: string }> = [
    {
      id: 'diary',
      label: 'Diary',
      emoji: '📝',
      description: 'Write your thoughts and daily reflections',
    },
    {
      id: 'voice',
      label: 'Voice Note',
      emoji: '🎤',
      description: 'Record audio and get automatic transcription',
    },
    {
      id: 'photo',
      label: 'Photo',
      emoji: '📸',
      description: 'Upload photos with AI-generated descriptions',
    },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Share with Your AI
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Add personal data to make your AI assistant more helpful
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors
                    ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  <span className="text-2xl">{tab.emoji}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Description */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {tabs.find((t) => t.id === activeTab)?.description}
            </p>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'diary' && <DiaryEditor />}
          {activeTab === 'voice' && <VoiceRecorder />}
          {activeTab === 'photo' && <PhotoUploader />}
        </div>
      </div>
    </div>
  );
}
