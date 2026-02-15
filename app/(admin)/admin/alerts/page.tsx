'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost, apiPut } from '@/lib/api/client';
import { useAppSelector } from '@/lib/store/hooks';
import type {
  AdminAlert,
  AlertingConfig,
  AlertCategory,
  AlertStatus,
} from '@/lib/models/AdminAlert';
import {
  DEFAULT_ALERTING_CONFIG,
  getAlertTypeLabel,
  getAlertTypeIcon,
  getCategoryLabel,
  getCategoryColor,
} from '@/lib/models/AdminAlert';

interface AlertsResponse {
  alerts: AdminAlert[];
  activeCount: number;
  config?: AlertingConfig;
}

type CategoryFilter = 'all' | AlertCategory;
type StatusFilter = 'all' | AlertStatus;

export default function UnifiedAlertsPage() {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [config, setConfig] = useState<AlertingConfig>(DEFAULT_ALERTING_CONFIG);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
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
      if (categoryFilter !== 'all') {
        params.set('category', categoryFilter);
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
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAlerts();
    }
  }, [isAuthenticated, fetchAlerts]);

  const handleResolve = async (alertId: string) => {
    try {
      setResolvingId(alertId);
      await apiPost('/api/admin/alerts', { action: 'resolve', alertId });
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

  const categoryBadgeClasses: Record<string, string> = {
    cost: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    behavior: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    system: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alerts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Unified anomaly detection across cost, behavior, and system metrics
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

          {/* Cost Config */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/30">Cost</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Enabled
                </label>
                <select
                  value={config.cost.enabled ? 'true' : 'false'}
                  onChange={(e) => setConfig({ ...config, cost: { ...config.cost, enabled: e.target.value === 'true' } })}
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
                  value={config.cost.perUserDailyCostThreshold ?? 5}
                  onChange={(e) => setConfig({ ...config, cost: { ...config.cost, perUserDailyCostThreshold: parseFloat(e.target.value) || 0 } })}
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
                  value={config.cost.systemDailyCostThreshold ?? 50}
                  onChange={(e) => setConfig({ ...config, cost: { ...config.cost, systemDailyCostThreshold: parseFloat(e.target.value) || 0 } })}
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
                  value={config.cost.spikeMultiplierThreshold ?? 10}
                  onChange={(e) => setConfig({ ...config, cost: { ...config.cost, spikeMultiplierThreshold: parseInt(e.target.value) || 10 } })}
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
                  value={Math.round((config.cost.serviceDominanceThreshold ?? 0.8) * 100)}
                  onChange={(e) => setConfig({ ...config, cost: { ...config.cost, serviceDominanceThreshold: (parseInt(e.target.value) || 80) / 100 } })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cooldown (hours)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={config.cost.alertCooldownHours}
                  onChange={(e) => setConfig({ ...config, cost: { ...config.cost, alertCooldownHours: parseInt(e.target.value) || 24 } })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Behavior Config */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-400 mb-3 flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 dark:bg-purple-900/30">Behavior</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Enabled
                </label>
                <select
                  value={config.behavior.enabled ? 'true' : 'false'}
                  onChange={(e) => setConfig({ ...config, behavior: { ...config.behavior, enabled: e.target.value === 'true' } })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Event Drop Threshold (%)
                </label>
                <input
                  type="number"
                  step="5"
                  min="10"
                  max="90"
                  value={Math.round((config.behavior.eventDropThreshold ?? 0.5) * 100)}
                  onChange={(e) => setConfig({ ...config, behavior: { ...config.behavior, eventDropThreshold: (parseInt(e.target.value) || 50) / 100 } })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cooldown (hours)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={config.behavior.alertCooldownHours}
                  onChange={(e) => setConfig({ ...config, behavior: { ...config.behavior, alertCooldownHours: parseInt(e.target.value) || 24 } })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* System Config */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-3 flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 dark:bg-orange-900/30">System</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Enabled
                </label>
                <select
                  value={config.system.enabled ? 'true' : 'false'}
                  onChange={(e) => setConfig({ ...config, system: { ...config.system, enabled: e.target.value === 'true' } })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Embedding Backlog Threshold
                </label>
                <input
                  type="number"
                  step="10"
                  min="1"
                  value={config.system.embeddingBacklogThreshold ?? 50}
                  onChange={(e) => setConfig({ ...config, system: { ...config.system, embeddingBacklogThreshold: parseInt(e.target.value) || 50 } })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cooldown (hours)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={config.system.alertCooldownHours}
                  onChange={(e) => setConfig({ ...config, system: { ...config.system, alertCooldownHours: parseInt(e.target.value) || 12 } })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Admin Emails (shared across all categories) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Admin Emails (comma-separated, shared across all categories)
            </label>
            <input
              type="text"
              value={config.cost.adminEmails.join(', ')}
              onChange={(e) => {
                const emails = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                setConfig({
                  ...config,
                  cost: { ...config.cost, adminEmails: emails },
                  behavior: { ...config.behavior, adminEmails: emails },
                  system: { ...config.system, adminEmails: emails },
                });
              }}
              placeholder="admin@example.com, admin2@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div className="flex justify-end">
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

      {/* Category Tabs */}
      <div className="flex gap-2 mb-3">
        {(['all', 'cost', 'behavior', 'system'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setCategoryFilter(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              categoryFilter === tab
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {tab === 'all' ? 'All' : getCategoryLabel(tab)}
          </button>
        ))}
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'resolved'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === tab
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {tab === 'all' ? 'All Statuses' : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
            Anomaly detection runs daily at 9 AM PT
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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-lg">{getAlertTypeIcon(alert.type)}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {alert.title || getAlertTypeLabel(alert.type)}
                    </span>
                    {/* Category badge */}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        categoryBadgeClasses[alert.category] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {getCategoryLabel(alert.category)}
                    </span>
                    {/* Severity badge */}
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
                    {alert.category === 'cost' && (
                      <>
                        <span>Cost: ${alert.currentValue.toFixed(4)}</span>
                        <span>Expected: ${alert.expectedValue.toFixed(4)}</span>
                      </>
                    )}
                    {alert.category === 'behavior' && (
                      <>
                        <span>Value: {alert.currentValue}</span>
                        <span>Expected: {alert.expectedValue}</span>
                      </>
                    )}
                    {alert.category === 'system' && (
                      <>
                        <span>Count: {alert.currentValue}</span>
                        <span>Threshold: {alert.expectedValue}</span>
                      </>
                    )}
                    {alert.multiplier > 0 && <span>{alert.multiplier}x</span>}
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
