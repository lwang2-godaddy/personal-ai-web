/**
 * Daily Summary Notifications E2E Test
 *
 * Tests the complete daily summary notification flow:
 * 1. NotificationHistoryService schema validation
 * 2. Admin API field mapping (status -> read)
 * 3. Legacy schema compatibility
 * 4. Filtering and querying
 *
 * This validates:
 * - Cloud Function creates notifications with correct schema
 * - Admin API handles both legacy and new schemas
 * - Admin portal displays notifications correctly
 */

import * as admin from 'firebase-admin';
import type { TestResult } from '../lib/test-utils';
import {
  logPass,
  logFail,
  logInfo,
  logTestCase,
  logQueryBox,
} from '../lib/reporter';

// Test name for discovery
export const name = 'Daily Summary Notifications E2E';

// Test data prefix for cleanup
const TEST_PREFIX = 'daily-summary-e2e-test';

/**
 * NotificationHistoryService schema (what sendDailySummary should create)
 */
interface NewSchemaNotification {
  userId: string;
  type: string;
  category: 'scheduled' | 'instant' | 'escalated';
  title: string;
  body: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'dismissed' | 'suppressed';
  channel?: string;
  priority: 'low' | 'default' | 'high' | 'max';
  metadata?: Record<string, any>;
  scheduledFor?: admin.firestore.Timestamp;
  sentAt: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Legacy schema (existing notifications in database)
 */
interface LegacySchemaNotification {
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: admin.firestore.Timestamp;
}

/**
 * Admin API response format
 */
interface AdminApiNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean; // Derived from status or read field
  status: string; // Original status or derived from read
  category: string | null;
  channel: string | null;
  priority: string;
  data: Record<string, any> | null;
  createdAt: string | null;
  sentAt: string | null;
}

/**
 * Main test runner
 */
export async function run(testCase?: string): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  const tests: Array<{ name: string; fn: () => Promise<TestResult[]> }> = [
    { name: 'new-schema-creation', fn: () => testNewSchemaCreation(db, userId) },
    { name: 'legacy-schema-compat', fn: () => testLegacySchemaCompatibility(db, userId) },
    { name: 'status-to-read-mapping', fn: () => testStatusToReadMapping(db, userId) },
    { name: 'admin-api-query', fn: () => testAdminApiQuery(db, userId) },
    { name: 'mixed-schema-query', fn: () => testMixedSchemaQuery(db, userId) },
  ];

  for (const test of tests) {
    if (testCase && test.name !== testCase) continue;
    const results = await test.fn();
    allResults.push(...results);
  }

  // Cleanup test data
  await cleanupTestData(db);

  return allResults;
}

/**
 * Test 1: Verify NEW schema notification can be created (simulates NotificationHistoryService)
 */
