/**
 * migrate-free-to-basic.ts
 *
 * Script to migrate existing users from 'free' tier to 'basic' tier
 * Run with: npx tsx scripts/migrate-free-to-basic.ts
 *
 * IMPORTANT: Only run this after all users have updated to the new app version
 * that handles both 'free' and 'basic' tier values with normalizeTier().
 *
 * This script:
 * 1. Finds all users with subscription.tier = 'free'
 * 2. Updates them to subscription.tier = 'basic'
 * 3. Logs the migration results
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin
// Look for service account in common locations
const possiblePaths = [
  path.join(__dirname, '../serviceAccountKey.json'),
  path.join(__dirname, '../../personalaiapp-90131-firebase-adminsdk-fbsvc-b6aeb012ec.json'),
  path.join(__dirname, '../../PersonalAIApp/firebase/functions/serviceAccountKey.json'),
];

let serviceAccountPath: string | null = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    serviceAccountPath = p;
    console.log(`Found service account at: ${p}`);
    break;
  }
}

if (!serviceAccountPath) {
  console.error('ERROR: No service account file found. Checked:');
  possiblePaths.forEach(p => console.error(`  - ${p}`));
  console.error('\nPlease ensure a Firebase service account JSON file exists.');
  process.exit(1);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
  console.log('Firebase Admin initialized successfully.\n');
}

const db = admin.firestore();

interface MigrationResult {
  totalFound: number;
  migrated: number;
  errors: number;
  userIds: string[];
}

async function migrateFreeTierUsers(dryRun: boolean = true): Promise<MigrationResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Migration: 'free' tier -> 'basic' tier`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be applied)'}`);
  console.log(`${'='.repeat(60)}\n`);

  const result: MigrationResult = {
    totalFound: 0,
    migrated: 0,
    errors: 0,
    userIds: [],
  };

  try {
    // Query for users with 'free' tier
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('subscription.tier', '==', 'free').get();

    result.totalFound = snapshot.size;
    console.log(`Found ${result.totalFound} users with tier='free'\n`);

    if (snapshot.empty) {
      console.log('No users to migrate. All users are already on the new tier system.');
      return result;
    }

    // Process each user
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit

    for (const doc of snapshot.docs) {
      const userId = doc.id;
      const userData = doc.data();

      console.log(`  User: ${userId}`);
      console.log(`    Email: ${userData.email || 'N/A'}`);
      console.log(`    Current tier: ${userData.subscription?.tier}`);

      if (!dryRun) {
        batch.update(doc.ref, {
          'subscription.tier': 'basic',
          'subscription.migratedFrom': 'free',
          'subscription.migratedAt': new Date().toISOString(),
        });
        batchCount++;

        // Commit batch if we hit the limit
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`\n  Committed batch of ${batchCount} updates\n`);
          batchCount = 0;
        }
      }

      result.migrated++;
      result.userIds.push(userId);
    }

    // Commit remaining updates
    if (!dryRun && batchCount > 0) {
      await batch.commit();
      console.log(`\n  Committed final batch of ${batchCount} updates\n`);
    }

  } catch (error) {
    console.error('Error during migration:', error);
    result.errors++;
  }

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('Migration Summary:');
  console.log(`${'='.repeat(60)}`);
  console.log(`  Total users found: ${result.totalFound}`);
  console.log(`  Users migrated: ${result.migrated}`);
  console.log(`  Errors: ${result.errors}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);

  if (dryRun && result.totalFound > 0) {
    console.log(`\n⚠️  This was a DRY RUN. No changes were made.`);
    console.log(`   To apply changes, run with: npx tsx scripts/migrate-free-to-basic.ts --live`);
  }

  return result;
}

// Check command line args
const args = process.argv.slice(2);
const isLiveRun = args.includes('--live') || args.includes('-l');

if (isLiveRun) {
  console.log('\n⚠️  WARNING: Running in LIVE mode. Changes will be applied to the database.');
  console.log('   Press Ctrl+C within 5 seconds to cancel...\n');

  setTimeout(() => {
    migrateFreeTierUsers(false)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
      });
  }, 5000);
} else {
  // Dry run by default
  migrateFreeTierUsers(true)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
