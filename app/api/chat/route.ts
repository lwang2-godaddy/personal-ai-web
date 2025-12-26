import { NextRequest, NextResponse } from 'next/server';
import RAGEngine from '@/lib/services/rag/RAGEngine';

// Force dynamic rendering (don't pre-render at build time)
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, userId, conversationHistory } = body;

    console.log('[Chat API] Received request:', {
      message: message?.substring(0, 50) + '...',
      userId,
      hasHistory: conversationHistory?.length > 0,
      historyLength: conversationHistory?.length || 0,
    });

    if (!message || !userId) {
      console.error('[Chat API] Missing required fields:', { message: !!message, userId: !!userId });
      return NextResponse.json(
        { error: 'Message and userId are required' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      response: result.response,
      contextUsed: result.contextUsed,
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
