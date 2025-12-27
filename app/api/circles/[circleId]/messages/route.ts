import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { CircleService } from '@/lib/services/social/CircleService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/circles/[circleId]/messages
 * Fetch messages for a circle
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;

  const { circleId } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const startAfter = searchParams.get('startAfter') || undefined;

    const messages = await CircleService.getInstance().getMessages(
      circleId,
      limit,
      startAfter
    );

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/circles/[circleId]/messages
 * Send a message to a circle
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
    const { content, type } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const message = await CircleService.getInstance().sendMessage(
      circleId,
      content,
      type || 'text'
    );

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
