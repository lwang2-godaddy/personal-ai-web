'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
  fetchEvents,
  setTypeFilter,
  setStatusFilter,
  clearFilters,
  setSelectedEvent,
  updateEvent,
} from '@/lib/store/slices/eventsSlice';
import { Event, EventType, EventStatus } from '@/lib/models/Event';
import { EventModal } from '@/components/events';
import { useAuth } from '@/lib/hooks/useAuth';
import EventCalendar from '@/components/events/EventCalendar';
import MiniCalendar from '@/components/events/MiniCalendar';
import { useCalendarDragDrop } from '@/lib/hooks/useCalendarDragDrop';
import { SlotInfo, View, Views } from 'react-big-calendar';

type TabType = 'calendar' | 'list' | 'search';

export default function EventsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAuth();
  const { events, isLoading, error, filters } = useAppSelector((state) => state.events);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [selectedEvent, setSelected] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<View>(Views.MONTH);

  // Calendar drag-and-drop hook
  const { handleEventDrop, handleEventResize, isValidating } = useCalendarDragDrop(
    user?.uid || '',
    async (event: Event, start: Date, end: Date) => {
      try {
        await dispatch(updateEvent({
          eventId: event.id,
          updates: {
            datetime: start,
            endDatetime: end,
          },
        })).unwrap();
        return true;
      } catch (error) {
        console.error('Failed to update event:', error);
        return false;
      }
    }
  );

  useEffect(() => {
    if (user) {
      dispatch(fetchEvents({ userId: user.uid }));
    }
  }, [dispatch, user]);

  const handleEventClick = (event: Event) => {
    setSelected(event);
    dispatch(setSelectedEvent(event));
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleCreateClick = () => {
    setSelected(null);
    dispatch(setSelectedEvent(null));
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelected(null);
    dispatch(setSelectedEvent(null));
  };

  const handleTypeFilterChange = (type: EventType | 'all') => {
    dispatch(setTypeFilter(type));
  };

  const handleStatusFilterChange = (status: EventStatus | 'all') => {
    dispatch(setStatusFilter(status));
  };

  const handleClearFilters = () => {
    dispatch(clearFilters());
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setSelected({
      id: '',
      userId: user?.uid || '',
      title: '',
      description: '',
      datetime: slotInfo.start,
      endDatetime: slotInfo.end,
      isAllDay: false,
      type: 'appointment',
      sourceType: 'manual',
      sourceId: '',
      sourceText: '',
      participants: [],
      status: 'draft',
      confidence: 1.0,
      reminders: [],
      notificationScheduled: false,
      userConfirmed: false,
      userModified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Event);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  // Filter events based on current filters
  const filteredEvents = events.filter((event) => {
    if (filters.type !== 'all' && event.type !== filters.type) return false;
    if (filters.status !== 'all' && event.status !== filters.status) return false;
    if (filters.startDate && event.datetime < filters.startDate) return false;
    if (filters.endDate && event.datetime > filters.endDate) return false;
    return true;
  });

  // Group events by date
  const groupedEvents: { [key: string]: Event[] } = {};
  filteredEvents.forEach((event) => {
    const dateKey = event.datetime.toDateString();
    if (!groupedEvents[dateKey]) {
      groupedEvents[dateKey] = [];
    }
    groupedEvents[dateKey].push(event);
  });

  const sortedDateKeys = Object.keys(groupedEvents).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const getEventTypeEmoji = (type: EventType): string => {
    const emojis = {
      appointment: '📅',
      meeting: '👥',
      intention: '💭',
      plan: '📝',
      reminder: '⏰',
      todo: '✅',
    };
    return emojis[type] || '📌';
  };

  const getStatusColor = (status: EventStatus): string => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmed: 'bg-green-100 text-green-800 border-green-200',
      completed: 'bg-gray-100 text-gray-600 border-gray-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      draft: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Please sign in to view events</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Events</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Event
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'calendar'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Calendar
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'list'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          List
        </button>
        <button
          onClick={() => router.push('/events/search')}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors border-b-2 border-transparent"
        >
          Search
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleTypeFilterChange(e.target.value as EventType | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="appointment">Appointment</option>
              <option value="meeting">Meeting</option>
              <option value="intention">Intention</option>
              <option value="plan">Plan</option>
              <option value="reminder">Reminder</option>
              <option value="todo">Todo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleStatusFilterChange(e.target.value as EventStatus | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {(filters.type !== 'all' || filters.status !== 'all') && (
            <button
              onClick={handleClearFilters}
              className="mt-6 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Calendar View Selector */}
      {activeTab === 'calendar' && !isLoading && !error && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setCalendarView(Views.MONTH)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                calendarView === Views.MONTH
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setCalendarView(Views.WEEK)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                calendarView === Views.WEEK
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setCalendarView(Views.DAY)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                calendarView === Views.DAY
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setCalendarView(Views.AGENDA)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                calendarView === Views.AGENDA
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Agenda
            </button>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {activeTab === 'calendar' && !isLoading && !error && (
        <div className="flex gap-6">
          <div className="flex-1">
            <EventCalendar
              events={filteredEvents}
              onSelectEvent={handleEventClick}
              onSelectSlot={handleSelectSlot}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              loading={isValidating}
              view={calendarView}
              onViewChange={setCalendarView}
              date={selectedDate}
              onNavigate={setSelectedDate}
            />
          </div>
          <div className="flex-shrink-0">
            <MiniCalendar
              selectedDate={selectedDate}
              events={filteredEvents}
              onDateSelect={handleDateSelect}
            />
          </div>
        </div>
      )}

      {/* List View */}
      {activeTab === 'list' && !isLoading && !error && (
        <>
          {filteredEvents.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No events found</p>
              <button
                onClick={handleCreateClick}
                className="mt-4 text-blue-600 hover:text-blue-700 underline"
              >
                Create your first event
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDateKeys.map((dateKey) => (
                <div key={dateKey} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {new Date(dateKey).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {groupedEvents[dateKey].map((event) => (
                      <div
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className="px-4 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-2xl">
                                {getEventTypeEmoji(event.type)}
                              </span>
                              <h3 className="text-lg font-medium text-gray-900">
                                {event.title}
                              </h3>
                            </div>
                            {event.description && (
                              <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>
                                {event.isAllDay
                                  ? 'All day'
                                  : event.datetime.toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                    })}
                              </span>
                              {event.location && <span>📍 {event.location}</span>}
                              {event.participants.length > 0 && (
                                <span>👥 {event.participants.length}</span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            <span
                              className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                                event.status
                              )}`}
                            >
                              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Event Modal */}
      <EventModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        mode={modalMode}
        event={selectedEvent}
      />
    </div>
  );
}
