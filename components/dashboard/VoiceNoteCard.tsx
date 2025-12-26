'use client';

import { VoiceNote } from '@/lib/models';
import { useAppDispatch } from '@/lib/store/hooks';
import { openQuickCreate } from '@/lib/store/slices/quickCreateSlice';
import { PanelHeader } from './PanelHeader';

interface VoiceNoteCardProps {
  data: VoiceNote[];
}

export function VoiceNoteCard({ data }: VoiceNoteCardProps) {
  const dispatch = useAppDispatch();

  const handleCreateClick = () => {
    dispatch(openQuickCreate('voice'));
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <PanelHeader
          title="Recent Voice Notes"
          emoji="🎤"
          actionType="create"
          onActionClick={handleCreateClick}
          ariaLabel="Create new voice note"
        />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No voice notes recorded yet. Click the &apos;+&apos; icon above to record and transcribe a voice note.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <PanelHeader
        title="Recent Voice Notes"
        emoji="🎤"
        actionType="create"
        onActionClick={handleCreateClick}
        ariaLabel="Create new voice note"
      />
      <div className="space-y-3">
        {data.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDuration(item.duration)}
                </span>
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
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
              {item.transcription || 'No transcription available'}
            </p>
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded"
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
