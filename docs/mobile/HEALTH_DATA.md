# Health Data Collection

Documentation for HealthKit (iOS) and Google Fit (Android) integration in the PersonalAI mobile app.

## Overview

PersonalAI collects health and fitness data to provide context for AI queries. The system supports:

- **iOS:** HealthKit integration for steps, heart rate, sleep, workouts
- **Android:** Google Fit integration (partial implementation)
- **Storage:** Local WatermelonDB → Firebase Firestore → Pinecone embeddings

---

## Supported Data Types

| Data Type | iOS (HealthKit) | Android (Google Fit) | Unit |
|-----------|-----------------|---------------------|------|
| Steps | HKQuantityTypeIdentifierStepCount | DataType.TYPE_STEP_COUNT_DELTA | count |
| Distance | HKQuantityTypeIdentifierDistanceWalkingRunning | DataType.TYPE_DISTANCE_DELTA | meters |
| Heart Rate | HKQuantityTypeIdentifierHeartRate | DataType.TYPE_HEART_RATE_BPM | bpm |
| Calories | HKQuantityTypeIdentifierActiveEnergyBurned | DataType.TYPE_CALORIES_EXPENDED | kcal |
| Sleep | HKCategoryTypeIdentifierSleepAnalysis | DataType.TYPE_SLEEP_SEGMENT | minutes |
| Workouts | HKWorkoutType | DataType.TYPE_ACTIVITY_SEGMENT | varies |

---

## iOS Implementation

### HealthKit Setup

**Required Capabilities:**
1. Enable "HealthKit" capability in Xcode
2. Add to `Info.plist`:

```xml
<key>NSHealthShareUsageDescription</key>
<string>PersonalAI needs access to your health data to provide personalized insights about your activity and wellness patterns.</string>

<key>NSHealthUpdateUsageDescription</key>
<string>PersonalAI may write workout data to help track your exercise history.</string>
```

### HealthDataCollector Service

**Location:** `src/services/dataCollection/HealthDataCollector.ts`

```typescript
class HealthDataCollector {
  private static instance: HealthDataCollector;
  private isInitialized: boolean = false;
  private backgroundObservers: Map<string, any> = new Map();

  static getInstance(): HealthDataCollector {
    if (!HealthDataCollector.instance) {
      HealthDataCollector.instance = new HealthDataCollector();
    }
    return HealthDataCollector.instance;
  }

  async initialize(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;

    const isAvailable = await AppleHealthKit.isAvailable();
    if (!isAvailable) return false;

    const permissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.StepCount,
          AppleHealthKit.Constants.Permissions.HeartRate,
          AppleHealthKit.Constants.Permissions.SleepAnalysis,
          AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.Workout,
        ],
        write: [
          AppleHealthKit.Constants.Permissions.Workout,
        ],
      },
    };

    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(permissions, (error) => {
        if (error) {
          console.error('HealthKit init error:', error);
          resolve(false);
        }
        this.isInitialized = true;
        resolve(true);
      });
    });
  }

  async getStepCount(startDate: Date, endDate: Date): Promise<HealthData[]> {
    return new Promise((resolve, reject) => {
      AppleHealthKit.getStepCount({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }, (error, results) => {
        if (error) reject(error);
        resolve(this.transformStepData(results));
      });
    });
  }

  async getHeartRateSamples(startDate: Date, endDate: Date): Promise<HealthData[]> {
    return new Promise((resolve, reject) => {
      AppleHealthKit.getHeartRateSamples({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: false,
        limit: 100,
      }, (error, results) => {
        if (error) reject(error);
        resolve(this.transformHeartRateData(results));
      });
    });
  }

  async getSleepSamples(startDate: Date, endDate: Date): Promise<HealthData[]> {
    return new Promise((resolve, reject) => {
      AppleHealthKit.getSleepSamples({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }, (error, results) => {
        if (error) reject(error);
        resolve(this.transformSleepData(results));
      });
    });
  }

  private transformStepData(raw: any): HealthData[] {
    return [{
      dataType: 'steps',
      value: raw.value,
      unit: 'count',
      source: 'healthkit',
      recordedAt: new Date(raw.endDate).toISOString(),
    }];
  }
}
```

### Background Health Updates

HealthKit supports background delivery for near real-time updates:

