#!/usr/bin/env npx tsx
/**
 * Check user's timezone setting in Firestore
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

function initFirebase() {
  if (admin.apps.length === 0) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else if (projectId) {
      admin.initializeApp({ projectId });
    } else {
      throw new Error('Firebase credentials required');
    }
  }
  return admin.firestore();
}

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: npx tsx scripts/integration-tests/check-user-timezone.ts <userId>');
    process.exit(1);
  }

  const db = initFirebase();
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();

  console.log(`\n👤 User: ${userId}`);
  console.log(`   timezone: ${userData?.timezone || '⚠️  NOT SET (defaults to UTC)'}`);
  console.log(`   locale: ${userData?.locale || 'not set'}`);

  if (!userData?.timezone) {
    console.log(`\n⚠️  Your timezone is not set! The system defaults to UTC.`);
    console.log(`   To fix, update your timezone in the app settings, or run:`);
    console.log(`\n   # Set timezone to PST:`);
    console.log(`   npx tsx -e "
const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
admin.firestore().collection('users').doc('${userId}').update({ timezone: 'America/Los_Angeles' }).then(() => console.log('Done!'));
"`);
  }

  console.log('\n');
}

main().catch(console.error);
