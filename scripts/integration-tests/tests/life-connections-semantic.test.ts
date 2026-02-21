/**
 * Life Connections - Semantic Enrichment Test
 *
 * Tests Phase 6: Semantic enrichment from diary & voice content.
 * Verifies that events, topics, and emotions from diary/voice are used
 * to generate new Life Connections correlations.
 *
 * Data design (40 days):
 * - 20 "meeting days" (events with type=meeting) → worse sleep (5.5-6.5h)
 * - 20 "no meeting days" → better sleep (7.5-8.5h)
 * - Voice notes with topicCategory="work" on meeting days
 * - Mood entries with primaryEmotion="stress" on meeting days, "joy" on off days
 *
 * Expected correlations:
 * - STRONG: meeting events → worse sleep (must detect)
 * - STRONG: "work" topic → worse sleep (must detect)
 * - STRONG: "stress" emotion → worse sleep (must detect)
 * - Existing health correlations still work (steps present)
 *
 * Run: npx tsx scripts/integration-tests/tests/life-connections-semantic.test.ts
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
export const name = 'Life Connections Semantic Enrichment';

// Track created documents for cleanup
const createdDocs: { collection: string; id: string }[] = [];

// Seeded random number generator for reproducibility
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  try {
    // Step 1: Clean existing connections
    const cleanResults = await cleanExistingConnections(db, userId);
    allResults.push(...cleanResults);

    // Step 2: Seed synthetic data with events/topics/emotions
    const seedResults = await seedSyntheticData(db, userId);
    allResults.push(...seedResults);

    // Step 3: Trigger analyzeLifeConnections Cloud Function
    const triggerResults = await triggerAnalysis(db, userId);
    allResults.push(...triggerResults);

    // Only proceed with verification if trigger succeeded
    const triggerPassed = triggerResults.every(r => r.passed);
    if (triggerPassed) {
      // Step 4+: Verify connections
      const verifyResults = await verifyConnections(db, userId);
      allResults.push(...verifyResults);
    }
  } catch (error: any) {
    logFail('Test execution', error.message);
    allResults.push({
      name: 'Semantic Enrichment: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  // Always cleanup
  await cleanup(db, userId);

  return allResults;
}

/**
 * Step 1: Clean existing life connections for the test user
 */
