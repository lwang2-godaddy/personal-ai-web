#!/usr/bin/env tsx

/**
 * User Migration Script
 *
 * Commands:
 * 1. migrate - Add role and accountStatus fields to all existing users
 * 2. set-admin <email> - Promote a user to admin role
 *
 * Usage:
 *   npm run migrate:users migrate
 *   npm run migrate:users set-admin user@example.com
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

let firebaseAdmin: admin.app.App | null = null;

function initializeFirebaseAdmin(): admin.app.App {
  if (firebaseAdmin) return firebaseAdmin;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    console.error('Error: NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set');
    process.exit(1);
  }

  try {
    // Try to use service account key if available
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      console.log('✓ Firebase Admin initialized with service account');
    } else {
      // Fall back to Application Default Credentials
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });
      console.log('✓ Firebase Admin initialized with Application Default Credentials');
    }
  } catch (error: any) {
    console.error('Error initializing Firebase Admin:', error.message);
    process.exit(1);
  }

  return firebaseAdmin;
}

/**
 * Migrate all existing users to add role and accountStatus fields
 */
async function migrateUsers() {
  console.log('Starting user migration...\n');

  const app = initializeFirebaseAdmin();
  const db = admin.firestore(app);

  try {
    // Fetch all users
    console.log('Fetching all users...');
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users\n`);

    if (usersSnapshot.empty) {
      console.log('No users found. Nothing to migrate.');
      return;
    }

    // Filter users that need migration (don't have role field)
    const usersToMigrate = usersSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return !data.role || !data.accountStatus;
    });

    if (usersToMigrate.length === 0) {
      console.log('All users already have role and accountStatus fields. No migration needed.');
      return;
    }

    console.log(`Found ${usersToMigrate.length} users that need migration\n`);

    // Use batch writes (max 500 operations per batch)
    const batchSize = 500;
    let totalUpdated = 0;

    for (let i = 0; i < usersToMigrate.length; i += batchSize) {
      const batch = db.batch();
      const batchUsers = usersToMigrate.slice(i, i + batchSize);

      batchUsers.forEach((doc) => {
        const data = doc.data();
        const updates: any = {
          updatedAt: new Date().toISOString(),
        };

        // Add role if missing
        if (!data.role) {
          updates.role = 'user';
        }

        // Add accountStatus if missing
        if (!data.accountStatus) {
          updates.accountStatus = 'active';
        }

        batch.update(doc.ref, updates);
      });

      // Commit batch
      await batch.commit();
      totalUpdated += batchUsers.length;

      console.log(`✓ Migrated ${totalUpdated}/${usersToMigrate.length} users`);
    }

    console.log(`\n✓ Migration completed successfully!`);
    console.log(`  Total users migrated: ${totalUpdated}`);
    console.log(`  Default role: user`);
    console.log(`  Default account status: active\n`);
  } catch (error: any) {
    console.error('\n✗ Migration failed:', error.message);
    process.exit(1);
  }
}

/**
 * Set a user as admin by email
 */
async function setAdmin(email: string) {
  if (!email) {
    console.error('Error: Email is required');
    console.log('Usage: npm run migrate:users set-admin <email>');
    process.exit(1);
  }

  console.log(`Setting admin role for user: ${email}\n`);

  const app = initializeFirebaseAdmin();
  const db = admin.firestore(app);

  try {
    // Find user by email
    console.log('Searching for user...');
    const usersSnapshot = await db
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.error(`✗ User not found with email: ${email}`);
      process.exit(1);
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    console.log(`Found user: ${userData.displayName || 'Unknown'} (${userData.email})`);
    console.log(`Current role: ${userData.role || 'not set'}\n`);

    // Update user role to admin
    await userDoc.ref.update({
      role: 'admin',
      updatedAt: new Date().toISOString(),
    });

    console.log('✓ User successfully promoted to admin!');
    console.log(`  User ID: ${userDoc.id}`);
    console.log(`  Email: ${userData.email}`);
    console.log(`  Display Name: ${userData.displayName || 'Not set'}`);
    console.log(`  New Role: admin\n`);
  } catch (error: any) {
    console.error('\n✗ Failed to set admin role:', error.message);
    process.exit(1);
  }
}

/**
 * Remove admin role from a user
 */
async function removeAdmin(email: string) {
  if (!email) {
    console.error('Error: Email is required');
    console.log('Usage: npm run migrate:users remove-admin <email>');
    process.exit(1);
  }

  console.log(`Removing admin role from user: ${email}\n`);

  const app = initializeFirebaseAdmin();
  const db = admin.firestore(app);

  try {
    // Find user by email
    console.log('Searching for user...');
    const usersSnapshot = await db
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.error(`✗ User not found with email: ${email}`);
      process.exit(1);
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    console.log(`Found user: ${userData.displayName || 'Unknown'} (${userData.email})`);
    console.log(`Current role: ${userData.role || 'not set'}\n`);

    // Update user role to regular user
    await userDoc.ref.update({
      role: 'user',
      updatedAt: new Date().toISOString(),
    });

    console.log('✓ Admin role removed successfully!');
    console.log(`  User ID: ${userDoc.id}`);
    console.log(`  Email: ${userData.email}`);
    console.log(`  Display Name: ${userData.displayName || 'Not set'}`);
    console.log(`  New Role: user\n`);
  } catch (error: any) {
    console.error('\n✗ Failed to remove admin role:', error.message);
    process.exit(1);
  }
}

/**
 * List all admin users
 */
async function listAdmins() {
  console.log('Fetching all admin users...\n');

  const app = initializeFirebaseAdmin();
  const db = admin.firestore(app);

  try {
    const adminsSnapshot = await db
      .collection('users')
      .where('role', '==', 'admin')
      .get();

    if (adminsSnapshot.empty) {
      console.log('No admin users found.');
      return;
    }

    console.log(`Found ${adminsSnapshot.size} admin user(s):\n`);

    adminsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.displayName || 'Unknown'}`);
      console.log(`   Email: ${data.email}`);
      console.log(`   User ID: ${doc.id}`);
      console.log(`   Account Status: ${data.accountStatus || 'active'}`);
      console.log(`   Created: ${data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'Unknown'}\n`);
    });
  } catch (error: any) {
    console.error('\n✗ Failed to list admins:', error.message);
    process.exit(1);
  }
}

