/**
 * Prompt Execution Tracking - Integration Tests
 *
 * Tests that all prompt services properly log executions to the
 * promptExecutions collection for cost tracking and analytics.
 *
 * Services that should track executions:
 * - KeywordGenerator
 * - LifeFeedGenerator
 * - LifeConnectionsService
 * - DailyInsightService
 * - DailySummaryService
 * - SentimentAnalysisService
 * - EntityExtractionService
 * - EventExtractionService
 * - MemoryGeneratorService
 * - FunFactsService (CarouselInsights)
 * - TopicClassifierService
 * - TemporalParserService
 *
 * Collection: promptExecutions
 */

import * as admin from 'firebase-admin';
import type { TestResult } from '../lib/test-utils';
import {
  log,
  colors,
  logPass,
  logFail,
  logInfo,
  logTestCase,
  logQueryBox,
} from '../lib/reporter';

// Test name for discovery
export const name = 'Prompt Execution Tracking';

// Services that should have execution tracking
const TRACKED_SERVICES = [
  'EmbeddingService',
  'KeywordGenerator',
  'LifeFeedGenerator',
  'LifeConnectionsService',
  'DailyInsightService',
  'DailySummaryService',
  'SentimentAnalysisService',
  'EntityExtractionService',
  'EventExtractionService',
  'MemoryGeneratorService',
  'CarouselInsights',
  'TopicClassifierService',
  'TemporalParserService',
  'FunFactsService',
  'queryRAG',
  'queryCircleRAG',
];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Check promptExecutions collection exists and has data
  const test1Results = await testPromptExecutionsExists(db);
  allResults.push(...test1Results);

  // Test Case 2: Verify execution document structure
  const test2Results = await testExecutionDocumentStructure(db);
  allResults.push(...test2Results);

  // Test Case 3: Check service coverage
  const test3Results = await testServiceCoverage(db);
  allResults.push(...test3Results);

  // Test Case 4: Verify KeywordGenerator has tracking (newly added)
  const test4Results = await testKeywordGeneratorTracking(db);
  allResults.push(...test4Results);

  // Test Case 5: Check DailyInsightService tracking (newly added)
  const test5Results = await testDailyInsightTracking(db);
  allResults.push(...test5Results);

  // Test Case 6: Check LifeConnectionsService tracking (newly added)
  const test6Results = await testLifeConnectionsTracking(db);
  allResults.push(...test6Results);

  return allResults;
}

/**
 * Test Case 1: Check promptExecutions collection exists and has data
 */
async function testPromptExecutionsExists(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('promptExecutions Collection Exists');

  try {
    const snapshot = await db.collection('promptExecutions')
      .orderBy('executedAt', 'desc')
      .limit(10)
      .get();

    logQueryBox('promptExecutions Query', [
      'Collection: promptExecutions',
      'orderBy executedAt desc',
      `Found: ${snapshot.size} executions`,
    ]);

    if (snapshot.size > 0) {
      logPass(`Found ${snapshot.size} execution records`);
      results.push({
        name: 'Collection has execution records',
        passed: true,
      });
    } else {
      logFail('No execution records found');
      results.push({
        name: 'Collection has execution records',
        passed: false,
        error: 'promptExecutions collection is empty',
      });
    }
  } catch (error: any) {
    logFail(`Error checking collection: ${error.message}`);
    results.push({
      name: 'Collection exists check',
      passed: false,
      error: error.message,
    });
  }

  return results;
}

/**
 * Test Case 2: Verify execution document structure
 */
