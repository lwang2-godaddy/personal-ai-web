import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { listTestRuns } from '@/lib/services/e2e/testRunService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const startAfter = searchParams.get('startAfter') || undefined;
  const type = searchParams.get('type') as 'integration' | 'maestro' | undefined;

  try {
    const result = await listTestRuns({
      limit,
      startAfter,
      type: type && ['integration', 'maestro'].includes(type) ? type : undefined,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[E2E History API] Error listing runs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list test runs' },
      { status: 500 },
    );
  }
}