```typescript
async enableBackgroundDelivery(): Promise<void> {
  // Enable for step count
  AppleHealthKit.enableBackgroundDelivery(
    AppleHealthKit.Constants.Permissions.StepCount,
    AppleHealthKit.Constants.ObserverFrequencies.Hourly,
    (error) => {
      if (error) console.error('Background delivery error:', error);
    }
  );

  // Set up observer query
  AppleHealthKit.setObserver(
    { type: 'StepCount' },
    async () => {
      // New data available
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const steps = await this.getStepCount(startOfDay, new Date());
      await this.saveToDatabase(steps);
    }
  );
}
```

---

## Android Implementation

### Google Fit Setup

**Required Configuration:**

1. Add to `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION"/>
<uses-permission android:name="android.permission.BODY_SENSORS"/>
```

2. Configure OAuth in Google Cloud Console
3. Add SHA-1 fingerprint to Firebase project

### Google Fit Service

**Location:** `src/services/dataCollection/GoogleFitService.ts`

```typescript
class GoogleFitService {
  private static instance: GoogleFitService;
  private isAuthorized: boolean = false;

  static getInstance(): GoogleFitService {
    if (!GoogleFitService.instance) {
      GoogleFitService.instance = new GoogleFitService();
    }
    return GoogleFitService.instance;
  }

  async authorize(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    try {
      const result = await GoogleFit.authorize({
        scopes: [
          Scopes.FITNESS_ACTIVITY_READ,
          Scopes.FITNESS_BODY_READ,
          Scopes.FITNESS_HEART_RATE_READ,
          Scopes.FITNESS_SLEEP_READ,
        ],
      });

      this.isAuthorized = result.success;
      return result.success;
    } catch (error) {
      console.error('Google Fit auth error:', error);
      return false;
    }
  }

  async getStepCount(startDate: Date, endDate: Date): Promise<HealthData[]> {
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      bucketUnit: 'DAY',
      bucketInterval: 1,
    };

    const results = await GoogleFit.getDailyStepCountSamples(options);
    return this.transformStepData(results);
  }

  async getHeartRateSamples(startDate: Date, endDate: Date): Promise<HealthData[]> {
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    const results = await GoogleFit.getHeartRateSamples(options);
    return this.transformHeartRateData(results);
  }
}
```

---

## Data Model

### HealthData Interface

```typescript
interface HealthData {
  id: string;
  userId: string;

  // Data fields
  dataType: HealthDataType;
  value: number;
  unit: string;
  source: 'healthkit' | 'googlefit' | 'manual';

  // Optional metadata
  metadata?: {
    workoutType?: string;
    device?: string;
    sourceApp?: string;
  };

  // Timestamps
  recordedAt: string;   // When the data was recorded
  createdAt: string;    // When saved to our database
  updatedAt: string;

  // Sync status
  syncStatus: 'pending' | 'synced' | 'error';
  syncedAt?: string;

  // Embedding status
  embeddingId?: string;
  embeddingCreatedAt?: string;
}

type HealthDataType =
  | 'steps'
  | 'distance'
  | 'heartRate'
  | 'calories'
  | 'sleep'
  | 'workout'
  | 'weight'
  | 'bloodPressure';
```

### WatermelonDB Table

```typescript
// database/schema.ts
tableSchema({
  name: 'health_data',
  columns: [
    { name: 'user_id', type: 'string', isIndexed: true },
    { name: 'data_type', type: 'string', isIndexed: true },
    { name: 'value', type: 'number' },
    { name: 'unit', type: 'string' },
    { name: 'source', type: 'string' },
    { name: 'metadata', type: 'string', isOptional: true }, // JSON
    { name: 'recorded_at', type: 'number', isIndexed: true },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
    { name: 'sync_status', type: 'string' },
    { name: 'synced_at', type: 'number', isOptional: true },
    { name: 'embedding_id', type: 'string', isOptional: true },
  ],
}),
```

---

## Embedding Pipeline

### Health Data to Natural Language

```typescript
// services/dataProcessing/HealthTextGenerator.ts
class HealthTextGenerator {
  static generateText(data: HealthData): string {
    const date = new Date(data.recordedAt);
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    switch (data.dataType) {
      case 'steps':
        return `On ${dateStr}, I walked ${data.value.toLocaleString()} steps.`;

      case 'heartRate':
        return `On ${dateStr}, my heart rate was ${data.value} bpm.`;

      case 'sleep':
        const hours = Math.floor(data.value / 60);
        const mins = data.value % 60;
        return `On ${dateStr}, I slept for ${hours} hours and ${mins} minutes.`;

      case 'workout':
        const workoutType = data.metadata?.workoutType || 'exercise';
        const duration = Math.round(data.value);
        return `On ${dateStr}, I did ${workoutType} for ${duration} minutes.`;

      case 'calories':
        return `On ${dateStr}, I burned ${data.value.toLocaleString()} active calories.`;

      default:
        return `On ${dateStr}, health data recorded: ${data.dataType} = ${data.value} ${data.unit}.`;
    }
  }
}
```

