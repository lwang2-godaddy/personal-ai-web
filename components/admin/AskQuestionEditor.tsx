'use client';

import { useState, useEffect } from 'react';
import {
  AskQuestion,
  AskCategory,
  UserDataState,
  ASK_CATEGORIES,
  USER_DATA_STATES,
  DataRequirements,
} from '@/lib/models/AskQuestion';
import EmojiPicker from './EmojiPicker';
import {
  QUESTION_TEMPLATES,
  TEMPLATE_CATEGORIES,
  QuestionTemplate,
  getTemplatesByCategory,
} from '@/lib/data/questionTemplates';

interface AskQuestionEditorProps {
  question?: AskQuestion | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: Partial<AskQuestion>) => Promise<void>;
  mode: 'create' | 'edit';
}

export default function AskQuestionEditor({
  question,
  isOpen,
  onClose,
  onSave,
  mode,
}: AskQuestionEditorProps) {
  const [formData, setFormData] = useState<Partial<AskQuestion>>({
    icon: '❓',
    labelKey: '',
    queryTemplate: '',
    category: 'general',
    priority: 50,
    enabled: true,
    userDataStates: ['RICH_DATA'],
    variables: [],
    order: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [variablesInput, setVariablesInput] = useState('');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templateCategory, setTemplateCategory] = useState('activity');

  // Data requirements
  const [requiresData, setRequiresData] = useState<DataRequirements>({});
  const [healthTypesInput, setHealthTypesInput] = useState('');

  useEffect(() => {
    if (question && mode === 'edit') {
      setFormData({
        icon: question.icon,
        labelKey: question.labelKey,
        queryTemplate: question.queryTemplate,
        category: question.category,
        priority: question.priority,
        enabled: question.enabled,
        userDataStates: question.userDataStates || ['RICH_DATA'],
        variables: question.variables || [],
        order: question.order || 0,
      });
      setVariablesInput(question.variables?.join(', ') || '');
      setRequiresData(question.requiresData || {});
      setHealthTypesInput(question.requiresData?.healthTypes?.join(', ') || '');
    } else if (mode === 'create') {
      setFormData({
        icon: '❓',
        labelKey: '',
        queryTemplate: '',
        category: 'general',
        priority: 50,
        enabled: true,
        userDataStates: ['RICH_DATA'],
        variables: [],
        order: 0,
      });
      setVariablesInput('');
      setRequiresData({});
      setHealthTypesInput('');
    }
    setError(null);
    setShowTemplatePicker(false);
  }, [question, mode, isOpen]);

  const handleApplyTemplate = (template: QuestionTemplate) => {
    const { data } = template;
    setFormData({
      icon: data.icon,
      labelKey: data.labelKey,
      queryTemplate: data.queryTemplate,
      category: data.category,
      priority: data.priority,
      enabled: true,
      userDataStates: data.userDataStates,
      variables: data.variables || [],
      order: 0,
    });
    setVariablesInput(data.variables?.join(', ') || '');
    setRequiresData(data.requiresData || {});
    setHealthTypesInput(data.requiresData?.healthTypes?.join(', ') || '');
    setShowTemplatePicker(false);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.labelKey?.trim()) {
      setError('Label is required');
      return;
    }
    if (!formData.queryTemplate?.trim()) {
      setError('Query template is required');
      return;
    }
    if (!formData.icon?.trim()) {
      setError('Icon is required');
      return;
    }
    if (!formData.userDataStates?.length) {
      setError('At least one user data state must be selected');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Parse variables from input
      const variables = variablesInput
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      // Parse health types from input
      const healthTypes = healthTypesInput
        .split(',')
        .map((h) => h.trim())
        .filter((h) => h.length > 0);

      // Build requires data object
      const finalRequiresData: DataRequirements = {};
      if (requiresData.hasLocationData) finalRequiresData.hasLocationData = true;
      if (requiresData.hasHealthData) finalRequiresData.hasHealthData = true;
      if (requiresData.hasVoiceNotes) finalRequiresData.hasVoiceNotes = true;
      if (requiresData.hasPhotoMemories) finalRequiresData.hasPhotoMemories = true;
      if (requiresData.minActivityCount && requiresData.minActivityCount > 0) {
        finalRequiresData.minActivityCount = requiresData.minActivityCount;
      }
      if (healthTypes.length > 0) {
        finalRequiresData.healthTypes = healthTypes;
      }

      const questionData: Partial<AskQuestion> = {
        ...formData,
        variables: variables.length > 0 ? variables : undefined,
        requiresData: Object.keys(finalRequiresData).length > 0 ? finalRequiresData : undefined,
      };

      await onSave(questionData);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save question';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleUserDataStateToggle = (state: UserDataState) => {
    const current = formData.userDataStates || [];
    if (current.includes(state)) {
      setFormData({
        ...formData,
        userDataStates: current.filter((s) => s !== state),
      });
    } else {
      setFormData({
        ...formData,
        userDataStates: [...current, state],
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Create New Question' : 'Edit Question'}
          </h2>
          {mode === 'create' && (
            <button
              type="button"
              onClick={() => setShowTemplatePicker(!showTemplatePicker)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                showTemplatePicker
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {showTemplatePicker ? 'Hide Templates' : 'Use Template'}
            </button>
          )}
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-6">
          {/* Template Picker */}
          {showTemplatePicker && mode === 'create' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-900 mb-3">
                Choose a Template
              </h3>
              {/* Category tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {TEMPLATE_CATEGORIES.filter(cat => cat.id !== 'recent').map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setTemplateCategory(cat.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      templateCategory === cat.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
              {/* Template grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {getTemplatesByCategory(templateCategory).map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleApplyTemplate(template)}
                    className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-400 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{template.data.icon}</span>
                      <span className="font-medium text-sm text-gray-900">
                        {template.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-purple-700 mt-3">
                Selecting a template will pre-fill the form. You can still customize it.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Icon and Label Row */}
          <div className="flex gap-4">
            {/* Icon Picker */}
            <div className="w-24">
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-full h-12 flex items-center justify-center text-2xl border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {formData.icon}
                </button>
                <EmojiPicker
                  isOpen={showEmojiPicker}
                  onClose={() => setShowEmojiPicker(false)}
                  onSelect={(emoji) => setFormData({ ...formData, icon: emoji })}
                  selectedEmoji={formData.icon}
                />
              </div>
            </div>

            {/* Label Key */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.labelKey}
                onChange={(e) => setFormData({ ...formData, labelKey: e.target.value })}
                placeholder="e.g., My step counts"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Supports variables: {'{{activity}}'}, {'{{healthType}}'}
              </p>
            </div>
          </div>

          {/* Query Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Query Template <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.queryTemplate}
              onChange={(e) => setFormData({ ...formData, queryTemplate: e.target.value })}
              placeholder="e.g., What were my step counts this week?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 h-24"
            />
            <p className="text-xs text-gray-500 mt-1">
              The actual query sent to the AI when user taps this question
            </p>
          </div>

          {/* Category and Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as AskCategory })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              >
                {ASK_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: parseInt(e.target.value) || 50 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              />
              <p className="text-xs text-gray-500 mt-1">Higher = shown first</p>
            </div>
          </div>

          {/* Order and Enabled Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input
                type="number"
                min="0"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* Enabled */}
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Enabled</span>
              </label>
            </div>
          </div>

          {/* User Data States */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Show for User Data States <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {USER_DATA_STATES.map((state) => (
                <label
                  key={state.id}
                  className={`flex items-start gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.userDataStates?.includes(state.id)
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.userDataStates?.includes(state.id)}
                    onChange={() => handleUserDataStateToggle(state.id)}
                    className="mt-1 w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <div>
                    <div className="font-medium text-sm">{state.name}</div>
                    <div className="text-xs text-gray-500">{state.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Variables */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Variables
            </label>
            <input
              type="text"
              value={variablesInput}
              onChange={(e) => setVariablesInput(e.target.value)}
              placeholder="e.g., activity, healthType"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Comma-separated list of variables used in label/query
            </p>
          </div>

          {/* Data Requirements */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Data Requirements (Optional)</h3>
            <p className="text-xs text-gray-500 mb-4">
              Conditions that must be met for this question to appear
            </p>

            <div className="space-y-3">
              {/* Boolean requirements */}
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={requiresData.hasLocationData || false}
                    onChange={(e) =>
                      setRequiresData({ ...requiresData, hasLocationData: e.target.checked })
                    }
                    className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="text-sm">Has Location Data</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={requiresData.hasHealthData || false}
                    onChange={(e) =>
                      setRequiresData({ ...requiresData, hasHealthData: e.target.checked })
                    }
                    className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="text-sm">Has Health Data</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={requiresData.hasVoiceNotes || false}
                    onChange={(e) =>
                      setRequiresData({ ...requiresData, hasVoiceNotes: e.target.checked })
                    }
                    className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="text-sm">Has Voice Notes</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={requiresData.hasPhotoMemories || false}
                    onChange={(e) =>
                      setRequiresData({ ...requiresData, hasPhotoMemories: e.target.checked })
                    }
                    className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="text-sm">Has Photo Memories</span>
                </label>
              </div>

              {/* Min activity count */}
              <div>
                <label className="block text-sm text-gray-700 mb-1">Min Activity Count</label>
                <input
                  type="number"
                  min="0"
                  value={requiresData.minActivityCount || ''}
                  onChange={(e) =>
                    setRequiresData({
                      ...requiresData,
                      minActivityCount: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 5"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm"
                />
              </div>

              {/* Health types */}
              <div>
                <label className="block text-sm text-gray-700 mb-1">Required Health Types</label>
                <input
                  type="text"
                  value={healthTypesInput}
                  onChange={(e) => setHealthTypesInput(e.target.value)}
                  placeholder="e.g., steps, sleep, heartRate"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Preview</h3>
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
              <span className="text-2xl">{formData.icon}</span>
              <div>
                <div className="font-medium text-gray-900">{formData.labelKey || 'Label...'}</div>
                <div className="text-sm text-gray-500">
                  {formData.queryTemplate || 'Query template...'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : mode === 'create' ? 'Create Question' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
