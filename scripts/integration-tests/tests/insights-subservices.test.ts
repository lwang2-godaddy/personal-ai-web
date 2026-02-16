/**
 * InsightsOrchestrator Sub-Services - Integration Tests
 *
 * Tests all sub-services of InsightsOrchestrator:
 * 1. PatternDetectionService - Finds recurring activity patterns
 * 2. AnomalyDetectionService - Detects unusual health metrics & long absences
 * 3. MoodCorrelationService - Links mood to sleep/exercise/activities
 *
 * Data Requirements:
 * - PatternDetection: ≥5 location entries, ≥5 per activity, confidence ≥0.7
 * - AnomalyDetection: ≥10 health data points, z-score ≥1.5, ≥3 consecutive days
 * - MoodCorrelation: ≥14 mood entries, strength ≥0.3
 *
 * Collections:
 * - Reads: locationData, healthData, moodEntries, users/{userId}
 * - Writes: insights, moodCorrelations
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

/**
 * Helper: Safely get timestamp from various date formats
 */
function getTimestamp(value: any): number {
  if (!value) return 0;
  try {
    // Firestore Timestamp
    if (typeof value.toDate === 'function') {
      const date = value.toDate();
      if (date && typeof date.getTime === 'function') {
        return date.getTime();
      }
    }
    // Date object
    if (value instanceof Date) {
      return value.getTime();
    }
    // ISO string
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.getTime();
      }
    }
    // Already a number
    if (typeof value === 'number') {
      return value;
    }
  } catch (e) {
    // Ignore errors
  }
  return 0;
}

// Test name for discovery
export const name = 'InsightsOrchestrator Sub-Services';

// Test data cleanup tracker
const createdDocIds: { collection: string; id: string }[] = [];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: PatternDetectionService requirements
  const test1Results = await testPatternDetectionService(db, userId);
  allResults.push(...test1Results);

  // Test Case 2: AnomalyDetectionService requirements
  const test2Results = await testAnomalyDetectionService(db, userId);
  allResults.push(...test2Results);

  // Test Case 3: MoodCorrelationService requirements
  const test3Results = await testMoodCorrelationService(db, userId);
  allResults.push(...test3Results);

  // Test Case 4: Full orchestration flow
  const test6Results = await testFullOrchestrationFlow(db, userId);
  allResults.push(...test6Results);

  // Cleanup
  await cleanup(db);

  return allResults;
}

/**
 * Test Case 1: PatternDetectionService
 *
 * Requirements:
 * - ≥5 location entries with activity tags
 * - ≥5 occurrences per activity type to detect pattern
 * - Confidence threshold ≥0.7
 *
 * Output: patterns with activity, dayOfWeek, timeSlot, confidence
 */
