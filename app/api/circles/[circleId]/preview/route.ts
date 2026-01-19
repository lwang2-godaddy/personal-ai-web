import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { CircleService } from '@/lib/services/social/CircleService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/circles/[circleId]/preview
 * Get circle preview info for invite modal (no membership validation)
 * Returns: name, emoji, description, dataSharing, memberCount, isPredefined, privacyTier
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;

  const { circleId } = await params;

  try {
    const circleService = CircleService.getInstance();
    const circle = await circleService.getCircleForInvite(circleId);

    if (!circle) {
      return NextResponse.json(
        { error: 'Circle not found' },
        { status: 404 }
      );
    }

    // Return preview data (limited fields for security)
    return NextResponse.json({
      circle: {
        id: circle.id,
        name: circle.name,
        emoji: circle.emoji,
        description: circle.description,
        dataSharing: circle.dataSharing,
        memberCount: circle.memberIds?.length || 0,
        isPredefined: circle.isPredefined || false,
        privacyTier: circle.privacyTier || null,
      },
    });
  } catch (error: any) {
    console.error('Error fetching circle preview:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch circle preview' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/circles/[circleId]/preview
 * Get circle preview with inviter info
 * Body: { fromUserId: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;

  const { circleId } = await params;

  try {
    const body = await request.json();
    const { fromUserId } = body;

    const circleService = CircleService.getInstance();

    // Fetch circle and inviter name in parallel
    const [circle, inviterName] = await Promise.all([
      circleService.getCircleForInvite(circleId),
      fromUserId ? circleService.getUserDisplayName(fromUserId) : Promise.resolve('Someone'),
    ]);

    if (!circle) {
      return NextResponse.json(
        { error: 'Circle not found' },
        { status: 404 }
      );
    }

    // Return preview data (limited fields for security)
    return NextResponse.json({
      circle: {
        id: circle.id,
        name: circle.name,
        emoji: circle.emoji,
        description: circle.description,
        dataSharing: circle.dataSharing,
        memberCount: circle.memberIds?.length || 0,
        isPredefined: circle.isPredefined || false,
        privacyTier: circle.privacyTier || null,
      },
      inviterName,
    });
  } catch (error: any) {
    console.error('Error fetching circle preview:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch circle preview' },
      { status: 500 }
    );
  }
}
