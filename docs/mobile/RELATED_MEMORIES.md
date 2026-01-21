# Related Memories Feature

---
**Created By:** Claude Code
**Created Date:** January 2025
**Last Updated:** January 2025
**Last Updated By:** Claude Code
**Purpose:** Documentation for the semantic memory connections feature
**Related Docs:** `SERVICES.md`, `FIREBASE_FUNCTIONS.md`, `VOICE.md`
---

## Overview

When users create a note (voice, text, or photo), the system automatically searches for semantically related memories from their past. This helps users rediscover forgotten moments and see connections between their experiences.

**Key Use Cases:**
- Recording a voice note about "coffee with Sarah" → surfaces past coffee meetups
- Taking a photo at a location → shows previous visits to that place
- Writing about a project → connects to related work notes and deadlines

## Architecture

```
1. TRIGGER (New Memory Created)
┌─────────────────────────────────────────────────────────┐
│ User creates: Voice Note / Text Note / Photo            │
│         │                                               │
│         ▼ (Firestore trigger)                           │
│ Cloud Function: onVoiceNoteCreated / onTextNoteCreated  │
│         │                                               │
│         ▼                                               │
│ Generate embedding for new content                      │
└─────────────────────────────────────────────────────────┘

2. SEARCH (Find Related Memories)
┌─────────────────────────────────────────────────────────┐
│ RelatedMemoriesService.findRelated(embedding, userId)   │
│         │                                               │
│         ▼                                               │
│ Query Pinecone for similar vectors (cosine similarity)  │
│ - Filter by userId (data isolation)                     │
│ - Exclude self (the new memory)                         │
│ - TopK = 5 (configurable)                               │
│ - Min similarity threshold = 0.7                        │
│         │                                               │
│         ▼                                               │
│ Fetch full documents from Firestore                     │
└─────────────────────────────────────────────────────────┘

3. NOTIFICATION (Toast Display)
┌─────────────────────────────────────────────────────────┐
│ Related memories found                                  │
│         │                                               │
│         ▼                                               │
│ Store results in Firestore relatedMemories subcollection│
│         │                                               │
│         ▼                                               │
│ Mobile app: Listen for new related memories             │
│         │                                               │
│         ▼                                               │
│ Display toast notification with preview                 │
│ "Related Memory Found - From 2 weeks ago..."            │
└─────────────────────────────────────────────────────────┘
```

## Data Model

### RelatedMemory Interface

```typescript
interface RelatedMemory {
  id: string;
  userId: string;
  sourceMemoryId: string;      // The new memory that triggered search
  sourceType: MemoryType;      // 'voice_note' | 'text_note' | 'photo'
  relatedMemoryId: string;     // The related memory found
  relatedType: MemoryType;     // Type of related memory
  similarity: number;          // 0-1 cosine similarity score
  preview: string;             // Short text preview
  createdAt: string;
  relatedCreatedAt: string;    // When the related memory was created
}

type MemoryType = 'voice_note' | 'text_note' | 'photo' | 'location';
```

### Firestore Storage

**Path:** `users/{userId}/relatedMemories/{relationId}`

**Indexes:**
- `sourceMemoryId` + `createdAt` (for fetching relations by source)
- `similarity` (for sorting by relevance)

## User Experience

### Discovery Flow

1. User records a voice note about "lunch meeting with the team"
2. Cloud Function generates embedding and searches Pinecone
3. Finds 3 related memories:
   - Voice note from last week: "Team standup notes"
   - Photo from 2 months ago: Office lunch photo
   - Text note: "Team building ideas"
4. Toast notification appears: "3 Related Memories Found"
5. User taps toast → opens Related Memories sheet
6. User can browse and navigate to any related memory

### Toast Notification UI

```
┌────────────────────────────────────────┐
│ 💡  Related Memory Found               │
│     From 2 weeks ago...                │
│                          [View All →]  │
└────────────────────────────────────────┘
```

