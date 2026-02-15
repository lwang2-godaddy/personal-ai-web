'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPut } from '@/lib/api/client';
import { ExtractionConfig, ExtractionModel } from '@/lib/models/MemoryBuilderConfig';

interface ExtractionSettingsTabProps {
  onSaving?: (saving: boolean) => void;
}

const MODEL_OPTIONS: { value: ExtractionModel; label: string; description: string }[] = [
  {
    value: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    description: 'Fast, cost-effective, good accuracy',
  },
  {
    value: 'gpt-4o',
    label: 'GPT-4o',
    description: 'Best quality, higher cost',
  },
  {
    value: 'claude-3-haiku',
    label: 'Claude 3 Haiku',
    description: 'Fast, cost-effective alternative',
  },
];

/**
 * Extraction Settings Tab - Configure AI model and extraction parameters
 */
export default function ExtractionSettingsTab({ onSaving }: ExtractionSettingsTabProps) {
  const [config, setConfig] = useState<ExtractionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiGet('/api/admin/memory-builder');
      setConfig(response.config.extraction);
    } catch (err: any) {
      setError(err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<ExtractionConfig>) => {
    if (!config) return;

    try {
      setSaving(true);
      onSaving?.(true);
      const fullConfig = await apiGet('/api/admin/memory-builder');
      await apiPut('/api/admin/memory-builder', {
        config: {
          ...fullConfig.config,
          extraction: {
            ...config,
            ...updates,
          },
        },
      });
      await loadConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update configuration');
    } finally {
      setSaving(false);
      onSaving?.(false);
    }
  };

  const testExtraction = async () => {
    if (!testText.trim()) return;

    try {
      setTesting(true);
      setTestResult(null);
      // Note: This would need a test endpoint to be implemented
      // For now, show a placeholder
      setTestResult({
        success: true,
        entities: [
          { type: 'person', value: 'John', confidence: 0.92 },
          { type: 'activity', value: 'meeting', confidence: 0.85 },
        ],
        sentiment: { score: 0.3, label: 'positive' },
        latencyMs: 450,
      });
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">{error}</p>
        <button
          onClick={loadConfig}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">AI Model</h3>
        <div className="space-y-3">
          {MODEL_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                config.model === option.value ? 'border-blue-500 bg-blue-50' : ''
              }`}
            >
              <input
                type="radio"
                name="model"
                value={option.value}
                checked={config.model === option.value}
                onChange={() => updateConfig({ model: option.value })}
                className="mt-1"
              />
              <div>
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-gray-500">{option.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Parameters */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Parameters</h3>
        <div className="space-y-4">
          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temperature: {config.temperature.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={config.temperature * 100}
              onChange={(e) => updateConfig({ temperature: parseInt(e.target.value) / 100 })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>More focused (0)</span>
              <span>More creative (1)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Tokens: {config.maxTokens}
            </label>
            <input
              type="range"
              min="200"
              max="2000"
              step="100"
              value={config.maxTokens}
              onChange={(e) => updateConfig({ maxTokens: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>200</span>
              <span>2000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Features</h3>
        <div className="space-y-4">
          {/* Sentiment Analysis */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Sentiment Analysis</div>
              <div className="text-sm text-gray-500">
                Analyze emotional tone of text (-1 to +1)
              </div>
            </div>
            <button
              onClick={() => updateConfig({ enableSentiment: !config.enableSentiment })}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.enableSentiment ? 'bg-blue-600' : 'bg-gray-200'
              } ${saving ? 'opacity-50' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.enableSentiment ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Batch Processing */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Batch Processing</div>
              <div className="text-sm text-gray-500">
                Process multiple texts in parallel (faster)
              </div>
            </div>
            <button
              onClick={() =>
                updateConfig({ enableBatchProcessing: !config.enableBatchProcessing })
              }
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.enableBatchProcessing ? 'bg-blue-600' : 'bg-gray-200'
              } ${saving ? 'opacity-50' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.enableBatchProcessing ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Test Extraction */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Test Extraction</h3>
        <div className="space-y-4">
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Enter text to test entity extraction..."
            className="w-full h-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={testExtraction}
            disabled={testing || !testText.trim()}
            className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {testing ? 'Testing...' : 'Test Extraction'}
          </button>

          {testResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              {testResult.error ? (
                <p className="text-red-600">{testResult.error}</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Entities</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {testResult.entities?.map((e: any, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-white border rounded text-sm"
                        >
                          {e.type}: {e.value} ({(e.confidence * 100).toFixed(0)}%)
                        </span>
                      ))}
                    </div>
                  </div>
                  {testResult.sentiment && (
                    <div>
                      <div className="text-sm font-medium text-gray-700">Sentiment</div>
                      <div className="text-sm mt-1">
                        {testResult.sentiment.label} ({testResult.sentiment.score.toFixed(2)})
                      </div>
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Latency: {testResult.latencyMs}ms
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
