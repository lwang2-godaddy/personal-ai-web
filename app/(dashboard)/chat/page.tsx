'use client';

import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { sendMessage, clearMessages } from '@/lib/store/slices/chatSlice';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { EmptyState } from '@/components/chat/EmptyState';
import { useTrackPage, useTrackFeature } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS, TRACKED_FEATURES } from '@/lib/models/BehaviorEvent';

export default function ChatPage() {
  // Track page view
  useTrackPage(TRACKED_SCREENS.chat);
  const { trackFeature } = useTrackFeature();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { messages, isLoading, error } = useAppSelector((state) => state.chat);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (message: string) => {
    if (!user?.uid) {
      console.error('User not authenticated');
      return;
    }

    trackFeature(TRACKED_FEATURES.sendChatMessage, { category: 'ai_interaction' });
    await dispatch(sendMessage({ message, userId: user.uid }));
  };

  const handleClear = () => {
    if (window.confirm('Clear all messages?')) {
      trackFeature(TRACKED_FEATURES.clearChatHistory, { category: 'ai_interaction' });
      dispatch(clearMessages());
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* SirCharge Avatar/Logo */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl flex-shrink-0">
              ⚡
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Ask SirCharge
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Your personal AI assistant who knows everything about you
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="max-w-4xl mx-auto p-6">
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  <strong>Error:</strong> {error}
                </p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
