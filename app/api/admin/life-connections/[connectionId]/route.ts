import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/life-connections/[connectionId]
 * Get a single life connection with its matched prompt execution (heuristic match).
 *
 * Query params:
 * - userId: string (required)
 *
 * Since connections don't store a direct promptExecutionId, we match by:
 * - service == 'LifeConnectionsService'
 * - userId == connection.userId
 * - executedAt closest to connection.detectedAt (within 120s window)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { connectionId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!connectionId) {
      return NextResponse.json({ error: 'connectionId is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const db = getAdminFirestore();

    // Get the connection from subcollection
    const connectionDoc = await db
      .collection('users')
      .doc(userId)
      .collection('lifeConnections')
      .doc(connectionId)
      .get();

    if (!connectionDoc.exists) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const connectionData = connectionDoc.data()!;
    const connection = {
      id: connectionDoc.id,
      ...connectionData,
    };

    // Heuristic match: find the prompt execution that generated this connection
    let execution = null;

    const detectedAt = connectionData.detectedAt;
    if (detectedAt && userId) {
      const query = db
        .collection('promptExecutions')
        .where('service', '==', 'LifeConnectionsService')
        .where('userId', '==', userId)
        .orderBy('executedAt', 'desc')
        .limit(50);

      const snapshot = await query.get();

      if (!snapshot.empty) {
        // Parse the connection's detectedAt timestamp (it's a number/epoch)
        let connectionTime: number;
        if (typeof detectedAt === 'number') {
          connectionTime = detectedAt;
        } else if (typeof detectedAt === 'string') {
          connectionTime = new Date(detectedAt).getTime();
        } else if (detectedAt && typeof detectedAt.toDate === 'function') {
          connectionTime = detectedAt.toDate().getTime();
        } else {
          connectionTime = 0;
        }

        if (connectionTime > 0) {
          let bestMatchDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
          let bestMatchTimeDiff = Infinity;

          for (const doc of snapshot.docs) {
            const execData = doc.data();

            let execTime: number;
            const execAt = execData.executedAt;
            if (typeof execAt === 'number') {
              execTime = execAt;
            } else if (typeof execAt === 'string') {
              execTime = new Date(execAt).getTime();
            } else if (execAt && typeof execAt.toDate === 'function') {
              execTime = execAt.toDate().getTime();
            } else {
              execTime = 0;
            }

            if (execTime > 0) {
              const timeDiff = Math.abs(connectionTime - execTime);
              // Within 120 second window (connections may take longer to generate)
              if (timeDiff <= 120000 && timeDiff < bestMatchTimeDiff) {
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

    return NextResponse.json({ connection, execution });
  } catch (error: unknown) {
    console.error('[Admin Life Connection Detail API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch connection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
