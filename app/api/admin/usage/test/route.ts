import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/usage/test
 * Debug endpoint to test usage tracking
 *
 * 1. Checks if usageEvents collection has any documents
 * 2. Writes a test usage event
 * 3. Reads it back to confirm write works
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const db = getAdminFirestore();
    const results: any = {
      step1_checkCollection: null,
      step2_writeTest: null,
      step3_readBack: null,
      step4_allEvents: null,
    };

    // Step 1: Check existing documents count
    console.log('[Usage Test] Step 1: Checking usageEvents collection...');
    const existingDocs = await db.collection('usageEvents').limit(10).get();
    results.step1_checkCollection = {
      success: true,
      documentCount: existingDocs.size,
      sampleDocs: existingDocs.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }))
    };
    console.log(`[Usage Test] Found ${existingDocs.size} existing documents`);

    // Step 2: Write a test event
    console.log('[Usage Test] Step 2: Writing test usage event...');
    const testEvent = {
      userId: user.uid,
      operation: 'test_event',
      provider: 'test',
      estimatedCostUSD: 0,
      totalTokens: 0,
      endpoint: 'usage_test_endpoint',
      timestamp: new Date().toISOString(),
      metadata: {
        testRun: true,
        testedBy: user.email,
      }
    };

    try {
      const docRef = await db.collection('usageEvents').add(testEvent);
      results.step2_writeTest = {
        success: true,
        documentId: docRef.id,
        eventWritten: testEvent
      };
      console.log(`[Usage Test] Successfully wrote test event: ${docRef.id}`);

      // Step 3: Read it back
      console.log('[Usage Test] Step 3: Reading back test event...');
      const readBack = await docRef.get();
      results.step3_readBack = {
        success: readBack.exists,
        data: readBack.data()
      };
      console.log(`[Usage Test] Read back success: ${readBack.exists}`);

      // Clean up - delete test event
      await docRef.delete();
      console.log('[Usage Test] Cleaned up test event');

    } catch (writeError: any) {
      console.error('[Usage Test] Write error:', writeError);
      results.step2_writeTest = {
        success: false,
        error: writeError.message,
        code: writeError.code
      };
    }

    // Step 4: List all events in last 24 hours
    console.log('[Usage Test] Step 4: Listing recent events...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentEvents = await db.collection('usageEvents')
      .where('timestamp', '>=', yesterday.toISOString())
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();

    results.step4_allEvents = {
      count: recentEvents.size,
      events: recentEvents.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    };

    return NextResponse.json({
      success: true,
      message: 'Usage tracking test completed',
      results,
      firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });

  } catch (error: any) {
    console.error('[Usage Test] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      stack: error.stack
    }, { status: 500 });
  }
}
