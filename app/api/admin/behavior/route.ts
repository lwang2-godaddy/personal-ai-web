/**
 * Admin Behavior Analytics API
 *
 * GET /api/admin/behavior
 * Get system-wide behavior analytics overview
 *
 * Query Parameters:
 * - startDate: ISO date string (default: 7 days ago)
 * - endDate: ISO date string (default: today)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import type { BehaviorOverview, BehaviorPlatform } from '@/lib/models/BehaviorEvent';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/behavior
 * Get system-wide behavior analytics
 */
export async function GET(request: NextRequest): Promise<NextResponse<BehaviorOverview | { error: string }>> {
  // Verify admin access
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse as NextResponse<{ error: string }>;

  try {
    const { searchParams } = new URL(request.url);

    // Parse date range
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const defaultStartDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startDate = searchParams.get('startDate') || defaultStartDate;

    const db = getAdminFirestore();

    // Get sessions in date range
    const sessionsQuery = await db.collection('behaviorSessions')
      .where('startedAt', '>=', startDate)
      .where('startedAt', '<=', endDate + 'T23:59:59.999Z')
      .get();

    const sessions = sessionsQuery.docs.map(doc => doc.data());

    // Calculate unique users
    const userIds = new Set(sessions.map(s => s.userId));
    const activeUsers = userIds.size;

    // Get first-time users (users with no sessions before startDate)
    let newUsers = 0;
    for (const userId of userIds) {
      const firstSessionQuery = await db.collection('behaviorSessions')
        .where('userId', '==', userId)
        .where('startedAt', '<', startDate)
        .limit(1)
        .get();

      if (firstSessionQuery.empty) {
        newUsers++;
      }
    }

    // Calculate session metrics
    const totalSessions = sessions.length;
    const avgSessionsPerUser = activeUsers > 0 ? totalSessions / activeUsers : 0;

    const sessionsWithDuration = sessions.filter(s => s.durationMs != null);
    const avgSessionDurationMs = sessionsWithDuration.length > 0
      ? sessionsWithDuration.reduce((sum, s) => sum + (s.durationMs || 0), 0) / sessionsWithDuration.length
      : 0;

    // Get events in date range
    const eventsQuery = await db.collection('behaviorEvents')
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate + 'T23:59:59.999Z')
      .get();

    const events = eventsQuery.docs.map(doc => doc.data());

    // Calculate event metrics
    const screenViews = events.filter(e => e.eventType === 'screen_view' && e.action === 'view');
    const featureUses = events.filter(e => e.eventType === 'feature_use');

    const totalScreenViews = screenViews.length;
    const totalFeatureUses = featureUses.length;

    // Platform breakdown
    const platformBreakdown: Record<BehaviorPlatform, { users: number; sessions: number }> = {
      mobile: { users: 0, sessions: 0 },
      web: { users: 0, sessions: 0 },
    };

    const mobileUsers = new Set<string>();
    const webUsers = new Set<string>();

    for (const session of sessions) {
      if (session.platform === 'mobile') {
        platformBreakdown.mobile.sessions++;
        mobileUsers.add(session.userId);
      } else {
        platformBreakdown.web.sessions++;
        webUsers.add(session.userId);
      }
    }

    platformBreakdown.mobile.users = mobileUsers.size;
    platformBreakdown.web.users = webUsers.size;

    // Top screens
    const screenCounts: Record<string, { count: number; users: Set<string> }> = {};
    for (const event of screenViews) {
      if (!screenCounts[event.target]) {
        screenCounts[event.target] = { count: 0, users: new Set() };
      }
      screenCounts[event.target].count++;
      screenCounts[event.target].users.add(event.userId);
    }

    const topScreens = Object.entries(screenCounts)
      .map(([screen, data]) => ({
        screen,
        count: data.count,
        uniqueUsers: data.users.size,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top features
    const featureCounts: Record<string, { count: number; users: Set<string> }> = {};
    for (const event of featureUses) {
      if (!featureCounts[event.target]) {
        featureCounts[event.target] = { count: 0, users: new Set() };
      }
      featureCounts[event.target].count++;
      featureCounts[event.target].users.add(event.userId);
    }

    const topFeatures = Object.entries(featureCounts)
      .map(([feature, data]) => ({
        feature,
        count: data.count,
        uniqueUsers: data.users.size,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Daily trend
    const dailyData: Record<string, {
      activeUsers: Set<string>;
      sessions: number;
      screenViews: number;
      featureUses: number;
    }> = {};

    // Initialize all dates in range
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);
    while (currentDate <= endDateObj) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dailyData[dateStr] = {
        activeUsers: new Set(),
        sessions: 0,
        screenViews: 0,
        featureUses: 0,
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate sessions by day
    for (const session of sessions) {
      const date = session.startedAt.split('T')[0];
      if (dailyData[date]) {
        dailyData[date].sessions++;
        dailyData[date].activeUsers.add(session.userId);
      }
    }

    // Aggregate events by day
    for (const event of events) {
      const date = event.timestamp.split('T')[0];
      if (dailyData[date]) {
        if (event.eventType === 'screen_view' && event.action === 'view') {
          dailyData[date].screenViews++;
        } else if (event.eventType === 'feature_use') {
          dailyData[date].featureUses++;
        }
      }
    }

    const dailyTrend = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        activeUsers: data.activeUsers.size,
        sessions: data.sessions,
        screenViews: data.screenViews,
        featureUses: data.featureUses,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const overview: BehaviorOverview = {
      startDate,
      endDate,
      activeUsers,
      newUsers,
      totalSessions,
      avgSessionsPerUser,
      avgSessionDurationMs,
      totalScreenViews,
      totalFeatureUses,
      platformBreakdown,
      topScreens,
      topFeatures,
      dailyTrend,
    };

    return NextResponse.json(overview);
  } catch (error: any) {
    console.error('[Admin Behavior API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch behavior analytics' },
      { status: 500 }
    );
  }
}
