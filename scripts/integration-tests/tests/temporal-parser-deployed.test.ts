/**
 * Integration Test: Temporal Parser Deployed
 *
 * Tests that TemporalParserService is deployed by:
 * 1. Calling queryRAG with temporal queries
 * 2. Verifying the function responds without error
 *
 * NOTE: queryRAG does NOT return debug info about temporal parsing.
 * To verify temporal parsing is actually working, check Cloud Function logs:
 *   firebase functions:log --only queryRAG | grep "Temporal filter"
 *
 * Prerequisites:
 *   - Cloud Functions deployed with TemporalParserService
 *   - Test user authenticated (via run-all.ts)
 */

import type { TestResult } from '../lib/test-utils';

export const name = 'Temporal Parser Deployed';

// Test queries - we verify function responds, not the parsing results
// (temporal parsing only visible in logs, not in API response)
const TEST_QUERIES = [
  {
    query: '过去几天我去过什么地方',
    description: 'Past few days query (Chinese)',
  },
  {
    query: '昨天我做了什么',
    description: 'Yesterday query (Chinese)',
  },
  {
    query: 'What did I do last week?',
    description: 'Last week query (English)',
  },
];

/**
 * Call queryRAG and check if it responds successfully
 */
async function testQueryRAG(
  query: string,
  userId: string,
  idToken: string,
  projectId: string,
  region: string
): Promise<{
  success: boolean;
  hasResponse: boolean;
  contextCount: number;
  error?: string;
}> {
  const queryRAGUrl = `https://${region}-${projectId}.cloudfunctions.net/queryRAG`;

  try {
    const response = await fetch(queryRAGUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        data: {
          query,
          userId,
          topK: 10,
          minScore: 0.3, // Lower threshold to get more results
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        hasResponse: false,
        contextCount: 0,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    const result = data.result || {};

    return {
      success: true,
      hasResponse: !!result.response,
      contextCount: result.contextUsed?.length || 0,
    };

  } catch (error: any) {
    return {
      success: false,
      hasResponse: false,
      contextCount: 0,
      error: error.message,
    };
  }
}

/**
 * Run all tests
 */
export async function run(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const { userId, idToken, projectId, region } = globalThis.testContext;

  // Test 1: Check queryRAG function is accessible
  const queryRAGUrl = `https://${region}-${projectId}.cloudfunctions.net/queryRAG`;
  try {
    const optionsResponse = await fetch(queryRAGUrl, { method: 'OPTIONS' });
    results.push({
      name: 'queryRAG function accessible',
      passed: optionsResponse.status !== 404,
      reason: optionsResponse.status === 404 ? 'Function not deployed' : undefined,
    });
  } catch (error: any) {
    results.push({
      name: 'queryRAG function accessible',
      passed: false,
      reason: error.message,
    });
  }

  // Test 2+: Test temporal queries respond without error
  for (const test of TEST_QUERIES) {
    const startTime = Date.now();
    const result = await testQueryRAG(test.query, userId, idToken, projectId, region);
    const duration = Date.now() - startTime;

    results.push({
      name: `queryRAG responds: ${test.description}`,
      passed: result.success && result.hasResponse,
      reason: result.success
        ? undefined
        : result.error || 'No response received',
      details: {
        query: test.query,
        contextCount: result.contextCount,
        hasResponse: result.hasResponse,
      },
      duration,
    });

    // Small delay between requests
    await new Promise(r => setTimeout(r, 300));
  }

  // Summary: Add note about how to verify temporal parsing
  const allResponded = results.filter(r => r.name.startsWith('queryRAG responds')).every(r => r.passed);

  results.push({
    name: 'TemporalParserService verification',
    passed: allResponded,
    reason: allResponded
      ? 'Function responds. To verify temporal parsing, check logs: firebase functions:log --only queryRAG | grep "Temporal filter"'
      : 'Function not responding correctly',
  });

  return results;
}
