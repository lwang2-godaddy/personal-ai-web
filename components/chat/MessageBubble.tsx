import { ChatMessage } from '@/lib/models';
import { TypingIndicator } from './TypingIndicator';

interface MessageBubbleProps {
  message: ChatMessage;
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

export function MessageBubble({ message }: MessageBubbleProps) {
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
  const isError = message.role === 'system' && message.content.startsWith('Error:');

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
              {message.contextUsed.map((context, idx) => (
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

        <p className="text-xs opacity-60 mt-2">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
