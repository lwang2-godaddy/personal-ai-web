'use client';

import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { sendMessage } from '@/lib/store/slices/chatSlice';

export function EmptyState() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  // Quick action queries
  const quickActions = [
    {
      icon: '💪',
      label: 'My workout stats',
      query: 'How many workouts did I do this month?',
      color: 'from-red-500 to-orange-500',
    },
    {
      icon: '📍',
      label: 'Places I visited',
      query: 'Where have I been recently?',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: '🏃',
      label: 'Activity summary',
      query: 'Summarize my activities this week',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: '📊',
      label: 'Health trends',
      query: 'What are my health trends lately?',
      color: 'from-purple-500 to-pink-500',
    },
  ];

  const handleQuickAction = async (query: string) => {
    if (!user?.uid) {
      console.error('User not authenticated');
      return;
    }
    await dispatch(sendMessage({ message: query, userId: user.uid }));
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-3xl w-full text-center">
        {/* SirCharge Avatar - Large */}
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-4xl shadow-lg">
          ⚡
        </div>

        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Hi! I'm SirCharge ⚡
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          I'm your personal AI assistant. Ask me anything about your life - I track everything!
        </p>

        {/* Quick Action Buttons */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Quick questions:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickAction(action.query)}
                className={`
                  group relative overflow-hidden
                  p-4 rounded-xl border-2 border-transparent
                  bg-white dark:bg-gray-800
                  hover:border-gray-300 dark:hover:border-gray-600
                  transition-all duration-200
                  hover:scale-105 hover:shadow-lg
                  text-left
                `}
              >
                {/* Gradient background on hover */}
                <div className={`
                  absolute inset-0 bg-gradient-to-r ${action.color} opacity-0
                  group-hover:opacity-10 transition-opacity duration-200
                `} />

                <div className="relative flex items-center gap-3">
                  <span className="text-3xl">{action.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {action.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      "{action.query}"
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Example queries - smaller, less prominent */}
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          <p className="mb-2">Or try asking:</p>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs">
              "How many times did I play badminton?"
            </span>
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs">
              "Show my sleep patterns"
            </span>
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs">
              "What did I do last weekend?"
            </span>
          </div>
        </div>

        {/* Info note */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>💡 Note:</strong> I can only answer questions about data you've collected
            on the SirCharge mobile app. The more data you add, the more I can help you discover about yourself!
          </p>
        </div>
      </div>
    </div>
  );
}
