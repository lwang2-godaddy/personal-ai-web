# Mobile Services Reference

Comprehensive documentation for all services in the PersonalAI mobile application.

## Overview

The mobile app contains 38+ services organized into categories:

| Category | Services | Purpose |
|----------|----------|---------|
| Data Collection | 5 | Native data capture |
| Data Processing | 4 | Transform and prepare data |
| AI/RAG | 3 | Intelligent chat |
| Audio | 4 | Voice and TTS features |
| Sync | 3 | Cloud synchronization |
| Storage | 2 | Local persistence |
| API | 4 | External service clients |
| Utilities | 8+ | Helper services |

---

## Data Collection Services

### HealthDataCollector

**Location:** `src/services/dataCollection/HealthDataCollector.ts`

Collects health and fitness data from HealthKit (iOS) and Google Fit (Android).

```typescript
class HealthDataCollector {
  static getInstance(): HealthDataCollector;

  async initialize(): Promise<boolean>;
  async requestPermissions(): Promise<PermissionResult>;

  async getStepCount(start: Date, end: Date): Promise<HealthData[]>;
  async getHeartRateSamples(start: Date, end: Date): Promise<HealthData[]>;
  async getSleepSamples(start: Date, end: Date): Promise<HealthData[]>;
  async getWorkouts(start: Date, end: Date): Promise<HealthData[]>;

  async startBackgroundCollection(userId: string): Promise<void>;
  async stopBackgroundCollection(): Promise<void>;
}
```

**Related:** [Health Data Documentation](./HEALTH_DATA.md)

---

### LocationTracker

**Location:** `src/services/dataCollection/LocationTracker.ts`

Tracks user location with battery-optimized background updates.

```typescript
class LocationTracker {
  static getInstance(): LocationTracker;

  async requestPermissions(): Promise<boolean>;
  async startTracking(userId: string): Promise<void>;
  async stopTracking(): Promise<void>;

  async getCurrentLocation(): Promise<LocationData>;
  async reverseGeocode(lat: number, lng: number): Promise<string>;

  setAccuracyMode(mode: 'high' | 'balanced' | 'low'): void;
}
```

**Related:** [Location Documentation](./LOCATION.md)

---

### VoiceRecorder

**Location:** `src/services/dataCollection/VoiceRecorder.ts`

Records audio with quality presets.

```typescript
class VoiceRecorder {
  static getInstance(): VoiceRecorder;

  async initialize(): Promise<void>;
  async startRecording(): Promise<void>;
  async stopRecording(): Promise<RecordingResult>;
  async cancelRecording(): Promise<void>;

  isRecording(): boolean;
  getDuration(): number;
}
```

**Related:** [Voice Documentation](./VOICE.md)

---

### PhotoService

**Location:** `src/services/dataCollection/PhotoService.ts`

Handles photo capture and library access.

```typescript
class PhotoService {
  static getInstance(): PhotoService;

  async requestPermissions(): Promise<boolean>;
  async launchCamera(): Promise<PhotoResult>;
  async launchLibrary(): Promise<PhotoResult>;

  async processImage(uri: string): Promise<ProcessedImage>;
  async extractExifData(uri: string): Promise<ExifData>;
}
```

---

### ManualEntryService

**Location:** `src/services/dataCollection/ManualEntryService.ts`

Handles manual data entry (text notes, tags).

```typescript
class ManualEntryService {
  static getInstance(): ManualEntryService;

  async createTextNote(note: TextNoteInput): Promise<TextNote>;
  async updateTextNote(id: string, updates: Partial<TextNote>): Promise<TextNote>;
  async deleteTextNote(id: string): Promise<void>;

  async addTags(dataId: string, tags: string[]): Promise<void>;
  async removeTags(dataId: string, tags: string[]): Promise<void>;
}
```

---

## Data Processing Services

### EmbeddingPipeline

**Location:** `src/services/dataProcessing/EmbeddingPipeline.ts`

Converts data to natural language and generates embeddings.

```typescript
class EmbeddingPipeline {
  static getInstance(): EmbeddingPipeline;

  async processHealthData(data: HealthData): Promise<EmbeddingResult>;
  async processLocationData(data: LocationData): Promise<EmbeddingResult>;
  async processVoiceNote(note: VoiceNote): Promise<EmbeddingResult>;
  async processTextNote(note: TextNote): Promise<EmbeddingResult>;
  async processPhoto(photo: PhotoMemory): Promise<EmbeddingResult>;

  async generateEmbedding(text: string): Promise<number[]>;
}
```

**Processing Flow:**
```
Raw Data → Text Generator → Natural Language → OpenAI Embedding → 1536D Vector
```

---

### TextNormalizer

**Location:** `src/services/dataProcessing/TextNormalizer.ts`

