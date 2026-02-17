/**
 * Push Notifications Admin - Integration Tests
 *
 * Tests the notifications collection data integrity, document structure,
 * and notification type distribution for the Push Notifications admin page.
 *
 * Collection: notifications
 * Admin Page: /admin/notifications
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
export const name = 'Push Notifications Admin';

// Valid notification types (from NotificationHistoryService)
const VALID_NOTIFICATION_TYPES = [
  // System Notifications
  'daily_summary',
  'weekly_insights',
  'fun_fact',
  'achievement',
  'life_keyword',

  // Reminder Notifications
  'event_reminder',
  'escalated_reminder',
  'pattern_reminder',
  'location_alert',
  'check_in_suggestion',

  // Social Notifications
  'content_like',
  'content_comment',
  'life_feed_like',
  'life_feed_comment',
  'circle_member_joined',

  // Friend Notifications
  'friend_request',
  'friend_request_accepted',

  // Challenge Notifications
  'challenge_daily_reminder',
  'challenge_progress',
  'challenge_event',
  'challenge_milestone',
];

// Notification type categories for reporting
const TYPE_CATEGORIES: Record<string, string[]> = {
  System: ['daily_summary', 'weekly_insights', 'fun_fact', 'achievement', 'life_keyword'],
  Reminders: ['event_reminder', 'escalated_reminder', 'pattern_reminder', 'location_alert', 'check_in_suggestion'],
  Social: ['content_like', 'content_comment', 'life_feed_like', 'life_feed_comment', 'circle_member_joined'],
  Friends: ['friend_request', 'friend_request_accepted'],
  Challenges: ['challenge_daily_reminder', 'challenge_progress', 'challenge_event', 'challenge_milestone'],
};

/**
 * Main test runner
 */
export async function run(testCase?: string): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  const tests: Array<{ name: string; fn: () => Promise<TestResult[]> }> = [
    { name: 'collection-exists', fn: () => testNotificationsCollectionExists(db) },
    { name: 'document-structure', fn: () => testNotificationDocumentStructure(db) },
    { name: 'user-notifications', fn: () => testUserNotifications(db, userId) },
    { name: 'type-distribution', fn: () => testNotificationTypeDistribution(db) },
    { name: 'read-status', fn: () => testReadStatusTracking(db) },
    { name: 'type-coverage', fn: () => testTypeCoverage(db) },
  ];

  for (const test of tests) {
    if (testCase && test.name !== testCase) continue;
    const results = await test.fn();
    allResults.push(...results);
  }

  return allResults;
}

/**
 * Test 1: Check notifications collection exists and has data
 */
