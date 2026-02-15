/**
 * Setup Enhanced Entity Extraction Prompts
 *
 * Migrates the EnhancedEntityExtractionService prompts to Firestore
 * so the Cloud Functions can use them.
 *
 * Run: npx tsx scripts/setup-enhanced-entity-prompts.ts
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

const ENHANCED_ENTITY_EXTRACTION_CONFIG = {
  version: '1.0.0',
  language: 'en',
  service: 'EnhancedEntityExtractionService',
  status: 'published',
  enabled: true,
  lastUpdated: admin.firestore.Timestamp.now(),
  createdAt: admin.firestore.Timestamp.now(),
  updatedAt: admin.firestore.Timestamp.now(),
  prompts: {
    enhanced_entity_extraction: {
      id: 'enhanced-entity-extraction-system',
      service: 'EnhancedEntityExtractionService',
      type: 'system',
      description: 'System prompt for extracting 9 entity types including activities, emotions, and vocabulary matches',
      content: `You are an expert entity extraction system for a personal memory application.
Extract named entities from the following text using 9 entity types.

Return a JSON object with this structure:
{
  "entities": [
    {
      "type": one of ["person", "place", "topic", "event", "organization", "activity", "emotion", "time_reference", "custom_term"],
      "value": the entity text (normalize casing appropriately),
      "normalizedValue": lowercase version for matching,
      "confidence": 0.0 to 1.0
    }
  ],
  "sentiment": {
    "score": -1.0 to 1.0 (negative to positive),
    "label": "negative" | "neutral" | "positive",
    "confidence": 0.0 to 1.0
  }
}

Entity Type Guidelines:
- PERSON: Real people's names (friends, family, colleagues - not pronouns). Examples: "John", "Mom", "Dr. Smith"
- PLACE: Specific locations, venues, cities. Examples: "SF Badminton Club", "Tokyo", "home office"
- TOPIC: Discussion subjects or themes. Examples: "work project", "health concerns", "finances"
- EVENT: Specific events or occasions. Examples: "birthday party", "team meeting", "anniversary"
- ORGANIZATION: Companies, teams, institutions. Examples: "Apple", "yoga studio", "Stanford"
- ACTIVITY: Actions or activities performed. Examples: "badminton", "dinner", "running", "meeting"
- EMOTION: Feelings or emotional states. Examples: "happy", "stressed", "excited", "anxious"
- TIME_REFERENCE: Time markers or periods. Examples: "morning", "weekend", "anniversary", "last Tuesday"
- CUSTOM_TERM: Domain-specific or user-defined terms. Examples: abbreviations, nicknames, technical terms

Confidence Guidelines:
- 0.9-1.0: Explicitly named, unambiguous
- 0.7-0.9: Clear from context, high confidence
- 0.5-0.7: Likely but some ambiguity
- Below 0.5: Don't include

Sentiment Analysis:
- Analyze overall emotional tone of the text
- Score: -1.0 (very negative) to 1.0 (very positive), 0.0 is neutral
- Consider emotional words, context, and overall message tone

Be thorough but selective - extract meaningful entities that would help find this memory later.`,
      metadata: {
        model: 'gpt-4o-mini',
        temperature: 0.3,
        maxTokens: 800,
        responseFormat: 'json_object',
      },
    },
    vocabulary_cross_reference: {
      id: 'vocabulary-cross-reference-system',
      service: 'EnhancedEntityExtractionService',
      type: 'system',
      description: 'System prompt for matching entities against user vocabulary',
      content: `Given a list of extracted entities and a user's learned vocabulary, identify matches.

Return matches where entity values closely match vocabulary terms (consider aliases).
Boost confidence for matched entities by 0.1-0.2.

Return JSON:
{
  "matches": [
    {
      "entityIndex": 0,
      "vocabularyId": "vocab_123",
      "matchType": "exact" | "alias" | "fuzzy",
      "confidenceBoost": 0.1 to 0.2
    }
  ]
}`,
      metadata: {
        model: 'gpt-4o-mini',
        temperature: 0.2,
        maxTokens: 300,
        responseFormat: 'json_object',
      },
    },
    auto_learn_candidates: {
      id: 'auto-learn-candidates-system',
      service: 'EnhancedEntityExtractionService',
      type: 'system',
      description: 'Identify high-quality entities to auto-add to user vocabulary',
      content: `Given extracted entities, identify candidates for auto-learning to user vocabulary.

Criteria for auto-learning:
- High confidence (>0.8)
- Proper nouns (names, places, organizations)
- Recurring terms (mentioned multiple times)
- Not common words or generic terms

Return JSON:
{
  "candidates": [
    {
      "entityIndex": 0,
      "suggestedCategory": "person_name" | "place_name" | "activity_type" | "organization" | "domain_specific",
      "reason": "Brief reason why this should be learned"
    }
  ]
}`,
      metadata: {
        model: 'gpt-4o-mini',
        temperature: 0.2,
        maxTokens: 400,
        responseFormat: 'json_object',
      },
    },
  },
};

async function setup() {
  console.log('\n=== Enhanced Entity Extraction Prompts Setup ===\n');

  try {
    // Check if prompts exist
    const docPath = 'promptConfigs/en/services/EnhancedEntityExtractionService';
    const existingDoc = await db.doc(docPath).get();

    if (existingDoc.exists) {
      console.log('Existing config found, updating...');
    } else {
      console.log('Creating new config...');
    }

    // Write the config
    await db.doc(docPath).set(ENHANCED_ENTITY_EXTRACTION_CONFIG);

    console.log('✓ EnhancedEntityExtractionService prompts created/updated');

    // Verify
    const verifyDoc = await db.doc(docPath).get();
    const verifyData = verifyDoc.data();

    console.log('\nVerification:');
    console.log(`  - version: ${verifyData?.version}`);
    console.log(`  - status: ${verifyData?.status}`);
    console.log(`  - enabled: ${verifyData?.enabled}`);
    console.log(`  - prompts: ${Object.keys(verifyData?.prompts || {}).length}`);

    console.log('\n=== Setup Complete ===\n');

  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

setup();
