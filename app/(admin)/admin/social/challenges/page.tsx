'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/client';
import { useAppSelector } from '@/lib/store/hooks';

interface ChallengeProgress {
  userId: string;
  currentValue: number;
  rank: number;
  lastUpdated?: string;
  displayName?: string;
  email?: string;
  photoURL?: string | null;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'diary' | 'voice' | 'photo' | 'checkin' | 'streak' | 'combo';
  goalValue: number;
  goalUnit: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  participantIds: string[];
  participantCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  progressSummary?: ChallengeProgress[];
}

interface ChallengeDetail {
  challenge: Challenge;
  progress: ChallengeProgress[];
  userProfiles: Record<string, { displayName: string; email: string; photoURL: string | null }>;
}

const CHALLENGE_TYPES = [
  { value: 'diary', label: 'Diary', icon: '📝', color: 'bg-blue-100 text-blue-800' },
  { value: 'voice', label: 'Voice', icon: '🎤', color: 'bg-purple-100 text-purple-800' },
  { value: 'photo', label: 'Photo', icon: '📸', color: 'bg-pink-100 text-pink-800' },
  { value: 'checkin', label: 'Check-in', icon: '📍', color: 'bg-green-100 text-green-800' },
  { value: 'streak', label: 'Streak', icon: '🔥', color: 'bg-orange-100 text-orange-800' },
  { value: 'combo', label: 'Combo', icon: '🎯', color: 'bg-yellow-100 text-yellow-800' },
];

