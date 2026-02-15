'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api/client';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface User {
  id: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'user';
  accountStatus: 'active' | 'suspended';
  subscription?: {
    tier: 'free' | 'premium' | 'pro';
    status?: string;
    source?: string;
    quotaOverrides?: {
      messagesPerMonth?: number;
      photosPerMonth?: number;
      voiceMinutesPerMonth?: number;
    };
    overrideBy?: string;
    overrideAt?: string;
  };
  customLimits?: {
    maxTokensPerDay?: number;
    maxApiCallsPerDay?: number;
    maxCostPerMonth?: number;
  };
  createdAt: string;
  lastLoginAt?: string;
}

interface SubscriptionDetails {
  userId: string;
  subscription: {
    tier: 'free' | 'premium' | 'pro';
    status: string;
    source?: string;
    quotaOverrides?: {
      messagesPerMonth?: number;
      photosPerMonth?: number;
      voiceMinutesPerMonth?: number;
    };
  };
  usage: {
    messagesThisMonth: number;
    messagesToday: number;
    photosThisMonth: number;
    voiceMinutesThisMonth: number;
  };
  tierDefaults: {
    messagesPerMonth: number;
    photosPerMonth: number;
    voiceMinutesPerMonth: number;
  };
  effectiveLimits: {
    messagesPerMonth: number;
    photosPerMonth: number;
    voiceMinutesPerMonth: number;
  };
}

interface UsageData {
  date?: string;
  month?: string;
  week?: string;
  totalCostUSD: number;
  totalApiCalls: number;
  totalTokens: number;
  operationCounts: Record<string, number>;
  operationCosts: Record<string, number>;
}

interface UsageResponse {
  usage: UsageData[];
  totals: {
    totalCost: number;
    totalApiCalls: number;
    totalTokens: number;
  };
  breakdown: {
    operationCounts: Record<string, number>;
    operationCosts: Record<string, number>;
  };
  period: 'day' | 'week' | 'month';
}

interface UserDetailResponse {
  user: User;
  currentMonthUsage: {
    totalCost: number;
    totalApiCalls: number;
    totalTokens: number;
  };
}

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6'];

const OPERATION_LABELS: Record<string, string> = {
  embedding: 'Embeddings',
  chat_completion: 'Chat Completion',
  transcription: 'Transcription',
  image_description: 'Image Description',
  tts: 'Text-to-Speech',
  pinecone_query: 'Vector Query',
  pinecone_upsert: 'Vector Upsert',
  pinecone_delete: 'Vector Delete',
};

/**
 * Format quota value for display
 */
function formatQuotaValue(value: number | undefined): string {
  if (value === undefined || value === null) return 'N/A';
  return value === -1 ? 'Unlimited' : value.toString();
}

/**
 * Admin User Detail Page
 * View and manage individual user with usage analytics
 */
