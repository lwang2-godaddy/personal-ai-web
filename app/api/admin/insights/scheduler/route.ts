/**
 * Admin Insights Scheduler Configuration API
 *
 * GET /api/admin/insights/scheduler - Get scheduler configuration
 * PUT /api/admin/insights/scheduler - Update scheduler configuration
 *
 * Note: Schedule changes require redeploying Firebase Cloud Functions to take effect.
 * The configuration is stored in Firestore at config/insightsSchedulerSettings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { InsightsSchedulerConfig, DEFAULT_SCHEDULER_CONFIG } from '@/lib/models/InsightsFeatureConfig';

export const dynamic = 'force-dynamic';

const COLLECTION = 'config';
const DOC_ID = 'insightsSchedulerSettings';

/**
 * GET /api/admin/insights/scheduler
 * Returns the current scheduler configuration
 */
export async function GET(request: NextRequest) {
  const { response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const db = getAdminFirestore();
    const doc = await db.collection(COLLECTION).doc(DOC_ID).get();

    if (!doc.exists) {
      // Return defaults if no config exists yet
      return NextResponse.json(DEFAULT_SCHEDULER_CONFIG);
    }

    return NextResponse.json(doc.data() as InsightsSchedulerConfig);
  } catch (error: any) {
    console.error('[Admin Scheduler API] Error getting config:', error);
    // Return defaults on error
    return NextResponse.json(DEFAULT_SCHEDULER_CONFIG);
  }
}

/**
 * PUT /api/admin/insights/scheduler
 * Update the scheduler configuration
 *
 * Body options:
 * - Full config: { morningHour, afternoonHour, eveningHour, ... }
 * - Reset to defaults: { reset: true }
 */
export async function PUT(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const db = getAdminFirestore();
    const adminId = user.uid;

    // Handle reset
    if (body.reset === true) {
      const defaultConfig: InsightsSchedulerConfig = {
        ...DEFAULT_SCHEDULER_CONFIG,
        lastUpdatedAt: new Date().toISOString(),
        lastUpdatedBy: adminId,
      };

      await db.collection(COLLECTION).doc(DOC_ID).set(defaultConfig);

      return NextResponse.json({
        success: true,
        config: defaultConfig,
        message: 'Scheduler reset to defaults',
      });
    }

    // Generate cron expression from hours
    const morningHour = body.morningHour ?? DEFAULT_SCHEDULER_CONFIG.morningHour;
    const afternoonHour = body.afternoonHour ?? DEFAULT_SCHEDULER_CONFIG.afternoonHour;
    const eveningHour = body.eveningHour ?? DEFAULT_SCHEDULER_CONFIG.eveningHour;
    const cronExpression = `0 ${morningHour},${afternoonHour},${eveningHour} * * *`;

    // Build config object
    const config: InsightsSchedulerConfig = {
      version: body.version || DEFAULT_SCHEDULER_CONFIG.version,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: adminId,
      morningHour,
      afternoonHour,
      eveningHour,
      timezone: 'UTC',
      cronExpression,
    };

    await db.collection(COLLECTION).doc(DOC_ID).set(config, { merge: true });

    return NextResponse.json({
      success: true,
      config,
      message: 'Scheduler configuration saved. Remember to redeploy Cloud Functions.',
    });
  } catch (error: any) {
    console.error('[Admin Scheduler API] Error updating config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update scheduler configuration' },
      { status: 500 }
    );
  }
}