function getTypeConfig(type: string) {
  return CHALLENGE_TYPES.find((t) => t.value === type) || CHALLENGE_TYPES[0];
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function AdminChallengesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAppSelector((state) => state.auth);

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'diary' as string,
    goalValue: '',
    goalUnit: 'count',
    startDate: '',
    endDate: '',
    participantIds: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchChallenges();
    }
  }, [authLoading, isAuthenticated, statusFilter, typeFilter]);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const data = await apiGet<{ challenges: Challenge[]; total: number }>(
        `/api/admin/challenges?${params.toString()}`
      );
      setChallenges(data.challenges);
    } catch (err: any) {
      setError(err.message || 'Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  const fetchChallengeDetail = async (challengeId: string) => {
    try {
      setLoadingDetail(true);
      const data = await apiGet<ChallengeDetail>(`/api/admin/challenges/${challengeId}`);
      setSelectedChallenge(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load challenge details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      setError(null);

      const payload = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        goalValue: Number(formData.goalValue),
        goalUnit: formData.goalUnit,
        startDate: formData.startDate,
        endDate: formData.endDate,
        participantIds: formData.participantIds
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      };

      await apiPost('/api/admin/challenges', payload);
      setShowCreateModal(false);
      resetForm();
      setSuccessMessage('Challenge created successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchChallenges();
    } catch (err: any) {
      setError(err.message || 'Failed to create challenge');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingChallenge) return;

    try {
      setSaving(true);
      setError(null);

      const payload = {
        title: formData.title,
        description: formData.description,
        goalValue: Number(formData.goalValue),
        goalUnit: formData.goalUnit,
        endDate: formData.endDate,
        participantIds: formData.participantIds
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      };

      await apiPut(`/api/admin/challenges/${editingChallenge.id}`, payload);
      setEditingChallenge(null);
      resetForm();
      setSuccessMessage('Challenge updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchChallenges();
    } catch (err: any) {
      setError(err.message || 'Failed to update challenge');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (challengeId: string) => {
    if (!confirm('Are you sure you want to delete this challenge? This will also delete all progress data.')) {
      return;
    }

    try {
      setDeleting(challengeId);
      setError(null);
      await apiDelete(`/api/admin/challenges/${challengeId}`);
      setSuccessMessage('Challenge deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      if (selectedChallenge?.challenge.id === challengeId) {
        setSelectedChallenge(null);
      }
      await fetchChallenges();
    } catch (err: any) {
      setError(err.message || 'Failed to delete challenge');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActive = async (challenge: Challenge) => {
    try {
      setError(null);
      await apiPut(`/api/admin/challenges/${challenge.id}`, { isActive: !challenge.isActive });
      setSuccessMessage(`Challenge ${challenge.isActive ? 'deactivated' : 'activated'} successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchChallenges();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle challenge status');
    }
  };

  const openEditModal = (challenge: Challenge) => {
    setFormData({
      title: challenge.title,
      description: challenge.description,
      type: challenge.type,
      goalValue: String(challenge.goalValue),
      goalUnit: challenge.goalUnit,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      participantIds: challenge.participantIds.join(', '),
    });
    setEditingChallenge(challenge);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'diary',
      goalValue: '',
      goalUnit: 'count',
      startDate: '',
      endDate: '',
      participantIds: '',
    });
  };

  // Stats
  const totalChallenges = challenges.length;
  const activeChallenges = challenges.filter((c) => c.isActive).length;
  const completedChallenges = challenges.filter((c) => !c.isActive).length;
  const totalParticipants = new Set(challenges.flatMap((c) => c.participantIds)).size;

  if (authLoading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Challenges</h1>
          <p className="text-gray-600 mt-1">Manage challenges and monitor participant progress</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Create Challenge
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 text-sm underline mt-1">
            Dismiss
          </button>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-600">{successMessage}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{totalChallenges}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{activeChallenges}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-gray-600">{completedChallenges}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Participants</p>
          <p className="text-2xl font-bold text-blue-600">{totalParticipants}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div>
          <label className="text-sm text-gray-500 mr-2">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-500 mr-2">Type:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">All Types</option>
            {CHALLENGE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.icon} {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Challenge List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading challenges...</div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No challenges found</p>
          <p className="text-sm mt-1">Create your first challenge to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map((challenge) => {
            const typeConfig = getTypeConfig(challenge.type);
            const daysLeft = getDaysRemaining(challenge.endDate);
            const topProgress = challenge.progressSummary?.[0];

            return (
              <div key={challenge.id} className="bg-white rounded-lg shadow-sm border p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{challenge.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.color}`}>
                        {typeConfig.icon} {typeConfig.label}
                      </span>
                      {challenge.isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Ended
                        </span>
                      )}
                    </div>
                    {challenge.description && (
                      <p className="text-sm text-gray-600 mb-2">{challenge.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>
                        Goal: <strong>{challenge.goalValue} {challenge.goalUnit}</strong>
                      </span>
                      <span>
                        {challenge.startDate} - {challenge.endDate}
                      </span>
                      {challenge.isActive && <span>{daysLeft} days remaining</span>}
                      <span>{challenge.participantCount} participants</span>
                      {topProgress && topProgress.currentValue > 0 && (
                        <span>
                          Leader: {topProgress.currentValue}/{challenge.goalValue}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => fetchChallengeDetail(challenge.id)}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => openEditModal(challenge)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(challenge)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        challenge.isActive
                          ? 'text-orange-600 hover:bg-orange-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {challenge.isActive ? 'End' : 'Reactivate'}
                    </button>
                    <button
                      onClick={() => handleDelete(challenge.id)}
                      disabled={deleting === challenge.id}
                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deleting === challenge.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Challenge Detail Panel */}
      {selectedChallenge && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {selectedChallenge.challenge.title} - Leaderboard
            </h2>
            <button
              onClick={() => setSelectedChallenge(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              Close
            </button>
          </div>

          {loadingDetail ? (
            <p className="text-center text-gray-500 py-4">Loading details...</p>
          ) : selectedChallenge.progress.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No progress data yet</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-gray-500">
                  <th className="pb-2 w-16">Rank</th>
                  <th className="pb-2">Participant</th>
                  <th className="pb-2">Progress</th>
                  <th className="pb-2 w-32 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {selectedChallenge.progress.map((p, idx) => {
                  const goal = selectedChallenge.challenge.goalValue;
                  const pct = Math.min(100, (p.currentValue / goal) * 100);
                  return (
                    <tr key={p.userId} className="border-b last:border-0">
                      <td className="py-3 text-lg font-bold text-gray-400">#{p.rank || idx + 1}</td>
                      <td className="py-3">
                        <p className="font-medium text-gray-900">{p.displayName || 'Unknown'}</p>
                        {p.email && <p className="text-xs text-gray-500">{p.email}</p>}
                      </td>
                      <td className="py-3">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 text-right font-mono text-sm">
                        {p.currentValue} / {goal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingChallenge) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingChallenge ? 'Edit Challenge' : 'Create Challenge'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g., 7-Day Voice Note Challenge"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Challenge description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    disabled={!!editingChallenge}
                  >
                    {CHALLENGE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Goal Unit</label>
                  <input
                    type="text"
                    value={formData.goalUnit}
                    onChange={(e) => setFormData({ ...formData, goalUnit: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="count, days, entries..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Goal Value *</label>
                <input
                  type="number"
                  value={formData.goalValue}
                  onChange={(e) => setFormData({ ...formData, goalValue: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g., 7"
                  min="1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    disabled={!!editingChallenge}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Participant User IDs (comma-separated)
                </label>
                <textarea
                  value={formData.participantIds}
                  onChange={(e) => setFormData({ ...formData, participantIds: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={2}
                  placeholder="uid1, uid2, uid3..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingChallenge(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingChallenge ? handleUpdate : handleCreate}
                disabled={saving || !formData.title || !formData.goalValue || !formData.startDate || !formData.endDate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingChallenge ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
