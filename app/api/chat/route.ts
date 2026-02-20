import { NextRequest, NextResponse } from 'next/server';
import RAGEngine from '@/lib/services/rag/RAGEngine.server';
import { requireAuth } from '@/lib/middleware/auth';
import UsageTracker from '@/lib/services/usage/UsageTracker';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// Force dynamic rendering (don't pre-render at build time)
export const dynamic = 'force-dynamic';

/**
 * Generate a conversation title from the first message
 * Truncates to ~50 characters at a word boundary
 */
function generateTitleFromMessage(message: string): string {
  if (!message || message.trim().length === 0) {
    return 'New Conversation';
  }

  const trimmed = message.trim();
  if (trimmed.length <= 50) {
    return trimmed;
  }

  // Find a word boundary near 50 characters
  const truncated = trimmed.substring(0, 50);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 20) {
    return truncated.substring(0, lastSpace) + '...';
  }
  return truncated + '...';
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { message, conversationHistory, conversationId } = body;
    const userId = user.uid;

    console.log('[Chat API] Received request:', {
      message: message?.substring(0, 50) + '...',
      userId,
      conversationId: conversationId || 'new',
      hasHistory: conversationHistory?.length > 0,
      historyLength: conversationHistory?.length || 0,
    });

    if (!message) {
      console.error('[Chat API] Missing required field: message');
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Check usage limits before proceeding
    const canProceed = await UsageTracker.checkLimits(userId);
    if (!canProceed) {
      console.warn('[Chat API] User', userId, 'exceeded usage limits');
      return NextResponse.json(
        { error: 'Usage limit exceeded. Please upgrade your plan or wait until the next billing cycle.' },
        { status: 429 }
      );
    }

    const db = getAdminFirestore();
    const now = new Date().toISOString();

    // Create or get conversation
    let activeConversationId = conversationId;
    const isNewConversation = !conversationId;

    if (isNewConversation) {
      // Create new conversation in users/{userId}/conversations
      const convRef = db.collection('users').doc(userId).collection('conversations').doc();
      activeConversationId = convRef.id;

      await convRef.set({
        userId,
        title: generateTitleFromMessage(message),
        messageCount: 0,
        isActive: true,
        isPinned: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log('[Chat API] Created new conversation:', activeConversationId);
    }

    // Save user message to chat_messages collection
    const userMsgRef = db.collection('chat_messages').doc();
    await userMsgRef.set({
      userId,
      conversationId: activeConversationId,
      role: 'user',
      content: message,
      timestamp: now,
      voiceInput: false,
    });

    // Query RAGEngine
    console.log('[Chat API] Calling RAGEngine...');
    const startTime = Date.now();

    let result;
    if (conversationHistory && conversationHistory.length > 0) {
      result = await RAGEngine.queryWithHistory(message, userId, conversationHistory);
    } else {
      result = await RAGEngine.query(message, userId);
    }

    const duration = Date.now() - startTime;
    console.log('[Chat API] RAGEngine completed in', duration, 'ms');
    console.log('[Chat API] Response preview:', result.response.substring(0, 100) + '...');
    console.log('[Chat API] Context used:', result.contextUsed?.length || 0, 'items');
    console.log('[Chat API] Provider info:', {
      provider: result.providerInfo?.providerId,
      model: result.providerInfo?.model,
      tokens: result.providerInfo ? `${result.providerInfo.inputTokens}+${result.providerInfo.outputTokens}` : 'N/A',
      cost: result.providerInfo?.estimatedCostUSD?.toFixed(4),
    });

    const assistantTimestamp = new Date().toISOString();

    // Save assistant message to chat_messages collection (with provider tracking)
    const assistantMsgRef = db.collection('chat_messages').doc();
    const assistantMsgData: Record<string, any> = {
      userId,
      conversationId: activeConversationId,
      role: 'assistant',
      content: result.response,
      timestamp: assistantTimestamp,
      contextUsed: result.contextUsed || [],
    };

    // Add provider tracking fields if available
    if (result.providerInfo) {
      assistantMsgData.provider = result.providerInfo.providerId;
      assistantMsgData.model = result.providerInfo.model;
      assistantMsgData.inputTokens = result.providerInfo.inputTokens;
      assistantMsgData.outputTokens = result.providerInfo.outputTokens;
      assistantMsgData.latencyMs = result.providerInfo.latencyMs;
      assistantMsgData.estimatedCostUSD = result.providerInfo.estimatedCostUSD;
    }

    await assistantMsgRef.set(assistantMsgData);

    // Update conversation metadata
    const convRef = db.collection('users').doc(userId).collection('conversations').doc(activeConversationId);
    await convRef.update({
      messageCount: FieldValue.increment(2), // user + assistant
      lastMessage: result.response.substring(0, 100),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      response: result.response,
      contextUsed: result.contextUsed,
      conversationId: activeConversationId,
      providerInfo: result.providerInfo,
      assistantMessageId: assistantMsgRef.id,
    });
  } catch (error: any) {
    console.error('[Chat API] Error:', error.message);
    console.error('[Chat API] Stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to process message' },
      { status: 500 }
    );
  }
}
