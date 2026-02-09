import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

export const dynamic = 'force-dynamic';

interface UserDataStats {
  userId: string;
  locationData: {
    total: number;
    withActivity: number;
    withVisitCount5Plus: number;
    sampleActivities: string[];
  };
  healthData: {
    total: number;
    dateFormat: 'timestamp' | 'string' | 'unknown';
    sampleTypes: string[];
  };
  moodEntries: {
    total: number;
  };
}

/**
 * GET /api/admin/insights/debug
 * Analyze user data to diagnose why InsightsOrchestrator returns 0 results
 */
export async function GET(request: NextRequest) {
  // Verify admin authentication
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'userId parameter is required' },
      { status: 400 }
    );
  }

  try {
    const db = getAdminFirestore();

    // Analyze locationData
    const locationSnapshot = await db
      .collection('locationData')
      .where('userId', '==', userId)
      .limit(500)
      .get();

    const locationDocs = locationSnapshot.docs.map(doc => doc.data());
    const withActivity = locationDocs.filter(doc => doc.activity && doc.activity.trim() !== '');
    const withVisitCount5Plus = locationDocs.filter(doc => (doc.visitCount || 0) >= 5);

    // Get unique activities (sample)
    const activities = new Set<string>();
    withActivity.forEach(doc => {
      if (doc.activity) activities.add(doc.activity);
    });
    const sampleActivities = Array.from(activities).slice(0, 10);

    // Analyze healthData
    const healthSnapshot = await db
      .collection('healthData')
      .where('userId', '==', userId)
      .limit(500)
      .get();

    const healthDocs = healthSnapshot.docs.map(doc => doc.data());

    // Determine date format
    let dateFormat: 'timestamp' | 'string' | 'unknown' = 'unknown';
    if (healthDocs.length > 0) {
      const sampleDoc = healthDocs[0];
      if (sampleDoc.startDate) {
        if (typeof sampleDoc.startDate === 'string') {
          dateFormat = 'string';
        } else if (sampleDoc.startDate.toDate && typeof sampleDoc.startDate.toDate === 'function') {
          dateFormat = 'timestamp';
        }
      }
    }

    // Get unique health types (sample)
    const healthTypes = new Set<string>();
    healthDocs.forEach(doc => {
      if (doc.type) healthTypes.add(doc.type);
    });
    const sampleTypes = Array.from(healthTypes).slice(0, 10);

    // Analyze moodEntries
    const moodSnapshot = await db
      .collection('moodEntries')
      .where('userId', '==', userId)
      .limit(100)
      .get();

    // Build response
    const stats: UserDataStats = {
      userId,
      locationData: {
        total: locationSnapshot.size,
        withActivity: withActivity.length,
        withVisitCount5Plus: withVisitCount5Plus.length,
        sampleActivities,
      },
      healthData: {
        total: healthSnapshot.size,
        dateFormat,
        sampleTypes,
      },
      moodEntries: {
        total: moodSnapshot.size,
      },
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('[API] Error analyzing user data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze user data' },
      { status: 500 }
    );
  }
}
