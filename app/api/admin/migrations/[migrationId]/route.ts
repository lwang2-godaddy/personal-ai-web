/**
 * Individual Migration API Route
 * GET - Get migration details
 * POST - Trigger migration with options
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { getMigrationById } from '@/lib/registry/migrations';
import {
  MigrationRun,
  MigrationRunOptions,
  TriggerMigrationResponse,
} from '@/lib/models/Migration';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/api/firebase/config';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ migrationId: string }>;
}

/**
 * GET /api/admin/migrations/[migrationId]
 * Get migration details with recent runs
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const { migrationId } = await params;

    // Get migration definition from registry
    const migration = getMigrationById(migrationId);
    if (!migration) {
      return NextResponse.json({ error: 'Migration not found' }, { status: 404 });
    }

    // Get recent runs for this migration
    const db = getAdminFirestore();
    const runsSnapshot = await db
      .collection('migrationRuns')
      .where('migrationId', '==', migrationId)
      .orderBy('startedAt', 'desc')
      .limit(20)
      .get();

    const runs: MigrationRun[] = runsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MigrationRun[];

    // Calculate stats
    const stats = {
      totalRuns: runs.length,
      successfulRuns: runs.filter((run) => run.status === 'completed').length,
      failedRuns: runs.filter((run) => run.status === 'failed' || run.status === 'partial').length,
      lastRunAt: runs.length > 0 ? runs[0].startedAt : undefined,
      lastRunStatus: runs.length > 0 ? runs[0].status : undefined,
    };

    return NextResponse.json({
      migration,
      stats,
      recentRuns: runs,
    });
  } catch (error: any) {
    console.error('[Migration API] Error fetching migration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch migration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/migrations/[migrationId]
 * Trigger migration with options
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const { migrationId } = await params;
    const body = await request.json();
    const options: MigrationRunOptions = body.options || {
      dryRun: true,
      batchSize: 100,
    };

    // Get migration definition from registry
    const migration = getMigrationById(migrationId);
    if (!migration) {
      return NextResponse.json({ error: 'Migration not found' }, { status: 404 });
    }

    // Check if migration is already running
    const db = getAdminFirestore();
    const activeRunsSnapshot = await db
      .collection('migrationRuns')
      .where('migrationId', '==', migrationId)
      .where('status', '==', 'running')
      .limit(1)
      .get();

    if (!activeRunsSnapshot.empty) {
      return NextResponse.json(
        { error: 'Migration is already running', runId: activeRunsSnapshot.docs[0].id },
        { status: 409 }
      );
    }

    // Create migration run document
    const runRef = db.collection('migrationRuns').doc();
    const runData: Omit<MigrationRun, 'id'> = {
      migrationId,
      status: 'running',
      startedAt: new Date().toISOString(),
      options,
      triggeredBy: user.uid,
      triggeredByEmail: user.email || undefined,
      progress: {
        current: 0,
        total: 0,
        phase: 'Starting...',
      },
    };

    await runRef.set(runData);

    // Trigger the Cloud Function
    if (migration.type === 'callable') {
      try {
        const functions = getFunctions(app);
        const migrationFn = httpsCallable(functions, migration.endpoint);

        // Call the function asynchronously (don't await)
        // The function will update Firestore as it progresses
        migrationFn({
          runId: runRef.id,
          options,
          triggeredBy: user.uid,
        }).catch(async (error) => {
          console.error('[Migration API] Cloud Function error:', error);
          // Update run status to failed
          await runRef.update({
            status: 'failed',
            completedAt: new Date().toISOString(),
            result: {
              success: false,
              usersProcessed: 0,
              usersCreated: 0,
              usersSkipped: 0,
              errors: [
                {
                  message: error.message || 'Cloud Function execution failed',
                  timestamp: new Date().toISOString(),
                },
              ],
            },
          });
        });
      } catch (callError: any) {
        // Update run status to failed
        await runRef.update({
          status: 'failed',
          completedAt: new Date().toISOString(),
          result: {
            success: false,
            usersProcessed: 0,
            usersCreated: 0,
            usersSkipped: 0,
            errors: [
              {
                message: callError.message || 'Failed to trigger Cloud Function',
                timestamp: new Date().toISOString(),
              },
            ],
          },
        });

        return NextResponse.json({ error: 'Failed to trigger migration' }, { status: 500 });
      }
    } else {
      // HTTP type - not implemented yet
      return NextResponse.json({ error: 'HTTP migrations not yet supported' }, { status: 501 });
    }

    const response: TriggerMigrationResponse = {
      success: true,
      runId: runRef.id,
      message: options.dryRun
        ? 'Migration started in dry run mode'
        : 'Migration started',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error('[Migration API] Error triggering migration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger migration' },
      { status: 500 }
    );
  }
}
