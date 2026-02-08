# Regression Tests

## Event Date Extraction Test

Tests that voice notes with past temporal references are correctly indexed with `eventTimestampMs` and can be found by temporal queries.

**What it tests:**
1. Voice note with "昨天" (yesterday) → `eventTimestampMs` should be yesterday's date
2. Voice note with "前天" (day before yesterday) → `eventTimestampMs` should be 2 days ago
3. Voice note with "今天" (today) → `eventTimestampMs` should be today's date
4. Temporal queries find notes by `eventTimestampMs`, not just `timestampMs`

**Prerequisites:**
1. Deploy the latest Cloud Functions (from PersonalAIApp):
   ```bash
   cd ../PersonalAIApp/firebase
   firebase deploy --only functions:voiceNoteCreated,functions:textNoteCreated,functions:queryRAG
   ```

2. Ensure environment variables are set in `.env.local`:
   ```bash
   NEXT_PUBLIC_PINECONE_API_KEY=your-pinecone-api-key
   NEXT_PUBLIC_PINECONE_INDEX=personal-ai-data
   TEST_USER_ID=your-test-user-id  # Optional, defaults to 'test-regression-user'
   ```

3. Set up Firebase Admin credentials:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
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

📝 Test Case 1: Voice note with "yesterday" reference
  ℹ Today: 2026-02-08, Yesterday: 2026-02-07
  ℹ Creating test voice note...
  ✓ Embedding created
  ✓ Vector stored in Pinecone
  ✓ eventTimestampMs correctly set to yesterday
  ✓ Query for yesterday finds the note
  ✓ Query for today (strict) does NOT find the note

📝 Test Case 2: Voice note with "前天" (day before yesterday) reference
  ...

📝 Test Case 3: Voice note with "today" reference
  ...

============================================================
  Test Summary
============================================================

  Total: 9
  Passed: 9
  Failed: 0
```

**Troubleshooting:**

- **"Vector not found in Pinecone"**: The Cloud Function may not have processed the voice note yet. Increase `WAIT_TIME_MS` in the script.
- **"embeddingId not found"**: Check Cloud Function logs for errors: `firebase functions:log --only voiceNoteCreated`
- **Date mismatch**: The temporal parser may not have correctly identified the Chinese date reference. Check the `extractEventDate` implementation.
