# Dashboard

This document describes the Dashboard feature in Personal AI Web.

## Overview

The Dashboard is the main landing page after authentication, providing:

- Data collection statistics
- Quick data input methods
- Recent activity feed
- Navigation to other features

## Page Location

**File**: `app/(dashboard)/dashboard/page.tsx`

**Route**: `/dashboard`

**Guard**: `AuthGuard` (requires authentication)

---

## Dashboard Sections

### Stats Overview

Displays counts of collected data across all types.

**Component**: `components/dashboard/ClickableStatCard.tsx`

| Stat | Description | Click Action |
|------|-------------|--------------|
| Health | Total health data points | Shows info modal |
| Locations | Total location records | Shows info modal |
| Voice Notes | Total voice notes | Opens voice recorder |
| Photos | Total photos | Opens photo uploader |
| Text Notes | Total diary entries | Opens diary editor |

**Data Source**: `fetchDashboardStats` thunk from dashboardSlice

```typescript
stats: {
  healthCount: number;
  locationCount: number;
  voiceCount: number;
  photoCount: number;
  textNoteCount: number;
}
```

### Quick Thought Input

Twitter-style quick thought composer integrated directly into the dashboard.

**Component**: `components/dashboard/QuickThoughtInput.tsx`

**Features**:
- 280 character maximum
- No minimum length (unlike diary entries)
- Character counter
- Immediate post to Firestore
- "Processing" badge shows embedding status
- Auto-refresh after 3 seconds to show embedding completion

**Usage**:
```typescript
// Posts are saved with type: 'thought'
{
  userId: string;
  title: '';  // Empty for thoughts
  content: string;  // Max 280 chars
  type: 'thought';
  tags: [];
  createdAt: string;
}
```

### Quick Voice Recorder

Voice recording button for quick voice notes.

**Component**: `components/dashboard/QuickVoiceRecorder.tsx`

**Flow**:
1. Click microphone button
2. Grant microphone permission (first time)
3. Recording starts
4. Click stop when done
5. Audio uploaded to Firebase Storage
6. Whisper transcription runs
7. Voice note saved to Firestore
8. Cloud Function generates embedding

### Recent Activity Cards

Shows the most recent data for each type.

#### Health Data Card

**Component**: `components/dashboard/HealthDataCard.tsx`

Displays:
- Recent health metrics (up to 5)
- Type icon (steps, workout, sleep, heart rate)
- Value with unit
- Date
- Metadata (workout type, sleep quality, etc.)

**Note**: Health data is collected from mobile app via HealthKit/Google Fit. Info modal explains this.

#### Location Data Card

**Component**: `components/dashboard/LocationDataCard.tsx`

Displays:
- Recent locations (up to 5)
- Address or coordinates
- Activity tag (if set)
- Visit count
- Total duration

**Note**: Location data is collected from mobile app via background location tracking. Info modal explains this.

#### Voice Note Card

**Component**: `components/dashboard/VoiceNoteCard.tsx`

Displays:
- Recent voice notes (up to 5)
- Duration
- Transcription excerpt (clipped)
- Tags
- Embedding status badge:
  - ✓ Indexed (green)
  - ⏳ Processing (yellow)
  - ✗ Failed (red)
- "Convert to Diary" button

**Convert to Diary**:
Opens quick create modal with prefilled content from voice transcription.

#### Photo Card

**Component**: `components/dashboard/PhotoCard.tsx`

Displays:
- Recent photos (grid of up to 6)
- Thumbnail preview
- Hover shows description
- Click to upload new photo

#### Text Note Card

**Component**: `components/dashboard/TextNoteCard.tsx`

Displays:
- Recent diary entries (up to 5)
- Title
- Content excerpt
- Tags
- Embedding status badge
- "+" button to create new entry

---

## Data Flow

### Initial Load

```
Dashboard Mount
      │
      ▼
fetchDashboardData(userId)
      │
      ├──► fetchDashboardStats()
      ├──► fetchRecentHealth()
      ├──► fetchRecentLocations()
      ├──► fetchRecentVoiceNotes()
      ├──► fetchRecentPhotos()
      └──► fetchRecentTextNotes()
      │
      ▼
Redux State Updated
      │
      ▼
Components Re-render
```

### After Data Creation

```
User Creates Data (Quick Thought/Voice/Photo)
      │
      ▼
API Route Creates Firestore Document
      │
      ▼
Success Response
      │
      ├──► Immediate: fetchDashboardData() (refresh stats)
      └──► After 3s: fetchDashboardData() (catch embedding completion)
```

The 3-second delayed refresh catches the Cloud Function embedding generation, updating the status badge from "Processing" to "Indexed".

---

## Components

### PanelHeader

**File**: `components/dashboard/PanelHeader.tsx`

Reusable header for dashboard panels.

```typescript
interface PanelHeaderProps {
  emoji: string;      // Panel emoji icon
  title: string;      // Panel title
  onAction?: () => void;  // Create button handler
  onInfo?: () => void;    // Info button handler
}
```

### InfoModal

**File**: `components/dashboard/InfoModal.tsx`

Modal for explaining features that require mobile app.

```typescript
interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
}
```

**Used for**:
- Health data collection explanation
- Location tracking explanation

---

## State Management

### dashboardSlice State

```typescript
interface DashboardState {
  stats: {
    healthCount: number;
    locationCount: number;
    voiceCount: number;
    photoCount: number;
    textNoteCount: number;
  };
  recentHealth: HealthData[];
  recentLocations: LocationData[];
  recentVoiceNotes: VoiceNote[];
  recentPhotos: PhotoMemory[];
  recentTextNotes: TextNote[];
  isLoading: boolean;
  error: string | null;
}
```

### Key Actions

```typescript
// Fetch all dashboard data in parallel
dispatch(fetchDashboardData(userId));

// Clear dashboard (on logout)
dispatch(clearDashboard());
```

---

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /api/text-notes?limit=10` | Recent text notes |
| `POST /api/text-notes` | Create quick thought |
| `GET /api/voice-notes?limit=10` | Recent voice notes |
| `POST /api/voice-notes` | Create voice note |
| `GET /api/photos?limit=10` | Recent photos |
| `POST /api/photos` | Create photo |

**Note**: Health and location data are read from Firestore directly via the dashboard's server component.

---

## Embedding Status

All data types show embedding status to indicate RAG availability:

| Status | Badge | Meaning |
|--------|-------|---------|
| Indexed | ✓ Green | Searchable via chat |
| Processing | ⏳ Yellow | Cloud Function running |
| Failed | ✗ Red | Embedding generation failed |

**Implementation**:

```typescript
function getEmbeddingStatus(item: TextNote | VoiceNote | PhotoMemory) {
  if (item.embeddingId) {
    return { status: 'indexed', label: 'Indexed', color: 'green' };
  }
  if (item.embeddingError) {
    return { status: 'failed', label: 'Failed', color: 'red' };
  }
  return { status: 'processing', label: 'Processing', color: 'yellow' };
}
```

---

## Related Documentation

- [Chat & RAG](./CHAT_RAG.md) - How embedded data is searched
- [Components](../COMPONENTS.md) - Component reference
- [API Reference](../API_REFERENCE.md) - Endpoint details
