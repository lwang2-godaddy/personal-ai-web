/**
 * PostHog Analytics API Proxy
 *
 * GET /api/admin/behavior/posthog?startDate=2026-02-07&endDate=2026-02-14
 *
 * Server-side proxy that queries PostHog using the personal API key.
 * Keeps the phk_... key secret (never exposed to client).
 *
 * If POSTHOG_PERSONAL_API_KEY is not set, returns a setup guide response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import type { PostHogOverview } from '@/lib/models/BehaviorEvent';

export const dynamic = 'force-dynamic';

const POSTHOG_API_BASE = 'https://us.posthog.com';

export async function GET(request: NextRequest): Promise<NextResponse<PostHogOverview | { error: string }>> {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse as NextResponse<{ error: string }>;

  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_API_KEY;

  if (!apiKey) {
    const guide: PostHogOverview = {
      totalEvents: 0,
      uniqueUsers: 0,
      topEvents: [],
      dailyTrend: [],
      configured: false,
      setupGuide: [
        '1. Go to https://us.posthog.com → Settings → Personal API Keys',
        '2. Click "Create Personal API Key"',
        '3. Give it a name (e.g., "PersonalAI Admin Dashboard")',
        '4. Copy the phk_... key',
        '5. Add to .env.local: POSTHOG_PERSONAL_API_KEY=phx_...',
        '6. For Vercel: vercel env add POSTHOG_PERSONAL_API_KEY',
        '7. Redeploy the app',
      ].join('\n'),
    };
    return NextResponse.json(guide);
  }

  const { searchParams } = new URL(request.url);
  const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
  const defaultStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const startDate = searchParams.get('startDate') || defaultStart;

  try {
    // Query PostHog using HogQL for all metrics in a single batch
    const [topEventsResult, dailyTrendResult] = await Promise.all([
      queryPostHog(apiKey, {
        query: {
          kind: 'HogQLQuery',
          query: `
            SELECT
              event,
              count() AS event_count,
              count(DISTINCT distinct_id) AS unique_users
            FROM events
            WHERE timestamp >= toDateTime('${startDate}T00:00:00')
              AND timestamp <= toDateTime('${endDate}T23:59:59')
              AND event NOT LIKE '$%'
            GROUP BY event
            ORDER BY event_count DESC
            LIMIT 20
          `,
        },
      }),
      queryPostHog(apiKey, {
        query: {
          kind: 'HogQLQuery',
          query: `
            SELECT
              toDate(timestamp) AS day,
              count() AS event_count,
              count(DISTINCT distinct_id) AS unique_users
            FROM events
            WHERE timestamp >= toDateTime('${startDate}T00:00:00')
              AND timestamp <= toDateTime('${endDate}T23:59:59')
              AND event NOT LIKE '$%'
            GROUP BY day
            ORDER BY day ASC
          `,
        },
      }),
    ]);

    // Parse top events
    const topEvents: PostHogOverview['topEvents'] = [];
    let totalEvents = 0;

    if (topEventsResult?.results) {
      for (const row of topEventsResult.results) {
        const eventName = String(row[0] ?? '');
        const count = Number(row[1] ?? 0);
        const uniqueUsers = Number(row[2] ?? 0);
        topEvents.push({ event: eventName, count, uniqueUsers });
        totalEvents += count;
      }
    }

    // Parse daily trend
    const dailyTrend: PostHogOverview['dailyTrend'] = [];
    if (dailyTrendResult?.results) {
      for (const row of dailyTrendResult.results) {
        const date = String(row[0] ?? '');
        const events = Number(row[1] ?? 0);
        const uniqueUsers = Number(row[2] ?? 0);
        dailyTrend.push({ date, events, uniqueUsers });
      }
    }

    // Get total unique users from a separate lightweight query
    const uniqueUsersResult = await queryPostHog(apiKey, {
      query: {
        kind: 'HogQLQuery',
        query: `
          SELECT count(DISTINCT distinct_id) AS unique_users
          FROM events
          WHERE timestamp >= toDateTime('${startDate}T00:00:00')
            AND timestamp <= toDateTime('${endDate}T23:59:59')
            AND event NOT LIKE '$%'
        `,
      },
    });

    const uniqueUsers = uniqueUsersResult?.results?.[0]?.[0]
      ? Number(uniqueUsersResult.results[0][0])
      : 0;

    const overview: PostHogOverview = {
      totalEvents,
      uniqueUsers,
      topEvents,
      dailyTrend,
      configured: true,
    };

    return NextResponse.json(overview);
  } catch (error: any) {
    console.error('[PostHog API] Error:', error?.message || error);
    return NextResponse.json(
      { error: `Failed to fetch PostHog data: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

async function queryPostHog(apiKey: string, body: Record<string, any>): Promise<any> {
  const response = await fetch(`${POSTHOG_API_BASE}/api/projects/@current/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PostHog API ${response.status}: ${errorText}`);
  }

  return response.json();
}
