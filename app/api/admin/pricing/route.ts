import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

const CONFIG_DOC_PATH = 'config/pricing';
const VERSIONS_COLLECTION = 'pricingVersions';

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
 * Model pricing configuration
 */
interface ModelPricing {
  name: string;           // Display name (e.g., "GPT-4o")
  inputPer1M: number;     // Price per 1M input tokens
  outputPer1M: number;    // Price per 1M output tokens
  enabled: boolean;       // Show in UI / allow usage
  features?: ModelFeature[]; // Model capabilities
}

/**
 * Full pricing configuration
 */
interface PricingConfig {
  version: number;
  enableDynamicConfig: boolean;  // Kill switch - if false, Cloud Functions use hardcoded
  lastUpdated: string;           // ISO timestamp
  updatedBy: string;             // Admin UID
  changeNotes?: string;          // Reason for last change
  models: Record<string, ModelPricing>;
}

/**
 * Version history entry
 */
interface PricingConfigVersion {
  id: string;
  version: number;
  config: PricingConfig;
  changedBy: string;
  changedByEmail?: string;
  changedAt: string;
  changeNotes?: string;
  previousVersion?: number;
}

/**
 * Default pricing based on OpenAI rates (Jan 2025)
 */
function getDefaultPricingConfig(): PricingConfig {
  return {
    version: 0,
    enableDynamicConfig: false,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
    models: {
      'gpt-4o': {
        name: 'GPT-4o',
        inputPer1M: 2.50,
        outputPer1M: 10.00,
        enabled: true,
        features: ['chat', 'vision', 'function-calling', 'json-mode', 'streaming'],
      },
      'gpt-4o-mini': {
        name: 'GPT-4o Mini',
        inputPer1M: 0.15,
        outputPer1M: 0.60,
        enabled: true,
        features: ['chat', 'vision', 'function-calling', 'json-mode', 'streaming'],
      },
      'gpt-4-turbo': {
        name: 'GPT-4 Turbo',
        inputPer1M: 10.00,
        outputPer1M: 30.00,
        enabled: true,
        features: ['chat', 'vision', 'function-calling', 'json-mode', 'streaming'],
      },
      'gpt-4': {
        name: 'GPT-4',
        inputPer1M: 30.00,
        outputPer1M: 60.00,
        enabled: true,
        features: ['chat', 'function-calling', 'streaming'],
      },
      'gpt-3.5-turbo': {
        name: 'GPT-3.5 Turbo',
        inputPer1M: 0.50,
        outputPer1M: 1.50,
        enabled: true,
        features: ['chat', 'function-calling', 'json-mode', 'streaming'],
      },
      'text-embedding-3-small': {
        name: 'Text Embedding 3 Small',
        inputPer1M: 0.02,
        outputPer1M: 0,
        enabled: true,
        features: ['embeddings'],
      },
      'text-embedding-3-large': {
        name: 'Text Embedding 3 Large',
        inputPer1M: 0.13,
        outputPer1M: 0,
        enabled: true,
        features: ['embeddings'],
      },
      'whisper-1': {
        name: 'Whisper',
        inputPer1M: 0.006,  // $0.006 per minute, not tokens
        outputPer1M: 0,
        enabled: true,
        features: ['audio-transcription'],
      },
      'tts-1': {
        name: 'TTS Standard',
        inputPer1M: 15.00,  // $15 per 1M characters
        outputPer1M: 0,
        enabled: true,
        features: ['audio-generation'],
      },
      'tts-1-hd': {
        name: 'TTS HD',
        inputPer1M: 30.00,  // $30 per 1M characters
        outputPer1M: 0,
        enabled: true,
        features: ['audio-generation'],
      },
    },
  };
}

