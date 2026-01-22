/**
 * Admin Insights Configuration API
 *
 * GET /api/admin/insights - Get current insights configuration
 * PUT /api/admin/insights - Update insights configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import InsightsConfigService from '@/lib/services/config/InsightsConfigService';
import { InsightsAdminConfig } from '@/lib/models/InsightsConfig';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/insights
 * Returns the current insights admin configuration
 */
export async function GET(request: NextRequest) {
  // Verify admin access
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const service = InsightsConfigService.getInstance();
    const config = await service.getConfig();
    const analytics = await service.getAnalytics();

    return NextResponse.json({
      config,
      analytics,
    });
  } catch (error: any) {
    console.error('[Admin Insights API] Error getting config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get insights configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/insights
 * Update the insights admin configuration
 *
 * Body options:
 * - Full config update: { config: InsightsAdminConfig }
 * - Toggle enabled: { enabled: boolean }
 * - Update category: { category: string, updates: Partial<InsightsAdminCategoryConfig> }
 * - Update home feed: { homeFeed: Partial<InsightsHomeFeedConfig> }
 * - Update rate limits: { maxPostsPerUserPerDay: number, globalCooldownHours: number }
 * - Reset to defaults: { reset: true }
 */
export async function PUT(request: NextRequest) {
  // Verify admin access
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const service = InsightsConfigService.getInstance();
    const adminId = user.uid;

    // Handle different update types
    if (body.reset === true) {
      // Reset to defaults
      await service.resetToDefaults(adminId);
      const config = await service.getConfig();
      return NextResponse.json({ success: true, config, message: 'Configuration reset to defaults' });
    }

    if (body.config) {
      // Full config update
      await service.saveConfig(body.config as InsightsAdminConfig, adminId);
      const config = await service.getConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.enabled !== undefined) {
      // Toggle global enabled
      await service.setEnabled(body.enabled, adminId);
      const config = await service.getConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.category && body.updates) {
      // Update specific category
      await service.updateCategory(body.category, body.updates, adminId);
      const config = await service.getConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.homeFeed) {
      // Update home feed config
      await service.updateHomeFeed(body.homeFeed, adminId);
      const config = await service.getConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.maxPostsPerUserPerDay !== undefined || body.globalCooldownHours !== undefined) {
      // Update rate limits
      const config = await service.getConfig();
      await service.updateRateLimits(
        body.maxPostsPerUserPerDay ?? config.maxPostsPerUserPerDay,
        body.globalCooldownHours ?? config.globalCooldownHours,
        adminId
      );
      const updatedConfig = await service.getConfig();
      return NextResponse.json({ success: true, config: updatedConfig });
    }

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Admin Insights API] Error updating config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update insights configuration' },
      { status: 500 }
    );
  }
}
