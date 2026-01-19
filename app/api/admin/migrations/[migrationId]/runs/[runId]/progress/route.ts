/**
 * Migration Run Progress API Route
 * GET - Get progress for polling during active migrations
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { MigrationProgressResponse, MigrationRun } from '@/lib/models/Migration';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ migrationId: string; runId: string }>;
}

/**
 * GET /api/admin/migrations/[migrationId]/runs/[runId]/progress
 * Get progress for polling during active migrations
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const { migrationId, runId } = await params;

    const db = getAdminFirestore();
    const runDoc = await db.collection('migrationRuns').doc(runId).get();

    if (!runDoc.exists) {
      return NextResponse.json({ error: 'Migration run not found' }, { status: 404 });
    }

    const runData = runDoc.data() as Omit<MigrationRun, 'id'>;

    if (runData.migrationId !== migrationId) {
      return NextResponse.json({ error: 'Run does not belong to this migration' }, { status: 400 });
    }

    // Calculate duration if running
    let durationMs = runData.durationMs;
    if (runData.status === 'running' && runData.startedAt) {
      durationMs = Date.now() - new Date(runData.startedAt).getTime();
    }

    const response: MigrationProgressResponse = {
      status: runData.status,
      progress: runData.progress,
      result: runData.result,
      durationMs,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Migration Progress API] Error fetching progress:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch migration progress' },
      { status: 500 }
    );
  }
}
