# Voice Note Topic Icons

## Overview

Voice Note Topic Icons automatically categorizes voice notes based on their transcription content and displays a relevant icon badge on the feed card. This helps users quickly identify what each voice note is about.

## Features

- **Automatic Classification**: Uses GPT-4o-mini to analyze transcription and classify into categories
- **14 Default Categories**: Work, Health, Food, Travel, Shopping, Family, Friends, Ideas, Reminder, Money, Home, Music, Learning, Other
- **Admin Configuration**: Manage categories via the web admin portal
- **Localization**: Category names translated into 6 languages (EN, ES, ZH, FR, DE, JA)
- **Color-Coded Badges**: Each category has a distinct color for quick visual identification
- **Cost-Effective**: ~$0.0001 per classification using GPT-4o-mini

## Architecture

### Data Flow

```
1. User records voice note
   ↓
2. Audio uploaded to Firebase Storage
   ↓
3. Cloud Function triggered (voiceNoteCreated)
   ↓
4. Whisper transcribes audio
   ↓
5. TopicClassifierService classifies transcription
   ↓
6. Firestore document updated with topicCategory & topicIcon
   ↓
7. Mobile app syncs via SyncManager
   ↓
8. VoiceNoteFeedCard displays icon badge
```

### Files Modified/Created

#### Web Admin Portal
- `personal-ai-web/lib/models/VoiceCategory.ts` - Category model and defaults
- `personal-ai-web/app/api/admin/voice-categories/route.ts` - REST API
- `personal-ai-web/app/(admin)/admin/voice-categories/page.tsx` - Admin UI
- `personal-ai-web/app/(admin)/layout.tsx` - Navigation link added

#### Mobile App (Models & Database)
- `PersonalAIApp/src/models/VoiceNote.ts` - Added topicCategory, topicIcon fields
- `PersonalAIApp/src/database/schema.ts` - Schema v13 with new columns
- `PersonalAIApp/src/database/migrations.ts` - Migration to v13
- `PersonalAIApp/src/database/models/VoiceNoteModel.ts` - WatermelonDB model

#### Cloud Functions
- `PersonalAIApp/firebase/functions/src/services/TopicClassifierService.ts` - Classification service
- `PersonalAIApp/firebase/functions/src/index.ts` - voiceNoteCreated trigger updated

#### Mobile App UI
- `PersonalAIApp/src/components/feed/VoiceNoteFeedCard.tsx` - Icon badge UI
- `PersonalAIApp/src/screens/home/HomeFeedScreen.tsx` - Props passed to card
- `PersonalAIApp/src/components/feed/SearchResultCard.tsx` - Props for search results
- `PersonalAIApp/src/models/VectorSearchResult.ts` - VoiceOriginalData interface

#### Sync
- `PersonalAIApp/src/services/sync/SyncManager.ts` - Syncs topic fields from Firestore

## Default Categories

| Key | Icon | Color | Keywords |
|-----|------|-------|----------|
| work | briefcase-outline | #3B82F6 (blue) | meeting, project, deadline, work, office |
| health | fitness-outline | #10B981 (green) | workout, exercise, gym, run, health |
| food | restaurant-outline | #F59E0B (amber) | lunch, dinner, breakfast, cook, eat |
| travel | airplane-outline | #8B5CF6 (purple) | trip, flight, travel, vacation, hotel |
| shopping | cart-outline | #EC4899 (pink) | buy, shop, order, purchase, store |
| family | people-outline | #F97316 (orange) | family, mom, dad, kids, children |
| friends | chatbubbles-outline | #06B6D4 (cyan) | friend, hangout, party, meet |
| ideas | bulb-outline | #EAB308 (yellow) | idea, think, plan, want to |
| reminder | alarm-outline | #EF4444 (red) | remember, don't forget, remind |
| money | cash-outline | #22C55E (emerald) | pay, money, budget, expense |
| home | home-outline | #6366F1 (indigo) | house, home, clean, fix, repair |
| music | musical-notes-outline | #A855F7 (purple) | music, song, concert, listen |
| learning | book-outline | #0EA5E9 (sky) | learn, study, read, course |
| other | mic-outline | #6B7280 (gray) | (default fallback) |

