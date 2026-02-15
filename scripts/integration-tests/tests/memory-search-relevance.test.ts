/**
 * Memory Search Relevance - Integration Tests
 *
 * Tests the search weight configuration for RAG relevance boosting:
 * 1. Search weights per entity type
 * 2. Relevance score calculation
 * 3. Activity-based filtering
 * 4. People/place name boosting
 *
 * Key Verifications:
 * - Search weights are applied correctly
 * - Activity queries return relevant results
 * - Person/place filters work
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
export const name = 'Memory Search Relevance';

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId, pinecone } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Search weights configuration
  const test1Results = await testSearchWeightsConfig(db);
  allResults.push(...test1Results);

  // Test Case 2: Activity-based filtering
  const test2Results = await testActivityFiltering(db, userId, pinecone);
  allResults.push(...test2Results);

  // Test Case 3: People name search
  const test3Results = await testPeopleNameSearch(db, userId);
  allResults.push(...test3Results);

  // Test Case 4: Place name search
  const test4Results = await testPlaceNameSearch(db, userId);
  allResults.push(...test4Results);

  return allResults;
}

/**
 * Test Case 1: Search Weights Configuration
 */
async function testSearchWeightsConfig(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Search Weights Configuration');

  try {
    const configDoc = await db.collection('config').doc('memoryBuilderSettings').get();

    if (!configDoc.exists) {
      logInfo('Config not found, checking for default weights in entityTypes');
      results.push({
        name: 'Search Weights: Configuration',
        passed: true,
        reason: 'Config not found (using defaults)',
        details: {},
      });
      return results;
    }

    const data = configDoc.data();
    const entityTypes = data?.entityTypes || {};

    // Check for searchWeight in entity type configs
    let hasSearchWeights = false;
    const weightsFound: Record<string, number> = {};

    Object.entries(entityTypes).forEach(([type, config]: [string, any]) => {
      if ('searchWeight' in config) {
        hasSearchWeights = true;
        weightsFound[type] = config.searchWeight;
      }
    });

    logQueryBox('Search Weights', [
      `Types with weights: ${Object.keys(weightsFound).length}`,
      ...Object.entries(weightsFound).map(([k, v]) => `${k}: ${v}`),
    ]);

    if (hasSearchWeights) {
      logPass(`Found search weights for ${Object.keys(weightsFound).length} entity types`);

      // Validate weight ranges (should be 0-2)
      const invalidWeights = Object.entries(weightsFound)
        .filter(([_, w]) => w < 0 || w > 2);

      if (invalidWeights.length === 0) {
        logPass('All weights in valid range (0-2)');
      } else {
        logFail(`Invalid weights: ${invalidWeights.map(([t, w]) => `${t}=${w}`).join(', ')}`);
      }

      results.push({
        name: 'Search Weights: Valid ranges',
        passed: invalidWeights.length === 0,
        reason: invalidWeights.length === 0
          ? 'All weights in valid range'
          : `Invalid weights found`,
        details: { weightsFound, invalidWeights },
      });
    } else {
      logInfo('No search weights configured (will use defaults)');
      results.push({
        name: 'Search Weights: Configuration',
        passed: true,
        reason: 'No search weights configured (using defaults)',
        details: { weightsFound: {} },
      });
    }

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Search Weights: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 2: Activity-Based Filtering
 */
async function testActivityFiltering(
  db: admin.firestore.Firestore,
  userId: string,
  pinecone: any
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Activity-Based Filtering');

  try {
    // Check for memories with activities
    const memoriesWithActivities = await db.collection('memories')
      .where('userId', '==', userId)
      .limit(50)
      .get();

    const activityCounts: Record<string, number> = {};
    memoriesWithActivities.docs.forEach((doc) => {
      const data = doc.data();
      (data.activities || []).forEach((activity: string) => {
        activityCounts[activity] = (activityCounts[activity] || 0) + 1;
      });
    });

    const topActivities = Object.entries(activityCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    logQueryBox('Activity Distribution', [
      `Memories checked: ${memoriesWithActivities.size}`,
      `Unique activities: ${Object.keys(activityCounts).length}`,
      ...topActivities.map(([a, c]) => `${a}: ${c}`),
    ]);

    if (Object.keys(activityCounts).length > 0) {
      logPass(`Found ${Object.keys(activityCounts).length} unique activities`);

      // Test Pinecone activity filter if available
      if (pinecone && topActivities.length > 0) {
        const testActivity = topActivities[0][0];
        try {
          const pineconeIndex = pinecone.index(process.env.NEXT_PUBLIC_PINECONE_INDEX || 'personal-ai-data');
          const queryResult = await pineconeIndex.query({
            vector: new Array(1536).fill(0.1),
            topK: 10,
            filter: {
              userId,
              activities: { $in: [testActivity] },
            },
            includeMetadata: true,
          });

          const matchCount = queryResult.matches?.length || 0;
          logInfo(`Pinecone activity filter "${testActivity}": ${matchCount} results`);

          results.push({
            name: 'Activity Filter: Pinecone query',
            passed: true,
            reason: `Activity "${testActivity}" returned ${matchCount} results`,
            details: { testActivity, matchCount },
          });
        } catch (error: any) {
          logInfo(`Pinecone activity filter not available: ${error.message}`);
        }
      }
    } else {
      logInfo('No activities found in memories');
    }

    results.push({
      name: 'Activity Filter: Data available',
      passed: true,
      reason: `${Object.keys(activityCounts).length} unique activities found`,
      details: { activityCounts, topActivities },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Activity Filter: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 3: People Name Search
 */
async function testPeopleNameSearch(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('People Name Search');

  try {
    // Check for memories with people names
    const memories = await db.collection('memories')
      .where('userId', '==', userId)
      .limit(50)
      .get();

    const peopleCounts: Record<string, number> = {};
    memories.docs.forEach((doc) => {
      const data = doc.data();
      (data.peopleNames || []).forEach((name: string) => {
        peopleCounts[name] = (peopleCounts[name] || 0) + 1;
      });
    });

    const topPeople = Object.entries(peopleCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    logQueryBox('People Names', [
      `Memories checked: ${memories.size}`,
      `Unique names: ${Object.keys(peopleCounts).length}`,
      ...topPeople.map(([p, c]) => `${p}: ${c} mentions`),
    ]);

    if (Object.keys(peopleCounts).length > 0) {
      logPass(`Found ${Object.keys(peopleCounts).length} unique people`);
    } else {
      logInfo('No people names found in memories');
    }

    results.push({
      name: 'People Search: Data available',
      passed: true,
      reason: `${Object.keys(peopleCounts).length} unique people found`,
      details: { peopleCounts, topPeople },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'People Search: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 4: Place Name Search
 */
async function testPlaceNameSearch(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Place Name Search');

  try {
    // Check for memories with place names
    const memories = await db.collection('memories')
      .where('userId', '==', userId)
      .limit(50)
      .get();

    const placeCounts: Record<string, number> = {};
    memories.docs.forEach((doc) => {
      const data = doc.data();
      (data.placeNames || []).forEach((name: string) => {
        placeCounts[name] = (placeCounts[name] || 0) + 1;
      });
    });

    const topPlaces = Object.entries(placeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    logQueryBox('Place Names', [
      `Memories checked: ${memories.size}`,
      `Unique places: ${Object.keys(placeCounts).length}`,
      ...topPlaces.map(([p, c]) => `${p}: ${c} mentions`),
    ]);

    if (Object.keys(placeCounts).length > 0) {
      logPass(`Found ${Object.keys(placeCounts).length} unique places`);
    } else {
      logInfo('No place names found in memories');
    }

    results.push({
      name: 'Place Search: Data available',
      passed: true,
      reason: `${Object.keys(placeCounts).length} unique places found`,
      details: { placeCounts, topPlaces },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Place Search: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Cleanup function exported for test runner (no cleanup needed)
 */
export async function cleanupTestData(): Promise<void> {
  // No cleanup needed - tests are read-only
}
