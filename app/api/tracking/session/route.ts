/**
 * Behavior Session Management API
 *
 * POST /api/tracking/session - Start a new session
 * PATCH /api/tracking/session - End a session
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import type {
  BehaviorSession,
  StartSessionRequest,
  StartSessionResponse,
  EndSessionRequest,
  EndSessionResponse,
} from '@/lib/models/BehaviorEvent';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tracking/session
 * Start a new session
 */
export async function POST(request: NextRequest): Promise<NextResponse<StartSessionResponse | { error: string }>> {
  // Verify authentication
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse as NextResponse<{ error: string }>;

  try {
    const body = await request.json() as StartSessionRequest;
    const { platform, userAgent, deviceType, browser, os } = body;

    const db = getAdminFirestore();
    const timestamp = new Date().toISOString();

    // Generate session ID
    const sessionId = `${user.uid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create session document
    const session: BehaviorSession = {
      id: sessionId,
      userId: user.uid,
      platform: platform || 'web',
      startedAt: timestamp,
      screenViewCount: 0,
      featureUseCount: 0,
      screensVisited: [],
      featuresUsed: [],
      userAgent,
      deviceType,
      browser,
      os,
      isActive: true,
      lastActivityAt: timestamp,
    };

    await db.collection('behaviorSessions').doc(sessionId).set(session);

    console.log(`[Session API] Session started: ${sessionId} for user ${user.uid}`);

    return NextResponse.json({
      sessionId,
      startedAt: timestamp,
    });
  } catch (error: any) {
    console.error('[Session API] Error starting session:', error);
    return NextResponse.json(
      { error: 'Failed to start session' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tracking/session
 * End a session
 */
export async function PATCH(request: NextRequest): Promise<NextResponse<EndSessionResponse | { error: string }>> {
  // Verify authentication
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse as NextResponse<{ error: string }>;

  try {
    const body = await request.json() as EndSessionRequest;
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const sessionRef = db.collection('behaviorSessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const sessionData = sessionDoc.data();

    // Verify session belongs to user
    if (sessionData?.userId !== user.uid) {
      return NextResponse.json(
        { error: 'Unauthorized to end this session' },
        { status: 403 }
      );
    }

    const endedAt = new Date().toISOString();
    const startedAt = new Date(sessionData?.startedAt || endedAt);
    const durationMs = new Date(endedAt).getTime() - startedAt.getTime();

    // Update session
    await sessionRef.update({
      endedAt,
      durationMs,
      isActive: false,
    });

    console.log(`[Session API] Session ended: ${sessionId}, duration: ${Math.round(durationMs / 1000)}s`);

    return NextResponse.json({
      success: true,
      durationMs,
    });
  } catch (error: any) {
    console.error('[Session API] Error ending session:', error);
    return NextResponse.json(
      { error: 'Failed to end session' },
      { status: 500 }
    );
  }
}
