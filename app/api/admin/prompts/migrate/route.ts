import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getPromptService } from '@/lib/services/prompts/PromptService';
import { PROMPT_SERVICES, SUPPORTED_LANGUAGES } from '@/lib/models/Prompt';

/**
 * POST /api/admin/prompts/migrate
 * Import prompt configurations from YAML content
 *
 * This endpoint accepts YAML content and imports it into Firestore.
 * Use this to migrate from YAML files to Firestore-based prompt management.
 *
 * Body:
 * - configs: Array of { language, service, yamlContent } objects
 * - overwrite?: boolean (default: false) - If true, overwrites existing configs
 *
 * Returns:
 * - migrated: number
 * - skipped: number
 * - errors: string[]
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { configs, overwrite = false } = body;

    if (!configs || !Array.isArray(configs) || configs.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: configs (array of { language, service, yamlContent })' },
        { status: 400 }
      );
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
