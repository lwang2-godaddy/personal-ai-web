'use client';

import { useEffect, useRef } from 'react';
import type { DemoProgressEvent } from '@/lib/services/demo/types';

interface DemoProgressLogProps {
  events: DemoProgressEvent[];
  onClear: () => void;
}

const LEVEL_STYLES: Record<string, { bg: string; text: string; prefix: string }> = {
  info: { bg: 'bg-blue-50', text: 'text-blue-700', prefix: 'i' },
  success: { bg: 'bg-green-50', text: 'text-green-700', prefix: '✓' },
  error: { bg: 'bg-red-50', text: 'text-red-700', prefix: '✗' },
  warning: { bg: 'bg-yellow-50', text: 'text-yellow-700', prefix: '!' },
};

export default function DemoProgressLog({ events, onClear }: DemoProgressLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  if (events.length === 0) {
    return null;
  }

  // Track which phases we've seen to insert headers
  let lastPhase = -1;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-gray-900">Progress Log</h2>
        <button
          onClick={onClear}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
        >
          Clear
        </button>
      </div>
      <div
        ref={scrollRef}
        className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm"
      >
        {events.map((event, idx) => {
          const style = LEVEL_STYLES[event.level] || LEVEL_STYLES.info;
          const showPhaseHeader = event.phase !== lastPhase;
          lastPhase = event.phase;

          return (
            <div key={idx}>
              {showPhaseHeader && (
                <div className="text-gray-400 mt-2 mb-1 border-t border-gray-700 pt-2 first:mt-0 first:border-0 first:pt-0">
                  Phase {event.phase}: {event.phaseName}
                </div>
              )}
              <div className="flex items-start gap-2 py-0.5">
                <span className={`${style.text} w-4 flex-shrink-0 text-center`}>
                  {style.prefix}
                </span>
                <span className="text-gray-300">{event.message}</span>
                {event.progress && (
                  <span className="text-gray-500 ml-auto flex-shrink-0">
                    [{event.progress.current}/{event.progress.total}]
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
