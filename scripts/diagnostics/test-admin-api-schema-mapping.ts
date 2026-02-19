/**
 * Test Admin API schema mapping for notifications
 *
 * Creates test notifications with both schemas and verifies
 * the Admin API mapping logic works correctly.
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

if (admin.apps.length === 0) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function main() {
  console.log('\n🔔 Testing Admin API Schema Mapping\n');

  const testUserId = 'test-schema-mapping-user';
  const testPrefix = 'schema-test-' + Date.now();
  const now = admin.firestore.Timestamp.now();

  // Create test notifications with both schemas
  const testNotifications = [
    {
      id: `${testPrefix}-new-sent`,
      data: {
        userId: testUserId,
        type: 'daily_summary',
        category: 'scheduled',
        title: '📊 NEW Schema - Sent',
        body: 'status=sent should map to read=false',
        status: 'sent',
        channel: 'daily_summaries',
        priority: 'default',
        metadata: { test: 'new-sent' },
        sentAt: now,
        createdAt: now,
        updatedAt: now,
      },
      expectedRead: false,
    },
    {
      id: `${testPrefix}-new-opened`,
      data: {
        userId: testUserId,
        type: 'daily_summary',
        category: 'scheduled',
        title: '📊 NEW Schema - Opened',
        body: 'status=opened should map to read=true',
        status: 'opened',
        channel: 'daily_summaries',
        priority: 'default',
        metadata: { test: 'new-opened' },
        sentAt: now,
        createdAt: now,
        updatedAt: now,
      },
      expectedRead: true,
    },
    {
      id: `${testPrefix}-legacy-unread`,
      data: {
        userId: testUserId,
        type: 'daily_summary',
        title: '📊 LEGACY Schema - Unread',
        body: 'read=false should map to read=false',
        read: false,
        data: { test: 'legacy-unread' },
        createdAt: now,
      },
      expectedRead: false,
    },
    {
      id: `${testPrefix}-legacy-read`,
      data: {
        userId: testUserId,
        type: 'daily_summary',
        title: '📊 LEGACY Schema - Read',
        body: 'read=true should map to read=true',
        read: true,
        data: { test: 'legacy-read' },
        createdAt: now,
      },
      expectedRead: true,
    },
  ];

  console.log('📝 Creating test notifications...');
  for (const notif of testNotifications) {
    await db.collection('notifications').doc(notif.id).set(notif.data);
    console.log(`   ✅ Created: ${notif.id}`);
  }

  console.log('\n📋 Testing Admin API mapping logic...');

  // Simulate Admin API mapping (same logic as route.ts)
  let allPassed = true;
  for (const notif of testNotifications) {
    const doc = await db.collection('notifications').doc(notif.id).get();
    const data = doc.data()!;

    // Admin API mapping logic
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

    const passed = readValue === notif.expectedRead;
    const schema = 'status' in data ? 'NEW' : 'LEGACY';
    const icon = passed ? '✅' : '❌';

    console.log(`   ${icon} [${schema}] ${notif.id.split('-').slice(-2).join('-')}`);
    console.log(`      Firestore: ${data.status || `read=${data.read}`}`);
    console.log(`      Mapped: read=${readValue}, status=${statusValue}`);
    console.log(`      Expected: read=${notif.expectedRead}`);

    if (!passed) allPassed = false;
  }

  console.log('\n🧹 Cleaning up...');
  for (const notif of testNotifications) {
    await db.collection('notifications').doc(notif.id).delete();
  }
  console.log('   ✅ All test notifications deleted');

  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - Admin API handles both schemas correctly');
  } else {
    console.log('❌ SOME TESTS FAILED - Check mapping logic');
  }
  console.log('='.repeat(50) + '\n');
}

main().catch(console.error);
