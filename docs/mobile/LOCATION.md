# Background Location Tracking

Documentation for GPS tracking and location services in the PersonalAI mobile app.

## Overview

PersonalAI tracks user locations to provide context for AI queries like "Where did I go yesterday?" or "How many times did I visit the gym this month?"

**Features:**
- Background location tracking with battery optimization
- Visit detection (significant location changes)
- Activity recognition (walking, driving, etc.)
- Reverse geocoding for place names
- Geofencing for important locations

---

## Platform Support

| Feature | iOS | Android |
|---------|-----|---------|
| Background Location | Core Location | Fused Location Provider |
| Visit Detection | CLVisit | Activity Transitions |
| Activity Recognition | CMMotionActivityManager | Activity Recognition API |
| Geofencing | CLRegion | GeofencingClient |
| Battery Optimization | Significant Location Changes | Doze Mode aware |

---

## iOS Implementation

### Required Permissions

**Info.plist:**
```xml
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>PersonalAI tracks your location in the background to remember the places you visit and provide personalized insights about your daily patterns.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>PersonalAI needs your location to remember the places you visit.</string>

<key>NSMotionUsageDescription</key>
<string>PersonalAI uses motion data to detect your activity type (walking, driving, etc.).</string>

<key>UIBackgroundModes</key>
<array>
  <string>location</string>
</array>
```

### LocationTracker Service

**Location:** `src/services/dataCollection/LocationTracker.ts`

```typescript
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

class LocationTracker {
  private static instance: LocationTracker;
  private isTracking: boolean = false;
  private userId: string | null = null;

  static getInstance(): LocationTracker {
    if (!LocationTracker.instance) {
      LocationTracker.instance = new LocationTracker();
    }
    return LocationTracker.instance;
  }

  async requestPermissions(): Promise<boolean> {
    // Request foreground permission first
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      return false;
    }

    // Then request background permission
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    return backgroundStatus === 'granted';
  }

  async startTracking(userId: string): Promise<void> {
    if (this.isTracking) return;

    this.userId = userId;

    // Start background location updates
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 50, // meters
      timeInterval: 60000,  // 1 minute
      deferredUpdatesInterval: 300000, // 5 minutes
      pausesUpdatesAutomatically: true,
      activityType: Location.ActivityType.Other,
      showsBackgroundLocationIndicator: false,
      foregroundService: Platform.OS === 'android' ? {
        notificationTitle: 'PersonalAI',
        notificationBody: 'Tracking your location in background',
        notificationColor: '#FF6B6B',
      } : undefined,
    });

    this.isTracking = true;
  }

  async stopTracking(): Promise<void> {
    if (!this.isTracking) return;

    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    this.isTracking = false;
  }

  async getCurrentLocation(): Promise<LocationData> {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return this.transformLocation(location);
  }

  private transformLocation(location: Location.LocationObject): LocationData {
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      speed: location.coords.speed,
      heading: location.coords.heading,
      recordedAt: new Date(location.timestamp).toISOString(),
    };
  }
}

// Background task handler
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const tracker = LocationTracker.getInstance();

    for (const location of locations) {
      await tracker.processLocation(location);
    }
  }
});
```

---

## Visit Detection

### Significant Location Changes (iOS)

```typescript
class VisitDetector {
  private static instance: VisitDetector;

  async startMonitoring(): Promise<void> {
    // Use significant location changes for better battery life
    await Location.startMonitoringSignificantLocationChangesAsync({
      notifyOnEntry: true,
      notifyOnExit: true,
    });
  }

  async processVisit(visit: CLVisit): Promise<void> {
    // Determine if this is an arrival or departure
    const isArrival = visit.departureDate === null;

    const visitData: LocationVisit = {
      latitude: visit.coordinate.latitude,
      longitude: visit.coordinate.longitude,
      horizontalAccuracy: visit.horizontalAccuracy,
      arrivalDate: visit.arrivalDate.toISOString(),
      departureDate: visit.departureDate?.toISOString(),
      duration: this.calculateDuration(visit),
      type: isArrival ? 'arrival' : 'departure',
    };

    // Get place name via reverse geocoding
    const placeName = await this.reverseGeocode(
      visit.coordinate.latitude,
      visit.coordinate.longitude
    );
    visitData.placeName = placeName;

    // Save to database
    await this.saveVisit(visitData);
  }

  private async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });

      if (results.length > 0) {
        const place = results[0];
        return [place.name, place.street, place.city]
          .filter(Boolean)
          .join(', ');
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }
    return 'Unknown location';
  }
}
```

---

## Activity Recognition

### Motion Activity Detection

