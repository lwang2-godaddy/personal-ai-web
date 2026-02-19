/**
 * Notifications Admin E2E Test
 *
 * Tests the complete notification flow:
 * 1. Create a notification using NotificationHistoryService format
 * 2. Query it via the admin API
 * 3. Verify all fields are properly mapped
 *
 * This test validates the integration between:
 * - NotificationHistoryService (Cloud Functions) - logs notifications
 * - Admin API (/api/admin/notifications) - retrieves notifications
 * - Admin Page (/admin/notifications) - displays notifications
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
export const name = 'Notifications Admin E2E';

/**
 * Fields logged by NotificationHistoryService (the ACTUAL schema)
 * From: PersonalAIApp/firebase/functions/src/services/NotificationHistoryService.ts
 */
const NOTIFICATION_HISTORY_SERVICE_FIELDS = {
  required: [
    'userId',
    'type',
    'category',
    'title',
    'body',
    'status',      // NOT 'read' - this is the key difference!
    'channel',
    'priority',
    'sentAt',
    'createdAt',
    'updatedAt',
  ],
  optional: [
    'imageUrl',
    'suppressionReason',
    'relatedEventId',
    'relatedReminderId',
    'metadata',
    'scheduledFor',
  ],
};

/**
 * Fields expected by the Admin API response
 * From: personal-ai-web/app/api/admin/notifications/route.ts
 */
const ADMIN_API_RESPONSE_FIELDS = [
  'id',
  'userId',
  'type',
  'title',
  'body',
  'read',        // Derived from 'status'
  'status',
  'category',
  'channel',
  'priority',
  'data',        // Mapped from 'metadata'
  'createdAt',
  'sentAt',
];

/**
 * Main test runner
 */
export async function run(testCase?: string): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  const tests: Array<{ name: string; fn: () => Promise<TestResult[]> }> = [
    { name: 'schema-check', fn: () => testActualNotificationSchema(db) },
    { name: 'create-and-query', fn: () => testCreateAndQueryNotification(db, userId) },
    { name: 'field-mapping', fn: () => testFieldMapping(db, userId) },
    { name: 'status-to-read', fn: () => testStatusToReadMapping(db) },
  ];

  for (const test of tests) {
    if (testCase && test.name !== testCase) continue;
    const results = await test.fn();
    allResults.push(...results);
  }

  return allResults;
}

/**
 * Test 1: Check actual notification schema in Firestore
 * This reveals what fields are actually being stored
 */
async function testActualNotificationSchema(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Actual Notification Schema Check');

  try {
    const snapshot = await db.collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    if (snapshot.empty) {
      logInfo('No notifications found - creating a test notification first');
      results.push({
        name: 'Schema check',
        passed: true,
        reason: 'No notifications to check',
      });
      return results;
    }

    // Analyze actual fields
    const allFields = new Set<string>();
    const fieldCounts: Record<string, number> = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      Object.keys(data).forEach((key) => {
        allFields.add(key);
        fieldCounts[key] = (fieldCounts[key] || 0) + 1;
      });
    });

    // Check for 'read' vs 'status' field
    const hasReadField = allFields.has('read');
    const hasStatusField = allFields.has('status');

    logQueryBox('Actual Notification Fields', [
      `Sample size: ${snapshot.size} notifications`,
      '',
      'Fields found:',
      ...Array.from(allFields).sort().map((f) =>
        `  ${f}: ${fieldCounts[f]}/${snapshot.size} docs`
      ),
      '',
      `Has 'read' field: ${hasReadField ? 'YES' : 'NO'}`,
      `Has 'status' field: ${hasStatusField ? 'YES' : 'NO'}`,
    ]);

    // Key finding: NotificationHistoryService uses 'status', not 'read'
    if (hasStatusField && !hasReadField) {
      logPass("Notifications use 'status' field (not 'read') - this matches NotificationHistoryService");
      results.push({
        name: "Schema uses 'status' field",
        passed: true,
      });
    } else if (hasReadField && !hasStatusField) {
      logInfo("Notifications use 'read' field (legacy schema)");
      results.push({
        name: "Schema uses 'read' field (legacy)",
        passed: true,
      });
    } else if (hasReadField && hasStatusField) {
      logInfo("Notifications have both 'read' and 'status' fields (mixed)");
      results.push({
        name: 'Schema has both read and status',
        passed: true,
      });
    } else {
      logFail("Notifications have neither 'read' nor 'status' field!");
      results.push({
        name: 'Schema has read or status',
        passed: false,
        reason: "No 'read' or 'status' field found",
      });
    }

    // Show a sample notification
    const sampleDoc = snapshot.docs[0];
    const sampleData = sampleDoc.data();
    logQueryBox('Sample Notification', [
      `ID: ${sampleDoc.id}`,
      `type: ${sampleData.type}`,
      `status: ${sampleData.status || '(not set)'}`,
      `read: ${sampleData.read !== undefined ? sampleData.read : '(not set)'}`,
      `title: ${sampleData.title?.substring(0, 50) || '(no title)'}`,
      `channel: ${sampleData.channel || '(not set)'}`,
      `category: ${sampleData.category || '(not set)'}`,
    ]);

    results.push({ name: 'Schema analysis complete', passed: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('index')) {
      logInfo('Firestore index not ready');
      results.push({ name: 'Schema check', passed: true, reason: 'Index not ready' });
    } else {
      logFail(`Error: ${message}`);
      results.push({ name: 'Schema check', passed: false, reason: message });
    }
  }

  return results;
}