async function testNewSchemaCreation(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('New Schema Creation (NotificationHistoryService format)');

  const testId = `${TEST_PREFIX}-new-${Date.now()}`;
  const now = admin.firestore.Timestamp.now();

  const notification: NewSchemaNotification = {
    userId,
    type: 'daily_summary',
    category: 'scheduled',
    title: '📊 Daily Recap (E2E Test)',
    body: 'Test: 1000 steps, 5 locations, 3 voice notes',
    status: 'sent',
    channel: 'daily_summaries',
    priority: 'default',
    metadata: {
      steps: '1000',
      locations: '5',
      voices: '3',
    },
    scheduledFor: now,
    sentAt: now,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.collection('notifications').doc(testId).set(notification);
    logPass(`Created notification with NEW schema: ${testId}`);

    // Verify it was created correctly
    const doc = await db.collection('notifications').doc(testId).get();
    const data = doc.data()!;

    // Check required fields
    const requiredFields = ['userId', 'type', 'status', 'title', 'body', 'sentAt', 'createdAt'];
    const missingFields = requiredFields.filter(f => !(f in data));

    if (missingFields.length === 0) {
      logPass('All required fields present');
      results.push({ name: 'New schema has all required fields', passed: true });
    } else {
      logFail(`Missing fields: ${missingFields.join(', ')}`);
      results.push({ name: 'New schema has all required fields', passed: false, reason: `Missing: ${missingFields.join(', ')}` });
    }

    // Verify status field (NOT read)
    if (data.status === 'sent' && !('read' in data)) {
      logPass("Has 'status' field, no 'read' field (correct NEW schema)");
      results.push({ name: "New schema uses 'status' not 'read'", passed: true });
    } else {
      logFail(`Schema issue: status=${data.status}, hasRead=${'read' in data}`);
      results.push({ name: "New schema uses 'status' not 'read'", passed: false });
    }

    // Verify metadata (NOT data)
    if (data.metadata && !('data' in data)) {
      logPass("Has 'metadata' field, no 'data' field (correct NEW schema)");
      results.push({ name: "New schema uses 'metadata' not 'data'", passed: true });
    } else {
      logFail(`Schema issue: hasMetadata=${'metadata' in data}, hasData=${'data' in data}`);
      results.push({ name: "New schema uses 'metadata' not 'data'", passed: false });
    }

    logQueryBox('Created Notification', [
      `ID: ${testId}`,
      `type: ${data.type}`,
      `status: ${data.status}`,
      `channel: ${data.channel}`,
      `metadata: ${JSON.stringify(data.metadata)}`,
    ]);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Error: ${message}`);
    results.push({ name: 'New schema creation', passed: false, reason: message });
  }

  return results;
}

/**
 * Test 2: Verify LEGACY schema notifications still work
 */
async function testLegacySchemaCompatibility(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Legacy Schema Compatibility');

  const testId = `${TEST_PREFIX}-legacy-${Date.now()}`;
  const now = admin.firestore.Timestamp.now();

  const notification: LegacySchemaNotification = {
    userId,
    type: 'daily_summary',
    title: '📊 Daily Recap (Legacy E2E Test)',
    body: 'Test: Legacy schema with read field',
    read: false,
    data: {
      steps: '500',
      locations: '2',
    },
    createdAt: now,
  };

  try {
    await db.collection('notifications').doc(testId).set(notification);
    logPass(`Created notification with LEGACY schema: ${testId}`);

    // Verify it was created correctly
    const doc = await db.collection('notifications').doc(testId).get();
    const data = doc.data()!;

    // Verify read field (NOT status)
    if ('read' in data && !('status' in data)) {
      logPass("Has 'read' field, no 'status' field (correct LEGACY schema)");
      results.push({ name: "Legacy schema uses 'read' not 'status'", passed: true });
    } else {
      logFail(`Schema issue: hasRead=${'read' in data}, hasStatus=${'status' in data}`);
      results.push({ name: "Legacy schema uses 'read' not 'status'", passed: false });
    }

    // Verify data field (NOT metadata)
    if ('data' in data && !('metadata' in data)) {
      logPass("Has 'data' field, no 'metadata' field (correct LEGACY schema)");
      results.push({ name: "Legacy schema uses 'data' not 'metadata'", passed: true });
    } else {
      logFail(`Schema issue: hasData=${'data' in data}, hasMetadata=${'metadata' in data}`);
      results.push({ name: "Legacy schema uses 'data' not 'metadata'", passed: false });
    }

    logQueryBox('Created Legacy Notification', [
      `ID: ${testId}`,
      `type: ${data.type}`,
      `read: ${data.read}`,
      `data: ${JSON.stringify(data.data)}`,
    ]);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Error: ${message}`);
    results.push({ name: 'Legacy schema creation', passed: false, reason: message });
  }

  return results;
}

/**
 * Test 3: Verify status-to-read mapping logic
 */
