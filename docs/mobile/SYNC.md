# Sync & Storage

Documentation for WatermelonDB local storage and cloud synchronization in the PersonalAI mobile app.

## Overview

PersonalAI uses an offline-first architecture:

1. **Local Storage:** WatermelonDB (SQLite) for instant access
2. **Cloud Sync:** Firebase Firestore for backup and cross-device access
3. **File Storage:** Firebase Storage for audio/image files

---

## WatermelonDB

### Why WatermelonDB?

- **Lazy loading:** Only loads data when needed
- **Observable queries:** React components re-render on data changes
- **Offline-first:** Full functionality without internet
- **SQLite backend:** Proven, reliable local database

### Database Schema

```typescript
// database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // Health data
    tableSchema({
      name: 'health_data',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'data_type', type: 'string', isIndexed: true },
        { name: 'value', type: 'number' },
        { name: 'unit', type: 'string' },
        { name: 'source', type: 'string' },
        { name: 'metadata', type: 'string', isOptional: true },
        { name: 'recorded_at', type: 'number', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'embedding_id', type: 'string', isOptional: true },
      ],
    }),

    // Location data
    tableSchema({
      name: 'location_data',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'accuracy', type: 'number' },
        { name: 'altitude', type: 'number', isOptional: true },
        { name: 'speed', type: 'number', isOptional: true },
        { name: 'heading', type: 'number', isOptional: true },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'place_name', type: 'string', isOptional: true },
        { name: 'place_type', type: 'string', isOptional: true },
        { name: 'activity_type', type: 'string', isOptional: true },
        { name: 'visit_duration', type: 'number', isOptional: true },
        { name: 'is_visit', type: 'boolean', isOptional: true },
        { name: 'recorded_at', type: 'number', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'embedding_id', type: 'string', isOptional: true },
      ],
    }),

    // Voice notes
    tableSchema({
      name: 'voice_notes',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'audio_uri', type: 'string' },
        { name: 'audio_url', type: 'string', isOptional: true },
        { name: 'duration', type: 'number' },
        { name: 'mime_type', type: 'string' },
        { name: 'transcription', type: 'string', isOptional: true },
        { name: 'transcription_status', type: 'string' },
        { name: 'title', type: 'string', isOptional: true },
        { name: 'tags', type: 'string', isOptional: true }, // JSON array
        { name: 'recorded_at', type: 'number', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'embedding_id', type: 'string', isOptional: true },
      ],
    }),

    // Text notes
    tableSchema({
      name: 'text_notes',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string' }, // 'diary' | 'thought'
        { name: 'title', type: 'string', isOptional: true },
        { name: 'content', type: 'string' },
        { name: 'tags', type: 'string', isOptional: true },
        { name: 'mood', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'embedding_id', type: 'string', isOptional: true },
      ],
    }),

    // Photos
    tableSchema({
      name: 'photo_memories',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'local_uri', type: 'string' },
        { name: 'storage_url', type: 'string', isOptional: true },
        { name: 'thumbnail_url', type: 'string', isOptional: true },
        { name: 'caption', type: 'string', isOptional: true },
        { name: 'ai_description', type: 'string', isOptional: true },
        { name: 'tags', type: 'string', isOptional: true },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'taken_at', type: 'number', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'embedding_id', type: 'string', isOptional: true },
      ],
    }),

    // Sync queue
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'collection', type: 'string', isIndexed: true },
        { name: 'document_id', type: 'string' },
        { name: 'operation', type: 'string' }, // 'create' | 'update' | 'delete'
        { name: 'data', type: 'string' }, // JSON
        { name: 'attempts', type: 'number' },
        { name: 'last_error', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'scheduled_at', type: 'number', isIndexed: true },
      ],
    }),
  ],
});
```

### Model Classes

