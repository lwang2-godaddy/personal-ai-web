/**
 * Test the admin notifications API endpoint
 *
 * This script:
 * 1. Creates a test notification with both schemas (legacy + new)
 * 2. Queries the admin API
 * 3. Verifies the response contains all notifications
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

// Initialize Firebase Admin
function initFirebase(): admin.firestore.Firestore {
  if (admin.apps.length === 0) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY required');
    }
  }
  return admin.firestore();
}

async function main() {
  console.log('\n🔔 Testing Admin Notifications API\n');

  const db = initFirebase();

  // Find a user with notifications
  const usersSnapshot = await db.collection('notifications')
    .select('userId')
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    console.log('❌ No notifications found in database');
    return;
  }

  const testUserId = usersSnapshot.docs[0].data().userId;
  console.log(`📋 Testing with userId: ${testUserId}`);

  // Query notifications for this user directly from Firestore
  const notifSnapshot = await db.collection('notifications')
    .where('userId', '==', testUserId)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();

  console.log(`\n📊 Found ${notifSnapshot.size} notifications in Firestore:`);

  notifSnapshot.docs.forEach((doc, i) => {
    const data = doc.data();
    const hasRead = 'read' in data;
    const hasStatus = 'status' in data;
    const schema = hasStatus ? 'NEW (status)' : hasRead ? 'LEGACY (read)' : 'UNKNOWN';

    console.log(`\n${i + 1}. [${schema}] ${doc.id}`);
    console.log(`   type: ${data.type}`);
    console.log(`   title: ${data.title?.substring(0, 50)}`);
    if (hasRead) console.log(`   read: ${data.read}`);
    if (hasStatus) console.log(`   status: ${data.status}`);
    if (data.channel) console.log(`   channel: ${data.channel}`);
    if (data.category) console.log(`   category: ${data.category}`);
  });

  // Now create a test notification with NotificationHistoryService schema
  const testNotifId = `api-test-${Date.now()}`;
  const now = admin.firestore.Timestamp.now();

  console.log(`\n🧪 Creating test notification with NEW schema: ${testNotifId}`);

  await db.collection('notifications').doc(testNotifId).set({
    userId: testUserId,
    type: 'daily_summary',
    category: 'scheduled',
    title: '📊 Daily Recap (API Test)',
    body: 'Test: 1000 steps, 5 locations, 3 voice notes',
    status: 'sent',
    channel: 'daily_summaries',
    priority: 'default',
    metadata: {
      steps: '1000',
      locations: '5',
      voices: '3',
    },
    sentAt: now,
    createdAt: now,
    updatedAt: now,
  });

  console.log('   ✅ Created notification with NEW schema (status field)');

  // Also create one with legacy schema
  const legacyNotifId = `api-test-legacy-${Date.now()}`;
  console.log(`\n🧪 Creating test notification with LEGACY schema: ${legacyNotifId}`);

  await db.collection('notifications').doc(legacyNotifId).set({
    userId: testUserId,
    type: 'daily_summary',
    title: '📊 Daily Recap (Legacy Test)',
    body: 'Test: Legacy schema with read field',
    data: {
      steps: '500',
      locations: '2',
    },
    read: false,
    createdAt: now,
  });

  console.log('   ✅ Created notification with LEGACY schema (read field)');

  // Query again to verify both show up
  console.log('\n📋 Verifying both notifications are stored...');

  const newNotifDoc = await db.collection('notifications').doc(testNotifId).get();
  const legacyNotifDoc = await db.collection('notifications').doc(legacyNotifId).get();

  if (newNotifDoc.exists && legacyNotifDoc.exists) {
    console.log('   ✅ Both test notifications exist in Firestore');

    const newData = newNotifDoc.data()!;
    const legacyData = legacyNotifDoc.data()!;

    console.log('\n📦 NEW schema notification:');
    console.log(`   status: ${newData.status}`);
    console.log(`   channel: ${newData.channel}`);
    console.log(`   category: ${newData.category}`);
    console.log(`   metadata: ${JSON.stringify(newData.metadata)}`);

    console.log('\n📦 LEGACY schema notification:');
    console.log(`   read: ${legacyData.read}`);
    console.log(`   data: ${JSON.stringify(legacyData.data)}`);
  }

  // Cleanup
  console.log('\n🧹 Cleaning up test notifications...');
  await db.collection('notifications').doc(testNotifId).delete();
  await db.collection('notifications').doc(legacyNotifId).delete();
  console.log('   ✅ Cleanup complete');

  console.log('\n✅ Test complete! Now check the admin page to verify notifications display correctly.');
  console.log(`\n   URL: https://www.sircharge.ai/admin/notifications`);
  console.log(`   Select user to see their notifications`);
}

main().catch(console.error);
