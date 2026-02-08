'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPut, apiPost, apiDelete, apiPatch } from '@/lib/api/client';
import {
  CategoryConfig,
  CATEGORY_METADATA,
  UnifiedCategory,
  validateCategoryConfig,
} from '@/lib/models/CategoryConfig';

interface CategoriesTabProps {
  onSaving?: (saving: boolean) => void;
}

interface CategoriesResponse {
  success: boolean;
  data: {
    version: string;
    lastUpdatedAt: string;
    lastUpdatedBy: string;
    categories: CategoryConfig[];
    totalCount: number;
    enabledCount: number;
  };
}

/**
 * Categories Tab - Manage Life Feed category configuration
 * Allows admins to:
 * - Enable/disable categories
 * - Edit category metadata (icon, color, name)
 * - Modify match patterns for auto-categorization
 * - Adjust priority ordering
 * - Create custom categories
 */
export default function CategoriesTab({ onSaving }: CategoriesTabProps) {
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryConfig | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [metadata, setMetadata] = useState<{
    version: string;
    lastUpdatedAt: string;
    lastUpdatedBy: string;
  } | null>(null);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiGet<CategoriesResponse>('/api/admin/insights/categories');
      if (result.success && result.data) {
        setCategories(result.data.categories);
        setMetadata({
          version: result.data.version,
          lastUpdatedAt: result.data.lastUpdatedAt,
          lastUpdatedBy: result.data.lastUpdatedBy,
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    onSaving?.(saving);
  }, [saving, onSaving]);

  // Toggle category enabled
  const handleToggle = async (categoryId: string, enabled: boolean) => {
    try {
      setSaving(true);
      await apiPatch('/api/admin/insights/categories', {
        action: 'toggle',
        categoryId,
        enabled,
      });
      await fetchCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle category');
    } finally {
      setSaving(false);
    }
  };

  // Update category
  const handleUpdate = async (categoryId: string, updates: Partial<CategoryConfig>) => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/categories', {
        categoryId,
        updates,
      });
      await fetchCategories();
      setEditingCategory(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update category');
    } finally {
      setSaving(false);
    }
  };

  // Create category
  const handleCreate = async (category: Partial<CategoryConfig>) => {
    try {
      setSaving(true);
      await apiPost('/api/admin/insights/categories', { category });
      await fetchCategories();
      setShowCreateModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  // Delete category
  const handleDelete = async (categoryId: string) => {
    if (!confirm(`Are you sure you want to delete category "${categoryId}"?`)) return;

    try {
      setSaving(true);
      await apiDelete(`/api/admin/insights/categories?categoryId=${categoryId}`);
      await fetchCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
    } finally {
      setSaving(false);
    }
  };

  // Reset category to defaults
  const handleReset = async (categoryId: string) => {
    if (!confirm(`Reset "${categoryId}" to default settings?`)) return;

    try {
      setSaving(true);
      await apiPatch('/api/admin/insights/categories', {
        action: 'reset',
        categoryId,
      });
      await fetchCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to reset category');
    } finally {
      setSaving(false);
    }
  };

  // Seed defaults
  const handleSeedDefaults = async () => {
    try {
      setSaving(true);
      const result = await apiPatch<{ created: boolean }>('/api/admin/insights/categories', {
        action: 'seed',
      });
      if (result.created) {
        alert('Default categories have been seeded!');
      } else {
        alert('Categories already exist.');
      }
      await fetchCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to seed categories');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchCategories}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const enabledCount = categories.filter((c) => c.enabled).length;
  const customCount = categories.filter((c) => !c.isPreset).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Category Management</h2>
          <p className="text-sm text-gray-600">
            Configure the 12 unified categories used for Life Feed posts and Life Keywords
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedDefaults}
            disabled={saving}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Seed Defaults
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={saving}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            + Add Category
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{categories.length}</div>
          <div className="text-sm text-gray-600">Total Categories</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{enabledCount}</div>
          <div className="text-sm text-gray-600">Enabled</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{categories.length - customCount}</div>
          <div className="text-sm text-gray-600">Preset</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">{customCount}</div>
          <div className="text-sm text-gray-600">Custom</div>
        </div>
      </div>

      {/* Version info */}
      {metadata && (
        <div className="text-xs text-gray-500">
          Version {metadata.version} | Last updated {new Date(metadata.lastUpdatedAt).toLocaleString()} by {metadata.lastUpdatedBy}
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onToggle={(enabled) => handleToggle(category.id, enabled)}
            onEdit={() => setEditingCategory(category)}
            onReset={() => handleReset(category.id)}
            onDelete={() => handleDelete(category.id)}
            saving={saving}
          />
        ))}
      </div>

      {/* Edit Modal */}
      {editingCategory && (
        <CategoryEditModal
          category={editingCategory}
          onSave={(updates) => handleUpdate(editingCategory.id, updates)}
          onClose={() => setEditingCategory(null)}
          saving={saving}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CategoryCreateModal
          onSave={handleCreate}
          onClose={() => setShowCreateModal(false)}
          saving={saving}
        />
      )}
    </div>
  );
}

// ============================================================================
// Category Card Component
// ============================================================================

interface CategoryCardProps {
  category: CategoryConfig;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onReset: () => void;
  onDelete: () => void;
  saving: boolean;
}

