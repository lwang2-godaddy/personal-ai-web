import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { CircleService } from '@/lib/services/social/CircleService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/circles/[circleId]/analytics
 * Fetch analytics for a circle
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { circleId: string } }
) {
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;

  try {
    const analytics = await CircleService.getInstance().getAnalytics(params.circleId);
    return NextResponse.json({ analytics });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
