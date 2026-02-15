'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/client';
import { VoiceCategory, DEFAULT_VOICE_CATEGORIES } from '@/lib/models/VoiceCategory';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';
import {
  IoBriefcaseOutline,
  IoFitnessOutline,
  IoRestaurantOutline,
  IoAirplaneOutline,
  IoCartOutline,
  IoPeopleOutline,
  IoChatbubblesOutline,
  IoBulbOutline,
  IoAlarmOutline,
  IoCashOutline,
  IoHomeOutline,
  IoMusicalNotesOutline,
  IoBookOutline,
  IoMicOutline,
  IoHeartOutline,
  IoStarOutline,
  IoCarOutline,
  IoGameControllerOutline,
  IoCameraOutline,
  IoMedkitOutline,
  IoSchoolOutline,
  IoGlobeOutline,
  IoGiftOutline,
  IoCalendarOutline,
  IoFilmOutline,
  IoPawOutline,
  IoLeafOutline,
  IoConstructOutline,
  IoBarbellOutline,
  IoCafeOutline,
} from 'react-icons/io5';
import { IconType } from 'react-icons';

// Ionicons available in React Native (subset for preview)
const AVAILABLE_ICONS = [
  'briefcase-outline',
  'fitness-outline',
  'restaurant-outline',
  'airplane-outline',
  'cart-outline',
  'people-outline',
  'chatbubbles-outline',
  'bulb-outline',
  'alarm-outline',
  'cash-outline',
  'home-outline',
  'musical-notes-outline',
  'book-outline',
  'mic-outline',
  'heart-outline',
  'star-outline',
  'car-outline',
  'game-controller-outline',
  'camera-outline',
  'medkit-outline',
  'school-outline',
  'globe-outline',
  'gift-outline',
  'calendar-outline',
  'film-outline',
  'paw-outline',
  'leaf-outline',
  'construct-outline',
  'barbell-outline',
  'cafe-outline',
];

// Map ionicon names to react-icons components
const iconComponents: Record<string, IconType> = {
  'briefcase-outline': IoBriefcaseOutline,
  'fitness-outline': IoFitnessOutline,
  'restaurant-outline': IoRestaurantOutline,
  'airplane-outline': IoAirplaneOutline,
  'cart-outline': IoCartOutline,
  'people-outline': IoPeopleOutline,
  'chatbubbles-outline': IoChatbubblesOutline,
  'bulb-outline': IoBulbOutline,
  'alarm-outline': IoAlarmOutline,
  'cash-outline': IoCashOutline,
  'home-outline': IoHomeOutline,
  'musical-notes-outline': IoMusicalNotesOutline,
  'book-outline': IoBookOutline,
  'mic-outline': IoMicOutline,
  'heart-outline': IoHeartOutline,
  'star-outline': IoStarOutline,
  'car-outline': IoCarOutline,
  'game-controller-outline': IoGameControllerOutline,
  'camera-outline': IoCameraOutline,
  'medkit-outline': IoMedkitOutline,
  'school-outline': IoSchoolOutline,
  'globe-outline': IoGlobeOutline,
  'gift-outline': IoGiftOutline,
  'calendar-outline': IoCalendarOutline,
  'film-outline': IoFilmOutline,
  'paw-outline': IoPawOutline,
  'leaf-outline': IoLeafOutline,
  'construct-outline': IoConstructOutline,
  'barbell-outline': IoBarbellOutline,
  'cafe-outline': IoCafeOutline,
};

// Render icon component
const renderIcon = (iconName: string, size: number = 18, color?: string) => {
  const IconComponent = iconComponents[iconName] || IoMicOutline;
  return <IconComponent size={size} color={color} />;
};

/**
 * Admin Voice Categories Page
 * Configure voice note topic categories for automatic classification
 */
