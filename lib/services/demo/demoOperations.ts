/**
 * Demo Data Operations
 *
 * Core operations extracted from seed-demo-data.ts, refactored to accept
 * a ProgressCallback so the CLI can log to console while the API can
 * stream to SSE.
 *
 * Functions that need Firebase Auth or Storage accept optional instances
 * as parameters. When called from Next.js API routes, pass getAdminAuth()
 * to avoid module-instance issues with firebase-admin in bundled contexts.
 * When called from CLI scripts, the default admin.auth() fallback works.
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import type { ProgressCallback, DemoStatus } from './types';
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  DEMO_DISPLAY_NAME,
  USER_COLLECTIONS,
  daysAgo,
  getDemoHealthData,
  getDemoLocationData,
  getDemoVoiceNotes,
  getDemoTextNotes,
  PHOTO_DESCRIPTIONS,
} from './demoData';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Get auth instance — use provided instance or fall back to default app */
function getAuth(authInstance?: admin.auth.Auth): admin.auth.Auth {
  return authInstance ?? admin.auth();
}

/** Delete docs in chunks to stay within Firestore's 500-ops-per-batch limit */
async function deleteInBatches(
  db: admin.firestore.Firestore,
  docs: admin.firestore.QueryDocumentSnapshot[],
): Promise<void> {
  const BATCH_LIMIT = 500;
  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const chunk = docs.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();
    chunk.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function writeBatch(
  db: admin.firestore.Firestore,
  collection: string,
  docs: Record<string, any>[],
  delayMs = 2500,
): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < docs.length; i++) {
    const docRef = db.collection(collection).doc();
    await docRef.set(docs[i]);
    ids.push(docRef.id);
    if (i < docs.length - 1) {
      await sleep(delayMs);
    }
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Phase 0: Cleanup
// ---------------------------------------------------------------------------

export async function cleanupDemoData(
  db: admin.firestore.Firestore,
  onProgress: ProgressCallback,
  authInstance?: admin.auth.Auth,
): Promise<{ deletedUid: string | null }> {
  const auth = getAuth(authInstance);
  onProgress({ phase: 0, phaseName: 'Cleanup', level: 'info', message: 'Starting cleanup of existing demo data...' });

  let uid: string | null = null;
  try {
    const user = await auth.getUserByEmail(DEMO_EMAIL);
    uid = user.uid;
    onProgress({ phase: 0, phaseName: 'Cleanup', level: 'info', message: `Found existing demo user: ${uid}` });
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      onProgress({ phase: 0, phaseName: 'Cleanup', level: 'info', message: 'No existing demo user found — nothing to clean up.' });
      return { deletedUid: null };
    }
    throw err;
  }

  // Delete documents from each collection (chunked to respect 500-op batch limit)
  for (const col of USER_COLLECTIONS) {
    const snapshot = await db.collection(col).where('userId', '==', uid).get();
    if (snapshot.empty) {
      onProgress({ phase: 0, phaseName: 'Cleanup', level: 'info', message: `${col}: 0 docs` });
      continue;
    }
    await deleteInBatches(db, snapshot.docs);
    onProgress({ phase: 0, phaseName: 'Cleanup', level: 'success', message: `${col}: deleted ${snapshot.size} docs` });
  }

  // Delete user document
  try {
    await db.collection('users').doc(uid).delete();
    onProgress({ phase: 0, phaseName: 'Cleanup', level: 'success', message: 'Deleted user document' });
  } catch { /* may not exist */ }

  // Delete Storage files
  try {
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      || process.env.FIREBASE_STORAGE_BUCKET;
    if (storageBucket) {
      const bucket = admin.storage().bucket(storageBucket);
      const [files] = await bucket.getFiles({ prefix: `users/${uid}/` });
      if (files.length > 0) {
        await Promise.all(files.map(f => f.delete()));
        onProgress({ phase: 0, phaseName: 'Cleanup', level: 'success', message: `Deleted ${files.length} storage files` });
      } else {
        onProgress({ phase: 0, phaseName: 'Cleanup', level: 'info', message: 'No storage files found' });
      }
    } else {
      onProgress({ phase: 0, phaseName: 'Cleanup', level: 'info', message: 'Storage bucket not configured — skipping file cleanup' });
    }
  } catch (err) {
    onProgress({ phase: 0, phaseName: 'Cleanup', level: 'warning', message: `Storage cleanup skipped: ${err}` });
  }

  // Delete Firebase Auth user
  await auth.deleteUser(uid);
  onProgress({ phase: 0, phaseName: 'Cleanup', level: 'success', message: 'Deleted Firebase Auth user' });

  return { deletedUid: uid };
}