```typescript
import { Pedometer } from 'expo-sensors';
import * as ActivityRecognition from 'expo-activity-recognition';

class ActivityDetector {
  private subscription: any;

  async startDetection(): Promise<void> {
    // Check availability
    const isAvailable = await Pedometer.isAvailableAsync();
    if (!isAvailable) return;

    // Subscribe to activity updates
    this.subscription = ActivityRecognition.subscribe(
      this.handleActivityChange.bind(this)
    );
  }

  private handleActivityChange(activity: ActivityType): void {
    // Map activity to our types
    const activityMap: Record<string, string> = {
      'walking': 'walking',
      'running': 'running',
      'cycling': 'cycling',
      'automotive': 'driving',
      'stationary': 'stationary',
      'unknown': 'unknown',
    };

    const activityType = activityMap[activity.type] || 'unknown';

    // Update current location with activity type
    this.updateLocationActivity(activityType, activity.confidence);
  }

  stopDetection(): void {
    this.subscription?.remove();
  }
}
```

---

## Data Model

### LocationData Interface

```typescript
interface LocationData {
  id: string;
  userId: string;

  // Core location
  latitude: number;
  longitude: number;
  accuracy: number;

  // Optional fields
  altitude?: number;
  speed?: number;
  heading?: number;

  // Derived fields
  address?: string;
  placeName?: string;
  placeType?: PlaceType;
  activityType?: ActivityType;

  // Visit data (if detected)
  visitDuration?: number;  // minutes
  isVisit?: boolean;

  // Timestamps
  recordedAt: string;
  createdAt: string;
  updatedAt: string;

  // Sync status
  syncStatus: 'pending' | 'synced' | 'error';
  syncedAt?: string;

  // Embedding status
  embeddingId?: string;
  embeddingCreatedAt?: string;
}

type PlaceType =
  | 'home'
  | 'work'
  | 'gym'
  | 'restaurant'
  | 'store'
  | 'park'
  | 'other';

type ActivityType =
  | 'walking'
  | 'running'
  | 'cycling'
  | 'driving'
  | 'stationary'
  | 'unknown';
```

### WatermelonDB Schema

```typescript
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
    { name: 'sync_status', type: 'string' },
    { name: 'synced_at', type: 'number', isOptional: true },
    { name: 'embedding_id', type: 'string', isOptional: true },
  ],
}),
```

---

## Embedding Pipeline

### Location to Natural Language

