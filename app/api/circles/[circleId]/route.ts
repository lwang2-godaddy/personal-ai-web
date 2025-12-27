import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { CircleService } from '@/lib/services/social/CircleService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/circles/[circleId]
 * Fetch a specific circle
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;

  const { circleId } = await params;

  try {
    const circle = await CircleService.getInstance().getCircle(circleId);

    // Check if user is a member
    if (!circle.memberIds.includes(user.uid)) {
      return NextResponse.json({ error: 'Not authorized to access this circle' }, { status: 403 });
    }

    return NextResponse.json({ circle });
  } catch (error: any) {
    console.error('Error fetching circle:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch circle' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/circles/[circleId]
 * Update a circle
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;

  const { circleId } = await params;

  try {
    const body = await request.json();
    const { updates } = body;

    await CircleService.getInstance().updateCircle(circleId, updates);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating circle:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update circle' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/circles/[circleId]
 * Delete a circle
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;

  const { circleId } = await params;

  try {
    await CircleService.getInstance().deleteCircle(circleId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting circle:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete circle' },
      { status: 500 }
    );
  }
}
