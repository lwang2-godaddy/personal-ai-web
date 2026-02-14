import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/fun-facts/[factId]
 * Get a single fun fact with its matched prompt execution (heuristic match).
 *
 * Fun facts from `funFacts` collection use CarouselInsights service.
 * Fun facts from `fun_facts` collection are template-based (no execution data).
 *
 * Heuristic match for AI facts:
 * - service == 'CarouselInsights'
 * - userId == fact.userId
 * - metadata.periodType or promptId contains periodType
 * - executedAt closest to fact.generatedAt (within 60s window)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ factId: string }> }
) {
  try {
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { factId } = await params;

    if (!factId) {
      return NextResponse.json({ error: 'factId is required' }, { status: 400 });
    }

    const db = getAdminFirestore();

    // Determine collection from prefixed ID
    let collection: string;
    let docId: string;

    if (factId.startsWith('funFacts:')) {
      collection = 'funFacts';
      docId = factId.replace('funFacts:', '');
    } else if (factId.startsWith('fun_facts:')) {
      collection = 'fun_facts';
      docId = factId.replace('fun_facts:', '');
    } else {
      // Try funFacts first, then fun_facts
      collection = 'funFacts';
      docId = factId;
    }

    // Get the fact
    const factDoc = await db.collection(collection).doc(docId).get();

    if (!factDoc.exists) {
      // Try the other collection if first didn't work
      const altCollection = collection === 'funFacts' ? 'fun_facts' : 'funFacts';
      const altDoc = await db.collection(altCollection).doc(docId).get();
      if (!altDoc.exists) {
        return NextResponse.json({ error: 'Fun fact not found' }, { status: 404 });
      }
      // Found in alt collection
      const factData = altDoc.data()!;
      return NextResponse.json({
        fact: { id: altDoc.id, source: altCollection, ...factData },
        execution: null,
      });
    }

    const factData = factDoc.data()!;
    const fact = {
      id: factDoc.id,
      source: collection,
      ...factData,
    };

    // Only AI-generated facts (funFacts collection) have execution data
    let execution = null;

    if (collection === 'funFacts' && factData.userId) {
      const generatedAt = factData.generatedAt;

      if (generatedAt) {
        // Query for CarouselInsights executions for this user
        const query = db
          .collection('promptExecutions')
          .where('service', '==', 'CarouselInsights')
          .where('userId', '==', factData.userId);

        const snapshot = await query
          .orderBy('executedAt', 'desc')
          .limit(50)
          .get();

        if (!snapshot.empty) {
          // Parse the fact's generatedAt timestamp
          let factTime: number;
          if (typeof generatedAt === 'string') {
            factTime = new Date(generatedAt).getTime();
          } else if (typeof generatedAt === 'number') {
            factTime = generatedAt;
          } else if (generatedAt && typeof generatedAt.toDate === 'function') {
            factTime = generatedAt.toDate().getTime();
          } else {
            factTime = 0;
          }

          if (factTime > 0) {
            type MatchResult = { doc: FirebaseFirestore.QueryDocumentSnapshot; timeDiff: number };
            let bestMatch: MatchResult | null = null;

            snapshot.docs.forEach((doc) => {
              const execData = doc.data();
              const metadata = execData.metadata || {};

              // Check if promptId or metadata matches the insight type
              const insightTypeMatch =
                !factData.insightType ||
                execData.promptId?.includes(factData.insightType) ||
                metadata.insightType === factData.insightType;

              const periodTypeMatch =
                !factData.periodType ||
                execData.promptId?.includes(factData.periodType) ||
                metadata.periodType === factData.periodType;

              if (insightTypeMatch && periodTypeMatch) {
                let execTime: number;
                const execAt = execData.executedAt;
                if (typeof execAt === 'string') {
                  execTime = new Date(execAt).getTime();
                } else if (typeof execAt === 'number') {
                  execTime = execAt;
                } else if (execAt && typeof execAt.toDate === 'function') {
                  execTime = execAt.toDate().getTime();
                } else {
                  execTime = 0;
                }

                if (execTime > 0) {
                  const timeDiff = Math.abs(factTime - execTime);
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
              const matched = bestMatch as MatchResult;
              const execData = matched.doc.data();
              execution = {
                id: matched.doc.id,
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
    }

    return NextResponse.json({ fact, execution });
  } catch (error: unknown) {
    console.error('[Admin Fun Fact Detail API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch fun fact';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
