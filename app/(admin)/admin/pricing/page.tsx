'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch } from '@/lib/api/client';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

/**
 * Available model features
 */
type ModelFeature =
  | 'chat'
  | 'vision'
  | 'embeddings'
  | 'audio-transcription'
  | 'audio-generation'
  | 'function-calling'
  | 'json-mode'
  | 'streaming';

/**
 * Feature display configuration
 */
interface FeatureConfig {
  label: string;
  icon: string;
  color: string;
  description: string;
  platform: 'mobile' | 'web' | 'both' | 'none';
  inUse: boolean;
}

const FEATURE_CONFIG: Record<ModelFeature, FeatureConfig> = {
  'chat': {
    label: 'Chat',
    icon: '💬',
    color: 'bg-blue-100 text-blue-700',
    description: 'Text conversations with AI',
    platform: 'both',
    inUse: true,
  },
  'vision': {
    label: 'Vision',
    icon: '👁️',
    color: 'bg-purple-100 text-purple-700',
    description: 'Analyze images and photos',
    platform: 'mobile',
    inUse: true,
  },
  'embeddings': {
    label: 'Embeddings',
    icon: '🔢',
    color: 'bg-green-100 text-green-700',
    description: 'Convert text to vectors for search',
    platform: 'both',
    inUse: true,
  },
  'audio-transcription': {
    label: 'Transcription',
    icon: '🎤',
    color: 'bg-orange-100 text-orange-700',
    description: 'Convert speech to text (Whisper)',
    platform: 'mobile',
    inUse: true,
  },
  'audio-generation': {
    label: 'Audio Gen',
    icon: '🔊',
    color: 'bg-pink-100 text-pink-700',
    description: 'Convert text to speech (TTS)',
    platform: 'mobile',
    inUse: true,
  },
  'function-calling': {
    label: 'Functions',
    icon: '⚡',
    color: 'bg-gray-100 text-gray-500',
    description: 'AI calls predefined tools/APIs',
    platform: 'none',
    inUse: false,
  },
  'json-mode': {
    label: 'JSON Mode',
    icon: '📋',
    color: 'bg-gray-100 text-gray-500',
    description: 'Force structured JSON output',
    platform: 'none',
    inUse: false,
  },
  'streaming': {
    label: 'Streaming',
    icon: '📡',
    color: 'bg-indigo-100 text-indigo-700',
    description: 'Real-time token-by-token output',
    platform: 'mobile',
    inUse: true,
  },
};

/**
 * Detailed feature documentation for the Learn More section
 */
interface FeatureDoc {
  title: string;
  icon: string;
  summary: string;
  howItWorks: string;
  example: string;
  usedInApp: boolean;
  usageNote: string;
  extraDetail?: string;
}

