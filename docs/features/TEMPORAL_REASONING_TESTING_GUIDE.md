# Temporal Reasoning Feature - Testing Guide

**Created:** December 27, 2025
**Status:** Ready for Testing
**Version:** 1.0.0

---

## Prerequisites

Before testing, ensure you have:
- ✅ Both repositories committed and pushed (personal-ai-web + PersonalAIApp)
- ✅ Development server running: `cd personal-ai-web && npm run dev`
- ✅ Firebase Firestore indexes deployed (already exists)
- ✅ OpenAI API key configured in `.env.local`
- ✅ Pinecone API key configured in `.env.local`
- ✅ User account created and authenticated

---

## Test Environment Setup

### 1. Start Development Server

```bash
cd /Users/lwang2/Documents/GitHub/ios/personal/personal-ai-web
npm run dev
```

**Expected:** Server starts at `http://localhost:3000`

### 2. Verify Environment Variables

Check `.env.local` file has:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_OPENAI_API_KEY=...
NEXT_PUBLIC_PINECONE_API_KEY=...
NEXT_PUBLIC_PINECONE_INDEX=personal-ai-data
```

### 3. Sign In

1. Navigate to `http://localhost:3000`
2. Sign in with Google
3. Verify you're redirected to `/dashboard`

---

## Test Scenario 1: "Yesterday" Query (Basic Test)

### Step 1: Create Test Data

**On Day 1 (e.g., Dec 27):**

1. Navigate to Dashboard (`/dashboard`)
2. Use "Quick Thought" to create a text note:
   ```
   I played badminton today. Had a great session at the club!
   ```
3. Click "Post"
4. Wait 3-5 seconds for embedding to process
5. Verify the note appears in "Recent Text Notes" with badge:
   - 🟡 "Processing..." → 🟢 "Indexed" (refresh if needed)

### Step 2: Check Cloud Function Execution

**Verify in Firebase Console:**

1. Go to Firebase Console → Firestore
2. Navigate to `textNotes` collection
3. Find your note document
4. Verify fields:
   - ✅ `userId`: your user ID
   - ✅ `createdAt`: timestamp from today
   - ✅ `embeddingId`: should have a value (e.g., `text_abc123`)
   - ✅ `embeddingCreatedAt`: timestamp

**Check Events Collection:**

1. Navigate to `events` collection in Firestore
2. Find event with `sourceId` matching your text note ID
3. Verify fields:
   - ✅ `userId`: your user ID
   - ✅ `datetime`: parsed date (should be Dec 27 if you wrote "today")
   - ✅ `title`: "Play badminton" or similar
   - ✅ `confidence`: 0.6-0.9
   - ✅ `sourceType`: "text"

### Step 3: Test Temporal Query

**On Day 2 (e.g., Dec 28):**

1. Navigate to Chat page (`/chat`)
2. Type: **"what did I do yesterday"**
3. Send message

**Expected Response:**
```
Yesterday (December 27, 2025), you played badminton. You mentioned having
a great session at the club.
```

### Step 4: Verify Console Logs

**Open browser DevTools (F12) → Console tab:**

Look for these log entries:

```
[RAGEngine] Query from user user_123: "what did I do yesterday"
[RAGEngine] Step 1: Parsing temporal intent...
[RAGEngine] ✓ Detected temporal query: "yesterday" (12/27/2025 - 12/27/2025)
[RAGEngine] Step 2: Calling OpenAI to generate embedding...
[RAGEngine] ✓ Embedding generated in 234ms (dimension: 1536)
[RAGEngine] Step 3: Querying Pinecone vector database...
[RAGEngine] ✓ Applying date filter to Pinecone query
[RAGEngine] ✓ Pinecone returned 3 relevant data points in 156ms
[RAGEngine] Step 4: Querying Firestore for extracted events...
[RAGEngine] ✓ Firestore returned 1 events in 87ms
[RAGEngine] Step 5: Building context from retrieved data...
[RAGEngine] ✓ Context built (length: 456 chars, 3 vectors, 1 events)
[RAGEngine] Step 6: Calling OpenAI GPT-4o for response...
[RAGEngine] ✓ GPT-4o responded in 892ms (length: 98 chars)
[RAGEngine] Query complete. Used 3 context references (temporal: yesterday)
```

**Key indicators of success:**
- ✅ "Detected temporal query: 'yesterday'"
- ✅ "Applying date filter to Pinecone query"
- ✅ "Firestore returned X events" (X > 0)
- ✅ "Building context from retrieved data... X vectors, Y events"

---

## Test Scenario 2: "Day Before Yesterday" Query

### Step 1: Create Test Data

**On Day 1 (e.g., Dec 26):**

