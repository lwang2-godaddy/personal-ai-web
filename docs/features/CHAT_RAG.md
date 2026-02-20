# Chat & RAG

This document describes the Chat interface and RAG (Retrieval-Augmented Generation) system in Personal AI Web.

## Overview

The Chat feature provides an AI-powered interface to query your personal data. It uses RAG to retrieve relevant context from your data before generating responses.

## Page Location

**File**: `app/(dashboard)/chat/page.tsx`

**Route**: `/chat`

**Guard**: `AuthGuard` (requires authentication)

---

## Chat Interface

### Components

| Component | File | Purpose |
|-----------|------|---------|
| ChatInput | `components/chat/ChatInput.tsx` | Message input with send |
| MessageBubble | `components/chat/MessageBubble.tsx` | Message display |
| TypingIndicator | `components/chat/TypingIndicator.tsx` | Loading animation |
| EmptyState | `components/chat/EmptyState.tsx` | Initial welcome |

### ChatInput

Text input for user messages.

**Features**:
- Multiline textarea
- Enter to send, Shift+Enter for newline
- Character limit guidance
- Submit button with loading state
- Disabled while AI is responding

### MessageBubble

Displays individual messages with role-based styling.

**User Messages**:
- Right-aligned
- Blue background
- User avatar

**Assistant Messages**:
- Left-aligned
- Gray background
- SirCharge avatar
- Data type badges (if sources used)
- Expandable sources section

**Source Display**:
```typescript
interface ContextReference {
  id: string;
  score: number;    // Relevance 0-1
  type: 'health' | 'location' | 'voice' | 'photo' | 'text';
  snippet: string;  // Preview text
}
```

### TypingIndicator

ChatGPT-style animated dots shown while waiting for AI response.

**Implementation**:
```css
.typing-dot {
  animation: bounce 1.4s infinite ease-in-out both;
}
.typing-dot:nth-child(1) { animation-delay: -0.32s; }
.typing-dot:nth-child(2) { animation-delay: -0.16s; }
```

### EmptyState

Initial screen shown before any messages.

**Contents**:
- SirCharge avatar introduction
- Quick action buttons:
  - "My workouts"
  - "Places I visited"
  - "My activities"
  - "Health trends"
- Example query suggestions
- Note about data requirements

---

## RAG System

### Architecture

```
User Question
      │
      ▼
┌─────────────────────────────────────────────┐
│              RAGEngine.server.ts            │
├─────────────────────────────────────────────┤
│  1. Parse temporal intent                   │
│  2. Generate query embedding                │
│  3. Query Pinecone (top K vectors)          │
│  4. Fetch related events from Firestore     │
│  5. Build context string                    │
│  6. Send to GPT-4o with context             │
│  7. Return response + sources               │
└─────────────────────────────────────────────┘
      │
      ▼
AI Response with Sources
```

### Temporal Reasoning (Multi-language)

The RAG engine parses temporal references in queries. **Supports 9 languages:** English, Chinese, Japanese, Korean, Spanish, French, German, Italian, Portuguese.

| Query Pattern | EN | ZH | JA | KO |
|---------------|----|----|----|----|
| today | today | 今天 | 今日 | 오늘 |
| yesterday | yesterday | 昨天 | 昨日 | 어제 |
| this week | this week | 这周/本周 | 今週 | 이번 주 |
| last week | last week | 上周 | 先週 | 지난 주 |
| this month | this month | 这个月/本月 | 今月 | 이번 달 |
| last month | last month | 上个月 | 先月 | 지난 달 |
| N days ago | N days ago | N天前 | N日前 | N일 전 |

European languages (ES, FR, DE, IT, PT) are also fully supported with equivalent patterns.

**Implementation**:
```typescript
interface TemporalIntent {
  hasTemporalIntent: boolean;
  dateRange?: { start: Date; end: Date };
  timeReference?: string;
}

function parseTemporalIntent(query: string): TemporalIntent {
  // Pattern matching for all 9 languages
  // yesterday: /\byesterday\b|昨天|昨日|어제|ayer|hier|gestern|ieri|ontem/i
  // ... more patterns
}
```

### Query Intent Analysis (Multi-language)

The system detects query types to optimize responses. **Supports 9 languages:** English, Chinese, Japanese, Korean, Spanish, French, German, Italian, Portuguese.

| Intent | Example | Behavior |
|--------|---------|----------|
| count | "How many times..." / "几个" / "何個" / "몇 개" | Returns numerical count (uses topK=50) |
| average | "What's my average..." / "平均" / "평균" | Calculates mean |
| comparison | "Compare my..." / "比较" / "비교" | Shows differences |
| timeline | "When did I..." | Lists chronologically |
| search | "Find all..." | Returns matching items |

**Counting Query Detection Patterns:**
- **EN:** how many, number of, count, times, how often
- **ZH:** 几个, 几次, 多少, 数量, 多少张
- **JA:** いくつ, 何個, 何回, 何度, 何枚, 回数
- **KO:** 몇 개, 몇 번, 몇 장, 얼마나, 횟수
- **ES/FR/DE/IT/PT:** cuántos, combien, wie viele, quanti, quantos

**Counting Query Optimization:**
- When a counting query is detected, `topK` is increased from 10 to 50
- An explicit counting instruction is prepended to the context
- This ensures accurate counts like "You recorded 5 voice notes yesterday"

### Context Building

Retrieved vectors are converted to context for GPT-4o:

```typescript
function buildContext(vectors: PineconeMatch[]): string {
  return vectors.map((v, i) => {
    const meta = v.metadata;
    return `[Source ${i + 1}] (${meta.type}, ${meta.date})
