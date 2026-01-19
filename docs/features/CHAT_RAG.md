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

### Temporal Reasoning

The RAG engine parses temporal references in queries:

| Query Pattern | Parsed Intent |
|---------------|---------------|
| "yesterday" | Previous day |
| "last week" | Previous 7 days |
| "last month" | Previous 30 days |
| "this year" | Current calendar year |
| "January 2025" | Specific month |
| "on Monday" | Most recent Monday |

**Implementation**:
```typescript
interface TemporalIntent {
  type: 'relative' | 'absolute' | 'range' | 'none';
  startDate?: Date;
  endDate?: Date;
  reference?: string;
}

function parseTemporalIntent(query: string): TemporalIntent {
  // Pattern matching for temporal references
  const yesterday = /yesterday/i;
  const lastWeek = /last\s+week/i;
  const lastMonth = /last\s+month/i;
  // ... more patterns
}
```

### Query Intent Analysis

The system detects query types to optimize responses:

| Intent | Example | Behavior |
|--------|---------|----------|
| count | "How many times..." | Returns numerical count |
| average | "What's my average..." | Calculates mean |
| comparison | "Compare my..." | Shows differences |
| timeline | "When did I..." | Lists chronologically |
| search | "Find all..." | Returns matching items |

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

## Related Documentation

- [Services - RAGEngine](../SERVICES.md#ragengine)
- [Database Schema](../DATABASE_SCHEMA.md) - Vector metadata
- [External Services - OpenAI](../infrastructure/EXTERNAL_SERVICES.md#openai)
- [External Services - Pinecone](../infrastructure/EXTERNAL_SERVICES.md#pinecone)
