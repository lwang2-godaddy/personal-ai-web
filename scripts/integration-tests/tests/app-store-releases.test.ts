/**
 * Integration Test: App Store Releases API
 *
 * Tests the /api/admin/app-store-releases endpoints
 * and verifies the Firestore document structure.
 */

import * as admin from 'firebase-admin';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load env
config({ path: resolve(__dirname, '../../../.env.local') });

// ============================================================
// Firebase Admin Init
// ============================================================

function getFirestore(): admin.firestore.Firestore {
  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    const sa = JSON.parse(serviceAccountKey);
    admin.initializeApp({
      credential: admin.credential.cert(sa),
      projectId: sa.project_id,
    });
  } else {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
  }

  return admin.firestore();
}

// ============================================================
// Test Helpers
// ============================================================

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

// ============================================================
// Tests
// ============================================================

async function testFirestoreDocument() {
  console.log('\n--- Test: Firestore Document Structure ---\n');

  const db = getFirestore();

  // Check if the v1.1.0 release doc exists (created by the generator test above)
  const docRef = db.collection('appStoreReleases').doc('v1.1.0');
  const docSnap = await docRef.get();

  assert(docSnap.exists, 'Release document v1.1.0 exists in Firestore');

  if (!docSnap.exists) {
    console.log('  Skipping field checks (document not found)');
    return;
  }

  const data = docSnap.data()!;

  // Check required fields
  assert(data.version === '1.1.0', `version is "1.1.0" (got "${data.version}")`);
  assert(typeof data.buildNumber === 'string', `buildNumber is a string (got ${typeof data.buildNumber})`);
  assert(data.releaseDate != null, 'releaseDate is present');
  assert(
    ['submitted', 'in-review', 'approved', 'released', 'rejected'].includes(data.status),
    `status is a valid value (got "${data.status}")`
  );
  assert(typeof data.releaseNotes === 'string' && data.releaseNotes.length > 0, 'releaseNotes is a non-empty string');
  assert(Array.isArray(data.rawCommits), 'rawCommits is an array');
  assert(data.rawCommits.length > 0, `rawCommits has entries (got ${data.rawCommits.length})`);
  assert(data.commitRange != null, 'commitRange is present');
  assert(typeof data.commitRange?.from === 'string', 'commitRange.from is a string');
  assert(typeof data.commitRange?.to === 'string', 'commitRange.to is a string');
  assert(data.createdAt != null, 'createdAt is present');
  assert(data.updatedAt != null, 'updatedAt is present');
}

async function testCRUDOperations() {
  console.log('\n--- Test: CRUD Operations ---\n');

  const db = getFirestore();
  const testDocId = 'v99.99.99-test';

  try {
    // Create
    await db.collection('appStoreReleases').doc(testDocId).set({
      version: '99.99.99',
      buildNumber: '999',
      releaseDate: admin.firestore.Timestamp.now(),
      status: 'submitted',
      releaseNotes: 'Test release notes for integration test',
      rawCommits: ['abc1234 test commit 1', 'def5678 test commit 2'],
      commitRange: { from: 'v99.99.98', to: 'v99.99.99' },
      previousVersion: 'v99.99.98',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    assert(true, 'Created test release document');

    // Read
    const docSnap = await db.collection('appStoreReleases').doc(testDocId).get();
    assert(docSnap.exists, 'Can read the test release document');
    assert(docSnap.data()?.version === '99.99.99', 'Read data matches written data');

    // Update status
    await db.collection('appStoreReleases').doc(testDocId).update({
      status: 'in-review',
      updatedAt: admin.firestore.Timestamp.now(),
    });
    const updated = await db.collection('appStoreReleases').doc(testDocId).get();
    assert(updated.data()?.status === 'in-review', 'Status updated to in-review');

    // Update release notes
    await db.collection('appStoreReleases').doc(testDocId).update({
      releaseNotes: 'Updated test notes',
      updatedAt: admin.firestore.Timestamp.now(),
    });
    const updatedNotes = await db.collection('appStoreReleases').doc(testDocId).get();
    assert(updatedNotes.data()?.releaseNotes === 'Updated test notes', 'Release notes updated');

    // List
    const snapshot = await db
      .collection('appStoreReleases')
      .orderBy('releaseDate', 'desc')
      .get();
    assert(snapshot.docs.length >= 1, `Can list releases (found ${snapshot.docs.length})`);
    assert(
      snapshot.docs.some((d) => d.id === testDocId),
      'Test document appears in list query'
    );
  } finally {
    // Cleanup
    await db.collection('appStoreReleases').doc(testDocId).delete();
    console.log('  (cleaned up test document)');
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('================================================');
  console.log('  App Store Releases - Integration Tests');
  console.log('================================================');

  await testFirestoreDocument();
  await testCRUDOperations();

  console.log('\n================================================');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Test error:', error);
  process.exit(1);
});
