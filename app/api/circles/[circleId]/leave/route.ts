import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { CircleService } from '@/lib/services/social/CircleService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/circles/[circleId]/leave
 * Leave a circle (members and admins only, not creator)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { circleId: string } }
) {
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;

  try {
    // Verify user is a member
    const members = await CircleService.getInstance().getCircleMembers(params.circleId);
    const currentMember = members.find((m) => m.userId === user.uid);

    if (!currentMember) {
      return NextResponse.json(
        { error: 'You are not a member of this circle' },
        { status: 403 }
      );
    }

    // Creator cannot leave (must delete circle or transfer ownership first)
    if (currentMember.role === 'creator') {
      return NextResponse.json(
        {
          error:
            'Circle creators cannot leave. Please transfer ownership or delete the circle.',
        },
        { status: 400 }
      );
    }

    // Leave circle
    await CircleService.getInstance().leaveCircle(params.circleId, user.uid);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error leaving circle:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to leave circle' },
      { status: 500 }
    );
  }
}