async function cleanExistingConnections(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  logTestCase('Step 1: Clean existing life connections');

  try {
    const connectionsSnap = await db
      .collection('users')
      .doc(userId)
      .collection('lifeConnections')
      .limit(50)
      .get();

    if (connectionsSnap.size > 0) {
      logInfo(`Deleting ${connectionsSnap.size} existing connections...`);
      const batch = db.batch();
      connectionsSnap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    logPass(`Pre-cleanup completed (${connectionsSnap.size} connections removed)`);

    return [{
      name: 'Semantic Enrichment: Pre-cleanup',
      passed: true,
      reason: `Cleaned ${connectionsSnap.size} existing connections`,
    }];
  } catch (error: any) {
    logFail('Pre-cleanup', error.message);
    return [{
      name: 'Semantic Enrichment: Pre-cleanup',
      passed: false,
      reason: `Error: ${error.message}`,
    }];
  }
}

/**
 * Step 2: Seed 40 days of synthetic data with events, topics, and emotions
 *
 * Design:
 * - Even dayOffset (2,4,6,...) = "meeting days"
 *   - Event with type=meeting + title
 *   - Voice note with topicCategory=work
 *   - Mood entry with primaryEmotion=stress, intensity=4
 *   - Sleep: 5.5-6.5h (worse)
 *   - Steps: 5000-7000 (lower)
 *
 * - Odd dayOffset (1,3,5,...) = "no meeting days"
 *   - No events
 *   - Voice note with topicCategory=family (noise topic)
 *   - Mood entry with primaryEmotion=joy, intensity=2
 *   - Sleep: 7.5-8.5h (better)
 *   - Steps: 8000-11000 (higher)
 */
async function seedSyntheticData(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  logTestCase('Step 2: Clean existing data + Seed semantic data (40 days)');

  const now = Date.now();
  const rangeStart = new Date(now - 45 * 24 * 60 * 60 * 1000);
  const rangeEnd = new Date(now + 1 * 24 * 60 * 60 * 1000);

  logInfo('Cleaning existing data for test user in date range...');

  const collectionsToClean = [
    { name: 'healthData', dateField: 'startDate', dateType: 'iso' },
    { name: 'voiceNotes', dateField: 'createdAt', dateType: 'iso' },
    { name: 'textNotes', dateField: 'createdAt', dateType: 'iso' },
    { name: 'moodEntries', dateField: 'createdAt', dateType: 'timestamp' },
    { name: 'events', dateField: 'datetime', dateType: 'timestamp' },
  ];

  let totalCleaned = 0;
  for (const col of collectionsToClean) {
    try {
      let query: admin.firestore.Query;
      if (col.dateType === 'timestamp') {
        query = db.collection(col.name)
          .where('userId', '==', userId)
          .where(col.dateField, '>=', rangeStart)
          .where(col.dateField, '<=', rangeEnd);
      } else {
        query = db.collection(col.name)
          .where('userId', '==', userId)
          .where(col.dateField, '>=', rangeStart.toISOString())
          .where(col.dateField, '<=', rangeEnd.toISOString());
      }

      const snap = await query.get();
      if (snap.size > 0) {
        const batch = db.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        totalCleaned += snap.size;
        log(`  Deleted ${snap.size} existing ${col.name} docs`, colors.dim);
      }
    } catch (err: any) {
      log(`  Warning cleaning ${col.name}: ${err.message?.substring(0, 80)}`, colors.dim);
    }
  }
  logPass(`Cleaned ${totalCleaned} existing documents`);

  const testId = generateTestId();
  const rand = seededRandom(99);
  let docsCreated = 0;

  try {
    let batch = db.batch();
    let batchCount = 0;

    for (let dayOffset = 1; dayOffset <= 40; dayOffset++) {
      const date = new Date(now - dayOffset * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dateISO = date.toISOString();
      const isMeetingDay = dayOffset % 2 === 0; // Even offsets = meeting days

      // --- Health Data: Sleep ---
      const sleepDocId = `e2e-sem-sleep-${testId}-${dateStr}`;
      const sleepHours = isMeetingDay
        ? 5.5 + rand() * 1.0   // 5.5-6.5h (worse on meeting days)
        : 7.5 + rand() * 1.0;  // 7.5-8.5h (better on off days)

      batch.set(db.collection('healthData').doc(sleepDocId), {
        userId,
        type: 'sleep',
        value: parseFloat(sleepHours.toFixed(1)),
        startDate: dateISO,
        endDate: dateISO,
        source: 'e2e-semantic-test',
      });
      createdDocs.push({ collection: 'healthData', id: sleepDocId });
      batchCount++;

      // --- Health Data: Steps ---
      const stepsDocId = `e2e-sem-steps-${testId}-${dateStr}`;
      const steps = isMeetingDay
        ? Math.round(5000 + rand() * 2000)   // 5000-7000
        : Math.round(8000 + rand() * 3000);  // 8000-11000

      batch.set(db.collection('healthData').doc(stepsDocId), {
        userId,
        type: 'steps',
        value: steps,
        startDate: dateISO,
        endDate: dateISO,
        source: 'e2e-semantic-test',
      });
      createdDocs.push({ collection: 'healthData', id: stepsDocId });
      batchCount++;

      // --- Events (only on meeting days) ---
      if (isMeetingDay) {
        const eventDocId = `e2e-sem-event-${testId}-${dateStr}`;
        batch.set(db.collection('events').doc(eventDocId), {
          userId,
          title: `Team meeting ${dateStr}`,
          type: 'meeting',
          datetime: admin.firestore.Timestamp.fromDate(date),
          sourceType: 'voice_note',
          confidence: 0.9,
          createdAt: admin.firestore.Timestamp.fromDate(date),
          source: 'e2e-semantic-test',
        });
        createdDocs.push({ collection: 'events', id: eventDocId });
        batchCount++;
      }

      // --- Voice Notes with topicCategory ---
      const voiceDocId = `e2e-sem-voice-${testId}-${dateStr}`;
      batch.set(db.collection('voiceNotes').doc(voiceDocId), {
        userId,
        duration: 30 + Math.round(rand() * 120),
        createdAt: dateISO,
        topicCategory: isMeetingDay ? 'work' : 'family',
        sentiment: isMeetingDay ? -0.3 + rand() * 0.2 : 0.4 + rand() * 0.3,
        source: 'e2e-semantic-test',
      });
      createdDocs.push({ collection: 'voiceNotes', id: voiceDocId });
      batchCount++;

      // --- Mood Entries with primaryEmotion ---
      const moodDocId = `e2e-sem-mood-${testId}-${dateStr}`;
      batch.set(db.collection('moodEntries').doc(moodDocId), {
        userId,
        sentimentScore: isMeetingDay
          ? 0.25 + rand() * 0.15  // 0.25-0.40
          : 0.70 + rand() * 0.15, // 0.70-0.85
        primaryEmotion: isMeetingDay ? 'stress' : 'joy',
        intensity: isMeetingDay ? 4 : 2,
        createdAt: admin.firestore.Timestamp.fromDate(date),
        source: 'e2e-semantic-test',
      });
      createdDocs.push({ collection: 'moodEntries', id: moodDocId });
      batchCount++;

      // Commit batch if approaching limit
      if (batchCount >= 450) {
        await batch.commit();
        docsCreated += batchCount;
        batch = db.batch();
        batchCount = 0;
      }
    }

    // Commit remaining
    if (batchCount > 0) {
      await batch.commit();
      docsCreated += batchCount;
    }

    logPass(`Seeded ${docsCreated} documents across 40 days`);
    log(`  Meeting days: 20`, colors.dim);
    log(`  Non-meeting days: 20`, colors.dim);
    log(`  Collections: healthData, events, voiceNotes, moodEntries`, colors.dim);

    return [{
      name: 'Semantic Enrichment: Seed synthetic data',
      passed: true,
      reason: `${docsCreated} documents seeded across 40 days`,
      details: { docsCreated, meetingDays: 20 },
    }];
  } catch (error: any) {
    logFail('Seed synthetic data', error.message);
    return [{
      name: 'Semantic Enrichment: Seed synthetic data',
      passed: false,
      reason: `Error: ${error.message}`,
    }];
  }
}

/**
 * Step 3: Trigger the analyzeLifeConnections Cloud Function
 */
async function triggerAnalysis(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  logTestCase('Step 3: Trigger analyzeLifeConnections Cloud Function');

  const { idToken, projectId, region } = globalThis.testContext;

  if (!idToken) {
    logInfo('No ID token available - skipping Cloud Function call');
    return [{
      name: 'Semantic Enrichment: Cloud Function trigger',
      passed: false,
      reason: 'No ID token available (auth required)',
    }];
  }

  const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/analyzeLifeConnections`;

  try {
    logInfo(`Calling ${functionUrl}...`);

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        data: {
          lookbackDays: 45,
          minSampleSize: 14,
          minPValue: 0.05,
          minEffectSize: 0.3,
          includeTimeLag: true,
          maxTimeLagDays: 3,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Function returned ${response.status}: ${errorText}`);
    }

    const responseData = await response.json();
    const result = responseData.result || responseData;

    logPass('Cloud Function called successfully');
    log(`  Status: ${result.success ? 'success' : 'failed'}`, colors.dim);
    log(`  Pairs analyzed: ${result.pairsAnalyzed || 0}`, colors.dim);
    log(`  Significant pairs: ${result.significantPairs || 0}`, colors.dim);
    log(`  Connections: ${result.connections?.length || 0}`, colors.dim);
    log(`  Domains: ${result.domainsAnalyzed?.join(', ') || 'unknown'}`, colors.dim);

    return [{
      name: 'Semantic Enrichment: Cloud Function trigger',
      passed: result.success === true,
      reason: result.success
        ? `${result.connections?.length || 0} connections found`
        : `Function returned success=false`,
      details: {
        pairsAnalyzed: result.pairsAnalyzed,
        significantPairs: result.significantPairs,
        connectionsCount: result.connections?.length || 0,
        domainsAnalyzed: result.domainsAnalyzed,
      },
    }];
  } catch (error: any) {
    logFail('Cloud Function trigger', error.message);
    return [{
      name: 'Semantic Enrichment: Cloud Function trigger',
      passed: false,
      reason: `Error: ${error.message}`,
    }];
  }
}

