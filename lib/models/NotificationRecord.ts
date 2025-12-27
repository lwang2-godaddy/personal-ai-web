/**
 * NotificationRecord
 *
 * Represents a notification that was sent (or suppressed) for history tracking.
 * Stored in Firestore under the `notifications` collection.
 */

export interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  category: 'scheduled' | 'instant' | 'escalated';

  // Content
  title: string;
  body: string;
  imageUrl?: string;

  // Delivery tracking
  scheduledFor?: Date; // When it was scheduled to be sent
  sentAt: Date; // When FCM sent it
  deliveredAt?: Date; // FCM delivery confirmation (if available)
  openedAt?: Date; // User opened notification

  // Status
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'dismissed' | 'suppressed';
  suppressionReason?: 'quiet_hours' | 'rate_limit' | 'user_preference';

  // Related data (for navigation/context)
  relatedEventId?: string;
  relatedReminderId?: string;

  // Metadata
  channel?: string; // Android channel ID (e.g., 'reminders', 'important_events')
  priority: 'low' | 'default' | 'high' | 'max';
  metadata?: Record<string, any>; // Additional custom data

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notification types supported by the system
 */
export type NotificationType =
  | 'event_reminder' // Standard event reminders
  | 'escalated_reminder' // Escalated/urgent reminders (level 2+)
  | 'daily_summary' // Daily activity summary (8 PM UTC)
  | 'weekly_insights' // Weekly insights (Monday 9 AM UTC)
  | 'fun_fact' // Daily fun facts (user's preferred time)
  | 'achievement' // Achievement milestones (e.g., step goals)
  | 'location_alert' // Location-based activity alerts
  | 'pattern_reminder'; // Pattern-based reminders (e.g., badminton at 2 PM)

/**
 * Default values for NotificationRecord creation
 */
export const DEFAULT_NOTIFICATION_PRIORITY = 'default';

/**
 * Type guard to check if a notification type is valid
 */
export function isValidNotificationType(type: string): type is NotificationType {
  const validTypes: NotificationType[] = [
    'event_reminder',
    'escalated_reminder',
    'daily_summary',
    'weekly_insights',
    'fun_fact',
    'achievement',
    'location_alert',
    'pattern_reminder',
  ];
  return validTypes.includes(type as NotificationType);
}

/**
 * Get human-readable label for notification type
 */
export function getNotificationTypeLabel(type: NotificationType): string {
  const labels: Record<NotificationType, string> = {
    event_reminder: 'Event Reminder',
    escalated_reminder: 'Urgent Reminder',
    daily_summary: 'Daily Summary',
    weekly_insights: 'Weekly Insights',
    fun_fact: 'Fun Fact',
    achievement: 'Achievement',
    location_alert: 'Location Alert',
    pattern_reminder: 'Pattern Reminder',
  };
  return labels[type];
}

/**
 * Get emoji icon for notification type
 */
export function getNotificationTypeIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    event_reminder: '🔔',
    escalated_reminder: '⚠️',
    daily_summary: '📊',
    weekly_insights: '💡',
    fun_fact: '🎯',
    achievement: '🏆',
    location_alert: '📍',
    pattern_reminder: '🔄',
  };
  return icons[type];
}

/**
 * Get color for notification status (for UI badges)
 */
export function getStatusColor(status: NotificationRecord['status']): string {
  const colors: Record<NotificationRecord['status'], string> = {
    pending: '#9CA3AF', // Gray
    sent: '#3B82F6', // Blue
    delivered: '#10B981', // Green
    opened: '#6366F1', // Indigo
    dismissed: '#6B7280', // Dark gray
    suppressed: '#F59E0B', // Orange
  };
  return colors[status];
}

/**
 * Get human-readable label for status
 */
export function getStatusLabel(status: NotificationRecord['status']): string {
  const labels: Record<NotificationRecord['status'], string> = {
    pending: 'Pending',
    sent: 'Sent',
    delivered: 'Delivered',
    opened: 'Opened',
    dismissed: 'Dismissed',
    suppressed: 'Suppressed',
  };
  return labels[status];
}