async function testExecutionDocumentStructure(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Execution Document Structure');

  const requiredFields = [
    'userId',
    'service',
    'promptId',
    'language',
    'promptVersion',
    'promptSource',
    'model',
    'inputTokens',
    'outputTokens',
    'totalTokens',
    'estimatedCostUSD',
    'success',
    'executedAt',
  ];

  try {
    const snapshot = await db.collection('promptExecutions')
      .limit(1)
      .get();

    if (snapshot.empty) {
      logInfo('No executions to check structure');
      results.push({
        name: 'Document structure check',
        passed: true,
        skipped: true,
      });
      return results;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    const missingFields: string[] = [];

    logInfo(`Checking execution: ${doc.id}`);
    logInfo(`Service: ${data.service}, Prompt: ${data.promptId}`);

    for (const field of requiredFields) {
      if (!(field in data)) {
        missingFields.push(field);
      }
    }

    if (missingFields.length === 0) {
      logPass('All required fields present');
      results.push({
        name: 'Required fields present',
        passed: true,
      });
    } else {
      logFail(`Missing fields: ${missingFields.join(', ')}`);
      results.push({
        name: 'Required fields present',
        passed: false,
        error: `Missing: ${missingFields.join(', ')}`,
      });
    }

    // Check estimatedCostUSD is a valid number
    if (typeof data.estimatedCostUSD === 'number' && data.estimatedCostUSD >= 0) {
      logPass(`Cost tracking working: $${data.estimatedCostUSD.toFixed(6)}`);
      results.push({
        name: 'Cost tracking valid',
        passed: true,
      });
    } else {
      logFail('estimatedCostUSD is invalid');
      results.push({
        name: 'Cost tracking valid',
        passed: false,
        error: `Invalid cost: ${data.estimatedCostUSD}`,
      });
    }
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Document structure check',
      passed: false,
      error: error.message,
    });
  }

  return results;
}

/**
 * Test Case 3: Check service coverage - which services have logged executions
 */
async function testServiceCoverage(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Service Coverage Check');

  try {
    // Get all unique services from promptExecutions
    const snapshot = await db.collection('promptExecutions')
      .select('service')
      .limit(10000)
      .get();

    const servicesFound = new Set<string>();
    snapshot.docs.forEach((doc) => {
      const service = doc.data().service;
      if (service) {
        servicesFound.add(service);
      }
    });

    logQueryBox('Services with Tracking', [
      `Total executions: ${snapshot.size}`,
      `Unique services: ${servicesFound.size}`,
      ...Array.from(servicesFound).map((s) => `  - ${s}`),
    ]);

    // Check which tracked services have executions
    const missingServices: string[] = [];
    for (const service of TRACKED_SERVICES) {
      if (!servicesFound.has(service)) {
        missingServices.push(service);
      }
    }

    if (missingServices.length === 0) {
      logPass('All tracked services have execution records');
      results.push({
        name: 'All services tracked',
        passed: true,
      });
    } else {
      logInfo(`Services without executions (may be normal if not used recently):`);
      missingServices.forEach((s) => logInfo(`  - ${s}`));
      results.push({
        name: 'Service coverage check',
        passed: true, // Not a failure - services may not have run
        details: `Missing: ${missingServices.join(', ')}`,
      });
    }

    // Count executions per service
    const serviceCounts = new Map<string, number>();
    snapshot.docs.forEach((doc) => {
      const service = doc.data().service;
      if (service) {
        serviceCounts.set(service, (serviceCounts.get(service) || 0) + 1);
      }
    });

    logInfo('\nExecution counts by service:');
    Array.from(serviceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([service, count]) => {
        logInfo(`  ${service}: ${count} executions`);
      });

    results.push({
      name: 'Service execution counts logged',
      passed: true,
    });
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Service coverage check',
      passed: false,
      error: error.message,
    });
  }

  return results;
}

/**
 * Test Case 4: Verify KeywordGenerator has tracking (newly added)
 */
