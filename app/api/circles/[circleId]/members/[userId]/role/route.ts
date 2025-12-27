import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { CircleService } from '@/lib/services/social/CircleService';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/circles/[circleId]/members/[userId]/role
 * Update a member's role (promote/demote)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { circleId: string; userId: string } }
) {
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const { role } = body;

    // Validate role
    if (!role || !['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "admin" or "member"' },
        { status: 400 }
      );
    }

    // Verify current user is creator or admin
    const members = await CircleService.getInstance().getCircleMembers(params.circleId);
    const currentMember = members.find((m) => m.userId === user.uid);

    if (!currentMember) {
      return NextResponse.json(
        { error: 'You are not a member of this circle' },
        { status: 403 }
      );
    }

    // Only creator can change roles
    if (currentMember.role !== 'creator') {
      return NextResponse.json(
        { error: 'Only the circle creator can change member roles' },
        { status: 403 }
      );
    }

    // Verify target member exists
    const targetMember = members.find((m) => m.userId === params.userId);
    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot change creator's role
    if (targetMember.role === 'creator') {
      return NextResponse.json(
        { error: 'Cannot change the creator\'s role' },
        { status: 400 }
      );
    }

    // Update role
    await CircleService.getInstance().updateMemberRole(
      params.circleId,
      params.userId,
      role as 'admin' | 'member'
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update member role' },
      { status: 500 }
    );
  }
}
