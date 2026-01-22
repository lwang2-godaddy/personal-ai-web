/**
 * Admin Mood Compass Configuration API
 *
 * GET /api/admin/insights/mood-compass - Get mood compass configuration
 * PUT /api/admin/insights/mood-compass - Update mood compass configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import InsightsFeatureService from '@/lib/services/config/InsightsFeatureService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/insights/mood-compass
 * Returns the current mood compass configuration
 */
export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const service = InsightsFeatureService.getInstance();
    const config = await service.getMoodCompassConfig();

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('[Admin Mood Compass API] Error getting config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get mood compass configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/insights/mood-compass
 * Update the mood compass configuration
 *
 * Body options:
 * - Toggle enabled: { enabled: boolean }
 * - Update config: { updates: Partial<MoodCompassConfig> }
 * - Update factors: { enabledFactors: Partial<MoodCompassConfig['enabledFactors']> }
 * - Update anomaly detection: { anomalyDetection: Partial<MoodCompassConfig['anomalyDetection']> }
 * - Reset to defaults: { reset: true }
 * - Full config: { config: MoodCompassConfig }
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
      await service.resetMoodCompassToDefaults(adminId);
      const config = await service.getMoodCompassConfig();
      return NextResponse.json({ success: true, config, message: 'Mood compass reset to defaults' });
    }

    if (body.config) {
      await service.saveMoodCompassConfig(body.config, adminId);
      const config = await service.getMoodCompassConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.enabled !== undefined) {
      await service.updateMoodCompassConfig({ enabled: body.enabled }, adminId);
      const config = await service.getMoodCompassConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.updates) {
      await service.updateMoodCompassConfig(body.updates, adminId);
      const config = await service.getMoodCompassConfig();
      return NextResponse.json({ success: true, config });
    }

    // Handle factor toggles
    if (body.enabledFactors) {
      const currentConfig = await service.getMoodCompassConfig();
      await service.updateMoodCompassConfig({
        enabledFactors: { ...currentConfig.enabledFactors, ...body.enabledFactors }
      }, adminId);
      const config = await service.getMoodCompassConfig();
      return NextResponse.json({ success: true, config });
    }

    // Handle anomaly detection updates
    if (body.anomalyDetection) {
      const currentConfig = await service.getMoodCompassConfig();
      await service.updateMoodCompassConfig({
        anomalyDetection: { ...currentConfig.anomalyDetection, ...body.anomalyDetection }
      }, adminId);
      const config = await service.getMoodCompassConfig();
      return NextResponse.json({ success: true, config });
    }

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Admin Mood Compass API] Error updating config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update mood compass configuration' },
      { status: 500 }
    );
  }
}
