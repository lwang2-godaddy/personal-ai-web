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
    dispatch(openQuickCreate({ type: 'voice' }));
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Convert voice note to diary
  const handleConvertToDiary = (voiceNote: VoiceNote) => {
    // Generate default title from date
    const date = new Date(voiceNote.createdAt);
    const defaultTitle = `Voice Note - ${date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })}`;

    // Open quick create with prefilled data
    dispatch(openQuickCreate({
      type: 'diary',
      prefill: {
        diary: {
          title: defaultTitle,
          content: voiceNote.transcription,
          tags: voiceNote.tags || [],
        }
      }
    }));
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
              <div className="flex flex-wrap gap-1 mb-2">
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

            {/* Convert to Diary button */}
            {item.transcription && (
              <button
                onClick={() => handleConvertToDiary(item)}
                className="mt-2 w-full px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded transition-colors flex items-center justify-center gap-1"
                title="Convert this voice note to a diary entry"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Convert to Diary
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
