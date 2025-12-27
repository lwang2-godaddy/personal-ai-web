import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { CircleService } from '@/lib/services/social/CircleService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/circles/invites/[inviteId]/reject
 * Reject a circle invitation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { inviteId: string } }
) {
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;

  try {
    await CircleService.getInstance().rejectInvite(params.inviteId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error rejecting invite:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reject invite' },
      { status: 500 }
    );
  }
}
