'use client';

import React from 'react';

interface SourcePreview {
  duration?: number;
  transcriptionPreview?: string;
  thumbnailUrl?: string;
  placeName?: string;
  activity?: string;
  value?: number;
  unit?: string;
}

interface Source {
  type: 'health' | 'location' | 'voice' | 'photo' | 'text';
  id: string;
  snippet?: string;
  timestamp?: string;
  preview?: SourcePreview;
}

interface SourcesListProps {
  sources: Source[];
  compact?: boolean;
}

const SOURCE_ICONS: Record<string, string> = {
  health: '❤️',
  location: '📍',
  voice: '🎤',
  photo: '📸',
  text: '📝',
};

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  health: { bg: 'bg-red-50', text: 'text-red-700' },
  location: { bg: 'bg-blue-50', text: 'text-blue-700' },
  voice: { bg: 'bg-purple-50', text: 'text-purple-700' },
  photo: { bg: 'bg-green-50', text: 'text-green-700' },
  text: { bg: 'bg-amber-50', text: 'text-amber-700' },
};

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function truncate(text: string | undefined, maxLen: number): string {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}

/**
 * Renders a summary of source counts by type
 */
export function SourcesSummary({ sources }: { sources: Source[] }) {
  const counts = sources.reduce(
    (acc, source) => {
      acc[source.type] = (acc[source.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const parts: string[] = [];
  Object.entries(counts).forEach(([type, count]) => {
    parts.push(`${count} ${type}`);
  });

  return (
    <span className="text-xs text-gray-500">
      Sources: {parts.join(', ') || 'None'}
    </span>
  );
}

/**
 * Renders a single source item
 */
function SourceItem({ source }: { source: Source }) {
  const icon = SOURCE_ICONS[source.type] || '📄';
  const colors = SOURCE_COLORS[source.type] || { bg: 'bg-gray-50', text: 'text-gray-700' };

  return (
    <div className={`${colors.bg} rounded-md p-3 border border-gray-100`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className={`text-sm font-medium capitalize ${colors.text}`}>
            {source.type === 'voice' ? 'Voice Note' : source.type}
          </span>
        </div>
        {source.timestamp && (
          <span className="text-xs text-gray-400">{formatDate(source.timestamp)}</span>
        )}
      </div>

      {/* Content based on type */}
      <div className="mt-2">
        {source.snippet && (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            &ldquo;{truncate(source.snippet, 200)}&rdquo;
          </p>
        )}

        {/* Preview details */}
        {source.preview && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
            {source.preview.duration && (
              <span className="bg-white px-2 py-0.5 rounded">
                Duration: {formatDuration(source.preview.duration)}
              </span>
            )}
            {source.preview.placeName && (
              <span className="bg-white px-2 py-0.5 rounded">
                {source.preview.placeName}
              </span>
            )}
            {source.preview.activity && (
              <span className="bg-white px-2 py-0.5 rounded">
                {source.preview.activity}
              </span>
            )}
            {source.preview.value !== undefined && source.preview.unit && (
              <span className="bg-white px-2 py-0.5 rounded">
                {source.preview.value} {source.preview.unit}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Full sources list component
 */
export default function SourcesList({ sources, compact = false }: SourcesListProps) {
  if (!sources || sources.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">No sources available</p>
    );
  }

  if (compact) {
    return <SourcesSummary sources={sources} />;
  }

  return (
    <div className="space-y-2">
      {sources.map((source, index) => (
        <SourceItem key={`${source.type}-${source.id || index}`} source={source} />
      ))}
    </div>
  );
}
