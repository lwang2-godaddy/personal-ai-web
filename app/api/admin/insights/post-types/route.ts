/**
 * Admin Post Types Configuration API
 *
 * GET /api/admin/insights/post-types - Get post types configuration
 * PUT /api/admin/insights/post-types - Update post types configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import InsightsFeatureService from '@/lib/services/config/InsightsFeatureService';
import { InsightsPostType } from '@/lib/models/InsightsFeatureConfig';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/insights/post-types
 * Returns the current post types configuration and analytics
 */
export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const service = InsightsFeatureService.getInstance();
    const config = await service.getPostTypesConfig();
    const analytics = await service.getPostTypeAnalytics();

    return NextResponse.json({
      config,
      analytics,
    });
  } catch (error: any) {
    console.error('[Admin Post Types API] Error getting config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get post types configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/insights/post-types
 * Update the post types configuration
 *
 * Body options:
 * - Toggle post type: { postType: string, enabled: boolean }
 * - Update post type: { postType: string, updates: Partial<PostTypeConfig> }
 * - Reset to defaults: { reset: true }
 * - Full config: { config: InsightsPostTypesConfig }
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
      await service.resetPostTypesToDefaults(adminId);
      const config = await service.getPostTypesConfig();
      return NextResponse.json({ success: true, config, message: 'Post types reset to defaults' });
    }

    if (body.config) {
      await service.savePostTypesConfig(body.config, adminId);
      const config = await service.getPostTypesConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.postType && body.enabled !== undefined) {
      await service.togglePostType(body.postType as InsightsPostType, body.enabled, adminId);
      const config = await service.getPostTypesConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.postType && body.updates) {
      await service.updatePostType(body.postType as InsightsPostType, body.updates, adminId);
      const config = await service.getPostTypesConfig();
      return NextResponse.json({ success: true, config });
    }

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Admin Post Types API] Error updating config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update post types configuration' },
      { status: 500 }
    );
  }
}
