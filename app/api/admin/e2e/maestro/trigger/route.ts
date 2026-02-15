import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { createTestRun, updateTestRun } from '@/lib/services/e2e/testRunService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  const githubPat = process.env.GITHUB_PAT;
  const githubRepo = process.env.GITHUB_REPO;

  if (!githubPat || !githubRepo) {
    return NextResponse.json(
      { error: 'GitHub integration not configured. Set GITHUB_PAT and GITHUB_REPO env vars.' },
      { status: 500 },
    );
  }

  let body: { branch?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Use defaults
  }

  const branch = body.branch || 'develop';
  const now = new Date().toISOString();

  // Create pending test run record
  let runId: string;
  try {
    runId = await createTestRun({
      type: 'maestro',
      status: 'pending',
      trigger: 'manual',
      triggeredBy: user.uid,
      startedAt: now,
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      branch,
      createdAt: now,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to create test run: ${err.message}` },
      { status: 500 },
    );
  }

  // Trigger GitHub Actions workflow
  try {
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
          ref: branch,
          inputs: {
            callback_run_id: runId,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      await updateTestRun(runId, { status: 'error', errorMessage: `GitHub API error: ${response.status} ${errorText}` });
      return NextResponse.json(
        { error: `GitHub API error: ${response.status} ${errorText}` },
        { status: 502 },
      );
    }

    await updateTestRun(runId, { status: 'running' });

    return NextResponse.json({ success: true, runId });
  } catch (err: any) {
    await updateTestRun(runId, { status: 'error', errorMessage: err.message });
    return NextResponse.json(
      { error: `Failed to trigger workflow: ${err.message}` },
      { status: 500 },
    );
  }
}