Normalizes and cleans text for embedding.

```typescript
class TextNormalizer {
  static normalize(text: string): string;
  static removeEmoji(text: string): string;
  static removeUrls(text: string): string;
  static truncate(text: string, maxLength: number): string;
}
```

---

### DataAggregator

**Location:** `src/services/dataProcessing/DataAggregator.ts`

Aggregates data for summaries and analytics.

```typescript
class DataAggregator {
  static getInstance(): DataAggregator;

  async getDailySummary(userId: string, date: Date): Promise<DailySummary>;
  async getWeeklySummary(userId: string, week: Date): Promise<WeeklySummary>;
  async getDataCounts(userId: string): Promise<DataCounts>;
}
```

---

### ActivityClassifier

**Location:** `src/services/dataProcessing/ActivityClassifier.ts`

Classifies location visits into activity types.

```typescript
class ActivityClassifier {
  static getInstance(): ActivityClassifier;

  async classifyLocation(location: LocationData): Promise<ActivityType>;
  async learnFromUser(location: LocationData, activity: string): Promise<void>;
}
```

---

## AI/RAG Services

### RAGEngine

**Location:** `src/services/rag/RAGEngine.ts`

Core RAG (Retrieval-Augmented Generation) engine.

```typescript
class RAGEngine {
  static getInstance(): RAGEngine;

  async query(
    message: string,
    userId: string,
    options?: RAGOptions
  ): Promise<RAGResponse>;

  async queryWithHistory(
    message: string,
    userId: string,
    history: ChatMessage[],
    options?: RAGOptions
  ): Promise<RAGResponse>;

  async queryByDataType(
    message: string,
    userId: string,
    dataType: DataType
  ): Promise<RAGResponse>;
}

interface RAGOptions {
  topK?: number;           // Default: 10
  temperature?: number;    // Default: 0.7
  maxTokens?: number;      // Default: 2000
  filterByDate?: DateRange;
  filterByType?: DataType[];
}

interface RAGResponse {
  response: string;
  sources: Source[];
  tokensUsed: number;
}
```

**Query Flow:**
```
User Question
    ↓
Generate Query Embedding (OpenAI)
    ↓
Query Pinecone (filter: userId, topK)
    ↓
Fetch Full Documents (Firestore)
    ↓
Build Context String
    ↓
Chat Completion (GPT-4o)
    ↓
Response + Sources
```

---

### ConversationManager

**Location:** `src/services/rag/ConversationManager.ts`

Manages conversation history and context.

```typescript
class ConversationManager {
  static getInstance(): ConversationManager;

  async createConversation(userId: string): Promise<Conversation>;
  async getConversation(conversationId: string): Promise<Conversation>;
  async addMessage(conversationId: string, message: ChatMessage): Promise<void>;
  async getHistory(conversationId: string, limit?: number): Promise<ChatMessage[]>;
  async deleteConversation(conversationId: string): Promise<void>;
}
```

---

### ContextBuilder

**Location:** `src/services/rag/ContextBuilder.ts`

Builds context strings for GPT from retrieved vectors.

```typescript
class ContextBuilder {
  static buildContext(vectors: PineconeVector[]): string;
  static formatHealthData(data: HealthData): string;
  static formatLocationData(data: LocationData): string;
  static formatVoiceNote(note: VoiceNote): string;
  static formatTextNote(note: TextNote): string;
}
```

---

## Audio Services

### TTSService

**Location:** `src/services/audio/TTSService.ts`

Text-to-speech with dual providers.

```typescript
class TTSService {
  static getInstance(): TTSService;

  async speak(text: string, options?: TTSOptions): Promise<void>;
  async stop(): Promise<void>;

  setProvider(provider: 'native' | 'openai'): void;
  getProvider(): 'native' | 'openai';

  async getAvailableVoices(): Promise<Voice[]>;
  setVoice(voiceId: string): void;
}
```

**Related:** [Voice Documentation](./VOICE.md)

---

### TranscriptionService

**Location:** `src/services/audio/TranscriptionService.ts`

Speech-to-text using OpenAI Whisper.

```typescript
class TranscriptionService {
  static getInstance(): TranscriptionService;

  async transcribe(audioUri: string, userId: string): Promise<TranscriptionResult>;
  async transcribeWithTimestamps(audioUri: string): Promise<TranscriptionWithTimestamps>;
}
```

---

### AudioPlayer

**Location:** `src/services/audio/AudioPlayer.ts`

Audio playback service.

```typescript
class AudioPlayer {
  static getInstance(): AudioPlayer;

  async load(uri: string): Promise<void>;
  async play(): Promise<void>;
  async pause(): Promise<void>;
  async stop(): Promise<void>;
  async seekTo(position: number): Promise<void>;

  getDuration(): number;
  getCurrentPosition(): number;
  isPlaying(): boolean;
}
```

