# Integration Tests

This folder contains integration/regression tests that verify end-to-end functionality across Firebase, Pinecone, and Cloud Functions.

## Available Tests

| Test | Command | Description |
|------|---------|-------------|
| Event Date Extraction | `npm run test:event-date` | Tests temporal references in voice notes |

---

## Event Date Extraction Test

Tests that voice notes with past temporal references are correctly indexed with `eventTimestampMs` and can be found by temporal queries.

**What it tests:**
1. Voice note with "昨天" (yesterday) → `eventTimestampMs` should be yesterday's date
   - Also verifies: query for yesterday finds note, note contains "牛排", query for today excludes note
2. Voice note with "前天" (day before yesterday) → `eventTimestampMs` should be 2 days ago
3. Voice note with "今天" (today) → `eventTimestampMs` should be today's date

**Prerequisites:**
1. Deploy the latest Cloud Functions (from PersonalAIApp):
   ```bash
   cd ../PersonalAIApp/firebase
   firebase deploy --only functions:voiceNoteCreated,functions:textNoteCreated,functions:queryRAG
   ```

2. Ensure environment variables are set in `.env.local`:
   ```bash
   PINECONE_API_KEY=your-pinecone-api-key
   NEXT_PUBLIC_PINECONE_INDEX=personal-ai-data
   ```

   **Test User:** The script automatically creates an integration test user (`integration-test@personalai.local`) if it doesn't exist. No manual user setup required.

3. Set up Firebase Admin credentials (one of these options):

   **Option A:** Service account JSON file (recommended)
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
   ```

   **Option B:** Service account JSON string in `.env.local`
   ```bash
   FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
   ```

   **Option C:** Project ID with gcloud auth (requires `gcloud auth application-default login`)
   ```bash
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   ```

**Running the test:**
```bash
cd personal-ai-web
npm run test:event-date
```

**Expected output:**
```
============================================================
  Event Date Extraction - Regression Tests
============================================================

Pinecone Index: personal-ai-data
Wait Time: 15s per test

✓ Firebase and Pinecone initialized
✓ Test user ready: abc123xyz...

Test User ID: abc123xyz...

📝 Test Case 1: Voice note with "yesterday" reference (昨天我煎了牛排)
  ℹ Today: 2026-02-08, Yesterday: 2026-02-07
  ℹ Creating test voice note...
  ✓ Embedding created
  ✓ Vector stored in Pinecone
  ✓ eventTimestampMs correctly set to yesterday
  ✓ Query for yesterday finds the note
  ✓ Found note contains "牛排"
  ✓ Query for today (strict) does NOT find the note

📝 Test Case 2: Voice note with "前天" (day before yesterday) reference
  ...

📝 Test Case 3: Voice note with "今天" (today) reference
  ...

============================================================
  Test Summary
============================================================

  Total: 10
  Passed: 10
  Failed: 0
```

**Troubleshooting:**

- **"Unable to detect a Project Id"**: Firebase Admin SDK credentials not configured. Set one of the authentication options above (Option A, B, or C).
- **"Vector not found in Pinecone"**: The Cloud Function may not have processed the voice note yet. Increase `WAIT_TIME_MS` in the script.
- **"embeddingId not found"**: Check Cloud Function logs for errors: `firebase functions:log --only voiceNoteCreated`
- **Date mismatch**: The temporal parser may not have correctly identified the Chinese date reference. Check the `extractEventDate` implementation.
- **Found note missing "牛排"**: Check that the Cloud Function is correctly storing the text in Pinecone metadata.
