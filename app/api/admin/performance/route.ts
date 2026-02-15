/**
 * Admin Performance Monitoring API
 *
 * GET /api/admin/performance
 * Get performance aggregates or raw metrics
 *
 * Query Parameters:
 * - startDate: YYYY-MM-DD (default: 7 days ago)
 * - endDate: YYYY-MM-DD (default: today)
 * - mode: 'aggregated' | 'raw' (default: aggregated)
 * - metricType: filter raw metrics by type (optional)
 * - userId: filter by specific user (optional; when set, aggregates are computed on-the-fly)
 *
 * POST /api/admin/performance
 * Trigger manual aggregation for a specific date (backfill)
 * Body: { date: 'YYYY-MM-DD' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { aggregateDay, aggregateMetrics } from '@/lib/services/e2e/perfOperations';
import type { PerformanceOverview, DailyPerformanceAggregate, PerformanceMetric } from '@/lib/models/PerformanceMetric';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse<PerformanceOverview | { error: string }>> {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse as NextResponse<{ error: string }>;

  try {
    const { searchParams } = new URL(request.url);

    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const defaultStartDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startDate = searchParams.get('startDate') || defaultStartDate;
    const mode = searchParams.get('mode') || 'aggregated';
    const metricType = searchParams.get('metricType');
    const userId = searchParams.get('userId');

    const db = getAdminFirestore();

    if (mode === 'raw') {
      // Return raw metrics for debugging
      const snapshot = await db.collection('performanceMetrics')
        .where('timestamp', '>=', startDate + 'T00:00:00.000Z')
        .where('timestamp', '<=', endDate + 'T23:59:59.999Z')
        .orderBy('timestamp', 'desc')
        .limit(500)
        .get();

      let rawMetrics: PerformanceMetric[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.id || doc.id,
          userId: data.userId,
          timestamp: data.timestamp,
          metricType: data.metricType,
          screenName: data.screenName,
          value: data.value,
          metadata: data.metadata,
          platform: data.platform,
          sessionId: data.sessionId,
          createdAt: data.createdAt,
        } as PerformanceMetric;
      });

      // Client-side filters (avoids needing composite indexes for every combo)
      if (userId) {
        rawMetrics = rawMetrics.filter(m => m.userId === userId);
      }
      if (metricType) {
        rawMetrics = rawMetrics.filter(m => m.metricType === metricType);
      }

      return NextResponse.json({ aggregates: [], rawMetrics });
    }

    // --- Aggregated mode ---

    // When userId is set, we can't use pre-computed aggregates (they're cross-user).
    // Instead, fetch raw metrics and compute aggregates on-the-fly.
    if (userId) {
      const snapshot = await db.collection('performanceMetrics')
        .where('timestamp', '>=', startDate + 'T00:00:00.000Z')
        .where('timestamp', '<=', endDate + 'T23:59:59.999Z')
        .orderBy('timestamp', 'desc')
        .limit(2000)
        .get();

      const allMetrics = snapshot.docs
        .map(doc => doc.data())
        .filter(m => m.userId === userId);

      // Group by date and aggregate each day
      const byDate: Record<string, any[]> = {};
      allMetrics.forEach(m => {
        const date = m.timestamp.split('T')[0];
        if (!byDate[date]) byDate[date] = [];
        byDate[date].push(m);
      });

      const aggregates: DailyPerformanceAggregate[] = Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, metrics]) => aggregateMetrics(metrics, date) as DailyPerformanceAggregate);

      return NextResponse.json({ aggregates });
    }

    // No userId filter: read from pre-computed performanceAggregates
    const aggSnapshot = await db.collection('performanceAggregates')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'asc')
      .get();

    const aggregates: DailyPerformanceAggregate[] = aggSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        date: data.date,
        computedAt: data.computedAt,
        startup: data.startup,
        screenTransitions: data.screenTransitions || {},
        scrollFps: data.scrollFps || {},
        jsThreadFps: data.jsThreadFps,
        apiLatency: data.apiLatency || {},
        slowRenders: data.slowRenders || [],
        totalMetrics: data.totalMetrics || 0,
        uniqueUsers: data.uniqueUsers || 0,
      } as DailyPerformanceAggregate;
    });

    return NextResponse.json({ aggregates });
  } catch (error: any) {
    console.error('[Performance API] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch performance data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean; message: string } | { error: string }>> {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse as NextResponse<{ error: string }>;

  try {
    const body = await request.json();
    const { date } = body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Valid date (YYYY-MM-DD) is required' }, { status: 400 });
    }

    const db = getAdminFirestore();

    // Check if any metrics exist for this date
    const dayStart = date + 'T00:00:00.000Z';
    const dayEnd = date + 'T23:59:59.999Z';
    const snapshot = await db.collection('performanceMetrics')
      .where('timestamp', '>=', dayStart)
      .where('timestamp', '<=', dayEnd)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ success: true, message: `No metrics found for ${date}` });
    }

    // Use the shared full 6-type aggregation
    await aggregateDay(db, date);

    // Read back to get total count for the response
    const aggDoc = await db.collection('performanceAggregates').doc(date).get();
    const totalMetrics = aggDoc.data()?.totalMetrics ?? 0;

    return NextResponse.json({
      success: true,
      message: `Aggregated ${totalMetrics} metrics for ${date} (all 6 metric types)`,
    });
  } catch (error: any) {
    console.error('[Performance API] POST Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to aggregate' }, { status: 500 });
  }
}
