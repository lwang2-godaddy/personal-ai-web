'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, View, SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth } from 'date-fns';
import { Event, EventType } from '@/lib/models/Event';
import EventTooltip from './EventTooltip';
import 'react-big-calendar/lib/css/react-big-calendar.css';

interface EventCalendarProps {
  events: Event[];
  onSelectEvent?: (event: Event) => void;
  onSelectSlot?: (slotInfo: SlotInfo) => void;
  onEventDrop?: (event: Event, start: Date, end: Date) => Promise<boolean>;
  onEventResize?: (event: Event, start: Date, end: Date) => Promise<boolean>;
  loading?: boolean;
  view?: View;                     // NEW: Control view externally
  onViewChange?: (view: View) => void; // NEW: Handle view changes
  date?: Date;                     // NEW: Control date externally
  onNavigate?: (date: Date) => void;  // NEW: Handle date navigation
}

const locales = {
  'en-US': require('date-fns/locale/en-US'),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Color coding by event type
const EVENT_TYPE_COLORS: Record<EventType, string> = {
  appointment: '#3B82F6', // Blue
  meeting: '#8B5CF6', // Purple
  intention: '#06B6D4', // Cyan
  plan: '#F59E0B', // Amber
  reminder: '#EF4444', // Red
  todo: '#10B981', // Green
};

export default function EventCalendar({
  events,
  onSelectEvent,
  onSelectSlot,
  onEventDrop,
  onEventResize,
  loading = false,
  view: externalView,
  onViewChange: externalOnViewChange,
  date: externalDate,
  onNavigate: externalOnNavigate,
}: EventCalendarProps) {
  // Internal state as fallback
  const [internalView, setInternalView] = useState<View>('month');
  const [internalDate, setInternalDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Use external props if provided, otherwise use internal state
  const view = externalView !== undefined ? externalView : internalView;
  const date = externalDate || internalDate;

  // Transform events for react-big-calendar
  const calendarEvents = useMemo(() => {
    return events.map((event) => ({
      ...event,
      start: event.datetime,
      end: event.endDatetime || new Date(event.datetime.getTime() + 60 * 60 * 1000), // Default 1 hour
      title: event.title,
      resource: event, // Store full event object
      className: `event-${event.type}${event.conflicts && event.conflicts.length > 0 ? ' has-conflict' : ''}`,
    }));
  }, [events]);

  // Custom event styling
  const eventStyleGetter = useCallback((event: any) => {
    const fullEvent = event.resource as Event;
    const color = EVENT_TYPE_COLORS[fullEvent.type] || '#6B7280';
    const isCompleted = fullEvent.status === 'completed';

    return {
      style: {
        backgroundColor: color,
        borderRadius: '4px',
        opacity: isCompleted ? 0.5 : 1,
        color: '#FFFFFF',
        fontSize: '12px',
        padding: '2px 4px',
        cursor: 'pointer',
      },
    };
  }, []);

  // Handle event selection
  const handleSelectEvent = useCallback(
    (calendarEvent: any, e: React.SyntheticEvent) => {
      const event = calendarEvent.resource as Event;
      setSelectedEvent(event);

      // Calculate tooltip position
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });

      if (onSelectEvent) {
        onSelectEvent(event);
      }
    },
    [onSelectEvent]
  );

  // Handle slot selection (create new event)
  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      if (onSelectSlot) {
        onSelectSlot(slotInfo);
      }
    },
    [onSelectSlot]
  );

  // Handle event drag-and-drop
  const handleEventDrop = useCallback(
    async ({ event, start, end }: { event: any; start: Date; end: Date }) => {
      const fullEvent = event.resource as Event;

      // Validate drop
      if (start < new Date()) {
        alert('Cannot move event to past');
        return;
      }

      if (end <= start) {
        alert('End time must be after start time');
        return;
      }

      // Call onEventDrop if provided
      if (onEventDrop) {
        const success = await onEventDrop(fullEvent, start, end);
        if (!success) {
          alert('Failed to update event');
        }
      }
    },
    [onEventDrop]
  );

  // Handle event resize
  const handleEventResize = useCallback(
    async ({ event, start, end }: { event: any; start: Date; end: Date }) => {
      const fullEvent = event.resource as Event;

      // Validate resize
      if (start < new Date()) {
        alert('Cannot resize event to past');
        return;
      }

      if (end <= start) {
        alert('End time must be after start time');
        return;
      }

      // Call onEventResize if provided
      if (onEventResize) {
        const success = await onEventResize(fullEvent, start, end);
        if (!success) {
          alert('Failed to update event');
        }
      }
    },
    [onEventResize]
  );

  // Close tooltip
  const handleCloseTooltip = useCallback(() => {
    setSelectedEvent(null);
    setTooltipPosition(null);
  }, []);

  // Navigation handlers - use external handlers if provided, otherwise update internal state
  const handleNavigate = useCallback((newDate: Date) => {
    if (externalOnNavigate) {
      externalOnNavigate(newDate);
    } else {
      setInternalDate(newDate);
    }
  }, [externalOnNavigate]);

  const handleViewChange = useCallback((newView: View) => {
    if (externalOnViewChange) {
      externalOnViewChange(newView);
    } else {
      setInternalView(newView);
    }
  }, [externalOnViewChange]);

  // Custom toolbar
  const CustomToolbar = (toolbar: any) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };

    const goToToday = () => {
      toolbar.onNavigate('TODAY');
    };

    const label = () => {
      const date = toolbar.date;
      if (toolbar.view === 'month') {
        return format(date, 'MMMM yyyy');
      } else if (toolbar.view === 'week') {
        const start = startOfWeek(date);
        return format(start, 'MMM d, yyyy');
      } else {
        return format(date, 'MMMM d, yyyy');
      }
    };

    return (
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={goToBack}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            &larr; Prev
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToNext}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Next &rarr;
          </button>
        </div>

        <h2 className="text-xl font-semibold text-gray-900">{label()}</h2>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toolbar.onView('month')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              toolbar.view === 'month'
                ? 'bg-blue-500 text-white'
                : 'bg-white border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => toolbar.onView('week')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              toolbar.view === 'week'
                ? 'bg-blue-500 text-white'
                : 'bg-white border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => toolbar.onView('day')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              toolbar.view === 'day'
                ? 'bg-blue-500 text-white'
                : 'bg-white border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Day
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 700 }}
        view={view}
        date={date}
        onView={handleViewChange}
        onNavigate={handleNavigate}
        views={['month', 'week', 'day', 'agenda']}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable
        // TODO: Re-enable drag and drop with withDragAndDrop wrapper
        // draggableAccessor={() => true}
        // resizable
        // onEventDrop={handleEventDrop}
        // onEventResize={handleEventResize}
        eventPropGetter={eventStyleGetter}
        components={{
          toolbar: CustomToolbar,
        }}
        popup
        step={30}
        showMultiDayTimes
      />

      {/* Event Tooltip */}
      {selectedEvent && tooltipPosition && (
        <EventTooltip
          event={selectedEvent}
          position={tooltipPosition}
          onClose={handleCloseTooltip}
          onEdit={() => {
            handleCloseTooltip();
            if (onSelectEvent) onSelectEvent(selectedEvent);
          }}
        />
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4">
        {Object.entries(EVENT_TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm text-gray-700 capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
