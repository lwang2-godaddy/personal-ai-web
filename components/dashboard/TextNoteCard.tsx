'use client';

import { TextNote } from '@/lib/models';
import { useAppDispatch } from '@/lib/store/hooks';
import { openQuickCreate } from '@/lib/store/slices/quickCreateSlice';
import { PanelHeader } from './PanelHeader';

interface TextNoteCardProps {
  data: TextNote[];
}

export function TextNoteCard({ data }: TextNoteCardProps) {
  const dispatch = useAppDispatch();

  const handleCreateClick = () => {
    dispatch(openQuickCreate({ type: 'diary' }));
  };

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <PanelHeader
          title="Recent Diary Entries"
          emoji="📝"
          actionType="create"
          onActionClick={handleCreateClick}
          ariaLabel="Create new diary entry"
        />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No diary entries yet. Click the &apos;+&apos; icon above to start writing your first entry.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <PanelHeader
        title="Recent Diary Entries"
        emoji="📝"
        actionType="create"
        onActionClick={handleCreateClick}
        ariaLabel="Create new diary entry"
      />
      <div className="space-y-3">
        {data.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                  {item.title}
                </h4>
                {item.embeddingId ? (
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded flex items-center gap-1">
                    ✓ Indexed
                  </span>
                ) : item.embeddingError ? (
                  <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded flex items-center gap-1" title={item.embeddingError}>
                    ✗ Failed
                  </span>
                ) : (
                  <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded flex items-center gap-1">
                    ⏳ Processing...
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
              {item.content}
            </p>
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
