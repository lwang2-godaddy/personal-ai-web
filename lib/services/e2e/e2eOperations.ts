/**
 * E2E Test Data Operations
 *
 * Core operations for managing E2E test data, callable from both
 * CLI scripts and API routes. Accepts Firebase Admin instances as
 * parameters to avoid module bundling issues.
 */

import type { firestore, auth } from 'firebase-admin';
import type { ProgressCallback } from './types';
import type { E2EStatus } from './types';
import {
  E2E_PRIMARY_EMAIL,
  E2E_PRIMARY_PASSWORD,
  E2E_PRIMARY_DISPLAY_NAME,
  E2E_FRIEND_EMAIL,
  E2E_FRIEND_PASSWORD,
  E2E_FRIEND_DISPLAY_NAME,
  E2E_DOC_IDS,
  E2E_COLLECTIONS,
  getDiaryEntries,
  getLifeFeedPosts,
  getLocations,
  getHealthData,
  getCircle,
  getChallenge,
} from './e2eData';

// ---------------------------------------------------------------------------
// Helper: Create or update a Firebase Auth user
// ---------------------------------------------------------------------------

async function ensureAuthUser(
  adminAuth: auth.Auth,
  email: string,
  displayName: string,
  password: string,
): Promise<string> {
  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    });
    return userRecord.uid;
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      const existingUser = await adminAuth.getUserByEmail(email);
      await adminAuth.updateUser(existingUser.uid, {
        password,
        displayName,
        emailVerified: true,
      });
      return existingUser.uid;
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// getE2EStatus
// ---------------------------------------------------------------------------

export async function getE2EStatus(
  db: firestore.Firestore,
  adminAuth: auth.Auth,
): Promise<E2EStatus> {
  const result: E2EStatus = {
    primaryUser: { exists: false },
    friendUser: { exists: false },
    dataCounts: {},
    totalDocuments: 0,
  };

  // Check primary user
  try {
    const primaryUser = await adminAuth.getUserByEmail(E2E_PRIMARY_EMAIL);
    result.primaryUser = {
      exists: true,
      uid: primaryUser.uid,
      email: primaryUser.email,
      displayName: primaryUser.displayName,
    };
  } catch {
    // User doesn't exist
  }

  // Check friend user
  try {
    const friendUser = await adminAuth.getUserByEmail(E2E_FRIEND_EMAIL);
    result.friendUser = {
      exists: true,
      uid: friendUser.uid,
      email: friendUser.email,
      displayName: friendUser.displayName,
    };
  } catch {
    // User doesn't exist
  }

  // Count documents by collection (check deterministic IDs)
  let total = 0;
  for (const [collection, docIds] of Object.entries(E2E_COLLECTIONS)) {
    let count = 0;
    for (const docId of docIds) {
      const snap = await db.collection(collection).doc(docId).get();
      if (snap.exists) count++;
    }
    result.dataCounts[collection] = count;
    total += count;
  }

  // Check user profile docs
  if (result.primaryUser.uid) {
    const userSnap = await db.collection('users').doc(result.primaryUser.uid).get();
    if (userSnap.exists) {
      result.dataCounts['users'] = (result.dataCounts['users'] || 0) + 1;
      total++;
    }
  }
  if (result.friendUser.uid) {
    const userSnap = await db.collection('users').doc(result.friendUser.uid).get();
    if (userSnap.exists) {
      result.dataCounts['users'] = (result.dataCounts['users'] || 0) + 1;
      total++;
    }
  }

  result.totalDocuments = total;
  return result;
}

// ---------------------------------------------------------------------------
// seedE2EData
// ---------------------------------------------------------------------------

