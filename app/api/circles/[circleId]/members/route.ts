import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { CircleService } from '@/lib/services/social/CircleService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/circles/[circleId]/members
 * Fetch members of a circle
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;

  const { circleId } = await params;

  try {
    const members = await CircleService.getInstance().getCircleMembers(circleId);
    return NextResponse.json({ members });
  } catch (error: any) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch members' },
      { status: 500 }
    );
  }
}
