import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { DEFAULT_TEST_SCHEDULER_CONFIG } from '@/lib/models/TestRun';
import type { TestSchedulerConfig } from '@/lib/models/TestRun';

export const dynamic = 'force-dynamic';

const COLLECTION = 'config';
const DOC_ID = 'testSchedulerSettings';

export async function GET(request: NextRequest) {
  const { response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const db = getAdminFirestore();
    const doc = await db.collection(COLLECTION).doc(DOC_ID).get();

    if (!doc.exists) {
      return NextResponse.json(DEFAULT_TEST_SCHEDULER_CONFIG);
    }

    return NextResponse.json(doc.data() as TestSchedulerConfig);
  } catch (error: any) {
    console.error('[Test Scheduler API] Error getting config:', error);
    return NextResponse.json(DEFAULT_TEST_SCHEDULER_CONFIG);
  }
}

export async function PUT(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const db = getAdminFirestore();
    const adminId = user.uid;

    if (body.reset === true) {
      const config: TestSchedulerConfig = {
        ...DEFAULT_TEST_SCHEDULER_CONFIG,
        lastUpdatedAt: new Date().toISOString(),
        lastUpdatedBy: adminId,
      };

      await db.collection(COLLECTION).doc(DOC_ID).set(config);

      return NextResponse.json({
        success: true,
        config,
        message: 'Test scheduler reset to defaults',
      });
    }

    const config: TestSchedulerConfig = {
      version: body.version || '1.0.0',
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: adminId,
      integration: {
        enabled: body.integration?.enabled ?? false,
        intervalHours: body.integration?.intervalHours ?? 24,
        preferredHourUTC: body.integration?.preferredHourUTC ?? 6,
        filter: body.integration?.filter || undefined,
        skipE2E: body.integration?.skipE2E ?? undefined,
        lastRunAt: body.integration?.lastRunAt,
      },
      maestro: {
        enabled: body.maestro?.enabled ?? false,
        intervalHours: body.maestro?.intervalHours ?? 168,
        preferredHourUTC: body.maestro?.preferredHourUTC ?? 6,
        branch: body.maestro?.branch || 'develop',
        lastRunAt: body.maestro?.lastRunAt,
      },
    };

    await db.collection(COLLECTION).doc(DOC_ID).set(config, { merge: true });

    return NextResponse.json({
      success: true,
      config,
      message: 'Test scheduler configuration saved.',
    });
  } catch (error: any) {
    console.error('[Test Scheduler API] Error updating config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update scheduler configuration' },
      { status: 500 },
    );
  }
}