---

### WakeWordDetector

**Location:** `src/services/audio/WakeWordDetector.ts`

Wake word detection for hands-free activation.

```typescript
class WakeWordDetector {
  static getInstance(): WakeWordDetector;

  async initialize(): Promise<void>;
  async startListening(onWakeWord: () => void): Promise<void>;
  async stopListening(): Promise<void>;

  setWakePhrase(phrase: string): void;
  isListening(): boolean;
}
```

---

## Sync Services

### SyncManager

**Location:** `src/services/sync/SyncManager.ts`

Manages offline/online synchronization.

```typescript
class SyncManager {
  static getInstance(): SyncManager;

  async initialize(userId: string): Promise<void>;
  async syncAll(): Promise<SyncResult>;
  async syncCollection(collection: string): Promise<SyncResult>;

  async addToQueue(item: SyncQueueItem): Promise<void>;
  async processQueue(): Promise<void>;

  getSyncStatus(): SyncStatus;
  getLastSyncTime(): Date | null;
}

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: SyncError[];
}
```

**Related:** [Sync & Storage Documentation](./SYNC.md)

---

### ConflictResolver

**Location:** `src/services/sync/ConflictResolver.ts`

Handles sync conflicts.

```typescript
class ConflictResolver {
  static getInstance(): ConflictResolver;

  async resolve(
    local: Document,
    remote: Document,
    strategy?: ConflictStrategy
  ): Promise<Document>;
}

type ConflictStrategy = 'local-wins' | 'remote-wins' | 'merge' | 'ask-user';
```

---

### NetworkMonitor

**Location:** `src/services/sync/NetworkMonitor.ts`

Monitors network connectivity.

```typescript
class NetworkMonitor {
  static getInstance(): NetworkMonitor;

  isOnline(): boolean;
  getConnectionType(): 'wifi' | 'cellular' | 'none';

  onOnline(callback: () => void): () => void;
  onOffline(callback: () => void): () => void;
}
```

---

## Storage Services

### DatabaseService

**Location:** `src/services/storage/DatabaseService.ts`

WatermelonDB wrapper for local storage.

```typescript
class DatabaseService {
  static getInstance(): DatabaseService;

  async initialize(): Promise<void>;
  getDatabase(): Database;

  async query<T>(collection: string, query: Q.Clause[]): Promise<T[]>;
  async create<T>(collection: string, data: Partial<T>): Promise<T>;
  async update<T>(collection: string, id: string, data: Partial<T>): Promise<T>;
  async delete(collection: string, id: string): Promise<void>;

  async clearAll(): Promise<void>;
}
```

---

### FileManager

**Location:** `src/services/storage/FileManager.ts`

Local file system management.

```typescript
class FileManager {
  static getInstance(): FileManager;

  async saveFile(uri: string, directory: string): Promise<string>;
  async deleteFile(path: string): Promise<void>;
  async getFileInfo(path: string): Promise<FileInfo>;
  async listFiles(directory: string): Promise<string[]>;

  async getStorageUsage(): Promise<StorageUsage>;
  async clearCache(): Promise<void>;
}
```

---

## API Services

### OpenAIService

**Location:** `src/api/OpenAIService.ts`

OpenAI API client.

```typescript
class OpenAIService {
  static getInstance(): OpenAIService;

  async generateEmbedding(text: string): Promise<number[]>;
  async chatCompletion(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<string>;
  async transcribeAudio(audioUri: string): Promise<string>;
  async generateSpeech(text: string, voice: string): Promise<string>;
}
```

---

### PineconeService

**Location:** `src/api/PineconeService.ts`

Pinecone vector database client.

```typescript
class PineconeService {
  static getInstance(): PineconeService;

  async upsert(vectors: Vector[]): Promise<void>;
  async query(
    vector: number[],
    userId: string,
    topK?: number,
    filter?: Record<string, any>
  ): Promise<QueryResult>;
  async delete(ids: string[]): Promise<void>;
}
```

---

### FirebaseService

**Location:** `src/api/FirebaseService.ts`

Firebase client wrapper.

```typescript
class FirebaseService {
  static getInstance(): FirebaseService;

  // Auth
  async signInWithGoogle(): Promise<User>;
  async signOut(): Promise<void>;
  getCurrentUser(): User | null;

  // Firestore
  async getDocument(collection: string, id: string): Promise<Document>;
  async setDocument(collection: string, id: string, data: any): Promise<void>;
  async queryDocuments(collection: string, constraints: any[]): Promise<Document[]>;

  // Storage
  async uploadFile(path: string, uri: string): Promise<string>;
  async downloadFile(path: string): Promise<string>;
  async deleteFile(path: string): Promise<void>;
}
```

