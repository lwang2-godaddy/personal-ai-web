/**
 * Migration Runs API Route
 * GET - Get run history for a migration
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { getMigrationById } from '@/lib/registry/migrations';
import { MigrationRun, MigrationRunsResponse } from '@/lib/models/Migration';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ migrationId: string }>;
}

/**
 * GET /api/admin/migrations/[migrationId]/runs
 * Get run history for a migration
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

    // Get query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = getAdminFirestore();

    // Get runs for this migration
    let query = db
      .collection('migrationRuns')
      .where('migrationId', '==', migrationId)
      .orderBy('startedAt', 'desc');

    // Get total count
    const totalSnapshot = await db
      .collection('migrationRuns')
      .where('migrationId', '==', migrationId)
      .count()
      .get();
    const total = totalSnapshot.data().count;

    // Apply pagination
    if (offset > 0) {
      // Get the document at offset position for cursor-based pagination
      const offsetQuery = await db
        .collection('migrationRuns')
        .where('migrationId', '==', migrationId)
        .orderBy('startedAt', 'desc')
        .limit(offset)
        .get();

      if (offsetQuery.docs.length > 0) {
        const lastDoc = offsetQuery.docs[offsetQuery.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }

    const runsSnapshot = await query.limit(limit).get();

    const runs: MigrationRun[] = runsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MigrationRun[];

    const hasMore = offset + runs.length < total;

    const response: MigrationRunsResponse = {
      runs,
      total,
      hasMore,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Migration Runs API] Error fetching runs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch migration runs' },
      { status: 500 }
    );
  }
}
