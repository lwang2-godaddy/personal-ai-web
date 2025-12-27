#!/usr/bin/env tsx

/**
 * Quick script to set a user as admin
 * Usage: npm run set-admin <email>
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
if (!admin.apps.length) {
  // Try to use service account key from environment
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Using Firebase service account from environment variable\n');
    } catch (error) {
      console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY');
      process.exit(1);
    }
  } else {
    // Fallback to application default credentials
    console.log('ℹ️  Using application default credentials (gcloud)\n');
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
}

const db = admin.firestore();

async function setAdmin(email: string) {
  try {
    console.log(`\nSearching for user with email: ${email}...`);

    // Find user by email
    const usersSnapshot = await db.collection('users').get();

    let foundUser: any = null;
    let userId: string | null = null;

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.email === email) {
        foundUser = userData;
        userId = doc.id;
      }
    });

    if (!foundUser || !userId) {
      console.error(`❌ User with email ${email} not found in Firestore`);
      console.log('\nAvailable users:');
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`  - ${data.email} (${data.displayName || 'No name'})`);
      });
      process.exit(1);
    }

    console.log(`✅ Found user: ${foundUser.displayName || foundUser.email}`);
    console.log(`   Current role: ${foundUser.role || 'not set'}`);
    console.log(`   Account status: ${foundUser.accountStatus || 'not set'}`);

    // Update user to admin
    console.log(`\nUpdating user to admin...`);
    await db.collection('users').doc(userId).update({
      role: 'admin',
      accountStatus: 'active',
    });

    console.log('✅ Successfully set user as admin!');
    console.log('\n⚠️  Important: User must sign out and sign back in for changes to take effect');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('📋 Available users:\n');
  db.collection('users').get()
    .then((snapshot) => {
      if (snapshot.empty) {
        console.log('   No users found in database');
      } else {
        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log(`   ${data.email || 'No email'}`);
          console.log(`      Name: ${data.displayName || 'Not set'}`);
          console.log(`      Role: ${data.role || 'not set'}`);
          console.log(`      Status: ${data.accountStatus || 'not set'}`);
          console.log('');
        });
      }
      console.log('Usage: npm run set-admin <email>');
      console.log('Example: npm run set-admin user@example.com\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error listing users:', error.message);
      process.exit(1);
    });
} else {
  setAdmin(email)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}
