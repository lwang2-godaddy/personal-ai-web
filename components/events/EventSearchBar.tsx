'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EventType, EventStatus } from '@/lib/models/Event';
import EventSearchService from '@/lib/services/search/EventSearchService';

interface EventSearchBarProps {
  onSearch: (query: string) => void;
  onFilterChange?: (filters: SearchFilters) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export interface SearchFilters {
  eventType?: EventType | 'all';
  status?: EventStatus | 'all';
  dateRange?: { start?: Date; end?: Date };
  includeCompleted?: boolean;
  includeCancelled?: boolean;
}

const EVENT_TYPE_OPTIONS: Array<{ value: EventType | 'all'; label: string }> = [
  { value: 'all', label: 'All Types' },
  { value: 'appointment', label: 'Appointments' },
  { value: 'meeting', label: 'Meetings' },
  { value: 'intention', label: 'Intentions' },
  { value: 'plan', label: 'Plans' },
  { value: 'reminder', label: 'Reminders' },
  { value: 'todo', label: 'Todos' },
];

const STATUS_OPTIONS: Array<{ value: EventStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'draft', label: 'Draft' },
];

export default function EventSearchBar({
  onSearch,
  onFilterChange,
  placeholder = 'Search events by title, description, location, or participants...',
  autoFocus = false,
}: EventSearchBarProps) {
  const [query, setQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    eventType: 'all',
    status: 'all',
    includeCompleted: true,
    includeCancelled: false,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const searchService = EventSearchService;

  // Load search history on mount
  useEffect(() => {
    setSearchHistory(searchService.getSearchHistory());
  }, []);

  // Debounced search
  const debouncedSearch = useCallback(
    (searchQuery: string) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        if (searchQuery.trim()) {
          onSearch(searchQuery);
          searchService.saveSearchHistory(searchQuery);
          setSearchHistory(searchService.getSearchHistory());
        }
      }, 300);
    },
    [onSearch, searchService]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.trim()) {
      debouncedSearch(value);
      setShowHistory(false);
    } else {
      onSearch('');
      setShowHistory(false);
    }
  };

  const handleInputFocus = () => {
    if (!query.trim() && searchHistory.length > 0) {
      setShowHistory(true);
    }
  };

  const handleHistorySelect = (historyQuery: string) => {
    setQuery(historyQuery);
    setShowHistory(false);
    onSearch(historyQuery);
  };

  const handleClearHistory = () => {
    searchService.clearSearchHistory();
    setSearchHistory([]);
    setShowHistory(false);
  };

  const handleClearSearch = () => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    const updatedFilters = { ...filters, [key]: value };
    setFilters(updatedFilters);
    if (onFilterChange) {
      onFilterChange(updatedFilters);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={() => setTimeout(() => setShowHistory(false), 200)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="w-full px-4 py-3 pl-12 pr-12 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          {query && (
            <button
              onClick={handleClearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Search History Dropdown */}
        {showHistory && searchHistory.length > 0 && (
          <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">Recent Searches</span>
              <button
                onClick={handleClearHistory}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Clear
              </button>
            </div>
            <ul className="py-1 max-h-64 overflow-y-auto">
              {searchHistory.map((historyQuery, index) => (
                <li key={index}>
                  <button
                    onClick={() => handleHistorySelect(historyQuery)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {historyQuery}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filters
          {showFilters ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
          {/* Event Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFilterChange('eventType', option.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    filters.eventType === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFilterChange('status', option.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    filters.status === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Include Options */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.includeCompleted}
                onChange={(e) => handleFilterChange('includeCompleted', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include completed</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.includeCancelled}
                onChange={(e) => handleFilterChange('includeCancelled', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include cancelled</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