const FEATURE_DOCS: Record<string, FeatureDoc> = {
  'chat': {
    title: 'Chat (Completions API)',
    icon: '💬',
    summary: 'Send text to AI, get text back. Powers your RAG chatbot.',
    howItWorks: `The core AI conversation feature. You send text, AI sends text back.

How your app uses it:
• RAG chatbot sends user questions + retrieved context to GPT-4o
• AI generates natural language responses
• This is the foundation of your entire chat feature`,
    example: `You: "How many times did I play badminton?"
AI: "Based on your location data, you visited SF Badminton Club 15 times this year."`,
    usedInApp: true,
    usageNote: 'Used by RAGEngine.server.ts for all chat responses',
  },
  'streaming': {
    title: 'Streaming',
    icon: '📡',
    summary: 'Words appear one-by-one instead of waiting for full response.',
    howItWorks: `Instead of waiting for the complete response, words appear as the AI generates them (like ChatGPT's typing effect).

Without streaming:
[Send message] → [Wait 5 seconds] → [Full response appears]

With streaming:
[Send message] → [Instantly see "Based"] → ["Based on"] → ["Based on your"] → ...

Why it matters: Makes the app feel faster and more responsive. Users see progress immediately instead of staring at a loading spinner.`,
    example: `// Non-streaming (current web implementation)
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [...],
  stream: false  // Wait for complete response
});

// Streaming (mobile implementation)
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [...],
  stream: true  // Get tokens as they're generated
});
for await (const chunk of response) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}`,
    usedInApp: true,
    usageNote: 'Mobile uses streaming. Web waits for full response.',
  },
  'function-calling': {
    title: 'Function Calling (Tools)',
    icon: '⚡',
    summary: 'AI tells your code which function to call with what parameters.',
    howItWorks: `You define "tools" the AI can use. When the AI needs information it doesn't have, it asks YOUR code to run a function and return the result.

Important: The AI doesn't execute code itself - it just tells you WHAT to call and with WHAT parameters.

Example flow:
1. User: "What's the weather in Tokyo?"
2. AI thinks: "I need weather data. I'll call the get_weather function."
3. AI returns: { function: "get_weather", args: { city: "Tokyo" } }
4. YOUR CODE calls a weather API → returns "72°F, Sunny"
5. You send that result back to AI
6. AI responds: "It's currently 72°F and sunny in Tokyo!"`,
    example: `const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "What's the weather in Tokyo?" }],
  tools: [{
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather for a city",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name" }
        },
        required: ["city"]
      }
    }
  }]
});

// AI returns tool_calls asking to run get_weather({ city: "Tokyo" })
// You execute the function, then send result back to AI`,
    usedInApp: false,
    usageNote: 'Not used. You do RAG (search Pinecone → add context → ask AI), but AI doesn\'t call any tools.',
    extraDetail: `Real use cases you could add:
• "Show me last week's data" → AI calls date-filter function
• "Book an appointment" → AI calls booking function
• "Send me a summary email" → AI calls email function`,
  },
  'json-mode': {
    title: 'JSON Mode',
    icon: '📋',
    summary: 'Forces AI to output valid JSON only - no extra text, guaranteed parseable.',
    howItWorks: `Forces the AI to output ONLY valid JSON - no extra text, no explanations, just a JSON object you can parse in code.

The problem it solves:

Without JSON mode, you ask AI to return structured data:
You: "Extract the person's name and age from: 'John is 25 years old'"

AI might return:
"Here's the extracted information:
- Name: John
- Age: 25

Let me know if you need anything else!"

This is useless if your code needs to parse it!

With JSON mode:
You: "Extract name and age as JSON from: 'John is 25 years old'"

AI returns EXACTLY:
{"name": "John", "age": 25}

Now your code can reliably do:
const data = JSON.parse(aiResponse);
console.log(data.name); // "John"`,
    example: `const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: "Return JSON with name and age fields" },
    { role: "user", content: "Extract from: 'John is 25 years old'" }
  ],
  response_format: { type: "json_object" }  // Forces JSON output
});

// GUARANTEED valid JSON - no try/catch needed for parsing
const data = JSON.parse(response.choices[0].message.content);
console.log(data);  // { name: "John", age: 25 }`,
    usedInApp: false,
    usageNote: 'Not used. Your chatbot returns free-form text.',
    extraDetail: `Why this matters:
1. Guaranteed valid JSON - AI can't return "Here you go: {data}"
2. No parsing errors - Your code can depend on the format
3. Reliable for integrations - Frontend gets consistent data structure

You could use this to return:
{
  "answer": "You played badminton 15 times",
  "sources": ["location_123", "location_456"],
  "confidence": 0.85
}`,
  },
};

/**
 * Model pricing configuration
 */
interface ModelPricing {
  name: string;
  inputPer1M: number;
  outputPer1M: number;
  enabled: boolean;
  features?: ModelFeature[];
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
  features: ModelFeature[];
}

/**
 * Admin Pricing Configuration Page
 * Configure model pricing for cost estimation
 */
