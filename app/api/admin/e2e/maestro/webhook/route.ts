import { NextRequest, NextResponse } from 'next/server';
import { updateTestRun } from '@/lib/services/e2e/testRunService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Authenticate via shared secret (no Firebase auth - called from GitHub Actions)
  const secret = request.headers.get('X-Webhook-Secret');
  const expectedSecret = process.env.TEST_WEBHOOK_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    runId: string;
    status?: string;
    totalTests?: number;
    passed?: number;
    failed?: number;
    skipped?: number;
    githubRunId?: number;
    githubRunUrl?: string;
    branch?: string;
    commitSha?: string;
    errorMessage?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.runId) {
    return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
  }

  const totalTests = body.totalTests ?? 0;
  const failed = body.failed ?? 0;
  const passed = body.passed ?? 0;
  const finalStatus = failed > 0 ? 'failed' : totalTests > 0 ? 'passed' : 'error';

  try {
    await updateTestRun(body.runId, {
      status: body.status === 'error' ? 'error' : (finalStatus as 'passed' | 'failed' | 'error'),
      completedAt: new Date().toISOString(),
      totalTests,
      passed,
      failed,
      skipped: body.skipped ?? 0,
      githubRunId: body.githubRunId,
      githubRunUrl: body.githubRunUrl,
      branch: body.branch,
      commitSha: body.commitSha,
      errorMessage: body.errorMessage,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Maestro Webhook] Failed to update test run:', err);
    return NextResponse.json(
      { error: `Failed to update test run: ${err.message}` },
      { status: 500 },
    );
  }
}
