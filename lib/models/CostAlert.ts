/**
 * Cost Alert types and interfaces for the cost anomaly detection system
 */

export type AnomalyType = 'user_spike' | 'absolute_threshold' | 'service_dominant';
export type AlertSeverity = 'warning' | 'critical';
export type AlertStatus = 'active' | 'resolved';

export interface CostAlert {
  id: string;
  type: AnomalyType;
  severity: AlertSeverity;
  userId?: string;
  service?: string;
  currentValue: number;
  expectedValue: number;
  multiplier: number;
  details: string;
  status: AlertStatus;
  detectedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface CostAlertingConfig {
  enabled: boolean;
  perUserHourlyCostThreshold: number;
  systemDailyCostThreshold: number;
  spikeMultiplierThreshold: number;
  serviceDominanceThreshold: number;
  alertCooldownHours: number;
  adminEmails: string[];
}

export const DEFAULT_COST_ALERTING_CONFIG: CostAlertingConfig = {
  enabled: true,
  perUserHourlyCostThreshold: 5.00,
  systemDailyCostThreshold: 50.00,
  spikeMultiplierThreshold: 10,
  serviceDominanceThreshold: 0.80,
  alertCooldownHours: 24,
  adminEmails: [],
};

export function getAnomalyTypeLabel(type: AnomalyType): string {
  switch (type) {
    case 'user_spike': return 'User Cost Spike';
    case 'absolute_threshold': return 'Threshold Exceeded';
    case 'service_dominant': return 'Service Dominance';
    default: return 'Unknown';
  }
}

export function getAnomalyTypeIcon(type: AnomalyType): string {
  switch (type) {
    case 'user_spike': return '📈';
    case 'absolute_threshold': return '🚫';
    case 'service_dominant': return '⚠️';
    default: return '❓';
  }
}

export function getSeverityColor(severity: AlertSeverity): string {
  return severity === 'critical' ? 'red' : 'amber';
}