// ---------------------------------------------------------------------------
// Phase 1: Create User
// ---------------------------------------------------------------------------

export async function createDemoUser(
  db: admin.firestore.Firestore,
  onProgress: ProgressCallback,
  authInstance?: admin.auth.Auth,
): Promise<string> {
  const auth = getAuth(authInstance);
  onProgress({ phase: 1, phaseName: 'Create User', level: 'info', message: 'Creating demo user account...' });

  const user = await auth.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    displayName: DEMO_DISPLAY_NAME,
    emailVerified: true,
  });
  const uid = user.uid;
  onProgress({ phase: 1, phaseName: 'Create User', level: 'success', message: `Created auth user: ${uid}` });

  // Wait for onUserCreated Cloud Function
  onProgress({ phase: 1, phaseName: 'Create User', level: 'info', message: 'Waiting for onUserCreated Cloud Function...' });
  const maxWait = 20_000;
  const start = Date.now();
  let userDocExists = false;

  while (Date.now() - start < maxWait) {
    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists) {
      userDocExists = true;
      break;
    }
    await sleep(2000);
  }

  if (!userDocExists) {
    onProgress({ phase: 1, phaseName: 'Create User', level: 'warning', message: 'User document not created by Cloud Function — creating manually' });
    await db.collection('users').doc(uid).set({
      uid,
      email: DEMO_EMAIL,
      displayName: DEMO_DISPLAY_NAME,
      photoURL: '',
      createdAt: new Date().toISOString(),
      lastSync: null,
      lastActivityAt: new Date().toISOString(),
      preferences: {
        dataCollection: { health: true, location: true, voice: true },
        syncFrequency: 'realtime',
        notifications: { activityTagging: true, syncComplete: true },
        privacy: { encryptLocal: false, includeExactLocations: true, shareActivityWithFriends: true },
      },
    });
  }
  onProgress({ phase: 1, phaseName: 'Create User', level: 'success', message: 'User document exists' });

  // Upgrade to premium
  await db.collection('users').doc(uid).update({
    locale: 'en',
    timezone: 'America/Los_Angeles',
    'subscription.tier': 'premium',
    'subscription.status': 'active',
    'subscription.startDate': new Date().toISOString(),
    'subscription.expiresAt': '2030-12-31T23:59:59.000Z',
    'subscription.autoRenew': true,
    'subscription.manualOverride': true,
  });
  onProgress({ phase: 1, phaseName: 'Create User', level: 'success', message: 'Upgraded to premium subscription' });

  return uid;
}

// ---------------------------------------------------------------------------
// Phase 2: Seed Health Data
// ---------------------------------------------------------------------------

export async function seedHealthData(
  db: admin.firestore.Firestore,
  uid: string,
  onProgress: ProgressCallback,
): Promise<number> {
  const docs = getDemoHealthData(uid);
  onProgress({ phase: 2, phaseName: 'Health Data', level: 'info', message: `Writing ${docs.length} health records...` });

  let written = 0;
  const batchSize = 8;
  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    await writeBatch(db, 'healthData', chunk, 500);
    written += chunk.length;
    onProgress({
      phase: 2, phaseName: 'Health Data', level: 'info',
      message: `${written}/${docs.length} written`,
      progress: { current: written, total: docs.length },
    });
    if (i + batchSize < docs.length) {
      await sleep(3000);
    }
  }

  onProgress({ phase: 2, phaseName: 'Health Data', level: 'success', message: `Seeded ${docs.length} health records` });
  return docs.length;
}