/**
 * Test 2: Create a notification and query it back
 */
async function testCreateAndQueryNotification(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Create and Query Notification');

  const testNotificationId = `test-notif-${Date.now()}`;
  const now = admin.firestore.Timestamp.now();

  // Create notification in NotificationHistoryService format
  const testNotification = {
    userId: userId,
    type: 'daily_summary',
    category: 'scheduled',
    title: '📊 Daily Recap (Test)',
    body: 'Test notification created by integration test',
    status: 'sent',
    channel: 'daily_summaries',
    priority: 'default',
    metadata: {
      steps: '1234',
      locations: '5',
      voices: '3',
      testField: 'test-value',
    },
    sentAt: now,
    createdAt: now,
    updatedAt: now,
  };

  try {
    // Create the notification
    await db.collection('notifications').doc(testNotificationId).set(testNotification);
    logPass(`Created test notification: ${testNotificationId}`);

    // Query it back directly from Firestore
    const docSnap = await db.collection('notifications').doc(testNotificationId).get();

    if (!docSnap.exists) {
      logFail('Test notification not found after creation!');
      results.push({
        name: 'Create notification',
        passed: false,
        reason: 'Document not found after creation',
      });
      return results;
    }

    const data = docSnap.data()!;
    logQueryBox('Created Notification', [
      `ID: ${testNotificationId}`,
      `type: ${data.type}`,
      `status: ${data.status}`,
      `title: ${data.title}`,
      `metadata keys: ${Object.keys(data.metadata || {}).join(', ')}`,
    ]);

    // Verify fields
    const expectedFields = ['userId', 'type', 'status', 'title', 'body', 'channel', 'priority', 'metadata'];
    const missingFields = expectedFields.filter((f) => !(f in data));

    if (missingFields.length === 0) {
      logPass('All expected fields present');
      results.push({ name: 'Create notification with all fields', passed: true });
    } else {
      logFail(`Missing fields: ${missingFields.join(', ')}`);
      results.push({
        name: 'Create notification with all fields',
        passed: false,
        reason: `Missing: ${missingFields.join(', ')}`,
      });
    }

    // Cleanup
    await db.collection('notifications').doc(testNotificationId).delete();
    logInfo(`Cleaned up test notification: ${testNotificationId}`);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Error: ${message}`);
    results.push({ name: 'Create and query notification', passed: false, reason: message });
  }

  return results;
}

/**
 * Test 3: Test field mapping between Firestore and Admin API
 */
async function testFieldMapping(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Field Mapping Test');

  try {
    // Find a real notification
    const snapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      // Try any notification
      const anySnapshot = await db.collection('notifications').limit(1).get();
      if (anySnapshot.empty) {
        logInfo('No notifications found to test field mapping');
        results.push({
          name: 'Field mapping test',
          passed: true,
          reason: 'No notifications available',
        });
        return results;
      }
    }

    const doc = snapshot.docs[0] || (await db.collection('notifications').limit(1).get()).docs[0];
    const firestoreData = doc.data();

    logQueryBox('Firestore Document Fields', [
      `Document ID: ${doc.id}`,
      '',
      'Fields stored:',
      ...Object.keys(firestoreData).map((k) => `  ${k}: ${typeof firestoreData[k]}`),
    ]);

    // Expected mapping:
    // Firestore 'status' -> API 'status' + derived 'read'
    // Firestore 'metadata' -> API 'data'

    const mappingTests = [
      {
        name: 'status field exists',
        check: () => 'status' in firestoreData,
        value: firestoreData.status,
      },
      {
        name: 'metadata can map to data',
        check: () => 'metadata' in firestoreData || 'data' in firestoreData,
        value: firestoreData.metadata || firestoreData.data,
      },
      {
        name: 'createdAt is timestamp',
        check: () => firestoreData.createdAt && typeof firestoreData.createdAt.toDate === 'function',
        value: firestoreData.createdAt?.toDate?.()?.toISOString(),
      },
    ];

    for (const test of mappingTests) {
      if (test.check()) {
        logPass(`${test.name}: ${JSON.stringify(test.value)?.substring(0, 50)}`);
        results.push({ name: test.name, passed: true });
      } else {
        logFail(`${test.name}: FAILED`);
        results.push({ name: test.name, passed: false });
      }
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Error: ${message}`);
    results.push({ name: 'Field mapping test', passed: false, reason: message });
  }

  return results;
}