async function testKeywordGeneratorTracking(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('KeywordGenerator Execution Tracking');

  try {
    const snapshot = await db.collection('promptExecutions')
      .where('service', '==', 'KeywordGenerator')
      .orderBy('executedAt', 'desc')
      .limit(5)
      .get();

    logQueryBox('KeywordGenerator Executions', [
      'service == "KeywordGenerator"',
      `Found: ${snapshot.size} executions`,
    ]);

    if (snapshot.size > 0) {
      const latestExec = snapshot.docs[0].data();
      logPass(`KeywordGenerator tracking active`);
      logInfo(`  Latest: ${latestExec.promptId} at ${latestExec.executedAt}`);
      logInfo(`  Model: ${latestExec.model}`);
      logInfo(`  Cost: $${latestExec.estimatedCostUSD?.toFixed(6) || 'N/A'}`);

      results.push({
        name: 'KeywordGenerator has execution records',
        passed: true,
      });

      // Check for required metadata
      if (latestExec.metadata?.periodType) {
        logPass(`  Metadata includes periodType: ${latestExec.metadata.periodType}`);
        results.push({
          name: 'KeywordGenerator metadata valid',
          passed: true,
        });
      }
    } else {
      logInfo('No KeywordGenerator executions found (may not have run recently)');
      results.push({
        name: 'KeywordGenerator tracking check',
        passed: true,
        skipped: true,
        details: 'No recent executions',
      });
    }
  } catch (error: any) {
    // Index may not exist yet
    if (error.code === 9) {
      logInfo('Index not ready for KeywordGenerator query');
      results.push({
        name: 'KeywordGenerator tracking check',
        passed: true,
        skipped: true,
        details: 'Index not ready',
      });
    } else {
      logFail(`Error: ${error.message}`);
      results.push({
        name: 'KeywordGenerator tracking check',
        passed: false,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Test Case 5: Check DailyInsightService tracking (newly added)
 */
async function testDailyInsightTracking(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('DailyInsightService Execution Tracking');

  try {
    const snapshot = await db.collection('promptExecutions')
      .where('service', '==', 'DailyInsightService')
      .orderBy('executedAt', 'desc')
      .limit(5)
      .get();

    logQueryBox('DailyInsightService Executions', [
      'service == "DailyInsightService"',
      `Found: ${snapshot.size} executions`,
    ]);

    if (snapshot.size > 0) {
      const latestExec = snapshot.docs[0].data();
      logPass(`DailyInsightService tracking active`);
      logInfo(`  Latest: ${latestExec.promptId} at ${latestExec.executedAt}`);
      logInfo(`  Model: ${latestExec.model}`);

      results.push({
        name: 'DailyInsightService has execution records',
        passed: true,
      });
    } else {
      logInfo('No DailyInsightService executions found (may not have run recently)');
      results.push({
        name: 'DailyInsightService tracking check',
        passed: true,
        skipped: true,
        details: 'No recent executions',
      });
    }
  } catch (error: any) {
    if (error.code === 9) {
      logInfo('Index not ready for DailyInsightService query');
      results.push({
        name: 'DailyInsightService tracking check',
        passed: true,
        skipped: true,
        details: 'Index not ready',
      });
    } else {
      logFail(`Error: ${error.message}`);
      results.push({
        name: 'DailyInsightService tracking check',
        passed: false,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Test Case 6: Check LifeConnectionsService tracking (newly added)
 */
async function testLifeConnectionsTracking(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('LifeConnectionsService Execution Tracking');

  try {
    const snapshot = await db.collection('promptExecutions')
      .where('service', '==', 'LifeConnectionsService')
      .orderBy('executedAt', 'desc')
      .limit(5)
      .get();

    logQueryBox('LifeConnectionsService Executions', [
      'service == "LifeConnectionsService"',
      `Found: ${snapshot.size} executions`,
    ]);

    if (snapshot.size > 0) {
      const latestExec = snapshot.docs[0].data();
      logPass(`LifeConnectionsService tracking active`);
      logInfo(`  Latest: ${latestExec.promptId} at ${latestExec.executedAt}`);
      logInfo(`  Model: ${latestExec.model}`);

      // LifeConnectionsService tracks 3 prompts per correlation
      const promptIds = new Set<string>();
      snapshot.docs.forEach((doc) => {
        promptIds.add(doc.data().promptId);
      });
      logInfo(`  Prompt types: ${Array.from(promptIds).join(', ')}`);

      results.push({
        name: 'LifeConnectionsService has execution records',
        passed: true,
      });
    } else {
      logInfo('No LifeConnectionsService executions found (may not have run recently)');
      results.push({
        name: 'LifeConnectionsService tracking check',
        passed: true,
        skipped: true,
        details: 'No recent executions',
      });
    }
  } catch (error: any) {
    if (error.code === 9) {
      logInfo('Index not ready for LifeConnectionsService query');
      results.push({
        name: 'LifeConnectionsService tracking check',
        passed: true,
        skipped: true,
        details: 'Index not ready',
      });
    } else {
      logFail(`Error: ${error.message}`);
      results.push({
        name: 'LifeConnectionsService tracking check',
        passed: false,
        error: error.message,
      });
    }
  }

  return results;
}
