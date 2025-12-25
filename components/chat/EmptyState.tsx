export function EmptyState() {
  const suggestions = [
    'How many times did I play badminton this year?',
    'Show me my workout history',
    'What are my health trends?',
    'Where did I visit last month?',
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        <div className="text-6xl mb-4">💬</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Start a conversation
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Ask me anything about your personal data. I'll use AI to find relevant information
          and give you accurate answers.
        </p>

        <div className="space-y-2 mb-8">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Try asking:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 text-left border border-gray-200 dark:border-gray-700"
              >
                "{suggestion}"
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>💡 Note:</strong> I can only answer questions about data you've collected
            on the mobile app. If you haven't added any data yet, I won't have much to tell you!
          </p>
        </div>
      </div>
    </div>
  );
}
