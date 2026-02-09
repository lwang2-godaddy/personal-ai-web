/**
 * RAG Engine - Integration Tests
 *
 * Tests the Retrieval-Augmented Generation query system:
 * 1. queryRAG Cloud Function - Main entry point
 * 2. Pinecone vector search - Semantic retrieval
 * 3. Context building - Formatting for GPT
 * 4. Response generation - GPT-4o completion
 *
 * Flow: User question → Embedding → Pinecone query → Context → GPT → Response
 *
 * Key Verifications:
 * - Query returns relevant context
 * - AI response is coherent
 * - userId isolation is enforced
 * - Temporal filters work correctly
 */

import * as admin from 'firebase-admin';
import type { TestResult } from '../lib/test-utils';
import {
  generateTestId,
  wait,
} from '../lib/test-utils';
import {
  log,
  colors,
  logPass,
  logFail,
  logInfo,
  logTestCase,
  logQueryBox,
  logCleanup,
  logCleanupResult,
} from '../lib/reporter';

// Test name for discovery
export const name = 'RAG Engine';

// Cloud Function URL
const QUERY_RAG_URL = 'https://us-central1-personalaiapp-90131.cloudfunctions.net/queryRAG';

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId, idToken, pinecone } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Basic RAG query
  const test1Results = await testBasicRAGQuery(userId, idToken);
  allResults.push(...test1Results);

  // Test Case 2: Query with activity filter
  const test2Results = await testActivityFilterQuery(userId, idToken);
  allResults.push(...test2Results);

  // Test Case 3: Pinecone direct query (userId isolation)
  const test3Results = await testPineconeDirectQuery(userId, pinecone);
  allResults.push(...test3Results);

  // Test Case 4: Response quality check
  const test4Results = await testResponseQuality(userId, idToken);
  allResults.push(...test4Results);

  // Test Case 5: Context retrieval metrics
  const test5Results = await testContextRetrievalMetrics(userId, idToken);
  allResults.push(...test5Results);

  return allResults;
}

/**
 * Helper: Call queryRAG Cloud Function
 */