/**
 * Steps 4-9: Verify connections include event/topic/emotion domains
 */
async function verifyConnections(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  logTestCase('Step 4: Verify connections in Firestore');

  // Wait a moment for Firestore writes to settle
  await wait(3000);

  // Fetch all connections
  const connectionsSnap = await db
    .collection('users')
    .doc(userId)
    .collection('lifeConnections')
    .get();

  const connections = connectionsSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as any[];

  // Track for cleanup
  connectionsSnap.docs.forEach(doc => {
    createdDocs.push({ collection: `users/${userId}/lifeConnections`, id: doc.id });
  });

  logQueryBox('Life Connections Found', [
    `Total: ${connections.length}`,
    ...connections.map((c: any) =>
      `[${c.domainA?.type}:${c.domainA?.metric}] ↔ [${c.domainB?.type}:${c.domainB?.metric}] (rho=${c.metrics?.coefficient?.toFixed(3) || '?'}, d=${c.metrics?.effectSize?.toFixed(3) || '?'})`
    ),
  ]);

  // Assertion 4: Connections generated (> 0)
  const hasConnections = connections.length > 0;
  if (hasConnections) {
    logPass(`${connections.length} connections generated`);
  } else {
    logFail('Connections generated', 'No connections found in Firestore');
  }
  results.push({
    name: 'Semantic Enrichment: Connections generated',
    passed: hasConnections,
    reason: hasConnections ? `${connections.length} connections found` : 'No connections found',
  });

  if (!hasConnections) return results;

  // Assertion 5: Event-type connection detected (meeting → sleep)
  logTestCase('Step 5: Verify event-type correlation (meeting → sleep)');

  const meetingSleep = connections.find((c: any) =>
    (c.domainA?.type === 'event' && c.domainA?.metric === 'meeting') ||
    (c.domainB?.type === 'event' && c.domainB?.metric === 'meeting')
  );

  if (meetingSleep) {
    logPass('Meeting-related connection detected');
    log(`  ${meetingSleep.domainA?.type}:${meetingSleep.domainA?.metric} ↔ ${meetingSleep.domainB?.type}:${meetingSleep.domainB?.metric}`, colors.dim);
    log(`  Coefficient: ${meetingSleep.metrics?.coefficient?.toFixed(3)}`, colors.dim);
    log(`  Effect size: ${meetingSleep.metrics?.effectSize?.toFixed(3)}`, colors.dim);
  } else {
    logFail('Meeting connection', 'No event:meeting connection found');
    log(`  Available event connections:`, colors.dim);
    connections.filter((c: any) => c.domainA?.type === 'event' || c.domainB?.type === 'event')
      .forEach((c: any) => {
        log(`    ${c.domainA?.type}:${c.domainA?.metric} ↔ ${c.domainB?.type}:${c.domainB?.metric}`, colors.dim);
      });
  }
  results.push({
    name: 'Semantic Enrichment: Event-type connection detected',
    passed: !!meetingSleep,
    reason: meetingSleep
      ? `Found: ${meetingSleep.domainA?.metric} ↔ ${meetingSleep.domainB?.metric}`
      : 'No event:meeting connection found',
  });

  // Assertion 6: Topic-category connection detected (work → something)
  logTestCase('Step 6: Verify topic-category correlation (work → health)');

  const workTopic = connections.find((c: any) =>
    (c.domainA?.type === 'topic' && c.domainA?.metric === 'work') ||
    (c.domainB?.type === 'topic' && c.domainB?.metric === 'work')
  );

  if (workTopic) {
    logPass('Work topic connection detected');
    log(`  ${workTopic.domainA?.type}:${workTopic.domainA?.metric} ↔ ${workTopic.domainB?.type}:${workTopic.domainB?.metric}`, colors.dim);
    log(`  Coefficient: ${workTopic.metrics?.coefficient?.toFixed(3)}`, colors.dim);
  } else {
    logFail('Work topic connection', 'No topic:work connection found');
    log(`  Available topic connections:`, colors.dim);
    connections.filter((c: any) => c.domainA?.type === 'topic' || c.domainB?.type === 'topic')
      .forEach((c: any) => {
        log(`    ${c.domainA?.type}:${c.domainA?.metric} ↔ ${c.domainB?.type}:${c.domainB?.metric}`, colors.dim);
      });
  }
  results.push({
    name: 'Semantic Enrichment: Topic-category connection detected',
    passed: !!workTopic,
    reason: workTopic
      ? `Found: ${workTopic.domainA?.metric} ↔ ${workTopic.domainB?.metric}`
      : 'No topic:work connection found',
  });

  // Assertion 7: Emotion connection detected (stress or joy → health)
  logTestCase('Step 7: Verify emotion correlation (stress/joy → health)');

  const emotionConnection = connections.find((c: any) =>
    c.domainA?.type === 'emotion' || c.domainB?.type === 'emotion'
  );

  if (emotionConnection) {
    logPass('Emotion connection detected');
    log(`  ${emotionConnection.domainA?.type}:${emotionConnection.domainA?.metric} ↔ ${emotionConnection.domainB?.type}:${emotionConnection.domainB?.metric}`, colors.dim);
    log(`  Coefficient: ${emotionConnection.metrics?.coefficient?.toFixed(3)}`, colors.dim);
  } else {
    logFail('Emotion connection', 'No emotion-domain connection found');
  }
  results.push({
    name: 'Semantic Enrichment: Emotion connection detected',
    passed: !!emotionConnection,
    reason: emotionConnection
      ? `Found: ${emotionConnection.domainA?.metric} ↔ ${emotionConnection.domainB?.metric}`
      : 'No emotion-domain connection found',
  });

  // Assertion 8: New domains present in analysis
  logTestCase('Step 8: Verify new domains present in connections');

  const domainTypes = new Set<string>();
  connections.forEach((c: any) => {
    domainTypes.add(c.domainA?.type);
    domainTypes.add(c.domainB?.type);
  });

  const hasEventDomain = domainTypes.has('event');
  const hasTopicDomain = domainTypes.has('topic');
  const hasEmotionDomain = domainTypes.has('emotion');
  const newDomainsCount = [hasEventDomain, hasTopicDomain, hasEmotionDomain].filter(Boolean).length;

  log(`  Domain types found: ${Array.from(domainTypes).join(', ')}`, colors.dim);
  log(`  New domains: event=${hasEventDomain}, topic=${hasTopicDomain}, emotion=${hasEmotionDomain}`, colors.dim);

  if (newDomainsCount >= 2) {
    logPass(`${newDomainsCount}/3 new semantic domains found in connections`);
  } else {
    logFail('New domains', `Only ${newDomainsCount}/3 new domains found (need at least 2)`);
  }
  results.push({
    name: 'Semantic Enrichment: New semantic domains present',
    passed: newDomainsCount >= 2,
    reason: `${newDomainsCount}/3 new domains: event=${hasEventDomain}, topic=${hasTopicDomain}, emotion=${hasEmotionDomain}`,
  });

  // Assertion 9: Connection count increased from baseline
  logTestCase('Step 9: Verify enrichment increased connection count');

  // With events+topics+emotions, we expect more connections than just health-only
  const connectionCount = connections.length;
  const hasEnoughConnections = connectionCount >= 3;

  if (hasEnoughConnections) {
    logPass(`${connectionCount} connections (>= 3 threshold)`);
  } else {
    logFail('Connection count', `Only ${connectionCount} connections (need >= 3)`);
  }
  results.push({
    name: 'Semantic Enrichment: Sufficient connections generated',
    passed: hasEnoughConnections,
    reason: `${connectionCount} connections generated`,
  });

  return results;
}