/**
 * Display help information
 */
function displayHelp() {
  console.log(`
User Migration Script - Personal AI Web

Commands:
  migrate              Add role and accountStatus fields to all existing users
  set-admin <email>    Promote a user to admin role
  remove-admin <email> Remove admin role from a user
  list-admins          List all admin users
  help                 Display this help information

Usage:
  npm run migrate:users migrate
  npm run migrate:users set-admin user@example.com
  npm run migrate:users remove-admin user@example.com
  npm run migrate:users list-admins

Environment Variables Required:
  NEXT_PUBLIC_FIREBASE_PROJECT_ID    - Firebase project ID
  FIREBASE_SERVICE_ACCOUNT_KEY       - Firebase service account JSON (optional, uses ADC if not set)

Examples:
  # Migrate all existing users
  npm run migrate:users migrate

  # Set your email as admin
  npm run migrate:users set-admin your-email@example.com

  # List all admins
  npm run migrate:users list-admins

  # Remove admin role
  npm run migrate:users remove-admin user@example.com
`);
}

// Main execution
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  console.log('\n=== Personal AI Web - User Migration Script ===\n');

  switch (command) {
    case 'migrate':
      await migrateUsers();
      break;

    case 'set-admin':
      await setAdmin(arg);
      break;

    case 'remove-admin':
      await removeAdmin(arg);
      break;

    case 'list-admins':
      await listAdmins();
      break;

    case 'help':
    case '--help':
    case '-h':
      displayHelp();
      break;

    default:
      console.error(`Error: Unknown command '${command}'`);
      displayHelp();
      process.exit(1);
  }

  // Clean exit
  process.exit(0);
}

main().catch((error) => {
  console.error('\n✗ Unexpected error:', error);
  process.exit(1);
});
