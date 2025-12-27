import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { CircleService } from '@/lib/services/social/CircleService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/circles/[circleId]/invite
 * Send invitation to a friend to join circle
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { circleId: string } }
) {
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const { friendId, message } = body;

    // Validate friendId
    if (!friendId || typeof friendId !== 'string') {
      return NextResponse.json({ error: 'Friend ID is required' }, { status: 400 });
    }

    // Verify circle membership and permissions
    const circle = await CircleService.getInstance().getCircle(params.circleId);
    if (!circle.memberIds.includes(user.uid)) {
      return NextResponse.json(
        { error: 'You are not a member of this circle' },
        { status: 403 }
      );
    }

    // Check if invites are allowed by settings
    if (!circle.settings.allowMemberInvites) {
      // Check if user is creator or admin
      const members = await CircleService.getInstance().getCircleMembers(params.circleId);
      const currentMember = members.find((m) => m.userId === user.uid);

      if (!currentMember || (currentMember.role !== 'creator' && currentMember.role !== 'admin')) {
        return NextResponse.json(
          { error: 'Only admins can invite members to this circle' },
          { status: 403 }
        );
      }
    }

    // Send invite
    const invite = await CircleService.getInstance().inviteToCircle(
      params.circleId,
      friendId,
      message
    );

    return NextResponse.json({ invite }, { status: 201 });
  } catch (error: any) {
    console.error('Error sending circle invite:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send invite' },
      { status: 500 }
    );
  }
}