export default function AdminPricingPage() {
  // Track page view
  useTrackPage(TRACKED_SCREENS.adminPricing);

  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingModel, setEditingModel] = useState<EditingModel | null>(null);
  const [changeNotes, setChangeNotes] = useState('');
  const [showAddModel, setShowAddModel] = useState(false);
  const [newModel, setNewModel] = useState<NewModel>({ id: '', name: '', inputPer1M: '', outputPer1M: '', features: [] });
  const [showFeatureDocs, setShowFeatureDocs] = useState(false);
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

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
              features: newModel.features,
            },
          },
          changeNotes: changeNotes || `Added new model: ${newModel.name}`,
        }
      );

      setConfig(data.config);
      setShowAddModel(false);
      setNewModel({ id: '', name: '', inputPer1M: '', outputPer1M: '', features: [] });
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

  const updateEditingPricing = (field: keyof ModelPricing, value: string | number | boolean | ModelFeature[]) => {
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
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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

      {/* Feature Legend */}
      {config && !isDefault && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Feature Reference</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {(Object.entries(FEATURE_CONFIG) as [ModelFeature, FeatureConfig][]).map(([key, featureConfig]) => (
              <div key={key} className={`p-2 rounded ${featureConfig.inUse ? 'bg-white' : 'bg-gray-100 opacity-60'}`}>
                <div className="flex items-center gap-1">
                  <span>{featureConfig.icon}</span>
                  <span className="font-medium">{featureConfig.label}</span>
                  {featureConfig.platform !== 'none' && (
                    <span className="text-xs">
                      {featureConfig.platform === 'both' ? '📱🌐' :
                       featureConfig.platform === 'mobile' ? '📱' : '🌐'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{featureConfig.description}</p>
                {!featureConfig.inUse && (
                  <p className="text-xs text-red-500 mt-1">Not used in this app</p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-500 flex gap-4">
            <span>📱 = Mobile app</span>
            <span>🌐 = Web dashboard</span>
            <span>📱🌐 = Both platforms</span>
          </div>

          {/* Learn More Button */}
          <button
            onClick={() => setShowFeatureDocs(!showFeatureDocs)}
            className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <span>📖</span>
            <span>Learn More About Features</span>
            <span className={`transition-transform ${showFeatureDocs ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {/* Expanded Feature Documentation */}
          {showFeatureDocs && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(FEATURE_DOCS).map(([key, doc]) => (
                  <div
                    key={key}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{doc.icon}</span>
                        <h4 className="font-semibold text-gray-900">{doc.title}</h4>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          doc.usedInApp
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {doc.usedInApp ? '✅ Used' : '❌ Not used'}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="text-sm text-gray-600 mb-3">{doc.summary}</p>

                    {/* Usage Note */}
                    <p className="text-xs text-gray-500 italic mb-3">
                      {doc.usageNote}
                    </p>

                    {/* Expandable Details */}
                    <button
                      onClick={() => setExpandedFeature(expandedFeature === key ? null : key)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    >
                      {expandedFeature === key ? 'Hide details' : 'Show details'}
                      <span className={`transition-transform ${expandedFeature === key ? 'rotate-180' : ''}`}>▼</span>
                    </button>

                    {expandedFeature === key && (
                      <div className="mt-3 space-y-3">
                        {/* How It Works */}
                        <div>
                          <h5 className="text-xs font-semibold text-gray-700 mb-1">How it works:</h5>
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 p-2 rounded">
                            {doc.howItWorks}
                          </pre>
                        </div>

                        {/* Code Example */}
                        <div>
                          <h5 className="text-xs font-semibold text-gray-700 mb-1">Example:</h5>
                          <pre className="text-xs text-gray-800 bg-gray-900 text-green-400 p-2 rounded overflow-x-auto">
                            {doc.example}
                          </pre>
                        </div>

                        {/* Extra Detail (for JSON mode) */}
                        {doc.extraDetail && (
                          <div>
                            <h5 className="text-xs font-semibold text-gray-700 mb-1">Additional info:</h5>
                            <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-yellow-50 border border-yellow-200 p-2 rounded">
                              {doc.extraDetail}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Model Features</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(FEATURE_CONFIG) as ModelFeature[]).map((feature) => {
                    const isSelected = newModel.features.includes(feature);
                    const featureConfig = FEATURE_CONFIG[feature];
                    const platformIndicator = featureConfig.platform === 'both' ? '📱🌐' :
                      featureConfig.platform === 'mobile' ? '📱' :
                      featureConfig.platform === 'web' ? '🌐' : '';
                    return (
                      <button
                        key={feature}
                        type="button"
                        onClick={() => {
                          setNewModel({
                            ...newModel,
                            features: isSelected
                              ? newModel.features.filter(f => f !== feature)
                              : [...newModel.features, feature],
                          });
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? (featureConfig.inUse ? featureConfig.color : 'bg-gray-200 text-gray-500') + ' ring-2 ring-offset-1 ring-gray-400'
                            : featureConfig.inUse ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-gray-50 text-gray-300 hover:bg-gray-100'
                        }`}
                        title={`${featureConfig.description}${!featureConfig.inUse ? ' (Not used in this app)' : ''}`}
                      >
                        {featureConfig.icon} {featureConfig.label}
                        {featureConfig.platform !== 'none' && (
                          <span className="ml-1 opacity-60">{platformIndicator}</span>
                        )}
                      </button>
                    );
                  })}
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
                    setNewModel({ id: '', name: '', inputPer1M: '', outputPer1M: '', features: [] });
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
  onUpdatePricing: (field: keyof ModelPricing, value: string | number | boolean | ModelFeature[]) => void;
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
            className="px-3 py-1 text-sm bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200"
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

        {/* Features Section */}
        <hr className="my-2" />
        <div>
          <span className="text-sm text-gray-600 block mb-2">Features</span>
          {isEditing ? (
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(FEATURE_CONFIG) as ModelFeature[]).map((feature) => {
                const features = displayPricing.features || [];
                const isSelected = features.includes(feature);
                const featureConfig = FEATURE_CONFIG[feature];
                const platformIndicator = featureConfig.platform === 'both' ? '📱🌐' :
                  featureConfig.platform === 'mobile' ? '📱' :
                  featureConfig.platform === 'web' ? '🌐' : '';
                return (
                  <button
                    key={feature}
                    type="button"
                    onClick={() => {
                      const newFeatures = isSelected
                        ? features.filter(f => f !== feature)
                        : [...features, feature];
                      onUpdatePricing('features', newFeatures);
                    }}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? (featureConfig.inUse ? featureConfig.color : 'bg-gray-200 text-gray-500') + ' ring-1 ring-offset-1 ring-gray-300'
                        : featureConfig.inUse ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-gray-50 text-gray-300 hover:bg-gray-100'
                    }`}
                    title={`${featureConfig.description}${!featureConfig.inUse ? ' (Not used in this app)' : ''}`}
                  >
                    {featureConfig.icon} {featureConfig.label}
                    {featureConfig.platform !== 'none' && (
                      <span className="ml-1 opacity-60">{platformIndicator}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {displayPricing.features && displayPricing.features.length > 0 ? (
                displayPricing.features.map((feature) => {
                  const featureConfig = FEATURE_CONFIG[feature];
                  const platformIndicator = featureConfig.platform === 'both' ? '📱🌐' :
                    featureConfig.platform === 'mobile' ? '📱' :
                    featureConfig.platform === 'web' ? '🌐' : '';
                  return (
                    <span
                      key={feature}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        featureConfig.inUse ? featureConfig.color : 'bg-gray-100 text-gray-400 line-through'
                      }`}
                      title={`${featureConfig.description}\n${
                        featureConfig.platform === 'both' ? '📱🌐 Mobile + Web' :
                        featureConfig.platform === 'mobile' ? '📱 Mobile only' :
                        featureConfig.platform === 'web' ? '🌐 Web only' :
                        '⚠️ Not used in this app'
                      }`}
                    >
                      {featureConfig.icon} {featureConfig.label}
                      {featureConfig.platform !== 'none' && (
                        <span className="ml-1 opacity-60">{platformIndicator}</span>
                      )}
                    </span>
                  );
                })
              ) : (
                <span className="text-gray-400 text-xs italic">No features set</span>
              )}
            </div>
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
