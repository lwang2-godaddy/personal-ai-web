'use client';

import { useState, useMemo } from 'react';
import { getTimezoneOptions, getUserTimezone, TimezoneOption } from '@/lib/utils/timezone';

interface TimezoneSelectorProps {
  value: string;
  onChange: (timezone: string) => void;
  className?: string;
}

/**
 * TimezoneSelector Component
 * Dropdown for selecting timezone with grouped options
 */
export default function TimezoneSelector({ value, onChange, className = '' }: TimezoneSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const allTimezones = useMemo(() => getTimezoneOptions(), []);

  // Filter timezones based on search term
  const filteredTimezones = useMemo(() => {
    if (!searchTerm) return allTimezones;

    const term = searchTerm.toLowerCase();
    return allTimezones.filter(
      (tz) =>
        tz.label.toLowerCase().includes(term) ||
        tz.value.toLowerCase().includes(term) ||
        tz.offset.toLowerCase().includes(term)
    );
  }, [allTimezones, searchTerm]);

  // Group timezones by region
  const groupedTimezones = useMemo(() => {
    const groups: Record<string, TimezoneOption[]> = {};

    filteredTimezones.forEach((tz) => {
      if (!groups[tz.group]) {
        groups[tz.group] = [];
      }
      groups[tz.group].push(tz);
    });

    return groups;
  }, [filteredTimezones]);

  const handleDetectTimezone = () => {
    const detected = getUserTimezone();
    onChange(detected);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Timezone</label>
        <button
          type="button"
          onClick={handleDetectTimezone}
          className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
        >
          Detect automatically
        </button>
      </div>

      {/* Search input */}
      <input
        type="text"
        placeholder="Search timezone..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />

      {/* Timezone dropdown */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        {Object.entries(groupedTimezones).map(([group, timezones]) => (
          <optgroup key={group} label={group}>
            {timezones.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label} - {tz.offset}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Current selection display */}
      {value && (
        <div className="text-xs text-gray-600">
          Selected: <span className="font-medium">{value}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact timezone display component
 * Shows timezone with offset
 */
export function TimezoneDisplay({ timezone, className = '' }: { timezone: string; className?: string }) {
  const allTimezones = useMemo(() => getTimezoneOptions(), []);
  const tz = useMemo(() => allTimezones.find((t) => t.value === timezone), [allTimezones, timezone]);

  if (!tz) {
    return <span className={`text-sm text-gray-600 ${className}`}>{timezone}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-1 text-sm text-gray-600 ${className}`}>
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>
        {tz.label} ({tz.offset})
      </span>
    </span>
  );
}

/**
 * Timezone warning component
 * Shows warning when event timezone differs from user's current timezone
 */
export function TimezoneWarning({
  eventTimezone,
  userTimezone,
  className = '',
}: {
  eventTimezone: string;
  userTimezone: string;
  className?: string;
}) {
  if (eventTimezone === userTimezone) return null;

  return (
    <div className={`flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 ${className}`}>
      <svg
        className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <div className="text-sm">
        <p className="font-medium text-amber-900">Different timezone</p>
        <p className="text-amber-700 mt-1">
          This event is in <span className="font-medium">{eventTimezone}</span>, which is different
          from your current timezone (<span className="font-medium">{userTimezone}</span>).
        </p>
      </div>
    </div>
  );
}