## Admin Portal Usage

### Accessing Voice Categories

1. Navigate to https://www.sircharge.ai/admin/voice-categories
2. (Requires admin role)

### Initializing Categories

On first access, you'll see a yellow banner indicating categories need initialization:

1. Click "Initialize Categories"
2. Default categories will be created in Firestore

### Managing Categories

**Edit a Category:**
1. Click "Edit" button on any row
2. Modify icon, color, display order, keywords
3. Click "Save"

**Add a Category:**
1. Click "Add Category" button (top right)
2. Fill in key (e.g., "sports"), select icon
3. Enter keywords (comma-separated)
4. Click "Add Category"

**Delete a Category:**
1. Click "Delete" button (not available for "other")
2. Confirm deletion

**Enable/Disable:**
- Toggle switch to enable/disable classification for a category
- Disabled categories won't be used in classification

## TopicClassifierService

### Classification Logic

```typescript
// Fetches enabled categories from Firestore
const categories = await this.fetchCategories(userId);

// Builds dynamic prompt with category descriptions
const prompt = `Classify this transcription:
"${transcription}"

Categories:
${categories.map(c => `- ${c.key}: ${c.keywords.join(', ')}`).join('\n')}

Return JSON: {"category": "key", "confidence": 0.0-1.0}`;

// Calls GPT-4o-mini
const result = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: prompt }],
  temperature: 0.3,
});
```

### Caching

- Categories are cached for 5 minutes in memory
- Reduces Firestore reads on high-volume deployments

### Error Handling

- If classification fails, defaults to "other" category
- Errors logged but don't block voice note creation

## Mobile UI

### Icon Badge Display

The topic icon appears as a small circular badge on VoiceNoteFeedCard:

- Size: 24x24 pixels
- Icon size: 14px
- Background: 20% opacity of category color
- Position: In the main row, before timestamp

### Tap Interaction

Tapping the badge shows an Alert with the localized category name.

### Styling

```typescript
// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  work: '#3B82F6',
  health: '#10B981',
  // ...
};

// Badge style
{
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: `${categoryColor}33`, // 20% opacity
}
```

## Localization

Category names are localized using the existing i18n system.

### Translation Keys

```json
{
  "voice_category_work": "Work",
  "voice_category_health": "Health",
  "voice_category_food": "Food",
  // ... all 14 categories
}
```

### Supported Languages

- English (en)
- Spanish (es)
- Chinese (zh)
- French (fr)
- German (de)
- Japanese (ja)

## Cost Analysis

| Operation | Cost |
|-----------|------|
| GPT-4o-mini classification | ~$0.0001 per voice note |
| Firestore category read | Negligible (cached) |
| Pinecone storage | No additional cost |

**Monthly estimate (1000 voice notes):** ~$0.10

## Testing

### End-to-End Test

1. Deploy Cloud Functions: `cd PersonalAIApp/firebase/functions && npm run deploy`
2. Rebuild mobile app (for schema migration)
3. Record a voice note about work (e.g., "I need to schedule a meeting with the team")
4. Wait 5-10 seconds for processing
5. Verify icon badge appears (briefcase icon, blue tint)

### Manual Classification Test

```typescript
// In Cloud Functions shell
const classifier = TopicClassifierService.getInstance();
const result = await classifier.classifyTranscription(
  "I went to the gym today and did some running",
  "test-user",
  "test-note"
);
console.log(result); // { category: 'health', icon: 'fitness-outline', confidence: 0.95 }
```

## Troubleshooting

### Icon Not Appearing

1. Check if voice note was created after feature deployment
2. Verify Cloud Functions deployed successfully
3. Check Firestore document for topicCategory field
4. Force sync in app: Pull down to refresh

### Wrong Classification

1. Check keywords in admin portal
2. Add more relevant keywords to the category
3. Consider adjusting display order (higher priority = more likely)

### Category Not Available

1. Verify category is enabled in admin portal
2. Check if voice_categories collection exists in Firestore
3. Initialize categories if needed

## Future Enhancements

- Manual category override by user
- Category suggestions based on location/time
- Category statistics in analytics dashboard
- Custom category creation in mobile app
