'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/store/hooks';
import EventSearchBar, { SearchFilters } from '@/components/events/EventSearchBar';
import EventSearchService from '@/lib/services/search/EventSearchService';
import { Event } from '@/lib/models/Event';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

const EVENT_TYPE_COLORS: Record<Event['type'], string> = {
  appointment: 'bg-blue-100 text-blue-800',
  meeting: 'bg-purple-100 text-purple-800',
  intention: 'bg-cyan-100 text-cyan-800',
  plan: 'bg-amber-100 text-amber-800',
  reminder: 'bg-red-100 text-red-800',
  todo: 'bg-green-100 text-green-800',
};

const STATUS_COLORS: Record<Event['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  draft: 'bg-gray-100 text-gray-600',
};

export default function EventSearchPage() {
  useTrackPage(TRACKED_SCREENS.eventsSearch);
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    eventType: 'all',
    status: 'all',
    includeCompleted: true,
    includeCancelled: false,
  });
  const [searchResults, setSearchResults] = useState<Event[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchService = EventSearchService;

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim() || !user) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const results = await searchService.searchEvents(user.uid, query, {
        includeCompleted: filters.includeCompleted,
        includeCancelled: filters.includeCancelled,
        eventType: filters.eventType !== 'all' ? filters.eventType : undefined,
        dateRange: filters.dateRange,
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching events:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFilterChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);

    // Re-run search with new filters if there's an active query
    if (searchQuery.trim() && user) {
      setIsSearching(true);
      searchService
        .searchEvents(user.uid, searchQuery, {
          includeCompleted: newFilters.includeCompleted,
          includeCancelled: newFilters.includeCancelled,
          eventType: newFilters.eventType !== 'all' ? newFilters.eventType : undefined,
          dateRange: newFilters.dateRange,
        })
        .then((results) => {
          setSearchResults(results);
          setIsSearching(false);
        })
        .catch((error) => {
          console.error('Error searching events:', error);
          setSearchResults([]);
          setIsSearching(false);
        });
    }
  };

  const highlightText = (text: string) => {
    if (!searchQuery.trim()) return text;

    const highlighted = searchService.highlightSearchTerms(text, searchQuery);
    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Search Events</h1>
            </div>
          </div>

          <EventSearchBar
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
            autoFocus
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {isSearching && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Searching...</span>
            </div>
          </div>
        )}

        {/* No Search Yet */}
        {!hasSearched && !isSearching && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">Search your events</h3>
            <p className="mt-2 text-sm text-gray-500">
              Search by title, description, location, or participants
            </p>
          </div>
        )}

        {/* No Results */}
        {hasSearched && !isSearching && searchResults.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No events found</h3>
            <p className="mt-2 text-sm text-gray-500">
              Try adjusting your search query or filters
            </p>
          </div>
        )}

        {/* Results */}
        {!isSearching && searchResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Found <span className="font-medium text-gray-900">{searchResults.length}</span> event
                {searchResults.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
              {searchResults.map((event) => (
                <div
                  key={event.id}
                  className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => {
                    // TODO: Open event modal or navigate to event detail
                    console.log('Selected event:', event.id);
                  }}
                >
                  {/* Event Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {highlightText(event.title)}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            EVENT_TYPE_COLORS[event.type]
                          }`}
                        >
                          {event.type}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_COLORS[event.status]
                          }`}
                        >
                          {event.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium text-gray-900">{formatDate(event.datetime)}</div>
                      {!event.isAllDay && (
                        <div className="text-gray-500">{formatTime(event.datetime)}</div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {event.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {highlightText(event.description)}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        {highlightText(event.location)}
                      </div>
                    )}
                    {event.participants.length > 0 && (
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        {event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}
                      </div>
                    )}
                    {event.reminders.length > 0 && (
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                          />
                        </svg>
                        {event.reminders.length} reminder{event.reminders.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