// ---------------------------------------------------------------------------
// Phase 3: Seed Location Data
// ---------------------------------------------------------------------------

export async function seedLocationData(
  db: admin.firestore.Firestore,
  uid: string,
  onProgress: ProgressCallback,
): Promise<number> {
  const docs = getDemoLocationData(uid);
  onProgress({ phase: 3, phaseName: 'Location Data', level: 'info', message: `Writing ${docs.length} location records...` });

  let written = 0;
  for (let i = 0; i < docs.length; i += 5) {
    const chunk = docs.slice(i, i + 5);
    await writeBatch(db, 'locationData', chunk, 500);
    written += chunk.length;
    onProgress({
      phase: 3, phaseName: 'Location Data', level: 'info',
      message: `${written}/${docs.length} written`,
      progress: { current: written, total: docs.length },
    });
    if (i + 5 < docs.length) await sleep(3000);
  }

  onProgress({ phase: 3, phaseName: 'Location Data', level: 'success', message: `Seeded ${docs.length} location records` });
  return docs.length;
}

// ---------------------------------------------------------------------------
// Phase 4: Seed Voice Notes
// ---------------------------------------------------------------------------

export async function seedVoiceNotes(
  db: admin.firestore.Firestore,
  uid: string,
  onProgress: ProgressCallback,
): Promise<number> {
  const docs = getDemoVoiceNotes(uid);
  onProgress({ phase: 4, phaseName: 'Voice Notes', level: 'info', message: `Writing ${docs.length} voice notes...` });

  await writeBatch(db, 'voiceNotes', docs, 3000);

  onProgress({ phase: 4, phaseName: 'Voice Notes', level: 'success', message: `Seeded ${docs.length} voice notes` });
  return docs.length;
}

// ---------------------------------------------------------------------------
// Phase 5: Seed Text Notes
// ---------------------------------------------------------------------------

export async function seedTextNotes(
  db: admin.firestore.Firestore,
  uid: string,
  onProgress: ProgressCallback,
): Promise<number> {
  const docs = getDemoTextNotes(uid);
  onProgress({ phase: 5, phaseName: 'Text Notes', level: 'info', message: `Writing ${docs.length} text notes...` });

  await writeBatch(db, 'textNotes', docs, 3000);

  onProgress({ phase: 5, phaseName: 'Text Notes', level: 'success', message: `Seeded ${docs.length} text notes` });
  return docs.length;
}

// ---------------------------------------------------------------------------
// Phase 6: Seed Photos
// ---------------------------------------------------------------------------

