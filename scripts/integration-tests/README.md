# Integration Tests

This folder contains integration/regression tests that verify end-to-end functionality across Firebase, Pinecone, and Cloud Functions.

## Quick Start

```bash
# Run all integration tests
npm test

# Run tests matching a filter
npm test -- --filter event-date

# Run with verbose output
npm test -- --verbose
```

## Architecture

```
scripts/integration-tests/
├── run-all.ts              # Main entry point
├── lib/                    # Shared utilities
│   ├── test-runner.ts      # Test discovery & orchestration
│   ├── test-utils.ts       # Common helpers (wait, dates, etc.)
│   ├── firebase-setup.ts   # Firebase Admin initialization
│   ├── pinecone-setup.ts   # Pinecone initialization
│   └── reporter.ts         # Console reporting utilities
├── tests/                  # Individual test files
│   └── event-date-extraction.test.ts
└── README.md
```

## Adding New Tests

1. Create a new file in `tests/` with the `.test.ts` extension:

```typescript
// tests/my-feature.test.ts
import type { TestResult } from '../lib/test-utils';
import { generateTestId, wait } from '../lib/test-utils';
import { logPass, logFail, logInfo, logTestCase } from '../lib/reporter';

// Test name for discovery
export const name = 'My Feature';

// Main test runner - exported for test discovery
export async function run(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const { db, pinecone, userId, pineconeIndex, waitTimeMs } = globalThis.testContext;

  logTestCase('Test Case 1: Description');

  try {
    // Your test logic here
    logPass('Something worked');
    results.push({ name: 'Something worked', passed: true });
  } catch (error: any) {
    logFail('Something worked', error.message);
    results.push({ name: 'Something worked', passed: false, reason: error.message });
  }

  return results;
}
```

2. The test will be automatically discovered and run when you execute `npm test`

## Test Context

All tests have access to a global test context:

```typescript
globalThis.testContext = {
  db: admin.firestore.Firestore,  // Firebase Admin Firestore instance
  pinecone: Pinecone,             // Pinecone client instance
  userId: string,                 // Test user's Firebase UID
  projectId: string,              // Firebase project ID
  region: string,                 // Firebase region (e.g., 'us-central1')
  pineconeIndex: string,          // Pinecone index name
  waitTimeMs: number,             // Default wait time for Cloud Functions (15s)
};
```

## Available Utilities

### test-utils.ts

```typescript
import {
  generateTestId,        // Generate unique test ID
  getDateNDaysAgo,       // Get YYYY-MM-DD string for N days ago
  getTimestampForDate,   // Get timestamp for a date at noon UTC
  getStartOfDay,         // Get timestamp for start of day
  getEndOfDay,           // Get timestamp for end of day
  wait,                  // Async wait/sleep
} from '../lib/test-utils';
```

### reporter.ts

```typescript
import {
  log,                   // Log message with optional color
  logPass,               // Log passing test (green checkmark)
  logFail,               // Log failing test (red X)
  logInfo,               // Log info message (cyan)
  logTestCase,           // Log test case header
  logQueryBox,           // Log boxed query visualization
  logCleanup,            // Log cleanup section
  logCleanupResult,      // Log cleanup result
  colors,                // ANSI color codes
} from '../lib/reporter';
```

## Available Tests

| Test | Filter | Description |
|------|--------|-------------|
| Event Date Extraction | `event-date` | Tests temporal references in voice notes |
| Life Feed Rich Content | `life-feed-rich` | Tests that Life Feed uses actual content (not just counts) |
| Embedding Pipeline | `embedding` | Tests embedding generation pipeline |
| Insights Orchestrator | `insights` | Tests the insights generation orchestrator |
| Memory Normalized Content | `memory-normalized` | Tests memory generation with normalized content |
| RAG Engine | `rag-engine` | Tests RAG query functionality |
| Temporal Parser | `temporal-parser` | Tests deployed temporal parser |
| Temporal RAG Query | `temporal-rag` | Tests RAG with temporal filters |

---

## Life Feed Rich Content Test

Tests that the Life Feed generator uses actual content from voice notes, text notes, and photos rather than just counts/statistics.

**What it tests:**
1. **Algorithm config** - Verifies `config/lifeFeedAlgorithm` document exists and has valid scoring parameters
2. **Content scoring** - Tests that items are scored based on recency, content length, sentiment, and tags
3. **Posts contain rich content** - Analyzes existing posts for specific content vs generic counts
4. **Normalized content usage** - Verifies normalized transcription/content fields are used
5. **END-TO-END generation** - Creates test data with unique phrases, triggers generation, verifies content

**Run it:**
```bash
npm test -- --filter life-feed-rich
```

### Cloud Function Authentication

**IMPORTANT:** The E2E test calls the `generateLifeFeedNow` Cloud Function, NOT `generateLifeFeedPosts`.

| Function | Type | How to Call |
|----------|------|-------------|
| `generateLifeFeedPosts` | `onSchedule` (cron) | Cannot be called directly - only runs on schedule |
| `generateLifeFeedNow` | `onCall` | HTTP callable with Firebase Auth token |

**Calling onCall functions from tests:**
```typescript
const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/generateLifeFeedNow`;

