#!/usr/bin/env npx tsx
/**
 * E2E Test Data Seed Script for Maestro Testing
 *
 * Creates deterministic test data for end-to-end (Maestro) testing.
 * Uses fixed document IDs so the script is idempotent - safe to run
 * multiple times without creating duplicate data.
 *
 * Test Users:
 *   - Primary: e2e-test@personalai.app ("E2E Test User")
 *   - Friend:  e2e-friend@personalai.app ("E2E Friend")
 *
 * Usage:
 *   npx tsx scripts/seed-e2e-test-data.ts
 *
 * Environment Variables (optional):
 *   E2E_TEST_USER_PASSWORD    - Password for primary test user (default: TestPassword123!)
 *   E2E_TEST_FRIEND_PASSWORD  - Password for friend test user  (default: TestPassword123!)
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const PRIMARY_EMAIL = 'e2e-test@personalai.app';
const PRIMARY_DISPLAY_NAME = 'E2E Test User';
const FRIEND_EMAIL = 'e2e-friend@personalai.app';
const FRIEND_DISPLAY_NAME = 'E2E Friend';

const PRIMARY_PASSWORD = process.env.E2E_TEST_USER_PASSWORD || 'TestPassword123!';
const FRIEND_PASSWORD = process.env.E2E_TEST_FRIEND_PASSWORD || 'TestPassword123!';

// ---------------------------------------------------------------------------
// Terminal colors & logging helpers
// ---------------------------------------------------------------------------

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(msg: string, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}
function logSuccess(msg: string) { log(`  ✓ ${msg}`, colors.green); }
function logError(msg: string) { log(`  ✗ ${msg}`, colors.red); }
function logInfo(msg: string) { log(`  ℹ ${msg}`, colors.cyan); }
function logWarn(msg: string) { log(`  ⚠ ${msg}`, colors.yellow); }
function logPhase(n: number, title: string) {
  log(`\n${'═'.repeat(60)}`, colors.bright);
  log(`  Phase ${n}: ${title}`, colors.bright);
  log(`${'═'.repeat(60)}`, colors.bright);
}

// ---------------------------------------------------------------------------
// Firebase initialization
// ---------------------------------------------------------------------------

function initFirebase(): admin.app.App {
  if (admin.apps.length > 0) return admin.app();

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!serviceAccountKey) {
    logError('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
    process.exit(1);
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error) {
    logError(`Error parsing FIREBASE_SERVICE_ACCOUNT_KEY: ${error}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Helper: Create or update a Firebase Auth user
// ---------------------------------------------------------------------------

async function ensureAuthUser(
  email: string,
  displayName: string,
  password: string,
): Promise<string> {
  const auth = admin.auth();

  try {
    // Try to create the user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    });
    logSuccess(`Created auth user: ${email} (uid: ${userRecord.uid})`);
    return userRecord.uid;
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      // User exists - fetch and update
      const existingUser = await auth.getUserByEmail(email);
      await auth.updateUser(existingUser.uid, {
        password,
        displayName,
        emailVerified: true,
      });
      logInfo(`Updated existing auth user: ${email} (uid: ${existingUser.uid})`);
      return existingUser.uid;
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function daysAgo(days: number): admin.firestore.Timestamp {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return admin.firestore.Timestamp.fromDate(date);
}

function daysFromNow(days: number): admin.firestore.Timestamp {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return admin.firestore.Timestamp.fromDate(date);
}

const now = () => admin.firestore.Timestamp.now();

// ---------------------------------------------------------------------------
// Seed functions
// ---------------------------------------------------------------------------

function seedUserProfile(
  batch: admin.firestore.WriteBatch,
  db: admin.firestore.Firestore,
  uid: string,
  email: string,
  displayName: string,
): void {
  const userRef = db.collection('users').doc(uid);
  batch.set(userRef, {
    displayName,
    email,
    photoURL: null,
    createdAt: now(),
    preferences: {
      theme: 'system',
      language: 'en',
      notifications: true,
    },
    subscriptionTier: 'premium',
  }, { merge: true });
  logSuccess(`Queued user profile: ${displayName} (${email})`);
}

function seedDiaryEntries(
  batch: admin.firestore.WriteBatch,
  db: admin.firestore.Firestore,
  uid: string,
): void {
  const entries = [
    {
      id: 'e2e-diary-1',
      title: 'Morning Reflection',
      content: 'Starting the day with a clear mind and a fresh cup of coffee. I want to focus on being more present today and making progress on my personal goals. The morning sunlight through the window always sets the right tone.',
      tags: ['morning', 'reflection'],
      type: 'diary',
      createdAt: daysAgo(2),
    },
    {
      id: 'e2e-diary-2',
      title: 'Badminton Session',
      content: 'Had an amazing badminton session at the club today. Played three sets of doubles and my backhand smashes are really improving. The footwork drills from last week are paying off. Need to work on my net play next time.',
      tags: ['badminton', 'exercise'],
      type: 'diary',
      createdAt: daysAgo(1),
    },
    {
      id: 'e2e-diary-3',
      title: 'Quick thought',
      content: 'Need to remember to pick up groceries on the way home tomorrow.',
      tags: [],
      type: 'thought',
      createdAt: daysAgo(0),
    },
  ];

  entries.forEach((entry) => {
    const ref = db.collection('textNotes').doc(entry.id);
    batch.set(ref, {
      userId: uid,
      title: entry.title,
      content: entry.content,
      tags: entry.tags,
      type: entry.type,
      createdAt: entry.createdAt,
      updatedAt: entry.createdAt,
    }, { merge: true });
  });

  logSuccess(`Queued ${entries.length} diary entries`);
}

function seedLifeFeedPosts(
  batch: admin.firestore.WriteBatch,
  db: admin.firestore.Firestore,
  uid: string,
): void {
  const posts = [
    {
      id: 'e2e-lifefeed-1',
      type: 'daily_summary',
      title: 'Your Day at a Glance',
      content: 'You had a productive day with 8,500 steps and a visit to the badminton club. You also spent time at the office working on your latest project. A well-balanced day overall!',
      createdAt: daysAgo(0),
    },
    {
      id: 'e2e-lifefeed-2',
      type: 'health_milestone',
      title: '10,000 Steps Achievement',
      content: 'Congratulations! You hit 12,000 steps yesterday, surpassing your 10,000-step goal. Keep up the great momentum — consistency is the key to long-term health.',
      createdAt: daysAgo(1),
    },
    {
      id: 'e2e-lifefeed-3',
      type: 'weekly_insights',
      title: 'Weekly Reflection',
      content: 'This week you averaged 8,833 steps per day, visited the badminton club twice, and wrote three diary entries. Your activity level is trending upward compared to last week.',
      createdAt: daysAgo(2),
    },
    {
      id: 'e2e-lifefeed-4',
      type: 'location_highlight',
      title: 'Exploring New Places',
      content: 'You visited 3 distinct locations this week. Your most frequent stop was the office with 30 visits, followed by the badminton club. Consider exploring a new neighborhood this weekend!',
      createdAt: daysAgo(3),
    },
    {
      id: 'e2e-lifefeed-5',
      type: 'mood_check',
      title: 'How Are You Feeling?',
      content: 'Based on your recent activity and journaling, it looks like you have been in a positive and active mood. Your morning reflections and exercise routine suggest a good balance between work and personal time.',
      createdAt: daysAgo(4),
    },
  ];

  posts.forEach((post) => {
    const ref = db.collection('lifeFeedPosts').doc(post.id);
    batch.set(ref, {
      userId: uid,
      type: post.type,
      title: post.title,
      content: post.content,
      status: 'active',
      dismissed: false,
      createdAt: post.createdAt,
    }, { merge: true });
  });

  logSuccess(`Queued ${posts.length} life feed posts`);
}

function seedLocations(
  batch: admin.firestore.WriteBatch,
  db: admin.firestore.Firestore,
  uid: string,
): void {
  const locations = [
    {
      id: 'e2e-location-1',
      name: 'Home',
      latitude: 37.7749,
      longitude: -122.4194,
      activityTag: 'home',
      visitCount: 50,
    },
    {
      id: 'e2e-location-2',
      name: 'SF Badminton Club',
      latitude: 37.7849,
      longitude: -122.4094,
      activityTag: 'badminton',
      visitCount: 15,
    },
    {
      id: 'e2e-location-3',
      name: 'Office',
      latitude: 37.7949,
      longitude: -122.3994,
      activityTag: 'work',
      visitCount: 30,
    },
  ];

  locations.forEach((loc) => {
    const ref = db.collection('locationData').doc(loc.id);
    batch.set(ref, {
      userId: uid,
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      activityTag: loc.activityTag,
      visitCount: loc.visitCount,
      createdAt: daysAgo(0),
      updatedAt: daysAgo(0),
    }, { merge: true });
  });

  logSuccess(`Queued ${locations.length} location entries`);
}

function seedHealthData(
  batch: admin.firestore.WriteBatch,
  db: admin.firestore.Firestore,
  uid: string,
): void {
  const healthEntries = [
    {
      id: 'e2e-health-1',
      steps: 8500,
      date: daysAgo(0),
    },
    {
      id: 'e2e-health-2',
      steps: 12000,
      date: daysAgo(1),
    },
    {
      id: 'e2e-health-3',
      steps: 6000,
      date: daysAgo(2),
    },
  ];

  healthEntries.forEach((entry) => {
    const ref = db.collection('healthData').doc(entry.id);
    batch.set(ref, {
      userId: uid,
      type: 'steps',
      steps: entry.steps,
      date: entry.date,
      source: 'healthkit',
      createdAt: entry.date,
    }, { merge: true });
  });

  logSuccess(`Queued ${healthEntries.length} health data entries`);
}

function seedFriendship(
  batch: admin.firestore.WriteBatch,
  db: admin.firestore.Firestore,
  primaryUid: string,
  friendUid: string,
): void {
  // Primary user's friend document
  const primaryFriendRef = db
    .collection('users')
    .doc(primaryUid)
    .collection('friends')
    .doc(friendUid);
  batch.set(primaryFriendRef, {
    friendUid,
    displayName: FRIEND_DISPLAY_NAME,
    email: FRIEND_EMAIL,
    status: 'accepted',
    privacyTier: 'close',
    createdAt: now(),
  }, { merge: true });

  // Friend user's friend document (bidirectional)
  const friendFriendRef = db
    .collection('users')
    .doc(friendUid)
    .collection('friends')
    .doc(primaryUid);
  batch.set(friendFriendRef, {
    friendUid: primaryUid,
    displayName: PRIMARY_DISPLAY_NAME,
    email: PRIMARY_EMAIL,
    status: 'accepted',
    privacyTier: 'close',
    createdAt: now(),
  }, { merge: true });

  logSuccess('Queued bidirectional friendship');
}

function seedCircle(
  batch: admin.firestore.WriteBatch,
  db: admin.firestore.Firestore,
  primaryUid: string,
  friendUid: string,
): void {
  const ref = db.collection('circles').doc('e2e-circle-1');
  batch.set(ref, {
    name: 'Fitness Buddies',
    description: 'A circle for fitness enthusiasts',
    members: [primaryUid, friendUid],
    createdBy: primaryUid,
    createdAt: now(),
  }, { merge: true });

  logSuccess('Queued circle: Fitness Buddies');
}

function seedChallenge(
  batch: admin.firestore.WriteBatch,
  db: admin.firestore.Firestore,
  primaryUid: string,
  friendUid: string,
): void {
  const ref = db.collection('challenges').doc('e2e-challenge-1');
  batch.set(ref, {
    title: '10K Steps Daily',
    description: 'Walk 10,000 steps every day for a week',
    type: 'steps',
    target: 10000,
    duration: 7,
    participants: [primaryUid, friendUid],
    status: 'active',
    createdBy: primaryUid,
    createdAt: now(),
    endDate: daysFromNow(7),
  }, { merge: true });

  logSuccess('Queued challenge: 10K Steps Daily');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  log(`\n${colors.bright}╔════════════════════════════════════════════╗${colors.reset}`);
  log(`${colors.bright}║  PersonalAI E2E Test Data Seed Script      ║${colors.reset}`);
  log(`${colors.bright}╚════════════════════════════════════════════╝${colors.reset}`);
  log('');

  // Phase 0: Initialize Firebase
  logPhase(0, 'Initialize Firebase');
  initFirebase();
  const db = admin.firestore();
  logSuccess('Firebase initialized');

  // Phase 1: Create or update auth users
  logPhase(1, 'Create / update test users');

  const primaryUid = await ensureAuthUser(PRIMARY_EMAIL, PRIMARY_DISPLAY_NAME, PRIMARY_PASSWORD);
  const friendUid = await ensureAuthUser(FRIEND_EMAIL, FRIEND_DISPLAY_NAME, FRIEND_PASSWORD);

  log('');
  logInfo(`Primary UID: ${primaryUid}`);
  logInfo(`Friend UID:  ${friendUid}`);

  // Phase 2: Seed all Firestore data via batch writes
  logPhase(2, 'Seed Firestore data');

  const batch = db.batch();

  // User profiles
  seedUserProfile(batch, db, primaryUid, PRIMARY_EMAIL, PRIMARY_DISPLAY_NAME);
  seedUserProfile(batch, db, friendUid, FRIEND_EMAIL, FRIEND_DISPLAY_NAME);

  // Primary user data
  seedDiaryEntries(batch, db, primaryUid);
  seedLifeFeedPosts(batch, db, primaryUid);
  seedLocations(batch, db, primaryUid);
  seedHealthData(batch, db, primaryUid);

  // Social data
  seedFriendship(batch, db, primaryUid, friendUid);
  seedCircle(batch, db, primaryUid, friendUid);
  seedChallenge(batch, db, primaryUid, friendUid);

  // Phase 3: Commit batch
  logPhase(3, 'Commit batch writes');
  logInfo('Writing all documents to Firestore...');

  await batch.commit();
  logSuccess('All documents written successfully');

  // Phase 4: Summary
  logPhase(4, 'Summary');
  log('');
  log(`  ${'─'.repeat(50)}`, colors.dim);
  log(`  ${colors.bright}Test Account Credentials${colors.reset}`);
  log(`  ${'─'.repeat(50)}`, colors.dim);
  log(`  Primary Email:    ${colors.cyan}${PRIMARY_EMAIL}${colors.reset}`);
  log(`  Primary Password: ${colors.cyan}${PRIMARY_PASSWORD}${colors.reset}`);
  log(`  Primary UID:      ${colors.cyan}${primaryUid}${colors.reset}`);
  log(`  Primary Name:     ${colors.cyan}${PRIMARY_DISPLAY_NAME}${colors.reset}`);
  log(`  Tier:             ${colors.green}Premium${colors.reset}`);
  log('');
  log(`  Friend Email:     ${colors.cyan}${FRIEND_EMAIL}${colors.reset}`);
  log(`  Friend Password:  ${colors.cyan}${FRIEND_PASSWORD}${colors.reset}`);
  log(`  Friend UID:       ${colors.cyan}${friendUid}${colors.reset}`);
  log(`  Friend Name:      ${colors.cyan}${FRIEND_DISPLAY_NAME}${colors.reset}`);
  log(`  ${'─'.repeat(50)}`, colors.dim);
  log('');
  log(`  ${colors.bright}Data Seeded${colors.reset}`);
  log(`  ${'─'.repeat(50)}`, colors.dim);

  const counts: Record<string, number> = {
    'User Profiles': 2,
    'Diary Entries': 3,
    'Life Feed Posts': 5,
    'Locations': 3,
    'Health Data': 3,
    'Friendships': 1,
    'Circles': 1,
    'Challenges': 1,
  };

  Object.entries(counts).forEach(([label, count]) => {
    log(`  ${label.padEnd(20)} ${colors.green}${count}${colors.reset}`);
  });

  log(`  ${'─'.repeat(50)}`, colors.dim);
  log('');
  logSuccess('E2E test data seeding complete!');
  log('');

  process.exit(0);
}

main().catch((error) => {
  logError(`Fatal error: ${error}`);
  console.error(error);
  process.exit(1);
});
