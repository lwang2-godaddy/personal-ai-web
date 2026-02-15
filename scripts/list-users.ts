#!/usr/bin/env tsx

/**
 * Quick script to list users from Firestore
 * Usage: npx tsx scripts/list-users.ts
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY');
      process.exit(1);
    }
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
}

const db = admin.firestore();

async function listUsers() {
  try {
    const usersSnap = await db.collection('users').limit(20).get();

    if (usersSnap.empty) {
      console.log('No users found in Firestore.');
      return;
    }

    console.log(`Found ${usersSnap.size} users:\n`);
    console.log('─'.repeat(80));

    usersSnap.forEach((doc) => {
      const data = doc.data();
      console.log(`  UID:     ${doc.id}`);
      console.log(`  Email:   ${data.email || 'N/A'}`);
      console.log(`  Name:    ${data.displayName || data.name || 'N/A'}`);
      console.log(`  Lang:    ${data.preferences?.language?.appLanguage || 'not set'}`);
      console.log('─'.repeat(80));
    });
  } catch (error) {
    console.error('Error listing users:', error);
    process.exit(1);
  }
}

listUsers();