```typescript
class LocationTextGenerator {
  static generateText(data: LocationData): string {
    const date = new Date(data.recordedAt);
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    const parts: string[] = [];

    // Date and time
    parts.push(`On ${dateStr} at ${timeStr}`);

    // Location
    if (data.placeName) {
      parts.push(`I was at ${data.placeName}`);
    } else if (data.address) {
      parts.push(`I was at ${data.address}`);
    } else {
      parts.push(`I was at coordinates ${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`);
    }

    // Activity
    if (data.activityType && data.activityType !== 'unknown') {
      parts.push(`doing ${data.activityType}`);
    }

    // Visit duration
    if (data.isVisit && data.visitDuration) {
      const hours = Math.floor(data.visitDuration / 60);
      const mins = data.visitDuration % 60;
      if (hours > 0) {
        parts.push(`for ${hours} hours and ${mins} minutes`);
      } else {
        parts.push(`for ${mins} minutes`);
      }
    }

    return parts.join(', ') + '.';
  }
}

// Example outputs:
// "On Monday, January 15, 2025 at 2:30 PM, I was at SF Badminton Club, doing exercise, for 2 hours and 15 minutes."
// "On Tuesday, January 16, 2025 at 9:00 AM, I was at Starbucks on Market Street, for 45 minutes."
```

### Cloud Function Processing

```typescript
export const onLocationDataCreated = onDocumentCreated(
  'locationData/{docId}',
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    // Generate natural language text
    const text = LocationTextGenerator.generateText(data);

    // Generate embedding
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    // Prepare metadata (filter nulls for Pinecone)
    const metadata: Record<string, any> = {
      userId: data.userId,
      type: 'location',
      text: text,
      latitude: data.latitude,
      longitude: data.longitude,
      recordedAt: data.recordedAt,
    };

    // Add optional fields only if present
    if (data.placeName) metadata.placeName = data.placeName;
    if (data.address) metadata.address = data.address;
    if (data.activityType) metadata.activityType = data.activityType;
    if (data.placeType) metadata.placeType = data.placeType;

    // Store in Pinecone
    await index.upsert([{
      id: `location_${event.params.docId}`,
      values: embedding.data[0].embedding,
      metadata,
    }]);

    // Update Firestore
    await event.data?.ref.update({
      embeddingId: `location_${event.params.docId}`,
      embeddingCreatedAt: new Date().toISOString(),
    });
  }
);
```

---

## Geofencing

### Setting Up Geofences

```typescript
class GeofenceManager {
  private regions: Map<string, GeofenceRegion> = new Map();

  async addGeofence(region: GeofenceRegion): Promise<void> {
    // iOS: Use CLCircularRegion
    // Android: Use GeofencingClient
    await Location.startGeofencingAsync('geofence-task', [
      {
        identifier: region.id,
        latitude: region.latitude,
        longitude: region.longitude,
        radius: region.radius,
        notifyOnEnter: true,
        notifyOnExit: true,
      },
    ]);

    this.regions.set(region.id, region);
  }

  async removeGeofence(regionId: string): Promise<void> {
    const regions = Array.from(this.regions.values())
      .filter(r => r.id !== regionId);

    await Location.startGeofencingAsync('geofence-task', regions);
    this.regions.delete(regionId);
  }
}

// Define geofence task
TaskManager.defineTask('geofence-task', async ({ data, error }) => {
  if (error) return;

  const { eventType, region } = data as {
    eventType: Location.GeofencingEventType;
    region: Location.LocationRegion;
  };

  if (eventType === Location.GeofencingEventType.Enter) {
    // User entered geofence
    await handleGeofenceEntry(region);
  } else if (eventType === Location.GeofencingEventType.Exit) {
    // User exited geofence
    await handleGeofenceExit(region);
  }
});
```

---

## Battery Optimization

### Strategies

```typescript
const LOCATION_CONFIGS = {
  // High accuracy for short periods
  foreground: {
    accuracy: Location.Accuracy.High,
    distanceInterval: 10,
    timeInterval: 5000,
  },

  // Balanced for normal background use
  background: {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 50,
    timeInterval: 60000,
    deferredUpdatesInterval: 300000,
    pausesUpdatesAutomatically: true,
  },

  // Low power for battery saver mode
  lowPower: {
    accuracy: Location.Accuracy.Low,
    distanceInterval: 500,
    timeInterval: 300000,
  },

  // Significant changes only
  significantChanges: {
    // Only reports when user moves ~500m
    useSignificantChanges: true,
  },
};

// Switch based on app state and battery
async function optimizeLocationTracking(appState: AppState): Promise<void> {
  const tracker = LocationTracker.getInstance();

  switch (appState) {
    case 'active':
      await tracker.setConfig(LOCATION_CONFIGS.foreground);
      break;
    case 'background':
      await tracker.setConfig(LOCATION_CONFIGS.background);
      break;
    case 'lowBattery':
      await tracker.setConfig(LOCATION_CONFIGS.lowPower);
      break;
  }
}
```

---

## Privacy & Settings

### User Controls

```typescript
interface LocationSettings {
  trackingEnabled: boolean;        // Master toggle
  backgroundTrackingEnabled: boolean;
  accuracy: 'high' | 'balanced' | 'low';
  storeAddress: boolean;           // Store reverse geocoded addresses
  detectVisits: boolean;           // Detect significant visits
  detectActivity: boolean;         // Detect activity type
  retentionDays: number;           // Auto-delete after N days
  sensitiveLocations: string[];    // Locations to exclude
}
```

### Sensitive Location Handling

```typescript
class PrivacyFilter {
  private sensitiveLocations: SensitiveLocation[] = [];

  async filterLocation(location: LocationData): Promise<LocationData | null> {
    // Check if location is in sensitive area
    for (const sensitive of this.sensitiveLocations) {
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        sensitive.latitude,
        sensitive.longitude
      );

      if (distance < sensitive.radius) {
        // Option 1: Skip entirely
        if (sensitive.action === 'skip') {
          return null;
        }

        // Option 2: Generalize location
        if (sensitive.action === 'generalize') {
          return {
            ...location,
            latitude: sensitive.generalizedLat,
            longitude: sensitive.generalizedLng,
            address: sensitive.generalizedName,
            placeName: sensitive.generalizedName,
          };
        }
      }
    }

    return location;
  }
}
```

---

## Querying Location Data

### Example RAG Queries

```
User: "Where did I go yesterday?"
→ RAG retrieves all location data from yesterday
→ GPT-4 summarizes places visited with timestamps

User: "How many times did I visit the gym this month?"
→ RAG retrieves location data filtered by gym geofence
→ GPT-4 counts visits and provides pattern insights

User: "What's my most visited coffee shop?"
→ RAG retrieves all coffee shop visits
→ GPT-4 analyzes frequency and determines top location
```

---

## Troubleshooting

### iOS Issues

**"Location services disabled"**
- Check Settings → Privacy → Location Services → PersonalAI
- Ensure "Always" is selected for background tracking

**"Background location not updating"**
- Verify `UIBackgroundModes` includes "location" in Info.plist
- Check that significant changes monitoring is enabled
- Battery saver mode may limit updates

**"Visit detection not working"**
- Visits require staying in one place for ~5+ minutes
- Indoor locations may have poor GPS accuracy

### Android Issues

**"Fused location provider not available"**
- Ensure Google Play Services is installed and updated
- Some devices require additional location settings

**"Background location stopped"**
- Android's Doze mode may pause location updates
- Use foreground service for reliable background tracking
- Check battery optimization settings for the app

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - Overall system design
- [Health Data](./HEALTH_DATA.md) - Health data collection
- [Sync & Storage](./SYNC.md) - Data synchronization