/**
 * GET /api/admin/pricing
 * Get current pricing configuration
 *
 * Returns:
 * - config: PricingConfig (or default if not initialized)
 * - isDefault: boolean (true if returning hardcoded defaults)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const db = getAdminFirestore();
    const configDoc = await db.doc(CONFIG_DOC_PATH).get();

    if (!configDoc.exists) {
      // Return default config if not initialized
      const defaultConfig = getDefaultPricingConfig();
      return NextResponse.json({
        config: defaultConfig,
        isDefault: true,
      });
    }

    const config = configDoc.data() as PricingConfig;
    return NextResponse.json({
      config,
      isDefault: false,
    });
  } catch (error: unknown) {
    console.error('[Admin Pricing API] Error fetching config:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch pricing config';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/pricing
 * Initialize pricing configuration with defaults
 * Only works if config doesn't exist yet
 *
 * Returns:
 * - config: PricingConfig
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const db = getAdminFirestore();
    const configRef = db.doc(CONFIG_DOC_PATH);
    const configDoc = await configRef.get();

    if (configDoc.exists) {
      return NextResponse.json(
        { error: 'Pricing config already exists. Use PATCH to update.' },
        { status: 409 }
      );
    }

    // Initialize with defaults
    const defaultConfig = getDefaultPricingConfig();
    const now = new Date().toISOString();
    const config: PricingConfig = {
      ...defaultConfig,
      version: 1,
      lastUpdated: now,
      updatedBy: user.uid,
    };

    await configRef.set(config);

    // Create initial version record
    const versionDoc: PricingConfigVersion = {
      id: 'v1',
      version: 1,
      config,
      changedBy: user.uid,
      changedByEmail: user.email || undefined,
      changedAt: now,
      changeNotes: 'Initial configuration',
    };

    await db.collection(VERSIONS_COLLECTION).doc('v1').set(versionDoc);

    return NextResponse.json({ config }, { status: 201 });
  } catch (error: unknown) {
    console.error('[Admin Pricing API] Error initializing config:', error);
    const message = error instanceof Error ? error.message : 'Failed to initialize pricing config';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/pricing
 * Update pricing configuration
 *
 * Body:
 * - models?: Record<string, Partial<ModelPricing>> - Model pricing updates
 * - enableDynamicConfig?: boolean - Kill switch
 * - changeNotes?: string - Description of changes
 * - addModel?: { id: string; pricing: ModelPricing } - Add new model
 * - removeModel?: string - Remove model by ID
 *
 * Returns:
 * - config: PricingConfig (updated)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { models, enableDynamicConfig, changeNotes, addModel, removeModel } = body;

    const db = getAdminFirestore();
    const configRef = db.doc(CONFIG_DOC_PATH);
    const configDoc = await configRef.get();

    if (!configDoc.exists) {
      return NextResponse.json(
        { error: 'Pricing config not initialized. Use POST to initialize first.' },
        { status: 404 }
      );
    }

    const currentConfig = configDoc.data() as PricingConfig;
    const now = new Date().toISOString();
    const newVersion = currentConfig.version + 1;

    // Build updated config
    const updatedConfig: PricingConfig = {
      ...currentConfig,
      version: newVersion,
      lastUpdated: now,
      updatedBy: user.uid,
      changeNotes: changeNotes || undefined,
    };

    // Update kill switch if provided
    if (typeof enableDynamicConfig === 'boolean') {
      updatedConfig.enableDynamicConfig = enableDynamicConfig;
    }

    // Update existing models if provided
    if (models) {
      for (const [modelId, updates] of Object.entries(models)) {
        if (updatedConfig.models[modelId]) {
          updatedConfig.models[modelId] = validateAndMergeModelPricing(
            updatedConfig.models[modelId],
            updates as Partial<ModelPricing>
          );
        }
      }
    }

    // Add new model if provided
    if (addModel && addModel.id && addModel.pricing) {
      if (updatedConfig.models[addModel.id]) {
        return NextResponse.json(
          { error: `Model '${addModel.id}' already exists` },
          { status: 400 }
        );
      }
      updatedConfig.models[addModel.id] = validateModelPricing(addModel.pricing);
    }

    // Remove model if provided
    if (removeModel) {
      if (!updatedConfig.models[removeModel]) {
        return NextResponse.json(
          { error: `Model '${removeModel}' not found` },
          { status: 400 }
        );
      }
      delete updatedConfig.models[removeModel];
    }

    // Save updated config
    await configRef.set(updatedConfig);

    // Create version record for audit trail
    const versionDoc: PricingConfigVersion = {
      id: `v${newVersion}`,
      version: newVersion,
      config: updatedConfig,
      changedBy: user.uid,
      changedByEmail: user.email || undefined,
      changedAt: now,
      changeNotes: changeNotes || undefined,
      previousVersion: currentConfig.version,
    };

    await db.collection(VERSIONS_COLLECTION).doc(`v${newVersion}`).set(versionDoc);

    return NextResponse.json({ config: updatedConfig });
  } catch (error: unknown) {
    console.error('[Admin Pricing API] Error updating config:', error);
    const message = error instanceof Error ? error.message : 'Failed to update pricing config';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * Validate and merge model pricing updates
 */
function validateAndMergeModelPricing(
  current: ModelPricing,
  updates: Partial<ModelPricing>
): ModelPricing {
  const merged = { ...current };

  if (typeof updates.name === 'string' && updates.name.trim()) {
    merged.name = updates.name.trim();
  }

  if (typeof updates.inputPer1M === 'number') {
    if (updates.inputPer1M < 0) {
      throw new Error('inputPer1M must be >= 0');
    }
    merged.inputPer1M = updates.inputPer1M;
  }

  if (typeof updates.outputPer1M === 'number') {
    if (updates.outputPer1M < 0) {
      throw new Error('outputPer1M must be >= 0');
    }
    merged.outputPer1M = updates.outputPer1M;
  }

  if (typeof updates.enabled === 'boolean') {
    merged.enabled = updates.enabled;
  }

  if (Array.isArray(updates.features)) {
    merged.features = updates.features;
  }

  return merged;
}

/**
 * Validate a complete model pricing object
 */
function validateModelPricing(pricing: ModelPricing): ModelPricing {
  if (!pricing.name || typeof pricing.name !== 'string') {
    throw new Error('Model name is required');
  }

  if (typeof pricing.inputPer1M !== 'number' || pricing.inputPer1M < 0) {
    throw new Error('inputPer1M must be a number >= 0');
  }

  if (typeof pricing.outputPer1M !== 'number' || pricing.outputPer1M < 0) {
    throw new Error('outputPer1M must be a number >= 0');
  }

  return {
    name: pricing.name.trim(),
    inputPer1M: pricing.inputPer1M,
    outputPer1M: pricing.outputPer1M,
    enabled: pricing.enabled ?? true,
    features: Array.isArray(pricing.features) ? pricing.features : [],
  };
}
