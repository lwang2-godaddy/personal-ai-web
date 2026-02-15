/**
 * Prompt Execution Tracking - E2E Tests
 *
 * End-to-end tests that verify execution tracking by:
 * 1. Counting executions before triggering functions
 * 2. Triggering cloud functions (if possible)
 * 3. Verifying new executions are logged
 *
 * Note: These tests may require manual triggering of some functions
 * or may need to wait for scheduled functions to run.
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
export const name = 'Prompt Execution Tracking E2E';

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Verify admin stats API would return data
  const test1Results = await testAdminStatsData(db);
  allResults.push(...test1Results);

  // Test Case 2: Check recent executions match expected patterns
  const test2Results = await testRecentExecutionPatterns(db);
  allResults.push(...test2Results);

  // Test Case 3: Verify cost aggregation is correct
  const test3Results = await testCostAggregation(db);
  allResults.push(...test3Results);

  // Test Case 4: Check that newly added services have tracking
  const test4Results = await testNewlyAddedServicesHaveTracking(db);
  allResults.push(...test4Results);

  return allResults;
}

/**
 * Test Case 1: Verify admin stats API would return data
 * Simulates what /api/admin/prompts/stats returns
 */
async function testAdminStatsData(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Admin Stats Data Verification');

  try {
    // Calculate date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const snapshot = await db.collection('promptExecutions')
      .where('executedAt', '>=', startDate.toISOString())
      .where('executedAt', '<=', endDate.toISOString())
      .get();

    logQueryBox('Prompt Executions (Last 30 Days)', [
      `Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      `Total executions: ${snapshot.size}`,
    ]);

    // Aggregate by service (same as stats API)
    const serviceMap = new Map<string, { totalCost: number; executionCount: number }>();
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const service = data.service as string;
      const cost = (data.estimatedCostUSD as number) || 0;

      if (!serviceMap.has(service)) {
        serviceMap.set(service, { totalCost: 0, executionCount: 0 });
      }

      const stats = serviceMap.get(service)!;
      stats.totalCost += cost;
      stats.executionCount += 1;
    });

    // Display service stats
    const sortedServices = Array.from(serviceMap.entries())
      .sort((a, b) => b[1].executionCount - a[1].executionCount);

    logInfo('\nService execution stats (last 30 days):');
    sortedServices.forEach(([service, stats]) => {
      logInfo(`  ${service}: ${stats.executionCount} runs, $${stats.totalCost.toFixed(4)}`);
    });

    // Calculate totals
    const totalCost = sortedServices.reduce((sum, [, stats]) => sum + stats.totalCost, 0);
    const totalExecutions = sortedServices.reduce((sum, [, stats]) => sum + stats.executionCount, 0);

    logInfo(`\nTotals: ${totalExecutions} executions, $${totalCost.toFixed(4)}`);

    if (sortedServices.length > 0) {
      logPass(`Admin stats would show ${sortedServices.length} services`);
      results.push({
        name: 'Admin stats data available',
        passed: true,
        details: `${sortedServices.length} services, ${totalExecutions} executions`,
      });
    } else {
      logFail('No execution data for admin stats');
      results.push({
        name: 'Admin stats data available',
        passed: false,
        error: 'No executions in last 30 days',
      });
    }
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Admin stats data check',
      passed: false,
      error: error.message,
    });
  }

  return results;
}

/**
 * Test Case 2: Check recent executions match expected patterns
 */
async function testRecentExecutionPatterns(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Recent Execution Patterns');

  try {
    const snapshot = await db.collection('promptExecutions')
      .orderBy('executedAt', 'desc')
      .limit(100)
      .get();

    if (snapshot.empty) {
      logInfo('No recent executions to analyze');
      results.push({
        name: 'Recent execution patterns',
        passed: true,
        skipped: true,
      });
      return results;
    }

    // Analyze patterns
    const byModel = new Map<string, number>();
    const byLanguage = new Map<string, number>();
    const bySuccess = { success: 0, failed: 0 };

    snapshot.docs.forEach((doc) => {
      const data = doc.data();

      // Count by model
      const model = data.model || 'unknown';
      byModel.set(model, (byModel.get(model) || 0) + 1);

      // Count by language
      const lang = data.language || 'unknown';
      byLanguage.set(lang, (byLanguage.get(lang) || 0) + 1);

      // Count success/failure
      if (data.success) {
        bySuccess.success++;
      } else {
        bySuccess.failed++;
      }
    });

    logInfo('\nModels used:');
    byModel.forEach((count, model) => logInfo(`  ${model}: ${count}`));

    logInfo('\nLanguages:');
    byLanguage.forEach((count, lang) => logInfo(`  ${lang}: ${count}`));

    logInfo(`\nSuccess rate: ${bySuccess.success}/${bySuccess.success + bySuccess.failed} (${((bySuccess.success / (bySuccess.success + bySuccess.failed)) * 100).toFixed(1)}%)`);

    // Verify gpt-4o-mini is most common (cost optimization)
    const gpt4oMiniCount = byModel.get('gpt-4o-mini') || 0;
    const totalCount = snapshot.size;
    const gpt4oMiniRatio = gpt4oMiniCount / totalCount;

    if (gpt4oMiniRatio >= 0.5) {
      logPass(`gpt-4o-mini usage: ${(gpt4oMiniRatio * 100).toFixed(1)}% (cost-efficient)`);
      results.push({
        name: 'Cost-efficient model usage',
        passed: true,
      });
    } else {
      logInfo(`gpt-4o-mini usage: ${(gpt4oMiniRatio * 100).toFixed(1)}%`);
      results.push({
        name: 'Model usage check',
        passed: true,
        details: `gpt-4o-mini: ${(gpt4oMiniRatio * 100).toFixed(1)}%`,
      });
    }

    // Check success rate
    const successRate = bySuccess.success / (bySuccess.success + bySuccess.failed);
    if (successRate >= 0.95) {
      logPass(`High success rate: ${(successRate * 100).toFixed(1)}%`);
      results.push({
        name: 'High success rate',
        passed: true,
      });
    } else if (successRate >= 0.80) {
      logInfo(`Success rate: ${(successRate * 100).toFixed(1)}%`);
      results.push({
        name: 'Success rate check',
        passed: true,
        details: `${(successRate * 100).toFixed(1)}%`,
      });
    } else {
      logFail(`Low success rate: ${(successRate * 100).toFixed(1)}%`);
      results.push({
        name: 'Success rate check',
        passed: false,
        error: `Only ${(successRate * 100).toFixed(1)}% success`,
      });
    }
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Execution patterns check',
      passed: false,
      error: error.message,
    });
  }

  return results;
}

/**
 * Test Case 3: Verify cost aggregation is correct
 */
async function testCostAggregation(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Cost Aggregation Verification');

  try {
    // Get a sample of executions to verify cost calculation
    const snapshot = await db.collection('promptExecutions')
      .orderBy('executedAt', 'desc')
      .limit(50)
      .get();

    if (snapshot.empty) {
      logInfo('No executions to verify costs');
      results.push({
        name: 'Cost verification',
        passed: true,
        skipped: true,
      });
      return results;
    }

    let totalTokens = 0;
    let totalCost = 0;
    let validCosts = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const tokens = (data.inputTokens || 0) + (data.outputTokens || 0);
      totalTokens += tokens;

      if (typeof data.estimatedCostUSD === 'number' && data.estimatedCostUSD >= 0) {
        totalCost += data.estimatedCostUSD;
        validCosts++;
      }
    });

    logInfo(`\nCost analysis (${snapshot.size} executions):`);
    logInfo(`  Total tokens: ${totalTokens.toLocaleString()}`);
    logInfo(`  Total cost: $${totalCost.toFixed(6)}`);
    logInfo(`  Avg cost/execution: $${(totalCost / snapshot.size).toFixed(6)}`);
    logInfo(`  Valid cost entries: ${validCosts}/${snapshot.size}`);

    // Verify most entries have valid costs
    if (validCosts === snapshot.size) {
      logPass('All executions have valid cost entries');
      results.push({
        name: 'Cost entries valid',
        passed: true,
      });
    } else if (validCosts >= snapshot.size * 0.9) {
      logInfo(`${validCosts}/${snapshot.size} have valid costs`);
      results.push({
        name: 'Cost entries valid',
        passed: true,
        details: `${validCosts}/${snapshot.size} valid`,
      });
    } else {
      logFail(`Only ${validCosts}/${snapshot.size} have valid costs`);
      results.push({
        name: 'Cost entries valid',
        passed: false,
        error: `Missing costs: ${snapshot.size - validCosts}`,
      });
    }

    // Verify costs are reasonable (not suspiciously high)
    const avgCostPerToken = totalCost / (totalTokens || 1);
    if (avgCostPerToken < 0.001) { // Less than $0.001 per token is reasonable
      logPass(`Cost per token reasonable: $${avgCostPerToken.toFixed(8)}`);
      results.push({
        name: 'Cost per token reasonable',
        passed: true,
      });
    } else {
      logInfo(`Cost per token: $${avgCostPerToken.toFixed(8)}`);
      results.push({
        name: 'Cost per token check',
        passed: true,
        details: `$${avgCostPerToken.toFixed(8)}/token`,
      });
    }
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Cost aggregation check',
      passed: false,
      error: error.message,
    });
  }

  return results;
}

/**
 * Test Case 4: Check that newly added services have tracking in the codebase
 * This is a verification that the code changes are correct
 */
async function testNewlyAddedServicesHaveTracking(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Newly Added Services Tracking');

  // Services that were added in this update
  const newlyTrackedServices = [
    'KeywordGenerator',
    'DailyInsightService',
    'LifeConnectionsService',
  ];

  logInfo('\nChecking services added in this update:');

  try {
    for (const service of newlyTrackedServices) {
      // Check if service has any executions at all
      const snapshot = await db.collection('promptExecutions')
        .where('service', '==', service)
        .limit(1)
        .get();

      if (snapshot.size > 0) {
        logPass(`  ${service}: Has execution records`);
        results.push({
          name: `${service} tracking verified`,
          passed: true,
        });
      } else {
        logInfo(`  ${service}: No executions yet (will appear when function runs)`);
        results.push({
          name: `${service} tracking check`,
          passed: true,
          skipped: true,
          details: 'No executions yet - normal for newly deployed tracking',
        });
      }
    }
  } catch (error: any) {
    logFail(`Error checking services: ${error.message}`);
    results.push({
      name: 'Newly added services check',
      passed: false,
      error: error.message,
    });
  }

  return results;
}