### Cloud Function Processing

```typescript
// firebase/functions/src/triggers/onHealthDataCreated.ts
export const onHealthDataCreated = onDocumentCreated(
  'healthData/{docId}',
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    // Generate natural language text
    const text = HealthTextGenerator.generateText(data);

    // Generate embedding
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    // Store in Pinecone
    const pinecone = new Pinecone();
    const index = pinecone.index('personal-ai-data');

    await index.upsert([{
      id: `health_${event.params.docId}`,
      values: embedding.data[0].embedding,
      metadata: {
        userId: data.userId,
        type: 'health',
        dataType: data.dataType,
        value: data.value,
        unit: data.unit,
        text: text,
        recordedAt: data.recordedAt,
      },
    }]);

    // Update Firestore with embedding ID
    await event.data?.ref.update({
      embeddingId: `health_${event.params.docId}`,
      embeddingCreatedAt: new Date().toISOString(),
    });
  }
);
```

---

## Privacy & Permissions

### Permission Request Flow

```typescript
async function requestHealthPermissions(): Promise<PermissionResult> {
  // 1. Show explanation screen first
  const userConsent = await showHealthDataExplanation();
  if (!userConsent) {
    return { granted: false, reason: 'user_declined' };
  }

  // 2. Request system permissions
  if (Platform.OS === 'ios') {
    const result = await HealthDataCollector.getInstance().initialize();
    return { granted: result, reason: result ? 'granted' : 'system_denied' };
  } else {
    const result = await GoogleFitService.getInstance().authorize();
    return { granted: result, reason: result ? 'granted' : 'system_denied' };
  }
}
```

### Data Retention

```typescript
// Settings for user control
interface HealthDataSettings {
  collectHealthData: boolean;      // Master toggle
  dataTypes: {
    steps: boolean;
    heartRate: boolean;
    sleep: boolean;
    workouts: boolean;
    calories: boolean;
  };
  retentionDays: number;           // Auto-delete after N days (default: 365)
  syncToCloud: boolean;            // Allow cloud sync
}
```

---

## Querying Health Data

### Example RAG Queries

```
User: "How many steps did I walk last week?"
→ RAG retrieves step data for last 7 days
→ GPT-4 calculates total and provides insights

User: "What was my average heart rate during workouts this month?"
→ RAG retrieves heart rate data filtered by workout context
→ GPT-4 computes average and trends

User: "Am I sleeping better this week compared to last week?"
→ RAG retrieves sleep data for 2 weeks
→ GPT-4 compares and analyzes patterns
```

### RAG Context Building

```typescript
// RAGEngine.ts - building health context
function buildHealthContext(vectors: PineconeVector[]): string {
  const healthVectors = vectors.filter(v => v.metadata.type === 'health');

  if (healthVectors.length === 0) return '';

  const context = healthVectors.map((v, i) => {
    const m = v.metadata;
    const relevance = (v.score * 100).toFixed(1);
    return `[${i + 1}] (${relevance}% relevant) ${m.text}`;
  }).join('\n');

  return `Health Data:\n${context}`;
}
```

---

## Troubleshooting

### iOS Issues

**"HealthKit not available"**
- Ensure device is not iPad (HealthKit not supported)
- Check "HealthKit" capability is enabled in Xcode

**"Permission denied"**
- User may have denied in Settings → Privacy → Health
- Show instructions to enable manually

**"No data returned"**
- Check date range is valid
- Verify permission was granted for specific data type
- Some data types require Apple Watch

### Android Issues

**"Google Fit authorization failed"**
- Verify OAuth client ID configuration
- Check SHA-1 fingerprint matches Firebase
- Ensure Google Play Services is up to date

**"No data in Google Fit"**
- Google Fit may need other apps to provide data
- Some features require Google Fit app installed

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - Overall system design
- [Sync & Storage](./SYNC.md) - How data syncs to cloud
- [Firebase Functions](./FIREBASE_FUNCTIONS.md) - Embedding generation
