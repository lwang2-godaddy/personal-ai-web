/**
 * Individual Migration Run API Route
 * GET - Get run details
 * DELETE - Cancel running migration
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { getMigrationById } from '@/lib/registry/migrations';
import { MigrationRun } from '@/lib/models/Migration';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ migrationId: string; runId: string }>;
}

/**
 * GET /api/admin/migrations/[migrationId]/runs/[runId]
 * Get run details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const { migrationId, runId } = await params;

    // Get migration definition from registry
    const migration = getMigrationById(migrationId);
    if (!migration) {
      return NextResponse.json({ error: 'Migration not found' }, { status: 404 });
    }

    const db = getAdminFirestore();
    const runDoc = await db.collection('migrationRuns').doc(runId).get();

    if (!runDoc.exists) {
      return NextResponse.json({ error: 'Migration run not found' }, { status: 404 });
    }

    const runData = runDoc.data();
    if (runData?.migrationId !== migrationId) {
      return NextResponse.json({ error: 'Run does not belong to this migration' }, { status: 400 });
    }

    const run: MigrationRun = {
      id: runDoc.id,
      ...runData,
    } as MigrationRun;

    return NextResponse.json({ run });
  } catch (error: any) {
    console.error('[Migration Run API] Error fetching run:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch migration run' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/migrations/[migrationId]/runs/[runId]
 * Cancel running migration
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const { migrationId, runId } = await params;

    // Get migration definition from registry
    const migration = getMigrationById(migrationId);
    if (!migration) {
      return NextResponse.json({ error: 'Migration not found' }, { status: 404 });
    }

    const db = getAdminFirestore();
    const runRef = db.collection('migrationRuns').doc(runId);
    const runDoc = await runRef.get();

    if (!runDoc.exists) {
      return NextResponse.json({ error: 'Migration run not found' }, { status: 404 });
    }

    const runData = runDoc.data();
    if (runData?.migrationId !== migrationId) {
      return NextResponse.json({ error: 'Run does not belong to this migration' }, { status: 400 });
    }

    if (runData?.status !== 'running') {
      return NextResponse.json(
        { error: 'Can only cancel running migrations' },
        { status: 400 }
      );
    }

    // Update status to cancelled
    const now = new Date().toISOString();
    const startedAt = new Date(runData.startedAt);
    const durationMs = Date.now() - startedAt.getTime();

    // Build result object, excluding undefined values
    const result: Record<string, any> = {
      success: false,
      usersProcessed: runData.progress?.current || 0,
      usersCreated: 0,
      usersSkipped: 0,
      errors: [
        {
          message: `Migration cancelled by ${user.email || user.uid}`,
          timestamp: now,
        },
      ],
    };

    // Only add lastProcessedUserId if it exists
    if (runData.progress?.lastProcessedUserId) {
      result.lastProcessedUserId = runData.progress.lastProcessedUserId;
    }

    await runRef.update({
      status: 'cancelled',
      completedAt: now,
      durationMs,
      result,
    });

    return NextResponse.json({
      success: true,
      message: 'Migration cancelled',
    });
  } catch (error: any) {
    console.error('[Migration Run API] Error cancelling run:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel migration run' },
      { status: 500 }
    );
  }
}
