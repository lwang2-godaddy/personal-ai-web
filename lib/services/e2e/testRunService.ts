import { getAdminFirestore } from '@/lib/api/firebase/admin';
import type { TestRun, TestCaseResult } from '@/lib/models/TestRun';

const COLLECTION = 'testRuns';
const TEST_CASES_SUBCOLLECTION = 'testCases';

export async function createTestRun(run: Omit<TestRun, 'id'>): Promise<string> {
  const db = getAdminFirestore();
  const docRef = await db.collection(COLLECTION).add(run);
  return docRef.id;
}

export async function updateTestRun(
  runId: string,
  updates: Partial<TestRun>,
): Promise<void> {
  const db = getAdminFirestore();
  await db.collection(COLLECTION).doc(runId).set(updates, { merge: true });
}

export async function getTestRun(runId: string): Promise<TestRun | null> {
  const db = getAdminFirestore();
  const doc = await db.collection(COLLECTION).doc(runId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as TestRun;
}

export async function listTestRuns(options: {
  limit?: number;
  startAfter?: string;
  type?: 'integration' | 'maestro';
}): Promise<{ runs: TestRun[]; hasMore: boolean }> {
  const db = getAdminFirestore();
  const limit = options.limit ?? 20;

  let query = db
    .collection(COLLECTION)
    .orderBy('startedAt', 'desc')
    .limit(limit + 1);

  if (options.type) {
    query = query.where('type', '==', options.type);
  }

  if (options.startAfter) {
    const cursorDoc = await db.collection(COLLECTION).doc(options.startAfter).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const snapshot = await query.get();
  const runs = snapshot.docs.slice(0, limit).map(
    (doc) => ({ id: doc.id, ...doc.data() }) as TestRun,
  );

  return {
    runs,
    hasMore: snapshot.docs.length > limit,
  };
}

export async function saveTestCaseResults(
  runId: string,
  results: TestCaseResult[],
): Promise<void> {
  const db = getAdminFirestore();
  const batch = db.batch();
  const subcollection = db
    .collection(COLLECTION)
    .doc(runId)
    .collection(TEST_CASES_SUBCOLLECTION);

  results.forEach((result, idx) => {
    const docRef = subcollection.doc(String(idx));
    batch.set(docRef, result);
  });

  await batch.commit();
}

export async function getTestCaseResults(
  runId: string,
): Promise<TestCaseResult[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(COLLECTION)
    .doc(runId)
    .collection(TEST_CASES_SUBCOLLECTION)
    .orderBy('__name__')
    .get();

  return snapshot.docs.map((doc) => doc.data() as TestCaseResult);
}

export async function hasActiveRun(
  type: 'integration' | 'maestro',
): Promise<boolean> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(COLLECTION)
    .where('type', '==', type)
    .where('status', 'in', ['running', 'pending'])
    .limit(1)
    .get();

  return !snapshot.empty;
}
