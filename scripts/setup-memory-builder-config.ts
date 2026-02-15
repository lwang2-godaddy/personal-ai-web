/**
 * Setup Memory Builder Configuration
 *
 * Creates/updates the config/memoryBuilderSettings document in Firestore
 * to enable enhanced entity extraction for memories.
 *
 * Run: npx tsx scripts/setup-memory-builder-config.ts
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Initialize Firebase
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

const MEMORY_BUILDER_CONFIG = {
  // Enable enhanced extraction
  enabled: true,

  // Entity types configuration
  entityTypes: {
    person: { enabled: true, confidence: 0.7 },
    place: { enabled: true, confidence: 0.7 },
    activity: { enabled: true, confidence: 0.6 },
    emotion: { enabled: true, confidence: 0.6 },
    organization: { enabled: true, confidence: 0.8 },
    topic: { enabled: true, confidence: 0.6 },
    event: { enabled: true, confidence: 0.7 },
    time_reference: { enabled: true, confidence: 0.7 },
    custom_term: { enabled: true, confidence: 0.8 },
  },

  // Extraction settings
  extraction: {
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 1000,
    enableSentiment: true,
    enableVocabCrossRef: true,
  },

  // Vocabulary integration settings
  vocabularyIntegration: {
    autoLearn: true,
    autoLearnThreshold: 0.8,
    suggestNewTerms: true,
    crossReferenceEnabled: true,
    categoriesToAutoLearn: ['person_name', 'place_name', 'activity_type', 'organization'],
  },

  // Search weights for RAG relevance boosting
  searchWeights: {
    person: 1.5,
    place: 1.3,
    activity: 1.4,
    emotion: 1.0,
    organization: 1.2,
    topic: 1.0,
    event: 1.1,
    time_reference: 0.8,
    custom_term: 1.6,
  },

  // Metadata
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
};

async function setup() {
  console.log('\n=== Memory Builder Config Setup ===\n');

  try {
    // Check current config
    const existingDoc = await db.collection('config').doc('memoryBuilderSettings').get();

    if (existingDoc.exists) {
      const existingData = existingDoc.data();
      console.log('Existing config found:');
      console.log(`  - enabled: ${existingData?.enabled}`);
      console.log(`  - entityTypes: ${Object.keys(existingData?.entityTypes || {}).length} types`);
      console.log(`  - extraction model: ${existingData?.extraction?.model || 'not set'}`);

      // Update with merge to preserve existing settings
      await db.collection('config').doc('memoryBuilderSettings').set({
        ...MEMORY_BUILDER_CONFIG,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log('\n✓ Config updated (merged with existing)');
    } else {
      // Create new config
      await db.collection('config').doc('memoryBuilderSettings').set(MEMORY_BUILDER_CONFIG);
      console.log('✓ Config created');
    }

    // Verify
    const verifyDoc = await db.collection('config').doc('memoryBuilderSettings').get();
    const verifyData = verifyDoc.data();

    console.log('\nVerification:');
    console.log(`  - enabled: ${verifyData?.enabled}`);
    console.log(`  - Entity types: ${Object.keys(verifyData?.entityTypes || {}).length}`);
    console.log(`  - Extraction model: ${verifyData?.extraction?.model}`);
    console.log(`  - Sentiment enabled: ${verifyData?.extraction?.enableSentiment}`);
    console.log(`  - Vocab auto-learn: ${verifyData?.vocabularyIntegration?.autoLearn}`);

    console.log('\n=== Setup Complete ===\n');

  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

setup();
