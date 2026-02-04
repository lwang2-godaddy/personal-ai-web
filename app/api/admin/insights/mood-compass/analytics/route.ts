/**
 * Admin Mood Compass Analytics API
 *
 * GET /api/admin/insights/mood-compass/analytics
 * Returns aggregated analytics data for the Mood Compass feature
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

export const dynamic = 'force-dynamic';

interface MoodCorrelation {
  factor: string;
  factorValue: string;
  moodEffect: 'positive' | 'negative' | 'neutral';
  correlationStrength: number;
  averageMoodDelta: number;
  sampleSize: number;
}

interface MoodPattern {
  patternType: string;
  userId: string;
}

interface MoodEntry {
  primaryEmotion: string;
  sentimentScore: number;
  createdAt: any;
}

/**
 * GET /api/admin/insights/mood-compass/analytics
 * Returns aggregated analytics for Mood Compass feature
 */
export async function GET(request: NextRequest) {
  const { response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const db = getAdminFirestore();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get total mood entries
    const allEntriesSnapshot = await db.collection('moodEntries').get();
    const totalEntries = allEntriesSnapshot.size;

    // Get mood entries from last 7 days
    const recentEntriesSnapshot = await db
      .collection('moodEntries')
      .where('createdAt', '>=', sevenDaysAgo)
      .get();
    const entriesLast7d = recentEntriesSnapshot.size;

    // Calculate growth (compared to previous 7 days)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const previousWeekSnapshot = await db
      .collection('moodEntries')
      .where('createdAt', '>=', fourteenDaysAgo)
      .where('createdAt', '<', sevenDaysAgo)
      .get();
    const previousWeekEntries = previousWeekSnapshot.size;
    const entriesGrowth7d = previousWeekEntries > 0
      ? ((entriesLast7d - previousWeekEntries) / previousWeekEntries) * 100
      : entriesLast7d > 0 ? 100 : 0;

    // Count unique users with mood entries
    const userIds = new Set<string>();
    allEntriesSnapshot.forEach((doc) => {
      const data = doc.data() as MoodEntry & { userId: string };
      if (data.userId) userIds.add(data.userId);
    });
    const activeUsersWithMood = userIds.size;

    // Count users from last 7 days vs previous 7 days
    const recentUserIds = new Set<string>();
    recentEntriesSnapshot.forEach((doc) => {
      const data = doc.data() as MoodEntry & { userId: string };
      if (data.userId) recentUserIds.add(data.userId);
    });
    const previousUserIds = new Set<string>();
    previousWeekSnapshot.forEach((doc) => {
      const data = doc.data() as MoodEntry & { userId: string };
      if (data.userId) previousUserIds.add(data.userId);
    });
    const usersGrowth7d = previousUserIds.size > 0
      ? ((recentUserIds.size - previousUserIds.size) / previousUserIds.size) * 100
      : recentUserIds.size > 0 ? 100 : 0;

    // Calculate average sentiment from last 30 days
    const last30dSnapshot = await db
      .collection('moodEntries')
      .where('createdAt', '>=', thirtyDaysAgo)
      .get();

    let totalSentiment = 0;
    let sentimentCount = 0;
    const emotionCounts: Record<string, number> = {};

    last30dSnapshot.forEach((doc) => {
      const data = doc.data() as MoodEntry;
      if (typeof data.sentimentScore === 'number') {
        totalSentiment += data.sentimentScore;
        sentimentCount++;
      }
      if (data.primaryEmotion) {
        emotionCounts[data.primaryEmotion] = (emotionCounts[data.primaryEmotion] || 0) + 1;
      }
    });

    const avgSentiment = sentimentCount > 0 ? totalSentiment / sentimentCount : 0;

    // Get top correlations from all users
    const correlationsSnapshot = await db
      .collection('moodCorrelations')
      .orderBy('correlationStrength', 'desc')
      .limit(50)
      .get();

    // Aggregate correlations across users
    const correlationMap = new Map<string, {
      factor: string;
      factorValue: string;
      moodEffect: string;
      totalDelta: number;
      count: number;
      userIds: Set<string>;
    }>();

    correlationsSnapshot.forEach((doc) => {
      const data = doc.data() as MoodCorrelation & { userId: string };
      const key = `${data.factor}:${data.factorValue}`;

      if (!correlationMap.has(key)) {
        correlationMap.set(key, {
          factor: data.factor,
          factorValue: data.factorValue,
          moodEffect: data.moodEffect,
          totalDelta: 0,
          count: 0,
          userIds: new Set(),
        });
      }

      const existing = correlationMap.get(key)!;
      existing.totalDelta += data.averageMoodDelta || 0;
      existing.count++;
      if (data.userId) existing.userIds.add(data.userId);
    });

    // Convert to array and sort by user count
    const topCorrelations = Array.from(correlationMap.values())
      .map((c) => ({
        factor: c.factor,
        factorValue: c.factorValue,
        moodEffect: c.moodEffect,
        avgDelta: c.count > 0 ? c.totalDelta / c.count : 0,
        userCount: c.userIds.size,
      }))
      .sort((a, b) => b.userCount - a.userCount)
      .slice(0, 10);

    // Get pattern stats
    const patternsSnapshot = await db.collection('moodPatterns').get();
    const patternsByType: Record<string, number> = {};

    patternsSnapshot.forEach((doc) => {
      const data = doc.data() as MoodPattern;
      const type = data.patternType || 'unknown';
      patternsByType[type] = (patternsByType[type] || 0) + 1;
    });

    return NextResponse.json({
      analytics: {
        totalEntries,
        entriesLast7d,
        entriesGrowth7d: Math.round(entriesGrowth7d),
        activeUsersWithMood,
        usersGrowth7d: Math.round(usersGrowth7d),
        avgSentiment,
        emotionDistribution: emotionCounts,
        topCorrelations,
        patternStats: {
          total: patternsSnapshot.size,
          byType: patternsByType,
        },
      },
    });
  } catch (error: any) {
    console.error('[Admin Mood Compass Analytics API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch mood compass analytics' },
      { status: 500 }
    );
  }
}
