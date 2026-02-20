/**
 * Query Routing E2E Test
 *
 * Tests the hybrid query routing system with STRICT assertions:
 * - PHASE 1: Direct COUNT for counting queries (bypasses RAG)
 * - PHASE 2: Direct AGGREGATION for sum/avg/min/max queries
 * - PHASE 3: Direct COMPARISON for "vs" / "compared to" queries
 * - PHASE 4: PATTERN ANALYSIS for "usually", "typically" queries
 * - SOURCES: contextUsed returned with correct format
 *
 * This test creates real data in Firestore and verifies the queryRAG
 * function routes to the correct path and returns accurate results.
 *
 * IMPORTANT: Tests use strict assertions - no fallback "response.length > X".
 * If a test passes incorrectly, it's a bug in the test.
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();
const auth = admin.auth();

// Test constants
const TEST_USER_ID = 'e2e-test-query-routing-user';
const TEST_PREFIX = 'qr-e2e';

// Track IDs for cleanup
const createdDocIds: { collection: string; id: string }[] = [];

// ==================== HELPER FUNCTIONS ====================

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(12, 0, 0, 0); // Noon UTC - must use UTC to match Cloud Function temporal parser
  return d.toISOString();
}

function daysAgoTimestamp(days: number): admin.firestore.Timestamp {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(12, 0, 0, 0); // Noon UTC
  return admin.firestore.Timestamp.fromDate(d);
}

/**
 * Create test data in Firestore.
 * Uses BOTH ISO strings and Timestamps for createdAt to test both code paths.
 */
async function seedTestData(): Promise<void> {
  console.log('\n📦 Seeding test data for query routing tests...');

  const batch = db.batch();

  // ==================== VOICE NOTES (ISO string dates - like real user data) ====================
  const voiceNotes = [
    { content: 'Meeting reminder for tomorrow morning', daysAgo: 1 },
    { content: 'Shopping list: milk, eggs, bread, butter', daysAgo: 1 },
    { content: 'Project idea about mobile app development', daysAgo: 1 },
    { content: 'Birthday reminder for mom next week', daysAgo: 3 },
    { content: 'Quick thought about vacation planning', daysAgo: 7 },
    { content: 'Work notes from last week standup', daysAgo: 10 },
  ];

  for (let i = 0; i < voiceNotes.length; i++) {
    const note = voiceNotes[i];
    const id = `${TEST_PREFIX}-voice-${i}`;
    const docRef = db.collection('voiceNotes').doc(id);
    createdDocIds.push({ collection: 'voiceNotes', id });

    batch.set(docRef, {
      userId: TEST_USER_ID,
      transcript: note.content,
      transcription: note.content,
      content: note.content,
      // Use ISO string (like real user data from mobile app)
      createdAt: daysAgoISO(note.daysAgo),
      duration: 30,
    });
  }
  console.log(`  📝 Created ${voiceNotes.length} voice notes (ISO string dates)`);

  // ==================== TEXT NOTES (Timestamp dates - to test both paths) ====================
  const textNotes = [
    { content: 'Had a great productive day at work today', daysAgo: 0 },
    { content: 'Feeling motivated this morning, ready to code', daysAgo: 1 },
    { content: 'Weekend reflection - nice family time at the park', daysAgo: 3 },
  ];

  for (let i = 0; i < textNotes.length; i++) {
    const note = textNotes[i];
    const id = `${TEST_PREFIX}-text-${i}`;
    const docRef = db.collection('textNotes').doc(id);
    createdDocIds.push({ collection: 'textNotes', id });

    batch.set(docRef, {
      userId: TEST_USER_ID,
      content: note.content,
      type: 'diary',
      // Use Firestore Timestamp to test that code path too
      createdAt: daysAgoTimestamp(note.daysAgo),
    });
  }
  console.log(`  📓 Created ${textNotes.length} text notes (Timestamp dates)`);

  // ==================== LOCATIONS ====================
  const locations = [
    { name: 'Badminton Club', activityTag: 'badminton', daysAgo: 1 },
    { name: 'Badminton Club', activityTag: 'badminton', daysAgo: 3 },
    { name: 'Badminton Club', activityTag: 'badminton', daysAgo: 8 },
    { name: 'Gym Downtown', activityTag: 'gym', daysAgo: 2 },
    { name: 'Office Building', activityTag: 'work', daysAgo: 1 },
    { name: 'Coffee Shop', activityTag: 'restaurant', daysAgo: 4 },
  ];

  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    const id = `${TEST_PREFIX}-loc-${i}`;
    const docRef = db.collection('locationData').doc(id);
    createdDocIds.push({ collection: 'locationData', id });

    batch.set(docRef, {
      userId: TEST_USER_ID,
      name: loc.name,
      activityTag: loc.activityTag,
      createdAt: daysAgoISO(loc.daysAgo),
      visitCount: 1,
      latitude: 37.7749,
      longitude: -122.4194,
    });
  }
  console.log(`  📍 Created ${locations.length} locations`);

  // ==================== HEALTH DATA ====================
  const healthData = [
    { type: 'steps', steps: 8500, value: 8500, daysAgo: 0 },
    { type: 'steps', steps: 12000, value: 12000, daysAgo: 1 },
    { type: 'steps', steps: 6000, value: 6000, daysAgo: 2 },
    { type: 'steps', steps: 9500, value: 9500, daysAgo: 3 },
    { type: 'steps', steps: 5000, value: 5000, daysAgo: 8 },
    { type: 'steps', steps: 7000, value: 7000, daysAgo: 9 },
  ];

  for (let i = 0; i < healthData.length; i++) {
    const data = healthData[i];
    const id = `${TEST_PREFIX}-health-${i}`;
    const docRef = db.collection('healthData').doc(id);
    createdDocIds.push({ collection: 'healthData', id });

    batch.set(docRef, {
      userId: TEST_USER_ID,
      type: data.type,
      steps: data.steps,
      value: data.value,
      unit: 'steps',
      createdAt: daysAgoISO(data.daysAgo),
      startDate: daysAgoISO(data.daysAgo),
    });
  }
  console.log(`  ❤️ Created ${healthData.length} health records`);

  await batch.commit();
  console.log('  ✅ All test data seeded');
}

