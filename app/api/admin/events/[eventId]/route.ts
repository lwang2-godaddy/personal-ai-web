import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/events/[eventId]
 * Get a single event with its matched prompt execution (heuristic match).
 *
 * Since events don't store a direct promptExecutionId, we match by:
 * - service == 'EventExtractionService'
 * - userId == event.userId
 * - executedAt closest to event.createdAt (within 60s window)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { eventId } = await params;

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    const db = getAdminFirestore();

    // Get the event
    const eventDoc = await db.collection('events').doc(eventId).get();

    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const eventData = eventDoc.data()!;
    const event = {
      id: eventDoc.id,
      ...eventData,
    };

    // Heuristic match: find the prompt execution that generated this event
    let execution = null;

    const createdAt = eventData.createdAt;
    if (createdAt && eventData.userId) {
      const snapshot = await db
        .collection('promptExecutions')
        .where('service', '==', 'EventExtractionService')
        .where('userId', '==', eventData.userId)
        .orderBy('executedAt', 'desc')
        .limit(50)
        .get();

      if (!snapshot.empty) {
        // Parse the event's createdAt timestamp
        let eventTime: number;
        if (typeof createdAt === 'string') {
          eventTime = new Date(createdAt).getTime();
        } else if (createdAt && typeof createdAt.toDate === 'function') {
          eventTime = createdAt.toDate().getTime();
        } else {
          eventTime = 0;
        }

        if (eventTime > 0) {
          let bestMatchDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
          let bestMatchTimeDiff = Infinity;

          for (const doc of snapshot.docs) {
            const execData = doc.data();

            let execTime: number;
            const execAt = execData.executedAt;
            if (typeof execAt === 'string') {
              execTime = new Date(execAt).getTime();
            } else if (execAt && typeof execAt.toDate === 'function') {
              execTime = execAt.toDate().getTime();
            } else {
              execTime = 0;
            }

            if (execTime > 0) {
              const timeDiff = Math.abs(eventTime - execTime);
              // Within 60 second window
              if (timeDiff <= 60000 && timeDiff < bestMatchTimeDiff) {
                bestMatchDoc = doc;
                bestMatchTimeDiff = timeDiff;
              }
            }
          }

          if (bestMatchDoc) {
            const execData = bestMatchDoc.data();
            execution = {
              id: bestMatchDoc.id,
              userId: execData.userId,
              service: execData.service,
              promptId: execData.promptId,
              language: execData.language,
              promptVersion: execData.promptVersion,
              promptSource: execData.promptSource,
              model: execData.model,
              temperature: execData.temperature,
              maxTokens: execData.maxTokens,
              inputSummary: execData.inputSummary,
              inputTokens: execData.inputTokens,
              outputSummary: execData.outputSummary,
              outputTokens: execData.outputTokens,
              totalTokens: execData.totalTokens,
              estimatedCostUSD: execData.estimatedCostUSD,
              latencyMs: execData.latencyMs,
              success: execData.success,
              errorMessage: execData.errorMessage,
              executedAt: execData.executedAt,
              metadata: execData.metadata,
            };
          }
        }
      }
    }

    return NextResponse.json({ event, execution });
  } catch (error: unknown) {
    console.error('[Admin Event Detail API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch event';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
