import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/life-keywords/[keywordId]
 * Get a single life keyword with its matched prompt execution (heuristic match).
 *
 * Since keywords don't store a direct promptExecutionId, we match by:
 * - service == 'KeywordGenerator'
 * - userId == keyword.userId
 * - metadata.category == keyword.category
 * - metadata.periodType == keyword.periodType
 * - executedAt closest to keyword.generatedAt (within 60s window)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ keywordId: string }> }
) {
  try {
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { keywordId } = await params;

    if (!keywordId) {
      return NextResponse.json({ error: 'keywordId is required' }, { status: 400 });
    }

    const db = getAdminFirestore();

    // Get the keyword
    const keywordDoc = await db.collection('lifeKeywords').doc(keywordId).get();

    if (!keywordDoc.exists) {
      return NextResponse.json({ error: 'Keyword not found' }, { status: 404 });
    }

    const keywordData = keywordDoc.data()!;
    const keyword = {
      id: keywordDoc.id,
      ...keywordData,
    };

    // Heuristic match: find the prompt execution that generated this keyword
    let execution = null;

    const generatedAt = keywordData.generatedAt;
    if (generatedAt && keywordData.userId) {
      // Query for KeywordGenerator executions for this user
      let query = db
        .collection('promptExecutions')
        .where('service', '==', 'KeywordGenerator')
        .where('userId', '==', keywordData.userId);

      // Try to narrow down with metadata fields if they exist as top-level query fields
      // Note: Firestore doesn't support querying nested metadata fields directly,
      // so we fetch candidates and filter client-side
      const snapshot = await query
        .orderBy('executedAt', 'desc')
        .limit(50)
        .get();

      if (!snapshot.empty) {
        // Parse the keyword's generatedAt timestamp
        let keywordTime: number;
        if (typeof generatedAt === 'string') {
          keywordTime = new Date(generatedAt).getTime();
        } else if (generatedAt && typeof generatedAt.toDate === 'function') {
          keywordTime = generatedAt.toDate().getTime();
        } else {
          keywordTime = 0;
        }

        if (keywordTime > 0) {
          let bestMatch: { doc: FirebaseFirestore.QueryDocumentSnapshot; timeDiff: number } | null = null;

          snapshot.docs.forEach((doc) => {
            const execData = doc.data();
            const metadata = execData.metadata || {};

            // Check metadata matches
            const categoryMatch =
              !keywordData.category || metadata.category === keywordData.category;
            const periodTypeMatch =
              !keywordData.periodType || metadata.periodType === keywordData.periodType;

            if (categoryMatch && periodTypeMatch) {
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
                const timeDiff = Math.abs(keywordTime - execTime);
                // Within 60 second window
                if (timeDiff <= 60000) {
                  if (!bestMatch || timeDiff < bestMatch.timeDiff) {
                    bestMatch = { doc, timeDiff };
                  }
                }
              }
            }
          });

          if (bestMatch) {
            const execData = bestMatch.doc.data();
            execution = {
              id: bestMatch.doc.id,
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

    return NextResponse.json({ keyword, execution });
  } catch (error: unknown) {
    console.error('[Admin Life Keyword Detail API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch keyword';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
