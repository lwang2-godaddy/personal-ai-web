import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/chat/feedback
 * Submit or remove feedback on an assistant message
 *
 * Body:
 * - messageId: string (required)
 * - rating: 'thumbs_up' | 'thumbs_down' | null (null removes feedback)
 * - comment?: string (optional, max 500 chars)
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { messageId, rating, comment } = body;

    if (!messageId || typeof messageId !== 'string') {
      return NextResponse.json(
        { error: 'messageId is required' },
        { status: 400 }
      );
    }

    if (rating !== null && rating !== 'thumbs_up' && rating !== 'thumbs_down') {
      return NextResponse.json(
        { error: 'rating must be "thumbs_up", "thumbs_down", or null' },
        { status: 400 }
      );
    }

    if (comment && (typeof comment !== 'string' || comment.length > 500)) {
      return NextResponse.json(
        { error: 'comment must be a string with max 500 characters' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const messageRef = db.collection('chat_messages').doc(messageId);
    const messageDoc = await messageRef.get();

    if (!messageDoc.exists) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    const messageData = messageDoc.data()!;

    // Verify ownership
    if (messageData.userId !== user.uid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Only assistant messages can receive feedback
    if (messageData.role !== 'assistant') {
      return NextResponse.json(
        { error: 'Feedback can only be submitted on assistant messages' },
        { status: 400 }
      );
    }

    // Update feedback
    if (rating === null) {
      // Remove feedback (toggle off)
      const { FieldValue } = await import('firebase-admin/firestore');
      await messageRef.update({ feedback: FieldValue.delete() });
    } else {
      const feedback: Record<string, any> = {
        rating,
        timestamp: new Date().toISOString(),
      };
      if (comment) {
        feedback.comment = comment;
      }
      await messageRef.update({ feedback });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[Chat Feedback API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to submit feedback';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