const response = await fetch(functionUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`,  // Firebase ID token
  },
  body: JSON.stringify({
    data: {},  // onCall functions get userId from request.auth.uid
  }),
});
```

**Key differences:**
- `onSchedule` functions cannot be called directly via HTTP
- `onCall` functions require Firebase Auth token in Authorization header
- `onCall` functions automatically get the user from `request.auth.uid` (no need to pass userId)

---

## Event Date Extraction Test

Tests that voice notes with past temporal references are correctly indexed with `eventTimestampMs` and can be found by temporal queries.

**What it tests:**
1. Voice note with "昨天" (yesterday) → `eventTimestampMs` should be yesterday's date
   - Also verifies: query for yesterday finds note, note contains "牛排", query for today excludes note
2. Voice note with "前天" (day before yesterday) → `eventTimestampMs` should be 2 days ago
3. Voice note with "今天" (today) → `eventTimestampMs` should be today's date
4. RAG Query with temporal filter → tests lowered minScore for temporal queries

**Run it:**
```bash
npm test -- --filter event-date
```

---

## Prerequisites

### 1. Deploy Cloud Functions

From the PersonalAIApp directory:
```bash
cd ../PersonalAIApp/firebase
firebase deploy --only functions:voiceNoteCreated,functions:textNoteCreated,functions:queryRAG
```

### 2. Environment Variables

Ensure these are set in `.env.local`:
```bash
PINECONE_API_KEY=your-pinecone-api-key
NEXT_PUBLIC_PINECONE_INDEX=personal-ai-data
```

### 3. Firebase Admin Credentials

Choose one of these options:

**Option A: Service account JSON file (recommended)**
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
```

**Option B: Service account JSON string in .env.local**
```bash
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
```

**Option C: Project ID with gcloud auth**
```bash
# First run: gcloud auth application-default login
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

**Test User:** The script automatically creates an integration test user (`integration-test@personalai.local`) if it doesn't exist.

---

## Expected Output

```
============================================================
  Integration Test Runner
============================================================

Pinecone Index: personal-ai-data
Wait Time: 15s per test

✓ Firebase and Pinecone initialized
✓ Test user ready: abc123xyz...

Test User ID: abc123xyz...

Found 1 test file(s):
  - event-date-extraction.test.ts

📝 Test Case 1: Voice note with "yesterday" reference
  ℹ Today: 2026-02-08, Yesterday: 2026-02-07
  ℹ Creating test voice note...
  ✓ Embedding created
  ✓ Vector stored in Pinecone
  ✓ eventTimestampMs correctly set to yesterday
  ✓ Query for yesterday finds the note
  ✓ Found note contains "牛排"
  ✓ Query for today (strict) does NOT find the note

📝 Test Case 2: Voice note with "前天" (day before yesterday) reference
  ℹ Day before yesterday: 2026-02-06
  ...

📝 Test Case 3: Voice note with "今天" (today) reference
  ...

📝 Test Case 4: RAG Query with temporal filter (lowered minScore)
  ...

✓ event-date-extraction (62.5s) - 10/10 passed

============================================================
  Test Summary
============================================================

  Total: 10
  Passed: 10
  Failed: 0
```

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Unable to detect a Project Id" | Firebase Admin SDK credentials not configured. Set one of the authentication options above. |
| "Vector not found in Pinecone" | Cloud Function may not have processed the voice note yet. Increase wait time in `run-all.ts`. |
| "embeddingId not found" | Check Cloud Function logs: `firebase functions:log --only voiceNoteCreated` |
| "Date mismatch" | The temporal parser may not have correctly identified the Chinese date reference. Check `extractEventDate` implementation. |
| "No tests found" | Ensure test files are in `tests/` directory and end with `.test.ts` |

---

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

---

## Cloud Function Types Reference

When writing integration tests that call Cloud Functions, it's important to understand the different function types:

### onSchedule (Scheduled/Cron)

```typescript
// firebase/functions/src/index.ts
export const generateLifeFeedPosts = onSchedule('every 4 hours', async () => {
  // Runs on schedule, no HTTP endpoint
});
```

- **Cannot** be called directly via HTTP
- Only runs on the configured schedule
- No authentication context available
- Use for background batch processing

### onCall (HTTP Callable)

```typescript
// firebase/functions/src/index.ts
export const generateLifeFeedNow = onCall(async (request) => {
  const userId = request.auth?.uid;  // User from Firebase Auth token
  // ...
});
```

- **Can** be called via HTTP with auth token
- User identity available from `request.auth.uid`
- Use for user-initiated actions in integration tests

### Calling onCall Functions from Tests

```typescript
// Get the test context (setup in run-all.ts)
const { idToken, projectId, region } = globalThis.testContext;

// Build the function URL
const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/yourFunctionName`;

// Call with auth token
const response = await fetch(functionUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`,
  },
  body: JSON.stringify({
    data: { /* your params */ },
  }),
});

// Parse response
const result = await response.json();
```

### Available Cloud Functions for Testing

| Function | Type | Purpose |
|----------|------|---------|
| `generateLifeFeedNow` | onCall | Generate life feed posts for authenticated user |
| `queryRAG` | onCall | Query RAG engine |
| `generateDailySummary` | onCall | Generate daily summary |
| `generateLifeFeedPosts` | onSchedule | (Cannot test directly) |
| `processInsights` | onSchedule | (Cannot test directly) |
