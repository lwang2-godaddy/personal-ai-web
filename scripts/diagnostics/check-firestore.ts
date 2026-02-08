#!/usr/bin/env npx tsx
/**
 * Firestore Diagnostic Script
 *
 * Check whether specific collections or records exist in Firestore.
 *
 * Usage:
 *   npx tsx scripts/diagnostics/check-firestore.ts [command] [options]
 *
 * Commands:
 *   collection <path>              List documents in a collection
 *   doc <path>                     Check if a document exists and show its data
 *   prompts [service] [language]   Check prompt configs
 *   prompt-services                List all prompt service documents
 *   count <path>                   Count documents in a collection
 *
 * Examples:
 *   npx tsx scripts/diagnostics/check-firestore.ts collection users
 *   npx tsx scripts/diagnostics/check-firestore.ts doc promptConfigs/en/services/ChatSuggestions
 *   npx tsx scripts/diagnostics/check-firestore.ts prompts ChatSuggestions en
 *   npx tsx scripts/diagnostics/check-firestore.ts prompt-services
 *   npx tsx scripts/diagnostics/check-firestore.ts count textNotes
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

// Initialize Firebase Admin
function initFirebase() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!serviceAccountKey) {
    console.error('Error: FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
    process.exit(1);
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
    });
  } catch (error) {
    console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error);
    process.exit(1);
  }
}

// Colors for terminal output
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

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✓ ${message}`, colors.green);
}

function logError(message: string) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ ${message}`, colors.cyan);
}

function logWarning(message: string) {
  log(`⚠ ${message}`, colors.yellow);
}

// Format document data for display
function formatData(data: any, indent: number = 0): string {
  const spaces = '  '.repeat(indent);

  if (data === null || data === undefined) {
    return `${colors.dim}null${colors.reset}`;
  }

  if (typeof data === 'string') {
    // Truncate long strings
    const maxLen = 100;
    const truncated = data.length > maxLen ? data.substring(0, maxLen) + '...' : data;
    return `${colors.green}"${truncated}"${colors.reset}`;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return `${colors.yellow}${data}${colors.reset}`;
  }

  if (data instanceof admin.firestore.Timestamp) {
    return `${colors.magenta}${data.toDate().toISOString()}${colors.reset}`;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return '[]';
    const items = data.map(item => formatData(item, indent + 1));
    return `[\n${spaces}  ${items.join(`,\n${spaces}  `)}\n${spaces}]`;
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) return '{}';

    const entries = keys.map(key => {
      const value = formatData(data[key], indent + 1);
      return `${spaces}  ${colors.cyan}${key}${colors.reset}: ${value}`;
    });
    return `{\n${entries.join(',\n')}\n${spaces}}`;
  }

  return String(data);
}

// Command: List documents in a collection
async function listCollection(collectionPath: string, limit: number = 20) {
  const db = admin.firestore();

  log(`\n📁 Collection: ${colors.bright}${collectionPath}${colors.reset}\n`);

  try {
    const snapshot = await db.collection(collectionPath).limit(limit).get();

    if (snapshot.empty) {
      logWarning(`Collection is empty or does not exist`);
      return;
    }

    logSuccess(`Found ${snapshot.size} document(s)${snapshot.size >= limit ? ` (limited to ${limit})` : ''}\n`);

    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      log(`${colors.bright}[${index + 1}] ${doc.id}${colors.reset}`);

      // Show key fields based on document type
      if (data.service) log(`    service: ${data.service}`);
      if (data.language) log(`    language: ${data.language}`);
      if (data.status) log(`    status: ${data.status}`);
      if (data.enabled !== undefined) log(`    enabled: ${data.enabled}`);
      if (data.version) log(`    version: ${data.version}`);
      if (data.createdAt) {
        const date = data.createdAt instanceof admin.firestore.Timestamp
          ? data.createdAt.toDate().toISOString()
          : data.createdAt;
        log(`    createdAt: ${date}`);
      }
      if (data.prompts) {
        const promptCount = Object.keys(data.prompts).length;
        log(`    prompts: ${promptCount} prompt(s)`);
      }
      log('');
    });
  } catch (error: any) {
    logError(`Failed to read collection: ${error.message}`);
  }
}

// Command: Check if a document exists
async function checkDocument(docPath: string, showFullData: boolean = false) {
  const db = admin.firestore();

  log(`\n📄 Document: ${colors.bright}${docPath}${colors.reset}\n`);

  try {
    const docRef = db.doc(docPath);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      logError(`Document does NOT exist`);
      return false;
    }

    logSuccess(`Document EXISTS`);

    const data = docSnap.data();
    if (data) {
      log(`\n${colors.bright}Data:${colors.reset}`);

      if (showFullData) {
        console.log(formatData(data));
      } else {
        // Show summary
        const keys = Object.keys(data);
        log(`  Fields: ${keys.length}`);
        keys.forEach(key => {
          const value = data[key];
          let summary = '';

          if (value === null || value === undefined) {
            summary = 'null';
          } else if (typeof value === 'string') {
            summary = `string (${value.length} chars)`;
          } else if (typeof value === 'number') {
            summary = `number: ${value}`;
          } else if (typeof value === 'boolean') {
            summary = `boolean: ${value}`;
          } else if (value instanceof admin.firestore.Timestamp) {
            summary = `timestamp: ${value.toDate().toISOString()}`;
          } else if (Array.isArray(value)) {
            summary = `array (${value.length} items)`;
          } else if (typeof value === 'object') {
            summary = `object (${Object.keys(value).length} keys)`;
          }

          log(`    ${colors.cyan}${key}${colors.reset}: ${summary}`);
        });

        log(`\n${colors.dim}Use --full flag to see complete data${colors.reset}`);
      }
    }

    return true;
  } catch (error: any) {
    logError(`Failed to read document: ${error.message}`);
    return false;
  }
}

// Command: Check prompt configs
async function checkPrompts(service?: string, language?: string) {
  const db = admin.firestore();

  log(`\n🔧 Checking Prompt Configs\n`);

  const languages = language ? [language] : ['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt'];

  if (service) {
    // Check specific service across languages
    log(`Service: ${colors.bright}${service}${colors.reset}\n`);

    for (const lang of languages) {
      const docPath = `promptConfigs/${lang}/services/${service}`;
      const docRef = db.doc(docPath);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        const data = docSnap.data();
        const promptCount = data?.prompts ? Object.keys(data.prompts).length : 0;
        logSuccess(`[${lang}] Found - ${promptCount} prompts, status: ${data?.status}, enabled: ${data?.enabled}`);
      } else {
        logError(`[${lang}] NOT FOUND`);
      }
    }
  } else {
    // List all services for specified language(s)
    for (const lang of languages) {
      log(`\n${colors.bright}Language: ${lang}${colors.reset}`);

      const servicesRef = db.collection(`promptConfigs/${lang}/services`);
      const snapshot = await servicesRef.get();

      if (snapshot.empty) {
        logWarning(`  No services found`);
        continue;
      }

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const promptCount = data.prompts ? Object.keys(data.prompts).length : 0;
        log(`  ${colors.green}✓${colors.reset} ${doc.id} - ${promptCount} prompts`);
      });
    }
  }
}

// Command: List all prompt services
async function listPromptServices() {
  const db = admin.firestore();

  log(`\n📋 All Prompt Services in Firestore\n`);

  const servicesFound: Map<string, string[]> = new Map();
  const languages = ['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt'];

  for (const lang of languages) {
    const servicesRef = db.collection(`promptConfigs/${lang}/services`);
    const snapshot = await servicesRef.get();

    snapshot.docs.forEach(doc => {
      const serviceName = doc.id;
      if (!servicesFound.has(serviceName)) {
        servicesFound.set(serviceName, []);
      }
      servicesFound.get(serviceName)!.push(lang);
    });
  }

  if (servicesFound.size === 0) {
    logWarning('No prompt services found in Firestore');
    return;
  }

  logSuccess(`Found ${servicesFound.size} service(s)\n`);

  // Sort services alphabetically
  const sortedServices = Array.from(servicesFound.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  sortedServices.forEach(([service, langs]) => {
    const langList = langs.sort().join(', ');
    log(`  ${colors.cyan}${service}${colors.reset}`);
    log(`    Languages: ${langList}`);
    log('');
  });
}

// Command: Count documents in a collection
async function countDocuments(collectionPath: string) {
  const db = admin.firestore();

  log(`\n📊 Counting: ${colors.bright}${collectionPath}${colors.reset}\n`);

  try {
    const snapshot = await db.collection(collectionPath).count().get();
    const count = snapshot.data().count;

    logSuccess(`Total documents: ${count}`);
  } catch (error: any) {
    // Fallback for older Firebase versions
    try {
      const snapshot = await db.collection(collectionPath).get();
      logSuccess(`Total documents: ${snapshot.size}`);
    } catch (fallbackError: any) {
      logError(`Failed to count: ${fallbackError.message}`);
    }
  }
}

// Command: Check subcollections
async function checkSubcollections(docPath: string) {
  const db = admin.firestore();

  log(`\n📂 Subcollections of: ${colors.bright}${docPath}${colors.reset}\n`);

  try {
    const docRef = db.doc(docPath);
    const collections = await docRef.listCollections();

    if (collections.length === 0) {
      logWarning('No subcollections found');
      return;
    }

    logSuccess(`Found ${collections.length} subcollection(s)\n`);

    for (const collection of collections) {
      const snapshot = await collection.limit(1).get();
      const hasData = !snapshot.empty;

      if (hasData) {
        const countSnap = await collection.get();
        log(`  ${colors.green}✓${colors.reset} ${collection.id} (${countSnap.size} docs)`);
      } else {
        log(`  ${colors.dim}○ ${collection.id} (empty)${colors.reset}`);
      }
    }
  } catch (error: any) {
    logError(`Failed to list subcollections: ${error.message}`);
  }
}

// Print usage
function printUsage() {
  console.log(`
${colors.bright}Firestore Diagnostic Script${colors.reset}

${colors.cyan}Usage:${colors.reset}
  npx tsx scripts/diagnostics/check-firestore.ts [command] [options]

${colors.cyan}Commands:${colors.reset}
  ${colors.bright}collection${colors.reset} <path> [--limit N]
    List documents in a collection
    Example: collection users --limit 10

  ${colors.bright}doc${colors.reset} <path> [--full]
    Check if a document exists and show its data
    Example: doc promptConfigs/en/services/ChatSuggestions --full

  ${colors.bright}prompts${colors.reset} [service] [language]
    Check prompt configs
    Example: prompts ChatSuggestions en
    Example: prompts (lists all services)

  ${colors.bright}prompt-services${colors.reset}
    List all prompt service documents across all languages

  ${colors.bright}count${colors.reset} <path>
    Count documents in a collection
    Example: count textNotes

  ${colors.bright}subcollections${colors.reset} <docPath>
    List subcollections of a document
    Example: subcollections promptConfigs/en

${colors.cyan}Examples:${colors.reset}
  # Check if ChatSuggestions exists
  npx tsx scripts/diagnostics/check-firestore.ts doc promptConfigs/en/services/ChatSuggestions

  # List all prompt services
  npx tsx scripts/diagnostics/check-firestore.ts prompt-services

  # Check prompts for a specific service
  npx tsx scripts/diagnostics/check-firestore.ts prompts ChatSuggestions

  # Count users
  npx tsx scripts/diagnostics/check-firestore.ts count users
`);
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    process.exit(0);
  }

  initFirebase();

  const command = args[0];

  switch (command) {
    case 'collection':
    case 'col':
      if (!args[1]) {
        logError('Collection path required');
        process.exit(1);
      }
      const limitIndex = args.indexOf('--limit');
      const limit = limitIndex !== -1 && args[limitIndex + 1] ? parseInt(args[limitIndex + 1]) : 20;
      await listCollection(args[1], limit);
      break;

    case 'doc':
    case 'document':
      if (!args[1]) {
        logError('Document path required');
        process.exit(1);
      }
      await checkDocument(args[1], args.includes('--full'));
      break;

    case 'prompts':
      await checkPrompts(args[1], args[2]);
      break;

    case 'prompt-services':
    case 'services':
      await listPromptServices();
      break;

    case 'count':
      if (!args[1]) {
        logError('Collection path required');
        process.exit(1);
      }
      await countDocuments(args[1]);
      break;

    case 'subcollections':
    case 'subcol':
      if (!args[1]) {
        logError('Document path required');
        process.exit(1);
      }
      await checkSubcollections(args[1]);
      break;

    default:
      logError(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
