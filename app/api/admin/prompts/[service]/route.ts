import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getPromptService } from '@/lib/services/prompts/PromptService';

interface RouteParams {
  params: Promise<{ service: string }>;
}

/**
 * GET /api/admin/prompts/[service]
 * Get prompt configuration for a specific service
 *
 * Query params:
 * - language: string (required, e.g., 'en')
 *
 * Returns:
 * - config: FirestorePromptConfig | null
 * - versions: PromptVersion[] (recent version history)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { service } = await params;
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language');

    if (!language) {
      return NextResponse.json(
        { error: 'Missing required query param: language' },
        { status: 400 }
      );
    }

    const promptService = getPromptService();
    const config = await promptService.getConfig(language, service);
    const versions = config
      ? await promptService.getVersionHistory(service, language, undefined, 10)
      : [];

    return NextResponse.json({
      config,
      versions,
    });
  } catch (error: unknown) {
    console.error('[Admin Prompts API] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch prompt config';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/prompts/[service]
 * Update a prompt configuration or specific prompt
 *
 * Body (for updating config):
 * - language: string
 * - status?: 'draft' | 'published' | 'archived'
 * - enabled?: boolean
 * - notes?: string
 *
 * Body (for updating specific prompt):
 * - language: string
 * - promptId: string
 * - updates: Partial<PromptDefinition>
 * - notes?: string
 *
 * Returns:
 * - config: FirestorePromptConfig
 * - version?: PromptVersion (if prompt was updated)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { service } = await params;
    const body = await request.json();
    const { language, promptId, updates, status, enabled, notes } = body;

    if (!language) {
      return NextResponse.json(
        { error: 'Missing required field: language' },
        { status: 400 }
      );
    }

    const promptService = getPromptService();

    // Check if config exists
    const existingConfig = await promptService.getConfig(language, service);
    if (!existingConfig) {
      return NextResponse.json(
        { error: `Prompt config not found: ${service}/${language}` },
        { status: 404 }
      );
    }

    // Update specific prompt
    if (promptId && updates) {
      const result = await promptService.updatePrompt(
        language,
        service,
        promptId,
        updates,
        user.uid,
        notes
      );

      return NextResponse.json({
        config: result.config,
        version: result.version,
      });
    }

    // Update config-level properties
    if (status !== undefined) {
      const config = await promptService.setStatus(language, service, status, user.uid);
      return NextResponse.json({ config });
    }

    if (enabled !== undefined) {
      const config = await promptService.setEnabled(language, service, enabled, user.uid);
      return NextResponse.json({ config });
    }

    return NextResponse.json(
      { error: 'No updates provided. Specify promptId+updates, status, or enabled.' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('[Admin Prompts API] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update prompt config';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/prompts/[service]
 * Delete a prompt configuration
 *
 * Query params:
 * - language: string (required)
 *
 * Returns:
 * - success: boolean
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { service } = await params;
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language');

    if (!language) {
      return NextResponse.json(
        { error: 'Missing required query param: language' },
        { status: 400 }
      );
    }

    const promptService = getPromptService();
    await promptService.deleteConfig(language, service);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[Admin Prompts API] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete prompt config';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
