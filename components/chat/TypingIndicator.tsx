'use client';
import React from 'react';

/**
 * TypingIndicator - ChatGPT-style animated typing indicator
 * Shows 3 dots that bounce sequentially while AI is processing
 */
export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex space-x-2">
          <div
            className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '1.2s' }}
          />
          <div
            className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
            style={{ animationDelay: '200ms', animationDuration: '1.2s' }}
          />
          <div
            className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
            style={{ animationDelay: '400ms', animationDuration: '1.2s' }}
          />
        </div>
      </div>
    </div>
  );
};
