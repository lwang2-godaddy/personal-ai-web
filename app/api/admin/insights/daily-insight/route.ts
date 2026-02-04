/**
 * Admin Daily Insight Configuration API
 *
 * GET /api/admin/insights/daily-insight - Get daily insight configuration
 * PUT /api/admin/insights/daily-insight - Update daily insight configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import InsightsFeatureService from '@/lib/services/config/InsightsFeatureService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/insights/daily-insight
 * Returns the current daily insight configuration
 */
export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const service = InsightsFeatureService.getInstance();
    const config = await service.getDailyInsightConfig();

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('[Admin Daily Insight API] Error getting config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get daily insight configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/insights/daily-insight
 * Update the daily insight configuration
 *
 * Body options:
 * - Toggle enabled: { enabled: boolean }
 * - Update config: { updates: Partial<DailyInsightConfig> }
 * - Reset to defaults: { reset: true }
 * - Full config: { config: DailyInsightConfig }
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
      await service.resetDailyInsightToDefaults(adminId);
      const config = await service.getDailyInsightConfig();
      return NextResponse.json({ success: true, config, message: 'Daily insight reset to defaults' });
    }

    if (body.config) {
      await service.saveDailyInsightConfig(body.config, adminId);
      const config = await service.getDailyInsightConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.enabled !== undefined) {
      await service.updateDailyInsightConfig({ enabled: body.enabled }, adminId);
      const config = await service.getDailyInsightConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.updates) {
      await service.updateDailyInsightConfig(body.updates, adminId);
      const config = await service.getDailyInsightConfig();
      return NextResponse.json({ success: true, config });
    }

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Admin Daily Insight API] Error updating config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update daily insight configuration' },
      { status: 500 }
    );
  }
}
