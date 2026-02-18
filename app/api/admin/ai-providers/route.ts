import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { requireAdmin } from '@/lib/middleware/auth';
import {
  AIProviderConfig,
  ServiceType,
  ServiceConfig,
  DEFAULT_AI_PROVIDER_CONFIG,
  ProviderStatus,
} from '@/lib/models/AIProviderConfig';

const CONFIG_DOC_PATH = 'config/aiProviders';

// Helper to get Firestore instance
function getDb() {
  return getAdminFirestore();
}

/**
 * GET /api/admin/ai-providers
 *
 * Fetch current AI provider configuration from Firestore.
 * Returns default config if not initialized.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const { user, response } = await requireAdmin(request);
    if (response) return response;

    // Fetch config from Firestore
    const db = getDb();
    const configDoc = await db.doc(CONFIG_DOC_PATH).get();

    if (!configDoc.exists) {
      // Return default config with isDefault flag
      return NextResponse.json({
        config: DEFAULT_AI_PROVIDER_CONFIG,
        isDefault: true,
        providerStatus: getDefaultProviderStatus(),
      });
    }

    const config = configDoc.data() as AIProviderConfig;

    // Check provider availability (simplified - in production, ping each provider)
    const providerStatus = await checkProviderStatus(config);

    return NextResponse.json({
      config,
      isDefault: false,
      providerStatus,
    });
  } catch (error: any) {
    console.error('[AI Providers API] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch AI providers configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai-providers
 *
 * Initialize AI provider configuration with defaults.
 * Only works if config doesn't exist yet.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const { user, response } = await requireAdmin(request);
    if (response) return response;

    const db = getDb();

    // Check if config already exists
    const configDoc = await db.doc(CONFIG_DOC_PATH).get();
    if (configDoc.exists) {
      return NextResponse.json(
        { error: 'Configuration already initialized. Use PATCH to update.' },
        { status: 400 }
      );
    }

    // Initialize with defaults
    const config: AIProviderConfig = {
      ...DEFAULT_AI_PROVIDER_CONFIG,
      lastUpdated: new Date().toISOString(),
      updatedBy: user.uid,
    };

    await db.doc(CONFIG_DOC_PATH).set(config);

    return NextResponse.json({
      config,
      message: 'Configuration initialized successfully',
    });
  } catch (error: any) {
    console.error('[AI Providers API] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize configuration' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/ai-providers
 *
 * Update AI provider configuration.
 * Supports:
 * - Updating service configuration (service + serviceConfig)
 * - Toggling provider enabled status (toggleProvider)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin access
    const { user, response } = await requireAdmin(request);
    if (response) return response;

    const db = getDb();
    const body = await request.json();

    // Fetch current config
    const configDoc = await db.doc(CONFIG_DOC_PATH).get();
    if (!configDoc.exists) {
      return NextResponse.json(
        { error: 'Configuration not initialized. Use POST to initialize.' },
        { status: 400 }
      );
    }

    const currentConfig = configDoc.data() as AIProviderConfig;
    let updatedConfig = { ...currentConfig };

    // Handle service configuration update
    if (body.service && body.serviceConfig) {
      const service = body.service as ServiceType;
      const serviceConfig = body.serviceConfig as ServiceConfig;

      // Validate service type
      if (!['chat', 'embedding', 'tts', 'stt', 'vision'].includes(service)) {
        return NextResponse.json(
          { error: `Invalid service type: ${service}` },
          { status: 400 }
        );
      }

      // Validate provider exists
      const provider = currentConfig.registeredProviders.find(
        (p) => p.id === serviceConfig.providerId
      );
      if (!provider) {
        return NextResponse.json(
          { error: `Provider not found: ${serviceConfig.providerId}` },
          { status: 400 }
        );
      }

      // Validate provider supports this service
      if (!provider.supportedServices.includes(service)) {
        return NextResponse.json(
          {
            error: `Provider ${serviceConfig.providerId} does not support ${service}`,
          },
          { status: 400 }
        );
      }

      // Validate fallback provider if specified
      if (serviceConfig.fallbackProviderId) {
        const fallbackProvider = currentConfig.registeredProviders.find(
          (p) => p.id === serviceConfig.fallbackProviderId
        );
        if (!fallbackProvider) {
          return NextResponse.json(
            { error: `Fallback provider not found: ${serviceConfig.fallbackProviderId}` },
            { status: 400 }
          );
        }
        if (!fallbackProvider.supportedServices.includes(service)) {
          return NextResponse.json(
            {
              error: `Fallback provider ${serviceConfig.fallbackProviderId} does not support ${service}`,
            },
            { status: 400 }
          );
        }
      }

      // Update service config
      updatedConfig.services = {
        ...updatedConfig.services,
        [service]: serviceConfig,
      };
    }

    // Handle provider toggle
    if (body.toggleProvider) {
      const { providerId, enabled } = body.toggleProvider;

      const providerIndex = updatedConfig.registeredProviders.findIndex(
        (p) => p.id === providerId
      );

      if (providerIndex === -1) {
        return NextResponse.json(
          { error: `Provider not found: ${providerId}` },
          { status: 400 }
        );
      }

      // Update provider enabled status
      updatedConfig.registeredProviders = updatedConfig.registeredProviders.map(
        (p) => (p.id === providerId ? { ...p, enabled } : p)
      );

      // If disabling a provider, check if it's used by any service
      if (!enabled) {
        const servicesUsingProvider = Object.entries(updatedConfig.services)
          .filter(
            ([, config]) =>
              config.providerId === providerId ||
              config.fallbackProviderId === providerId
          )
          .map(([service]) => service);

        if (servicesUsingProvider.length > 0) {
          console.warn(
            `[AI Providers API] Disabling provider ${providerId} used by services: ${servicesUsingProvider.join(', ')}`
          );
          // Don't block - just warn. Services will fall back or fail gracefully.
        }
      }
    }

    // Update metadata
    updatedConfig.lastUpdated = new Date().toISOString();
    updatedConfig.updatedBy = user.uid;
    updatedConfig.version = (currentConfig.version || 1) + 1;

    // Save to Firestore
    await db.doc(CONFIG_DOC_PATH).set(updatedConfig);

    return NextResponse.json({
      config: updatedConfig,
      message: 'Configuration updated successfully',
    });
  } catch (error: any) {
    console.error('[AI Providers API] PATCH error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update configuration' },
      { status: 500 }
    );
  }
}

/**
 * Get default provider status (all cloud providers available, local unavailable)
 */