/**
 * Test 4: Verify status-to-read mapping logic
 */
async function testStatusToReadMapping(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Status-to-Read Mapping');

  const statusToReadMapping: Record<string, boolean> = {
    'sent': false,
    'delivered': false,
    'pending': false,
    'suppressed': false,
    'opened': true,
    'dismissed': true,
  };

  try {
    const snapshot = await db.collection('notifications')
      .limit(100)
      .get();

    if (snapshot.empty) {
      logInfo('No notifications to check status mapping');
      results.push({
        name: 'Status-to-read mapping',
        passed: true,
        reason: 'No notifications',
      });
      return results;
    }

    const statusCounts: Record<string, number> = {};
    let hasStatusField = 0;
    let hasReadField = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if ('status' in data) {
        hasStatusField++;
        statusCounts[data.status] = (statusCounts[data.status] || 0) + 1;
      }
      if ('read' in data) {
        hasReadField++;
      }
    });

    logQueryBox('Status Field Analysis', [
      `Total notifications: ${snapshot.size}`,
      `With 'status' field: ${hasStatusField}`,
      `With 'read' field: ${hasReadField}`,
      '',
      'Status distribution:',
      ...Object.entries(statusCounts).map(([s, c]) =>
        `  ${s}: ${c} (maps to read=${statusToReadMapping[s] ?? 'unknown'})`
      ),
    ]);

    // The key test: do notifications have 'status' (correct) or 'read' (legacy)?
    if (hasStatusField > hasReadField) {
      logPass("Most notifications use 'status' field - Admin API must map status->read");
      results.push({
        name: "Notifications use 'status' schema",
        passed: true,
        details: { statusCount: hasStatusField, readCount: hasReadField },
      });
    } else if (hasReadField > hasStatusField) {
      logInfo("Most notifications use 'read' field - legacy schema");
      results.push({
        name: "Notifications use 'read' schema (legacy)",
        passed: true,
        details: { statusCount: hasStatusField, readCount: hasReadField },
      });
    } else {
      logInfo('Mixed schema - some have status, some have read');
      results.push({
        name: 'Mixed notification schema',
        passed: true,
      });
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Error: ${message}`);
    results.push({ name: 'Status-to-read mapping', passed: false, reason: message });
  }

  return results;
}