**Features:**
- Slides up from bottom of screen
- Auto-dismisses after 5 seconds
- Tap to view full related memories list
- Swipe to dismiss early

### Related Memories Sheet

When user taps the toast or views a memory's details:

```
┌────────────────────────────────────────┐
│ Related Memories                    [X]│
├────────────────────────────────────────┤
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ 🎤 Team standup notes            │   │
│ │    92% similar • 3 days ago      │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ 📸 Office lunch                  │   │
│ │    85% similar • 2 months ago    │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ 📝 Team building ideas           │   │
│ │    78% similar • 6 months ago    │   │
│ └──────────────────────────────────┘   │
│                                        │
└────────────────────────────────────────┘
```

## Implementation Details

### Files Overview

| File | Purpose |
|------|---------|
| `src/models/RelatedMemory.ts` | TypeScript interfaces |
| `src/services/memories/RelatedMemoriesService.ts` | Client-side service |
| `src/components/memories/RelatedMemoriesToast.tsx` | Toast notification |
| `src/components/memories/RelatedMemoriesSheet.tsx` | Bottom sheet list |
| `src/hooks/useRelatedMemories.ts` | Hook for real-time updates |
| `firebase/functions/src/services/RelatedMemoriesService.ts` | Server-side search |

### RelatedMemoriesService (Client)

```typescript
class RelatedMemoriesService {
  private static instance: RelatedMemoriesService;

  // Subscribe to new related memories (real-time)
  subscribeToRelated(
    userId: string,
    callback: (memories: RelatedMemory[]) => void
  ): () => void

  // Get related memories for a specific source
  getRelatedForSource(
    userId: string,
    sourceMemoryId: string
  ): Promise<RelatedMemory[]>

  // Mark as viewed (dismiss toast)
  markAsViewed(relationId: string): Promise<void>
}
```

### Cloud Function Integration

```typescript
// In onVoiceNoteCreated
export const onVoiceNoteCreated = onDocumentCreated(
  'voiceNotes/{noteId}',
  async (event) => {
    const note = event.data?.data();
    const userId = note?.userId;

    // 1. Generate embedding
    const embedding = await generateEmbedding(note.transcription);

    // 2. Store in Pinecone
    await upsertToPinecone(event.data.id, embedding, {
      userId,
      type: 'voice_note',
      text: note.transcription,
    });

    // 3. Find related memories
    const related = await findRelatedMemories(embedding, userId, event.data.id);

    // 4. Store relations in Firestore
    for (const memory of related) {
      await storeRelatedMemory(userId, event.data.id, memory);
    }
  }
);
```

### Pinecone Query

```typescript
async function findRelatedMemories(
  embedding: number[],
  userId: string,
  excludeId: string
): Promise<SimilarMemory[]> {
  const results = await pineconeIndex.query({
    vector: embedding,
    topK: 6, // Extra to account for self
    filter: { userId },
    includeMetadata: true,
  });

  return results.matches
    .filter(m => m.id !== excludeId && m.score >= 0.7)
    .slice(0, 5)
    .map(m => ({
      id: m.id,
      similarity: m.score,
      type: m.metadata?.type as MemoryType,
      preview: m.metadata?.text?.substring(0, 100),
      createdAt: m.metadata?.createdAt,
    }));
}
```

## User Preferences

### Settings

**Location:** Settings → AI Features → Related Memories

| Setting | Default | Description |
|---------|---------|-------------|
| Enable Related Memories | On | Toggle feature on/off |
| Min Similarity | 0.7 | Only show if >= 70% similar |
| Max Results | 5 | Maximum related memories to show |
| Toast Duration | 5s | How long toast stays visible |
| Include Photos | On | Include photos in search |
| Include Locations | On | Include location visits |

### Firestore User Preferences

```typescript
// In users/{userId}/preferences
{
  relatedMemories: {
    enabled: true,
    minSimilarity: 0.7,
    maxResults: 5,
    toastDuration: 5000,
    includePhotos: true,
    includeLocations: true,
  }
}
```