function getDefaultProviderStatus(): ProviderStatus[] {
  return DEFAULT_AI_PROVIDER_CONFIG.registeredProviders.map((provider) => ({
    id: provider.id,
    name: provider.name,
    type: provider.type,
    enabled: provider.enabled,
    available: provider.type === 'cloud', // Assume cloud providers available
    services: provider.supportedServices,
    lastChecked: new Date().toISOString(),
  }));
}

/**
 * Check provider availability
 * In production, this would ping each provider's health endpoint
 */
async function checkProviderStatus(config: AIProviderConfig): Promise<ProviderStatus[]> {
  const statuses: ProviderStatus[] = [];

  for (const provider of config.registeredProviders) {
    let available = false;

    try {
      if (provider.type === 'cloud') {
        // For cloud providers, check if API key is configured
        // In production, you'd ping a health endpoint
        switch (provider.id) {
          case 'openai':
            available = !!process.env.OPENAI_API_KEY;
            break;
          case 'google':
            available = !!process.env.GOOGLE_CLOUD_API_KEY;
            break;
          case 'anthropic':
            available = !!process.env.ANTHROPIC_API_KEY;
            break;
          default:
            available = true;
        }
      } else if (provider.type === 'local' && provider.baseUrl) {
        // For local providers, try to ping the health endpoint
        // Skip in serverless environment (can't reach localhost)
        available = false;
      } else if (provider.type === 'custom' && provider.baseUrl) {
        // For custom providers, check if URL is configured
        available = !!provider.baseUrl;
      }
    } catch (error) {
      console.error(`[AI Providers API] Error checking ${provider.id}:`, error);
      available = false;
    }

    statuses.push({
      id: provider.id,
      name: provider.name,
      type: provider.type,
      enabled: provider.enabled,
      available,
      services: provider.supportedServices,
      lastChecked: new Date().toISOString(),
    });
  }

  return statuses;
}
