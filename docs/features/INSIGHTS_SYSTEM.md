# Insights System Documentation

The Insights System is SirCharge's unified AI-powered content generation engine that creates personalized posts about users' lives based on their collected data.

## Overview

The Insights feed (formerly "Life Feed") consolidates all AI-generated content into a single, unified timeline. Content is generated from 5 different AI features and organized into 8 content categories.

---

## Architecture

### Three Dimensions of Content

Every post in the Insights feed has three key attributes:

| Dimension | Description | Options |
|-----------|-------------|---------|
| **AI Feature** | The algorithm/service that generated the content | 5 features (see below) |
| **Category** | The topic/domain the content is about | 8 categories (see below) |
| **Post Type** | The format/style of the post | 8 types (see below) |

### How They Relate

```
AI Feature (HOW)  →  generates  →  Post (WHAT)  →  categorized as  →  Category (TOPIC)
                                        ↓
                                   Post Type (FORMAT)
```

**Example:** A Fun Fact about step milestones would be:
- **AI Feature:** Fun Facts
- **Category:** `health` (topic is about health/steps)
- **Post Type:** `milestone` (format is a milestone announcement)

---

## 5 AI Features (Content Sources)

These are the algorithms that analyze user data and generate content. All 5 features feed into the **same Insights feed** (`lifeFeedPosts` collection):

```
┌─────────────────────────────────────────────────────────────┐
│                     INSIGHTS FEED                            │
│                  (lifeFeedPosts collection)                  │
└─────────────────────────────────────────────────────────────┘
                            ▲
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────┴───────┐   ┌───────┴───────┐   ┌───────┴───────┐
│   Life Feed   │   │   Fun Facts   │   │ Mood Compass  │
│   Generator   │   │   Generator   │   │    Service    │
└───────────────┘   └───────────────┘   └───────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│Memory Companion│   │Life Forecaster│   │               │
└───────────────┘   └───────────────┘   └───────────────┘
```

### Feature Details

| Feature | Service | Post Types Generated | Default Category |
|---------|---------|---------------------|------------------|
| **Life Feed** | `LifeFeedGenerator` | `life_summary`, `milestone`, `streak_achievement`, `comparison`, `seasonal_reflection`, `pattern_prediction`, `reflective_insight`, `memory_highlight` | Varies by content |
| **Fun Facts** | `FunFactGenerator` | `milestone` (step milestones), `reflective_insight` (trivia) | `health`, `activity`, `location` |
| **Mood Compass** | `MoodCorrelationService` | `reflective_insight` (mood correlations, anomalies) | `general`, `health` |
| **Memory Companion** | `MemoryGeneratorService` | `memory_highlight` (anniversaries, throwbacks) | `memory` |
| **Life Forecaster** | `PatternDetectionService`, `PredictionService` | `pattern_prediction` (future predictions) | `activity` |

### Fun Facts - Special Display

Fun Facts appears in **TWO places**:

| Location | Component | Data Source |
|----------|-----------|-------------|
| **Home Screen** | `FunFactCarousel` (swipeable cards) | `fun_facts` collection |
| **Insights Feed** | Mixed with other posts | `lifeFeedPosts` collection |

When Fun Facts is disabled:
- ❌ No fun facts on Home page carousel
- ❌ No fun fact posts in Insights feed

### User Toggles (Profile Page)

Users can enable/disable each AI feature in the Profile page under "AI Features":

| Toggle | Controls | If Disabled |
|--------|----------|-------------|
| **Life Feed** | `LifeFeedGenerator` | No life summaries, comparisons, seasonal reflections |
| **Fun Facts** | `FunFactGenerator` | No fun facts on Home or in Insights |
| **Mood Compass** | Mood correlation & anomaly detection | No mood insights or anomaly alerts |
| **Memory Companion** | Memory surfacing | No memory highlights |
| **Life Forecaster** | Pattern detection & predictions | No pattern predictions |

**Configuration Hierarchy:**
```
Admin Config (global) → User Preferences (personal) → Posts Generated
```
Both admin AND user must have feature enabled for posts to generate.

### Cloud Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `generateLifeFeedNow` | On-demand (callable) | Generate Life Feed posts |
| `generateUnifiedInsightsNow` | On-demand (callable) | Generate all AI insights |
| `generateUnifiedInsightsScheduled` | Daily 9 AM UTC | Automatic daily generation |

