import { NextRequest, NextResponse } from 'next/server';
import RAGEngine from '@/lib/services/rag/RAGEngine';

// Force dynamic rendering (don't pre-render at build time)
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, userId, conversationHistory } = body;

    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Message and userId are required' },
        { status: 400 }
      );
    }

    // Query RAGEngine
    let result;
    if (conversationHistory && conversationHistory.length > 0) {
      result = await RAGEngine.queryWithHistory(message, userId, conversationHistory);
    } else {
      result = await RAGEngine.query(message, userId);
    }

    return NextResponse.json({
      response: result.response,
      contextUsed: result.contextUsed,
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process message' },
      { status: 500 }
    );
  }
}
