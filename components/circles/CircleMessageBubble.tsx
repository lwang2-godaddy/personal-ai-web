'use client';

import React from 'react';
import { CircleMessage } from '@/lib/models/Circle';

interface CircleMessageBubbleProps {
  message: CircleMessage;
  isCurrentUser: boolean;
  currentUserId?: string;
}

/**
 * Circle message bubble component (Web)
 * Shows message with sender attribution and context badges
 */
export const CircleMessageBubble: React.FC<CircleMessageBubbleProps> = ({
  message,
  isCurrentUser,
  currentUserId,
}) => {
  const isAI = message.isAIResponse || message.userId === 'ai';

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          isCurrentUser
            ? 'bg-blue-600 text-white'
            : isAI
            ? 'bg-purple-100 text-purple-900 border border-purple-300'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        {/* Show sender name for other users */}
        {!isCurrentUser && !isAI && (
          <div className="text-xs font-semibold text-blue-600 mb-1">
            {message.userId === currentUserId ? 'You' : 'Circle Member'}
          </div>
        )}

        {isAI && (
          <div className="text-xs font-semibold text-purple-600 mb-1">🤖 AI Assistant</div>
        )}

        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

        <div
          className={`text-xs mt-1 ${
            isCurrentUser ? 'text-blue-100' : isAI ? 'text-purple-600' : 'text-gray-500'
          }`}
        >
          {formatTime(message.createdAt)}
        </div>

        {/* Show context badges for AI responses */}
        {message.contextUsed && message.contextUsed.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.contextUsed.slice(0, 3).map((context, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800"
              >
                {context.type} ({(context.score * 100).toFixed(0)}%)
              </span>
            ))}
            {message.contextUsed.length > 3 && (
              <span className="text-xs text-gray-500">+{message.contextUsed.length - 3} more</span>
            )}
          </div>
        )}

        {/* Show reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex gap-1 mt-2">
            {message.reactions.map((reaction, index) => (
              <span key={index} className="text-base">
                {reaction.emoji}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CircleMessageBubble;
