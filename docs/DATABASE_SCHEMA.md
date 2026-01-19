# Database Schema

This document describes all Firestore collections and TypeScript models used in Personal AI Web.

## Table of Contents

- [Collection Overview](#collection-overview)
- [User Data](#user-data)
- [Personal Data](#personal-data)
- [Chat & Events](#chat--events)
- [Social Features](#social-features)
- [Admin & Configuration](#admin--configuration)
- [Analytics & Usage](#analytics--usage)
- [Security Rules](#security-rules)

---

## Collection Overview

| Collection | Purpose | Model File |
|------------|---------|------------|
| `users` | User profiles and settings | `User.ts` |
| `textNotes` | Diary entries and quick thoughts | `TextNote.ts` |
| `voiceNotes` | Voice recordings with transcriptions | `VoiceNote.ts` |
| `photoMemories` | Photos with metadata and descriptions | `PhotoMemory.ts` |
| `healthData` | Health metrics (HealthKit/Google Fit) | `HealthData.ts` |
| `locationData` | GPS location history | `LocationData.ts` |
| `events` | Calendar events and reminders | `Event.ts` |
| `chatHistory` | Conversation history | `ChatMessage.ts` |
| `circles` | Social circles | `Circle.ts` |
| `circleMembers` | Circle membership records | `Circle.ts` |
| `circleInvites` | Circle invitations | `Circle.ts` |
| `circleMessages` | Circle group chat | `Circle.ts` |
| `friendships` | Friend relationships | `Friend.ts` |
| `notifications` | Notification history | `NotificationRecord.ts` |
| `usageEvents` | Individual API usage events | `Usage.ts` |
| `usageDaily` | Daily aggregated usage | `Usage.ts` |
| `usageMonthly` | Monthly aggregated usage | `Usage.ts` |
| `promptConfigs` | Dynamic prompt configurations | `Prompt.ts` |
| `promptVersions` | Prompt change history | `Prompt.ts` |
| `promptExecutions` | Prompt execution logs | `Prompt.ts` |
| `config/subscriptionTiers` | Subscription tier configuration | `Subscription.ts` |
| `subscriptionTierVersions` | Subscription config history | `Subscription.ts` |
| `exploreQuestions` | Explore feature questions | `ExploreQuestion.ts` |
| `migrationRuns` | Data migration logs | `Migration.ts` |
| `billingCache` | Billing data cache | `BillingData.ts` |
| `infrastructureCosts` | Infrastructure cost tracking | `InfrastructureCost.ts` |

---

## User Data

### users/{uid}

User profiles and preferences.

**Source**: `lib/models/User.ts`

```typescript
interface User {
  uid: string;                           // Firebase user ID
  email: string | null;                  // User email
  displayName: string | null;            // Display name
  photoURL: string | null;               // Profile picture URL
  createdAt: string;                     // ISO timestamp
  lastSync: string | null;               // Last data sync
  lastActivityAt?: string | null;        // Last activity

  // User preferences
  preferences: UserPreferences;
  notificationPreferences?: NotificationPreferences;
  quietHours?: QuietHours[];
  lifeFeedPreferences?: LifeFeedPreferences;

  // Push notifications
  fcmToken?: string;                     // Firebase Cloud Messaging token

  // Localization
  locale?: string;                       // Language (en, es, fr, de, ja, zh)
  timezone?: string;                     // IANA timezone

  // Admin
  role: 'admin' | 'user';
  accountStatus: 'active' | 'suspended';
  customLimits?: UserLimits;

  // Features
  lastFunFactSent?: string;
}

interface UserPreferences {
  dataCollection: {
    health: boolean;
    location: boolean;
    voice: boolean;
  };
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'manual';
  privacy: {
    analyticsEnabled: boolean;
    crashReportingEnabled: boolean;
  };
  language?: string;
  savedSearches?: SavedSearch[];
}

interface NotificationPreferences {
  enabled: boolean;
  scheduled: {
    dailySummary: { enabled: boolean; time: string };
    weeklyInsights: { enabled: boolean; dayOfWeek: number; time: string };
    funFacts: { enabled: boolean; frequency: 'daily' | 'weekly' };
  };
  instant: {
    patternReminders: boolean;
    achievements: boolean;
    locationAlerts: boolean;
  };
  androidChannels?: Record<string, { sound: boolean; vibration: boolean }>;
}

interface UserLimits {
  maxTokensPerDay?: number;
  maxApiCallsPerDay?: number;
  maxCostPerMonth?: number;
}
```

---

## Personal Data

### textNotes/{noteId}

Diary entries and quick thoughts (Twitter-style posts).

**Source**: `lib/models/TextNote.ts`

```typescript
interface TextNote {
  id?: string;
  userId: string;                        // Required for data isolation
  title: string;                         // 1-100 chars
  content: string;                       // 10+ chars (except thoughts)
  tags: string[];                        // Max 10 tags
  type?: 'diary' | 'thought';            // thought = 280 char max
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    locationId?: string;
  };
  createdAt: string;                     // ISO timestamp
  updatedAt: string;                     // ISO timestamp

  // Embedding status
  embeddingId: string | null;            // Pinecone vector ID
  embeddingCreatedAt?: string;
  embeddingError?: string;
}
```

### voiceNotes/{voiceId}

Voice recordings with Whisper transcriptions.

**Source**: `lib/models/VoiceNote.ts`

```typescript
interface VoiceNote {
  id?: string;
  userId: string;
  audioUrl: string;                      // Firebase Storage URL
  localAudioPath?: string;               // Mobile-only: local path
  transcription: string;                 // Whisper transcription
  duration: number;                      // Seconds
  createdAt: string;
  tags: string[];

  // Embedding status
  embeddingId: string | null;
  embeddingCreatedAt?: string;
  embeddingError?: string;
  embeddingErrorAt?: string;
  updatedAt?: string;
}
```

### photoMemories/{photoId}

Photos with dual embeddings (text + visual).

**Source**: `lib/models/PhotoMemory.ts`

```typescript
interface PhotoMemory {
  id?: string;
  userId: string;

  // Storage URLs (3 versions)
  imageUrl: string;                      // Original (max 4096x4096)
  thumbnailUrl: string;                  // 256x256
  mediumUrl: string;                     // 1024x1024
  localImagePath?: string;               // Mobile-only

  // Descriptions
  autoDescription?: string;              // AI-generated (GPT-4 Vision)
  userDescription?: string;              // User override

  // Location
  latitude?: number;
  longitude?: number;
  locationId?: string;                   // Reference to locationData
  activity?: string;                     // Auto-tagged activity
  address?: string;

  // Metadata
  takenAt: string;                       // EXIF or upload time
  uploadedAt?: string;
  fileSize?: number;                     // Bytes
  dimensions?: { width: number; height: number };

  // Dual embeddings
  textEmbeddingId?: string;              // 1536D text embedding
  visualEmbeddingId?: string;            // 512D CLIP embedding

  // Organization
  tags: string[];
  isFavorite?: boolean;
  createdAt: string;
  updatedAt?: string;
}
```

### healthData/{healthId}

Health metrics from HealthKit (iOS) or Google Fit (Android).

**Source**: `lib/models/HealthData.ts`

```typescript
type HealthDataType = 'steps' | 'workout' | 'sleep' | 'heartRate';

interface HealthData {
  id?: string;
  userId: string;
  type: HealthDataType;
  value: number;
  unit: string;                          // "steps", "bpm", "hours"
  startDate: string;
  endDate: string;
  source: 'healthkit' | 'googlefit';
  metadata: HealthDataMetadata;
  syncedAt: string | null;
  embeddingId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface HealthDataMetadata {
  workoutType?: string;                  // "running", "cycling", etc.
  workoutDuration?: number;              // Minutes
  sleepQuality?: 'deep' | 'light' | 'rem' | 'awake';
  heartRateZone?: 'resting' | 'fat-burn' | 'cardio' | 'peak';
  calories?: number;
  distance?: number;                     // Meters
}
```

### locationData/{locationId}

GPS location history with activity tagging.

**Source**: `lib/models/LocationData.ts`

```typescript
interface LocationData {
  id?: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;                      // Meters
  timestamp: string;
  activity: string | null;               // "badminton", "coffee", etc.
  activityTaggedAt: string | null;
  address: string;                       // Reverse geocoded
  duration: number;                      // Seconds at location
  visitCount: number;
  embeddingId: string | null;
  createdAt?: string;
  updatedAt?: string;
}
```

---

## Chat & Events

### chatHistory/{conversationId}

Conversation history for RAG chat.

**Source**: `lib/models/ChatMessage.ts`

```typescript
type MessageRole = 'user' | 'assistant' | 'system';

interface ChatMessage {
  id?: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  voiceInput?: boolean;
  contextUsed?: ContextReference[];
}

interface ContextReference {
  id: string;                            // Document ID
  score: number;                         // Relevance 0-1
  type: 'health' | 'location' | 'voice' | 'photo' | 'text';
  snippet: string;
}

interface ChatHistory {
  id?: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}
```

### events/{eventId}

Calendar events extracted from voice/text or manually created.

**Source**: `lib/models/Event.ts`

```typescript
type EventType = 'appointment' | 'meeting' | 'intention' | 'plan' | 'reminder' | 'todo';
type EventSourceType = 'voice' | 'text' | 'photo' | 'health' | 'location' | 'manual';
type EventStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'draft';

interface Event {
  id: string;
  userId: string;
  title: string;
  description: string;
  datetime: Date;
  endDatetime?: Date;
  isAllDay: boolean;
  type: EventType;
  sourceType: EventSourceType;
  sourceId: string;                      // ID of source data
  sourceText: string;                    // Original text
  location?: string;
  locationId?: string;
  participants: string[];
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrenceEndDate?: Date;
  status: EventStatus;
  confidence: number;                    // 0-1 extraction confidence
  timezone?: string;

  // Reminders
  reminders: EventReminder[];

  // User modifications
  userConfirmed: boolean;
  userModified: boolean;
  completedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  embeddingId?: string;
}

interface EventReminder {
  id: string;                            // UUID
  type: 'smart' | 'custom';
  timing: number;                        // Minutes before event
  notificationId?: string;
  scheduledAt?: Date;
  sentAt?: Date;
  status: 'pending' | 'scheduled' | 'sent' | 'cancelled' | 'snoozed';
  snoozeCount?: number;                  // Max 3
  snoozeUntil?: Date;
}
```

---

## Social Features

### circles/{circleId}

Social circles for group data sharing.

**Source**: `lib/models/Circle.ts`

```typescript
interface Circle {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  createdBy: string;                     // Creator user ID
  memberIds: string[];
  type: 'open' | 'private';
  dataSharing: CircleDataSharing;
  settings: CircleSettings;
  createdAt: string;
  updatedAt: string;
}

interface CircleDataSharing {
  shareHealth: boolean;
  shareLocation: boolean;
  shareActivities: boolean;
  shareVoiceNotes: boolean;
  sharePhotos: boolean;
}

interface CircleSettings {
  allowMemberInvites: boolean;
  allowChallenges: boolean;
  allowGroupChat: boolean;
  notifyOnNewMember: boolean;
  notifyOnActivity: boolean;
}
```

### circleMembers/{circleId}_{userId}

Circle membership records.

```typescript
interface CircleMember {
  id: string;                            // {circleId}_{userId}
  circleId: string;
  userId: string;
  role: 'creator' | 'admin' | 'member';
  joinedAt: string;
  invitedBy: string;
  personalDataSharing?: CircleDataSharing;  // Per-member override
  status: 'active' | 'left' | 'removed';
  leftAt?: string;
  removedBy?: string;
  removedReason?: string;
}
```

### circleInvites/{inviteId}

Circle invitations.

```typescript
interface CircleInvite {
  id: string;
  circleId: string;
  fromUserId: string;
  toUserId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
  respondedAt?: string;
  expiresAt: string;                     // 30 days from creation
}
```

### circleMessages/{circleId}/{messageId}

Group chat messages within circles.

```typescript
interface CircleMessage {
  id: string;
  circleId: string;
  userId: string;                        // Or 'ai' for AI responses
  content: string;
  type: 'text' | 'voice' | 'system';
  voiceNoteUrl?: string;
  voiceNoteDuration?: number;
  contextUsed?: ContextReference[];      // If AI response
  isAIResponse?: boolean;
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
  reactions: Reaction[];
}

interface Reaction {
  userId: string;
  emoji: string;
  createdAt: string;
}
```

### friendships/{friendshipId}

Friend relationships.

**Source**: `lib/models/Friend.ts`

```typescript
interface Friendship {
  id: string;                            // {userId}_{friendUid}
  userId: string;
  friendUid: string;
  createdAt: string;
  privacySettings?: FriendPrivacySettings;
}

interface FriendPrivacySettings {
  shareHealth: boolean;
  shareLocation: boolean;
  shareActivities: boolean;
  shareVoiceNotes: boolean;
  sharePhotos: boolean;
}
```

---

## Admin & Configuration

### config/subscriptionTiers

Subscription tier configuration (singleton document).

**Source**: `lib/models/Subscription.ts`

```typescript
interface SubscriptionTierConfig {
  version: number;
  lastUpdated: string;
  updatedBy: string;                     // Admin UID
  enableDynamicConfig: boolean;          // Kill switch
  tiers: {
    free: TierQuotas;
    premium: TierQuotas;
    pro: TierQuotas;
  };
}

interface TierQuotas {
  messagesPerDay: number;                // -1 = unlimited
  photosPerMonth: number;
  voiceMinutesPerMonth: number;
  customActivityTypes: number;
  insightsEnabled: boolean;
  prioritySupport: boolean;
  advancedAnalytics: boolean;
  dataExport: boolean;
  offlineMode: boolean;
}

// Defaults
const DEFAULT_FREE_QUOTAS: TierQuotas = {
  messagesPerDay: 15,
  photosPerMonth: 5,
  voiceMinutesPerMonth: 5,
  customActivityTypes: 3,
  insightsEnabled: false,
  prioritySupport: false,
  advancedAnalytics: false,
  dataExport: false,
  offlineMode: false,
};
```

### promptConfigs/{language}/services/{service}

Dynamic prompt configurations.

**Source**: `lib/models/Prompt.ts`

```typescript
interface FirestorePromptConfig {
  version: string;
  language: string;                      // en, es, fr, de, ja, zh
  service: string;                       // rag_engine, event_extraction, etc.
  lastUpdated: string;
  updatedBy: string;
  updateNotes?: string;
  createdAt: string;
  createdBy: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  enabled: boolean;                      // Firestore vs YAML fallback
  prompts: Record<string, PromptDefinition>;
}

interface PromptDefinition {
  id: string;
  service: string;
  type: 'system' | 'user' | 'function';
  content: string;
  description?: string;
  culturalNotes?: string;
  variables: PromptVariable[];
  variants?: PromptVariant[];
  metadata?: PromptMetadata;
}

interface PromptMetadata {
  model?: string;
  temperature?: number;                  // 0-2
  maxTokens?: number;
  responseFormat?: 'text' | 'json_object';
  languageHints?: string[];
}
```

### exploreQuestions/{language}/questions/{questionId}

Explore feature questions for mobile app.

**Source**: `lib/models/ExploreQuestion.ts`

```typescript
type ExploreCategory = 'activity' | 'health' | 'location' | 'voice' | 'photo' | 'general' | 'onboarding';
type UserDataState = 'NO_DATA' | 'MINIMAL_DATA' | 'PARTIAL_DATA' | 'RICH_DATA';

interface ExploreQuestion {
  id: string;
  icon: string;                          // Emoji
  labelKey: string;                      // "My {{activity}}"
  queryTemplate: string;                 // "How many times did I do {{activity}}?"
  category: ExploreCategory;
  priority: number;                      // 0-100, higher = first
  enabled: boolean;
  userDataStates: UserDataState[];       // When to show
  requiresData?: DataRequirements;
  variables?: string[];
  order: number;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

interface DataRequirements {
  hasLocationData?: boolean;
  hasHealthData?: boolean;
  hasVoiceNotes?: boolean;
  hasPhotoMemories?: boolean;
  minActivityCount?: number;
  healthTypes?: string[];
}
```

### migrationRuns/{runId}

Data migration execution logs.

**Source**: `lib/models/Migration.ts`

```typescript
type MigrationCategory = 'user_data' | 'privacy' | 'notifications' | 'cleanup' | 'other';

interface MigrationRun {
  id: string;
  migrationId: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled' | 'partial';
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  options: MigrationRunOptions;
  result?: MigrationResult;
  progress?: MigrationProgress;
  triggeredBy: string;                   // Admin UID
  triggeredByEmail?: string;
}

interface MigrationResult {
  success: boolean;
  usersProcessed: number;
  usersCreated: number;
  usersSkipped: number;
  errors: MigrationError[];
  lastProcessedUserId?: string;
}
```

---

## Analytics & Usage

### usageEvents/{eventId}

Individual API usage events.

**Source**: `lib/models/Usage.ts`

```typescript
type UsageOperation = 'embedding' | 'chat_completion' | 'transcription' |
  'image_description' | 'tts' | 'pinecone_query' | 'pinecone_upsert' | 'pinecone_delete';

interface UsageEvent {
  id?: string;
  userId: string;
  timestamp: string;
  operation: UsageOperation;
  provider: 'openai' | 'pinecone';
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  audioDurationSeconds?: number;
  vectorCount?: number;
  dimension?: number;
  estimatedCostUSD: number;
  endpoint?: string;
  metadata?: Record<string, any>;
}
```

### usageDaily/{userId}_{YYYY-MM-DD}

Daily aggregated usage per user.

```typescript
interface DailyUsageStats {
  id: string;                            // {userId}_{date}
  userId: string;
  date: string;                          // YYYY-MM-DD
  totalApiCalls: number;
  totalTokens: number;
  totalCostUSD: number;
  operations: Record<UsageOperation, number>;
  openaiCost: number;
  pineconeCost: number;
  lastUpdated: string;
}
```

### usageMonthly/{userId}_{YYYY-MM}

Monthly aggregated usage per user.

```typescript
interface MonthlyUsageStats {
  id: string;                            // {userId}_{month}
  userId: string;
  month: string;                         // YYYY-MM
  totalApiCalls: number;
  totalTokens: number;
  totalCostUSD: number;
  dailyStats: { date: string; cost: number }[];
  operationSummary: Record<UsageOperation, number>;
  openaiCost: number;
  pineconeCost: number;
  lastUpdated: string;
}
```

### notifications/{notificationId}

Notification delivery history.

**Source**: `lib/models/NotificationRecord.ts`

```typescript
type NotificationType = 'event_reminder' | 'escalated_reminder' | 'daily_summary' |
  'weekly_insights' | 'fun_fact' | 'achievement' | 'location_alert' | 'pattern_reminder';

interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  category: 'scheduled' | 'instant' | 'escalated';
  title: string;
  body: string;
  imageUrl?: string;
  scheduledFor?: Date;
  sentAt: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'dismissed' | 'suppressed';
  suppressionReason?: 'quiet_hours' | 'rate_limit' | 'user_preference';
  relatedEventId?: string;
  relatedReminderId?: string;
  channel?: string;                      // Android channel
  priority: 'low' | 'default' | 'high' | 'max';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### billingCache/{cacheId}

Cached billing data from external APIs.

**Source**: `lib/models/BillingData.ts`

```typescript
interface BillingCacheDocument {
  id: string;                            // {provider}_{startDate}_{endDate}
  provider: 'openai' | 'pinecone' | 'gcp';
  startDate: string;
  endDate: string;
  data: OpenAIBillingData | PineconeBillingData | GCPBillingData;
  cachedAt: string;
  expiresAt: string;
}

// Cache TTLs
const BILLING_CACHE_TTL = {
  openai: 6 * 60 * 60 * 1000,            // 6 hours
  pinecone: 12 * 60 * 60 * 1000,         // 12 hours
  gcp: 24 * 60 * 60 * 1000,              // 24 hours
};
```

---

## Security Rules

### Firestore Security Rules Summary

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid))
        .data.role == 'admin';
    }

    // User documents - users can only access their own
    match /users/{userId} {
      allow read, write: if isOwner(userId) || isAdmin();
    }

    // Personal data - strict user isolation
    match /textNotes/{noteId} {
      allow read, write: if isAuthenticated()
        && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated()
        && request.resource.data.userId == request.auth.uid;
    }

    // Similar rules for voiceNotes, photoMemories, healthData, locationData

    // Circles - members only
    match /circles/{circleId} {
      allow read: if isAuthenticated()
        && request.auth.uid in resource.data.memberIds;
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated()
        && resource.data.createdBy == request.auth.uid;
    }

    // Admin-only collections
    match /config/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    match /promptConfigs/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

---

## Pinecone Vector Schema

Vectors stored in Pinecone for RAG search.

**Index Configuration**:
- Name: `personal-ai-data`
- Dimensions: 1536 (text-embedding-3-small)
- Metric: cosine
- Spec: serverless

**Vector Metadata**:

```typescript
interface VectorMetadata {
  userId: string;                        // CRITICAL: Required for filtering
  type: 'health' | 'location' | 'voice' | 'photo' | 'text' | 'shared_activity';
  date: string;                          // ISO date
  activity?: string;
  participants?: string[];               // For shared data
  // Additional fields vary by type
}
```

**Important**: All Pinecone queries MUST include `filter: { userId }` to prevent data leakage.

---

## Related Documentation

- [API Reference](./API_REFERENCE.md) - Endpoint documentation
- [Services](./SERVICES.md) - Business logic
- [Architecture](./ARCHITECTURE.md) - System overview