export async function seedE2EData(
  db: firestore.Firestore,
  onProgress: ProgressCallback,
  adminAuth: auth.Auth,
): Promise<void> {
  // Phase 1: Create auth users
  onProgress({ phase: 1, phaseName: 'Auth Users', level: 'info', message: 'Creating/updating E2E test users...' });

  const primaryUid = await ensureAuthUser(adminAuth, E2E_PRIMARY_EMAIL, E2E_PRIMARY_DISPLAY_NAME, E2E_PRIMARY_PASSWORD);
  onProgress({ phase: 1, phaseName: 'Auth Users', level: 'success', message: `Primary user: ${E2E_PRIMARY_EMAIL} (uid: ${primaryUid})` });

  const friendUid = await ensureAuthUser(adminAuth, E2E_FRIEND_EMAIL, E2E_FRIEND_DISPLAY_NAME, E2E_FRIEND_PASSWORD);
  onProgress({ phase: 1, phaseName: 'Auth Users', level: 'success', message: `Friend user: ${E2E_FRIEND_EMAIL} (uid: ${friendUid})` });

  // Phase 2: Seed Firestore data via batch writes
  onProgress({ phase: 2, phaseName: 'Firestore Data', level: 'info', message: 'Writing Firestore documents...' });

  const batch = db.batch();

  // User profiles
  const primaryRef = db.collection('users').doc(primaryUid);
  batch.set(primaryRef, {
    displayName: E2E_PRIMARY_DISPLAY_NAME,
    email: E2E_PRIMARY_EMAIL,
    photoURL: null,
    createdAt: new Date().toISOString(),
    preferences: { theme: 'system', language: 'en', notifications: true },
    subscriptionTier: 'premium',
  }, { merge: true });

  const friendRef = db.collection('users').doc(friendUid);
  batch.set(friendRef, {
    displayName: E2E_FRIEND_DISPLAY_NAME,
    email: E2E_FRIEND_EMAIL,
    photoURL: null,
    createdAt: new Date().toISOString(),
    preferences: { theme: 'system', language: 'en', notifications: true },
    subscriptionTier: 'premium',
  }, { merge: true });
  onProgress({ phase: 2, phaseName: 'Firestore Data', level: 'info', message: 'Queued 2 user profiles' });

  // Diary entries
  const diaryEntries = getDiaryEntries(primaryUid);
  diaryEntries.forEach(entry => {
    const { id, ...data } = entry;
    batch.set(db.collection('textNotes').doc(id), data, { merge: true });
  });
  onProgress({ phase: 2, phaseName: 'Firestore Data', level: 'info', message: `Queued ${diaryEntries.length} diary entries` });

  // Life feed posts
  const lifeFeedPosts = getLifeFeedPosts(primaryUid);
  lifeFeedPosts.forEach(post => {
    const { id, ...data } = post;
    batch.set(db.collection('lifeFeedPosts').doc(id), data, { merge: true });
  });
  onProgress({ phase: 2, phaseName: 'Firestore Data', level: 'info', message: `Queued ${lifeFeedPosts.length} life feed posts` });

  // Locations
  const locations = getLocations(primaryUid);
  locations.forEach(loc => {
    const { id, ...data } = loc;
    batch.set(db.collection('locationData').doc(id), data, { merge: true });
  });
  onProgress({ phase: 2, phaseName: 'Firestore Data', level: 'info', message: `Queued ${locations.length} locations` });

  // Health data
  const healthData = getHealthData(primaryUid);
  healthData.forEach(entry => {
    const { id, ...data } = entry;
    batch.set(db.collection('healthData').doc(id), data, { merge: true });
  });
  onProgress({ phase: 2, phaseName: 'Firestore Data', level: 'info', message: `Queued ${healthData.length} health records` });

  // Friendship (bidirectional)
  const primaryFriendRef = db.collection('users').doc(primaryUid).collection('friends').doc(friendUid);
  batch.set(primaryFriendRef, {
    friendUid,
    displayName: E2E_FRIEND_DISPLAY_NAME,
    email: E2E_FRIEND_EMAIL,
    status: 'accepted',
    privacyTier: 'close',
    createdAt: new Date().toISOString(),
  }, { merge: true });

  const friendFriendRef = db.collection('users').doc(friendUid).collection('friends').doc(primaryUid);
  batch.set(friendFriendRef, {
    friendUid: primaryUid,
    displayName: E2E_PRIMARY_DISPLAY_NAME,
    email: E2E_PRIMARY_EMAIL,
    status: 'accepted',
    privacyTier: 'close',
    createdAt: new Date().toISOString(),
  }, { merge: true });
  onProgress({ phase: 2, phaseName: 'Firestore Data', level: 'info', message: 'Queued bidirectional friendship' });

  // Circle
  const circle = getCircle(primaryUid, friendUid);
  const { id: circleId, ...circleData } = circle;
  batch.set(db.collection('circles').doc(circleId), circleData, { merge: true });
  onProgress({ phase: 2, phaseName: 'Firestore Data', level: 'info', message: 'Queued circle: Fitness Buddies' });

  // Challenge
  const challenge = getChallenge(primaryUid, friendUid);
  const { id: challengeId, ...challengeData } = challenge;
  batch.set(db.collection('challenges').doc(challengeId), challengeData, { merge: true });
  onProgress({ phase: 2, phaseName: 'Firestore Data', level: 'info', message: 'Queued challenge: 10K Steps Daily' });

  // Phase 3: Commit batch
  onProgress({ phase: 3, phaseName: 'Commit', level: 'info', message: 'Committing batch writes...' });
  await batch.commit();
  onProgress({ phase: 3, phaseName: 'Commit', level: 'success', message: 'All documents written successfully' });

  // Summary
  const totalDocs = 2 + diaryEntries.length + lifeFeedPosts.length + locations.length + healthData.length + 2 + 1 + 1;
  onProgress({
    phase: 4,
    phaseName: 'Complete',
    level: 'success',
    message: `Seed complete! ${totalDocs} documents written. Users: ${E2E_PRIMARY_EMAIL}, ${E2E_FRIEND_EMAIL}`,
  });
}

