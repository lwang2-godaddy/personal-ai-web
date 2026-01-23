/**
 * Admin Life Keywords Configuration API
 *
 * GET /api/admin/insights/life-keywords - Get life keywords configuration
 * PUT /api/admin/insights/life-keywords - Update life keywords configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import InsightsFeatureService from '@/lib/services/config/InsightsFeatureService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/insights/life-keywords
 * Returns the current life keywords configuration and analytics
 */
export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const service = InsightsFeatureService.getInstance();

    // Check if analytics are requested
    const { searchParams } = new URL(request.url);
    const includeAnalytics = searchParams.get('analytics') === 'true';

    const config = await service.getLifeKeywordsConfig();

    if (includeAnalytics) {
      const analytics = await service.getLifeKeywordsAnalytics();
      return NextResponse.json({ config, analytics });
    }

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('[Admin Life Keywords API] Error getting config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get life keywords configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/insights/life-keywords
 * Update the life keywords configuration
 *
 * Body options:
 * - Toggle enabled: { enabled: boolean }
 * - Update config: { updates: Partial<LifeKeywordsConfig> }
 * - Update periods: { enabledPeriods: { weekly: boolean, monthly: boolean, ... } }
 * - Update categories: { enabledCategories: { health: boolean, activity: boolean, ... } }
 * - Reset to defaults: { reset: true }
 * - Full config: { config: LifeKeywordsConfig }
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
      await service.resetLifeKeywordsToDefaults(adminId);
      const config = await service.getLifeKeywordsConfig();
      return NextResponse.json({ success: true, config, message: 'Life keywords reset to defaults' });
    }

    if (body.config) {
      await service.saveLifeKeywordsConfig(body.config, adminId);
      const config = await service.getLifeKeywordsConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.enabled !== undefined) {
      await service.updateLifeKeywordsConfig({ enabled: body.enabled }, adminId);
      const config = await service.getLifeKeywordsConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.updates) {
      await service.updateLifeKeywordsConfig(body.updates, adminId);
      const config = await service.getLifeKeywordsConfig();
      return NextResponse.json({ success: true, config });
    }

    // Handle periods update
    if (body.enabledPeriods) {
      await service.updateLifeKeywordsConfig({ enabledPeriods: body.enabledPeriods }, adminId);
      const config = await service.getLifeKeywordsConfig();
      return NextResponse.json({ success: true, config });
    }

    // Handle categories update
    if (body.enabledCategories) {
      await service.updateLifeKeywordsConfig({ enabledCategories: body.enabledCategories }, adminId);
      const config = await service.getLifeKeywordsConfig();
      return NextResponse.json({ success: true, config });
    }

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Admin Life Keywords API] Error updating config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update life keywords configuration' },
      { status: 500 }
    );
  }
}