Create a text note:
```
Went to the gym in the morning. Did a full body workout for 90 minutes.
```

### Step 2: Test Query

**On Day 3 (e.g., Dec 28):**

Ask: **"what did I do the day before yesterday"**

**Expected Response:**
```
The day before yesterday (December 26, 2025), you went to the gym in the
morning and did a full body workout for 90 minutes.
```

**Verify Console:**
```
[RAGEngine] ✓ Detected temporal query: "day before yesterday" (12/26/2025 - 12/26/2025)
```

---

## Test Scenario 3: "Last Week" Query

### Step 1: Create Test Data

**Throughout the week:**

Create multiple text notes on different days:
- Dec 20: "Monday meeting with team about Q1 goals"
- Dec 21: "Worked on project documentation all day"
- Dec 23: "Weekend hike at Point Reyes, 10 miles"
- Dec 24: "Christmas Eve dinner with family"

### Step 2: Test Query

**On Dec 28 (or later):**

Ask: **"what did I do last week"**

**Expected Response:**
```
Last week (December 20-26, 2025), you:
- Had a Monday meeting with your team about Q1 goals
- Worked on project documentation
- Went on a 10-mile weekend hike at Point Reyes
- Had Christmas Eve dinner with family
```

**Verify Console:**
```
[RAGEngine] ✓ Detected temporal query: "last week" (12/20/2025 - 12/26/2025)
[RAGEngine] ✓ Pinecone returned X relevant data points
[RAGEngine] ✓ Firestore returned Y events
```

---

## Test Scenario 4: Non-Temporal Query (Control)

### Test Query

Ask: **"how many times did I play badminton"**

**Expected Behavior:**
- ❌ No temporal intent detected
- ✅ Standard semantic search (no date filter)
- ✅ Returns all badminton activities regardless of date

**Verify Console:**
```
[RAGEngine] Step 1: Parsing temporal intent...
[RAGEngine] ✓ No temporal intent detected
[RAGEngine] Step 2: Calling OpenAI to generate embedding...
[RAGEngine] Step 3: Querying Pinecone vector database...
[RAGEngine] ✓ Pinecone returned 10 relevant data points in 142ms
[RAGEngine] Step 4: Building context from retrieved data...
[RAGEngine] ✓ Context built (length: 1,567 chars, 10 vectors, 0 events)
```

**Notice:** No "Step 4: Querying Firestore for extracted events"

---

## Test Scenario 5: Multiple Temporal Patterns

Test all supported patterns:

| Query | Expected Date Range | Expected Detection |
|-------|-------------------|-------------------|
| "what did I do today" | Today 00:00 - 23:59 | "today" |
| "show me yesterday's activities" | Yesterday 00:00 - 23:59 | "yesterday" |
| "3 days ago" | 3 days ago 00:00 - 23:59 | "3 days ago" |
| "this week" | This Mon - This Sun | "this week" |
| "last week" | Last Mon - Last Sun | "last week" |
| "this month" | Month start - Month end | "this month" |
| "last month" | Last month start - end | "last month" |
| "this year" | Jan 1 - Dec 31 | "this year" |

**For each query:**
1. Send the query in chat
2. Check console for: `✓ Detected temporal query: "<pattern>"`
3. Verify date range matches expectations
4. Verify response includes activities from that date range only

---

## Troubleshooting Test Failures

### Issue 1: No Temporal Intent Detected

**Symptoms:**
```
[RAGEngine] ✓ No temporal intent detected
```

**Possible Causes:**
1. Query doesn't match regex patterns
2. Typo in query (e.g., "yesturday" instead of "yesterday")

**Solutions:**
- Try exact phrases: "yesterday", "last week", "3 days ago"
- Check `parseTemporalIntent()` in RAGEngine.server.ts for supported patterns

---

### Issue 2: No Events Returned

**Symptoms:**
```
[RAGEngine] ✓ Firestore returned 0 events
```

**Possible Causes:**
1. Cloud Function didn't extract events
2. Events exist but with different datetime
3. Firestore index not working

**Debug Steps:**

1. **Check if events exist:**
   ```bash
   # Firebase Console → Firestore → events collection
   # Filter: userId == <your_user_id>
   # Check: Are there documents?
   ```

2. **Verify event datetime:**
   - Events should have `datetime` field with ISO string
   - Check if datetime falls within query date range

3. **Test Firestore query directly:**
   ```typescript
   // In browser console (after authentication)
   const userId = '<your_user_id>';
   const startDate = new Date('2025-12-27T00:00:00Z');
   const endDate = new Date('2025-12-27T23:59:59Z');

   const response = await fetch('/api/test-events', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ userId, startDate, endDate })
   });
   const data = await response.json();
   console.log('Events:', data);
   ```