```typescript
// database/models/HealthData.ts
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class HealthDataModel extends Model {
  static table = 'health_data';

  @field('user_id') userId!: string;
  @field('data_type') dataType!: string;
  @field('value') value!: number;
  @field('unit') unit!: string;
  @field('source') source!: string;
  @field('metadata') metadata?: string;
  @date('recorded_at') recordedAt!: Date;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('sync_status') syncStatus!: string;
  @date('synced_at') syncedAt?: Date;
  @field('embedding_id') embeddingId?: string;

  // Helper methods
  getMetadata(): Record<string, any> {
    return this.metadata ? JSON.parse(this.metadata) : {};
  }

  async markSynced(): Promise<void> {
    await this.update((record) => {
      record.syncStatus = 'synced';
      record.syncedAt = new Date();
    });
  }
}
```

### Database Initialization

```typescript
// database/index.ts
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { migrations } from './migrations';
import * as models from './models';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true, // Use JSI for better performance
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: Object.values(models),
});
```

---

## Sync Manager

### Overview

The SyncManager handles bidirectional synchronization between WatermelonDB and Firebase Firestore.

```typescript
class SyncManager {
  private static instance: SyncManager;
  private userId: string | null = null;
  private isInitialized: boolean = false;
  private isSyncing: boolean = false;
  private syncQueue: SyncQueueItem[] = [];

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    this.isInitialized = true;

    // Load pending items from queue table
    await this.loadPendingQueue();

    // Set up network listener
    this.setupNetworkListener();

    // Initial sync
    await this.syncAll();
  }

  async addToQueue(item: SyncQueueItem): Promise<void> {
    // Add to in-memory queue
    this.syncQueue.push(item);

    // Persist to database
    await database.write(async () => {
      await database.get('sync_queue').create((record: any) => {
        record.collection = item.collection;
        record.documentId = item.documentId;
        record.operation = item.operation;
        record.data = JSON.stringify(item.data);
        record.attempts = 0;
        record.createdAt = new Date();
        record.scheduledAt = new Date();
      });
    });

    // Try to sync immediately if online
    if (NetworkMonitor.getInstance().isOnline()) {
      this.processQueue();
    }
  }

  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    this.isSyncing = true;

    try {
      const results: SyncResult = {
        success: true,
        synced: 0,
        failed: 0,
        errors: [],
      };

      // Sync each collection
      const collections = ['health_data', 'location_data', 'voice_notes', 'text_notes', 'photo_memories'];

      for (const collection of collections) {
        const collectionResult = await this.syncCollection(collection);
        results.synced += collectionResult.synced;
        results.failed += collectionResult.failed;
        results.errors.push(...collectionResult.errors);
      }

      results.success = results.failed === 0;
      return results;
    } finally {
      this.isSyncing = false;
    }
  }

  async syncCollection(collection: string): Promise<SyncResult> {
    const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };

    // Get pending items
    const pendingItems = await database
      .get(collection)
      .query(Q.where('sync_status', 'pending'))
      .fetch();

    for (const item of pendingItems) {
      try {
        await this.syncItem(collection, item);
        result.synced++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          collection,
          documentId: item.id,
          error: error.message,
        });
      }
    }

    return result;
  }

  private async syncItem(collection: string, item: Model): Promise<void> {
    const data = this.modelToFirestore(item);

    // Upload to Firestore
    await firestore.collection(collection).doc(item.id).set(data, { merge: true });

    // Update local sync status
    await database.write(async () => {
      await item.update((record: any) => {
        record.syncStatus = 'synced';
        record.syncedAt = new Date();
      });
    });
  }
}
```

### Sync Status Flow

```
┌─────────────┐
│   pending   │ ← New data created locally
└──────┬──────┘
       │
       ▼ (sync attempt)
┌─────────────┐
│   syncing   │ ← Upload in progress
└──────┬──────┘
       │
       ├───────────────┐
       ▼ (success)     ▼ (failure)
┌─────────────┐  ┌─────────────┐
│   synced    │  │    error    │
└─────────────┘  └──────┬──────┘
                       │
                       ▼ (retry)
                ┌─────────────┐
                │   pending   │
                └─────────────┘
```

