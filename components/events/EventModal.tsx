'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Event, EventType, EventStatus } from '@/lib/models/Event';
import { useAppDispatch } from '@/lib/store/hooks';
import {
  createEvent,
  updateEvent,
  deleteEvent,
  confirmEvent,
  completeEvent,
  cancelEvent,
  fetchEvents,
} from '@/lib/store/slices/eventsSlice';
import { useAuth } from '@/lib/hooks/useAuth';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'view' | 'edit' | 'create';
  event?: Event | null;
}

export default function EventModal({ isOpen, onClose, mode = 'view', event }: EventModalProps) {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [currentMode, setCurrentMode] = useState(mode);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [datetime, setDatetime] = useState('');
  const [endDatetime, setEndDatetime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [type, setType] = useState<EventType>('appointment');
  const [location, setLocation] = useState('');
  const [participants, setParticipants] = useState('');
  const [status, setStatus] = useState<EventStatus>('confirmed');

  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  useEffect(() => {
    if (event && (currentMode === 'view' || currentMode === 'edit')) {
      setTitle(event.title);
      setDescription(event.description);
      setDatetime(formatDateForInput(event.datetime));
      setEndDatetime(event.endDatetime ? formatDateForInput(event.endDatetime) : '');
      setIsAllDay(event.isAllDay);
      setType(event.type);
      setLocation(event.location || '');
      setParticipants(event.participants.join(', '));
      setStatus(event.status);
    } else if (currentMode === 'create') {
      resetForm();
    }
  }, [event, currentMode]);

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    setDatetime(formatDateForInput(now));
    setEndDatetime('');
    setIsAllDay(false);
    setType('appointment');
    setLocation('');
    setParticipants('');
    setStatus('confirmed');
  };

  const handleSave = async () => {
    if (!user || !title.trim()) {
      alert('Please enter a title');
      return;
    }

    setIsSubmitting(true);

    try {
      const participantsArray = participants
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const eventData = {
        title: title.trim(),
        description: description.trim(),
        datetime: new Date(datetime),
        endDatetime: endDatetime ? new Date(endDatetime) : undefined,
        isAllDay,
        type,
        sourceType: 'manual' as const,
        sourceId: '',
        sourceText: `Manually ${currentMode === 'create' ? 'created' : 'edited'}: ${title}`,
        location: location.trim() || undefined,
        locationId: undefined,
        participants: participantsArray,
        recurrence: undefined,
        recurrenceEndDate: undefined,
        status,
        confidence: 1.0,
        notificationScheduled: false,
        notificationSentAt: undefined,
        notificationId: undefined,
        userConfirmed: true,
        userModified: currentMode === 'edit',
        completedAt: status === 'completed' ? new Date() : undefined,
        embeddingId: undefined,
      };

      if (currentMode === 'create') {
        await dispatch(createEvent({ userId: user.uid, eventData })).unwrap();
      } else if (currentMode === 'edit' && event) {
        await dispatch(updateEvent({ eventId: event.id, updates: eventData })).unwrap();
      }

      // Refresh events
      await dispatch(fetchEvents({ userId: user.uid }));

      onClose();
    } catch (error: any) {
      alert(`Failed to save event: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !window.confirm('Are you sure you want to delete this event?')) {
      return;
    }

    setIsSubmitting(true);

    try {
      await dispatch(deleteEvent(event.id)).unwrap();
      if (user) {
        await dispatch(fetchEvents({ userId: user.uid }));
      }
      onClose();
    } catch (error: any) {
      alert(`Failed to delete event: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!event) return;

    setIsSubmitting(true);

    try {
      await dispatch(confirmEvent(event.id)).unwrap();
      if (user) {
        await dispatch(fetchEvents({ userId: user.uid }));
      }
      setCurrentMode('view');
    } catch (error: any) {
      alert(`Failed to confirm event: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!event) return;

    setIsSubmitting(true);

    try {
      await dispatch(completeEvent(event.id)).unwrap();
      if (user) {
        await dispatch(fetchEvents({ userId: user.uid }));
      }
      onClose();
    } catch (error: any) {
      alert(`Failed to complete event: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!event || !window.confirm('Are you sure you want to cancel this event?')) {
      return;
    }

    setIsSubmitting(true);

    try {
      await dispatch(cancelEvent(event.id)).unwrap();
      if (user) {
        await dispatch(fetchEvents({ userId: user.uid }));
      }
      onClose();
    } catch (error: any) {
      alert(`Failed to cancel event: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEventTypeEmoji = (eventType: EventType): string => {
    const emojis = {
      appointment: '📅',
      meeting: '👥',
      intention: '💭',
      plan: '📝',
      reminder: '⏰',
      todo: '✅',
    };
    return emojis[eventType] || '📌';
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 mb-6">
                  {currentMode === 'create' && 'Create Event'}
                  {currentMode === 'edit' && 'Edit Event'}
                  {currentMode === 'view' && (
                    <span className="flex items-center gap-2">
                      <span>{getEventTypeEmoji(type)}</span>
                      <span>{event?.title}</span>
                    </span>
                  )}
                </Dialog.Title>

                {/* Content */}
                <div className="space-y-4">
                  {currentMode === 'view' && event ? (
                    /* View Mode */
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <p className="mt-1 text-gray-900">{event.description || 'No description'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                          <p className="mt-1 text-gray-900">
                            {event.isAllDay
                              ? event.datetime.toLocaleDateString()
                              : event.datetime.toLocaleString()}
                          </p>
                        </div>

                        {event.endDatetime && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">End Time</label>
                            <p className="mt-1 text-gray-900">
                              {event.isAllDay
                                ? event.endDatetime.toLocaleDateString()
                                : event.endDatetime.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Type</label>
                          <p className="mt-1 text-gray-900 capitalize">{event.type}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Status</label>
                          <p className="mt-1 text-gray-900 capitalize">{event.status}</p>
                        </div>
                      </div>

                      {event.location && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Location</label>
                          <p className="mt-1 text-gray-900">📍 {event.location}</p>
                        </div>
                      )}

                      {event.participants.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Participants</label>
                          <p className="mt-1 text-gray-900">👥 {event.participants.join(', ')}</p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Source</label>
                        <p className="mt-1 text-gray-900 text-sm text-gray-600">
                          {event.sourceType === 'manual' ? 'Manually created' : `From ${event.sourceType}`}
                          {event.confidence < 1 && ` (${Math.round(event.confidence * 100)}% confidence)`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Edit/Create Mode */
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Title *</label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Event title"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={3}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Event description"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isAllDay"
                          checked={isAllDay}
                          onChange={(e) => setIsAllDay(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isAllDay" className="text-sm font-medium text-gray-700">
                          All day event
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Start Date & Time *</label>
                          <input
                            type="datetime-local"
                            value={datetime}
                            onChange={(e) => setDatetime(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">End Date & Time</label>
                          <input
                            type="datetime-local"
                            value={endDatetime}
                            onChange={(e) => setEndDatetime(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Type</label>
                          <select
                            value={type}
                            onChange={(e) => setType(e.target.value as EventType)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="appointment">📅 Appointment</option>
                            <option value="meeting">👥 Meeting</option>
                            <option value="intention">💭 Intention</option>
                            <option value="plan">📝 Plan</option>
                            <option value="reminder">⏰ Reminder</option>
                            <option value="todo">✅ Todo</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Status</label>
                          <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as EventStatus)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="draft">Draft</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Location</label>
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Event location"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Participants</label>
                        <input
                          type="text"
                          value={participants}
                          onChange={(e) => setParticipants(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Comma-separated names"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-6 flex justify-between items-center">
                  <div className="flex gap-2">
                    {currentMode === 'view' && event && (
                      <>
                        {event.status === 'draft' && (
                          <button
                            onClick={handleConfirm}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            Confirm
                          </button>
                        )}
                        {(event.status === 'pending' || event.status === 'confirmed') && (
                          <button
                            onClick={handleComplete}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            Complete
                          </button>
                        )}
                        {event.status !== 'cancelled' && event.status !== 'completed' && (
                          <button
                            onClick={handleCancel}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >
                            Cancel Event
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {currentMode === 'view' && event && (
                      <>
                        <button
                          onClick={() => setCurrentMode('edit')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={handleDelete}
                          disabled={isSubmitting}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </>
                    )}

                    {(currentMode === 'edit' || currentMode === 'create') && (
                      <>
                        <button
                          onClick={handleSave}
                          disabled={isSubmitting || !title.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => (currentMode === 'edit' ? setCurrentMode('view') : onClose())}
                          disabled={isSubmitting}
                          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {currentMode === 'view' && (
                      <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