export default function AdminVoiceCategoriesPage() {
  // Track page view
  useTrackPage(TRACKED_SCREENS.adminVoiceCategories);

  const [categories, setCategories] = useState<VoiceCategory[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<VoiceCategory>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState<Partial<VoiceCategory>>({
    key: '',
    iconName: 'star-outline',
    color: '#6B7280',
    displayOrder: 50,
    enabled: true,
    keywords: [],
  });
  const [newKeywords, setNewKeywords] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<{ categories: VoiceCategory[]; isDefault: boolean }>(
        '/api/admin/voice-categories'
      );
      setCategories(data.categories);
      setIsDefault(data.isDefault);
    } catch (err: unknown) {
      console.error('Failed to fetch voice categories:', err);
      const message = err instanceof Error ? err.message : 'Failed to load voice categories';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const initializeCategories = async () => {
    try {
      setSaving(true);
      setError(null);
      const data = await apiPost<{ categories: VoiceCategory[] }>(
        '/api/admin/voice-categories',
        { initialize: true }
      );
      setCategories(data.categories);
      setIsDefault(false);
      setSuccessMessage('Voice categories initialized successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to initialize categories';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (category: VoiceCategory) => {
    setEditingKey(category.key);
    setEditForm({
      iconName: category.iconName,
      color: category.color,
      displayOrder: category.displayOrder,
      enabled: category.enabled,
      keywords: category.keywords,
    });
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setEditForm({});
  };

  const saveCategory = async () => {
    if (!editingKey) return;

    try {
      setSaving(true);
      setError(null);
      const data = await apiPatch<{ category: VoiceCategory }>(
        '/api/admin/voice-categories',
        { key: editingKey, updates: editForm }
      );

      setCategories((prev) =>
        prev.map((c) => (c.key === editingKey ? data.category : c))
      );
      setEditingKey(null);
      setEditForm({});
      setSuccessMessage('Category updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update category';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (category: VoiceCategory) => {
    try {
      setSaving(true);
      const data = await apiPatch<{ category: VoiceCategory }>(
        '/api/admin/voice-categories',
        { key: category.key, updates: { enabled: !category.enabled } }
      );
      setCategories((prev) =>
        prev.map((c) => (c.key === category.key ? data.category : c))
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to toggle category';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (key: string) => {
    if (!confirm(`Are you sure you want to delete the "${key}" category?`)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await apiDelete('/api/admin/voice-categories', { key });
      setCategories((prev) => prev.filter((c) => c.key !== key));
      setSuccessMessage('Category deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete category';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async () => {
    if (!newCategory.key || !newCategory.iconName) {
      setError('Key and icon are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Parse keywords from comma-separated string
      const keywords = newKeywords
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length > 0);

      const data = await apiPost<{ category: VoiceCategory }>(
        '/api/admin/voice-categories',
        {
          category: {
            ...newCategory,
            keywords,
          },
        }
      );

      setCategories((prev) => [...prev, data.category].sort((a, b) => a.displayOrder - b.displayOrder));
      setShowAddForm(false);
      setNewCategory({
        key: '',
        iconName: 'star-outline',
        color: '#6B7280',
        displayOrder: 50,
        enabled: true,
        keywords: [],
      });
      setNewKeywords('');
      setSuccessMessage('Category added successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add category';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading voice categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Voice Note Categories</h1>
          <p className="mt-2 text-gray-600">
            Configure categories for automatic voice note topic classification
          </p>
        </div>
        {!isDefault && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Add Category
          </button>
        )}
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-600">{successMessage}</p>
        </div>
      )}

      {/* Initialize Button (only if default) */}
      {isDefault && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Categories Not Initialized
          </h3>
          <p className="text-yellow-700 mb-4">
            Voice categories have not been saved to Firestore yet. Click the button below
            to initialize with default categories.
          </p>
          <button
            onClick={initializeCategories}
            disabled={saving}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
          >
            {saving ? 'Initializing...' : 'Initialize Categories'}
          </button>
        </div>
      )}

      {/* Add Category Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newCategory.key || ''}
                onChange={(e) => setNewCategory({ ...newCategory, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="e.g., sports"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Icon <span className="text-red-500">*</span>
              </label>
              <select
                value={newCategory.iconName || 'star-outline'}
                onChange={(e) => setNewCategory({ ...newCategory, iconName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {AVAILABLE_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-gray-500">Preview:</span>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${newCategory.color}33` }}
                >
                  {renderIcon(newCategory.iconName || 'star-outline', 18, newCategory.color)}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={newCategory.color || '#6B7280'}
                  onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                  className="w-12 h-10 border border-gray-300 rounded-md cursor-pointer"
                />
                <input
                  type="text"
                  value={newCategory.color || '#6B7280'}
                  onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number"
                value={newCategory.displayOrder || 50}
                onChange={(e) => setNewCategory({ ...newCategory, displayOrder: parseInt(e.target.value) || 50 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
                placeholder="e.g., game, match, team, score"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={addCategory}
              disabled={saving || !newCategory.key}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Category'}
            </button>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Preview
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Key
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Icon
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Keywords
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Enabled
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map((category) => (
              <tr key={category.key} className={!category.enabled ? 'bg-gray-50' : ''}>
                {editingKey === category.key ? (
                  // Edit mode
                  <>
                    <td className="px-6 py-4">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${editForm.color || category.color}33` }}
                      >
                        {renderIcon(editForm.iconName || category.iconName, 18, editForm.color || category.color)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {category.key}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={editForm.iconName || category.iconName}
                        onChange={(e) => setEditForm({ ...editForm, iconName: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                      >
                        {AVAILABLE_ICONS.map((icon) => (
                          <option key={icon} value={icon}>
                            {icon}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={editForm.displayOrder ?? category.displayOrder}
                        onChange={(e) => setEditForm({ ...editForm, displayOrder: parseInt(e.target.value) || 0 })}
                        className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={(editForm.keywords || category.keywords).join(', ')}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            keywords: e.target.value.split(',').map((k) => k.trim().toLowerCase()).filter((k) => k),
                          })
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={editForm.enabled ?? category.enabled}
                        onChange={(e) => setEditForm({ ...editForm, enabled: e.target.checked })}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={cancelEditing}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveCategory}
                        disabled={saving}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                      >
                        Save
                      </button>
                    </td>
                  </>
                ) : (
                  // View mode
                  <>
                    <td className="px-6 py-4">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${category.color}33` }}
                      >
                        {renderIcon(category.iconName, 18, category.color)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {category.key}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {category.iconName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {category.displayOrder}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs truncate" title={category.keywords.join(', ')}>
                        {category.keywords.length > 0
                          ? category.keywords.slice(0, 5).join(', ') +
                            (category.keywords.length > 5 ? '...' : '')
                          : <span className="text-gray-400 italic">No keywords</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleEnabled(category)}
                        disabled={saving || category.key === 'other'}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          category.enabled ? 'bg-green-600' : 'bg-gray-300'
                        } ${category.key === 'other' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            category.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => startEditing(category)}
                        disabled={isDefault}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      {category.key !== 'other' && (
                        <button
                          onClick={() => deleteCategory(category.key)}
                          disabled={isDefault || saving}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">How Voice Note Classification Works</h3>
        <ul className="text-blue-700 space-y-2 list-disc list-inside">
          <li>
            When a voice note is created, the transcription is analyzed by GPT-4o-mini
          </li>
          <li>
            The AI uses the <strong>keywords</strong> and category context to classify the note
          </li>
          <li>
            Classification happens automatically in Cloud Functions after transcription
          </li>
          <li>
            The category icon badge appears on voice notes in the mobile app feed
          </li>
          <li>
            <strong>Display Order</strong> affects both UI order and classification priority
          </li>
          <li>
            The <strong>other</strong> category is the fallback and cannot be deleted
          </li>
        </ul>
      </div>
    </div>
  );
}