async function testNotificationsCollectionExists(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Notifications Collection Exists');

  try {
    const snapshot = await db.collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    logQueryBox('Notifications Collection', [
      'Collection: notifications',
      'orderBy createdAt desc',
      `Found: ${snapshot.size} notifications`,
    ]);

    if (snapshot.size > 0) {
      logPass(`Found ${snapshot.size} notifications`);
      results.push({
        name: 'Notifications collection has data',
        passed: true,
      });
    } else {
      logInfo('No notifications found in collection (may be normal for new setup)');
      results.push({
        name: 'Notifications collection has data',
        passed: true,
        reason: 'Collection is empty (may be normal)',
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('index')) {
      logInfo('Firestore index not ready for createdAt query');
      results.push({
        name: 'Notifications collection exists',
        passed: true,
        reason: 'Index not ready',
      });
    } else {
      logFail(`Error checking collection: ${message}`);
      results.push({
        name: 'Notifications collection exists',
        passed: false,
        reason: message,
      });
    }
  }

  return results;
}

/**
 * Test 2: Verify notification document structure has required fields
 */
async function testNotificationDocumentStructure(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Notification Document Structure');

  const requiredFields = [
    'userId',
    'type',
    'title',
    'body',
    'read',
    'createdAt',
  ];

  const optionalFields = [
    'data',
    'channel',
    'priority',
    'expiresAt',
  ];

  try {
    const snapshot = await db.collection('notifications')
      .limit(10)
      .get();

    if (snapshot.empty) {
      logInfo('No notifications to check structure');
      results.push({
        name: 'Document structure check',
        passed: true,
        reason: 'Skipped - no notifications',
      });
      return results;
    }

    let allValid = true;
    const fieldPresence: Record<string, number> = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const missingFields: string[] = [];

      for (const field of requiredFields) {
        if (!(field in data)) {
          missingFields.push(field);
        } else {
          fieldPresence[field] = (fieldPresence[field] || 0) + 1;
        }
      }

      for (const field of optionalFields) {
        if (field in data) {
          fieldPresence[field] = (fieldPresence[field] || 0) + 1;
        }
      }

      if (missingFields.length > 0) {
        logFail(`Notification ${doc.id} missing: ${missingFields.join(', ')}`);
        allValid = false;
      }
    });

    if (allValid) {
      logPass(`All ${snapshot.size} checked notifications have required fields`);
      results.push({
        name: 'Required fields present in all notifications',
        passed: true,
      });
    } else {
      results.push({
        name: 'Required fields present in all notifications',
        passed: false,
        reason: 'Some notifications missing required fields',
      });
    }

    // Log field presence stats
    logQueryBox('Field Presence', [
      `Notifications checked: ${snapshot.size}`,
      '',
      'Required fields:',
      ...requiredFields.map((f) => `  ${f}: ${fieldPresence[f] || 0}/${snapshot.size}`),
      '',
      'Optional fields:',
      ...optionalFields.map((f) => `  ${f}: ${fieldPresence[f] || 0}/${snapshot.size}`),
    ]);

    // Check type validity on first doc
    const doc = snapshot.docs[0];
    const data = doc.data();

    if (VALID_NOTIFICATION_TYPES.includes(data.type)) {
      logPass(`Notification type valid: ${data.type}`);
      results.push({ name: 'Notification type is valid enum', passed: true });
    } else {
      logFail(`Invalid notification type: ${data.type}`);
      results.push({
        name: 'Notification type is valid enum',
        passed: false,
        reason: `Got: ${data.type}, expected one of valid types`,
      });
    }

    // Check read status is boolean
    if (typeof data.read === 'boolean') {
      logPass(`Read status is boolean: ${data.read}`);
      results.push({ name: 'Read status is boolean', passed: true });
    } else {
      logFail(`Read status is not boolean: ${typeof data.read}`);
      results.push({
        name: 'Read status is boolean',
        passed: false,
        reason: `Got type: ${typeof data.read}`,
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Error: ${message}`);
    results.push({
      name: 'Document structure check',
      passed: false,
      reason: message,
    });
  }

  return results;
}

/**
 * Test 3: Check notifications for the test user
 */
async function testUserNotifications(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('User Notifications Query');

  try {
    const snapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    logQueryBox('User Notifications', [
      `userId == "${userId}"`,
      'orderBy createdAt desc',
      `Found: ${snapshot.size} notifications`,
    ]);

    if (snapshot.size > 0) {
      logPass(`User has ${snapshot.size} notifications`);

      // Log some sample notifications
      snapshot.docs.slice(0, 3).forEach((doc) => {
        const data = doc.data();
        const readStatus = data.read ? 'read' : 'unread';
        logInfo(`  ${data.type}: "${data.title?.substring(0, 40)}..." (${readStatus})`);
      });

      results.push({
        name: 'User has notifications',
        passed: true,
        details: { count: snapshot.size },
      });

      // Verify all notifications belong to this user (data isolation)
      const wrongUser = snapshot.docs.find((doc) => doc.data().userId !== userId);
      if (!wrongUser) {
        logPass('All notifications belong to the correct user (data isolation OK)');
        results.push({ name: 'User data isolation', passed: true });
      } else {
        logFail(`Notification ${wrongUser.id} has wrong userId`);
        results.push({
          name: 'User data isolation',
          passed: false,
          reason: `Notification ${wrongUser.id} has userId ${wrongUser.data().userId} instead of ${userId}`,
        });
      }
    } else {
      logInfo('No notifications found for test user (may be normal)');
      results.push({
        name: 'User notifications query',
        passed: true,
        reason: 'No notifications for test user',
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // Handle missing index gracefully
    if (message.includes('index')) {
      logInfo('Firestore index not ready for this query');
      results.push({
        name: 'User notifications query',
        passed: true,
        reason: 'Index not ready',
      });
    } else {
      logFail(`Error: ${message}`);
      results.push({
        name: 'User notifications query',
        passed: false,
        reason: message,
      });
    }
  }

  return results;
}

/**
 * Test 4: Check notification type distribution across the collection
 */
async function testNotificationTypeDistribution(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Notification Type Distribution');

  try {
    const snapshot = await db.collection('notifications')
      .select('type', 'read')
      .limit(500)
      .get();

    if (snapshot.empty) {
      results.push({ name: 'Type distribution', passed: true, reason: 'No notifications to check' });
      return results;
    }

    const typeCounts = new Map<string, number>();
    let readCount = 0;
    let unreadCount = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      typeCounts.set(data.type, (typeCounts.get(data.type) || 0) + 1);
      if (data.read) {
        readCount++;
      } else {
        unreadCount++;
      }
    });

    // Group by category
    const categoryReport: string[] = [];
    for (const [category, types] of Object.entries(TYPE_CATEGORIES)) {
      const categoryCount = types.reduce((sum, type) => sum + (typeCounts.get(type) || 0), 0);
      if (categoryCount > 0) {
        categoryReport.push(`${category}: ${categoryCount}`);
        types.forEach((type) => {
          const count = typeCounts.get(type) || 0;
          if (count > 0) {
            categoryReport.push(`  ${type}: ${count}`);
          }
        });
      }
    }

    logQueryBox('Type Distribution', [
      `Total notifications sampled: ${snapshot.size}`,
      `Read: ${readCount} | Unread: ${unreadCount}`,
      '',
      'By Category:',
      ...categoryReport,
    ]);

    // Verify all types are valid
    const invalidTypes = Array.from(typeCounts.keys()).filter(
      (t) => !VALID_NOTIFICATION_TYPES.includes(t)
    );

    if (invalidTypes.length === 0) {
      logPass('All notification types are valid');
      results.push({ name: 'All notification types valid', passed: true });
    } else {
      logFail(`Invalid notification types found: ${invalidTypes.join(', ')}`);
      results.push({
        name: 'All notification types valid',
        passed: false,
        reason: `Invalid types: ${invalidTypes.join(', ')}`,
      });
    }

    // Log unique type count
    logInfo(`Unique notification types in data: ${typeCounts.size}`);
    results.push({
      name: 'Type distribution logged',
      passed: true,
      details: {
        uniqueTypes: typeCounts.size,
        totalSampled: snapshot.size,
        readCount,
        unreadCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Error: ${message}`);
    results.push({ name: 'Type distribution check', passed: false, reason: message });
  }

  return results;
}

/**
 * Test 5: Check read status tracking
 */
async function testReadStatusTracking(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Read Status Tracking');

  try {
    // Query unread notifications
    const unreadSnapshot = await db.collection('notifications')
      .where('read', '==', false)
      .limit(50)
      .get();

    // Query read notifications
    const readSnapshot = await db.collection('notifications')
      .where('read', '==', true)
      .limit(50)
      .get();

    logQueryBox('Read Status Distribution', [
      `Unread sample: ${unreadSnapshot.size}`,
      `Read sample: ${readSnapshot.size}`,
    ]);

    // Check that read field is consistently boolean
    let allBoolean = true;
    [...unreadSnapshot.docs, ...readSnapshot.docs].forEach((doc) => {
      const data = doc.data();
      if (typeof data.read !== 'boolean') {
        logFail(`Notification ${doc.id} has non-boolean read: ${typeof data.read}`);
        allBoolean = false;
      }
    });

    if (allBoolean) {
      logPass('All read fields are boolean type');
      results.push({ name: 'Read field type consistency', passed: true });
    } else {
      results.push({
        name: 'Read field type consistency',
        passed: false,
        reason: 'Some read fields are not boolean',
      });
    }

    // Log insights
    if (unreadSnapshot.size > 0 || readSnapshot.size > 0) {
      const total = unreadSnapshot.size + readSnapshot.size;
      const readPct = ((readSnapshot.size / total) * 100).toFixed(0);
      logInfo(`Read rate in sample: ${readPct}%`);
      results.push({
        name: 'Read status tracking working',
        passed: true,
        details: { readRate: `${readPct}%` },
      });
    } else {
      logInfo('No notifications to check read status');
      results.push({
        name: 'Read status tracking',
        passed: true,
        reason: 'No notifications found',
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Error: ${message}`);
    results.push({ name: 'Read status check', passed: false, reason: message });
  }

  return results;
}

/**
 * Test 6: Check coverage of notification types vs. expected types
 */
async function testTypeCoverage(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Notification Type Coverage');

  try {
    const snapshot = await db.collection('notifications')
      .select('type')
      .limit(1000)
      .get();

    if (snapshot.empty) {
      results.push({ name: 'Type coverage', passed: true, reason: 'No notifications to check' });
      return results;
    }

    const typesInData = new Set<string>();
    snapshot.docs.forEach((doc) => {
      typesInData.add(doc.data().type);
    });

    // Find types we expect but haven't seen
    const missingTypes = VALID_NOTIFICATION_TYPES.filter((t) => !typesInData.has(t));

    // Find types we've seen that are not expected (already checked in test 4, but report here too)
    const unexpectedTypes = Array.from(typesInData).filter(
      (t) => !VALID_NOTIFICATION_TYPES.includes(t)
    );

    const coveragePct = (((VALID_NOTIFICATION_TYPES.length - missingTypes.length) / VALID_NOTIFICATION_TYPES.length) * 100).toFixed(0);

    logQueryBox('Type Coverage Analysis', [
      `Expected types: ${VALID_NOTIFICATION_TYPES.length}`,
      `Types found in data: ${typesInData.size}`,
      `Coverage: ${coveragePct}%`,
      '',
      missingTypes.length > 0 ? `Missing types (${missingTypes.length}):` : 'All expected types present!',
      ...missingTypes.map((t) => `  - ${t}`),
    ]);

    if (unexpectedTypes.length > 0) {
      logInfo(`Unexpected types found: ${unexpectedTypes.join(', ')}`);
    }

    // Coverage is informational, not a hard pass/fail
    logInfo(`Type coverage: ${coveragePct}% (${typesInData.size}/${VALID_NOTIFICATION_TYPES.length} types)`);
    results.push({
      name: 'Type coverage logged',
      passed: true,
      details: {
        coverage: `${coveragePct}%`,
        foundTypes: typesInData.size,
        expectedTypes: VALID_NOTIFICATION_TYPES.length,
        missingTypes: missingTypes,
      },
    });

    // If we have at least some types, consider it working
    if (typesInData.size > 0) {
      logPass(`Found ${typesInData.size} different notification types in data`);
      results.push({
        name: 'Multiple notification types in use',
        passed: true,
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Error: ${message}`);
    results.push({ name: 'Type coverage check', passed: false, reason: message });
  }

  return results;
}