${meta.content || meta.snippet}
---`;
  }).join('\n\n');
}
```

**Context Limits**:
- Maximum context length: 8000 characters
- Top K results: 10 vectors
- Truncation strategy: Keep most relevant, truncate content

---

## API Flow

### Send Message

**Endpoint**: `POST /api/chat`

**Request**:
```typescript
{
  message: string;
  userId: string;
  conversationHistory?: {
    role: 'user' | 'assistant';
    content: string;
  }[];
}
```

**Response**:
```typescript
{
  response: string;
  contextUsed: ContextReference[];
}
```

### Usage Limits

Before processing, the API checks:
- Messages per day (per subscription tier)
- Daily reset at midnight UTC

**If limit exceeded**:
```typescript
{
  error: "Usage limit exceeded",
  limit: "messagesPerDay",
  current: 15,
  max: 15,
  resetAt: "2025-01-20T00:00:00.000Z"
}
```

---

## State Management

### chatSlice

```typescript
interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  voiceInput?: boolean;
  contextUsed?: ContextReference[];
}
```

### Actions

| Action | Description |
|--------|-------------|
| `sendMessage` | Send with conversation history |
| `sendFreshMessage` | Send without history (fresh query) |
| `addMessage` | Add message to state |
| `clearMessages` | Clear conversation |
| `clearError` | Clear error state |

### Optimistic Updates

Messages are added immediately for responsive UI:

```typescript
builder.addCase(sendMessage.pending, (state, action) => {
  // Add user message immediately
  state.messages.push({
    role: 'user',
    content: action.meta.arg.message,
    timestamp: new Date().toISOString(),
  });

  // Add typing indicator
  state.messages.push({
    id: '__typing__',
    role: 'system',
    content: 'Thinking...',
    timestamp: new Date().toISOString(),
  });
});
```

---

## Conversation History

### With History

`sendMessage` includes previous messages for context:

```typescript
const conversationHistory = messages
  .filter(m => m.id !== '__typing__')
  .slice(-10)  // Last 10 messages
  .map(m => ({
    role: m.role,
    content: m.content,
  }));
```

**Use Cases**:
- Follow-up questions ("What about last month?")
- Clarifications ("Can you explain more?")
- Refinements ("Show only workouts")

### Without History

`sendFreshMessage` starts a new context:

**Use Cases**:
- Starting new topic
- Avoiding context confusion
- Explicit "new question"

---

## Example Queries

### Data Queries

| Query | Expected Response |
|-------|-------------------|
| "How many times did I play badminton this month?" | Count with dates |
| "What's my average daily steps?" | Calculated average |
| "Where did I go last week?" | Location list |
| "Show me my voice notes about work" | Filtered notes |

### Health Queries

| Query | Expected Response |
|-------|-------------------|
| "How was my sleep this week?" | Sleep duration summary |
| "Compare my workout frequency this month vs last month" | Comparison |
| "What was my heart rate during workouts?" | Heart rate data |

### Timeline Queries

| Query | Expected Response |
|-------|-------------------|
| "When did I last visit the gym?" | Most recent date |
| "Show me my activity timeline for January" | Chronological list |

---

## Error Handling

### No Data Found

```typescript
if (vectors.length === 0) {
  return {
    response: "I don't have enough data to answer that question. " +
              "Try adding more data through the dashboard.",
    contextUsed: [],
  };
}
```

### API Errors

```typescript
try {
  const response = await ragEngine.query(message, userId);
  return NextResponse.json(response);
} catch (error) {
  if (error.message.includes('rate limit')) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429 }
    );
  }
  return NextResponse.json(
    { error: 'Failed to process your question.' },
    { status: 500 }
  );
}
```

---

## Performance Considerations

### Vector Search Optimization

- Use metadata filters to reduce search space
- Temporal filters applied before vector similarity
- userId filter is mandatory and indexed

### Response Time

Typical response times:
- Embedding generation: ~200ms
- Pinecone query: ~100ms
- GPT-4o response: ~2-5s
- Total: ~3-6s

### Caching

Currently no response caching. Future optimization:
- Cache frequent queries
- Cache embedding for repeated questions
- Consider semantic cache (similar questions)

---

---

## E2E Tests

### Counting Query Tests

The counting query functionality is covered by comprehensive E2E tests across all 9 languages.

**Run tests:**
```bash
npm run test:counting-query
```

**Test coverage (213 test cases):**
- Counting query detection (36 tests - 4 per language)
- Temporal patterns (99 tests - 11 per language)
- N days ago patterns (18 tests - 2 per language)
- Data type detection (72 tests - 8 per language)

**Test file:** `scripts/integration-tests/tests/counting-query-e2e.test.ts`

### Chat History Admin Tests

The chat history admin API is covered by E2E tests.

**Run tests:**
```bash
npm run test -- --filter chat-history
```

**Test coverage:**
- List users with chat counts
- List conversations for a user
- Context references in messages
- Message counts calculation
- Date range filtering
- Context types aggregation

**Test file:** `scripts/integration-tests/tests/chat-history-admin-e2e.test.ts`

---

## Related Documentation

- [Services - RAGEngine](../SERVICES.md#ragengine)
- [Database Schema](../DATABASE_SCHEMA.md) - Vector metadata
- [External Services - OpenAI](../infrastructure/EXTERNAL_SERVICES.md#openai)
- [External Services - Pinecone](../infrastructure/EXTERNAL_SERVICES.md#pinecone)
