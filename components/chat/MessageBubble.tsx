import { ChatMessage } from '@/lib/models';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Context references for assistant messages */}
        {!isUser && message.contextUsed && message.contextUsed.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
            <p className="text-xs font-semibold mb-2 opacity-70">
              📚 Sources ({message.contextUsed.length})
            </p>
            <div className="space-y-1">
              {message.contextUsed.slice(0, 3).map((context, idx) => (
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
              {message.contextUsed.length > 3 && (
                <p className="text-xs opacity-60 text-center">
                  +{message.contextUsed.length - 3} more sources
                </p>
              )}
            </div>
          </div>
        )}

        <p className="text-xs opacity-60 mt-2">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
