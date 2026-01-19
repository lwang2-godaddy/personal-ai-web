/**
 * Admin User Behavior Analytics API
 *
 * GET /api/admin/behavior/[userId]
 * Get behavior analytics for a specific user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import type { UserBehaviorSummary, BehaviorSession, BehaviorEvent, BehaviorPlatform } from '@/lib/models/BehaviorEvent';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/behavior/[userId]
 * Get behavior analytics for a specific user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse<UserBehaviorSummary | { error: string }>> {
  // Verify admin access
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse as NextResponse<{ error: string }>;

  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // Get user info
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    // Get all sessions for user
    const sessionsQuery = await db.collection('behaviorSessions')
      .where('userId', '==', userId)
      .orderBy('startedAt', 'desc')
      .get();

    const sessions: BehaviorSession[] = sessionsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as BehaviorSession));

    // Calculate lifetime metrics
    const totalSessions = sessions.length;
    const totalDurationMs = sessions.reduce((sum, s) => sum + (s.durationMs || 0), 0);

    const firstSessionAt = sessions.length > 0
      ? sessions[sessions.length - 1].startedAt
      : new Date().toISOString();

    const lastSessionAt = sessions.length > 0
      ? sessions[0].startedAt
      : new Date().toISOString();

    // Get recent events (last 50)
    const eventsQuery = await db.collection('behaviorEvents')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const recentEvents: BehaviorEvent[] = eventsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as BehaviorEvent));

    // Calculate top screens
    const screenCounts: Record<string, number> = {};
    for (const event of recentEvents) {
      if (event.eventType === 'screen_view' && event.action === 'view') {
        screenCounts[event.target] = (screenCounts[event.target] || 0) + 1;
      }
    }

    const topScreens = Object.entries(screenCounts)
      .map(([screen, count]) => ({ screen, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate top features
    const featureCounts: Record<string, number> = {};
    for (const event of recentEvents) {
      if (event.eventType === 'feature_use') {
        featureCounts[event.target] = (featureCounts[event.target] || 0) + 1;
      }
    }

    const topFeatures = Object.entries(featureCounts)
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Determine preferred platform
    const platformCounts: Record<BehaviorPlatform, number> = { mobile: 0, web: 0 };
    for (const session of sessions) {
      platformCounts[session.platform]++;
    }

    const preferredPlatform: BehaviorPlatform = platformCounts.mobile > platformCounts.web ? 'mobile' : 'web';

    // Calculate engagement score (0-100)
    // Based on: recency, frequency, and feature diversity
    const daysSinceLastActivity = (Date.now() - new Date(lastSessionAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 100 - daysSinceLastActivity * 5); // -5 points per day

    const sessionsPerWeek = totalSessions / Math.max(1, (Date.now() - new Date(firstSessionAt).getTime()) / (1000 * 60 * 60 * 24 * 7));
    const frequencyScore = Math.min(100, sessionsPerWeek * 20); // Max 5 sessions/week = 100

    const uniqueFeatures = Object.keys(featureCounts).length;
    const diversityScore = Math.min(100, uniqueFeatures * 10); // Max 10 features = 100

    const engagementScore = Math.round((recencyScore + frequencyScore + diversityScore) / 3);

    // Limit recent sessions to 10
    const recentSessions = sessions.slice(0, 10);

    const summary: UserBehaviorSummary = {
      userId,
      displayName: userData?.displayName || undefined,
      email: userData?.email || undefined,
      firstSessionAt,
      lastSessionAt,
      totalSessions,
      totalDurationMs,
      recentSessions,
      recentEvents,
      topScreens,
      topFeatures,
      preferredPlatform,
      engagementScore,
    };

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('[Admin User Behavior API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user behavior analytics' },
      { status: 500 }
    );
  }
}
