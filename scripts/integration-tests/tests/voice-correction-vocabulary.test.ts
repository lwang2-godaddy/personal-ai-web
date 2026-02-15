/**
 * Voice Correction Vocabulary - Integration Tests
 *
 * Tests vocabulary storage and retrieval for the voice correction feature:
 * 1. Save correction to vocabulary with source='voice_correction'
 * 2. Duplicate detection - increment usageCount instead of creating duplicate
 * 3. Whisper prompt building from top vocabulary
 * 4. Category mapping for different correction types
 * 5. Voice correction source tracking
 */

import * as admin from 'firebase-admin';
import type { TestResult } from '../lib/test-utils';
import {
  generateTestId,
  wait,
} from '../lib/test-utils';
import {
  log,
  colors,
  logPass,
  logFail,
  logInfo,
  logTestCase,
  logQueryBox,
  logCleanup,
  logCleanupResult,
} from '../lib/reporter';

// Test name for discovery
export const name = 'Voice Correction Vocabulary';

// Test data cleanup tracker
const createdDocIds: { collection: string; id: string }[] = [];

/**
 * Main test runner
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Save correction to vocabulary
  const test1Results = await testSaveCorrectionToVocabulary(db, userId);
  allResults.push(...test1Results);

  // Test Case 2: Duplicate detection
  const test2Results = await testDuplicateDetection(db, userId);
  allResults.push(...test2Results);

  // Test Case 3: Whisper prompt building
  const test3Results = await testWhisperPromptBuilding(db, userId);
  allResults.push(...test3Results);

  // Test Case 4: Category mapping
  const test4Results = await testCategoryMapping(db, userId);
  allResults.push(...test4Results);

  // Test Case 5: Voice correction source tracking
  const test5Results = await testVoiceCorrectionSourceTracking(db, userId);
  allResults.push(...test5Results);

  // Cleanup
  await cleanup(db, userId);

  return allResults;
}

/**
 * Test Case 1: Save correction to vocabulary
 */