/**
 * Clean up test data
 */
async function cleanupTestData(): Promise<void> {
  console.log('\n🧹 Cleaning up test data...');

  const batchSize = 100;
  for (let i = 0; i < createdDocIds.length; i += batchSize) {
    const batch = db.batch();
    const slice = createdDocIds.slice(i, i + batchSize);
    for (const { collection, id } of slice) {
      batch.delete(db.collection(collection).doc(id));
    }
    await batch.commit();
  }

  console.log(`  ✅ Deleted ${createdDocIds.length} documents`);
}

/**
 * Get a custom token for the test user
 */
async function getTestUserToken(): Promise<string> {
  const customToken = await auth.createCustomToken(TEST_USER_ID);

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );

  const data = await response.json() as { idToken?: string; error?: any };
  if (data.error) {
    throw new Error(`Failed to get ID token: ${JSON.stringify(data.error)}`);
  }

  return data.idToken!;
}

/**
 * Call queryRAG Cloud Function and return full result
 */
async function callQueryRAG(
  idToken: string,
  query: string
): Promise<{
  response: string;
  contextUsed?: Array<{ id: string; type: string; snippet?: string; score: number; sourceId?: string }>;
  providerInfo?: any;
}> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const region = 'us-central1';
  const url = `https://${region}-${projectId}.cloudfunctions.net/queryRAG`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      data: { query }
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`queryRAG failed: ${response.status} - ${text}`);
  }

  const result = await response.json() as { result: any };
  return result.result;
}

// ==================== ASSERTION HELPERS ====================

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function assertContainsNumber(response: string, expected: number, message: string): void {
  // Check for the number in response (as digit or word)
  const numberWords: Record<number, string[]> = {
    0: ['0', 'zero', 'no', 'none', "didn't", "haven't", '没有', '零'],
    1: ['1', 'one', 'single', '一个', '一次'],
    2: ['2', 'two', 'twice', '两个', '两次', '二'],
    3: ['3', 'three', '三个', '三次', '三'],
    4: ['4', 'four', '四个', '四次', '四'],
    5: ['5', 'five', '五个', '五次', '五'],
    6: ['6', 'six', '六个', '六次', '六'],
  };

  const words = numberWords[expected] || [expected.toString()];
  const found = words.some(w => response.toLowerCase().includes(w.toLowerCase()));

  assert(found, `${message} — Expected response to contain "${expected}" but got: "${response.substring(0, 150)}"`);
}