---

## File Sync

### Audio File Upload

```typescript
class AudioSyncService {
  async uploadVoiceNote(voiceNote: VoiceNoteModel): Promise<string> {
    const localUri = voiceNote.audioUri;

    // Generate storage path
    const storagePath = `users/${voiceNote.userId}/voice/${voiceNote.id}.m4a`;

    // Upload to Firebase Storage
    const reference = storage().ref(storagePath);
    await reference.putFile(localUri);

    // Get download URL
    const downloadUrl = await reference.getDownloadURL();

    // Update local record
    await database.write(async () => {
      await voiceNote.update((record) => {
        record.audioUrl = downloadUrl;
      });
    });

    return downloadUrl;
  }
}
```

### Photo Upload

```typescript
class PhotoSyncService {
  async uploadPhoto(photo: PhotoMemoryModel): Promise<PhotoUrls> {
    // Generate thumbnail
    const thumbnailUri = await this.generateThumbnail(photo.localUri);

    // Upload original
    const originalPath = `users/${photo.userId}/photos/${photo.id}.jpg`;
    const originalRef = storage().ref(originalPath);
    await originalRef.putFile(photo.localUri);
    const storageUrl = await originalRef.getDownloadURL();

    // Upload thumbnail
    const thumbPath = `users/${photo.userId}/photos/thumbnails/${photo.id}.jpg`;
    const thumbRef = storage().ref(thumbPath);
    await thumbRef.putFile(thumbnailUri);
    const thumbnailUrl = await thumbRef.getDownloadURL();

    // Update local record
    await database.write(async () => {
      await photo.update((record) => {
        record.storageUrl = storageUrl;
        record.thumbnailUrl = thumbnailUrl;
      });
    });

    return { storageUrl, thumbnailUrl };
  }

  private async generateThumbnail(uri: string): Promise<string> {
    // Resize to 200x200
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 200, height: 200 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  }
}
```

---

## Conflict Resolution

### Strategy Types

```typescript
type ConflictStrategy =
  | 'local-wins'   // Keep local changes
  | 'remote-wins'  // Use server data
  | 'merge'        // Attempt to merge
  | 'ask-user';    // Prompt user to choose

interface ConflictResolution {
  strategy: ConflictStrategy;
  resolved: Document;
  details: string;
}
```

### Conflict Resolver

```typescript
class ConflictResolver {
  static getInstance(): ConflictResolver {
    return new ConflictResolver();
  }

  async resolve(
    local: Document,
    remote: Document,
    strategy: ConflictStrategy = 'remote-wins'
  ): Promise<Document> {
    switch (strategy) {
      case 'local-wins':
        return local;

      case 'remote-wins':
        return remote;

      case 'merge':
        return this.mergeDocuments(local, remote);

      case 'ask-user':
        return this.promptUser(local, remote);

      default:
        return remote;
    }
  }

  private mergeDocuments(local: Document, remote: Document): Document {
    // Compare timestamps
    const localTime = new Date(local.updatedAt).getTime();
    const remoteTime = new Date(remote.updatedAt).getTime();

    // Keep the more recent version
    if (localTime > remoteTime) {
      return local;
    } else {
      return remote;
    }
  }

  private async promptUser(local: Document, remote: Document): Promise<Document> {
    // Show UI to let user choose
    // This would be implemented in the UI layer
    throw new Error('User prompt not implemented');
  }
}
```

---

## Background Sync

### iOS Background Fetch

```typescript
// Register background fetch
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const BACKGROUND_SYNC_TASK = 'background-sync-task';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const syncManager = SyncManager.getInstance();

    // Only sync if initialized
    if (!syncManager.isInitialized()) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const result = await syncManager.syncAll();

    if (result.synced > 0) {
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
  } catch (error) {
    console.error('Background sync error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register the task
async function registerBackgroundSync(): Promise<void> {
  await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
    minimumInterval: 15 * 60, // 15 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
```

