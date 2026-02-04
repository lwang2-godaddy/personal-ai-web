import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import {
  AIModelsConfig,
  AIModelsConfigVersion,
  getDefaultAIModelsConfig,
  OpenAIModelId,
} from '@/lib/models/AIModels';

const CONFIG_DOC_PATH = 'config/aiModels';
const VERSIONS_COLLECTION = 'aiModelsVersions';

/**
 * GET /api/admin/ai-models
 * Get current AI models configuration
 *
 * Returns:
 * - config: AIModelsConfig (or default if not initialized)
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
      const defaultConfig = getDefaultAIModelsConfig();
      return NextResponse.json({
        config: {
          ...defaultConfig,
          version: 0,
          lastUpdated: new Date().toISOString(),
          updatedBy: 'system',
        },
        isDefault: true,
      });
    }

    const storedConfig = configDoc.data() as AIModelsConfig;

    // Merge with defaults to fill in any missing services
    // This handles cases where new services were added to SERVICE_METADATA
    // after the Firestore config was initialized
    const defaultConfig = getDefaultAIModelsConfig();
    const mergedConfig: AIModelsConfig = {
      ...storedConfig,
      services: {
        ...defaultConfig.services, // Start with defaults
        ...storedConfig.services,  // Override with stored values
      },
      availableModels: {
        ...defaultConfig.availableModels, // Start with defaults
        ...storedConfig.availableModels,  // Override with stored values
      },
    };

    return NextResponse.json({
      config: mergedConfig,
      isDefault: false,
    });
  } catch (error: unknown) {
    console.error('[Admin AI Models API] Error fetching config:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch AI models config';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai-models
 * Initialize AI models configuration with defaults
 * Only works if config doesn't exist yet
 *
 * Returns:
 * - config: AIModelsConfig
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
        { error: 'AI models config already exists. Use PATCH to update.' },
        { status: 409 }
      );
    }

    // Initialize with defaults
    const defaultConfig = getDefaultAIModelsConfig();
    const now = new Date().toISOString();
    const config: AIModelsConfig = {
      ...defaultConfig,
      version: 1,
      lastUpdated: now,
      updatedBy: user.uid,
    };

    await configRef.set(config);

    // Create initial version record
    const versionDoc: AIModelsConfigVersion = {
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
    console.error('[Admin AI Models API] Error initializing config:', error);
    const message = error instanceof Error ? error.message : 'Failed to initialize AI models config';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/ai-models
 * Update AI models configuration
 *
 * Body:
 * - services?: Partial<AIModelsConfig['services']> - Update service model assignments
 * - availableModels?: Partial<AIModelsConfig['availableModels']> - Update available models
 * - enableDynamicConfig?: boolean - Kill switch
 * - changeNotes?: string - Description of changes
 *
 * Returns:
 * - config: AIModelsConfig (updated)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { services, availableModels, enableDynamicConfig, changeNotes } = body;

    const db = getAdminFirestore();
    const configRef = db.doc(CONFIG_DOC_PATH);
    const configDoc = await configRef.get();

    if (!configDoc.exists) {
      return NextResponse.json(
        { error: 'AI models config not initialized. Use POST to initialize first.' },
        { status: 404 }
      );
    }

    const currentConfig = configDoc.data() as AIModelsConfig;
    const now = new Date().toISOString();
    const newVersion = currentConfig.version + 1;

    // Build updated config
    const updatedConfig: AIModelsConfig = {
      ...currentConfig,
      version: newVersion,
      lastUpdated: now,
      updatedBy: user.uid,
    };

    // Update kill switch if provided
    if (typeof enableDynamicConfig === 'boolean') {
      updatedConfig.enableDynamicConfig = enableDynamicConfig;
    }

    // Update services if provided
    if (services) {
      for (const [serviceName, serviceConfig] of Object.entries(services)) {
        if (serviceName in updatedConfig.services) {
          const key = serviceName as keyof AIModelsConfig['services'];
          const validated = validateServiceConfig(serviceConfig, updatedConfig.availableModels);
          updatedConfig.services[key] = {
            ...updatedConfig.services[key],
            ...validated,
          };
        }
      }
    }

    // Update available models if provided
    if (availableModels) {
      for (const [modelId, modelConfig] of Object.entries(availableModels)) {
        if (modelId in updatedConfig.availableModels && modelConfig) {
          const config = modelConfig as { enabled?: boolean; displayName?: string };
          if (typeof config.enabled === 'boolean') {
            updatedConfig.availableModels[modelId].enabled = config.enabled;
          }
          if (typeof config.displayName === 'string') {
            updatedConfig.availableModels[modelId].displayName = config.displayName;
          }
        }
      }
    }

    // Store change notes
    if (changeNotes) {
      updatedConfig.changeNotes = changeNotes;
    }

    // Save updated config
    await configRef.set(updatedConfig);

    // Create version record for audit trail
    const versionDoc: AIModelsConfigVersion = {
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
    console.error('[Admin AI Models API] Error updating config:', error);
    const message = error instanceof Error ? error.message : 'Failed to update AI models config';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * Validate service config updates
 */
function validateServiceConfig(
  updates: any,
  availableModels: AIModelsConfig['availableModels']
): { default?: OpenAIModelId; tierOverrides?: Record<string, OpenAIModelId> } {
  const result: { default?: OpenAIModelId; tierOverrides?: Record<string, OpenAIModelId> } = {};

  // Validate default model
  if (updates.default) {
    if (!(updates.default in availableModels)) {
      throw new Error(`Invalid model ID: ${updates.default}`);
    }
    if (!availableModels[updates.default].enabled) {
      throw new Error(`Model ${updates.default} is not enabled`);
    }
    result.default = updates.default as OpenAIModelId;
  }

  // Validate tier overrides
  if (updates.tierOverrides) {
    result.tierOverrides = {};
    for (const [tier, model] of Object.entries(updates.tierOverrides)) {
      if (!['free', 'premium', 'pro'].includes(tier)) {
        throw new Error(`Invalid tier: ${tier}`);
      }
      if (model && typeof model === 'string') {
        if (!(model in availableModels)) {
          throw new Error(`Invalid model ID for ${tier} tier: ${model}`);
        }
        if (!availableModels[model].enabled) {
          throw new Error(`Model ${model} is not enabled`);
        }
        result.tierOverrides[tier] = model as OpenAIModelId;
      }
    }
  }

  return result;
}