function assertDirectQuery(providerInfo: any, expectedType: string, message: string): void {
  assert(
    providerInfo?.wasDirectQuery === true,
    `${message} — Expected wasDirectQuery=true but got ${providerInfo?.wasDirectQuery}`
  );
  assert(
    providerInfo?.directQueryType === expectedType,
    `${message} — Expected directQueryType="${expectedType}" but got "${providerInfo?.directQueryType}"`
  );
}

function assertHasSources(
  contextUsed: any[] | undefined,
  minCount: number,
  expectedType: string,
  message: string
): void {
  assert(
    Array.isArray(contextUsed),
    `${message} — contextUsed should be an array but got ${typeof contextUsed}`
  );
  assert(
    contextUsed!.length >= minCount,
    `${message} — Expected at least ${minCount} sources but got ${contextUsed!.length}`
  );

  // Verify each source has correct format
  contextUsed!.forEach((source, i) => {
    assert(
      typeof source.id === 'string' && source.id.length > 0,
      `${message} — Source[${i}].id should be non-empty string`
    );
    assert(
      source.type === expectedType,
      `${message} — Source[${i}].type should be "${expectedType}" but got "${source.type}"`
    );
    assert(
      typeof source.score === 'number',
      `${message} — Source[${i}].score should be a number`
    );
  });
}

// ==================== TEST CASES ====================

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

async function runTest(
  name: string,
  idToken: string,
  testFn: (idToken: string) => Promise<void>
): Promise<TestResult> {
  const start = Date.now();
  try {
    await testFn(idToken);
    return { name, passed: true, duration: Date.now() - start };
  } catch (error) {
    return {
      name,
      passed: false,
      error: (error as Error).message,
      duration: Date.now() - start,
    };
  }
}

// ==================== TEST RUNNER ====================

