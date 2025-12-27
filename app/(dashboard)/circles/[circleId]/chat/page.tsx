'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchCircleMessages, sendCircleMessage } from '@/lib/store/slices/circleSlice';
import CircleMessageBubble from '@/components/circles/CircleMessageBubble';

/**
 * Circle chat page
 * RAG-powered group chat within a circle
 */
export default function CircleChatPage() {
  const params = useParams();
  const circleId = params.circleId as string;
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { circles, circleMessages, loadingStatus } = useAppSelector((state) => state.circles);

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const circle = circles.find((c) => c.id === circleId);
  const messages = circleMessages[circleId] || [];
  const isLoading = loadingStatus.messages[circleId] === 'loading';

  useEffect(() => {
    if (circleId) {
      dispatch(fetchCircleMessages({ circleId, limit: 50 }));
    }
  }, [dispatch, circleId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;

    const message = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      await dispatch(
        sendCircleMessage({
          circleId,
          content: message,
          type: 'text',
        })
      ).unwrap();
    } catch (error: any) {
      alert(error || 'Failed to send message');
      setInputText(message); // Restore message
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!circle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-gray-900">Circle Not Found</h2>
      </div>
    );
  }

  if (!circle.settings.allowGroupChat) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Chat Disabled</h2>
        <p className="text-gray-600">Group chat is disabled for this circle</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{circle.name} Chat</h1>
        <p className="text-sm text-gray-600">{circle.memberIds.length} members</p>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Messages Yet</h3>
            <p className="text-gray-600">
              Start a conversation! Ask questions about shared data or chat with the AI assistant.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => (
              <CircleMessageBubble
                key={message.id}
                message={message}
                isCurrentUser={message.userId === user?.uid}
                currentUserId={user?.uid}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex gap-2">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          maxLength={1000}
          rows={2}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isSending}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            '↑'
          )}
        </button>
      </div>
    </div>
  );
}