## UI Components

### RelatedMemoriesToast

```typescript
interface RelatedMemoriesToastProps {
  memories: RelatedMemory[];
  onPress: () => void;
  onDismiss: () => void;
  duration?: number;
}
```

**Features:**
- Animated slide-up entrance
- Memory type icon (mic, camera, text, location)
- Preview text with time ago
- Auto-dismiss with progress indicator
- Manual dismiss via swipe

### RelatedMemoriesSheet

```typescript
interface RelatedMemoriesSheetProps {
  sourceMemoryId: string;
  isVisible: boolean;
  onClose: () => void;
  onSelectMemory: (memoryId: string, type: MemoryType) => void;
}
```

**Features:**
- Draggable bottom sheet
- Scrollable list of related memories
- Similarity percentage badge
- Memory type icon
- Relative time display
- Tap to navigate to memory

## Onboarding

The Related Memories feature is showcased in the onboarding carousel:

**Page 2:** "Your Memories, Connected"
- Position: After AI Showcase, before Voice Magic
- Visual: Central sparkles icon with orbiting content type icons
- Animation: Pulsing glow, connection lines, toast preview
- Description: "When you create a note, we find related memories from your past. Rediscover forgotten moments."

### Onboarding Component

`src/components/onboarding/OnboardingRelatedMemories.tsx`

**Features:**
- Central brain/sparkles icon with pulsing glow
- Orbiting icons (mic, camera, text, location)
- Animated connection lines
- Mini toast preview sliding up from bottom
- Sparkle particles in background

## Performance Considerations

| Concern | Solution |
|---------|----------|
| **Query Latency** | Pinecone serverless, typically <100ms |
| **Embedding Cost** | Reuse embedding generated for storage |
| **Storage** | Only store top 5 relations per memory |
| **Real-time Updates** | Firestore listener with debouncing |

## Cost Analysis

| Component | Cost |
|-----------|------|
| Pinecone Query | Included in existing embedding cost |
| Firestore Writes | ~$0.0001 per 5 relations |
| Additional Tokens | None (reuses embedding) |

**Impact:** Minimal - shares embedding generation with primary storage.

## Security

- All queries filter by `userId` (Pinecone metadata)
- Firestore rules enforce user ownership
- No cross-user data exposure possible
- Relations stored in user's subcollection

```javascript
// Firestore Rules
match /users/{userId}/relatedMemories/{relationId} {
  allow read, write: if isOwner(userId);
}
```

## Verification Checklist

### Core Functionality
- [ ] Create voice note → related memories found
- [ ] Create text note → related memories found
- [ ] Upload photo → related memories found
- [ ] Toast appears with correct preview
- [ ] Tap toast opens sheet
- [ ] Navigate to related memory works

### User Preferences
- [ ] Toggle feature off → no searches
- [ ] Adjust min similarity → filters results
- [ ] Change max results → limits list

### Edge Cases
- [ ] First memory (no relations yet)
- [ ] Very unique content (no matches)
- [ ] Exact duplicate (excluded from results)
- [ ] Network offline (graceful failure)

### Onboarding
- [ ] Related Memories page appears at position 2
- [ ] Animations trigger when page active
- [ ] Toast preview slides up correctly
- [ ] Translations work (EN/ZH)

## Future Enhancements

- [ ] Related memories timeline view
- [ ] "More like this" button on any memory
- [ ] Cluster related memories into "stories"
- [ ] Weekly digest of memory connections
- [ ] Share memory chains with circles

## Related Documentation

- [Voice Recording](./VOICE.md) - Voice note creation flow
- [Firebase Functions](./FIREBASE_FUNCTIONS.md) - Cloud function triggers
- [Services Reference](./SERVICES.md) - All mobile services
- [Architecture](./ARCHITECTURE.md) - System design overview