export default function AdminUserDetailPage() {
  // Track page view
  useTrackPage(TRACKED_SCREENS.adminUserDetail);

  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [user, setUser] = useState<User | null>(null);
  const [currentMonthUsage, setCurrentMonthUsage] = useState<any>(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Usage data states
  const [dailyUsage, setDailyUsage] = useState<UsageData[]>([]);
  const [monthlyUsage, setMonthlyUsage] = useState<UsageData[]>([]);
  const [usageTotals, setUsageTotals] = useState<any>(null);
  const [usageBreakdown, setUsageBreakdown] = useState<any>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);

  // Edit states
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isEditingSubscription, setIsEditingSubscription] = useState(false);
  const [isEditingQuotas, setIsEditingQuotas] = useState(false);
  const [isResettingUsage, setIsResettingUsage] = useState(false);
  const [isEditingLimits, setIsEditingLimits] = useState(false);

  // Form states
  const [selectedTier, setSelectedTier] = useState<'free' | 'premium' | 'pro'>('free');
  const [messagesOverride, setMessagesOverride] = useState<string>('');
  const [photosOverride, setPhotosOverride] = useState<string>('');
  const [voiceOverride, setVoiceOverride] = useState<string>('');
  const [maxTokensPerDay, setMaxTokensPerDay] = useState<string>('');
  const [maxApiCallsPerDay, setMaxApiCallsPerDay] = useState<string>('');
  const [maxCostPerMonth, setMaxCostPerMonth] = useState<string>('');

  useEffect(() => {
    fetchUserData();
    fetchSubscriptionDetails();
    fetchUsageData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await apiGet<UserDetailResponse>(`/api/admin/users/${userId}`);
      setUser(data.user);
      setCurrentMonthUsage(data.currentMonthUsage);

      // Initialize form states
      setSelectedTier(data.user.subscription?.tier || 'free');
      setMaxTokensPerDay(data.user.customLimits?.maxTokensPerDay?.toString() || '');
      setMaxApiCallsPerDay(data.user.customLimits?.maxApiCallsPerDay?.toString() || '');
      setMaxCostPerMonth(data.user.customLimits?.maxCostPerMonth?.toString() || '');
    } catch (err: any) {
      console.error('Failed to fetch user data:', err);
      setError(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionDetails = async () => {
    try {
      const data = await apiGet<SubscriptionDetails>(`/api/admin/users/${userId}/subscription`);
      setSubscriptionDetails(data);

      // Initialize override form states
      const overrides = data.subscription.quotaOverrides;
      setMessagesOverride(overrides?.messagesPerMonth?.toString() || '');
      setPhotosOverride(overrides?.photosPerMonth?.toString() || '');
      setVoiceOverride(overrides?.voiceMinutesPerMonth?.toString() || '');
    } catch (err: any) {
      console.error('Failed to fetch subscription details:', err);
    }
  };

  const fetchUsageData = async () => {
    try {
      setLoadingUsage(true);

      // Fetch daily usage (last 30 days)
      const dailyData = await apiGet<UsageResponse>(`/api/admin/usage/${userId}?period=day`);
      setDailyUsage(dailyData.usage);

      // Fetch monthly usage (last 12 months)
      const monthlyData = await apiGet<UsageResponse>(`/api/admin/usage/${userId}?period=month`);
      setMonthlyUsage(monthlyData.usage);
      setUsageTotals(monthlyData.totals);
      setUsageBreakdown(monthlyData.breakdown);
    } catch (err: any) {
      console.error('Failed to fetch usage data:', err);
    } finally {
      setLoadingUsage(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;

    const newStatus = user.accountStatus === 'active' ? 'suspended' : 'active';
    const action = newStatus === 'suspended' ? 'suspend' : 'activate';

    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    try {
      setIsEditingStatus(true);
      await apiPatch(`/api/admin/users/${userId}`, { accountStatus: newStatus });
      await fetchUserData();
    } catch (err: any) {
      console.error(`Failed to ${action} user:`, err);
      alert(`Failed to ${action} user: ${err.message}`);
    } finally {
      setIsEditingStatus(false);
    }
  };

  const handleUpdateTier = async () => {
    try {
      setIsEditingSubscription(true);
      await apiPatch(`/api/admin/users/${userId}/subscription`, { tier: selectedTier });
      await fetchUserData();
      await fetchSubscriptionDetails();
      alert('Subscription tier updated successfully');
    } catch (err: any) {
      console.error('Failed to update tier:', err);
      alert(`Failed to update tier: ${err.message}`);
    } finally {
      setIsEditingSubscription(false);
    }
  };

  const handleUpdateQuotaOverrides = async () => {
    try {
      setIsEditingQuotas(true);

      const quotaOverrides: any = {};

      // Parse values (-1 for unlimited, empty means use tier default)
      if (messagesOverride !== '') {
        const value = parseInt(messagesOverride, 10);
        if (!isNaN(value) && value >= -1) {
          quotaOverrides.messagesPerMonth = value;
        }
      }
      if (photosOverride !== '') {
        const value = parseInt(photosOverride, 10);
        if (!isNaN(value) && value >= -1) {
          quotaOverrides.photosPerMonth = value;
        }
      }
      if (voiceOverride !== '') {
        const value = parseInt(voiceOverride, 10);
        if (!isNaN(value) && value >= -1) {
          quotaOverrides.voiceMinutesPerMonth = value;
        }
      }

      await apiPatch(`/api/admin/users/${userId}/subscription`, { quotaOverrides });
      await fetchSubscriptionDetails();
      alert('Quota overrides updated successfully');
    } catch (err: any) {
      console.error('Failed to update quota overrides:', err);
      alert(`Failed to update quota overrides: ${err.message}`);
    } finally {
      setIsEditingQuotas(false);
    }
  };

  const handleClearQuotaOverrides = async () => {
    if (!confirm('Are you sure you want to clear all quota overrides? This will revert to tier defaults.')) {
      return;
    }

    try {
      setIsEditingQuotas(true);
      await apiPatch(`/api/admin/users/${userId}/subscription`, { quotaOverrides: null });
      setMessagesOverride('');
      setPhotosOverride('');
      setVoiceOverride('');
      await fetchSubscriptionDetails();
      alert('Quota overrides cleared successfully');
    } catch (err: any) {
      console.error('Failed to clear quota overrides:', err);
      alert(`Failed to clear quota overrides: ${err.message}`);
    } finally {
      setIsEditingQuotas(false);
    }
  };

  const handleResetUsage = async () => {
    if (!confirm('Are you sure you want to reset all usage counters to 0?')) {
      return;
    }

    try {
      setIsResettingUsage(true);
      await apiPatch(`/api/admin/users/${userId}/subscription`, { resetUsage: true });
      await fetchSubscriptionDetails();
      alert('Usage counters reset successfully');
    } catch (err: any) {
      console.error('Failed to reset usage:', err);
      alert(`Failed to reset usage: ${err.message}`);
    } finally {
      setIsResettingUsage(false);
    }
  };

  const handleUpdateLimits = async () => {
    try {
      setIsEditingLimits(true);

      const customLimits: any = {};
      if (maxTokensPerDay) customLimits.maxTokensPerDay = parseInt(maxTokensPerDay, 10);
      if (maxApiCallsPerDay) customLimits.maxApiCallsPerDay = parseInt(maxApiCallsPerDay, 10);
      if (maxCostPerMonth) customLimits.maxCostPerMonth = parseFloat(maxCostPerMonth);

      await apiPatch(`/api/admin/users/${userId}`, { customLimits });
      await fetchUserData();
      alert('Custom limits updated successfully');
    } catch (err: any) {
      console.error('Failed to update limits:', err);
      alert(`Failed to update limits: ${err.message}`);
    } finally {
      setIsEditingLimits(false);
    }
  };

  const handleClearLimits = async () => {
    if (!confirm('Are you sure you want to clear custom limits? This will revert to default limits.')) {
      return;
    }

    try {
      setIsEditingLimits(true);
      await apiPatch(`/api/admin/users/${userId}`, { customLimits: {} });
      setMaxTokensPerDay('');
      setMaxApiCallsPerDay('');
      setMaxCostPerMonth('');
      await fetchUserData();
      alert('Custom limits cleared successfully');
    } catch (err: any) {
      console.error('Failed to clear limits:', err);
      alert(`Failed to clear limits: ${err.message}`);
    } finally {
      setIsEditingLimits(false);
    }
  };

  // Prepare chart data
  const dailyChartData = dailyUsage.map((day) => ({
    date: day.date ? new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
    cost: day.totalCostUSD,
    apiCalls: day.totalApiCalls,
  }));

  const monthlyChartData = monthlyUsage.map((month) => ({
    month: month.month || '',
    cost: month.totalCostUSD,
    apiCalls: month.totalApiCalls,
  }));

  const operationBreakdownData = usageBreakdown
    ? Object.entries(usageBreakdown.operationCosts).map(([operation, cost]) => ({
        name: OPERATION_LABELS[operation] || operation,
        value: cost as number,
        count: usageBreakdown.operationCounts[operation] || 0,
      }))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading User</h3>
        <p className="text-red-600">{error || 'User not found'}</p>
        <Link
          href="/admin/users"
          className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/users"
            className="text-indigo-600 hover:text-indigo-800 font-medium mb-2 inline-block"
          >
            Back to Users
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{user.displayName || 'Unknown User'}</h1>
          <p className="mt-1 text-gray-600">{user.email}</p>
        </div>
      </div>

      {/* User Information Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">User Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Basic Info */}
          <div>
            <p className="text-sm text-gray-600">User ID</p>
            <p className="font-medium text-gray-900">{user.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Role</p>
            <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {user.role}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-600">Created</p>
            <p className="font-medium text-gray-900">{new Date(user.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Last Login</p>
            <p className="font-medium text-gray-900">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
            </p>
          </div>
        </div>
      </div>

      {/* Account Status Control */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Account Status</h2>
        <div className="flex items-center justify-between">
          <div>
            <span
              className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                user.accountStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {user.accountStatus}
            </span>
            <p className="mt-2 text-sm text-gray-600">
              {user.accountStatus === 'active'
                ? 'User can access the application and make API requests'
                : 'User is suspended and cannot access the application'}
            </p>
          </div>
          <button
            onClick={handleToggleStatus}
            disabled={isEditingStatus}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              user.accountStatus === 'active'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isEditingStatus ? 'Updating...' : user.accountStatus === 'active' ? 'Suspend User' : 'Activate User'}
          </button>
        </div>
      </div>

      {/* Subscription Management */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Subscription</h2>

        {/* Tier Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Tier</label>
          <div className="flex items-center gap-4">
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value as 'free' | 'premium' | 'pro')}
              className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="free">Free</option>
              <option value="premium">Premium</option>
              <option value="pro">Pro</option>
            </select>
            <button
              onClick={handleUpdateTier}
              disabled={isEditingSubscription || selectedTier === (subscriptionDetails?.subscription.tier || 'free')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isEditingSubscription ? 'Updating...' : 'Update Tier'}
            </button>
          </div>
          {subscriptionDetails?.subscription.source === 'admin_override' && (
            <p className="mt-2 text-sm text-orange-600">
              Tier was set by admin override
            </p>
          )}
        </div>

        {/* Current Usage vs Limits */}
        {subscriptionDetails && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Usage</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600 font-medium">Messages This Month</p>
                <p className="text-2xl font-bold text-blue-900">
                  {subscriptionDetails.usage.messagesThisMonth ?? 0} / {formatQuotaValue(subscriptionDetails.effectiveLimits.messagesPerMonth)}
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  Tier default: {formatQuotaValue(subscriptionDetails.tierDefaults.messagesPerMonth)}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600 font-medium">Photos This Month</p>
                <p className="text-2xl font-bold text-green-900">
                  {subscriptionDetails.usage.photosThisMonth ?? 0} / {formatQuotaValue(subscriptionDetails.effectiveLimits.photosPerMonth)}
                </p>
                <p className="text-xs text-green-500 mt-1">
                  Tier default: {formatQuotaValue(subscriptionDetails.tierDefaults.photosPerMonth)}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-600 font-medium">Voice Minutes This Month</p>
                <p className="text-2xl font-bold text-purple-900">
                  {Math.round(subscriptionDetails.usage.voiceMinutesThisMonth ?? 0)} / {formatQuotaValue(subscriptionDetails.effectiveLimits.voiceMinutesPerMonth)}
                </p>
                <p className="text-xs text-purple-500 mt-1">
                  Tier default: {formatQuotaValue(subscriptionDetails.tierDefaults.voiceMinutesPerMonth)}
                </p>
              </div>
            </div>
            <button
              onClick={handleResetUsage}
              disabled={isResettingUsage}
              className="mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {isResettingUsage ? 'Resetting...' : 'Reset All Usage Counters'}
            </button>
          </div>
        )}

        {/* Quota Overrides */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Custom Quota Overrides</h3>
          <p className="text-sm text-gray-600 mb-4">
            Set custom limits for this user. Use -1 for unlimited. Leave blank to use tier defaults.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Messages/Month</label>
              <input
                type="number"
                value={messagesOverride}
                onChange={(e) => setMessagesOverride(e.target.value)}
                placeholder="Use tier default"
                min="-1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Photos/Month</label>
              <input
                type="number"
                value={photosOverride}
                onChange={(e) => setPhotosOverride(e.target.value)}
                placeholder="Use tier default"
                min="-1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Voice Minutes/Month</label>
              <input
                type="number"
                value={voiceOverride}
                onChange={(e) => setVoiceOverride(e.target.value)}
                placeholder="Use tier default"
                min="-1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleUpdateQuotaOverrides}
              disabled={isEditingQuotas}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isEditingQuotas ? 'Updating...' : 'Update Overrides'}
            </button>
            <button
              onClick={handleClearQuotaOverrides}
              disabled={isEditingQuotas}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Clear All Overrides
            </button>
          </div>
        </div>
      </div>

      {/* Custom API Limits */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Custom API Limits</h2>
        <p className="text-sm text-gray-600 mb-4">
          Set custom API usage limits for this user. Leave blank to use default limits.
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Tokens per Day</label>
              <input
                type="number"
                value={maxTokensPerDay}
                onChange={(e) => setMaxTokensPerDay(e.target.value)}
                placeholder="e.g., 100000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max API Calls per Day</label>
              <input
                type="number"
                value={maxApiCallsPerDay}
                onChange={(e) => setMaxApiCallsPerDay(e.target.value)}
                placeholder="e.g., 1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Cost per Month ($)</label>
              <input
                type="number"
                step="0.01"
                value={maxCostPerMonth}
                onChange={(e) => setMaxCostPerMonth(e.target.value)}
                placeholder="e.g., 50.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleUpdateLimits}
              disabled={isEditingLimits}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isEditingLimits ? 'Updating...' : 'Update Limits'}
            </button>
            <button
              onClick={handleClearLimits}
              disabled={isEditingLimits}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Clear Custom Limits
            </button>
          </div>
        </div>
      </div>

      {/* Current Month API Usage Summary */}
      {currentMonthUsage && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Current Month API Usage</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium">Total Cost</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                ${currentMonthUsage.totalCost.toFixed(2)}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium">API Calls</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {currentMonthUsage.totalApiCalls.toLocaleString()}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium">Total Tokens</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {currentMonthUsage.totalTokens.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Usage Breakdown by Operation */}
      {!loadingUsage && usageBreakdown && operationBreakdownData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Usage Breakdown by Operation</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={operationBreakdownData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(0) : '0'}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {operationBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Operation Details</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Operation</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {operationBreakdownData.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 text-right">{item.count.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                          ${item.value.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Usage Chart (Last 30 Days) */}
      {!loadingUsage && dailyChartData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Daily Usage Trend (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="cost" stroke="#ef4444" name="Cost ($)" strokeWidth={2} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="apiCalls"
                stroke="#3b82f6"
                name="API Calls"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly Usage Chart (Last 12 Months) */}
      {!loadingUsage && monthlyChartData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Monthly Usage Trend (Last 12 Months)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="cost" fill="#ef4444" name="Cost ($)" />
              <Bar yAxisId="right" dataKey="apiCalls" fill="#3b82f6" name="API Calls" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Loading State for Usage */}
      {loadingUsage && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Loading usage analytics...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
