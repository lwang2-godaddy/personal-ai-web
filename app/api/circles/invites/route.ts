import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { CircleService } from '@/lib/services/social/CircleService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/circles/invites
 * Fetch circle invites for the authenticated user
 */
export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;

  try {
    const invites = await CircleService.getInstance().getCircleInvites(user.uid);
    return NextResponse.json({ invites });
  } catch (error: any) {
    console.error('Error fetching invites:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invites' },
      { status: 500 }
    );
  }
}
