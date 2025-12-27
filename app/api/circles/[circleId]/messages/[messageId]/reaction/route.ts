import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { CircleService } from '@/lib/services/social/CircleService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/circles/[circleId]/messages/[messageId]/reaction
 * Add a reaction emoji to a message
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ circleId: string; messageId: string }> }
) {
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;

  const { circleId, messageId } = await params;

  try {
    const body = await request.json();
    const { emoji } = body;

    // Validate emoji
    if (!emoji || typeof emoji !== 'string') {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });
    }

    // Verify user is a member
    const members = await CircleService.getInstance().getCircleMembers(circleId);
    const currentMember = members.find((m) => m.userId === user.uid);

    if (!currentMember) {
      return NextResponse.json(
        { error: 'You are not a member of this circle' },
        { status: 403 }
      );
    }

    // Add reaction
    await CircleService.getInstance().addReaction(circleId, messageId, emoji);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error adding reaction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add reaction' },
      { status: 500 }
    );
  }
}
