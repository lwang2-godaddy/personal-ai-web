import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { CircleService } from '@/lib/services/social/CircleService';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/circles/[circleId]/members/[userId]
 * Remove a member from the circle
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { circleId: string; userId: string } }
) {
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;

  try {
    // Verify current user is creator or admin
    const members = await CircleService.getInstance().getCircleMembers(params.circleId);
    const currentMember = members.find((m) => m.userId === user.uid);

    if (!currentMember) {
      return NextResponse.json(
        { error: 'You are not a member of this circle' },
        { status: 403 }
      );
    }

    // Only creator or admin can remove members
    if (currentMember.role !== 'creator' && currentMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can remove members' },
        { status: 403 }
      );
    }

    // Verify target member exists
    const targetMember = members.find((m) => m.userId === params.userId);
    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot remove creator
    if (targetMember.role === 'creator') {
      return NextResponse.json({ error: 'Cannot remove the circle creator' }, { status: 400 });
    }

    // Cannot remove self (use leave endpoint instead)
    if (targetMember.userId === user.uid) {
      return NextResponse.json(
        { error: 'Use the leave endpoint to leave the circle' },
        { status: 400 }
      );
    }

    // Admins cannot remove other admins (only creator can)
    if (currentMember.role === 'admin' && targetMember.role === 'admin') {
      return NextResponse.json(
        { error: 'Admins cannot remove other admins' },
        { status: 403 }
      );
    }

    // Remove member
    await CircleService.getInstance().removeMember(params.circleId, params.userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove member' },
      { status: 500 }
    );
  }
}
