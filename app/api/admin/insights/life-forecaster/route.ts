/**
 * Admin Life Forecaster Configuration API
 *
 * GET /api/admin/insights/life-forecaster - Get life forecaster configuration
 * PUT /api/admin/insights/life-forecaster - Update life forecaster configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import InsightsFeatureService from '@/lib/services/config/InsightsFeatureService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/insights/life-forecaster
 * Returns the current life forecaster configuration
 */
export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const service = InsightsFeatureService.getInstance();
    const config = await service.getLifeForecasterConfig();

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('[Admin Life Forecaster API] Error getting config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get life forecaster configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/insights/life-forecaster
 * Update the life forecaster configuration
 *
 * Body options:
 * - Toggle enabled: { enabled: boolean }
 * - Update config: { updates: Partial<LifeForecasterConfig> }
 * - Update categories: { enabledCategories: string[] }
 * - Reset to defaults: { reset: true }
 * - Full config: { config: LifeForecasterConfig }
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
      await service.resetLifeForecasterToDefaults(adminId);
      const config = await service.getLifeForecasterConfig();
      return NextResponse.json({ success: true, config, message: 'Life forecaster reset to defaults' });
    }

    if (body.config) {
      await service.saveLifeForecasterConfig(body.config, adminId);
      const config = await service.getLifeForecasterConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.enabled !== undefined) {
      await service.updateLifeForecasterConfig({ enabled: body.enabled }, adminId);
      const config = await service.getLifeForecasterConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.updates) {
      await service.updateLifeForecasterConfig(body.updates, adminId);
      const config = await service.getLifeForecasterConfig();
      return NextResponse.json({ success: true, config });
    }

    // Handle categories update
    if (body.enabledCategories) {
      await service.updateLifeForecasterConfig({ enabledCategories: body.enabledCategories }, adminId);
      const config = await service.getLifeForecasterConfig();
      return NextResponse.json({ success: true, config });
    }

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Admin Life Forecaster API] Error updating config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update life forecaster configuration' },
      { status: 500 }
    );
  }
}
