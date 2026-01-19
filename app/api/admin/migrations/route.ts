/**
 * Migrations API Route
 * GET - List all migrations with stats and recent runs
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { MIGRATION_REGISTRY } from '@/lib/registry/migrations';
import {
  MigrationWithStats,
  MigrationRun,
  MigrationStats,
  MigrationsListResponse,
} from '@/lib/models/Migration';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/migrations
 * List all migrations with stats and recent runs
 */
export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const db = getAdminFirestore();

    // Get all migration runs from Firestore
    const runsSnapshot = await db
      .collection('migrationRuns')
      .orderBy('startedAt', 'desc')
      .limit(100)
      .get();

    const allRuns: MigrationRun[] = runsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MigrationRun[];

    // Get currently active migrations
    const activeMigrations = allRuns.filter((run) => run.status === 'running');

    // Calculate stats for each migration
    const migrationsWithStats: MigrationWithStats[] = MIGRATION_REGISTRY.map((migration) => {
      const migrationRuns = allRuns.filter((run) => run.migrationId === migration.id);
      const recentRuns = migrationRuns.slice(0, 5);

      const stats: MigrationStats = {
        totalRuns: migrationRuns.length,
        successfulRuns: migrationRuns.filter((run) => run.status === 'completed').length,
        failedRuns: migrationRuns.filter(
          (run) => run.status === 'failed' || run.status === 'partial'
        ).length,
        lastRunAt: migrationRuns.length > 0 ? migrationRuns[0].startedAt : undefined,
        lastRunStatus: migrationRuns.length > 0 ? migrationRuns[0].status : undefined,
      };

      return {
        ...migration,
        stats,
        recentRuns,
      };
    });

    const response: MigrationsListResponse = {
      migrations: migrationsWithStats,
      activeMigrations,
      totalRuns: allRuns.length,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Migrations API] Error fetching migrations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch migrations' },
      { status: 500 }
    );
  }
}
