import { ChatMessage, FeedbackRating } from '@/lib/models';
import { TypingIndicator } from './TypingIndicator';

interface MessageBubbleProps {
  message: ChatMessage;
  onFeedback?: (messageId: string, rating: FeedbackRating | null) => void;
}

// Data type configuration for badges
const DATA_TYPE_CONFIG = {
  health: {
    icon: '💪',
    label: 'Health',
    color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  },
  location: {
    icon: '📍',
    label: 'Location',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  },
  voice: {
    icon: '🎤',
    label: 'Voice',
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  },
  photo: {
    icon: '📸',
    label: 'Photo',
    color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  },
};

function DataTypeBadge({ type }: { type: string }) {
  const config = DATA_TYPE_CONFIG[type as keyof typeof DATA_TYPE_CONFIG];
  if (!config) return null;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}

function ThumbsUpIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function ThumbsDownIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </svg>
  );
}

export function MessageBubble({ message, onFeedback }: MessageBubbleProps) {
  // Handle typing indicator (system message with id __typing__)
  if (message.id === '__typing__') {
    return (
      <div className="flex justify-start mb-4">
        {/* SirCharge Avatar for typing indicator */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg mr-2 flex-shrink-0">
          ⚡
        </div>
        <TypingIndicator />
      </div>
    );
  }

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isError = message.role === 'system' && message.content.startsWith('Error:');
  const currentRating = message.feedback?.rating ?? null;

  const handleThumbsUp = () => {
    if (!message.id || !onFeedback) return;
    onFeedback(message.id, currentRating === 'thumbs_up' ? null : 'thumbs_up');
  };

  const handleThumbsDown = () => {
    if (!message.id || !onFeedback) return;
    onFeedback(message.id, currentRating === 'thumbs_down' ? null : 'thumbs_down');
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {/* SirCharge Avatar for assistant messages */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg mr-2 flex-shrink-0">
          ⚡
        </div>
      )}

      <div
        className={`max-w-[70%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : isError
            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
        }`}
      >
        {/* Data type badges - PROMINENT at top */}
        {!isUser && !isError && message.contextUsed && message.contextUsed.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {Array.from(new Set(message.contextUsed.map(c => c.type))).map(type => (
              <DataTypeBadge key={type} type={type} />
            ))}
          </div>
        )}

        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Expandable sources section - less prominent */}
        {!isUser && !isError && message.contextUsed && message.contextUsed.length > 0 && (
          <details className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
            <summary className="text-xs font-semibold cursor-pointer opacity-70 hover:opacity-100">
              📚 View {message.contextUsed.length} source{message.contextUsed.length !== 1 ? 's' : ''}
            </summary>
            <div className="space-y-1 mt-2">
              {message.contextUsed.map((context) => (
                <div
                  key={context.id}
                  className="text-xs p-2 bg-white dark:bg-gray-700 rounded"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium capitalize">{context.type}</span>
                    <span className="opacity-60">
                      {(context.score * 100).toFixed(0)}% match
                    </span>
                  </div>
                  {context.snippet && (
                    <p className="opacity-70 line-clamp-2">{context.snippet}</p>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Feedback buttons for assistant messages */}
        {isAssistant && !isError && message.id && onFeedback && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={handleThumbsUp}
              className={`p-1 rounded transition-colors ${
                currentRating === 'thumbs_up'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title="Good response"
            >
              <ThumbsUpIcon filled={currentRating === 'thumbs_up'} />
            </button>
            <button
              onClick={handleThumbsDown}
              className={`p-1 rounded transition-colors ${
                currentRating === 'thumbs_down'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title="Bad response"
            >
              <ThumbsDownIcon filled={currentRating === 'thumbs_down'} />
            </button>
          </div>
        )}

        <p className="text-xs opacity-60 mt-2">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
