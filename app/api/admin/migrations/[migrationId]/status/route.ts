/**
 * Migration Status Check API Route
 * GET - Get pre-migration status (user counts, completion percentage)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { getMigrationById } from '@/lib/registry/migrations';
import { MigrationStatusResponse } from '@/lib/models/Migration';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ migrationId: string }>;
}

/**
 * GET /api/admin/migrations/[migrationId]/status
 * Get pre-migration status check
 * Returns user counts and estimated completion percentage
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

    const db = getAdminFirestore();

    // Get total user count
    const usersSnapshot = await db.collection('users').count().get();
    const totalUsers = usersSnapshot.data().count;

    // Calculate users processed based on migration type
    let usersProcessed = 0;

    switch (migrationId) {
      case 'createPredefinedCircles': {
        // Count users who have privacy circles
        const circlesSnapshot = await db
          .collection('privacyCircles')
          .select()
          .get();

        // Get unique userIds with circles
        const usersWithCircles = new Set<string>();
        circlesSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.userId) {
            usersWithCircles.add(data.userId);
          }
        });
        usersProcessed = usersWithCircles.size;
        break;
      }

      case 'migrateNotificationPreferences': {
        // Count users with v2 notification preferences
        const prefsSnapshot = await db
          .collection('users')
          .where('notificationPrefsVersion', '==', 2)
          .count()
          .get();
        usersProcessed = prefsSnapshot.data().count;
        break;
      }

      case 'initializeUserDefaults': {
        // Count users with all default fields set
        const defaultsSnapshot = await db
          .collection('users')
          .where('defaultsInitialized', '==', true)
          .count()
          .get();
        usersProcessed = defaultsSnapshot.data().count;
        break;
      }

      case 'cleanupOrphanedData': {
        // For cleanup, we count orphaned records (users to clean = orphaned records)
        // This is an estimate - actual orphans need full scan
        usersProcessed = 0; // Cleanup doesn't track "processed users"
        break;
      }

      default:
        // Default: assume not started
        usersProcessed = 0;
    }

    const usersRemaining = Math.max(0, totalUsers - usersProcessed);
    const percentComplete = totalUsers > 0 ? Math.round((usersProcessed / totalUsers) * 100) : 0;

    // Estimate time based on ~100 users per minute
    const estimatedTimeMinutes =
      usersRemaining > 0 ? Math.ceil(usersRemaining / 100) : 0;

    const response: MigrationStatusResponse = {
      totalUsers,
      usersProcessed,
      usersRemaining,
      percentComplete,
      estimatedTimeMinutes: estimatedTimeMinutes > 0 ? estimatedTimeMinutes : undefined,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Migration Status API] Error checking status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check migration status' },
      { status: 500 }
    );
  }
}
