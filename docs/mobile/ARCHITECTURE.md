# Mobile App Architecture

System architecture and design patterns for the PersonalAI mobile application.

## Overview

PersonalAI Mobile follows an offline-first architecture with local storage (WatermelonDB), background sync to Firebase, and AI processing via Cloud Functions.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PersonalAI Mobile App                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Screens    │  │  Components  │  │  Navigation  │              │
│  │   (65+)      │  │   (30+)      │  │  (Stack/Tab) │              │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘              │
│         │                 │                                         │
│         ▼                 ▼                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Redux Store (15 slices)                   │   │
│  │  auth │ settings │ health │ location │ voice │ chat │ ...   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│         ┌────────────────────┼────────────────────┐                │
│         ▼                    ▼                    ▼                │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐        │
│  │   Services  │      │ WatermelonDB│      │  API Layer  │        │
│  │   (38+)     │      │   (SQLite)  │      │             │        │
│  └──────┬──────┘      └──────┬──────┘      └──────┬──────┘        │
│         │                    │                    │                │
└─────────│────────────────────│────────────────────│────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  Native APIs    │   │   SyncManager   │   │  Firebase SDK   │
│  HealthKit      │   │   Background    │   │  Auth/Firestore │
│  Core Location  │   │   Sync Queue    │   │  Storage        │
└─────────────────┘   └────────┬────────┘   └────────┬────────┘
                               │                     │
                               ▼                     ▼
                      ┌─────────────────────────────────────┐
                      │        Firebase Cloud Backend       │
                      │  Firestore │ Storage │ Functions    │
                      └─────────────────────────────────────┘
                                        │
                      ┌─────────────────┼─────────────────┐
                      ▼                 ▼                 ▼
               ┌───────────┐     ┌───────────┐     ┌───────────┐
               │  OpenAI   │     │ Pinecone  │     │   Other   │
               │ Embeddings│     │  Vectors  │     │  Services │
               │ GPT-4o    │     │  1536D    │     │           │
               └───────────┘     └───────────┘     └───────────┘
```

---

## Data Flow

### 1. Data Collection Flow

```
User Action / Background Event
           │
           ▼
┌─────────────────────────────┐
│    Data Collector Service   │
│  (Health/Location/Voice)    │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      WatermelonDB           │
│   (Local SQLite Storage)    │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│       SyncManager           │
│  (Background Sync Queue)    │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│    Firebase Firestore       │
│   (Cloud Database)          │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│   Cloud Function Trigger    │
│  (onDocumentCreated)        │
└──────────────┬──────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
┌─────────┐         ┌─────────┐
│ OpenAI  │         │Pinecone │
│Embedding│ ──────▶ │ Upsert  │
└─────────┘         └─────────┘
```

### 2. RAG Query Flow

```
User Question
      │
      ▼
┌───────────────────────────┐
│      RAGEngine.query()    │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│   Generate Query Embedding │
│   (OpenAI text-embedding)  │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│    Query Pinecone Vectors  │
│   (filter: userId, topK)   │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  Fetch Full Docs from      │
│  Firestore (by embeddingId)│
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│    Build Context String    │
│  (format for GPT-4o)       │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│   Chat Completion (GPT-4o) │
│   with context + history   │
└───────────┬───────────────┘
            │
            ▼
      AI Response
```

---

## Service Architecture

### Service Categories

| Category | Services | Purpose |
|----------|----------|---------|
| **Data Collection** | HealthDataCollector, LocationTracker, VoiceRecorder | Native data capture |
| **Data Processing** | EmbeddingPipeline, TextNormalizer | Transform data for AI |
| **AI/RAG** | RAGEngine, ConversationManager | Intelligent chat |
| **Audio** | TTSService, AudioService, WakeWordDetector | Voice features |
| **Sync** | SyncManager, ConflictResolver | Cloud synchronization |
| **Storage** | WatermelonDB adapters, FileManager | Local persistence |

### Singleton Pattern

All services use singleton pattern for consistent state:

```typescript
class HealthDataCollector {
  private static instance: HealthDataCollector;
  private isCollecting: boolean = false;

  private constructor() {
    // Private to enforce singleton
  }

  static getInstance(): HealthDataCollector {
    if (!HealthDataCollector.instance) {
      HealthDataCollector.instance = new HealthDataCollector();
    }
    return HealthDataCollector.instance;
  }

  async startCollection(userId: string): Promise<void> {
    if (this.isCollecting) return;
    this.isCollecting = true;
    // Collection logic...
  }
}
```

### Service Initialization Order

```typescript
// App initialization sequence
async function initializeApp() {
  // 1. Firebase Auth (must be first)
  await FirebaseService.initialize();

  // 2. Local database
  await WatermelonDB.initialize();

  // 3. Redux store hydration
  await persistor.persist();

  // 4. Background services (after auth)
  if (isAuthenticated) {
    await SyncManager.initialize(userId);
    await HealthDataCollector.start(userId);
    await LocationTracker.start(userId);
  }
}
```

---

## State Management

### Redux Store Structure

```typescript
interface RootState {
  // Authentication
  auth: AuthState;

  // User preferences
  settings: SettingsState;

  // Data slices
  health: HealthState;
  location: LocationState;
  voice: VoiceState;
  photos: PhotoState;
  textNotes: TextNotesState;

  // AI/Chat
  chat: ChatState;
  rag: RAGState;

  // UI state
  ui: UIState;
  navigation: NavigationState;

  // Sync status
  sync: SyncState;

  // Onboarding
  onboarding: OnboardingState;