export async function seedPhotos(
  db: admin.firestore.Firestore,
  uid: string,
  photosDir: string,
  onProgress: ProgressCallback,
): Promise<number> {
  if (!fs.existsSync(photosDir)) {
    onProgress({ phase: 6, phaseName: 'Photos', level: 'warning', message: `Photos directory not found: ${photosDir}` });
    return 0;
  }

  const imageFiles = fs.readdirSync(photosDir).filter(f =>
    /\.(jpg|jpeg|png|heic|webp)$/i.test(f)
  );

  if (imageFiles.length === 0) {
    onProgress({ phase: 6, phaseName: 'Photos', level: 'warning', message: 'No image files found in photos directory' });
    return 0;
  }

  onProgress({ phase: 6, phaseName: 'Photos', level: 'info', message: `Found ${imageFiles.length} images to upload` });

  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    || process.env.FIREBASE_STORAGE_BUCKET;
  const bucket = storageBucket
    ? admin.storage().bucket(storageBucket)
    : admin.storage().bucket();
  let count = 0;

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const meta = PHOTO_DESCRIPTIONS[i % PHOTO_DESCRIPTIONS.length];
    const filePath = path.join(photosDir, file);
    const storagePath = `users/${uid}/photos/${Date.now()}_${file}`;

    onProgress({ phase: 6, phaseName: 'Photos', level: 'info', message: `Uploading ${file}...` });

    const fileRef = bucket.file(storagePath);
    await fileRef.save(fs.readFileSync(filePath), {
      metadata: {
        contentType: `image/${path.extname(file).slice(1).toLowerCase().replace('jpg', 'jpeg')}`,
      },
    });

    const [signedUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '2030-01-01',
    });

    const takenAt = daysAgo(meta.day, meta.hour, 0);

    const docRef = db.collection('photoMemories').doc();
    await docRef.set({
      userId: uid,
      imageUrl: signedUrl,
      thumbnailUrl: signedUrl,
      mediumUrl: signedUrl,
      autoDescription: meta.desc,
      userDescription: '',
      latitude: 37.76 + Math.random() * 0.04,
      longitude: -122.44 + Math.random() * 0.06,
      locationId: '',
      activity: meta.activity,
      address: 'San Francisco, CA',
      takenAt: admin.firestore.Timestamp.fromDate(takenAt),
      uploadedAt: admin.firestore.Timestamp.fromDate(new Date()),
      fileSize: fs.statSync(filePath).size,
      dimensions: { width: 1080, height: 1080 },
      textEmbeddingId: '',
      visualEmbeddingId: '',
      tags: [],
      isFavorite: i === 0,
      createdAt: takenAt.toISOString(),
    });

    count++;
    onProgress({
      phase: 6, phaseName: 'Photos', level: 'success',
      message: `Uploaded ${file} → ${docRef.id}`,
      progress: { current: count, total: imageFiles.length },
    });

    if (i < imageFiles.length - 1) await sleep(3000);
  }

  onProgress({ phase: 6, phaseName: 'Photos', level: 'success', message: `Uploaded ${count} photos` });
  return count;
}

// ---------------------------------------------------------------------------
// Phase 7: Wait for Embeddings
// ---------------------------------------------------------------------------

export async function waitForEmbeddings(
  db: admin.firestore.Firestore,
  uid: string,
  onProgress: ProgressCallback,
): Promise<{ total: number; completed: number }> {
  onProgress({ phase: 7, phaseName: 'Embeddings', level: 'info', message: 'Waiting for embedding generation...' });

  const timeoutMs = 5 * 60 * 1000;
  const pollInterval = 10_000;
  const start = Date.now();
  const collectionsToCheck = ['healthData', 'locationData', 'voiceNotes', 'textNotes'];

  let totalDocs = 0;
  let withEmbedding = 0;

  while (Date.now() - start < timeoutMs) {
    totalDocs = 0;
    withEmbedding = 0;

    for (const col of collectionsToCheck) {
      const snapshot = await db.collection(col).where('userId', '==', uid).get();
      for (const doc of snapshot.docs) {
        totalDocs++;
        const data = doc.data();
        if (data.embeddingId && data.embeddingId !== '') {
          withEmbedding++;
        }
      }
    }

    const pct = totalDocs > 0 ? Math.round((withEmbedding / totalDocs) * 100) : 0;
    onProgress({
      phase: 7, phaseName: 'Embeddings', level: 'info',
      message: `Embeddings: ${withEmbedding}/${totalDocs} (${pct}%)`,
      progress: { current: withEmbedding, total: totalDocs },
    });

    if (withEmbedding >= totalDocs * 0.9) {
      onProgress({ phase: 7, phaseName: 'Embeddings', level: 'success', message: `Sufficient embeddings generated (${pct}%)` });
      return { total: totalDocs, completed: withEmbedding };
    }

    await sleep(pollInterval);
  }

  onProgress({ phase: 7, phaseName: 'Embeddings', level: 'warning', message: 'Embedding timeout reached. Some documents may still be processing.' });
  return { total: totalDocs, completed: withEmbedding };
}

