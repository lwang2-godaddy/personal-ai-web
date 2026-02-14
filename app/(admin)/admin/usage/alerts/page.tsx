'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost, apiPut } from '@/lib/api/client';
import { useAppSelector } from '@/lib/store/hooks';
import type {
  CostAlert,
  CostAlertingConfig,
  AnomalyType,
  AlertStatus,
} from '@/lib/models/CostAlert';
import {
  DEFAULT_COST_ALERTING_CONFIG,
  getAnomalyTypeLabel,
  getAnomalyTypeIcon,
} from '@/lib/models/CostAlert';

interface AlertsResponse {
  alerts: CostAlert[];
  activeCount: number;
  config?: CostAlertingConfig;
}

export default function CostAlertsPage() {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [config, setConfig] = useState<CostAlertingConfig>(DEFAULT_COST_ALERTING_CONFIG);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
  const [showConfig, setShowConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ includeConfig: 'true', limit: '100' });
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const data = await apiGet<AlertsResponse>(`/api/admin/alerts?${params.toString()}`);
      setAlerts(data.alerts);
      setActiveCount(data.activeCount);
      if (data.config) {
        setConfig(data.config);
      }
    } catch (err: any) {
      console.error('Failed to fetch alerts:', err);
      setError(err.message || 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAlerts();
    }
  }, [isAuthenticated, fetchAlerts]);

  const handleResolve = async (alertId: string) => {
    try {
      setResolvingId(alertId);
      await apiPost('/api/admin/alerts', { action: 'resolve', alertId });
      // Update local state
      setAlerts(prev =>
        prev.map(a =>
          a.id === alertId
            ? { ...a, status: 'resolved' as AlertStatus, resolvedAt: new Date().toISOString() }
            : a
        )
      );
      setActiveCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Failed to resolve alert:', err);
      setError(err.message || 'Failed to resolve alert');
    } finally {
      setResolvingId(null);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true);
      await apiPut('/api/admin/alerts', { config });
      setError(null);
    } catch (err: any) {
      console.error('Failed to save config:', err);
      setError(err.message || 'Failed to save config');
    } finally {
      setSavingConfig(false);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cost Alerts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Automated cost anomaly detection and alerting
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
              {activeCount} active
            </span>
          )}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Settings
          </button>
          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Config Panel */}
      {showConfig && (
        <div className="mb-6 p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alert Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Alerting Enabled
              </label>
              <select
                value={config.enabled ? 'true' : 'false'}
                onChange={(e) => setConfig({ ...config, enabled: e.target.value === 'true' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Per-User Daily Threshold ($)
              </label>
              <input
                type="number"
                step="0.10"
                min="0"
                value={config.perUserHourlyCostThreshold}
                onChange={(e) => setConfig({ ...config, perUserHourlyCostThreshold: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                System Daily Threshold ($)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={config.systemDailyCostThreshold}
                onChange={(e) => setConfig({ ...config, systemDailyCostThreshold: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Spike Multiplier Threshold (x)
              </label>
              <input
                type="number"
                step="1"
                min="2"
                value={config.spikeMultiplierThreshold}
                onChange={(e) => setConfig({ ...config, spikeMultiplierThreshold: parseInt(e.target.value) || 10 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service Dominance Threshold (%)
              </label>
              <input
                type="number"
                step="5"
                min="50"
                max="100"
                value={Math.round(config.serviceDominanceThreshold * 100)}
                onChange={(e) => setConfig({ ...config, serviceDominanceThreshold: (parseInt(e.target.value) || 80) / 100 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Alert Cooldown (hours)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={config.alertCooldownHours}
                onChange={(e) => setConfig({ ...config, alertCooldownHours: parseInt(e.target.value) || 4 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Admin Emails (comma-separated)
              </label>
              <input
                type="text"
                value={config.adminEmails.join(', ')}
                onChange={(e) => setConfig({
                  ...config,
                  adminEmails: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                })}
                placeholder="admin@example.com, admin2@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {savingConfig ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'resolved'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === tab
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      {loading && alerts.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Loading alerts...
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No alerts found</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            Cost anomaly detection runs daily at 9 AM PT
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 bg-white dark:bg-gray-800 border rounded-xl shadow-sm ${
                alert.status === 'active'
                  ? alert.severity === 'critical'
                    ? 'border-red-300 dark:border-red-700'
                    : 'border-amber-300 dark:border-amber-700'
                  : 'border-gray-200 dark:border-gray-700 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getAnomalyTypeIcon(alert.type)}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {getAnomalyTypeLabel(alert.type)}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        alert.severity === 'critical'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    {alert.status === 'resolved' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        resolved
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{alert.details}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>Cost: ${alert.currentValue.toFixed(4)}</span>
                    <span>Expected: ${alert.expectedValue.toFixed(4)}</span>
                    <span>{alert.multiplier}x</span>
                    {alert.service && <span>Service: {alert.service}</span>}
                    <span>Detected: {formatDate(alert.detectedAt)}</span>
                    {alert.resolvedAt && <span>Resolved: {formatDate(alert.resolvedAt)}</span>}
                  </div>
                </div>
                {alert.status === 'active' && (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    disabled={resolvingId === alert.id}
                    className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800 dark:hover:bg-green-900/40"
                  >
                    {resolvingId === alert.id ? 'Resolving...' : 'Resolve'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
