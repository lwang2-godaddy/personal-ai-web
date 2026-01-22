/**
 * Admin Memory Companion Configuration API
 *
 * GET /api/admin/insights/memory-companion - Get memory companion configuration
 * PUT /api/admin/insights/memory-companion - Update memory companion configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import InsightsFeatureService from '@/lib/services/config/InsightsFeatureService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/insights/memory-companion
 * Returns the current memory companion configuration
 */
export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const service = InsightsFeatureService.getInstance();
    const config = await service.getMemoryCompanionConfig();

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('[Admin Memory Companion API] Error getting config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get memory companion configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/insights/memory-companion
 * Update the memory companion configuration
 *
 * Body options:
 * - Toggle enabled: { enabled: boolean }
 * - Update config: { updates: Partial<MemoryCompanionConfig> }
 * - Update triggers: { enabledTriggers: Partial<MemoryCompanionConfig['enabledTriggers']> }
 * - Reset to defaults: { reset: true }
 * - Full config: { config: MemoryCompanionConfig }
 */
export async function PUT(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const service = InsightsFeatureService.getInstance();
    const adminId = user.uid;

    // Handle different update types
    if (body.reset === true) {
      await service.resetMemoryCompanionToDefaults(adminId);
      const config = await service.getMemoryCompanionConfig();
      return NextResponse.json({ success: true, config, message: 'Memory companion reset to defaults' });
    }

    if (body.config) {
      await service.saveMemoryCompanionConfig(body.config, adminId);
      const config = await service.getMemoryCompanionConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.enabled !== undefined) {
      await service.updateMemoryCompanionConfig({ enabled: body.enabled }, adminId);
      const config = await service.getMemoryCompanionConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.updates) {
      await service.updateMemoryCompanionConfig(body.updates, adminId);
      const config = await service.getMemoryCompanionConfig();
      return NextResponse.json({ success: true, config });
    }

    // Handle trigger toggles
    if (body.enabledTriggers) {
      const currentConfig = await service.getMemoryCompanionConfig();
      await service.updateMemoryCompanionConfig({
        enabledTriggers: { ...currentConfig.enabledTriggers, ...body.enabledTriggers }
      }, adminId);
      const config = await service.getMemoryCompanionConfig();
      return NextResponse.json({ success: true, config });
    }

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Admin Memory Companion API] Error updating config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update memory companion configuration' },
      { status: 500 }
    );
  }
}
