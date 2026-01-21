# AI-Powered Transcription Cleanup

Documentation for the automatic transcription cleanup feature that uses GPT-4o-mini to fix common Whisper transcription errors.

## Overview

When a user records a voice note, Whisper transcribes the audio. The raw transcription often contains:

- **Filler words:** um, uh, like, you know
- **Repeated words:** I I went, the the
- **Missing punctuation:** Run-on sentences
- **Speech disfluencies:** Stutters and false starts

This feature automatically cleans up these issues server-side without blocking the user.

---

## Architecture

```
Mobile App                           Cloud Function                    Firestore
┌────────────────┐                  ┌────────────────────┐            ┌─────────────┐
│ Record Audio   │                  │ voiceNoteCreated   │            │ voiceNotes  │
│       ↓        │                  │       ↓            │            │    /{id}    │
│ Whisper API    │────Sync─────────►│ cleanupTranscription│           │             │
│       ↓        │                  │ (GPT-4o-mini)      │───Update──►│transcription│
│ Show Raw Text  │                  │       ↓            │            │originalText │
│ Immediately    │                  │ Generate Embedding │            │             │
└────────────────┘                  └────────────────────┘            └─────────────┘
```

---

## User Experience

1. **User records voice note** → sees raw transcription immediately
2. **Syncs to Firestore** → triggers Cloud Function
3. **Cloud Function cleans up** → updates Firestore (~500ms async)
4. **Next app sync** → user sees improved transcription

The user is **never blocked** - cleanup happens in the background.

---

## What Gets Cleaned

| Issue | Before | After |
|-------|--------|-------|
| Filler words | "Um, I went to, like, the store" | "I went to the store" |
| Repeated words | "I I went to the the store" | "I went to the store" |
| Missing punctuation | "I went to the store then I came home" | "I went to the store, then I came home." |
| Speech disfluencies | "也有能 也能有時間" | "也能有時間" |
| [inaudible] markers | "I went to [inaudible] store" | "I went to the store" |

### What is NOT Changed

- Meaning or intent
- Added information
- Significant rewording
- Already clean transcriptions

---

## Implementation

### Cloud Function

**Location:** `firebase/functions/src/index.ts`

```typescript
// Helper function for cleanup
async function cleanupTranscription(text: string): Promise<string> {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `Clean up this voice transcription. Only fix obvious errors:
- Remove excessive filler words (um, uh, like, you know) but keep natural speech
- Fix repeated words (I I went -> I went)
- Add basic punctuation if missing
- Remove [inaudible] if context makes it clear

DO NOT change the meaning. If already clean, return unchanged.

Transcription: ${text}`,
      },
    ],
    temperature: 0.3,
    max_tokens: Math.min(text.length * 2, 1000),
  });

  return response.choices[0]?.message?.content?.trim() || text;
}
```

### Integration in voiceNoteCreated

```typescript
// In voiceNoteCreated function, after getting transcription
let text = originalText;

// Only cleanup if transcription is substantial (>20 chars)
if (originalText.length > 20) {
  try {
    const cleanedText = await cleanupTranscription(originalText);

    // Update Firestore with cleaned version if different
    if (cleanedText !== originalText) {
      await snap.ref.update({
        transcription: cleanedText,
        originalTranscription: originalText,
      });
      text = cleanedText;
      console.log(`[VoiceNote] Cleaned transcription for ${noteId}`);
    }
  } catch (cleanupError) {
    console.warn('[VoiceNote] Transcription cleanup failed:', cleanupError);
    // Continue with original - non-fatal
  }
}

// Use cleaned text for all downstream processing
// (events, memories, mood analysis, embedding)
```

---

## Data Model

### Firestore Schema Update

```typescript
interface VoiceNote {
  id: string;
  userId: string;
  audioUrl: string;
  duration: number;
  transcription: string;           // Cleaned version (or original if unchanged)
  originalTranscription?: string;  // Raw Whisper output (only if cleanup made changes)
  createdAt: Timestamp;
  embeddingId: string | null;
  // ... other fields
}
```

**Note:** The `originalTranscription` field is only present when cleanup modified the text.

---

## Configuration

### Prompt Configuration

**Location:** `firebase/functions/src/config/prompts/locales/en/transcription.yaml`

```yaml
version: "1.0.0"
language: "en"
lastUpdated: "2025-01-21"
prompts:
  cleanup_transcription:
    id: "cleanup-transcription"
    service: "TranscriptionCleanupService"
    type: "user"
    description: "Clean up voice transcription"
    content: |
      Clean up this voice transcription...
    metadata:
      model: "gpt-4o-mini"
      temperature: 0.3
      maxTokens: 500
```

### GPT-4o-mini Settings

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Model | gpt-4o-mini | Fast, cheap, smart enough |
| Temperature | 0.3 | Low creativity for consistent output |
| Max tokens | min(text.length * 2, 1000) | Scales with input, capped |

---

## Cost Analysis

| Component | Per Voice Note | Monthly (100 notes) |
|-----------|---------------|---------------------|
| Whisper transcription | $0.006/min | $0.60 |
| GPT-4o-mini cleanup | ~$0.0002 | $0.02 |
| Embedding generation | $0.0001 | $0.01 |
| **Total** | ~$0.006 | ~$0.63 |

**Impact:** Cleanup adds ~3% to per-note cost. Negligible.

---

## Performance

| Metric | Value |
|--------|-------|
| User-visible latency | None (async) |
| Cloud Function added time | ~300-500ms |
| GPT-4o-mini latency | ~200-400ms |

---

## Monitoring

### Check Cloud Function Logs

```bash
firebase functions:log --only voiceNoteCreated
```

### Success Log

```
[VoiceNote] Cleaned transcription for <noteId>
```

### Failure Log (Non-fatal)

```
[VoiceNote] Transcription cleanup failed, using original: <error>
```

---

## Related Documentation

- [Voice Features](./VOICE.md) - Voice recording and TTS
- [Firebase Functions](./FIREBASE_FUNCTIONS.md) - Cloud Functions overview
- [Sync & Storage](./SYNC.md) - Data synchronization
