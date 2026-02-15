import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getTestRun, getTestCaseResults } from '@/lib/services/e2e/testRunService';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  const { runId } = await params;

  try {
    const run = await getTestRun(runId);
    if (!run) {
      return NextResponse.json({ error: 'Test run not found' }, { status: 404 });
    }

    const testCases = await getTestCaseResults(runId);

    return NextResponse.json({ run, testCases });
  } catch (error: any) {
    console.error('[E2E History Detail API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get test run' },
      { status: 500 },
    );
  }
}
