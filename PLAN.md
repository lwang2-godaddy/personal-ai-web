# Plan: Streaming Chat Responses

## Problem

The chat page (`/chat`) feels slow because the user stares at a bouncing dots spinner for 2-4 seconds while the entire response is generated server-side before anything is returned.

**Current flow (all blocking):**
1. Auth verification (~20ms)
2. Usage limit check (~100ms) — 2 Firestore reads (`getUserLimits` + `getDailyUsage`)
3. Embedding generation (~150ms)
4. Pinecone query (~200ms)
5. Firestore events query (~150ms, temporal queries only)
6. **GPT-4o completion (~1-3s)** — waits for FULL response, `stream: false`
7. Usage tracking (~20ms) — blocks before returning
8. Return full JSON

**Total: 2-4 seconds of blank waiting.**

## Solution: SSE Streaming + Parallel Operations

**Key insight:** The `chatCompletionStream()` method already exists in `OpenAIService` (line 343) but is never used. We'll wire it up end-to-end.

**Target: first token visible in ~500ms, full response streams in real-time.**

---

## Changes

### 1. New streaming API route: `app/api/chat/stream/route.ts` (NEW)

Keep the existing `/api/chat` route unchanged (for backwards compat). Add a new `/api/chat/stream` route that returns SSE.

- Uses `requireAuth(request)` for authentication
- Runs usage limit check
- Calls RAGEngine for context retrieval (embedding → Pinecone → context building) — same as today
- **Streams** GPT-4o response via SSE using `chatCompletionStream()`
- SSE protocol:
  - `data: {"type":"context","contextUsed":[...]}` — sent once after context retrieval (before GPT starts)
  - `data: {"type":"token","content":"Hello"}` — sent per token chunk
  - `data: {"type":"done"}` — sent when complete
  - `data: {"type":"error","message":"..."}` — sent on error
- Usage tracking happens after stream completes (non-blocking)

### 2. New streaming hook: `lib/hooks/useStreamingChat.ts` (NEW)

Client-side hook that manages the EventSource/fetch-based SSE connection.

- `useStreamingChat()` returns `{ sendMessage, isStreaming, streamingContent, error }`
- Uses `fetch()` with manual ReadableStream reader (not EventSource, which doesn't support POST)
- Parses SSE lines, accumulates token content
- On `context` event: stores contextUsed
- On `token` event: appends to streaming content (triggers re-render)
- On `done` event: finalizes message
- On `error` event: sets error state

### 3. Update RAGEngine: Add `queryForContext()` method — `lib/services/rag/RAGEngine.server.ts` (MODIFY)

Extract the retrieval steps (embedding → Pinecone → events → context building) into a separate method so the streaming route can call it, then stream the GPT completion separately.

- New method: `queryForContext(message, userId, conversationHistory?)` returns `{ context, contextUsed, messages }`
- Existing `query()` and `queryWithHistory()` remain unchanged (call `queryForContext` + `chatCompletion`)

**Also parallelize:** When temporal intent is detected, run Pinecone query and Firestore events query in parallel with `Promise.all()` instead of sequentially. Saves ~100-200ms.

### 4. Update chat page: `app/(dashboard)/chat/page.tsx` (MODIFY)

- Import and use `useStreamingChat` hook
- When streaming: show partial content in a MessageBubble that updates in real-time
- Keep `isLoading` spinner only for the retrieval phase (before first token)
- After first token arrives, replace spinner with streaming text
- On completion, add final message to Redux store (for history persistence)
- Falls back to existing non-streaming path on error

### 5. Update MessageBubble: `components/chat/MessageBubble.tsx` (MODIFY)

- Accept optional `isStreaming` prop
- When streaming, show blinking cursor at end of content
- When streaming completes, render normally (with contextUsed badges/sources)

### 6. Update chatSlice: `lib/store/slices/chatSlice.ts` (MODIFY)

- Add `addStreamingMessage` reducer — adds/updates a message with `id: '__streaming__'`
- Add `finalizeStreamingMessage` reducer — replaces streaming message with final message (with contextUsed)
- Keep existing `sendMessage` thunk as fallback

---

## Files Summary

| # | File | Action |
|---|------|--------|
| 1 | `app/api/chat/stream/route.ts` | **NEW** — SSE streaming endpoint |
| 2 | `lib/hooks/useStreamingChat.ts` | **NEW** — Client-side streaming hook |
| 3 | `lib/services/rag/RAGEngine.server.ts` | **MODIFY** — Extract `queryForContext()`, parallelize Pinecone+events |
| 4 | `app/(dashboard)/chat/page.tsx` | **MODIFY** — Use streaming hook |
| 5 | `components/chat/MessageBubble.tsx` | **MODIFY** — Add streaming cursor |
| 6 | `lib/store/slices/chatSlice.ts` | **MODIFY** — Add streaming reducers |

## Expected Performance

| Phase | Before | After |
|-------|--------|-------|
| Auth + usage check | ~120ms | ~120ms (same) |
| Embedding + Pinecone | ~350ms sequential | ~350ms (same) |
| Pinecone + Firestore events (temporal) | ~350ms sequential | ~200ms parallel |
| GPT-4o first token | N/A (waited for all) | ~200ms after context |
| GPT-4o full response | 1-3s blocking | Streams in real-time |
| **Time to first visible text** | **2-4s** | **~700ms** |

## Backwards Compatibility

- Existing `/api/chat` route unchanged — `sendFreshMessage` thunk still works
- Redux chat state shape unchanged
- If streaming fails, the hook falls back to the existing non-streaming `sendMessage` thunk