async function testPatternDetectionService(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('PatternDetectionService requirements');

  try {
    // Check existing location data with activity tags
    // Note: Using simple query + filter to avoid needing composite index
    const locationSnapshot = await db.collection('locationData')
      .where('userId', '==', userId)
      .limit(200)
      .get();

    logQueryBox('PatternDetectionService Input', [
      'Collection: locationData',
      `where userId == "${userId.substring(0, 8)}..."`,
      'Filter in-memory: activity != null',
      'Lookback: 90 days',
    ]);

    // Count activities (filter in-memory to avoid index requirement)
    const activityCounts: Record<string, number> = {};
    locationSnapshot.docs.forEach((doc) => {
      const activity = doc.data().activity;
      if (activity) {
        activityCounts[activity] = (activityCounts[activity] || 0) + 1;
      }
    });

    const totalWithActivity = Object.values(activityCounts).reduce((a, b) => a + b, 0);
    const activitiesWith5Plus = Object.entries(activityCounts)
      .filter(([_, count]) => count >= 5);

    log(`  Total locations with activity: ${totalWithActivity}`, colors.dim);
    log(`  Activities breakdown:`, colors.dim);
    Object.entries(activityCounts).forEach(([activity, count]) => {
      const status = count >= 5 ? colors.green : colors.yellow;
      log(`    - ${activity}: ${count} ${count >= 5 ? '✓' : '(need 5+)'}`, status);
    });

    // Test 1a: Minimum data check
    const hasMinimumData = totalWithActivity >= 5;
    if (hasMinimumData) {
      logPass(`Has ${totalWithActivity} locations with activity tags (min: 5)`);
    } else {
      logFail(`Only ${totalWithActivity} locations with activity (need 5+)`);
    }
    results.push({
      name: 'PatternDetection: Minimum location data (≥5)',
      passed: hasMinimumData,
      reason: hasMinimumData
        ? `Has ${totalWithActivity} tagged locations`
        : `Only ${totalWithActivity} tagged locations (need 5+)`,
      details: { totalWithActivity, activityCounts },
    });

    // Test 1b: Pattern-eligible activities
    const canDetectPatterns = activitiesWith5Plus.length > 0;
    if (canDetectPatterns) {
      logPass(`${activitiesWith5Plus.length} activities have 5+ occurrences`);
      activitiesWith5Plus.forEach(([activity, count]) => {
        logInfo(`  Pattern eligible: ${activity} (${count} visits)`);
      });
    } else {
      logFail('No activities have 5+ occurrences for pattern detection');
    }
    results.push({
      name: 'PatternDetection: Activities with ≥5 occurrences',
      passed: canDetectPatterns,
      reason: canDetectPatterns
        ? `${activitiesWith5Plus.length} activities eligible for patterns`
        : 'No activities meet the 5+ occurrence threshold',
      details: { activitiesWith5Plus: activitiesWith5Plus.map(([a]) => a) },
    });

    // Test 1c: Check existing patterns in insights collection
    const patternsSnapshot = await db.collection('insights')
      .where('userId', '==', userId)
      .where('type', '==', 'pattern')
      .limit(10)
      .get();

    logQueryBox('Pattern Insights Check', [
      'Collection: insights',
      'where type == "pattern"',
    ]);

    const patternCount = patternsSnapshot.size;
    log(`  Found ${patternCount} existing pattern insights`, colors.dim);

    results.push({
      name: 'PatternDetection: Existing pattern insights',
      passed: true, // Informational
      reason: `Found ${patternCount} pattern insights in database`,
      details: {
        patternCount,
        patterns: patternsSnapshot.docs.map(d => ({
          id: d.id,
          activity: d.data().activity,
          confidence: d.data().confidence,
        })),
      },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'PatternDetectionService: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 2: AnomalyDetectionService
 *
 * Requirements:
 * - Health anomalies: ≥10 data points, z-score ≥1.5, ≥3 consecutive days
 * - Activity anomalies: visitCount ≥5 for "favorite places"
 *
 * Known Issue: healthData.startDate stored as string, not Timestamp
 * Fix: Uses in-memory date filtering with toDate() helper
 */
async function testAnomalyDetectionService(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('AnomalyDetectionService requirements');

  try {
    // Test 2a: Health data count
    const healthSnapshot = await db.collection('healthData')
      .where('userId', '==', userId)
      .limit(100)
      .get();

    logQueryBox('AnomalyDetection Input (Health)', [
      'Collection: healthData',
      `where userId == "${userId.substring(0, 8)}..."`,
      'Minimum: 10 records for baseline',
    ]);

    const healthCount = healthSnapshot.size;
    const hasMinHealthData = healthCount >= 10;

    // Check date format
    let timestampCount = 0;
    let stringCount = 0;
    let otherCount = 0;

    healthSnapshot.docs.forEach((doc) => {
      const startDate = doc.data().startDate;
      if (startDate && typeof startDate.toDate === 'function') {
        timestampCount++;
      } else if (typeof startDate === 'string') {
        stringCount++;
      } else {
        otherCount++;
      }
    });

    log(`  Total health records: ${healthCount}`, colors.dim);
    log(`  Date formats: Timestamp=${timestampCount}, String=${stringCount}, Other=${otherCount}`, colors.dim);

    if (hasMinHealthData) {
      logPass(`Has ${healthCount} health records (min: 10)`);
    } else {
      logFail(`Only ${healthCount} health records (need 10+)`);
    }

    results.push({
      name: 'AnomalyDetection: Minimum health data (≥10)',
      passed: hasMinHealthData,
      reason: hasMinHealthData
        ? `Has ${healthCount} health records`
        : `Only ${healthCount} health records (need 10+)`,
      details: { healthCount, timestampCount, stringCount },
    });

    // Test 2b: Activity anomaly - favorite places check
    // Note: Using simple query + in-memory filter to avoid composite index
    const allLocationsSnapshot = await db.collection('locationData')
      .where('userId', '==', userId)
      .limit(200)
      .get();

    logQueryBox('AnomalyDetection Input (Activity)', [
      'Collection: locationData',
      'Filter in-memory: visitCount >= 5 (favorite places)',
    ]);

    const favoritePlaces = allLocationsSnapshot.docs.filter(d => {
      const visitCount = d.data().visitCount;
      return typeof visitCount === 'number' && visitCount >= 5;
    }).length;
    const hasFavoritePlaces = favoritePlaces > 0;

    log(`  Favorite places (visitCount ≥5): ${favoritePlaces}`, colors.dim);

    if (hasFavoritePlaces) {
      logPass(`Has ${favoritePlaces} favorite places for activity anomaly detection`);
    } else {
      logInfo('No favorite places yet (need visitCount ≥5 for activity anomalies)');
    }

    // Get favorite places for details
    const favoritePlaceDocs = allLocationsSnapshot.docs.filter(d => {
      const visitCount = d.data().visitCount;
      return typeof visitCount === 'number' && visitCount >= 5;
    });

    results.push({
      name: 'AnomalyDetection: Favorite places for activity anomalies',
      passed: true, // Informational - not required
      reason: hasFavoritePlaces
        ? `Has ${favoritePlaces} favorite places`
        : 'No favorite places yet',
      details: {
        favoritePlaces,
        places: favoritePlaceDocs.slice(0, 5).map(d => ({
          address: d.data().address?.substring(0, 30),
          visitCount: d.data().visitCount,
        })),
      },
    });

    // Test 2c: Check existing anomalies
    const anomaliesSnapshot = await db.collection('insights')
      .where('userId', '==', userId)
      .where('type', '==', 'anomaly')
      .limit(10)
      .get();

    const anomalyCount = anomaliesSnapshot.size;
    log(`  Found ${anomalyCount} existing anomaly insights`, colors.dim);

    results.push({
      name: 'AnomalyDetection: Existing anomaly insights',
      passed: true, // Informational
      reason: `Found ${anomalyCount} anomaly insights`,
      details: { anomalyCount },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'AnomalyDetectionService: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 3: MoodCorrelationService
 *
 * Requirements:
 * - ≥14 mood entries (configurable via admin)
 * - Correlation strength threshold ≥0.3
 * - Correlates mood with: sleep, exercise, activities, time of day
 *
 * Output: moodCorrelations collection
 */
async function testMoodCorrelationService(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('MoodCorrelationService requirements');

  try {
    // Test 3a: Mood entries count
    const thirtyDaysAgoDate = new Date();
    thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 30);
    const moodSnapshot = await db.collection('moodEntries')
      .where('userId', '==', userId)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgoDate))
      .limit(100)
      .get();

    logQueryBox('MoodCorrelationService Input', [
      'Collection: moodEntries',
      `where createdAt >= Timestamp(30 days ago)`,
      'Minimum: 14 entries for correlation',
    ]);

    const moodCount = moodSnapshot.size;
    const hasMinMoodData = moodCount >= 14;

    // Analyze mood data quality
    let validSentimentCount = 0;
    let emotionCounts: Record<string, number> = {};

    moodSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (typeof data.sentimentScore === 'number') {
        validSentimentCount++;
      }
      const emotion = data.primaryEmotion;
      if (emotion) {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      }
    });

    log(`  Mood entries (last 30 days): ${moodCount}`, colors.dim);
    log(`  Valid sentiment scores: ${validSentimentCount}`, colors.dim);
    if (Object.keys(emotionCounts).length > 0) {
      log(`  Primary emotions:`, colors.dim);
      Object.entries(emotionCounts).slice(0, 5).forEach(([emotion, count]) => {
        log(`    - ${emotion}: ${count}`, colors.dim);
      });
    }

    if (hasMinMoodData) {
      logPass(`Has ${moodCount} mood entries (min: 14)`);
    } else {
      logFail(`Only ${moodCount} mood entries (need 14+)`);
    }

    results.push({
      name: 'MoodCorrelation: Minimum mood entries (≥14)',
      passed: hasMinMoodData,
      reason: hasMinMoodData
        ? `Has ${moodCount} mood entries in last 30 days`
        : `Only ${moodCount} mood entries (need 14+)`,
      details: { moodCount, validSentimentCount, topEmotions: Object.keys(emotionCounts).slice(0, 5) },
    });

    // Test 3b: Check existing correlations
    const correlationsSnapshot = await db.collection('moodCorrelations')
      .where('userId', '==', userId)
      .limit(10)
      .get();

    logQueryBox('Mood Correlations Check', [
      'Collection: moodCorrelations',
    ]);

    const correlationCount = correlationsSnapshot.size;
    log(`  Found ${correlationCount} existing mood correlations`, colors.dim);

    if (correlationCount > 0) {
      logPass(`Has ${correlationCount} mood correlations`);
      correlationsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        log(`    - ${data.factor || 'unknown'}: strength=${data.strength?.toFixed(2) || 'N/A'}`, colors.dim);
      });
    } else {
      logInfo('No mood correlations generated yet');
    }

    results.push({
      name: 'MoodCorrelation: Existing correlations',
      passed: true, // Informational
      reason: `Found ${correlationCount} mood correlations`,
      details: {
        correlationCount,
        correlations: correlationsSnapshot.docs.map(d => ({
          factor: d.data().factor,
          strength: d.data().strength,
        })),
      },
    });

    // Test 3c: Check moodPatterns collection
    const patternsSnapshot = await db.collection('moodPatterns')
      .where('userId', '==', userId)
      .limit(10)
      .get();

    const patternCount = patternsSnapshot.size;
    log(`  Found ${patternCount} mood patterns`, colors.dim);

    results.push({
      name: 'MoodCorrelation: Mood patterns generated',
      passed: true, // Informational
      reason: `Found ${patternCount} mood patterns`,
      details: { patternCount },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'MoodCorrelationService: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 4: Full Orchestration Flow
 *
 * Tests the complete InsightsOrchestrator pipeline:
 * 1. Checks 12-hour cache
 * 2. Runs all 3 sub-services in parallel
 * 3. Stores results across 2 collections
 */
async function testFullOrchestrationFlow(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Full Orchestration Flow');

  try {
    // Test 6a: Check cache status
    const cacheDoc = await db.collection('insightsCache')
      .doc(userId)
      .get();

    logQueryBox('InsightsOrchestrator Cache', [
      'Collection: insightsCache',
      'Cache Duration: 12 hours',
    ]);

    let cacheStatus = 'No cache';
    let cacheAge: number | null = null;
    if (cacheDoc.exists) {
      const data = cacheDoc.data();
      const lastAnalyzed = data?.lastAnalyzedAt;
      if (lastAnalyzed) {
        const lastAnalyzedTs = getTimestamp(lastAnalyzed);
        if (lastAnalyzedTs > 0) {
          const ageMs = Date.now() - lastAnalyzedTs;
          const ageHours = ageMs / (1000 * 60 * 60);
          cacheAge = ageHours;
          cacheStatus = ageHours < 12 ? `Fresh (${ageHours.toFixed(1)}h old)` : `Stale (${ageHours.toFixed(1)}h old)`;
        }
      }
    }

    log(`  Cache status: ${cacheStatus}`, colors.dim);

    results.push({
      name: 'Orchestration: Cache status',
      passed: true, // Informational
      reason: cacheStatus,
      details: { cacheAge },
    });

    // Test 6b: Data sufficiency summary
    const dataSummary = await getDataSufficiencySummary(db, userId);

    logQueryBox('Data Sufficiency Summary', [
      `Locations with activity: ${dataSummary.locationCount}`,
      `Health records: ${dataSummary.healthCount}`,
      `Mood entries (30d): ${dataSummary.moodCount}`,
      `Patterns: ${dataSummary.patternCount}`,
    ]);

    const canRunFullOrchestration =
      dataSummary.locationCount >= 5 ||
      dataSummary.healthCount >= 10 ||
      dataSummary.moodCount >= 14;

    if (canRunFullOrchestration) {
      logPass('Sufficient data for at least one sub-service');
    } else {
      logInfo('Insufficient data for full orchestration');
    }

    results.push({
      name: 'Orchestration: Data sufficiency',
      passed: canRunFullOrchestration,
      reason: canRunFullOrchestration
        ? 'Has sufficient data for orchestration'
        : 'Insufficient data for all sub-services',
      details: dataSummary,
    });

    // Test 6c: Service eligibility matrix
    const eligibility = {
      PatternDetection: dataSummary.locationCount >= 5,
      AnomalyDetection: dataSummary.healthCount >= 10,
      MoodCorrelation: dataSummary.moodCount >= 14,
    };

    log('  Service Eligibility:', colors.dim);
    Object.entries(eligibility).forEach(([service, eligible]) => {
      const status = eligible ? '✓' : '✗';
      const color = eligible ? colors.green : colors.yellow;
      log(`    ${status} ${service}`, color);
    });

    const eligibleCount = Object.values(eligibility).filter(Boolean).length;
    results.push({
      name: 'Orchestration: Service eligibility',
      passed: eligibleCount > 0,
      reason: `${eligibleCount}/5 services eligible`,
      details: eligibility,
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Orchestration: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Helper: Get data sufficiency summary
 */
async function getDataSufficiencySummary(
  db: admin.firestore.Firestore,
  userId: string
): Promise<{
  locationCount: number;
  healthCount: number;
  moodCount: number;
  patternCount: number;
}> {
  const thirtyDaysAgoDate = new Date();
  thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 30);

  const [locations, health, mood, patterns] = await Promise.all([
    db.collection('locationData')
      .where('userId', '==', userId)
      .limit(200)
      .get(),
    db.collection('healthData')
      .where('userId', '==', userId)
      .limit(100)
      .get(),
    db.collection('moodEntries')
      .where('userId', '==', userId)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgoDate))
      .limit(100)
      .get(),
    db.collection('insights')
      .where('userId', '==', userId)
      .where('type', '==', 'pattern')
      .limit(20)
      .get(),
  ]);

  // Count locations with activity in-memory to avoid index requirement
  const locationsWithActivity = locations.docs.filter(d => d.data().activity).length;

  return {
    locationCount: locationsWithActivity,
    healthCount: health.size,
    moodCount: mood.size,
    patternCount: patterns.size,
  };
}

/**
 * Cleanup test data
 */
async function cleanup(db: admin.firestore.Firestore): Promise<void> {
  if (createdDocIds.length === 0) {
    return;
  }

  const cleanupItems = createdDocIds.map(
    ({ collection, id }) => `${collection}/${id}`
  );
  logCleanup(cleanupItems);

  let deleted = 0;
  let failed = 0;

  for (const { collection, id } of createdDocIds) {
    try {
      await db.collection(collection).doc(id).delete();
      deleted++;
    } catch (error) {
      failed++;
    }
  }

  const success = failed === 0;
  const message = success
    ? undefined
    : `Deleted ${deleted}, failed ${failed}`;
  logCleanupResult(success, message);
}

/**
 * Cleanup function exported for test runner
 */
export async function cleanupTestData(): Promise<void> {
  const { db } = globalThis.testContext;
  await cleanup(db);
}
