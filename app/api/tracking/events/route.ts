/**
 * Behavior Events Tracking API
 *
 * POST /api/tracking/events
 * Receive batched behavior events from web client
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import type { BehaviorEvent, TrackEventsRequest, TrackEventsResponse } from '@/lib/models/BehaviorEvent';

export const dynamic = 'force-dynamic';

/**
 * Remove undefined and null values from an object (Firestore doesn't accept undefined)
 */
function cleanFirestoreData<T extends Record<string, any>>(data: T): Partial<T> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      // Recursively clean nested objects (but not arrays)
      if (typeof value === 'object' && !Array.isArray(value)) {
        const cleanedNested = cleanFirestoreData(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned as Partial<T>;
}

/**
 * POST /api/tracking/events
 * Receive batched behavior events from web client
 */
export async function POST(request: NextRequest): Promise<NextResponse<TrackEventsResponse | { error: string }>> {
  // Verify authentication
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse as NextResponse<{ error: string }>;

  try {
    const body = await request.json() as TrackEventsRequest;
    const { events, sessionId } = body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'No events provided' },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const batch = db.batch();
    const timestamp = new Date().toISOString();

    // Add each event to the batch
    for (const event of events) {
      // Validate event has required fields
      if (!event.eventType || !event.category || !event.action || !event.target || !event.targetType) {
        console.warn('[Tracking API] Skipping invalid event:', event);
        continue;
      }

      const eventId = `${user.uid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const eventRef = db.collection('behaviorEvents').doc(eventId);

      const fullEvent: BehaviorEvent = {
        id: eventId,
        userId: user.uid,
        timestamp: event.timestamp || timestamp,
        eventType: event.eventType,
        category: event.category,
        action: event.action,
        target: event.target,
        targetType: event.targetType,
        platform: 'web',
        sessionId,
        previousScreen: event.previousScreen,
        metadata: event.metadata,
        createdAt: timestamp,
      };

      // Clean undefined/null values before writing to Firestore
      const cleanedEvent = cleanFirestoreData(fullEvent);
      batch.set(eventRef, cleanedEvent);
    }

    // Also update the session's activity counts
    const sessionRef = db.collection('behaviorSessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (sessionDoc.exists) {
      const sessionData = sessionDoc.data();
      const screenViewCount = events.filter(e => e.eventType === 'screen_view' && e.action === 'view').length;
      const featureUseCount = events.filter(e => e.eventType === 'feature_use').length;

      // Extract unique screens and features from events (filter out undefined/null)
      const newScreens = events
        .filter(e => e.eventType === 'screen_view' && e.action === 'view' && e.target)
        .map(e => e.target);
      const newFeatures = events
        .filter(e => e.eventType === 'feature_use' && e.target)
        .map(e => e.target);

      const existingScreens: string[] = (sessionData?.screensVisited || []).filter(Boolean);
      const existingFeatures: string[] = (sessionData?.featuresUsed || []).filter(Boolean);

      const uniqueScreens = [...new Set([...existingScreens, ...newScreens])].filter(Boolean);
      const uniqueFeatures = [...new Set([...existingFeatures, ...newFeatures])].filter(Boolean);

      batch.update(sessionRef, {
        screenViewCount: (sessionData?.screenViewCount || 0) + screenViewCount,
        featureUseCount: (sessionData?.featureUseCount || 0) + featureUseCount,
        screensVisited: uniqueScreens,
        featuresUsed: uniqueFeatures,
        lastActivityAt: timestamp,
      });
    }

    // Commit the batch
    await batch.commit();

    console.log(`[Tracking API] Tracked ${events.length} events for user ${user.uid}`);

    return NextResponse.json({
      success: true,
      eventsTracked: events.length,
    });
  } catch (error: any) {
    console.error('[Tracking API] Error tracking events:', error);
    console.error('[Tracking API] Error stack:', error.stack);
    console.error('[Tracking API] Error code:', error.code);
    return NextResponse.json(
      {
        error: 'Failed to track events',
        message: error.message || 'Unknown error',
        code: error.code || 'UNKNOWN',
      },
      { status: 500 }
    );
  }
}