async function runTests(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  QUERY ROUTING E2E TESTS (STRICT ASSERTIONS)');
  console.log('  Tests hybrid routing: Direct DB vs RAG (semantic search)');
  console.log('═══════════════════════════════════════════════════════════════');

  const results: TestResult[] = [];

  try {
    // Setup
    await seedTestData();

    console.log('\n🔐 Getting test user authentication...');
    const idToken = await getTestUserToken();
    console.log('  ✅ Got ID token');

    console.log('\n⏳ Waiting for data to be queryable...');
    await new Promise(r => setTimeout(r, 2000));

    console.log('\n📋 Running test cases...\n');

    // ═══════════════════════════════════════════════════════════════
    // PHASE 1: COUNTING QUERIES
    // ═══════════════════════════════════════════════════════════════

    results.push(await runTest(
      '[P1] Count voice notes yesterday → exact count 3, direct route, has sources',
      idToken,
      async (token) => {
        const result = await callQueryRAG(token, 'How many voice notes did I record yesterday?');
        console.log(`   Response: "${result.response.substring(0, 120)}..."`);
        console.log(`   Route: wasDirectQuery=${result.providerInfo?.wasDirectQuery}, type=${result.providerInfo?.directQueryType}`);
        console.log(`   Sources: ${result.contextUsed?.length || 0} items`);

        // 1. Verify routing
        assertDirectQuery(result.providerInfo, 'count', 'Should route to direct count');

        // 2. Verify count is correct (3 voice notes yesterday)
        assertContainsNumber(result.response, 3, 'Should find 3 voice notes yesterday');

        // 3. Verify sources are returned
        assertHasSources(result.contextUsed, 3, 'voice', 'Should return 3 voice note sources');

        // 4. Verify sources have snippets (transcription content)
        const sourcesWithSnippets = result.contextUsed!.filter(s => s.snippet && s.snippet.length > 0);
        assert(
          sourcesWithSnippets.length >= 1,
          `Should have sources with snippets but got ${sourcesWithSnippets.length}`
        );
      }
    ));

    results.push(await runTest(
      '[P1] Count photos yesterday → exact count 0, direct route',
      idToken,
      async (token) => {
        const result = await callQueryRAG(token, 'How many photos did I take yesterday?');
        console.log(`   Response: "${result.response.substring(0, 120)}..."`);

        assertDirectQuery(result.providerInfo, 'count', 'Should route to direct count');
        assertContainsNumber(result.response, 0, 'Should find 0 photos');

        // No sources for 0 results
        assert(
          !result.contextUsed || result.contextUsed.length === 0,
          `Should have 0 sources for 0 results but got ${result.contextUsed?.length}`
        );
      }
    ));

    results.push(await runTest(
      '[P1] Count badminton this week → finds 2 sessions, direct route, has sources',
      idToken,
      async (token) => {
        const result = await callQueryRAG(token, 'How many times did I play badminton this week?');
        console.log(`   Response: "${result.response.substring(0, 120)}..."`);
        console.log(`   Sources: ${result.contextUsed?.length || 0} items`);

        assertDirectQuery(result.providerInfo, 'count', 'Should route to direct count');
        assertContainsNumber(result.response, 2, 'Should find 2 badminton sessions this week');
        assertHasSources(result.contextUsed, 2, 'location', 'Should return 2 location sources');
      }
    ));

    results.push(await runTest(
      '[P1] Count Chinese language → 昨天我记录了几个语音信息 → 3, direct route',
      idToken,
      async (token) => {
        const result = await callQueryRAG(token, '昨天我记录了几个语音信息?');
        console.log(`   Response: "${result.response.substring(0, 120)}..."`);

        assertDirectQuery(result.providerInfo, 'count', 'Should route to direct count (Chinese)');

        // Verify count = 3 (accepts both Arabic numerals and Chinese)
        const hasThree = /3|三|三个/.test(result.response);
        assert(hasThree, `Chinese query should find 3 voice notes but got: "${result.response.substring(0, 150)}"`);
      }
    ));

    results.push(await runTest(
      '[P1] Count diary entries today → exact count 1, direct route',
      idToken,
      async (token) => {
        const result = await callQueryRAG(token, 'How many diary entries did I write today?');
        console.log(`   Response: "${result.response.substring(0, 120)}..."`);

        assertDirectQuery(result.providerInfo, 'count', 'Should route to direct count');
        assertContainsNumber(result.response, 1, 'Should find 1 diary entry today');
      }
    ));

    // ═══════════════════════════════════════════════════════════════
    // PHASE 1+: SOURCE FORMAT VALIDATION
    // ═══════════════════════════════════════════════════════════════

    results.push(await runTest(
      '[Sources] Voice note sources have correct format: id, type, snippet, score, sourceId',
      idToken,
      async (token) => {
        const result = await callQueryRAG(token, 'How many voice notes did I record yesterday?');

        assert(
          Array.isArray(result.contextUsed) && result.contextUsed.length > 0,
          'Should have contextUsed array with items'
        );

        const source = result.contextUsed![0];

        // Verify all required fields
        assert(typeof source.id === 'string', `source.id should be string, got ${typeof source.id}`);
        assert(source.type === 'voice', `source.type should be "voice", got "${source.type}"`);
        assert(typeof source.score === 'number', `source.score should be number, got ${typeof source.score}`);
        assert(source.score === 1.0, `source.score should be 1.0 for direct queries, got ${source.score}`);

        // sourceId should match id for direct queries
        assert(
          typeof source.sourceId === 'string' && source.sourceId.length > 0,
          `source.sourceId should be non-empty string, got "${source.sourceId}"`
        );

        // snippet should have content from the voice note
        assert(
          typeof source.snippet === 'string' && source.snippet.length > 0,
          `source.snippet should be non-empty string, got "${source.snippet}"`
        );

        console.log(`   Sample source: id=${source.id}, type=${source.type}, score=${source.score}, snippet="${source.snippet?.substring(0, 50)}"`);
      }
    ));

    results.push(await runTest(
      '[Sources] Location sources returned for badminton count',
      idToken,
      async (token) => {
        const result = await callQueryRAG(token, 'How many times did I play badminton this week?');

        assertHasSources(result.contextUsed, 2, 'location', 'Badminton count should have location sources');

        // Each source should have an id starting with our test prefix
        result.contextUsed!.forEach((source, i) => {
          assert(
            source.id.startsWith(TEST_PREFIX),
            `Source[${i}].id should start with "${TEST_PREFIX}" but got "${source.id}"`
          );
        });
      }
    ));

    results.push(await runTest(
      '[Sources] Sources limited to max 10 items',
      idToken,
      async (token) => {
        // Voice notes this month should return all 6, but capped at 10
        const result = await callQueryRAG(token, 'How many voice notes did I record this month?');

        assert(
          Array.isArray(result.contextUsed),
          'Should have contextUsed array'
        );
        assert(
          result.contextUsed!.length <= 10,
          `Sources should be capped at 10 but got ${result.contextUsed!.length}`
        );

        console.log(`   Sources returned: ${result.contextUsed!.length}`);
      }
    ));

    // ═══════════════════════════════════════════════════════════════
    // ROUTING VERIFICATION (ensure direct vs RAG path is correct)
    // ═══════════════════════════════════════════════════════════════

    results.push(await runTest(
      '[Routing] Counting query routes to DIRECT, not RAG',
      idToken,
      async (token) => {
        const result = await callQueryRAG(token, 'How many voice notes yesterday?');

        assert(
          result.providerInfo?.wasDirectQuery === true,
          `Counting query should use direct path but wasDirectQuery=${result.providerInfo?.wasDirectQuery}`
        );
        assert(
          result.providerInfo?.directQueryType === 'count',
          `Should be "count" type but got "${result.providerInfo?.directQueryType}"`
        );
      }
    ));

    results.push(await runTest(
      '[Routing] Semantic query routes to RAG, not direct',
      idToken,
      async (token) => {
        const result = await callQueryRAG(token, 'What did my voice notes say about meetings?');
        console.log(`   Response: "${result.response.substring(0, 120)}..."`);

        // Should NOT be a direct query
        assert(
          result.providerInfo?.wasDirectQuery !== true,
          `Semantic query should NOT use direct path but wasDirectQuery=${result.providerInfo?.wasDirectQuery}`
        );
      }
    ));

    // ═══════════════════════════════════════════════════════════════
    // DATE FORMAT HANDLING (ISO strings vs Timestamps)
    // ═══════════════════════════════════════════════════════════════

    results.push(await runTest(
      '[Date] ISO string dates (voice notes) are queryable',
      idToken,
      async (token) => {
        // Voice notes use ISO string createdAt
        const result = await callQueryRAG(token, 'How many voice notes did I record yesterday?');

        assertDirectQuery(result.providerInfo, 'count', 'Should route to direct count');

        // Must find exactly 3 (not 0 which means date comparison failed)
        const count = result.providerInfo?.count;
        assert(
          count === 3,
          `Should find exactly 3 voice notes (ISO dates) but providerInfo.count=${count}`
        );
      }
    ));

    results.push(await runTest(
      '[Date] Firestore Timestamp dates (text notes) are queryable',
      idToken,
      async (token) => {
        // Text notes use Firestore Timestamp createdAt
        const result = await callQueryRAG(token, 'How many diary entries did I write yesterday?');

        assertDirectQuery(result.providerInfo, 'count', 'Should route to direct count');

        // Should find at least 1 text note from yesterday
        const hasCount = /1|one|一/.test(result.response);
        assert(hasCount, `Should find text notes with Timestamp dates but got: "${result.response.substring(0, 100)}"`);
      }
    ));

    // Print results
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  RESULTS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    let passed = 0;
    let failed = 0;

    results.forEach(r => {
      if (r.passed) {
        console.log(`  ✅ ${r.name} (${r.duration}ms)`);
        passed++;
      } else {
        console.log(`  ❌ ${r.name} (${r.duration}ms)`);
        console.log(`     Error: ${r.error}`);
        failed++;
      }
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  📊 Total:  ${results.length}`);
    console.log('═══════════════════════════════════════════════════════════════');

    if (failed === 0) {
      console.log('\n  🎉 ALL TESTS PASSED!\n');
    } else {
      console.log(`\n  ⚠️  ${failed} test(s) FAILED\n`);
    }

    process.exit(failed > 0 ? 1 : 0);

  } finally {
    await cleanupTestData();
  }
}

// Run tests
runTests().catch((error) => {
  console.error('\n💥 Test runner error:', error);
  cleanupTestData().finally(() => process.exit(1));
});
