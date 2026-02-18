'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from '@/lib/api/client';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

interface ScreenshotConfig {
  inputFile: string;
  outputName: string;
  title: string;
  subtitle: string;
  gradientFrom: string;
  gradientTo: string;
}

interface ScreenshotListResponse {
  rawScreenshots: string[];
  generatedScreenshots: { size: string; files: string[] }[];
  config: ScreenshotConfig[];
  deviceSizes: { label: string; width: number; height: number }[];
  _debug?: {
    screenshotsDir: string;
    exists: boolean;
    cwd: string;
  };
}

interface GenerateResponse {
  success: boolean;
  generated: number;
  message: string;
}

const DEFAULT_CONFIGS: ScreenshotConfig[] = [
  {
    inputFile: 'diaries.png',
    outputName: '01_diaries.png',
    title: 'Your Personal Diary',
    subtitle: 'Voice notes, text entries & photos — all in one place',
    gradientFrom: '#F59E0B',
    gradientTo: '#EA580C',
  },
  {
    inputFile: 'AI_Generated_life_feed.png',
    outputName: '02_life_feed.png',
    title: 'AI Life Feed',
    subtitle: 'Smart daily insights generated from your diary & activities',
    gradientFrom: '#8B5CF6',
    gradientTo: '#6D28D9',
  },
  {
    inputFile: 'AI_Generated_mood_compass.png',
    outputName: '03_mood_compass.png',
    title: 'AI Mood Compass',
    subtitle: 'Track your emotional well-being with AI-powered analysis',
    gradientFrom: '#06B6D4',
    gradientTo: '#0284C7',
  },
  {
    inputFile: 'AI_Generated_Keywords.png',
    outputName: '04_keywords.png',
    title: 'AI Life Keywords',
    subtitle: 'Weekly themes auto-discovered from your life data',
    gradientFrom: '#10B981',
    gradientTo: '#059669',
  },
  {
    inputFile: 'feedFromFriends.png',
    outputName: '05_social_feed.png',
    title: 'Share Your Life',
    subtitle: 'Connect with friends through AI-powered life updates',
    gradientFrom: '#F97316',
    gradientTo: '#E11D48',
  },
];

