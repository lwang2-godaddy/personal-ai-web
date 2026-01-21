# Learned Vocabulary for Transcription Cleanup

---
**Created By:** Claude Code
**Created Date:** January 2025
**Last Updated:** January 2025
**Last Updated By:** Claude Code
**Purpose:** Documentation for the learned vocabulary feature that improves AI transcription cleanup
**Related Docs:** `TRANSCRIPTION_CLEANUP.md`, `VOICE_NOTE_TRANSCRIPTION_EDITING.md`
---

## Overview

When users manually correct voice transcriptions, the system learns those corrections and applies them in future AI transcription cleanup. This creates a personalized vocabulary that improves transcription accuracy over time.

**Key Use Cases:**
- Proper nouns: "john" → "John"
- Technical terms: "api" → "API"
- Abbreviations: "sf" → "San Francisco"
- Names: "my manager" → "Sarah"

## Architecture

```
1. LEARNING (User Edits Transcription)
┌─────────────────────────────────────────────────────────┐
│ VoiceNoteTagEditorModal                                 │
│         │                                               │
│         ▼ (on save)                                     │
│ VocabularyDiffService.detectCorrections()               │
│         │                                               │
│         ▼ (if corrections found)                        │
│ VocabularyConfirmModal (user confirms which to learn)   │
│         │                                               │
│         ▼                                               │
│ Firestore: users/{userId}/learnedVocabulary/            │
└─────────────────────────────────────────────────────────┘

2. APPLICATION (AI Cleanup)
┌─────────────────────────────────────────────────────────┐
│ voiceNoteCreated Cloud Function                         │
│         │                                               │
│         ▼                                               │
│ getUserVocabulary(userId) - fetch top 50 by usage       │
│         │                                               │
│         ▼                                               │
│ cleanupTranscription(text, userId)                      │
│         │                                               │
│         ▼ (GPT-4o-mini with vocabulary context)         │
│ "Apply these user corrections:                          │
│  - 'john' → 'John' (proper_noun)                        │
│  - 'api' → 'API' (technical_term)"                      │
└─────────────────────────────────────────────────────────┘

3. MANAGEMENT (Settings UI)
┌─────────────────────────────────────────────────────────┐
│ Settings → "Learned Vocabulary"                         │
│         │                                               │
│         ▼                                               │
│ LearnedVocabularyScreen                                 │
│ - List with search/filter                               │
│ - Swipe to delete                                       │
│ - Edit corrections                                      │
│ - Add manually                                          │
└─────────────────────────────────────────────────────────┘
```

## Data Model

### LearnedVocabulary Interface

```typescript
interface LearnedVocabulary {
  id: string;
  userId: string;
  originalPhrase: string;      // What Whisper transcribed
  correctedPhrase: string;     // What user corrected to
  isMultiWord: boolean;        // true if phrase contains spaces
  category: VocabularyCategory;
  context?: string;            // Surrounding words for context
  usageCount: number;          // Times this correction was applied
  confidence: number;          // 0-1, increases with usage
  createdAt: string;
  updatedAt: string;
}

type VocabularyCategory =
  | 'proper_noun'      // Names: john → John
  | 'technical_term'   // Tech: api → API
  | 'abbreviation'     // sf → San Francisco
  | 'foreign_word'     // Non-English words
  | 'custom';          // User-specified
```

### Firestore Storage

**Path:** `users/{userId}/learnedVocabulary/{vocabId}`

**Why subcollection:**
- Scales to thousands of vocabulary items
- Efficient querying and pagination
- Independent security rules
- No document size limits

## User Experience

### Learning Flow

1. User records a voice note mentioning "john"
2. User opens voice note and edits transcription to "John"
3. On save, system detects the correction
4. Modal appears: "Remember these corrections?"
5. User confirms → saved to Firestore

### Application Flow

1. User records new voice note mentioning "john"
2. Cloud Function runs `cleanupTranscription(text, userId)`
3. Fetches user's vocabulary (top 50 by usage)
4. Injects into GPT-4o-mini prompt
5. AI corrects "john" → "John"
6. Usage count incremented

### Management UI

**Location:** Settings → Learned Vocabulary

**Features:**
- Stats header (total words, total applied)
- Search bar
- Category filter chips (All, Proper Nouns, Technical, Abbreviations, Foreign, Custom)
- List with swipe-to-delete
- Tap to edit
- FAB button to add manually

## Smart Learning Rules

**Suggest learning when:**
- Capitalization change (john → John) - likely proper noun
- Abbreviation expansion (sf → San Francisco)
- Technical term casing (api → API)
- Multi-word phrase replacement (my manager → Sarah)

