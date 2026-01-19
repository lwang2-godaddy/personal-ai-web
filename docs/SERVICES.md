# Core Services

This document describes the business logic services in Personal AI Web.

## Table of Contents

- [Overview](#overview)
- [AI & RAG Services](#ai--rag-services)
- [Data Services](#data-services)
- [Media Processing](#media-processing)
- [Location Services](#location-services)
- [Event Services](#event-services)
- [Social Services](#social-services)
- [Billing & Usage](#billing--usage)
- [Configuration Services](#configuration-services)

---

## Overview

Services are located in `lib/services/` and follow these patterns:

1. **Singleton Pattern**: Most services use singleton instances
2. **Server vs Client**: Services suffixed with `.server.ts` are server-only
3. **External API Integration**: Services wrap OpenAI, Pinecone, and Firebase
4. **Error Handling**: All services use try-catch with structured errors

| Service | Type | Purpose |
|---------|------|---------|
| RAGEngine | Server | Retrieval-Augmented Generation |
| TextNoteService | Client | Text note CRUD and validation |
| VoiceRecorderService | Client | Browser audio recording |
| ImageProcessorService | Client | Image resizing and validation |
| GeolocationService | Client | Browser geolocation |
| LocationCorrelationService | Server | Match photos to locations |
| EventSearchService | Client | Event search with fuzzy matching |
| ReminderService | Client | Event reminder management |
| CircleService | Server | Social circles management |
| UsageTracker | Server | API usage and cost tracking |
| OpenAIBillingService | Server | OpenAI billing data |
| PineconeBillingService | Server | Pinecone billing data |
| BillingCacheService | Server | Billing data caching |
| PromptService | Server | Dynamic prompt management |
| ConflictDetectionService | Client | Event conflict detection |
| GoogleMapsService | Server | Distance Matrix API |

---

## AI & RAG Services

### RAGEngine

**File**: `lib/services/RAGEngine.server.ts`

The core intelligence service that powers the RAG-powered chatbot.

**Key Methods**:

```typescript
class RAGEngine {
  // Basic RAG query
  async query(userMessage: string, userId: string): Promise<RAGResponse>

  // RAG with conversation history
  async queryWithHistory(
    userMessage: string,
    userId: string,
    conversationHistory: ChatMessage[]
  ): Promise<RAGResponse>

  // Filter by data type
  async queryByDataType(
    message: string,
    userId: string,
    dataType: 'health' | 'location' | 'voice' | 'photo'
  ): Promise<RAGResponse>

  // Filter by activity
  async queryByActivity(
    message: string,
    userId: string,
    activity: string
  ): Promise<RAGResponse>

  // Circle group RAG
  async queryCircleContext(
    userMessage: string,
    circleId: string,
    userId: string
  ): Promise<RAGResponse>

  // Parse temporal references
  parseTemporalIntent(userMessage: string): TemporalIntent

  // Analyze query intent
  analyzeQuery(userMessage: string): QueryIntent
}
```

**Query Flow**:

1. Parse temporal intent (yesterday, last week, etc.)
2. Generate embedding for user message via OpenAI
3. Query Pinecone for top 10 vectors (filtered by userId)
4. Query Firestore for extracted events (if temporal)
5. Build context from vectors + events
6. Send to GPT-4o with context
7. Return response with source references

**Constants**:

```typescript
const RAG_TOP_K_RESULTS = 10;
const RAG_CONTEXT_MAX_LENGTH = 8000;
```

**External APIs**:
- OpenAI: text-embedding-3-small (embeddings), GPT-4o (chat)
- Pinecone: vector similarity search
- Firebase Firestore: event and document retrieval

---

## Data Services

### TextNoteService

**File**: `lib/services/TextNoteService.ts`

Business logic for text notes (diary entries and quick thoughts).

**Key Methods**:

```typescript
class TextNoteService {
  // CRUD operations
  async createTextNote(note: CreateTextNoteInput, userId: string): Promise<string>
  async updateTextNote(noteId: string, updates: Partial<TextNote>): Promise<void>
  async deleteTextNote(noteId: string): Promise<void>
  async getUserTextNotes(userId: string, limit?: number): Promise<TextNote[]>

  // Auto-save drafts
  saveDraftToLocalStorage(draft: TextNoteDraft): void
  loadDraftFromLocalStorage(): TextNoteDraft | null
  startAutoSave(getDraftData: () => TextNoteDraft, interval?: number): () => void

  // Validation
  validateTextNote(note: Partial<TextNote>): TextNoteValidationResult
}
```

**Validation Rules**:

| Field | Rule |
|-------|------|
| content | 10+ chars (except thoughts) |
| title | 1-100 chars |
| tags | Max 10 tags, each 1-30 chars |

**Auto-Save**:
- Saves to localStorage every 30 seconds
- Drafts expire after 7 days
- Clears draft on successful save

**Null Value Handling**:

Critical for Pinecone compatibility - all null values are filtered:

```typescript
const cleanMetadata: Record<string, any> = {};
for (const [key, value] of Object.entries(metadata)) {
  if (value !== null && value !== undefined) {
    cleanMetadata[key] = value;
  }
}
```

### VoiceRecorderService

**File**: `lib/services/VoiceRecorderService.ts`

Browser-based audio recording using MediaRecorder API.

**Key Methods**:

```typescript
class VoiceRecorderService {
  async startRecording(): Promise<void>
  async stopRecording(): Promise<Blob>
  cancelRecording(): void
  isAvailable(): boolean
  getState(): VoiceRecordingState
  addListener(callback: (state: VoiceRecordingState) => void): () => void
}
```

**Supported MIME Types** (prioritized):
1. `audio/mp4` (iOS-compatible)
2. `audio/mpeg` (MP3)
3. `audio/webm;codecs=opus`
4. `audio/ogg;codecs=opus`

**Audio Settings**:
- Echo cancellation: enabled
- Noise suppression: enabled
- Auto gain control: enabled

**State**:

```typescript
interface VoiceRecordingState {
  isRecording: boolean;
  duration: number;         // Seconds
  audioBlob: Blob | null;
  error: string | null;
}
```

---

## Media Processing

### ImageProcessorService

**File**: `lib/services/ImageProcessorService.ts`

Image resizing and validation using Canvas API.

**Key Methods**:

```typescript
class ImageProcessorService {
  async processImage(file: File): Promise<ProcessedImage>
  validateImage(file: File): ValidationResult
  extractExifData(file: File): ExifData
  createPreviewUrl(blob: Blob): string
  revokePreviewUrl(url: string): void
}
```

**Output Versions**:

| Version | Dimensions | Quality | Purpose |
|---------|------------|---------|---------|
| Original | Max 4096x4096 | 95% | Archive |
| Medium | 1024x1024 | 85% | Display |
| Thumbnail | 256x256 | 75% | Grid view |

**Validation**:
- Accepted types: JPEG, PNG, WebP
- Max file size: 10MB
- Min dimensions: 100x100
- Max dimensions: 4096x4096

**Returns**:

```typescript
interface ProcessedImage {
  original: Blob;
  medium: Blob;
  thumbnail: Blob;
  metadata: {
    originalWidth: number;
    originalHeight: number;
    originalSize: number;
    mediumSize: number;
    thumbnailSize: number;
  };
}
```

---

## Location Services

### GeolocationService

**File**: `lib/services/GeolocationService.ts`

Browser Geolocation API wrapper with reverse geocoding.

**Key Methods**:

```typescript
class GeolocationService {
  async getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition>
  async getCurrentPositionWithAddress(options?: PositionOptions): Promise<PositionWithAddress>
  async reverseGeocode(latitude: number, longitude: number): Promise<string>
  watchPosition(
    onSuccess: (position: GeolocationPosition) => void,
    onError: (error: GeolocationPositionError) => void,
    options?: PositionOptions
  ): number
  clearWatch(watchId: number): void
  isAvailable(): boolean
  formatCoordinates(lat: number, lon: number, precision?: number): string
}
```

**Reverse Geocoding**:
- Uses OpenStreetMap Nominatim API (free, no key required)
- Returns formatted address string

**Default Options**:
```typescript
{
  enableHighAccuracy: true,   // 10m accuracy
  timeout: 10000,             // 10 seconds
  maximumAge: 0               // No caching
}
```

### LocationCorrelationService

**File**: `lib/services/LocationCorrelationService.ts`

Match photo locations with existing location history.

**Key Methods**:

```typescript
class LocationCorrelationService {
  async findClosestLocation(
    userId: string,
    lat: number,
    lon: number,
    maxDistance?: number
  ): Promise<LocationData | null>

  async findLocationsWithinRadius(
    userId: string,
    lat: number,
    lon: number,
    radius: number
  ): Promise<LocationData[]>

  async getPopularActivities(userId: string): Promise<ActivityFrequency[]>

  async suggestActivity(
    userId: string,
    lat: number,
    lon: number,
    timestamp: Date
  ): Promise<string | null>

  calculateCorrelationStats(matches: CorrelationMatch[]): CorrelationStats
}
```

**Distance Calculation**:
- Uses Haversine formula for great-circle distance
- Default max distance: 100m
- Filters to last 30 days of location history

**Time-based Activity Suggestions**:

| Time Range | Suggested Activity |
|------------|-------------------|
| 6-9am | Morning Routine |
| 9am-5pm | Work |
| 5-8pm | Evening Activity |
| 8-11pm | Dinner |
| 11pm-6am | Home |

### GoogleMapsService

**File**: `lib/services/GoogleMapsService.ts`

Google Maps Distance Matrix API with caching.

**Key Methods**:

```typescript
class GoogleMapsService {
  async calculateTravelTime(
    origin: string,
    destination: string,
    departureTime: Date,
    mode?: 'driving' | 'walking' | 'transit' | 'bicycling'
  ): Promise<TravelTime>

  clearCache(): void
  getCacheStats(): CacheStats
}
```

**Caching**:
- TTL: 7 days
- Max cache size: 1000 entries
- Cache key includes: origin, destination, mode, hour
- LRU eviction when full

**Rate Limiting**:
- 50 requests/second (20ms between requests)
- Queue-based processing

**Fallback**: Returns 30-minute buffer if API key missing or error.

---

## Event Services

### EventSearchService

**File**: `lib/services/EventSearchService.ts`

Event search with fuzzy matching and ranking.

**Key Methods**:

```typescript
class EventSearchService {
  async searchEvents(
    userId: string,
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]>

  saveSearchHistory(query: string): void
  getSearchHistory(): string[]
  clearSearchHistory(): void
  highlightSearchTerms(text: string, query: string): string
}
```

**Search Scoring**:

| Match Type | Score |
|------------|-------|
| Title exact match | +100 |
| Title prefix match | +50 |
| Title substring | +25 |
| Title fuzzy match | +15 |
| Description substring | +10 |
| Location exact match | +40 |
| Participant exact match | +30 |
| Recency (< 30 days) | +5 |

**Fuzzy Matching**:
- Uses Levenshtein distance (max distance = 3)
- Only for strings < 20 chars (performance)

### ReminderService

**File**: `lib/services/ReminderService.ts`

Event reminder generation and management.

**Key Methods**:

```typescript
class ReminderService {
  generateSmartReminders(eventType: EventType): EventReminder[]
  createCustomReminder(timingMinutes: number): EventReminder
  addReminder(eventId: string, reminder: EventReminder): Promise<void>
  removeReminder(eventId: string, reminderId: string): Promise<void>
  updateReminders(eventId: string, reminders: EventReminder[]): Promise<void>
  formatReminderTiming(minutes: number): string
  validateReminderTiming(minutes: number, eventDatetime: Date): boolean
  calculateReminderTime(eventDatetime: Date, minutes: number): Date
  getStatusColor(status: ReminderStatus): string
  sortReminders(reminders: EventReminder[]): EventReminder[]
}
```

**Preset Timings**:
- 15, 30 minutes
- 1, 2 hours
- 1, 2 days
- 1 week

**Smart Defaults by Event Type**:

| Event Type | Default Reminders (minutes before) |
|------------|-----------------------------------|
| Meeting | 60, 5 |
| Deadline | 1440 (1 day), 10080 (1 week) |
| Social | 60 |
| Travel | 120, 1440 |

### ConflictDetectionService

**File**: `lib/services/ConflictDetectionService.ts`

Scheduling conflict detection between events.

**Key Methods**:

```typescript
class ConflictDetectionService {
  async detectConflicts(
    userId: string,
    targetEvent: Event,
    excludeEventId?: string
  ): Promise<Conflict[]>

  checkTemporalOverlap(event1: Event, event2: Event): boolean
  checkTravelTimeConflict(event1: Event, event2: Event): Promise<boolean>
  checkBackToBackConflict(event1: Event, event2: Event): boolean

  setConfig(config: ConflictConfig): void
  getConfig(): ConflictConfig
  formatConflictMessage(conflict: Conflict): string
  getConflictColor(severity: 'error' | 'warning'): string
  getConflictIcon(type: ConflictType): string
}
```

**Conflict Types**:

| Type | Severity | Description |
|------|----------|-------------|
| overlap | error | Events at same time |
| travel_time | warning | Not enough time to travel |
| back_to_back | warning | < 15 min gap |

**Configuration**:

```typescript
interface ConflictConfig {
  enabled: boolean;
  defaultBuffer: number;       // 30 minutes
  useGoogleMaps: boolean;
  transportMode: 'driving' | 'walking' | 'transit' | 'bicycling';
}
```

---

## Social Services

### CircleService

**File**: `lib/services/CircleService.ts`

Social circles management for group data sharing.

**Key Methods**:

```typescript
class CircleService {
  // Circle CRUD
  async createCircle(circleData: CreateCircleInput): Promise<string>
  async getCircles(userId: string): Promise<Circle[]>
  async getCircle(circleId: string): Promise<Circle>
  async updateCircle(circleId: string, updates: Partial<Circle>): Promise<void>
  async deleteCircle(circleId: string): Promise<void>

  // Invitations
  async inviteToCircle(circleId: string, friendId: string, message?: string): Promise<string>
  async getCircleInvites(userId: string): Promise<CircleInvite[]>
  async acceptInvite(inviteId: string): Promise<void>
  async rejectInvite(inviteId: string): Promise<void>

  // Members
  async getCircleMembers(circleId: string): Promise<CircleMember[]>
  async updateMemberRole(circleId: string, userId: string, role: MemberRole): Promise<void>
  async removeMember(circleId: string, userId: string, reason?: string): Promise<void>
  async leaveCircle(circleId: string, userId: string): Promise<void>

  // Messages
  async sendMessage(circleId: string, content: string, type?: MessageType): Promise<string>
  async getMessages(circleId: string, limit?: number, startAfterId?: string): Promise<CircleMessage[]>
  async deleteMessage(circleId: string, messageId: string): Promise<void>
  async addReaction(circleId: string, messageId: string, emoji: string): Promise<void>

  // Analytics
  async getAnalytics(circleId: string): Promise<CircleAnalytics>
}
```

**Security**:
- Validates user is circle member for all operations
- Creator role required for administrative operations
- Data sharing rules enforce per-type privacy

---

## Billing & Usage

### UsageTracker

**File**: `lib/services/UsageTracker.ts`

Server-side API usage and cost tracking.

**Key Methods**:

```typescript
class UsageTracker {
  async trackEmbedding(userId: string, tokens: number, endpoint: string, metadata?: any): Promise<void>
  async trackChatCompletion(userId: string, promptTokens: number, completionTokens: number, endpoint: string): Promise<void>
  async trackTranscription(userId: string, durationSeconds: number, endpoint: string): Promise<void>
  async trackImageDescription(userId: string, promptTokens: number, completionTokens: number, endpoint: string): Promise<void>
  async trackPineconeQuery(userId: string, vectorCount: number, endpoint: string): Promise<void>
  async trackPineconeUpsert(userId: string, vectorCount: number, endpoint: string): Promise<void>
  async checkLimits(userId: string): Promise<LimitCheckResult>
}
```

**Storage**: Writes to Firestore `promptExecutions` collection

**Cost Estimation**:

| Operation | Cost |
|-----------|------|
| Embedding (per 1K tokens) | $0.0001 |
| GPT-4o (per 1K prompt tokens) | $0.0025 |
| GPT-4o (per 1K completion tokens) | $0.01 |
| Whisper (per minute) | $0.006 |
| Pinecone query (per 1K) | $0.0001 |
| Pinecone upsert (per 1K) | $0.001 |

### OpenAIBillingService

**File**: `lib/services/OpenAIBillingService.ts`

Fetch real billing data from OpenAI API.

**Key Methods**:

```typescript
class OpenAIBillingService {
  async fetchUsage(startDate: string, endDate: string, useCache?: boolean): Promise<OpenAIBillingData>
  isConfigured(): boolean
}
```

**Requirements**: `OPENAI_ORG_API_KEY` (Organization API key, not project key)

**Data Sources**:
1. OpenAI Costs API (preferred)
2. OpenAI Usage API (fallback, estimates costs)

**Caching**: 6-hour TTL via BillingCacheService

### PineconeBillingService

**File**: `lib/services/PineconeBillingService.ts`

Fetch usage data from Pinecone.

**Key Methods**:

```typescript
class PineconeBillingService {
  async fetchUsage(startDate: string, endDate: string, useCache?: boolean): Promise<PineconeBillingData>
  isConfigured(): boolean
}
```

**Calculates**:
- Storage costs: `(vectorCount * dimension * 4) / (1024^3) * perGBMonth`
- Operation costs from `usageEvents` collection

**Pricing** (serverless):
- Read operations: $0.10 per 1M
- Write operations: $1.00 per 1M
- Storage: $0.10 per GB/month

### BillingCacheService

**File**: `lib/services/BillingCacheService.ts`

Firestore-based caching for billing data.

**Key Methods**:

```typescript
class BillingCacheService {
  async get<T>(provider: string, startDate: string, endDate: string): Promise<T | null>
  async set<T>(provider: string, startDate: string, endDate: string, data: T): Promise<void>
  async invalidate(provider: string, startDate: string, endDate: string): Promise<void>
  async invalidateAll(provider: string): Promise<void>
  async cleanup(): Promise<void>
}
```

**Cache TTLs**:
- OpenAI: 6 hours
- Pinecone: 12 hours
- GCP: 24 hours

**Storage**: Firestore collection `billingCache`

---

## Configuration Services

### PromptService

**File**: `lib/services/PromptService.ts`

Dynamic prompt management for AI services.

**Key Methods**:

```typescript
class PromptService {
  async listConfigs(language?: string, service?: string): Promise<FirestorePromptConfig[]>
  async getConfig(language: string, service: string): Promise<FirestorePromptConfig | null>
  async saveConfig(config: FirestorePromptConfig, adminUid: string, notes?: string): Promise<void>
  async updatePrompt(
    language: string,
    service: string,
    promptId: string,
    updates: Partial<PromptDefinition>,
    adminUid: string,
    notes?: string
  ): Promise<void>
  async setEnabled(language: string, service: string, enabled: boolean, adminUid: string): Promise<void>
  async setStatus(language: string, service: string, status: PromptStatus, adminUid: string): Promise<void>
  async getVersionHistory(service: string, language: string, promptId?: string, limit?: number): Promise<PromptVersion[]>
  async deleteConfig(language: string, service: string): Promise<void>
}
```

**Storage Structure**:

```
promptConfigs/
  {language}/
    services/
      {service}/
        prompts: Record<promptId, PromptDefinition>
        status: 'draft' | 'published' | 'archived'
        enabled: boolean
        ...
```

**Supported Languages**: en, es, fr, de, ja, zh

**Supported Services**:
- rag_engine
- event_extraction
- prompt_expansion
- memory_generator
- sentiment_analysis
- entity_extraction
- suggestion_engine
- daily_summary
- life_feed
- transcription

---

## Critical Implementation Patterns

### User Data Isolation

**CRITICAL**: All services must filter by userId to prevent data leakage.

```typescript
// Firestore query
const docs = await firestore
  .collection('textNotes')
  .where('userId', '==', userId)  // MANDATORY
  .get();

// Pinecone query
const results = await pinecone.query({
  vector: embedding,
  filter: { userId: userId },       // MANDATORY
  topK: 10,
});
```

### Null Value Handling

**CRITICAL**: Pinecone rejects null values in metadata.

```typescript
const cleanMetadata: Record<string, any> = {};
for (const [key, value] of Object.entries(metadata)) {
  if (value !== null && value !== undefined) {
    cleanMetadata[key] = value;
  }
}
```

### Timestamp Serialization

Firestore Timestamps are not serializable for Redux:

```typescript
function serializeTimestamp(data: any): string | any {
  if (data && typeof data === 'object' && typeof data.toDate === 'function') {
    return data.toDate().toISOString();
  }
  return data;
}
```

---

## Related Documentation

- [API Reference](./API_REFERENCE.md) - Endpoint documentation
- [Database Schema](./DATABASE_SCHEMA.md) - Data models
- [External Services](./infrastructure/EXTERNAL_SERVICES.md) - API integrations
- [Architecture](./ARCHITECTURE.md) - System overview