// ---------------------------------------------------------------------------
// cleanupE2EData
// ---------------------------------------------------------------------------

export async function cleanupE2EData(
  db: firestore.Firestore,
  onProgress: ProgressCallback,
  adminAuth: auth.Auth,
): Promise<void> {
  onProgress({ phase: 0, phaseName: 'Cleanup', level: 'info', message: 'Starting E2E data cleanup...' });

  // Delete documents by deterministic IDs
  let deleted = 0;
  for (const [collection, docIds] of Object.entries(E2E_COLLECTIONS)) {
    for (const docId of docIds) {
      try {
        await db.collection(collection).doc(docId).delete();
        deleted++;
      } catch {
        // Document may not exist
      }
    }
    onProgress({ phase: 0, phaseName: 'Cleanup', level: 'info', message: `Cleaned ${collection} (${docIds.length} docs)` });
  }

  // Delete user profiles and friendship subcollections
  let primaryUid: string | undefined;
  let friendUid: string | undefined;

  try {
    const primaryUser = await adminAuth.getUserByEmail(E2E_PRIMARY_EMAIL);
    primaryUid = primaryUser.uid;
  } catch {
    // User doesn't exist
  }

  try {
    const friendUser = await adminAuth.getUserByEmail(E2E_FRIEND_EMAIL);
    friendUid = friendUser.uid;
  } catch {
    // User doesn't exist
  }

  // Delete friendship subcollections
  if (primaryUid && friendUid) {
    try {
      await db.collection('users').doc(primaryUid).collection('friends').doc(friendUid).delete();
      await db.collection('users').doc(friendUid).collection('friends').doc(primaryUid).delete();
      deleted += 2;
      onProgress({ phase: 0, phaseName: 'Cleanup', level: 'info', message: 'Deleted friendship documents' });
    } catch {
      // May not exist
    }
  }

  // Delete user profile docs
  if (primaryUid) {
    try {
      await db.collection('users').doc(primaryUid).delete();
      deleted++;
    } catch { /* ignore */ }
  }
  if (friendUid) {
    try {
      await db.collection('users').doc(friendUid).delete();
      deleted++;
    } catch { /* ignore */ }
  }
  onProgress({ phase: 0, phaseName: 'Cleanup', level: 'info', message: 'Deleted user profile documents' });

  // Delete auth users
  if (primaryUid) {
    try {
      await adminAuth.deleteUser(primaryUid);
      onProgress({ phase: 0, phaseName: 'Cleanup', level: 'info', message: `Deleted auth user: ${E2E_PRIMARY_EMAIL}` });
    } catch {
      // May not exist
    }
  }
  if (friendUid) {
    try {
      await adminAuth.deleteUser(friendUid);
      onProgress({ phase: 0, phaseName: 'Cleanup', level: 'info', message: `Deleted auth user: ${E2E_FRIEND_EMAIL}` });
    } catch {
      // May not exist
    }
  }

  onProgress({
    phase: 1,
    phaseName: 'Complete',
    level: 'success',
    message: `Cleanup complete! Deleted ${deleted} documents and auth users.`,
  });
}
