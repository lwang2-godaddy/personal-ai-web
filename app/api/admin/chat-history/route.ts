import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

export const maxDuration = 300;

/**
 * GET /api/admin/chat-history
 * List chat conversations with messages and context used
 *
 * Data structure in Firestore:
 * - Conversations: users/{userId}/conversations/{conversationId}
 * - Messages: chat_messages collection (root) with userId and conversationId fields
 *
 * Query params:
 * - userId: string (required for user-specific view)
 * - startDate: string (optional, ISO date string for date range start)
 * - endDate: string (optional, ISO date string for date range end)
 * - limit: number (optional, default 20)
 * - startAfter: string (optional, document ID for cursor-based pagination)
 *
 * Returns:
 * - conversations: ChatConversation[]
 * - hasMore: boolean
 * - totalCount: number
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const startAfter = searchParams.get('startAfter');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // Query conversations from users/{userId}/conversations
    let query: FirebaseFirestore.Query = db
      .collection('users')
      .doc(userId)
      .collection('conversations')
      .orderBy('updatedAt', 'desc');

    // Apply date filters
    if (startDate) {
      query = query.where('updatedAt', '>=', new Date(startDate));
    }

    // Cursor-based pagination
    if (startAfter) {
      const startAfterDoc = await db
        .collection('users')
        .doc(userId)
        .collection('conversations')
        .doc(startAfter)
        .get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    // Fetch one extra to determine if there are more results
    query = query.limit(limit + 1);

    const snapshot = await query.get();

    const hasMore = snapshot.docs.length > limit;
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

    // For each conversation, fetch its messages from chat_messages collection
    const conversations = await Promise.all(
      docs.map(async (doc) => {
        const convData = doc.data();
        const conversationId = doc.id;

        // Fetch messages for this conversation
        const messagesSnapshot = await db
          .collection('chat_messages')
          .where('userId', '==', userId)
          .where('conversationId', '==', conversationId)
          .orderBy('timestamp', 'asc')
          .get();

        const messages = messagesSnapshot.docs.map((msgDoc) => {
          const msgData = msgDoc.data();
          return {
            id: msgDoc.id,
            role: msgData.role,
            content: msgData.content,
            timestamp: msgData.timestamp,
            voiceInput: msgData.voiceInput || false,
            contextUsed: msgData.contextUsed || [],
            // Provider tracking fields
            provider: msgData.provider,
            model: msgData.model,
            inputTokens: msgData.inputTokens,
            outputTokens: msgData.outputTokens,
            latencyMs: msgData.latencyMs,
            estimatedCostUSD: msgData.estimatedCostUSD,
            promptExecutionId: msgData.promptExecutionId,
            // Feedback
            feedback: msgData.feedback || null,
          };
        });

        // Calculate stats
        const userMessages = messages.filter((m) => m.role === 'user');
        const assistantMessages = messages.filter((m) => m.role === 'assistant');
        const messagesWithContext = assistantMessages.filter(
          (m) => m.contextUsed && m.contextUsed.length > 0
        );

        // Get all context types used in this conversation
        const contextTypes = new Set<string>();
        assistantMessages.forEach((m) => {
          if (m.contextUsed) {
            m.contextUsed.forEach((ctx: { type: string }) => contextTypes.add(ctx.type));
          }
        });

        // Calculate provider breakdown and costs
        const providerBreakdown: Record<string, number> = {};
        let totalCost = 0;
        let totalTokens = 0;
        let totalLatencyMs = 0;
        assistantMessages.forEach((m: any) => {
          if (m.provider) {
            providerBreakdown[m.provider] = (providerBreakdown[m.provider] || 0) + 1;
          }
          if (m.estimatedCostUSD) {
            totalCost += m.estimatedCostUSD;
          }
          if (m.inputTokens || m.outputTokens) {
            totalTokens += (m.inputTokens || 0) + (m.outputTokens || 0);
          }
          if (m.latencyMs) {
            totalLatencyMs += m.latencyMs;
          }
        });
        const avgLatencyMs = assistantMessages.length > 0 ? Math.round(totalLatencyMs / assistantMessages.length) : 0;

        // Feedback counts
        const thumbsUpCount = messages.filter((m: any) => m.feedback?.rating === 'thumbs_up').length;
        const thumbsDownCount = messages.filter((m: any) => m.feedback?.rating === 'thumbs_down').length;

        // Parse timestamps for display
        const createdAt = convData.createdAt?.toDate?.()
          ? convData.createdAt.toDate().toISOString()
          : convData.createdAt;
        const updatedAt = convData.updatedAt?.toDate?.()
          ? convData.updatedAt.toDate().toISOString()
          : convData.updatedAt;

        return {
          id: conversationId,
          userId: userId,
          title: convData.title || 'Untitled Conversation',
          messages: messages,
          messageCount: messages.length,
          userMessageCount: userMessages.length,
          assistantMessageCount: assistantMessages.length,
          messagesWithContextCount: messagesWithContext.length,
          contextTypesUsed: Array.from(contextTypes),
          createdAt,
          updatedAt,
          // Preview: first user message or conversation title
          preview: userMessages.length > 0 ? userMessages[0].content : convData.title || null,
          // Provider tracking stats
          providerBreakdown,
          totalCost,
          totalTokens,
          avgLatencyMs,
          // Feedback stats
          thumbsUpCount,
          thumbsDownCount,
        };
      })
    );

    // Get total count for user
    const countSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('conversations')
      .count()
      .get();
    const totalCount = countSnapshot.data().count;

    return NextResponse.json({
      conversations,
      hasMore: hasMore && conversations.length > 0,
      totalCount,
    });
  } catch (error: unknown) {
    console.error('[Admin Chat History API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch chat history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
