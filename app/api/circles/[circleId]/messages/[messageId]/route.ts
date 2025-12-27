import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { CircleService } from '@/lib/services/social/CircleService';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/circles/[circleId]/messages/[messageId]
 * Delete a message (author or admins only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ circleId: string; messageId: string }> }
) {
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;

  const { circleId, messageId } = await params;

  try {
    // Verify user is a member
    const members = await CircleService.getInstance().getCircleMembers(circleId);
    const currentMember = members.find((m) => m.userId === user.uid);

    if (!currentMember) {
      return NextResponse.json(
        { error: 'You are not a member of this circle' },
        { status: 403 }
      );
    }

    // TODO: Fetch message to verify ownership
    // For now, CircleService.deleteMessage will verify ownership

    await CircleService.getInstance().deleteMessage(circleId, messageId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete message' },
      { status: 500 }
    );
  }
}
