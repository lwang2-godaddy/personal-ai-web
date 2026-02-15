/**
 * Admin Memory Builder Configuration API
 *
 * GET /api/admin/memory-builder - Get main configuration
 * PUT /api/admin/memory-builder - Update configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { memoryBuilderConfigService } from '@/lib/services/config/MemoryBuilderConfigService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/memory-builder
 * Returns the current Memory Builder configuration
 */
export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const config = await memoryBuilderConfigService.getConfig();

    return NextResponse.json({
      config,
    });
  } catch (error: any) {
    console.error('[Admin Memory Builder API] Error getting config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get Memory Builder configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/memory-builder
 * Update the Memory Builder configuration
 *
 * Body options:
 * - Toggle enabled: { enabled: boolean }
 * - Full config: { config: MemoryBuilderConfig }
 */
export async function PUT(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const adminId = user.uid;

    // Handle different update types
    if (body.enabled !== undefined && Object.keys(body).length === 1) {
      await memoryBuilderConfigService.toggleEnabled(body.enabled, adminId);
      const config = await memoryBuilderConfigService.getConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.config) {
      await memoryBuilderConfigService.saveConfig(body.config, adminId);
      const config = await memoryBuilderConfigService.getConfig();
      return NextResponse.json({ success: true, config });
    }

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Admin Memory Builder API] Error updating config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update Memory Builder configuration' },
      { status: 500 }
    );
  }
}