// ---------------------------------------------------------------------------
// Cloud Function Caller Helper
// ---------------------------------------------------------------------------

/**
 * Calls a Firebase Cloud Function as a specific user.
 *
 * 1. Creates a custom token via Admin SDK
 * 2. Exchanges it for an ID token via Identity Toolkit REST API
 * 3. Calls the Cloud Function URL with Authorization header
 *
 * Returns the parsed response data (the `result` field for onCall functions),
 * or null if an error occurred (errors are reported via onProgress).
 */
async function callCloudFunctionAsUser(
  uid: string,
  functionName: string,
  data: Record<string, any>,
  onProgress: ProgressCallback,
  authInstance?: admin.auth.Auth,
  options?: { phase?: number; phaseName?: string },
): Promise<any | null> {
  const auth = getAuth(authInstance);
  const phase = options?.phase ?? 0;
  const phaseName = options?.phaseName ?? functionName;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    onProgress({ phase, phaseName, level: 'warning', message: 'NEXT_PUBLIC_FIREBASE_API_KEY not set — skipping' });
    return null;
  }

  // Create custom token → exchange for ID token
  onProgress({ phase, phaseName, level: 'info', message: 'Generating ID token...' });
  const customToken = await auth.createCustomToken(uid);

  const tokenResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    onProgress({ phase, phaseName, level: 'error', message: `Failed to exchange token: ${err}` });
    return null;
  }

  const tokenData = await tokenResponse.json();
  const idToken = tokenData.idToken;
  onProgress({ phase, phaseName, level: 'success', message: 'Got ID token' });

  // Call Cloud Function
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'personal-ai-app';
  const region = process.env.FIREBASE_REGION || 'us-central1';
  const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;

  onProgress({ phase, phaseName, level: 'info', message: `Calling ${functionName}...` });

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      const errText = await response.text();
      onProgress({ phase, phaseName, level: 'error', message: `Cloud Function returned ${response.status}: ${errText}` });
      return null;
    }

    const result = await response.json();
    return result.result || result;
  } catch (err) {
    onProgress({ phase, phaseName, level: 'error', message: `Failed to call ${functionName}: ${err}` });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Phase 8: Trigger Life Feed
// ---------------------------------------------------------------------------

export async function triggerLifeFeed(
  uid: string,
  onProgress: ProgressCallback,
  authInstance?: admin.auth.Auth,
): Promise<void> {
  // The Cloud Function generates max 3 posts per call and applies per-type cooldowns.
  // To get a variety of post types we call it multiple rounds. Each round picks
  // different types because previously generated types go into cooldown.
  const ROUNDS = 4;
  let totalPosts = 0;

  onProgress({ phase: 8, phaseName: 'Life Feed', level: 'info', message: `Triggering life feed generation (${ROUNDS} rounds for variety)...` });

  for (let round = 1; round <= ROUNDS; round++) {
    onProgress({ phase: 8, phaseName: 'Life Feed', level: 'info', message: `Round ${round}/${ROUNDS}...` });

    const data = await callCloudFunctionAsUser(uid, 'generateLifeFeedNow', {}, onProgress, authInstance, {
      phase: 8,
      phaseName: 'Life Feed',
    });

    if (!data) break;

    const count = data.count || 0;
    totalPosts += count;

    if (data.posts && data.posts.length > 0) {
      for (const post of data.posts) {
        onProgress({
          phase: 8, phaseName: 'Life Feed', level: 'info',
          message: `  [${post.type}] ${(post.title || post.content || '').substring(0, 60)}...`,
        });
      }
    }

    if (count === 0) {
      onProgress({ phase: 8, phaseName: 'Life Feed', level: 'info', message: `Round ${round} generated 0 posts — stopping early (all types exhausted or in cooldown)` });
      break;
    }

    // Brief pause between rounds to let cooldowns register
    if (round < ROUNDS) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  onProgress({ phase: 8, phaseName: 'Life Feed', level: 'success', message: `Life feed complete: ${totalPosts} total posts generated` });
}

// ---------------------------------------------------------------------------
// Phase 9: Trigger Keywords
// ---------------------------------------------------------------------------

export async function triggerKeywords(
  uid: string,
  onProgress: ProgressCallback,
  authInstance?: admin.auth.Auth,
): Promise<void> {
  onProgress({ phase: 9, phaseName: 'Keywords', level: 'info', message: 'Triggering keyword generation...' });

  const data = await callCloudFunctionAsUser(
    uid,
    'generateKeywordsNow',
    { periodType: 'weekly', force: true },
    onProgress,
    authInstance,
    { phase: 9, phaseName: 'Keywords' },
  );

  if (!data) return;

  if (data.success) {
    const keywords: string[] = data.keywords || [];
    onProgress({ phase: 9, phaseName: 'Keywords', level: 'success', message: data.message || `Generated ${keywords.length} keywords` });

    if (keywords.length > 0) {
      const preview = keywords.slice(0, 10).join(', ');
      onProgress({ phase: 9, phaseName: 'Keywords', level: 'info', message: `Preview: ${preview}${keywords.length > 10 ? '...' : ''}` });
    }
  } else {
    onProgress({ phase: 9, phaseName: 'Keywords', level: 'warning', message: data.message || 'Keywords generation returned unsuccessful' });
  }
}

// ---------------------------------------------------------------------------
// Phase 10: Trigger Unified Insights
// ---------------------------------------------------------------------------

export async function triggerUnifiedInsights(
  uid: string,
  onProgress: ProgressCallback,
  authInstance?: admin.auth.Auth,
): Promise<void> {
  // Like life feed, insights have per-type cooldowns and a daily cap of 10.
  // Run multiple rounds to generate a variety of insight types (fun facts, patterns, anomalies).
  const ROUNDS = 3;
  let totalPosts = 0;

  onProgress({ phase: 10, phaseName: 'Insights', level: 'info', message: `Triggering unified insights generation (${ROUNDS} rounds)...` });

  for (let round = 1; round <= ROUNDS; round++) {
    onProgress({ phase: 10, phaseName: 'Insights', level: 'info', message: `Round ${round}/${ROUNDS}...` });

    const data = await callCloudFunctionAsUser(
      uid,
      'generateUnifiedInsightsNow',
      {},
      onProgress,
      authInstance,
      { phase: 10, phaseName: 'Insights' },
    );

    if (!data) break;

    if (data.success) {
      const created = data.postsCreated || 0;
      totalPosts += created;
      onProgress({ phase: 10, phaseName: 'Insights', level: 'info', message: `Round ${round}: ${data.message || `${created} posts`}` });

      if (data.sources && data.sources.length > 0) {
        onProgress({ phase: 10, phaseName: 'Insights', level: 'info', message: `  Sources: ${data.sources.join(', ')}` });
      }
      if (data.errors && data.errors.length > 0) {
        for (const err of data.errors) {
          onProgress({ phase: 10, phaseName: 'Insights', level: 'warning', message: `  Error: ${err}` });
        }
      }

      if (created === 0) {
        onProgress({ phase: 10, phaseName: 'Insights', level: 'info', message: `Round ${round} generated 0 — stopping early` });
        break;
      }
    } else {
      onProgress({ phase: 10, phaseName: 'Insights', level: 'warning', message: data.message || data.error || 'Insights generation returned unsuccessful' });
      break;
    }

    if (round < ROUNDS) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  onProgress({ phase: 10, phaseName: 'Insights', level: 'success', message: `Insights complete: ${totalPosts} total posts generated` });
}

// ---------------------------------------------------------------------------
// Phase 11: Trigger This Day Memories
// ---------------------------------------------------------------------------

export async function triggerThisDayMemories(
  uid: string,
  onProgress: ProgressCallback,
  authInstance?: admin.auth.Auth,
): Promise<void> {
  onProgress({ phase: 11, phaseName: 'Memories', level: 'info', message: 'Triggering This Day Memories generation...' });

  const data = await callCloudFunctionAsUser(
    uid,
    'generateThisDayMemories',
    { forceRefresh: true },
    onProgress,
    authInstance,
    { phase: 11, phaseName: 'Memories' },
  );

  if (!data) return;

  const memories: any[] = data.memories || [];
  const fromCache = data.fromCache ? ' (from cache)' : '';
  onProgress({ phase: 11, phaseName: 'Memories', level: 'success', message: `Found ${memories.length} memories for ${data.month}/${data.day}${fromCache}` });

  for (const mem of memories) {
    const preview = (mem.narrative || mem.title || '').substring(0, 80);
    onProgress({
      phase: 11, phaseName: 'Memories', level: 'info',
      message: `  [${mem.yearsAgo}y ago] ${mem.emoji || ''} ${preview}${preview.length >= 80 ? '...' : ''}`,
    });
  }
}

// ---------------------------------------------------------------------------
// Get Demo Status
// ---------------------------------------------------------------------------

export async function getDemoStatus(
  db: admin.firestore.Firestore,
  authInstance?: admin.auth.Auth,
): Promise<DemoStatus> {
  const auth = getAuth(authInstance);
  let uid: string | undefined;
  let email: string | undefined;
  let displayName: string | undefined;

  try {
    const user = await auth.getUserByEmail(DEMO_EMAIL);
    uid = user.uid;
    email = user.email || undefined;
    displayName = user.displayName || undefined;
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      return {
        exists: false,
        counts: {},
        embeddingStatus: { total: 0, completed: 0, percentage: 0 },
        lifeFeedCount: 0,
      };
    }
    throw err;
  }

  // Count documents per collection
  const counts: Record<string, number> = {};
  for (const col of USER_COLLECTIONS) {
    const snapshot = await db.collection(col).where('userId', '==', uid).get();
    counts[col] = snapshot.size;
  }

  // Check embedding status
  const collectionsToCheck = ['healthData', 'locationData', 'voiceNotes', 'textNotes'];
  let totalDocs = 0;
  let withEmbedding = 0;

  for (const col of collectionsToCheck) {
    const snapshot = await db.collection(col).where('userId', '==', uid).get();
    for (const doc of snapshot.docs) {
      totalDocs++;
      const data = doc.data();
      if (data.embeddingId && data.embeddingId !== '') {
        withEmbedding++;
      }
    }
  }

  const percentage = totalDocs > 0 ? Math.round((withEmbedding / totalDocs) * 100) : 0;

  return {
    exists: true,
    uid,
    email,
    displayName,
    counts,
    embeddingStatus: { total: totalDocs, completed: withEmbedding, percentage },
    lifeFeedCount: counts['lifeFeedPosts'] || 0,
  };
}

// ---------------------------------------------------------------------------
// Check Embeddings (detailed, per-collection)
// ---------------------------------------------------------------------------

export async function checkEmbeddings(
  db: admin.firestore.Firestore,
  uid: string,
): Promise<{
  total: number;
  completed: number;
  percentage: number;
  byCollection: Record<string, { total: number; completed: number }>;
}> {
  const collectionsToCheck = ['healthData', 'locationData', 'voiceNotes', 'textNotes'];
  const byCollection: Record<string, { total: number; completed: number }> = {};
  let total = 0;
  let completed = 0;

  for (const col of collectionsToCheck) {
    const snapshot = await db.collection(col).where('userId', '==', uid).get();
    let colCompleted = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.embeddingId && data.embeddingId !== '') {
        colCompleted++;
      }
    }
    byCollection[col] = { total: snapshot.size, completed: colCompleted };
    total += snapshot.size;
    completed += colCompleted;
  }

  return {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    byCollection,
  };
}
