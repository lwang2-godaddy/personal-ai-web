import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getPromptService } from '@/lib/services/prompts/PromptService';

/**
 * GET /api/admin/prompts
 * List all prompt configurations
 *
 * Query params:
 * - language: string (optional, e.g., 'en', 'es')
 * - service: string (optional, e.g., 'SentimentAnalysisService')
 *
 * Returns:
 * - configs: FirestorePromptConfig[]
 * - total: number
 * - services: ServiceInfo[]
 * - languages: LanguageInfo[]
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || undefined;
    const service = searchParams.get('service') || undefined;

    const promptService = getPromptService();
    const configs = await promptService.listConfigs(language, service);

    return NextResponse.json({
      configs,
      total: configs.length,
      services: promptService.getServices(),
      languages: promptService.getLanguages(),
    });
  } catch (error: unknown) {
    console.error('[Admin Prompts API] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch prompts';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/prompts
 * Create a new prompt configuration
 *
 * Body:
 * - language: string
 * - service: string
 * - version: string
 * - prompts: Record<string, PromptDefinition>
 * - status: 'draft' | 'published' | 'archived'
 * - enabled: boolean
 * - notes?: string
 *
 * Returns:
 * - config: FirestorePromptConfig
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { language, service, version, prompts, status, enabled, notes } = body;

    // Validate required fields
    if (!language || !service || !version || !prompts) {
      return NextResponse.json(
        { error: 'Missing required fields: language, service, version, prompts' },
        { status: 400 }
      );
    }

    const promptService = getPromptService();

    // Check if config already exists
    const existingConfig = await promptService.getConfig(language, service);
    if (existingConfig) {
      return NextResponse.json(
        { error: `Prompt config already exists for ${service}/${language}. Use PATCH to update.` },
        { status: 409 }
      );
    }

    const config = await promptService.saveConfig(
      {
        language,
        service,
        version,
        prompts,
        status: status || 'draft',
        enabled: enabled ?? true,
      },
      user.uid,
      notes
    );

    return NextResponse.json({ config }, { status: 201 });
  } catch (error: unknown) {
    console.error('[Admin Prompts API] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create prompt config';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