function CategoryCard({ category, onToggle, onEdit, onReset, onDelete, saving }: CategoryCardProps) {
  return (
    <div
      className={`bg-white rounded-lg border-2 p-4 transition-all ${
        category.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'
      }`}
      style={{ borderLeftColor: category.enabled ? category.color : undefined, borderLeftWidth: category.enabled ? 4 : undefined }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{category.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{category.displayName}</h3>
            <p className="text-xs text-gray-500">{category.id}</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={category.enabled}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={saving}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
        </label>
      </div>

      {/* Metadata */}
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Priority:</span>
          <span className="font-medium">{category.priority}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Patterns:</span>
          <span className="font-medium">{category.matchPatterns.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Color:</span>
          <span
            className="w-4 h-4 rounded-full border border-gray-300"
            style={{ backgroundColor: category.color }}
          ></span>
          <span className="text-xs text-gray-400">{category.color}</span>
        </div>
        {category.isPreset && (
          <span className="inline-flex px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
            Preset
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
        <button
          onClick={onEdit}
          disabled={saving}
          className="flex-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
        >
          Edit
        </button>
        {category.isPreset && (
          <button
            onClick={onReset}
            disabled={saving}
            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Reset
          </button>
        )}
        {!category.isPreset && (
          <button
            onClick={onDelete}
            disabled={saving}
            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Category Edit Modal
// ============================================================================

interface CategoryEditModalProps {
  category: CategoryConfig;
  onSave: (updates: Partial<CategoryConfig>) => void;
  onClose: () => void;
  saving: boolean;
}

function CategoryEditModal({ category, onSave, onClose, saving }: CategoryEditModalProps) {
  const [formData, setFormData] = useState({
    displayName: category.displayName,
    icon: category.icon,
    color: category.color,
    priority: category.priority,
    matchPatterns: category.matchPatterns.join('\n'),
    relatedPostTypes: category.relatedPostTypes.join(', '),
  });
  const [errors, setErrors] = useState<string[]>([]);

  const handleSave = () => {
    const updates: Partial<CategoryConfig> = {
      displayName: formData.displayName,
      icon: formData.icon,
      color: formData.color,
      priority: formData.priority,
      matchPatterns: formData.matchPatterns.split('\n').filter((p) => p.trim()),
      relatedPostTypes: formData.relatedPostTypes.split(',').map((t) => t.trim()).filter(Boolean),
    };

    const validationErrors = validateCategoryConfig({ ...category, ...updates });
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    onSave(updates);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">
            Edit Category: {category.icon} {category.displayName}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <ul className="text-sm text-red-600 list-disc list-inside">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Icon & Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon (Emoji)</label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                maxLength={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="#4CAF50"
                />
              </div>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority (0-100, higher = matched first)
            </label>
            <input
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              min={0}
              max={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Match Patterns */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Match Patterns (one regex per line)
            </label>
            <textarea
              value={formData.matchPatterns}
              onChange={(e) => setFormData({ ...formData, matchPatterns: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-sm"
              placeholder="gym|workout|exercise&#10;yoga|meditation|mindfulness"
            />
            <p className="text-xs text-gray-500 mt-1">
              Patterns are matched against activity text (case-insensitive).
            </p>
          </div>

          {/* Related Post Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Related Post Types (comma-separated)
            </label>
            <input
              type="text"
              value={formData.relatedPostTypes}
              onChange={(e) => setFormData({ ...formData, relatedPostTypes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="health_alert, streak_achievement"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Category Create Modal
// ============================================================================

interface CategoryCreateModalProps {
  onSave: (category: Partial<CategoryConfig>) => void;
  onClose: () => void;
  saving: boolean;
}

function CategoryCreateModal({ onSave, onClose, saving }: CategoryCreateModalProps) {
  const [formData, setFormData] = useState({
    id: '',
    displayName: '',
    icon: '📌',
    color: '#9E9E9E',
    priority: 40,
    matchPatterns: '',
    relatedPostTypes: '',
  });
  const [errors, setErrors] = useState<string[]>([]);

  const handleSave = () => {
    const category: Partial<CategoryConfig> = {
      id: formData.id || formData.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      displayName: formData.displayName,
      icon: formData.icon,
      color: formData.color,
      priority: formData.priority,
      matchPatterns: formData.matchPatterns.split('\n').filter((p) => p.trim()),
      relatedPostTypes: formData.relatedPostTypes.split(',').map((t) => t.trim()).filter(Boolean),
    };

    const validationErrors = validateCategoryConfig(category);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    onSave(category);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Create New Category</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <ul className="text-sm text-red-600 list-disc list-inside">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ID (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID (optional, auto-generated from name)
            </label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="custom_category"
            />
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Custom Category"
              required
            />
          </div>

          {/* Icon & Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon (Emoji) *</label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                maxLength={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color *</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority (0-100, higher = matched first)
            </label>
            <input
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              min={0}
              max={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Match Patterns */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Match Patterns (one regex per line)
            </label>
            <textarea
              value={formData.matchPatterns}
              onChange={(e) => setFormData({ ...formData, matchPatterns: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-sm"
              placeholder="keyword1|keyword2|keyword3"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !formData.displayName}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Category'}
          </button>
        </div>
      </div>
    </div>
  );
}