---

## 8 Categories (Content Topics)

Categories describe **what the content is about**:

| Category | Icon | Color | Description |
|----------|------|-------|-------------|
| `health` | ❤️ | Red (#FF5252) | Health data, sleep, heart rate |
| `activity` | 🏃 | Blue (#2196F3) | Workouts, activities, streaks |
| `location` | 📍 | Green (#4CAF50) | Places visited, location patterns |
| `social` | 👥 | Purple (#9C27B0) | Social activities |
| `productivity` | ⚡ | Orange (#FF9800) | Productivity insights |
| `memory` | 💭 | Indigo (#3F51B5) | Memory highlights, anniversaries |
| `achievement` | 🏆 | Gold (#FFC107) | Milestones, achievements |
| `general` | 📝 | Gray (#607D8B) | General summaries, comparisons |

### Category Filter Bar

The Insights screen has a horizontal filter bar that allows users to filter by category:

```
[All] [Health ❤️] [Activity 🏃] [Location 📍] [Social 👥] [Memory 💭] [Achievement 🏆] [General 📝]
```

---

## 8 Post Types (Content Formats)

Post types describe **the format/style** of the content:

| Type | Icon | Display Label | Description | Example |
|------|------|---------------|-------------|---------|
| `life_summary` | 📋 | Life Update | Weekly/daily summaries | "This week: 3 gym sessions, 2 badminton games..." |
| `milestone` | 🏆 | Milestone | Achievement milestones | "100th badminton game!" |
| `pattern_prediction` | 🔮 | Prediction | Future predictions | "Tomorrow is Tuesday - badminton day?" |
| `reflective_insight` | 💡 | Insight | Behavioral insights | "You're 30% more active on weekdays" |
| `memory_highlight` | 📸 | Memory | Photo/voice memories | "1 year ago today: your trip to Paris" |
| `streak_achievement` | 🔥 | Streak | Streak achievements | "7-day workout streak!" |
| `comparison` | 📊 | Comparison | Time period comparisons | "This month vs last month..." |
| `seasonal_reflection` | 🌟 | Reflection | Seasonal summaries | "Your summer so far..." |

---

## Data Model

### LifeFeedPost Interface

```typescript
interface LifeFeedPost {
  id: string;
  userId: string;

  // Content
  content: string;              // Main text (1-3 sentences)
  contentWithEmoji: string;     // Content with emojis for sharing

  // Classification
  type: LifeFeedPostType;       // One of 8 post types
  category: LifeFeedCategory;   // One of 8 categories

  // Visual
  emoji: string;                // Primary emoji
  hashtags: string[];           // Generated hashtags

  // Quality
  confidence: number;           // 0-1 quality score

  // Engagement
  engagement: {
    viewed: boolean;
    liked: boolean;
    shared: boolean;
  };

  // Source tracking
  sources: LifeFeedSource[];    // Data sources used
  dateRange: {                  // Time period covered
    start: string;
    end: string;
  };

  // AI Feature Data (optional)
  moodData?: MoodData;          // Mood Compass data
  memoryData?: MemoryData;      // Memory Companion data
  forecastData?: ForecastData;  // Life Forecaster data
  prediction?: PredictionData;  // Prediction details

  // Timestamps
  generatedAt: string;
  publishedAt: string;
  expiresAt?: string;

  // Moderation
  hidden: boolean;
  flagged: boolean;
}
```

### Source Code Locations

| File | Description |
|------|-------------|
| `PersonalAIApp/src/models/LifeFeedPost.ts` | TypeScript interfaces |
| `PersonalAIApp/src/services/lifeFeed/LifeFeedService.ts` | Mobile service |
| `firebase/functions/src/services/LifeFeedGenerator.ts` | Life Feed generation |
| `firebase/functions/src/services/integration/InsightsIntegrationService.ts` | Unified insights |
| `firebase/functions/src/services/FunFactGenerator.ts` | Fun Facts |
| `firebase/functions/src/services/insights/InsightsOrchestrator.ts` | Pattern/Anomaly detection |

---

## Generation Pipeline

### On-Demand Generation

When user taps "Generate" in the app:

```
1. App calls generateAllInsightsNow()
   ├── generatePostsNow() → Life Feed posts
   └── generateUnifiedInsightsNow() → All AI insights
       ├── FunFactGenerator → Fun Facts
       └── InsightsOrchestrator
           ├── PatternDetectionService → Pattern Insights
           ├── AnomalyDetectionService → Anomaly Alerts
           ├── MoodCorrelationService → Mood Insights
           └── PredictionService → Life Forecaster

2. InsightsIntegrationService converts all outputs to LifeFeedPost format

3. Posts saved to lifeFeedPosts Firestore collection

4. App refreshes feed to show new posts
```

### Scheduled Generation

Daily at 9 AM UTC:
1. `generateUnifiedInsightsScheduled` Cloud Function triggers
2. Fetches all active users
3. Runs unified insights generation for each user
4. Posts appear in users' feeds

---

## User-Facing Features

### Viewing Posts

- **Main Feed:** All posts in reverse chronological order
- **Category Filter:** Filter by topic (health, activity, etc.)
- **Pull to Refresh:** Fetch latest posts
- **Infinite Scroll:** Load more posts as user scrolls

### Interacting with Posts

- **Like:** Heart a post (❤️)
- **Share:** Share to friends, circles, or external apps
- **Hide:** Remove post from feed
- **Prediction Feedback:** Mark predictions as correct/incorrect

### Prediction Tracking

For `pattern_prediction` posts, users can record outcomes:
- ✅ Correct - Prediction came true
- ❌ Incorrect - Prediction was wrong

This feedback improves prediction accuracy over time.

---

## Admin Configuration

### Firestore Collection

Posts are stored in: `lifeFeedPosts/{postId}`

### Cooldown System

To prevent spam, each post type has a cooldown period:

| Post Type | Cooldown |
|-----------|----------|
| `life_summary` | 1 day |
| `milestone` | 7 days |
| `streak_achievement` | 3 days |
| `pattern_prediction` | 1 day |
| `reflective_insight` | 3 days |
| `memory_highlight` | 7 days |
| `comparison` | 14 days |
| `seasonal_reflection` | 30 days |

### Smart Frequency

Generation frequency adapts to user data volume:
- **High activity:** More frequent insights
- **Low activity:** Fewer posts, suggestions to add data
- **No data:** Onboarding prompts

---

## Troubleshooting

### "No new posts generated"

**Possible causes:**
1. **Cooldown:** Post types are in cooldown period
2. **Low activity:** Not enough data to generate insights
3. **No data:** User hasn't added any data yet

**Check in Firestore:** Look at `lifeFeedPosts` collection for user's recent posts

### "Posts not appearing"

1. Check Cloud Function logs for errors
2. Verify user has `lifeFeedPreferences.enabled = true`
3. Check Firestore rules allow read access

### "Wrong category assigned"

Categories are auto-detected based on:
- Source data type (health → health category)
- Content analysis
- Pattern type

To fix: Update category mapping in `InsightsIntegrationService.ts`

---

## API Reference

### Mobile Service Methods

```typescript
// LifeFeedService.ts

// Fetch posts
fetchPosts(options?: FetchPostsOptions): Promise<LifeFeedPost[]>

// Generate all insights (Life Feed + AI Features)
generateAllInsightsNow(maxPosts?: number): Promise<{
  lifeFeed: GeneratePostsResult;
  unified: UnifiedInsightsResult;
  totalGenerated: number;
}>

// Single post operations
likePost(postId: string): Promise<void>
hidePost(postId: string): Promise<void>
shareToCircles(postId: string, circleIds: string[]): Promise<ShareResult>
recordPredictionOutcome(postId: string, outcome: 'correct' | 'incorrect'): Promise<void>
```

### Cloud Functions

```typescript
// Callable functions
generateLifeFeedNow({ maxPosts: number })
generateUnifiedInsightsNow({})

// Scheduled function
generateUnifiedInsightsScheduled // Runs daily at 9 AM UTC
```

---

## Related Documentation

- [Life Feed Generator](../mobile/LIFE_FEED.md) - Detailed generation logic
- [Fun Facts System](../mobile/FUN_FACTS.md) - Fun Facts configuration
- [Pattern Detection](../mobile/PATTERNS.md) - Pattern detection algorithms
- [Mood Compass](../mobile/MOOD_COMPASS.md) - Sentiment analysis
