import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { CircleService } from '@/lib/services/social/CircleService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/circles
 * Fetch all circles for the authenticated user
 */
export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;

  try {
    const circles = await CircleService.getInstance().getCircles(user.uid);
    return NextResponse.json({ circles });
  } catch (error: any) {
    console.error('Error fetching circles:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch circles' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/circles
 * Create a new circle
 */
export async function POST(request: NextRequest) {
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const { name, description, emoji, type, memberIds, dataSharing, settings } = body;

    // Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Circle name is required' }, { status: 400 });
    }

    if (!memberIds || memberIds.length === 0) {
      return NextResponse.json({ error: 'At least one member is required' }, { status: 400 });
    }

    const circleData = {
      name: name.trim(),
      description: description?.trim() || undefined,
      emoji: emoji || '👥',
      createdBy: user.uid,
      memberIds: Array.from(new Set([user.uid, ...memberIds])), // Ensure creator is included
      type: type || 'private',
      dataSharing: dataSharing || {
        shareHealth: true,
        shareLocation: true,
        shareActivities: true,
        shareVoiceNotes: false,
        sharePhotos: false,
      },
      settings: settings || {
        allowMemberInvites: true,
        allowChallenges: true,
        allowGroupChat: true,
        notifyOnNewMember: true,
        notifyOnActivity: false,
      },
    };

    const circle = await CircleService.getInstance().createCircle(circleData);
    return NextResponse.json({ circle }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating circle:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create circle' },
      { status: 500 }
    );
  }
}