  // Notifications
  notifications: NotificationState;
}
```

### Persistence Strategy

```typescript
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: [
    'auth',         // User session
    'settings',     // User preferences
    'onboarding',   // Onboarding progress
  ],
  // Data is in WatermelonDB, not persisted in Redux
  blacklist: [
    'health',
    'location',
    'voice',
    'sync',
  ],
};
```

---

## Navigation Architecture

### Navigator Structure

```
RootNavigator
├── AuthStack (unauthenticated)
│   ├── WelcomeScreen
│   ├── LoginScreen
│   └── SignUpScreen
│
└── MainStack (authenticated)
    ├── OnboardingStack
    │   ├── PermissionsScreen
    │   ├── HealthSetupScreen
    │   └── LocationSetupScreen
    │
    └── MainTabs
        ├── HomeTab
        │   ├── DashboardScreen
        │   └── DataDetailScreen
        │
        ├── ChatTab
        │   ├── ChatListScreen
        │   └── ChatConversationScreen
        │
        ├── CreateTab
        │   ├── QuickThoughtScreen
        │   ├── DiaryScreen
        │   ├── VoiceNoteScreen
        │   └── PhotoScreen
        │
        └── SettingsTab
            ├── SettingsScreen
            ├── ProfileScreen
            └── DataManagementScreen
```

### Auth-Based Navigation

```typescript
function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
```

---

## Database Architecture

### WatermelonDB Schema

```typescript
// Local SQLite schema
const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'health_data',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'data_type', type: 'string' },
        { name: 'value', type: 'number' },
        { name: 'unit', type: 'string' },
        { name: 'source', type: 'string' },
        { name: 'recorded_at', type: 'number', isIndexed: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'sync_status', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'location_data',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'accuracy', type: 'number' },
        { name: 'activity_type', type: 'string', isOptional: true },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'recorded_at', type: 'number', isIndexed: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'sync_status', type: 'string' },
      ],
    }),
    // ... more tables
  ],
});
```

### Sync Status States

```typescript
type SyncStatus =
  | 'pending'      // Created locally, not synced
  | 'syncing'      // Currently uploading
  | 'synced'       // Successfully synced
  | 'error'        // Sync failed
  | 'conflict';    // Conflict detected
```

---

## Component Architecture

### Component Categories

| Category | Components | Examples |
|----------|------------|----------|
| **Core** | Base components | Button, Card, Input, Modal |
| **Data Display** | Data visualization | HealthChart, LocationMap, StatsCard |
| **Input** | User input | VoiceRecorder, PhotoPicker, TextEditor |
| **Navigation** | Nav components | TabBar, Header, BackButton |
| **Feedback** | User feedback | Toast, Loading, EmptyState |
| **Auth** | Authentication | GoogleSignIn, AuthGuard |

### Theme System

```typescript
// 5 color themes available
type ThemeName = 'light' | 'dark' | 'ocean' | 'forest' | 'sunset';

interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    error: string;
    success: string;
    warning: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    h1: TextStyle;
    h2: TextStyle;
    body: TextStyle;
    caption: TextStyle;
  };
}
```

### Component Patterns

**Container/Presenter Pattern:**

```typescript
// Container (logic)
function HealthDataContainer() {
  const { data, isLoading } = useHealthData();
  const dispatch = useDispatch();

  const handleRefresh = () => {
    dispatch(fetchHealthData());
  };

  return (
    <HealthDataPresenter
      data={data}
      isLoading={isLoading}
      onRefresh={handleRefresh}
    />
  );
}

// Presenter (UI only)
function HealthDataPresenter({ data, isLoading, onRefresh }) {
  if (isLoading) return <Loading />;
  return <HealthChart data={data} onRefresh={onRefresh} />;
}
```

---

## Security Architecture

### Data Isolation

Every piece of data is tagged with `userId`:

```typescript
interface BaseDocument {
  id: string;
  userId: string;  // CRITICAL: Always present
  createdAt: string;
  updatedAt: string;
}
```

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /healthData/{docId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }

    match /locationData/{docId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
  }
}
```

### API Key Protection

```typescript
// Keys stored securely
// iOS: Keychain
// Android: EncryptedSharedPreferences

import { getSecureItem } from '@/utils/secureStorage';

const apiKey = await getSecureItem('OPENAI_API_KEY');
```

---

## Performance Considerations

### Battery Optimization

```typescript
// Location tracking with battery awareness
const locationConfig = {
  desiredAccuracy: Location.Accuracy.Balanced,
  distanceFilter: 50, // meters
  deferredUpdatesInterval: 60000, // ms
  pausesUpdatesAutomatically: true,
};
```

### Memory Management

```typescript
// Large data pagination
async function fetchHealthData(userId: string, page: number) {
  const pageSize = 100;
  return database
    .collections.get('health_data')
    .query(
      Q.where('user_id', userId),
      Q.sortBy('recorded_at', Q.desc),
      Q.skip(page * pageSize),
      Q.take(pageSize)
    )
    .fetch();
}
```

### Network Optimization

```typescript
// Batch sync for efficiency
class SyncManager {
  private pendingBatch: Document[] = [];
  private batchSize = 50;

  async addToQueue(doc: Document) {
    this.pendingBatch.push(doc);
    if (this.pendingBatch.length >= this.batchSize) {
      await this.flushBatch();
    }
  }

  async flushBatch() {
    const batch = writeBatch(firestore);
    this.pendingBatch.forEach(doc => {
      batch.set(doc.ref, doc.data);
    });
    await batch.commit();
    this.pendingBatch = [];
  }
}
```

---

## Related Documentation

- [Services Reference](./SERVICES.md) - Detailed service documentation
- [Sync & Storage](./SYNC.md) - WatermelonDB and sync system
- [Build Guide](./BUILD.md) - Building for iOS and Android