**Don't suggest learning when:**
- Single character typo (teh → the)
- Punctuation-only changes
- Both words are common dictionary words
- Levenshtein distance = 1 (except capitalization)

**User always confirms** - corrections are suggested but user has final say.

## Implementation Details

### Files Created

| File | Purpose |
|------|---------|
| `src/models/LearnedVocabulary.ts` | TypeScript interfaces and helpers |
| `src/services/vocabulary/VocabularyDiffService.ts` | Diff detection, categorization |
| `src/components/modals/VocabularyConfirmModal.tsx` | "Remember these corrections?" modal |
| `src/screens/settings/LearnedVocabularyScreen.tsx` | Management UI |

### Files Modified

| File | Changes |
|------|---------|
| `src/api/firebase/firestore.ts` | Vocabulary CRUD methods |
| `firebase/firestore.rules` | Security rules for subcollection |
| `src/components/modals/VoiceNoteTagEditorModal.tsx` | Integrated vocabulary learning |
| `firebase/functions/src/index.ts` | Modified cleanup to use vocabulary |
| `src/navigation/SettingsNavigator.tsx` | Added route |
| `src/screens/settings/SettingsScreen.tsx` | Added navigation link |
| `src/locales/en/settings.json` | English translations |
| `src/locales/zh/settings.json` | Chinese translations |

### VocabularyDiffService

```typescript
class VocabularyDiffService {
  // Find corrections between original and edited text
  detectCorrections(original: string, edited: string): VocabularyCorrection[]

  // Auto-suggest category based on patterns
  categorizeCorrection(original: string, corrected: string): VocabularyCategory

  // Filter out typos and meaningless changes
  shouldLearn(correction: VocabularyCorrection): boolean

  // For similarity detection
  calculateLevenshteinDistance(a: string, b: string): number
}
```

### Enhanced Cleanup Prompt

```typescript
// In cleanupTranscription()
const vocabularyContext = vocabulary.length > 0
  ? `\n\nIMPORTANT: Apply these user-specific corrections:
${vocabulary.map(v => `- "${v.originalPhrase}" should be "${v.correctedPhrase}" (${v.category})`).join('\n')}`
  : '';

const prompt = `Clean up this voice transcription...${vocabularyContext}

Transcription: ${text}`;
```

## Firestore Security Rules

```javascript
match /users/{userId}/learnedVocabulary/{vocabId} {
  allow read, write: if isOwner(userId);
}
```

## Performance Considerations

| Concern | Solution |
|---------|----------|
| **Vocabulary Limit** | Fetch top 50 by usageCount |
| **Prompt Size** | Keep vocabulary list under 500 tokens |
| **Query Performance** | Indexed by usageCount (desc) |
| **Lazy Loading** | Paginate vocabulary list in UI |

## Cost Analysis

| Component | Additional Cost |
|-----------|-----------------|
| Vocabulary fetch | ~0.1ms Firestore read |
| Prompt tokens | ~50-200 tokens extra |
| Per-cleanup cost | ~$0.00005 extra |

**Impact:** Negligible - vocabulary context adds minimal tokens to existing cleanup.

## Verification Checklist

### Learning Flow
- [ ] Record voice note with name "john"
- [ ] Edit transcription to "John"
- [ ] Confirm vocabulary learning modal appears
- [ ] Verify saved to Firestore

### Application Flow
- [ ] Record new voice note mentioning "john"
- [ ] Verify cleanup automatically corrects to "John"
- [ ] Check usageCount incremented

### Management UI
- [ ] Navigate to Settings → Learned Vocabulary
- [ ] Verify list shows learned corrections
- [ ] Test search, filter, delete, edit
- [ ] Test manual add

### Edge Cases
- [ ] Empty vocabulary list
- [ ] Very long vocabulary list (100+ items)
- [ ] Special characters in words
- [ ] Multi-word phrases

## Deployment

After building the mobile app, deploy:

```bash
# Firebase Firestore rules
cd PersonalAIApp/firebase && firebase deploy --only firestore:rules

# Cloud Functions
cd PersonalAIApp/firebase/functions && npm run build && npm run deploy
```

## Future Enhancements

- [ ] Sync vocabulary across devices
- [ ] Import/export vocabulary
- [ ] Share vocabulary with family/team
- [ ] Auto-suggest from contact names
- [ ] Integration with device keyboard dictionary

## Related Documentation

- [Transcription Cleanup](./TRANSCRIPTION_CLEANUP.md) - AI cleanup without vocabulary
- [Voice Note Transcription Editing](./VOICE_NOTE_TRANSCRIPTION_EDITING.md) - Manual editing feature
- [LLM Features Overview](./LLM_FEATURES_OVERVIEW.md) - All AI-powered features
