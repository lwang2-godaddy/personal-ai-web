import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { hasActiveRun, createTestRun } from '@/lib/services/e2e/testRunService';
import type { TestSchedulerConfig } from '@/lib/models/TestRun';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CONFIG_COLLECTION = 'config';
const CONFIG_DOC_ID = 'testSchedulerSettings';

function isScheduleDue(
  lastRunAt: string | undefined,
  intervalHours: number,
): boolean {
  if (!lastRunAt) return true;
  const hoursSinceLastRun =
    (Date.now() - new Date(lastRunAt).getTime()) / (1000 * 60 * 60);
  return hoursSinceLastRun >= intervalHours;
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminFirestore();
  const results: string[] = [];

  try {
    // Load scheduler config
    const doc = await db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC_ID).get();
    if (!doc.exists) {
      return NextResponse.json({ message: 'No scheduler config found, skipping.' });
    }

    const config = doc.data() as TestSchedulerConfig;

    // Check integration tests schedule
    if (
      config.integration.enabled &&
      isScheduleDue(
        config.integration.lastRunAt,
        config.integration.intervalHours,
      )
    ) {
      const isRunning = await hasActiveRun('integration');
      if (isRunning) {
        results.push('integration: skipped (already running)');
      } else {
        // Trigger integration tests via internal fetch (fire-and-forget)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL
          || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

        try {
          // Create a scheduled test run record first
          const now = new Date().toISOString();
          await createTestRun({
            type: 'integration',
            status: 'pending',
            trigger: 'scheduled',
            triggeredBy: 'scheduler',
            startedAt: now,
            totalTests: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            filter: config.integration.filter,
            skipE2E: config.integration.skipE2E,
            createdAt: now,
          });

          // Fire-and-forget - don't await the SSE response body
          fetch(`${baseUrl}/api/admin/e2e/tests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filter: config.integration.filter,
              skipE2E: config.integration.skipE2E,
              trigger: 'scheduled',
              triggeredBy: 'scheduler',
            }),
          }).catch(() => {
            // Intentionally fire-and-forget
          });

          // Update lastRunAt
          await db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC_ID).update({
            'integration.lastRunAt': new Date().toISOString(),
          });

          results.push('integration: triggered');
        } catch (err: any) {
          results.push(`integration: error (${err.message})`);
        }
      }
    }

    // Check maestro tests schedule
    if (
      config.maestro.enabled &&
      isScheduleDue(
        config.maestro.lastRunAt,
        config.maestro.intervalHours,
      )
    ) {
      const isRunning = await hasActiveRun('maestro');
      if (isRunning) {
        results.push('maestro: skipped (already running)');
      } else {
        const githubPat = process.env.GITHUB_PAT;
        const githubRepo = process.env.GITHUB_REPO;

        if (!githubPat || !githubRepo) {
          results.push('maestro: skipped (GitHub not configured)');
        } else {
          try {
            const now = new Date().toISOString();
            const runId = await createTestRun({
              type: 'maestro',
              status: 'pending',
              trigger: 'scheduled',
              triggeredBy: 'scheduler',
              startedAt: now,
              totalTests: 0,
              passed: 0,
              failed: 0,
              skipped: 0,
              branch: config.maestro.branch,
              createdAt: now,
            });

            const response = await fetch(
              `https://api.github.com/repos/${githubRepo}/actions/workflows/e2e-maestro.yml/dispatches`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${githubPat}`,
                  Accept: 'application/vnd.github.v3+json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  ref: config.maestro.branch,
                  inputs: { callback_run_id: runId },
                }),
              },
            );

            if (response.ok) {
              await db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC_ID).update({
                'maestro.lastRunAt': new Date().toISOString(),
              });
              results.push('maestro: triggered');
            } else {
              results.push(`maestro: GitHub API error ${response.status}`);
            }
          } catch (err: any) {
            results.push(`maestro: error (${err.message})`);
          }
        }
      }
    }

    if (results.length === 0) {
      results.push('No schedules due');
    }

    return NextResponse.json({ results, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('[Test Scheduler Cron] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Scheduler error' },
      { status: 500 },
    );
  }
}
