/**
 * Admin Fun Facts Configuration API
 *
 * GET /api/admin/insights/fun-facts - Get fun facts configuration
 * PUT /api/admin/insights/fun-facts - Update fun facts configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import InsightsFeatureService from '@/lib/services/config/InsightsFeatureService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/insights/fun-facts
 * Returns the current fun facts configuration
 */
export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const service = InsightsFeatureService.getInstance();
    const config = await service.getFunFactsConfig();

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('[Admin Fun Facts API] Error getting config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get fun facts configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/insights/fun-facts
 * Update the fun facts configuration
 *
 * Body options:
 * - Toggle enabled: { enabled: boolean }
 * - Update config: { updates: Partial<FunFactsConfig> }
 * - Update milestones: { stepMilestones: number[] } or { locationMilestones: number[] } or { activityMilestones: number[] }
 * - Update templates: { enabledTemplates: Partial<FunFactsConfig['enabledTemplates']> }
 * - Reset to defaults: { reset: true }
 * - Full config: { config: FunFactsConfig }
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
      await service.resetFunFactsToDefaults(adminId);
      const config = await service.getFunFactsConfig();
      return NextResponse.json({ success: true, config, message: 'Fun facts reset to defaults' });
    }

    if (body.config) {
      await service.saveFunFactsConfig(body.config, adminId);
      const config = await service.getFunFactsConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.enabled !== undefined) {
      await service.updateFunFactsConfig({ enabled: body.enabled }, adminId);
      const config = await service.getFunFactsConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.updates) {
      await service.updateFunFactsConfig(body.updates, adminId);
      const config = await service.getFunFactsConfig();
      return NextResponse.json({ success: true, config });
    }

    // Handle specific milestone updates
    if (body.stepMilestones || body.locationMilestones || body.activityMilestones) {
      const updates: any = {};
      if (body.stepMilestones) updates.stepMilestones = body.stepMilestones;
      if (body.locationMilestones) updates.locationMilestones = body.locationMilestones;
      if (body.activityMilestones) updates.activityMilestones = body.activityMilestones;
      await service.updateFunFactsConfig(updates, adminId);
      const config = await service.getFunFactsConfig();
      return NextResponse.json({ success: true, config });
    }

    // Handle template toggles
    if (body.enabledTemplates) {
      const currentConfig = await service.getFunFactsConfig();
      await service.updateFunFactsConfig({
        enabledTemplates: { ...currentConfig.enabledTemplates, ...body.enabledTemplates }
      }, adminId);
      const config = await service.getFunFactsConfig();
      return NextResponse.json({ success: true, config });
    }

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Admin Fun Facts API] Error updating config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update fun facts configuration' },
      { status: 500 }
    );
  }
}