export default function AdminScreenshotsPage() {
  useTrackPage(TRACKED_SCREENS.adminScreenshots);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<ScreenshotListResponse | null>(null);
  const [configs, setConfigs] = useState<ScreenshotConfig[]>(DEFAULT_CONFIGS);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [previewSize, setPreviewSize] = useState<string>('6.9');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiGet<ScreenshotListResponse>('/api/admin/screenshots/list');
      setData(response);
      if (response.config && response.config.length > 0) {
        setConfigs(response.config);
      }
    } catch (err: any) {
      console.error('Failed to fetch screenshots:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to load screenshots' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setMessage(null);
      const response = await apiPost<GenerateResponse>('/api/admin/screenshots/generate', {
        configs,
      });
      setMessage({ type: 'success', text: response.message });
      // Refresh the list
      await fetchData();
    } catch (err: any) {
      console.error('Failed to generate screenshots:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to generate screenshots' });
    } finally {
      setGenerating(false);
    }
  };

  const updateConfig = (index: number, field: keyof ScreenshotConfig, value: string) => {
    setConfigs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addConfig = () => {
    const newConfig: ScreenshotConfig = {
      inputFile: '',
      outputName: `0${configs.length + 1}_new.png`,
      title: 'New Screenshot',
      subtitle: 'Add a description here',
      gradientFrom: '#3B82F6',
      gradientTo: '#1D4ED8',
    };
    setConfigs((prev) => [...prev, newConfig]);
    setEditingIndex(configs.length);
  };

  const removeConfig = (index: number) => {
    setConfigs((prev) => prev.filter((_, i) => i !== index));
    setEditingIndex(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading screenshots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">App Store Screenshots</h1>
          <p className="mt-2 text-gray-600">
            Generate marketing screenshots with title banners for App Store submission.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className={`
            px-6 py-3 rounded-lg font-semibold text-white transition-all
            ${generating
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl'
            }
          `}
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Generating...
            </span>
          ) : (
            'Generate All Screenshots'
          )}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Workflow Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Workflow</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>Login as demo user (Alex Chen) in the iOS Simulator</li>
          <li>Navigate to the screen you want to capture</li>
          <li>
            Go to <a href="/admin/demo-data" className="underline hover:text-blue-600">Demo Data</a> page and click &quot;Take Screenshot&quot;
          </li>
          <li>Move the screenshot from <code className="bg-blue-100 px-1 rounded">public/screenshots/</code> to <code className="bg-blue-100 px-1 rounded">PersonalAIApp/screenshots/</code></li>
          <li>Rename it appropriately (e.g., <code className="bg-blue-100 px-1 rounded">diaries.png</code>)</li>
          <li>Configure the title/subtitle/colors below</li>
          <li>Click &quot;Generate All Screenshots&quot;</li>
        </ol>
        <p className="mt-4 text-sm text-blue-700">
          <strong>Output:</strong> <code className="bg-blue-100 px-1 rounded">PersonalAIApp/screenshots/appstore/</code> with subfolders for each device size (6.9&quot;, 6.7&quot;, 6.5&quot;, 5.5&quot;)
        </p>
      </div>

      {/* Raw Screenshots */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Available Raw Screenshots</h2>
        {data?.rawScreenshots && data.rawScreenshots.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.rawScreenshots.map((file) => (
              <span
                key={file}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-mono"
              >
                {file}
              </span>
            ))}
          </div>
        ) : (
          <div>
            <p className="text-gray-500 mb-2">No raw screenshots found. Take screenshots using the Demo Data page.</p>
            {data?._debug && (
              <div className="mt-4 p-3 bg-gray-100 rounded text-xs font-mono text-gray-600">
                <p><strong>Debug Info:</strong></p>
                <p>CWD: {data._debug.cwd}</p>
                <p>Screenshots Dir: {data._debug.screenshotsDir}</p>
                <p>Directory Exists: {data._debug.exists ? 'Yes' : 'No'}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Screenshot Configurations */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Screenshot Configurations</h2>
          <button
            onClick={addConfig}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            + Add Screenshot
          </button>
        </div>

        <div className="space-y-4">
          {configs.map((config, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                style={{
                  background: `linear-gradient(90deg, ${config.gradientFrom}20, ${config.gradientTo}20)`,
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-8 h-8 rounded-lg shadow-inner"
                    style={{
                      background: `linear-gradient(180deg, ${config.gradientFrom}, ${config.gradientTo})`,
                    }}
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{config.title}</p>
                    <p className="text-sm text-gray-500">
                      {config.inputFile || '(no input file)'} &rarr; {config.outputName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${data?.rawScreenshots?.includes(config.inputFile) ? 'text-green-600' : 'text-red-500'}`}>
                    {data?.rawScreenshots?.includes(config.inputFile) ? 'Ready' : 'Missing'}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${editingIndex === index ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Edit Form */}
              {editingIndex === index && (
                <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Input File
                      </label>
                      <select
                        value={config.inputFile}
                        onChange={(e) => updateConfig(index, 'inputFile', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Select a file...</option>
                        {data?.rawScreenshots?.map((file) => (
                          <option key={file} value={file}>
                            {file}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Output Name
                      </label>
                      <input
                        type="text"
                        value={config.outputName}
                        onChange={(e) => updateConfig(index, 'outputName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="01_feature.png"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={config.title}
                        onChange={(e) => updateConfig(index, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Your Feature Title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subtitle
                      </label>
                      <input
                        type="text"
                        value={config.subtitle}
                        onChange={(e) => updateConfig(index, 'subtitle', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="A description of the feature"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gradient Start Color
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={config.gradientFrom}
                          onChange={(e) => updateConfig(index, 'gradientFrom', e.target.value)}
                          className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={config.gradientFrom}
                          onChange={(e) => updateConfig(index, 'gradientFrom', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                          placeholder="#F59E0B"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gradient End Color
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={config.gradientTo}
                          onChange={(e) => updateConfig(index, 'gradientTo', e.target.value)}
                          className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={config.gradientTo}
                          onChange={(e) => updateConfig(index, 'gradientTo', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                          placeholder="#EA580C"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preview Banner */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Banner Preview
                    </label>
                    <div
                      className="rounded-lg p-6 text-center text-white"
                      style={{
                        background: `linear-gradient(180deg, ${config.gradientFrom}, ${config.gradientTo})`,
                      }}
                    >
                      <h3 className="text-2xl font-bold mb-1">{config.title}</h3>
                      <p className="text-white/90">{config.subtitle}</p>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => removeConfig(index)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      Remove Screenshot
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Generated Screenshots Preview */}
      {data?.generatedScreenshots && data.generatedScreenshots.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Generated Screenshots</h2>
            <div className="flex gap-2">
              {data.deviceSizes?.map((size) => (
                <button
                  key={size.label}
                  onClick={() => setPreviewSize(size.label)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    previewSize === size.label
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {size.label}&quot;
                </button>
              ))}
            </div>
          </div>

          {data.deviceSizes?.find((s) => s.label === previewSize) && (
            <p className="text-sm text-gray-500 mb-4">
              {data.deviceSizes.find((s) => s.label === previewSize)?.width} x{' '}
              {data.deviceSizes.find((s) => s.label === previewSize)?.height} px
            </p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {data.generatedScreenshots
              .find((g) => g.size === previewSize)
              ?.files.map((file) => (
                <div key={file} className="text-center">
                  <div className="bg-gray-100 rounded-lg p-2 mb-2">
                    <div className="text-4xl">
                      {file.includes('diaries') && '📔'}
                      {file.includes('life_feed') && '📰'}
                      {file.includes('mood') && '🧭'}
                      {file.includes('keywords') && '🔑'}
                      {file.includes('social') && '👥'}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 truncate" title={file}>
                    {file}
                  </p>
                </div>
              ))}
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Screenshots saved to: <code className="bg-gray-100 px-2 py-1 rounded">PersonalAIApp/screenshots/appstore/{previewSize}/</code>
          </p>
        </div>
      )}

      {/* App Store Requirements */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">App Store Screenshot Requirements</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {data?.deviceSizes?.map((size) => (
            <div key={size.label} className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="font-semibold text-gray-900">{size.label}&quot; Display</p>
              <p className="text-gray-500">{size.width} x {size.height}</p>
              <p className="text-xs text-gray-400 mt-1">
                {size.label === '6.9' && 'iPhone 16 Pro Max'}
                {size.label === '6.7' && 'iPhone 15 Plus/Pro Max'}
                {size.label === '6.5' && 'iPhone 14 Plus/Pro Max'}
                {size.label === '5.5' && 'iPhone 8 Plus'}
              </p>
            </div>
          )) || (
            <>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="font-semibold text-gray-900">6.9&quot; Display</p>
                <p className="text-gray-500">1320 x 2868</p>
                <p className="text-xs text-gray-400 mt-1">iPhone 16 Pro Max</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="font-semibold text-gray-900">6.7&quot; Display</p>
                <p className="text-gray-500">1290 x 2796</p>
                <p className="text-xs text-gray-400 mt-1">iPhone 15 Plus/Pro Max</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="font-semibold text-gray-900">6.5&quot; Display</p>
                <p className="text-gray-500">1284 x 2778</p>
                <p className="text-xs text-gray-400 mt-1">iPhone 14 Plus/Pro Max</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="font-semibold text-gray-900">5.5&quot; Display</p>
                <p className="text-gray-500">1242 x 2208</p>
                <p className="text-xs text-gray-400 mt-1">iPhone 8 Plus</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
