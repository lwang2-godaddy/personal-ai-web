'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch } from '@/lib/api/client';

/**
 * Model pricing configuration
 */
interface ModelPricing {
  name: string;
  inputPer1M: number;
  outputPer1M: number;
  enabled: boolean;
}

/**
 * Full pricing configuration
 */
interface PricingConfig {
  version: number;
  enableDynamicConfig: boolean;
  lastUpdated: string;
  updatedBy: string;
  changeNotes?: string;
  models: Record<string, ModelPricing>;
}

interface EditingModel {
  id: string;
  pricing: ModelPricing;
}

interface NewModel {
  id: string;
  name: string;
  inputPer1M: string;
  outputPer1M: string;
}

/**
 * Admin Pricing Configuration Page
 * Configure model pricing for cost estimation
 */
export default function AdminPricingPage() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingModel, setEditingModel] = useState<EditingModel | null>(null);
  const [changeNotes, setChangeNotes] = useState('');
  const [showAddModel, setShowAddModel] = useState(false);
  const [newModel, setNewModel] = useState<NewModel>({ id: '', name: '', inputPer1M: '', outputPer1M: '' });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<{ config: PricingConfig; isDefault: boolean }>(
        '/api/admin/pricing'
      );
      setConfig(data.config);
      setIsDefault(data.isDefault);
    } catch (err: any) {
      console.error('Failed to fetch pricing config:', err);
      setError(err.message || 'Failed to load pricing configuration');
    } finally {
      setLoading(false);
    }
  };

  const initializeConfig = async () => {
    try {
      setSaving(true);
      setError(null);
      const data = await apiPost<{ config: PricingConfig }>(
        '/api/admin/pricing',
        {}
      );
      setConfig(data.config);
      setIsDefault(false);
      setSuccessMessage('Configuration initialized successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize configuration');
    } finally {
      setSaving(false);
    }
  };

  const saveModelChanges = async () => {
    if (!editingModel || !config) return;

    try {
      setSaving(true);
      setError(null);

      const data = await apiPatch<{ config: PricingConfig }>(
        '/api/admin/pricing',
        {
          models: { [editingModel.id]: editingModel.pricing },
          changeNotes: changeNotes || `Updated ${editingModel.pricing.name} pricing`,
        }
      );

      setConfig(data.config);
      setEditingModel(null);
      setChangeNotes('');
      setSuccessMessage(`${editingModel.pricing.name} pricing updated successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const addNewModel = async () => {
    if (!config || !newModel.id || !newModel.name) return;

    const inputPrice = parseFloat(newModel.inputPer1M);
    const outputPrice = parseFloat(newModel.outputPer1M);

    if (isNaN(inputPrice) || isNaN(outputPrice) || inputPrice < 0 || outputPrice < 0) {
      setError('Please enter valid prices (must be >= 0)');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const data = await apiPatch<{ config: PricingConfig }>(
        '/api/admin/pricing',
        {
          addModel: {
            id: newModel.id.toLowerCase().replace(/\s+/g, '-'),
            pricing: {
              name: newModel.name,
              inputPer1M: inputPrice,
              outputPer1M: outputPrice,
              enabled: true,
            },
          },
          changeNotes: changeNotes || `Added new model: ${newModel.name}`,
        }
      );

      setConfig(data.config);
      setShowAddModel(false);
      setNewModel({ id: '', name: '', inputPer1M: '', outputPer1M: '' });
      setChangeNotes('');
      setSuccessMessage(`${newModel.name} added successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add model');
    } finally {
      setSaving(false);
    }
  };

  const removeModel = async (modelId: string, modelName: string) => {
    if (!confirm(`Are you sure you want to remove ${modelName}?`)) return;

    try {
      setSaving(true);
      setError(null);

      const data = await apiPatch<{ config: PricingConfig }>(
        '/api/admin/pricing',
        {
          removeModel: modelId,
          changeNotes: `Removed model: ${modelName}`,
        }
      );

      setConfig(data.config);
      setSuccessMessage(`${modelName} removed successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to remove model');
    } finally {
      setSaving(false);
    }
  };

  const toggleDynamicConfig = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);

      const data = await apiPatch<{ config: PricingConfig }>(
        '/api/admin/pricing',
        {
          enableDynamicConfig: !config.enableDynamicConfig,
          changeNotes: config.enableDynamicConfig
            ? 'Disabled dynamic pricing (using hardcoded defaults)'
            : 'Enabled dynamic pricing',
        }
      );

      setConfig(data.config);
      setSuccessMessage(
        data.config.enableDynamicConfig
          ? 'Dynamic pricing enabled!'
          : 'Dynamic pricing disabled - Cloud Functions using hardcoded defaults'
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle dynamic config');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (modelId: string) => {
    if (!config) return;
    setEditingModel({
      id: modelId,
      pricing: { ...config.models[modelId] },
    });
    setChangeNotes('');
  };

  const updateEditingPricing = (field: keyof ModelPricing, value: string | number | boolean) => {
    if (!editingModel) return;
    setEditingModel({
      ...editingModel,
      pricing: { ...editingModel.pricing, [field]: value },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pricing configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Model Pricing</h1>
          <p className="mt-2 text-gray-600">
            Configure pricing rates for cost estimation in usage analytics
          </p>
        </div>
        {config && !isDefault && (
          <div className="text-sm text-gray-500">
            Version {config.version} | Last updated: {new Date(config.lastUpdated).toLocaleDateString()}
          </div>
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
            Configuration Not Initialized
          </h3>
          <p className="text-yellow-700 mb-4">
            The pricing configuration has not been saved to Firestore yet.
            Click the button below to initialize with OpenAI default values.
          </p>
          <button
            onClick={initializeConfig}
            disabled={saving}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
          >
            {saving ? 'Initializing...' : 'Initialize Configuration'}
          </button>
        </div>
      )}

      {/* Dynamic Config Toggle */}
      {config && !isDefault && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Dynamic Pricing</h3>
              <p className="text-sm text-gray-600 mt-1">
                {config.enableDynamicConfig
                  ? 'Cloud Functions are using pricing configured here'
                  : 'Cloud Functions are using hardcoded defaults (kill switch active)'}
              </p>
            </div>
            <button
              onClick={toggleDynamicConfig}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.enableDynamicConfig ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.enableDynamicConfig ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Pricing Info Panel */}
      {config && !isDefault && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">How Pricing Works</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>Prices are per 1 million tokens (input and output separately)</li>
            <li>Cloud Functions calculate: (tokens / 1,000,000) x price</li>
            <li>Cost is stored in <code className="bg-blue-100 px-1 rounded">promptExecutions.estimatedCostUSD</code></li>
            <li>Unknown models fall back to gpt-4o-mini pricing</li>
          </ul>
        </div>
      )}

      {/* Model Cards */}
      {config && !isDefault && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Model Pricing Rates</h2>
            <button
              onClick={() => setShowAddModel(true)}
              disabled={showAddModel}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              + Add Model
            </button>
          </div>

          {/* Add Model Form */}
          {showAddModel && (
            <div className="bg-white rounded-lg shadow-md p-6 border-2 border-dashed border-gray-300">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Model</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model ID</label>
                  <input
                    type="text"
                    value={newModel.id}
                    onChange={(e) => setNewModel({ ...newModel, id: e.target.value })}
                    placeholder="e.g., gpt-4o-audio"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={newModel.name}
                    onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                    placeholder="e.g., GPT-4o Audio"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Input Price (per 1M tokens)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newModel.inputPer1M}
                    onChange={(e) => setNewModel({ ...newModel, inputPer1M: e.target.value })}
                    placeholder="e.g., 2.50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Output Price (per 1M tokens)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newModel.outputPer1M}
                    onChange={(e) => setNewModel({ ...newModel, outputPer1M: e.target.value })}
                    placeholder="e.g., 10.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Change Notes</label>
                <input
                  type="text"
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                  placeholder="Describe why you're adding this model..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={addNewModel}
                  disabled={saving || !newModel.id || !newModel.name}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Model'}
                </button>
                <button
                  onClick={() => {
                    setShowAddModel(false);
                    setNewModel({ id: '', name: '', inputPer1M: '', outputPer1M: '' });
                    setChangeNotes('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Model Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(config.models).map(([modelId, pricing]) => (
              <ModelCard
                key={modelId}
                modelId={modelId}
                pricing={pricing}
                isEditing={editingModel?.id === modelId}
                editingPricing={editingModel?.id === modelId ? editingModel.pricing : null}
                onEdit={() => startEditing(modelId)}
                onCancel={() => setEditingModel(null)}
                onSave={saveModelChanges}
                onRemove={() => removeModel(modelId, pricing.name)}
                onUpdatePricing={updateEditingPricing}
                saving={saving}
                changeNotes={changeNotes}
                onChangeNotesUpdate={setChangeNotes}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Model Card Component
interface ModelCardProps {
  modelId: string;
  pricing: ModelPricing;
  isEditing: boolean;
  editingPricing: ModelPricing | null;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onRemove: () => void;
  onUpdatePricing: (field: keyof ModelPricing, value: string | number | boolean) => void;
  saving: boolean;
  changeNotes: string;
  onChangeNotesUpdate: (notes: string) => void;
}

function ModelCard({
  modelId,
  pricing,
  isEditing,
  editingPricing,
  onEdit,
  onCancel,
  onSave,
  onRemove,
  onUpdatePricing,
  saving,
  changeNotes,
  onChangeNotesUpdate,
}: ModelCardProps) {
  const displayPricing = editingPricing || pricing;

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${displayPricing.enabled ? 'border-green-500' : 'border-gray-300'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          {isEditing ? (
            <input
              type="text"
              value={displayPricing.name}
              onChange={(e) => onUpdatePricing('name', e.target.value)}
              className="text-lg font-bold text-gray-900 border border-gray-300 rounded px-2 py-1"
            />
          ) : (
            <h3 className="text-lg font-bold text-gray-900">{displayPricing.name}</h3>
          )}
          <p className="text-sm text-gray-500 font-mono">{modelId}</p>
        </div>
        {!isEditing ? (
          <button
            onClick={onEdit}
            className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Pricing Fields */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Input (per 1M tokens)</span>
          {isEditing ? (
            <input
              type="number"
              step="0.01"
              value={displayPricing.inputPer1M}
              onChange={(e) => onUpdatePricing('inputPer1M', parseFloat(e.target.value) || 0)}
              className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
            />
          ) : (
            <span className="font-semibold text-gray-900">${displayPricing.inputPer1M.toFixed(2)}</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Output (per 1M tokens)</span>
          {isEditing ? (
            <input
              type="number"
              step="0.01"
              value={displayPricing.outputPer1M}
              onChange={(e) => onUpdatePricing('outputPer1M', parseFloat(e.target.value) || 0)}
              className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
            />
          ) : (
            <span className="font-semibold text-gray-900">${displayPricing.outputPer1M.toFixed(2)}</span>
          )}
        </div>

        <hr className="my-2" />

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Enabled</span>
          {isEditing ? (
            <button
              onClick={() => onUpdatePricing('enabled', !displayPricing.enabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                displayPricing.enabled ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  displayPricing.enabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          ) : (
            <span className={displayPricing.enabled ? 'text-green-600 font-medium' : 'text-gray-400'}>
              {displayPricing.enabled ? 'Yes' : 'No'}
            </span>
          )}
        </div>
      </div>

      {/* Change Notes (only when editing) */}
      {isEditing && (
        <div className="mt-4">
          <label className="block text-sm text-gray-600 mb-1">Change Notes</label>
          <input
            type="text"
            value={changeNotes}
            onChange={(e) => onChangeNotesUpdate(e.target.value)}
            placeholder="Describe your changes..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
      )}

      {/* Remove Button (only when editing) */}
      {isEditing && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={onRemove}
            disabled={saving}
            className="w-full px-3 py-2 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 disabled:opacity-50"
          >
            Remove Model
          </button>
        </div>
      )}
    </div>
  );
}