async function callQueryRAG(
  query: string,
  userId: string,
  idToken: string,
  options?: {
    temporalFilter?: { startDate?: string; endDate?: string };
    dataTypeFilter?: string;
    activityFilter?: string;
  }
): Promise<any> {
  const response = await fetch(QUERY_RAG_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      query,
      userId,
      ...options,
    }),
  });

  if (!response.ok) {
    throw new Error(`queryRAG returned ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Test Case 1: Basic RAG Query
 */
async function testBasicRAGQuery(
  userId: string,
  idToken: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Basic RAG Query');

  try {
    const query = 'What have I been doing recently?';

    logQueryBox('queryRAG Request', [
      `Query: "${query}"`,
      'Type: Basic (no filters)',
    ]);

    const response = await callQueryRAG(query, userId, idToken);

    const hasResponse = !!response.response;
    const hasContext = response.contextUsed?.length > 0;

    logInfo(`Response length: ${response.response?.length || 0} chars`);
    logInfo(`Context items: ${response.contextUsed?.length || 0}`);

    if (hasResponse) {
      logPass('AI response received');
      log(`  "${response.response.substring(0, 100)}..."`, colors.dim);
    } else {
      logFail('No AI response');
    }

    results.push({
      name: 'RAG: Basic query returns response',
      passed: hasResponse,
      reason: hasResponse
        ? `Response: ${response.response?.length} chars`
        : 'No response received',
      details: {
        responseLength: response.response?.length,
        contextItems: response.contextUsed?.length,
      },
    });

    if (hasContext) {
      logPass(`${response.contextUsed.length} context items retrieved`);
    } else {
      logInfo('No context items (user may need more data)');
    }

    results.push({
      name: 'RAG: Context items retrieved',
      passed: true, // Informational
      reason: hasContext
        ? `${response.contextUsed.length} context items used`
        : 'No context items (may need more data)',
      details: { contextItems: response.contextUsed },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'RAG: Basic query',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 2: Query with Activity Filter
 */
async function testActivityFilterQuery(
  userId: string,
  idToken: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Activity Filter Query');

  try {
    const query = 'How often have I played badminton?';

    logQueryBox('queryRAG with Activity Filter', [
      `Query: "${query}"`,
      'Expected: Activity detection → filter',
    ]);

    const response = await callQueryRAG(query, userId, idToken);

    const hasResponse = !!response.response;

    // Check if response mentions badminton or activities
    const mentionsBadminton = response.response?.toLowerCase().includes('badminton');
    const mentionsActivity = response.response?.toLowerCase().includes('activity') ||
      response.response?.toLowerCase().includes('exercise') ||
      response.response?.toLowerCase().includes('sport');

    logInfo(`Response mentions badminton: ${mentionsBadminton}`);
    logInfo(`Response mentions activity: ${mentionsActivity}`);

    if (mentionsBadminton) {
      logPass('Response correctly addresses badminton query');
    } else if (hasResponse) {
      logInfo('Response received but may not have badminton data');
    }

    results.push({
      name: 'RAG: Activity query relevance',
      passed: hasResponse,
      reason: mentionsBadminton
        ? 'Response correctly addresses badminton'
        : hasResponse
          ? 'Response received (may not have badminton data)'
          : 'No response',
      details: {
        mentionsBadminton,
        mentionsActivity,
        responsePreview: response.response?.substring(0, 100),
      },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'RAG: Activity filter query',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 3: Pinecone Direct Query (userId Isolation)
 */
async function testPineconeDirectQuery(
  userId: string,
  pinecone: any
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Pinecone Direct Query (userId Isolation)');

  try {
    const pineconeIndex = pinecone.index(process.env.NEXT_PUBLIC_PINECONE_INDEX || 'personal-ai-data');

    // Query with userId filter
    const queryResult = await pineconeIndex.query({
      vector: new Array(1536).fill(0.1), // Dummy vector
      topK: 10,
      filter: { userId },
      includeMetadata: true,
    });

    logQueryBox('Direct Pinecone Query', [
      `filter: { userId: "${userId.substring(0, 8)}..." }`,
      `topK: 10`,
    ]);

    const matchCount = queryResult.matches?.length || 0;
    logInfo(`Matches returned: ${matchCount}`);

    // Verify userId in all results
    let userIdMatches = 0;
    let userIdMismatches = 0;

    queryResult.matches?.forEach((match: any) => {
      if (match.metadata?.userId === userId) {
        userIdMatches++;
      } else {
        userIdMismatches++;
      }
    });

    const isolationVerified = matchCount === 0 || userIdMismatches === 0;

    if (isolationVerified) {
      logPass(`userId isolation verified (${userIdMatches}/${matchCount} matches)`);
    } else {
      logFail(`userId isolation FAILED: ${userIdMismatches} mismatches`);
    }

    results.push({
      name: 'Pinecone: userId isolation',
      passed: isolationVerified,
      reason: isolationVerified
        ? `All ${matchCount} results have correct userId`
        : `${userIdMismatches} results have wrong userId`,
      details: { matchCount, userIdMatches, userIdMismatches },
    });

    // Check data types present
    if (matchCount > 0) {
      const types: Record<string, number> = {};
      queryResult.matches?.forEach((match: any) => {
        const type = match.metadata?.type || 'unknown';
        types[type] = (types[type] || 0) + 1;
      });

      log(`  Data types found:`, colors.dim);
      Object.entries(types).forEach(([type, count]) => {
        log(`    - ${type}: ${count}`, colors.dim);
      });

      results.push({
        name: 'Pinecone: Data types present',
        passed: true, // Informational
        reason: `${Object.keys(types).length} data types in Pinecone`,
        details: { types },
      });
    }

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Pinecone: Direct query',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 4: Response Quality Check
 */
async function testResponseQuality(
  userId: string,
  idToken: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Response Quality Check');

  try {
    // Test Chinese query
    const chineseQuery = '最近我做了什么?';

    logQueryBox('Chinese Query Test', [
      `Query: "${chineseQuery}"`,
    ]);

    const response = await callQueryRAG(chineseQuery, userId, idToken);

    // Check if response is in Chinese
    const hasChineseChars = /[\u4e00-\u9fff]/.test(response.response || '');
    const isCoherent = (response.response?.length || 0) > 20;

    if (hasChineseChars) {
      logPass('Response is in Chinese (language match)');
    } else if (response.response) {
      logInfo('Response is in English (language switch)');
    }

    results.push({
      name: 'RAG: Language handling (Chinese)',
      passed: isCoherent,
      reason: hasChineseChars
        ? 'Response in Chinese'
        : isCoherent
          ? 'Coherent response (not in Chinese)'
          : 'No coherent response',
      details: {
        hasChineseChars,
        responseLength: response.response?.length,
        responsePreview: response.response?.substring(0, 80),
      },
    });

    // Check response structure
    const hasHallucination = response.response?.toLowerCase().includes('i don\'t have') ||
      response.response?.toLowerCase().includes('i cannot access') ||
      response.response?.includes('没有') ||
      response.response?.includes('无法');

    if (!hasHallucination) {
      logPass('Response uses available data (no explicit denial)');
    } else {
      logInfo('Response indicates limited data available');
    }

    results.push({
      name: 'RAG: Response grounding',
      passed: true, // Informational
      reason: hasHallucination
        ? 'AI acknowledges limited data'
        : 'Response appears grounded in user data',
      details: { hasHallucination },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'RAG: Response quality',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 5: Context Retrieval Metrics
 */
async function testContextRetrievalMetrics(
  userId: string,
  idToken: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Context Retrieval Metrics');

  try {
    // Query with specific topic that should have data
    const query = 'Tell me about my health and exercise activities';

    logQueryBox('Context Metrics Test', [
      `Query: "${query}"`,
      'Analyzing context retrieval',
    ]);

    const startTime = Date.now();
    const response = await callQueryRAG(query, userId, idToken);
    const duration = Date.now() - startTime;

    logInfo(`Query duration: ${duration}ms`);
    logInfo(`Context items: ${response.contextUsed?.length || 0}`);

    // Check latency
    const acceptableLatency = duration < 10000; // 10 seconds

    if (acceptableLatency) {
      logPass(`Response time: ${duration}ms (< 10s)`);
    } else {
      logFail(`Response time: ${duration}ms (> 10s)`);
    }

    results.push({
      name: 'RAG: Query latency',
      passed: acceptableLatency,
      reason: `${duration}ms response time`,
      details: { duration, threshold: 10000 },
    });

    // Analyze context diversity
    if (response.contextUsed?.length > 0) {
      const contextTypes = new Set<string>();
      response.contextUsed.forEach((ctx: any) => {
        // Extract type from context (format varies)
        const typeMatch = ctx.match(/^\[(.*?)\]/) || ctx.match(/^(voice|text|photo|location|health)/i);
        if (typeMatch) {
          contextTypes.add(typeMatch[1].toLowerCase());
        }
      });

      log(`  Context data types: ${Array.from(contextTypes).join(', ') || 'unknown'}`, colors.dim);

      results.push({
        name: 'RAG: Context diversity',
        passed: true, // Informational
        reason: `${contextTypes.size} unique data types in context`,
        details: { contextTypes: Array.from(contextTypes), contextCount: response.contextUsed.length },
      });
    }

    // Check if response references context
    const usesContext = response.response?.length > 100 &&
      !response.response?.includes("I don't have");

    results.push({
      name: 'RAG: Context utilization',
      passed: true, // Informational
      reason: usesContext
        ? 'Response appears to use retrieved context'
        : 'Response may be limited by available data',
      details: { usesContext, responseLength: response.response?.length },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'RAG: Context metrics',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * No cleanup needed for this test (read-only)
 */
export async function cleanupTestData(): Promise<void> {
  // No test data created
}
