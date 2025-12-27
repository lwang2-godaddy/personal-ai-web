import { Event, EventReminder, EventType, SMART_REMINDER_DEFAULTS } from '@/lib/models/Event';
import FirestoreService from '@/lib/api/firebase/firestore';

/**
 * ReminderService - Web version
 * Handles generating and managing event reminders
 */
export class ReminderService {
  private static instance: ReminderService;

  private constructor() {}

  static getInstance(): ReminderService {
    if (!ReminderService.instance) {
      ReminderService.instance = new ReminderService();
    }
    return ReminderService.instance;
  }

  /**
   * Generate smart reminders for an event based on its type
   */
  generateSmartReminders(eventType: EventType): EventReminder[] {
    const timings = SMART_REMINDER_DEFAULTS[eventType] || [60];

    return timings.map((timing) => ({
      id: this.generateUUID(),
      type: 'smart' as const,
      timing,
      status: 'pending' as const,
    }));
  }

  /**
   * Create a custom reminder
   */
  createCustomReminder(timingMinutes: number): EventReminder {
    return {
      id: this.generateUUID(),
      type: 'custom',
      timing: timingMinutes,
      status: 'pending',
    };
  }

  /**
   * Add a reminder to an event
   */
  async addReminder(eventId: string, reminder: EventReminder): Promise<void> {
    try {
      const event = await FirestoreService.getDocument('events', eventId) as Event;
      const reminders = event.reminders || [];

      await FirestoreService.updateDocument('events', eventId, {
        reminders: [...reminders, reminder],
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error adding reminder:', error);
      throw new Error('Failed to add reminder');
    }
  }

  /**
   * Remove a reminder from an event
   */
  async removeReminder(eventId: string, reminderId: string): Promise<void> {
    try {
      const event = await FirestoreService.getDocument('events', eventId) as Event;
      const reminders = (event.reminders || []).filter((r: EventReminder) => r.id !== reminderId);

      await FirestoreService.updateDocument('events', eventId, {
        reminders,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error removing reminder:', error);
      throw new Error('Failed to remove reminder');
    }
  }

  /**
   * Update all reminders for an event
   */
  async updateReminders(eventId: string, reminders: EventReminder[]): Promise<void> {
    try {
      await FirestoreService.updateDocument('events', eventId, {
        reminders,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating reminders:', error);
      throw new Error('Failed to update reminders');
    }
  }

  /**
   * Format reminder timing for display
   */
  formatReminderTiming(timingMinutes: number): string {
    if (timingMinutes < 60) {
      return `${timingMinutes} minute${timingMinutes !== 1 ? 's' : ''} before`;
    } else if (timingMinutes < 1440) {
      const hours = Math.floor(timingMinutes / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} before`;
    } else if (timingMinutes < 10080) {
      const days = Math.floor(timingMinutes / 1440);
      return `${days} day${days !== 1 ? 's' : ''} before`;
    } else {
      const weeks = Math.floor(timingMinutes / 10080);
      return `${weeks} week${weeks !== 1 ? 's' : ''} before`;
    }
  }

  /**
   * Get preset reminder options
   */
  getPresetOptions(): Array<{ label: string; value: number }> {
    return [
      { label: '15 minutes before', value: 15 },
      { label: '30 minutes before', value: 30 },
      { label: '1 hour before', value: 60 },
      { label: '2 hours before', value: 120 },
      { label: '1 day before', value: 1440 },
      { label: '2 days before', value: 2880 },
      { label: '1 week before', value: 10080 },
    ];
  }

  /**
   * Validate reminder timing
   */
  validateReminderTiming(timingMinutes: number, eventDatetime: Date): boolean {
    const reminderTime = new Date(eventDatetime.getTime() - timingMinutes * 60 * 1000);
    const now = new Date();

    // Reminder time must be in the future
    if (reminderTime <= now) {
      return false;
    }

    // Timing must be positive
    if (timingMinutes <= 0) {
      return false;
    }

    // Maximum 4 weeks before
    if (timingMinutes > 40320) {
      return false;
    }

    return true;
  }

  /**
   * Calculate reminder time for display
   */
  calculateReminderTime(eventDatetime: Date, timingMinutes: number): Date {
    return new Date(eventDatetime.getTime() - timingMinutes * 60 * 1000);
  }

  /**
   * Generate UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Get reminder status color
   */
  getStatusColor(status: EventReminder['status']): string {
    const colors: Record<EventReminder['status'], string> = {
      pending: 'text-gray-600',
      scheduled: 'text-blue-600',
      sent: 'text-green-600',
      cancelled: 'text-red-600',
      snoozed: 'text-yellow-600',
    };
    return colors[status] || colors.pending;
  }

  /**
   * Get reminder status label
   */
  getStatusLabel(status: EventReminder['status']): string {
    const labels: Record<EventReminder['status'], string> = {
      pending: 'Pending',
      scheduled: 'Scheduled',
      sent: 'Sent',
      cancelled: 'Cancelled',
      snoozed: 'Snoozed',
    };
    return labels[status] || 'Unknown';
  }

  /**
   * Sort reminders by timing (earliest first)
   */
  sortReminders(reminders: EventReminder[]): EventReminder[] {
    return [...reminders].sort((a, b) => b.timing - a.timing);
  }

  /**
   * Get reminder count by status
   */
  getReminderCountByStatus(reminders: EventReminder[]): Record<EventReminder['status'], number> {
    return reminders.reduce(
      (acc, reminder) => {
        acc[reminder.status]++;
        return acc;
      },
      { pending: 0, scheduled: 0, sent: 0, cancelled: 0, snoozed: 0 }
    );
  }
}

export default ReminderService.getInstance();
