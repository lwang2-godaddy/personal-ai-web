/**
 * Diagnostic script: check actual field types for date fields across collections
 *
 * Collections checked:
 * - healthData (startDate)
 * - voiceNotes (createdAt)
 * - textNotes (createdAt)
 * - locationData (timestamp)
 */
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccountKey)),
  });
}

const db = admin.firestore();

interface CollectionCheck {
  collection: string;
  dateField: string;
}

const collectionsToCheck: CollectionCheck[] = [
  { collection: 'healthData', dateField: 'startDate' },
  { collection: 'voiceNotes', dateField: 'createdAt' },
  { collection: 'textNotes', dateField: 'createdAt' },
  { collection: 'locationData', dateField: 'timestamp' },
];

function analyzeValue(value: any, fieldName: string): void {
  console.log(`    ${fieldName}:`);
  console.log(`      value: ${JSON.stringify(value)}`);
  console.log(`      typeof: ${typeof value}`);
  console.log(`      constructor name: ${value?.constructor?.name ?? 'N/A'}`);
  console.log(`      instanceof Timestamp: ${value instanceof admin.firestore.Timestamp}`);
  console.log(`      has toDate(): ${typeof value?.toDate === 'function'}`);
  console.log(`      is string: ${typeof value === 'string'}`);
  console.log(`      is number: ${typeof value === 'number'}`);

  if (value instanceof admin.firestore.Timestamp) {
    console.log(`      → FIRESTORE TIMESTAMP`);
    console.log(`      toDate(): ${value.toDate().toISOString()}`);
    console.log(`      seconds: ${value.seconds}`);
    console.log(`      nanoseconds: ${value.nanoseconds}`);
  } else if (typeof value === 'string') {
    console.log(`      → STRING`);
    const parsed = new Date(value);
    console.log(`      parsed as Date: ${parsed.toISOString()} (valid: ${!isNaN(parsed.getTime())})`);
  } else if (typeof value === 'number') {
    console.log(`      → NUMBER`);
    console.log(`      as Date (ms): ${new Date(value).toISOString()}`);
  } else if (value && typeof value === 'object' && typeof value.toDate === 'function') {
    console.log(`      → TIMESTAMP-LIKE OBJECT (duck-type match)`);
    console.log(`      toDate(): ${value.toDate().toISOString()}`);
  } else {
    console.log(`      → UNKNOWN TYPE`);
  }
}

async function diagnoseCollection(check: CollectionCheck): Promise<void> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Collection: ${check.collection} | Date field: ${check.dateField}`);
  console.log('='.repeat(70));

  try {
    const snapshot = await db.collection(check.collection).limit(2).get();

    if (snapshot.empty) {
      console.log('  (no documents found)');
      return;
    }

    console.log(`  Found ${snapshot.size} document(s):\n`);

    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`  --- Document ${index + 1} ---`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  userId: ${data.userId ?? '(not set)'}`);

      // Analyze the primary date field
      const dateValue = data[check.dateField];
      if (dateValue !== undefined) {
        analyzeValue(dateValue, check.dateField);
      } else {
        console.log(`    ${check.dateField}: (field not present on document)`);
      }

      // Also check other common date fields for completeness
      const otherDateFields = ['createdAt', 'updatedAt', 'startDate', 'endDate', 'timestamp', 'syncedAt'];
      const checked = new Set([check.dateField]);
      otherDateFields.forEach((field) => {
        if (!checked.has(field) && data[field] !== undefined) {
          checked.add(field);
          analyzeValue(data[field], `${field} (additional)`);
        }
      });

      // Log all top-level field names and their types for reference
      console.log(`    All fields: ${Object.keys(data).join(', ')}`);
      console.log('');
    });
  } catch (error: any) {
    console.error(`  ERROR querying ${check.collection}: ${error.message}`);
  }
}

async function main(): Promise<void> {
  console.log('Firestore Date Field Type Diagnostic');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '(unknown)'}`);

  for (const check of collectionsToCheck) {
    await diagnoseCollection(check);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('Diagnostic complete.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
