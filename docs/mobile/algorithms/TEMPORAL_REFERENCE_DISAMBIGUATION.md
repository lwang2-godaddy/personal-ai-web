# Temporal Reference Disambiguation Algorithm

**Status:** Implemented
**Implementation Date:** February 2025
**Version:** 1.0.0
**Location:** `PersonalAIApp/firebase/functions/src/services/TemporalParserService.ts`

---

## Patent Title (Draft)

"System and Method for Temporal Reference Disambiguation in Personal Knowledge Base Systems"

---

## Abstract

A method and system for resolving relative temporal references (e.g., "today", "yesterday", "this week", "今天", "昨天") in user-generated content within a personal knowledge base. The system comprises two complementary components:

1. **Index-Time Normalization Process:** Converts relative temporal references to absolute dates when content is created, preserving the original text for display while storing a normalized version for AI processing.

2. **Query-Time Filtering Mechanism:** Parses user queries for temporal references and applies appropriate date filters to semantic search operations.

---

## Technical Problem Solved

In personal knowledge management systems that store user-generated content (voice notes, diaries, journals), users frequently use relative temporal references such as "today" or "yesterday" when recording information.

### Problem 1: Query-Time Ambiguity

When a user queries "what did I do today?", semantic similarity matching may retrieve old entries containing the word "today" because the literal text "today" in historical entries semantically matches the query, even though those entries refer to past dates.

### Problem 2: Generation-Time Ambiguity

When ANY AI feature (Life Feed, Fun Facts, Daily Summary, Memory Generator, Sentiment Analysis, etc.) reads historical notes containing "today", the AI doesn't know the actual date the content was created. This causes incorrect content generation, such as:

- Life Feed saying "You played badminton today" for an entry from last week
- Fun Facts incorrectly comparing "today's" data across multiple entries
- Daily Summary mixing up temporal contexts

### Root Cause

- **At Index Time:** Temporal references are stored literally ("today") instead of being normalized to actual dates ("February 7, 2025")
- **At Query Time:** No temporal parsing in RAG queries means Pinecone date filters are unused

---

## Novel Approach

### 1. Dual-Storage Architecture

Store both original content (for user display) and temporally-normalized content (for AI processing):

```
Firestore Document Structure:
{
  transcription: "today I played badminton",          // Original for display
  normalizedTranscription: "on February 7, 2025, I played badminton",  // For AI
  temporalNormalized: true
}
```

### 2. LLM-Based Temporal Parsing

Use language models (GPT-4o-mini) to detect and resolve temporal references in a **language-agnostic manner**:

- Works with English: "today", "yesterday", "this week", "last month"
- Works with Chinese: "今天", "昨天", "这周", "上个月"
- Works with any language GPT understands

### 3. Universal Content Reader Pattern

A single utility function (`getTextForAI()`) used by ALL AI services to automatically retrieve normalized content:

```typescript
// ALL AI services use this:
import { getTextForAI } from '../utils/contentReader';
const text = getTextForAI(voiceNote);  // Returns normalizedTranscription if available
```

Benefits:
- Future AI features automatically get normalized text
- Single source of truth for content reading
- Backward compatible (falls back to original if no normalized version)

### 4. Hybrid Query Processing

Combine semantic search (embeddings) with temporal filtering (metadata) for accurate retrieval:

```typescript
// Query with temporal filter
const filter = {
  $and: [
    { userId: userId },
    { createdAt: { $gte: startDate, $lte: endDate } }
  ]
};
const results = await pinecone.query({ vector, filter, topK });
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PART 1: INDEX-TIME NORMALIZATION                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  When voice note/text note is CREATED:                                   │
│                                                                          │
│  Input: "today I played badminton"                                       │
│    │                                                                     │
│    ▼                                                                     │
│  TemporalParserService.normalizeText()                                   │
│    │                                                                     │
│    ▼                                                                     │
│  GPT-4o-mini (LLM-based, language-agnostic)                             │
│    │                                                                     │
│    ▼                                                                     │
│  Output: "on February 7, 2025, I played badminton"                      │
│    │                                                                     │
│    ▼                                                                     │
│  Store: { transcription: original, normalizedTranscription: output }     │
│    │                                                                     │
│    ▼                                                                     │
│  Generate embedding from normalizedTranscription                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  PART 2: UNIVERSAL CONTENT READER                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  ALL AI services use getTextForAI() to read content:                     │
│                                                                          │
│  - Life Feed Generator                                                   │
│  - Fun Facts Generator                                                   │
│  - Daily Summary Service                                                 │
│  - Memory Generator                                                      │
│  - Sentiment Analysis                                                    │
│  - Topic Classifier                                                      │
│  - Entity Extraction                                                     │
│  - Event Extraction                                                      │
│  - Related Memories                                                      │
│  - RAG Context Building                                                  │
│                                                                          │
│  getTextForAI() automatically returns normalized text if available       │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  PART 3: QUERY-TIME FILTERING                                            │
├─────────────────────────────────────────────────────────────────────────┤
│  When user QUERIES "what did I do today?":                               │
│                                                                          │
│  Input: "what did I do today?" / "今天我做了什么？"                       │
│    │                                                                     │
│    ▼                                                                     │
│  TemporalParserService.parse()                                          │
│    │                                                                     │
│    ▼                                                                     │
│  GPT-4o-mini extracts: { startDate: "2025-02-07", endDate: "2025-02-07" }│
│    │                                                                     │
│    ▼                                                                     │
│  Pinecone query with userId + date filter                               │
│    │                                                                     │
│    ▼                                                                     │
│  Results filtered to today's data only                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Claims (Draft)

### Claim 1: Index-Time Temporal Normalization
A method for normalizing temporal references in user-generated content at index time, comprising:
- Detecting relative temporal references in text content
- Resolving references to absolute dates using the content creation timestamp
- Storing both original and normalized versions of the content
- Using the normalized version for AI processing and embedding generation

### Claim 2: Dual-Version Content Storage
A system for storing dual versions of user-generated content comprising:
- An original version preserving the user's exact input for display purposes
- A normalized version with temporal references resolved to absolute dates
- A flag indicating normalization status
- Automatic fallback to original when normalized version is unavailable

### Claim 3: Universal Content Reader Pattern
A utility function for AI services to read user content comprising:
- Automatic selection of normalized content when available
- Transparent fallback to original content
- Single interface for all AI services ensuring consistency
- Forward compatibility for new AI features

### Claim 4: Query-Time Temporal Filtering
A method for processing queries with temporal references comprising:
- Language-agnostic detection of temporal expressions using LLM
- Resolution of relative references to date ranges based on user timezone
- Application of date filters to semantic search operations
- Graceful fallback to unfiltered search when temporal filter yields no results

### Claim 5: LLM-Based Language-Agnostic Parsing
A system for temporal reference parsing comprising:
- Use of language models (LLM) for detection and resolution
- Support for multiple natural languages without explicit rules
- JSON-structured output for reliable parsing
- Caching of common temporal patterns for efficiency

---

## Temporal Patterns Supported

| Pattern | English | Chinese | Resolution |
|---------|---------|---------|------------|
| Today | "today" | "今天" | Current date |
| Yesterday | "yesterday" | "昨天" | Current date - 1 |
| This week | "this week" | "这周" | Sunday → today |
| Last week | "last week" | "上周" | Previous Sun → Sat |
| This month | "this month" | "这个月" | 1st → today |
| Last month | "last month" | "上个月" | Prev month range |
| This year | "this year" | "今年" | Jan 1 → today |
| N days ago | "3 days ago" | "三天前" | Specific date |
| Specific date | "on January 15" | "一月十五号" | Specific date |
| Date range | "from Jan 1 to 15" | "从一月一号到十五号" | Date range |

---

## Edge Cases Handled

1. **Timezone Awareness:** Uses user's timezone from Firestore for accurate date calculation
2. **"Last night" Before 6 AM:** Resolves to current date (user likely means same day)
3. **Multiple References:** "yesterday and today" → widest date range (union)
4. **Empty Results:** Falls back to unfiltered query with note in response
5. **No Temporal Reference:** Works exactly as before (no filter applied)
6. **Normalization Failure:** Gracefully continues with original text

---

## Performance Characteristics

| Operation | Latency | Cost per Call |
|-----------|---------|---------------|
| Query Parsing | ~200ms | ~$0.0001 (GPT-4o-mini) |
| Index Normalization | ~300ms | ~$0.0002 (GPT-4o-mini) |
| Cache Hit (Query) | <1ms | $0 |

**Total Additional Cost:** ~$4/month at moderate usage (1000 queries/day, 100 notes/day)

---

## Files Involved

### Core Service
- `firebase/functions/src/services/TemporalParserService.ts` - Main service with `parse()` and `normalizeText()` methods

### Content Reader Utility
- `firebase/functions/src/utils/contentReader.ts` - Universal `getTextForAI()` function

### Cloud Function Triggers
- `firebase/functions/src/index.ts` - Modified `voiceNoteCreated` and `textNoteCreated` triggers

### RAG Query
- `firebase/functions/src/index.ts` - Modified `queryRAG` function with temporal filtering

---

## Usage Tracking

All temporal parser LLM calls are tracked via `PromptExecutionTracker`:

```typescript
service: 'TemporalParserService'
promptId: 'temporal_extraction'  // For query parsing
promptId: 'temporal_normalization'  // For index-time normalization
```

Visible in:
- Mobile app: User's cost dashboard (Settings → Usage)
- Web admin: promptExecutions collection and analytics

---

## Inventors

[Your name here]

---

## References

- Pinecone Vector Database: https://www.pinecone.io/
- OpenAI GPT-4o-mini: https://platform.openai.com/docs/models
- Firebase Cloud Functions: https://firebase.google.com/docs/functions