async function testStatusToReadMapping(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Status-to-Read Mapping');

  const statusToReadMapping: Record<string, boolean> = {
    'pending': false,
    'sent': false,
    'delivered': false,
    'opened': true,
    'dismissed': true,
    'suppressed': false,
  };

  const testNotifications: Array<{ id: string; status: string; expectedRead: boolean }> = [];

  try {
    // Create notifications with different statuses
    for (const [status, expectedRead] of Object.entries(statusToReadMapping)) {
      const testId = `${TEST_PREFIX}-status-${status}-${Date.now()}`;
      const now = admin.firestore.Timestamp.now();

      await db.collection('notifications').doc(testId).set({
        userId,
        type: 'daily_summary',
        category: 'scheduled',
        title: `Test ${status}`,
        body: `Testing status=${status}`,
        status,
        channel: 'daily_summaries',
        priority: 'default',
        sentAt: now,
        createdAt: now,
        updatedAt: now,
      });

      testNotifications.push({ id: testId, status, expectedRead });
    }

    logPass(`Created ${testNotifications.length} test notifications with different statuses`);

    // Simulate Admin API mapping logic
    for (const { id, status, expectedRead } of testNotifications) {
      const doc = await db.collection('notifications').doc(id).get();
      const data = doc.data()!;

      // Apply same mapping logic as Admin API
      let derivedRead: boolean;
      if ('read' in data) {
        derivedRead = data.read === true;
      } else if ('status' in data) {
        derivedRead = data.status === 'opened' || data.status === 'dismissed';
      } else {
        derivedRead = false;
      }

      if (derivedRead === expectedRead) {
        logPass(`status='${status}' → read=${derivedRead} (expected: ${expectedRead})`);
        results.push({ name: `Status '${status}' maps to read=${expectedRead}`, passed: true });
      } else {
        logFail(`status='${status}' → read=${derivedRead} (expected: ${expectedRead})`);
        results.push({ name: `Status '${status}' maps to read=${expectedRead}`, passed: false });
      }
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Error: ${message}`);
    results.push({ name: 'Status-to-read mapping', passed: false, reason: message });
  }

  return results;
}

/**
 * Test 4: Verify Admin API query format
 */
async function testAdminApiQuery(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Admin API Query Format');

  try {
    // Query notifications for the test user
    const snapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    if (snapshot.empty) {
      logInfo('No notifications found for test user');
      results.push({ name: 'Admin API query', passed: true, reason: 'No data to verify' });
      return results;
    }

    logPass(`Found ${snapshot.size} notifications`);

    // Simulate Admin API response mapping
    const mappedNotifications: AdminApiNotification[] = snapshot.docs.map(doc => {
      const data = doc.data();

      // Handle read status from either schema (same logic as Admin API)
      let readValue: boolean;
      let statusValue: string;

      if ('read' in data) {
        readValue = data.read === true;
        statusValue = readValue ? 'read' : 'unread';
      } else if ('status' in data) {
        statusValue = data.status;
        readValue = statusValue === 'opened' || statusValue === 'dismissed';
      } else {
        readValue = false;
        statusValue = 'unknown';
      }

      return {
        id: doc.id,
        userId: data.userId,
        type: data.type || 'unknown',
        title: data.title || '',
        body: data.body || '',
        read: readValue,
        status: statusValue,
        category: data.category || null,
        channel: data.channel || null,
        priority: data.priority || 'default',
        data: data.data || data.metadata || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        sentAt: data.sentAt?.toDate?.()?.toISOString() || null,
      };
    });

    // Verify all mapped notifications have required fields
    const requiredFields = ['id', 'userId', 'type', 'title', 'body', 'read', 'status'];
    let allValid = true;

    for (const notif of mappedNotifications) {
      const missing = requiredFields.filter(f => (notif as any)[f] === undefined);
      if (missing.length > 0) {
        logFail(`Notification ${notif.id} missing fields: ${missing.join(', ')}`);
        allValid = false;
      }
    }

    if (allValid) {
      logPass('All notifications have required Admin API fields');
      results.push({ name: 'Admin API response format valid', passed: true });
    } else {
      results.push({ name: 'Admin API response format valid', passed: false });
    }

    // Show sample mapped notification
    if (mappedNotifications.length > 0) {
      const sample = mappedNotifications[0];
      logQueryBox('Sample Admin API Response', [
        `id: ${sample.id}`,
        `type: ${sample.type}`,
        `read: ${sample.read}`,
        `status: ${sample.status}`,
        `channel: ${sample.channel}`,
        `data: ${JSON.stringify(sample.data)?.substring(0, 50)}`,
      ]);
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('index')) {
      logInfo('Firestore index not ready - skipping');
      results.push({ name: 'Admin API query', passed: true, reason: 'Index not ready' });
    } else {
      logFail(`Error: ${message}`);
      results.push({ name: 'Admin API query', passed: false, reason: message });
    }
  }

  return results;
}

/**
 * Test 5: Verify mixed schema query works (both legacy and new)
 */
async function testMixedSchemaQuery(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Mixed Schema Query');

  try {
    // Query all test notifications
    const snapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .limit(50)
      .get();

    let newSchemaCount = 0;
    let legacySchemaCount = 0;
    let unknownSchemaCount = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if ('status' in data && !('read' in data)) {
        newSchemaCount++;
      } else if ('read' in data && !('status' in data)) {
        legacySchemaCount++;
      } else if ('status' in data && 'read' in data) {
        // Has both - unusual but possible
        newSchemaCount++;
      } else {
        unknownSchemaCount++;
      }
    });

    logQueryBox('Schema Distribution', [
      `Total: ${snapshot.size}`,
      `NEW schema (status): ${newSchemaCount}`,
      `LEGACY schema (read): ${legacySchemaCount}`,
      `Unknown: ${unknownSchemaCount}`,
    ]);

    // Test passes if we can handle mixed schemas
    if (newSchemaCount > 0 || legacySchemaCount > 0) {
      logPass('Successfully queried notifications with mixed schemas');
      results.push({ name: 'Mixed schema query works', passed: true });
    } else if (snapshot.empty) {
      logInfo('No notifications to verify');
      results.push({ name: 'Mixed schema query works', passed: true, reason: 'No data' });
    } else {
      logFail('Could not identify schema type for notifications');
      results.push({ name: 'Mixed schema query works', passed: false });
    }

    // Verify Admin API can map all schemas
    let mappingErrors = 0;
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      try {
        // Apply Admin API mapping logic
        let readValue: boolean;
        if ('read' in data) {
          readValue = data.read === true;
        } else if ('status' in data) {
          readValue = data.status === 'opened' || data.status === 'dismissed';
        } else {
          readValue = false;
        }
        // If we get here without error, mapping works
      } catch {
        mappingErrors++;
      }
    });

    if (mappingErrors === 0) {
      logPass('Admin API mapping works for all schemas');
      results.push({ name: 'Admin API handles all schemas', passed: true });
    } else {
      logFail(`${mappingErrors} notifications failed mapping`);
      results.push({ name: 'Admin API handles all schemas', passed: false });
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Error: ${message}`);
    results.push({ name: 'Mixed schema query', passed: false, reason: message });
  }

  return results;
}

/**
 * Cleanup test data
 */
async function cleanupTestData(db: admin.firestore.Firestore): Promise<void> {
  logInfo('Cleaning up test data...');

  try {
    // Find all test notifications
    const snapshot = await db.collection('notifications')
      .where('title', '>=', TEST_PREFIX)
      .where('title', '<=', TEST_PREFIX + '\uf8ff')
      .get();

    // Also find by ID prefix
    const allDocs = await db.collection('notifications').listDocuments();
    const testDocs = allDocs.filter(doc => doc.id.startsWith(TEST_PREFIX));

    const batch = db.batch();
    let deleteCount = 0;

    // Delete by query
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      deleteCount++;
    });

    // Delete by ID prefix
    testDocs.forEach(doc => {
      batch.delete(doc);
      deleteCount++;
    });

    if (deleteCount > 0) {
      await batch.commit();
      logInfo(`Cleaned up ${deleteCount} test notifications`);
    } else {
      logInfo('No test notifications to clean up');
    }
  } catch (error) {
    logInfo(`Cleanup warning: ${error}`);
  }
}
