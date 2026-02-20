#!/usr/bin/env tsx

/**
 * Update a user's password
 * Usage: npx tsx scripts/update-password.ts <email> <newPassword>
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
      console.log('Using Firebase service account from environment variable\n');
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY');
      process.exit(1);
    }
  } else {
    console.log('Using application default credentials (gcloud)\n');
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
}

async function updatePassword(email: string, newPassword: string) {
  try {
    console.log(`Looking up user: ${email}...`);

    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log(`Found user: ${userRecord.displayName || userRecord.email} (uid: ${userRecord.uid})`);

    // Update password
    console.log(`Updating password...`);
    await admin.auth().updateUser(userRecord.uid, {
      password: newPassword,
    });

    console.log('Password updated successfully!');

  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.error(`User with email ${email} not found`);
    } else if (error.code === 'auth/invalid-password') {
      console.error('Invalid password: must be at least 6 characters');
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

// Get arguments
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log('Usage: npx tsx scripts/update-password.ts <email> <newPassword>');
  console.log('Example: npx tsx scripts/update-password.ts user@example.com NewPassword123');
  process.exit(1);
}

updatePassword(email, newPassword)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
