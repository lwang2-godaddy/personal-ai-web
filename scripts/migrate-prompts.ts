/**
 * Migrate Prompts from YAML to Firestore
 *
 * This script reads YAML prompt files from the Firebase Functions directory
 * and migrates them to Firestore for dynamic prompt management.
 *
 * Usage:
 *   npx tsx scripts/migrate-prompts.ts
 *
 * Prerequisites:
 *   - GOOGLE_APPLICATION_CREDENTIALS environment variable set
 *   - Or FIREBASE_SERVICE_ACCOUNT_KEY in .env.local
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'yaml';
import * as dotenv from 'dotenv';

// ESM compatibility: get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables FIRST
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Now import firebase-admin after env vars are loaded
import * as admin from 'firebase-admin';

// Path to YAML prompts in Firebase Functions
const PROMPTS_PATH = path.join(
  __dirname,
  '../../PersonalAIApp/firebase/functions/src/config/prompts/locales'
);

// Service mapping from YAML files
const FILE_TO_SERVICE: Record<string, string> = {
  'analysis.yaml': 'SentimentAnalysisService',
  'entityExtraction.yaml': 'EntityExtractionService',
  'events.yaml': 'EventExtractionService',
  'lifeFeed.yaml': 'LifeFeedGenerator',
  'memory.yaml': 'MemoryGeneratorService',
  'suggestions.yaml': 'SuggestionEngine',
  'chat.yaml': 'OpenAIService',
  'rag.yaml': 'RAGEngine',
  'dailySummary.yaml': 'DailySummaryService',
};

interface YamlPromptConfig {
  version: string;
  language: string;
  lastUpdated: string;
  prompts: Record<string, any>;
}

function initializeFirebase() {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (admin.apps && admin.apps.length > 0) {
    return admin.firestore();
  }

  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId || serviceAccount.project_id,
      });
      console.log(`✅ Firebase initialized with project: ${projectId || serviceAccount.project_id}`);
    } catch (e) {
      console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', e);
      process.exit(1);
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      projectId,
    });
    console.log(`✅ Firebase initialized from GOOGLE_APPLICATION_CREDENTIALS`);
  } else {
    console.error('Error: No Firebase credentials found.');
    console.error('Set FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS');
    console.error('\nCurrent env vars:');
    console.error(`  FIREBASE_SERVICE_ACCOUNT_KEY: ${serviceAccountKey ? 'set (length: ' + serviceAccountKey.length + ')' : 'not set'}`);
    console.error(`  GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || 'not set'}`);
    console.error(`  NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${projectId || 'not set'}`);
    process.exit(1);
  }

  return admin.firestore();
}

async function migratePrompts(overwrite = false) {
  console.log('Starting prompt migration...\n');

  // Initialize Firebase
  const db = initializeFirebase();

  // Check if PROMPTS_PATH exists
  if (!fs.existsSync(PROMPTS_PATH)) {
    console.error(`Error: Prompts directory not found at ${PROMPTS_PATH}`);
    console.error('Make sure you are running from the personal-ai-web directory');
    process.exit(1);
  }

  // Get all language directories
  const languages = fs.readdirSync(PROMPTS_PATH).filter(dir => {
    const fullPath = path.join(PROMPTS_PATH, dir);
    return fs.statSync(fullPath).isDirectory();
  });

  console.log(`Found languages: ${languages.join(', ')}\n`);

  let migrated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const language of languages) {
    const langPath = path.join(PROMPTS_PATH, language);
    const yamlFiles = fs.readdirSync(langPath).filter(f => f.endsWith('.yaml'));

    console.log(`\n📂 Processing ${language.toUpperCase()}...`);

    for (const yamlFile of yamlFiles) {
      const service = FILE_TO_SERVICE[yamlFile];
      if (!service) {
        console.log(`  ⚠️  Skipping unknown file: ${yamlFile}`);
        continue;
      }

      const filePath = path.join(langPath, yamlFile);
      process.stdout.write(`  ${yamlFile} -> ${service}... `);

      try {
        // Read and parse YAML
        const yamlContent = fs.readFileSync(filePath, 'utf8');
        const config: YamlPromptConfig = yaml.parse(yamlContent);

        if (!config.prompts || Object.keys(config.prompts).length === 0) {
          console.log(`⚠️  No prompts found, skipping`);
          skipped++;
          continue;
        }

        // Check if config already exists in Firestore
        const docRef = db
          .collection('promptConfigs')
          .doc(language)
          .collection('services')
          .doc(service);

        const existingDoc = await docRef.get();

        if (existingDoc.exists && !overwrite) {
          console.log(`⏭️  Already exists (use --overwrite)`);
          skipped++;
          continue;
        }

        // Prepare Firestore document
        const firestoreConfig = {
          version: config.version || '1.0.0',
          language: language,
          service: service,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'migration-script',
          updateNotes: existingDoc.exists ? 'Migration (overwrite)' : 'Initial migration from YAML',
          enabled: true,
          status: 'published',
          prompts: config.prompts,
          createdAt: existingDoc.exists
            ? existingDoc.data()?.createdAt
            : admin.firestore.FieldValue.serverTimestamp(),
          createdBy: existingDoc.exists ? existingDoc.data()?.createdBy : 'migration-script',
          publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Save to Firestore
        await docRef.set(firestoreConfig, { merge: false });

        // Create version history entry
        const versionRef = db.collection('promptVersions').doc();
        await versionRef.set({
          id: versionRef.id,
          language: language,
          service: service,
          promptId: '_all',
          previousContent: existingDoc.exists ? JSON.stringify(existingDoc.data()?.prompts) : '',
          newContent: JSON.stringify(config.prompts),
          changedAt: admin.firestore.FieldValue.serverTimestamp(),
          changedBy: 'migration-script',
          changeType: existingDoc.exists ? 'update' : 'create',
          changeNotes: existingDoc.exists ? 'Migration (overwrite)' : 'Initial migration from YAML',
        });

        console.log(`✅ ${Object.keys(config.prompts).length} prompts`);
        migrated++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.log(`❌ Error: ${message}`);
        errors.push(`${language}/${service}: ${message}`);
      }
    }
  }

  console.log('\n========================================');
  console.log('📊 Migration Summary:');
  console.log(`  ✅ Migrated: ${migrated}`);
  console.log(`  ⏭️  Skipped:  ${skipped}`);
  console.log(`  ❌ Errors:   ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  - ${e}`));
  }

  console.log('\n✨ Migration complete!');
  console.log('\nNext steps:');
  console.log('1. Visit /admin/prompts to see migrated prompts');
  console.log('2. Edit prompts as needed');
  console.log('3. Deploy Cloud Functions if not already done');
}

// Parse command line arguments
const args = process.argv.slice(2);
const overwrite = args.includes('--overwrite');

if (args.includes('--help')) {
  console.log(`
Migrate Prompts from YAML to Firestore

Usage:
  npx tsx scripts/migrate-prompts.ts [options]

Options:
  --overwrite  Overwrite existing Firestore configs
  --help       Show this help message

Prerequisites:
  Set one of these environment variables:
  - FIREBASE_SERVICE_ACCOUNT_KEY (JSON string in .env.local)
  - GOOGLE_APPLICATION_CREDENTIALS (path to service account file)
`);
  process.exit(0);
}

migratePrompts(overwrite)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