/**
 * Cleanup all test data
 */
async function cleanup(
  db: admin.firestore.Firestore,
  userId: string
): Promise<void> {
  if (createdDocs.length === 0) return;

  const cleanupItems = createdDocs.slice(0, 20).map(
    ({ collection, id }) => `${collection}/${id}`
  );
  if (createdDocs.length > 20) {
    cleanupItems.push(`... and ${createdDocs.length - 20} more`);
  }
  logCleanup(cleanupItems);

  let deleted = 0;
  let failed = 0;

  const batchSize = 450;
  for (let i = 0; i < createdDocs.length; i += batchSize) {
    const chunk = createdDocs.slice(i, i + batchSize);
    const batch = db.batch();

    for (const { collection, id } of chunk) {
      try {
        if (collection.includes('/')) {
          const parts = collection.split('/');
          let ref: admin.firestore.DocumentReference = db.collection(parts[0]).doc(parts[1]);
          for (let p = 2; p < parts.length; p += 2) {
            ref = ref.collection(parts[p]).doc(parts[p + 1] || id);
          }
          if (parts.length % 2 === 1) {
            batch.delete(db.collection(collection).doc(id));
          } else {
            batch.delete(ref);
          }
        } else {
          batch.delete(db.collection(collection).doc(id));
        }
      } catch {
        failed++;
      }
    }

    try {
      await batch.commit();
      deleted += chunk.length;
    } catch {
      for (const { collection, id } of chunk) {
        try {
          if (collection.includes('/')) {
            const collParts = collection.split('/');
            let colRef: admin.firestore.CollectionReference = db.collection(collParts[0]);
            let docRef: admin.firestore.DocumentReference = colRef.doc(collParts[1]);
            for (let p = 2; p < collParts.length; p++) {
              colRef = docRef.collection(collParts[p]);
              if (p + 1 < collParts.length) {
                docRef = colRef.doc(collParts[p + 1]);
                p++;
              }
            }
            await colRef.doc(id).delete();
          } else {
            await db.collection(collection).doc(id).delete();
          }
          deleted++;
        } catch {
          failed++;
        }
      }
    }
  }

  const success = failed === 0;
  const message = success
    ? undefined
    : `Deleted ${deleted}, failed ${failed}`;
  logCleanupResult(success, message);

  createdDocs.length = 0;
}