---

### AnalyticsService

**Location:** `src/api/AnalyticsService.ts`

Analytics and event tracking.

```typescript
class AnalyticsService {
  static getInstance(): AnalyticsService;

  async logEvent(name: string, params?: Record<string, any>): Promise<void>;
  async setUserProperty(name: string, value: string): Promise<void>;
  async setUserId(userId: string): Promise<void>;
}
```

---

## Utility Services

### PermissionService

**Location:** `src/services/utils/PermissionService.ts`

Centralized permission management.

```typescript
class PermissionService {
  static getInstance(): PermissionService;

  async checkPermission(permission: PermissionType): Promise<PermissionStatus>;
  async requestPermission(permission: PermissionType): Promise<boolean>;
  async requestMultiple(permissions: PermissionType[]): Promise<PermissionResults>;

  async openSettings(): Promise<void>;
}
```

---

### NotificationService

**Location:** `src/services/utils/NotificationService.ts`

Push and local notifications.

```typescript
class NotificationService {
  static getInstance(): NotificationService;

  async initialize(): Promise<void>;
  async requestPermission(): Promise<boolean>;

  async scheduleLocal(notification: LocalNotification): Promise<string>;
  async cancelNotification(id: string): Promise<void>;
  async cancelAll(): Promise<void>;

  async getToken(): Promise<string>;
}
```

---

### CacheService

**Location:** `src/services/utils/CacheService.ts`

In-memory and persistent caching.

```typescript
class CacheService {
  static getInstance(): CacheService;

  async get<T>(key: string): Promise<T | null>;
  async set<T>(key: string, value: T, ttl?: number): Promise<void>;
  async delete(key: string): Promise<void>;
  async clear(): Promise<void>;

  has(key: string): boolean;
}
```

---

### UsageTracker

**Location:** `src/services/utils/UsageTracker.ts`

Tracks API usage for billing.

```typescript
class UsageTracker {
  static getInstance(): UsageTracker;

  async recordEvent(event: UsageEvent): Promise<void>;
  async getUsage(userId: string, period: Period): Promise<UsageSummary>;
  async estimateCost(usage: UsageSummary): Promise<CostEstimate>;
}
```

---

### ErrorReporter

**Location:** `src/services/utils/ErrorReporter.ts`

Error tracking and reporting.

```typescript
class ErrorReporter {
  static getInstance(): ErrorReporter;

  async report(error: Error, context?: Record<string, any>): Promise<void>;
  async setUser(userId: string): Promise<void>;
  async log(message: string, level: LogLevel): Promise<void>;
}
```

---

### ConfigService

**Location:** `src/services/utils/ConfigService.ts`

Remote configuration.

```typescript
class ConfigService {
  static getInstance(): ConfigService;

  async initialize(): Promise<void>;
  async fetch(): Promise<void>;

  getString(key: string, defaultValue?: string): string;
  getNumber(key: string, defaultValue?: number): number;
  getBoolean(key: string, defaultValue?: boolean): boolean;
}
```

---

## Service Initialization

### Initialization Order

```typescript
// App.tsx or initialization file
async function initializeServices(): Promise<void> {
  // 1. Core services (no dependencies)
  await ConfigService.getInstance().initialize();
  await ErrorReporter.getInstance().setUser(userId);

  // 2. Storage services
  await DatabaseService.getInstance().initialize();
  await CacheService.getInstance().initialize();

  // 3. Auth services
  await FirebaseService.getInstance().initialize();

  // 4. Data services (require auth)
  if (isAuthenticated) {
    await SyncManager.getInstance().initialize(userId);
    await HealthDataCollector.getInstance().initialize();
    await LocationTracker.getInstance().startTracking(userId);
  }

  // 5. Optional services
  if (settings.wakeWordEnabled) {
    await WakeWordDetector.getInstance().initialize();
  }
}
```

---

## Service Lifecycle

### Cleanup on Sign Out

```typescript
async function cleanupOnSignOut(): Promise<void> {
  // Stop background services
  await LocationTracker.getInstance().stopTracking();
  await HealthDataCollector.getInstance().stopBackgroundCollection();
  await WakeWordDetector.getInstance().stopListening();

  // Clear local data
  await DatabaseService.getInstance().clearAll();
  await CacheService.getInstance().clear();
  await FileManager.getInstance().clearCache();

  // Reset singletons (optional)
  // Services will reinitialize on next sign in
}
```

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System design
- [Sync & Storage](./SYNC.md) - Data synchronization
- [Health Data](./HEALTH_DATA.md) - Health collection
- [Location](./LOCATION.md) - Location tracking
- [Voice](./VOICE.md) - Voice features