---

### Issue 3: Embedding Not Generated

**Symptoms:**
- Text note shows "Processing..." badge forever
- Firestore document has no `embeddingId`

**Possible Causes:**
1. Cloud Function failed
2. OpenAI API key invalid
3. Pinecone API key invalid
4. Null metadata values

**Debug Steps:**

1. **Check Cloud Function logs:**
   ```bash
   cd /Users/lwang2/Documents/GitHub/ios/personal/PersonalAIApp
   firebase functions:log --only textNoteCreated
   ```

2. **Check Firestore document:**
   - Look for `embeddingError` field
   - Look for `embeddingErrorAt` timestamp

3. **Common errors:**
   - "Metadata value must be a string..." → Null values (already fixed)
   - "Invalid API key" → Check Firebase Functions environment variables
   - "Quota exceeded" → OpenAI rate limits

---

### Issue 4: Wrong Date in Response

**Symptoms:**
- Query "yesterday" but GPT-4 says "today"
- Dates are off by one day

**Possible Causes:**
1. Timezone mismatch (UTC vs local time)
2. Event datetime parsed incorrectly
3. Date display formatting issue

**Debug Steps:**

1. **Check timezone handling:**
   ```typescript
   // In parseTemporalIntent()
   const today = new Date(); // Should use local timezone
   console.log('Today:', today.toISOString());
   console.log('Local date:', today.toLocaleDateString());
   ```

2. **Verify event datetime:**
   - Check Firestore event `datetime` field
   - Compare with text note `createdAt` field
   - Should match the date mentioned in text

3. **Check date display in context:**
   - Open Network tab in DevTools
   - Find request to `/api/chat`
   - Check response → context string
   - Verify dates are displayed correctly

---

## Performance Benchmarks

### Expected Timings (Temporal Query)

| Step | Expected Time | Notes |
|------|--------------|-------|
| 1. Parse temporal intent | ~5ms | Regex matching |
| 2. Generate embedding | ~200-300ms | OpenAI API |
| 3. Query Pinecone | ~100-200ms | With date filter |
| 4. Query Firestore events | ~50-100ms | Indexed query |
| 5. Build context | ~10-20ms | String formatting |
| 6. GPT-4o completion | ~800-1500ms | Response generation |
| **Total** | **~1.2-2.1 seconds** | End-to-end |

**Overhead:** Temporal reasoning adds ~100-200ms compared to non-temporal queries

### Expected Timings (Non-Temporal Query)

| Step | Expected Time |
|------|--------------|
| Embedding | ~200-300ms |
| Pinecone | ~100-200ms |
| Build context | ~10-20ms |
| GPT-4o | ~800-1500ms |
| **Total** | **~1.1-2.0 seconds** |

---

## Success Criteria

✅ **Feature is working correctly if:**

1. **Temporal intent detection:**
   - Console shows "Detected temporal query" for temporal patterns
   - Console shows "No temporal intent detected" for non-temporal queries

2. **Date filtering:**
   - Console shows "Applying date filter to Pinecone query"
   - Pinecone returns fewer results (filtered by date)

3. **Events integration:**
   - Console shows "Firestore returned X events" (X > 0)
   - Context includes events with date timestamps

4. **Accurate responses:**
   - GPT-4o correctly identifies the date range
   - Response mentions activities from that specific time period
   - No activities from outside the date range are mentioned

5. **Performance:**
   - Total query time under 2.5 seconds
   - No errors in console logs

---

## Next Steps After Testing

Once testing is complete and successful:

1. ✅ **Document test results** in this file
2. ✅ **Update CLAUDE.md** with testing completion note
3. ✅ **Create GitHub issue** if bugs found
4. ✅ **Plan production deployment** (if using Vercel)
5. ✅ **Monitor production logs** for errors

---

## Test Results Log

**Date:** _________________
**Tester:** _________________
**Environment:** Development / Staging / Production

### Test Case Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| Yesterday query | ⬜ Pass / ⬜ Fail | |
| Day before yesterday | ⬜ Pass / ⬜ Fail | |
| Last week query | ⬜ Pass / ⬜ Fail | |
| Non-temporal query | ⬜ Pass / ⬜ Fail | |
| Multiple patterns | ⬜ Pass / ⬜ Fail | |

### Performance Metrics

- Average temporal query time: _______ ms
- Average non-temporal query time: _______ ms
- Events retrieved per query: _______
- Errors encountered: _______

### Issues Found

1. _______________________________
2. _______________________________
3. _______________________________

### Recommendations

_______________________________
_______________________________
_______________________________

---

**Document Version:** 1.0.0
**Last Updated:** December 27, 2025
**Maintained By:** Claude Code
