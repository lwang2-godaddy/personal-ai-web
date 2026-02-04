/**
 * Admin This Day in History Configuration API
 *
 * GET /api/admin/insights/this-day - Get this day configuration
 * PUT /api/admin/insights/this-day - Update this day configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import InsightsFeatureService from '@/lib/services/config/InsightsFeatureService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/insights/this-day
 * Returns the current this day in history configuration
 */
export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const service = InsightsFeatureService.getInstance();
    const config = await service.getThisDayConfig();

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('[Admin This Day API] Error getting config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get this day configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/insights/this-day
 * Update the this day in history configuration
 *
 * Body options:
 * - Toggle enabled: { enabled: boolean }
 * - Update config: { updates: Partial<ThisDayConfig> }
 * - Reset to defaults: { reset: true }
 * - Full config: { config: ThisDayConfig }
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
      await service.resetThisDayToDefaults(adminId);
      const config = await service.getThisDayConfig();
      return NextResponse.json({ success: true, config, message: 'This day in history reset to defaults' });
    }

    if (body.config) {
      await service.saveThisDayConfig(body.config, adminId);
      const config = await service.getThisDayConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.enabled !== undefined) {
      await service.updateThisDayConfig({ enabled: body.enabled }, adminId);
      const config = await service.getThisDayConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.updates) {
      await service.updateThisDayConfig(body.updates, adminId);
      const config = await service.getThisDayConfig();
      return NextResponse.json({ success: true, config });
    }

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Admin This Day API] Error updating config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update this day configuration' },
      { status: 500 }
    );
  }
}