### Android WorkManager

```typescript
// Android uses WorkManager for background work
// This is handled by expo-background-fetch internally

// Configure constraints
const syncConstraints = {
  requiresNetwork: true,
  requiresCharging: false,
  requiresBatteryNotLow: true,
};
```

---

## Retry Logic

### Exponential Backoff

```typescript
class RetryHandler {
  private maxAttempts = 5;
  private baseDelay = 1000; // 1 second

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        if (attempt < this.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          console.log(`${context}: Attempt ${attempt} failed, retrying in ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private calculateDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

---

## Data Cleanup

### Storage Management

```typescript
class StorageManager {
  static getInstance(): StorageManager {
    return new StorageManager();
  }

  async getStorageUsage(): Promise<StorageUsage> {
    const dbSize = await this.getDatabaseSize();
    const cacheSize = await this.getCacheSize();
    const mediaSize = await this.getMediaSize();

    return {
      database: dbSize,
      cache: cacheSize,
      media: mediaSize,
      total: dbSize + cacheSize + mediaSize,
    };
  }

  async clearOldData(retentionDays: number): Promise<CleanupResult> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    let deletedCount = 0;

    // Delete old synced data from each collection
    const collections = ['health_data', 'location_data'];

    for (const collection of collections) {
      const oldRecords = await database
        .get(collection)
        .query(
          Q.where('sync_status', 'synced'),
          Q.where('created_at', Q.lt(cutoff.getTime()))
        )
        .fetch();

      await database.write(async () => {
        for (const record of oldRecords) {
          await record.destroyPermanently();
          deletedCount++;
        }
      });
    }

    return { deletedCount };
  }

  async clearCache(): Promise<void> {
    // Clear image cache
    await FileSystem.deleteAsync(
      FileSystem.cacheDirectory + 'images/',
      { idempotent: true }
    );

    // Clear temp files
    await FileSystem.deleteAsync(
      FileSystem.documentDirectory + 'temp/',
      { idempotent: true }
    );
  }
}
```

---

## Sync Status UI

### React Hook

```typescript
// hooks/useSyncStatus.ts
import { useEffect, useState } from 'react';

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    lastSyncTime: null,
    pendingCount: 0,
  });

  useEffect(() => {
    const syncManager = SyncManager.getInstance();
    const networkMonitor = NetworkMonitor.getInstance();

    // Update on network changes
    const unsubscribeNetwork = networkMonitor.onStatusChange((isOnline) => {
      setStatus((prev) => ({ ...prev, isOnline }));
    });

    // Update on sync events
    const unsubscribeSync = syncManager.onSyncStatusChange((syncStatus) => {
      setStatus((prev) => ({
        ...prev,
        isSyncing: syncStatus.isSyncing,
        lastSyncTime: syncStatus.lastSyncTime,
        pendingCount: syncStatus.pendingCount,
      }));
    });

    return () => {
      unsubscribeNetwork();
      unsubscribeSync();
    };
  }, []);

  return status;
}
```

### Status Component

```typescript
function SyncStatusIndicator() {
  const { isOnline, isSyncing, pendingCount } = useSyncStatus();

  if (!isOnline) {
    return (
      <View style={styles.offline}>
        <Icon name="cloud-off" />
        <Text>Offline</Text>
      </View>
    );
  }

  if (isSyncing) {
    return (
      <View style={styles.syncing}>
        <ActivityIndicator />
        <Text>Syncing...</Text>
      </View>
    );
  }

  if (pendingCount > 0) {
    return (
      <View style={styles.pending}>
        <Icon name="cloud-upload" />
        <Text>{pendingCount} pending</Text>
      </View>
    );
  }

  return (
    <View style={styles.synced}>
      <Icon name="cloud-done" />
      <Text>Synced</Text>
    </View>
  );
}
```

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System design
- [Services](./SERVICES.md) - Service reference
- [Firebase Functions](./FIREBASE_FUNCTIONS.md) - Cloud processing