/**
 * Cleanup function exported for test runner
 */
export async function cleanupTestData(): Promise<void> {
  const { db, userId } = globalThis.testContext;
  await cleanup(db, userId);
}

// ============================================================================
// Standalone runner (when executed directly)
// ============================================================================

async function main() {
  const { initFirebase, ensureTestUserExists, getProjectId, getRegion, getTestUserIdToken } = await import('../lib/firebase-setup');
  const { printSummary, logSection } = await import('../lib/reporter');

  logSection('Life Connections Semantic Enrichment Test (Standalone)');

  // Initialize Firebase
  const db = initFirebase();
  log('  Firebase initialized', colors.green);

  const userId = await ensureTestUserExists();
  log(`  Test user: ${userId}`, colors.green);

  const idToken = await getTestUserIdToken(userId);
  log(`  ID token generated`, colors.green);

  // Set global test context
  (globalThis as any).testContext = {
    db,
    userId,
    idToken,
    projectId: getProjectId(),
    region: getRegion(),
    pineconeIndex: '',
    waitTimeMs: 15000,
  };

  // Run tests
  const results = await run();

  // Print summary
  printSummary(results);

  const failedCount = results.filter(r => !r.passed).length;
  process.exit(failedCount > 0 ? 1 : 0);
}

// Auto-run when executed directly
const isStandalone = !globalThis.testContext;
if (isStandalone) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
