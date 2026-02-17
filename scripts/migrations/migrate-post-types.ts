/**
 * Migration script to sync all post types to Firestore
 *
 * Firestore (config/insightsPostTypes) is the single source of truth for post types.
 * Run this script whenever new post types are added to the codebase.
 *
 * Usage:
 *   cd personal-ai-web
 *   npx tsx scripts/migrate-post-types.ts
 *
 * Options:
 *   --dry-run    Show what would be changed without making changes
 *   --force      Overwrite existing type configs with defaults
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// ESM compatibility: get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables FIRST
// Script is at scripts/migrations/, so go up two levels to find .env.local in project root
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

// Now import firebase-admin after env vars are loaded
import * as admin from 'firebase-admin';

// Initialize Firebase Admin (same pattern as migrate-all-prompts-i18n.ts)
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (serviceAccountKey) {
  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId || serviceAccount.project_id,
    });
    console.log(`Firebase initialized with project: ${projectId || serviceAccount.project_id}`);
  } catch (e) {
    console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', e);
    process.exit(1);
  }
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  admin.initializeApp({
    projectId,
  });
  console.log(`Firebase initialized from GOOGLE_APPLICATION_CREDENTIALS`);
} else {
  console.error('Error: No Firebase credentials found.');
  console.error('Set FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS');
  console.error('\nCurrent env vars:');
  console.error(`  FIREBASE_SERVICE_ACCOUNT_KEY: ${serviceAccountKey ? 'set (length: ' + serviceAccountKey.length + ')' : 'not set'}`);
  console.error(`  GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || 'not set'}`);
  console.error(`  NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${projectId || 'not set'}`);
  process.exit(1);
}

const db = admin.firestore();

// All post types - this is the canonical list
// When adding new post types, add them here first, then run this script
const ALL_POST_TYPES = {
  life_summary: {
    enabled: true,
    displayName: 'Life Update',
    icon: '📋',
    description: 'Weekly/daily summaries of activity',
    cooldownDays: 1,
    priority: 8,
    defaultCategory: 'general',
    minConfidence: 0.5,
    maxPerDay: 2,
  },
  milestone: {
    enabled: true,
    displayName: 'Milestone',
    icon: '🏆',
    description: 'Achievement announcements',
    cooldownDays: 7,
    priority: 10,
    defaultCategory: 'achievement',
    minConfidence: 0.8,
    maxPerDay: 1,
  },
  pattern_prediction: {
    enabled: true,
    displayName: 'Prediction',
    icon: '🔮',
    description: 'Forward-looking predictions from diary, voice notes, activities, and mood patterns',
    cooldownDays: 2,
    priority: 8,
    defaultCategory: 'personal',
    minConfidence: 0.5,
    maxPerDay: 1,
  },
  reflective_insight: {
    enabled: true,
    displayName: 'Insight',
    icon: '💡',
    description: 'Behavioral insights',
    cooldownDays: 3,
    priority: 6,
    defaultCategory: 'general',
    minConfidence: 0.6,
    maxPerDay: 1,
  },
  memory_highlight: {
    enabled: true,
    displayName: 'Memory',
    icon: '📸',
    description: 'Anniversary highlights',
    cooldownDays: 7,
    priority: 5,
    defaultCategory: 'memory',
    minConfidence: 0.7,
    maxPerDay: 1,
  },
  streak_achievement: {
    enabled: true,
    displayName: 'Streak',
    icon: '🔥',
    description: 'Streak achievements',
    cooldownDays: 3,
    priority: 9,
    defaultCategory: 'achievement',
    minConfidence: 0.85,
    maxPerDay: 1,
  },
  comparison: {
    enabled: true,
    displayName: 'Comparison',
    icon: '📊',
    description: 'Time period comparisons',
    cooldownDays: 14,
    priority: 4,
    defaultCategory: 'general',
    minConfidence: 0.6,
    maxPerDay: 1,
  },
  seasonal_reflection: {
    enabled: true,
    displayName: 'Reflection',
    icon: '🌟',
    description: 'Monthly and bi-weekly life summaries',
    cooldownDays: 14,       // Was 30 - now bi-weekly for more frequent generation
    priority: 6,            // Was 3 - increased priority
    defaultCategory: 'general',
    minConfidence: 0.5,
    maxPerDay: 1,
  },
  activity_pattern: {
    enabled: true,
    displayName: 'Pattern',
    icon: '📊',
    description: 'Discovered activity patterns',
    cooldownDays: 7,
    priority: 6,
    defaultCategory: 'activity',
    minConfidence: 0.7,
    maxPerDay: 1,
  },
  health_alert: {
    enabled: true,
    displayName: 'Alert',
    icon: '⚠️',
    description: 'Health metric anomaly alerts',
    cooldownDays: 1,
    priority: 9,
    defaultCategory: 'health',
    minConfidence: 0.8,
    maxPerDay: 2,
  },
  category_insight: {
    enabled: true,
    displayName: 'Category Insight',
    icon: '📊',
    description: 'Category distribution and trend insights',
    cooldownDays: 3,
    priority: 6,            // Was 5 - increased priority
    defaultCategory: 'general',
    minConfidence: 0.5,     // Was 0.6 - lowered threshold for new users
    maxPerDay: 1,
  },
};

async function migratePostTypes() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const forceOverwrite = args.includes('--force');

  console.log('='.repeat(60));
  console.log('Post Types Migration Script');
  console.log('='.repeat(60));
  if (isDryRun) console.log('>>> DRY RUN MODE - No changes will be made <<<\n');
  if (forceOverwrite) console.log('>>> FORCE MODE - Existing configs will be overwritten <<<\n');

  const docRef = db.collection('config').doc('insightsPostTypes');
  const docSnap = await docRef.get();

  const existingData = docSnap.exists ? docSnap.data() : null;
  const existingTypes = existingData?.postTypes || {};

  console.log(`Existing types in Firestore: ${Object.keys(existingTypes).length}`);
  console.log(`Types defined in script: ${Object.keys(ALL_POST_TYPES).length}`);

  // Determine what to do for each type
  const newTypes: string[] = [];
  const existingUnchanged: string[] = [];
  const toOverwrite: string[] = [];

  const mergedTypes: Record<string, any> = {};

  for (const [type, defaultConfig] of Object.entries(ALL_POST_TYPES)) {
    if (!existingTypes[type]) {
      // New type - add it
      newTypes.push(type);
      mergedTypes[type] = defaultConfig;
    } else if (forceOverwrite) {
      // Existing type but force overwrite
      toOverwrite.push(type);
      mergedTypes[type] = defaultConfig;
    } else {
      // Existing type - preserve customizations
      existingUnchanged.push(type);
      mergedTypes[type] = existingTypes[type];
    }
  }

  // Check for types in Firestore that are not in our list (orphaned)
  const orphanedTypes = Object.keys(existingTypes).filter(
    type => !ALL_POST_TYPES[type as keyof typeof ALL_POST_TYPES]
  );

  console.log('\n--- Summary ---');
  if (newTypes.length > 0) {
    console.log(`\nNEW types to add (${newTypes.length}):`);
    for (const type of newTypes) {
      const config = ALL_POST_TYPES[type as keyof typeof ALL_POST_TYPES];
      console.log(`  + ${config.icon} ${type} - ${config.description}`);
    }
  }

  if (existingUnchanged.length > 0) {
    console.log(`\nEXISTING types preserved (${existingUnchanged.length}):`);
    for (const type of existingUnchanged) {
      const config = existingTypes[type];
      console.log(`  = ${config.icon || '?'} ${type}`);
    }
  }

  if (toOverwrite.length > 0) {
    console.log(`\nOVERWRITTEN types (${toOverwrite.length}):`);
    for (const type of toOverwrite) {
      const config = ALL_POST_TYPES[type as keyof typeof ALL_POST_TYPES];
      console.log(`  ! ${config.icon} ${type}`);
    }
  }

  if (orphanedTypes.length > 0) {
    console.log(`\nWARNING - Orphaned types in Firestore (not in script):`);
    for (const type of orphanedTypes) {
      console.log(`  ? ${type} - consider adding to ALL_POST_TYPES or removing from Firestore`);
    }
    // Keep orphaned types
    for (const type of orphanedTypes) {
      mergedTypes[type] = existingTypes[type];
    }
  }

  if (newTypes.length === 0 && toOverwrite.length === 0) {
    console.log('\nNo changes needed. Firestore is up to date.');
    process.exit(0);
  }

  if (isDryRun) {
    console.log('\n>>> DRY RUN - No changes made. Remove --dry-run to apply changes. <<<');
    process.exit(0);
  }

  // Update Firestore
  console.log('\nUpdating Firestore...');

  const updateData = {
    version: existingData?.version || '1.0.0',
    lastUpdatedAt: new Date().toISOString(),
    lastUpdatedBy: 'migrate-post-types-script',
    postTypes: mergedTypes,
  };

  await docRef.set(updateData, { merge: true });

  console.log(`\nMigration complete! Firestore now has ${Object.keys(mergedTypes).length} post types.`);

  // Final summary
  console.log('\n--- All Post Types ---');
  for (const [type, config] of Object.entries(mergedTypes)) {
    const icon = (config as any).icon || '?';
    const enabled = (config as any).enabled ? '✓' : '✗';
    console.log(`  ${enabled} ${icon} ${type}`);
  }

  console.log('\n' + '='.repeat(60));
  process.exit(0);
}

migratePostTypes().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
