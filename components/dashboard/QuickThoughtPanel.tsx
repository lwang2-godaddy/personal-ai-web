'use client';

import { useAppDispatch } from '@/lib/store/hooks';
import { openQuickCreate } from '@/lib/store/slices/quickCreateSlice';
import { PanelHeader } from './PanelHeader';

export function QuickThoughtPanel() {
  const dispatch = useAppDispatch();

  const handleCreateClick = () => {
    dispatch(openQuickCreate({ type: 'thought' }));
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg shadow p-6 border-2 border-dashed border-blue-300 dark:border-blue-700">
      <PanelHeader
        title="Quick Thought"
        emoji="💭"
        actionType="create"
        onActionClick={handleCreateClick}
        ariaLabel="Create new quick thought"
      />

      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Capture a fleeting idea, inspiration, or observation in 280 characters or less.
        </p>

        <button
          onClick={handleCreateClick}
          className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group"
          aria-label="Create new quick thought"
        >
          <span className="text-2xl group-hover:scale-110 transition-transform duration-200">💭</span>
          <span>New Quick Thought</span>
        </button>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400 italic">
          Like a tweet for your personal AI
        </p>
      </div>
    </div>
  );
}
