import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getPromptService } from '@/lib/services/prompts/PromptService';
import { PROMPT_SERVICES, SUPPORTED_LANGUAGES } from '@/lib/models/Prompt';

/**
 * POST /api/admin/prompts/migrate
 * Import prompt configurations from YAML content or trigger Cloud Function migration
 *
 * This endpoint can work in two modes:
 * 1. With configs: Accepts pre-parsed prompts and imports them into Firestore
 * 2. Without configs: Calls the Cloud Function to migrate YAML files to Firestore
 *
 * Body:
 * - configs?: Array of { language, service, prompts } objects (optional)
 * - language?: string (e.g., 'en') - Used when calling Cloud Function
 * - overwrite?: boolean (default: false) - If true, overwrites existing configs
 *
 * Returns:
 * - success: boolean
 * - migrated: string[]
 * - skipped: string[]
 * - errors: { service: string; error: string }[]
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { configs, language = 'en', overwrite = false } = body;

    // If configs not provided, call the Cloud Function to migrate from YAML
    if (!configs || !Array.isArray(configs) || configs.length === 0) {
      return await callCloudFunctionMigration(language, overwrite);
    }

    const promptService = getPromptService();
    let migrated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of configs) {
      const { language, service, yamlContent, prompts, version } = item;

      if (!language || !service) {
        errors.push(`Missing language or service in config item`);
        continue;
      }

      // Validate language
      const validLanguage = SUPPORTED_LANGUAGES.find(l => l.code === language);
      if (!validLanguage) {
        errors.push(`Invalid language: ${language}`);
        continue;
      }

      // Validate service
      const validService = PROMPT_SERVICES.find(s => s.id === service);
      if (!validService) {
        errors.push(`Invalid service: ${service}`);
        continue;
      }

      try {
        // Check if config already exists
        const existingConfig = await promptService.getConfig(language, service);

        if (existingConfig && !overwrite) {
          skipped++;
          continue;
        }

        // If yamlContent is provided, parse it
        // Note: In a real implementation, you'd use js-yaml to parse
        // For now, we expect pre-parsed prompts object
        if (!prompts && !yamlContent) {
          errors.push(`Missing prompts data for ${service}/${language}`);
          continue;
        }

        // Use provided prompts or parse from YAML
        let promptsData = prompts;

        if (yamlContent && !prompts) {
          // Parse YAML content
          // Note: js-yaml is not available in Next.js by default
          // You would need to add it as a dependency
          errors.push(`YAML parsing not implemented. Please provide pre-parsed prompts object for ${service}/${language}`);
          continue;
        }

        // Save to Firestore
        await promptService.saveConfig(
          {
            language,
            service,
            version: version || '1.0.0',
            prompts: promptsData,
            status: 'published',
            enabled: true,
          },
          user.uid,
          overwrite ? 'Migration (overwrite)' : 'Initial migration from YAML'
        );

        migrated++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to migrate ${service}/${language}: ${message}`);
      }
    }

    return NextResponse.json({
      migrated,
      skipped,
      errors,
      total: configs.length,
    });
  } catch (error: unknown) {
    console.error('[Admin Prompts Migrate API] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to migrate prompts';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/prompts/migrate
 * Get migration status - list services/languages that have been migrated
 *
 * Returns:
 * - services: ServiceInfo[]
 * - languages: LanguageInfo[]
 * - migrated: Array of { service, language, status }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const promptService = getPromptService();
    const allConfigs = await promptService.listConfigs();

    // Build migration status matrix
    const migrated = allConfigs.map(config => ({
      service: config.service,
      language: config.language,
      status: config.status,
      enabled: config.enabled,
      lastUpdated: config.lastUpdated,
    }));

    return NextResponse.json({
      services: promptService.getServices(),
      languages: promptService.getLanguages(),
      migrated,
      total: migrated.length,
    });
  } catch (error: unknown) {
    console.error('[Admin Prompts Migrate API] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get migration status';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * Call the Cloud Function to migrate YAML prompts to Firestore
 * The Cloud Function has access to the YAML files in the functions directory
 */
async function callCloudFunctionMigration(
  language: string,
  overwrite: boolean
): Promise<NextResponse> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    return NextResponse.json(
      { error: 'Firebase project ID not configured' },
      { status: 500 }
    );
  }

  // Cloud Function URL for callable functions
  // Format: https://{region}-{project}.cloudfunctions.net/{function-name}
  const functionUrl = `https://us-central1-${projectId}.cloudfunctions.net/migrateYamlToFirestore`;

  try {
    console.log('[Migrate API] Calling Cloud Function:', functionUrl);

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          services: ['OpenAIService', 'RAGEngine', 'QueryRAGServer'],
          language,
          overwrite,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Migrate API] Cloud Function error:', response.status, errorText);
      return NextResponse.json(
        {
          success: false,
          error: `Cloud Function error: ${response.statusText}`,
          details: errorText,
        },
        { status: response.status >= 400 && response.status < 500 ? response.status : 500 }
      );
    }

    const result = await response.json();
    console.log('[Migrate API] Cloud Function result:', result);

    // Cloud Functions return { result: { ... } } for callable functions
    const migrationResult = result.result || result;

    return NextResponse.json({
      success: migrationResult.success ?? true,
      migrated: migrationResult.migrated || [],
      skipped: migrationResult.skipped || [],
      errors: migrationResult.errors || [],
    });
  } catch (error: unknown) {
    console.error('[Migrate API] Error calling Cloud Function:', error);
    const message = error instanceof Error ? error.message : 'Failed to call migration function';
    return NextResponse.json(
      {
        success: false,
        error: message,
        migrated: [],
        skipped: [],
        errors: [{ service: 'all', error: message }],
      },
      { status: 500 }
    );
  }
}