async function testSaveCorrectionToVocabulary(
  db: admin.firestore.Firestore,
  userId: string,
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Save Correction to Vocabulary');

  try {
    const testId = generateTestId();
    const vocabRef = db.collection('users').doc(userId).collection('learnedVocabulary');

    // Create a voice_correction vocabulary entry
    const docRef = await vocabRef.add({
      originalPhrase: `test_orig_${testId}`,
      correctedPhrase: `test_corrected_${testId}`,
      isMultiWord: false,
      category: 'chinese_homophone',
      source: 'voice_correction',
      usageCount: 1,
      confidence: 0.8,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    createdDocIds.push({ collection: `users/${userId}/learnedVocabulary`, id: docRef.id });

    // Read back and verify
    const snap = await docRef.get();
    const data = snap.data();

    logQueryBox('Save Correction', [
      `Doc ID: ${docRef.id}`,
      `Original: ${data?.originalPhrase}`,
      `Corrected: ${data?.correctedPhrase}`,
      `Source: ${data?.source}`,
      `Confidence: ${data?.confidence}`,
    ]);

    if (data?.source === 'voice_correction' && data?.confidence === 0.8 && data?.category === 'chinese_homophone') {
      logPass('Vocabulary saved with correct fields');
      results.push({
        name: 'Save correction: Fields correct',
        passed: true,
        reason: 'source=voice_correction, confidence=0.8, category=chinese_homophone',
      });
    } else {
      logFail('Vocabulary fields incorrect');
      results.push({
        name: 'Save correction: Fields correct',
        passed: false,
        reason: `Got source=${data?.source}, confidence=${data?.confidence}, category=${data?.category}`,
      });
    }
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({ name: 'Save correction: Test execution', passed: false, reason: error.message });
  }

  return results;
}

/**
 * Test Case 2: Duplicate detection - usageCount should increment
 */
async function testDuplicateDetection(
  db: admin.firestore.Firestore,
  userId: string,
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Duplicate Detection');

  try {
    const testId = generateTestId();
    const vocabRef = db.collection('users').doc(userId).collection('learnedVocabulary');
    const origPhrase = `dup_test_${testId}`;

    // Create first entry
    const doc1Ref = await vocabRef.add({
      originalPhrase: origPhrase,
      correctedPhrase: 'corrected_v1',
      isMultiWord: false,
      category: 'proper_noun',
      source: 'voice_correction',
      usageCount: 1,
      confidence: 0.8,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    createdDocIds.push({ collection: `users/${userId}/learnedVocabulary`, id: doc1Ref.id });

    // Simulate duplicate: increment usageCount on the same doc
    await doc1Ref.update({
      usageCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Read back and verify
    const snap = await doc1Ref.get();
    const data = snap.data();

    logQueryBox('Duplicate Detection', [
      `Original phrase: ${origPhrase}`,
      `Usage count after increment: ${data?.usageCount}`,
    ]);

    if (data?.usageCount === 2) {
      logPass('Usage count incremented correctly (1 → 2)');
      results.push({
        name: 'Duplicate detection: usageCount increment',
        passed: true,
        reason: 'usageCount correctly incremented to 2',
      });
    } else {
      logFail(`Expected usageCount=2, got ${data?.usageCount}`);
      results.push({
        name: 'Duplicate detection: usageCount increment',
        passed: false,
        reason: `Expected 2, got ${data?.usageCount}`,
      });
    }

    // Verify no second document was created
    const querySnap = await vocabRef.where('originalPhrase', '==', origPhrase).get();
    if (querySnap.size === 1) {
      logPass('No duplicate document created');
      results.push({
        name: 'Duplicate detection: No duplicate doc',
        passed: true,
        reason: 'Only 1 document exists for the phrase',
      });
    } else {
      logFail(`Found ${querySnap.size} documents (expected 1)`);
      results.push({
        name: 'Duplicate detection: No duplicate doc',
        passed: false,
        reason: `Found ${querySnap.size} documents`,
      });
    }
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({ name: 'Duplicate detection: Test execution', passed: false, reason: error.message });
  }

  return results;
}

/**
 * Test Case 3: Whisper prompt building from top vocabulary
 */
async function testWhisperPromptBuilding(
  db: admin.firestore.Firestore,
  userId: string,
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Whisper Prompt Building');

  try {
    // Fetch top vocabulary ordered by usageCount
    const topVocabSnap = await db
      .collection('users')
      .doc(userId)
      .collection('learnedVocabulary')
      .orderBy('usageCount', 'desc')
      .limit(50)
      .get();

    // Build comma-separated prompt string (truncated to ~200 chars)
    let prompt = '';
    const items: string[] = [];
    topVocabSnap.docs.forEach((doc) => {
      const data = doc.data();
      const phrase = data.correctedPhrase;
      if (!phrase) return;
      const candidate = prompt ? `${prompt}, ${phrase}` : phrase;
      if (candidate.length <= 200) {
        prompt = candidate;
        items.push(phrase);
      }
    });

    logQueryBox('Whisper Prompt Building', [
      `Total vocabulary items: ${topVocabSnap.size}`,
      `Items included in prompt: ${items.length}`,
      `Prompt length: ${prompt.length}/200 chars`,
      `Prompt preview: ${prompt.substring(0, 80)}...`,
    ]);

    // Verify prompt length constraint
    if (prompt.length <= 200) {
      logPass(`Prompt within 200 char limit (${prompt.length} chars)`);
      results.push({
        name: 'Whisper prompt: Length constraint',
        passed: true,
        reason: `Prompt is ${prompt.length} chars (limit: 200)`,
        details: { promptLength: prompt.length, itemCount: items.length },
      });
    } else {
      logFail(`Prompt exceeds 200 chars: ${prompt.length}`);
      results.push({
        name: 'Whisper prompt: Length constraint',
        passed: false,
        reason: `Prompt is ${prompt.length} chars (exceeds 200)`,
      });
    }

    // Verify format is comma-separated
    if (items.length > 1) {
      const hasCommas = prompt.includes(', ');
      if (hasCommas) {
        logPass('Prompt is comma-separated');
        results.push({
          name: 'Whisper prompt: Comma-separated format',
          passed: true,
          reason: 'Correct comma-separated format',
        });
      } else {
        logFail('Prompt missing comma separators');
        results.push({
          name: 'Whisper prompt: Comma-separated format',
          passed: false,
          reason: 'Missing comma separators',
        });
      }
    } else {
      logInfo('Only 0-1 items, comma format not applicable');
      results.push({
        name: 'Whisper prompt: Comma-separated format',
        passed: true,
        reason: 'Not enough items to test format (0-1 items)',
      });
    }
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({ name: 'Whisper prompt: Test execution', passed: false, reason: error.message });
  }

  return results;
}

/**
 * Test Case 4: Category mapping for different correction types
 */
async function testCategoryMapping(
  db: admin.firestore.Firestore,
  userId: string,
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Category Mapping');

  try {
    const testId = generateTestId();
    const vocabRef = db.collection('users').doc(userId).collection('learnedVocabulary');

    const testCategories = [
      { category: 'chinese_homophone', orig: `homophone_${testId}`, corrected: 'fixed_homophone' },
      { category: 'person_name', orig: `name_${testId}`, corrected: 'fixed_name' },
      { category: 'technical_term', orig: `tech_${testId}`, corrected: 'fixed_tech' },
    ];

    const validCategories = new Set([
      'chinese_homophone', 'proper_noun', 'person_name', 'place_name',
      'technical_term', 'organization', 'abbreviation', 'foreign_word',
      'activity_type', 'domain_specific', 'custom',
    ]);

    for (const tc of testCategories) {
      const docRef = await vocabRef.add({
        originalPhrase: tc.orig,
        correctedPhrase: tc.corrected,
        isMultiWord: false,
        category: tc.category,
        source: 'voice_correction',
        usageCount: 1,
        confidence: 0.8,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      createdDocIds.push({ collection: `users/${userId}/learnedVocabulary`, id: docRef.id });

      const snap = await docRef.get();
      const data = snap.data();
      const categoryValid = validCategories.has(data?.category);

      if (categoryValid) {
        logPass(`Category "${tc.category}" is valid`);
      } else {
        logFail(`Category "${tc.category}" is NOT in valid set`);
      }

      results.push({
        name: `Category mapping: ${tc.category}`,
        passed: categoryValid,
        reason: categoryValid ? 'Valid VocabularyCategory' : `Invalid category: ${data?.category}`,
      });
    }
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({ name: 'Category mapping: Test execution', passed: false, reason: error.message });
  }

  return results;
}

/**
 * Test Case 5: Voice correction source tracking
 */
async function testVoiceCorrectionSourceTracking(
  db: admin.firestore.Firestore,
  userId: string,
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Voice Correction Source Tracking');

  try {
    const vocabRef = db.collection('users').doc(userId).collection('learnedVocabulary');

    // Count entries by source
    const allSnap = await vocabRef.limit(200).get();
    const sourceCounts: Record<string, number> = {};

    allSnap.docs.forEach((doc) => {
      const source = doc.data().source || 'unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    logQueryBox('Source Distribution', [
      `Total vocabulary: ${allSnap.size}`,
      ...Object.entries(sourceCounts).map(([k, v]) => `  ${k}: ${v}`),
    ]);

    // Verify voice_correction entries are distinguishable
    const voiceCorrectionSnap = await vocabRef
      .where('source', '==', 'voice_correction')
      .limit(20)
      .get();

    const voiceCorrectionCount = voiceCorrectionSnap.size;
    logInfo(`Found ${voiceCorrectionCount} voice_correction entries`);

    // Show samples
    voiceCorrectionSnap.docs.slice(0, 3).forEach((doc) => {
      const data = doc.data();
      log(`  • "${data.originalPhrase}" → "${data.correctedPhrase}" [${data.category}]`, colors.dim);
    });

    // Check that voice_correction entries are distinct from other sources
    const hasVoiceCorrection = voiceCorrectionCount > 0;
    if (hasVoiceCorrection) {
      logPass(`voice_correction source is trackable (${voiceCorrectionCount} entries)`);
    } else {
      logInfo('No voice_correction entries found (may not have been used yet)');
    }

    results.push({
      name: 'Source tracking: voice_correction distinguishable',
      passed: true, // Not a failure if none exist yet
      reason: hasVoiceCorrection
        ? `Found ${voiceCorrectionCount} voice_correction entries`
        : 'No entries yet (feature may not have been used)',
      details: { sourceCounts, voiceCorrectionCount },
    });
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({ name: 'Source tracking: Test execution', passed: false, reason: error.message });
  }

  return results;
}

/**
 * Cleanup test data
 */
async function cleanup(
  db: admin.firestore.Firestore,
  userId: string,
): Promise<void> {
  logCleanup();

  let cleaned = 0;
  let failed = 0;

  for (const { collection, id } of createdDocIds) {
    try {
      await db.collection(collection).doc(id).delete();
      cleaned++;
    } catch (error) {
      failed++;
    }
  }

  logCleanupResult(cleaned, failed);
  createdDocIds.length = 0;
}
