/**
 * Unified Admin Alert types and interfaces
 * Replaces cost-only alerts with multi-category alerting system
 */

export type AlertCategory = 'cost' | 'behavior' | 'system';

export type AlertType =
  | 'cost_user_spike'
  | 'cost_absolute_threshold'
  | 'cost_service_dominant'
  | 'behavior_event_drop'
  | 'behavior_no_active_users'
  | 'system_function_errors'
  | 'system_embedding_backlog';

export type AlertSeverity = 'warning' | 'critical';
export type AlertStatus = 'active' | 'resolved';

export interface AdminAlert {
  id: string;
  category: AlertCategory;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  details: string;
  currentValue: number;
  expectedValue: number;
  multiplier: number;
  userId?: string;
  service?: string;
  metadata?: Record<string, any>;
  detectedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface AlertCategoryConfig {
  enabled: boolean;
  // cost-specific
  perUserDailyCostThreshold?: number;
  systemDailyCostThreshold?: number;
  spikeMultiplierThreshold?: number;
  serviceDominanceThreshold?: number;
  // behavior-specific
  eventDropThreshold?: number; // 0.5 = alert if <50% of avg
  // system-specific
  errorRateThreshold?: number;
  embeddingBacklogThreshold?: number;
  // common
  alertCooldownHours: number;
  adminEmails: string[];
}

export interface AlertingConfig {
  cost: AlertCategoryConfig;
  behavior: AlertCategoryConfig;
  system: AlertCategoryConfig;
}

export const DEFAULT_ALERTING_CONFIG: AlertingConfig = {
  cost: {
    enabled: true,
    perUserDailyCostThreshold: 5.0,
    systemDailyCostThreshold: 50.0,
    spikeMultiplierThreshold: 10,
    serviceDominanceThreshold: 0.8,
    alertCooldownHours: 24,
    adminEmails: [],
  },
  behavior: {
    enabled: true,
    eventDropThreshold: 0.5,
    alertCooldownHours: 24,
    adminEmails: [],
  },
  system: {
    enabled: true,
    errorRateThreshold: 0.1,
    embeddingBacklogThreshold: 50,
    alertCooldownHours: 12,
    adminEmails: [],
  },
};

/** Map AlertType → human-readable label */
export function getAlertTypeLabel(type: AlertType): string {
  switch (type) {
    case 'cost_user_spike':
      return 'User Cost Spike';
    case 'cost_absolute_threshold':
      return 'Cost Threshold Exceeded';
    case 'cost_service_dominant':
      return 'Service Dominance';
    case 'behavior_event_drop':
      return 'Event Volume Drop';
    case 'behavior_no_active_users':
      return 'No Active Users';
    case 'system_function_errors':
      return 'Function Error Rate';
    case 'system_embedding_backlog':
      return 'Embedding Backlog';
    default:
      return 'Unknown';
  }
}

/** Map AlertType → icon */
export function getAlertTypeIcon(type: AlertType): string {
  switch (type) {
    case 'cost_user_spike':
      return '📈';
    case 'cost_absolute_threshold':
      return '🚫';
    case 'cost_service_dominant':
      return '⚠️';
    case 'behavior_event_drop':
      return '📉';
    case 'behavior_no_active_users':
      return '👻';
    case 'system_function_errors':
      return '🔥';
    case 'system_embedding_backlog':
      return '📦';
    default:
      return '❓';
  }
}

/** Map AlertCategory → label */
export function getCategoryLabel(category: AlertCategory): string {
  switch (category) {
    case 'cost':
      return 'Cost';
    case 'behavior':
      return 'Behavior';
    case 'system':
      return 'System';
    default:
      return 'Unknown';
  }
}

/** Map AlertCategory → tailwind color class prefix */
export function getCategoryColor(category: AlertCategory): string {
  switch (category) {
    case 'cost':
      return 'blue';
    case 'behavior':
      return 'purple';
    case 'system':
      return 'orange';
    default:
      return 'gray';
  }
}

/** Map AlertSeverity → tailwind color class prefix */
export function getSeverityColor(severity: AlertSeverity): string {
  return severity === 'critical' ? 'red' : 'amber';
}

/**
 * Convert a legacy CostAlert (from costAlerts collection) to an AdminAlert.
 * Used for backward compat when reading from the old collection.
 */
export function costAlertToAdminAlert(doc: Record<string, any> & { id: string }): AdminAlert {
  // Map old anomaly types to new unified types
  const typeMap: Record<string, AlertType> = {
    user_spike: 'cost_user_spike',
    absolute_threshold: 'cost_absolute_threshold',
    service_dominant: 'cost_service_dominant',
  };

  return {
    id: doc.id,
    category: 'cost',
    type: typeMap[doc.type] || ('cost_' + doc.type) as AlertType,
    severity: doc.severity || 'warning',
    status: doc.status || 'active',
    title: doc.title || getAlertTypeLabel(typeMap[doc.type] || 'cost_user_spike'),
    details: doc.details || '',
    currentValue: doc.currentValue || 0,
    expectedValue: doc.expectedValue || 0,
    multiplier: doc.multiplier || 0,
    userId: doc.userId,
    service: doc.service,
    metadata: doc.metadata,
    detectedAt: doc.detectedAt || '',
    resolvedAt: doc.resolvedAt,
    resolvedBy: doc.resolvedBy,
  };
}
