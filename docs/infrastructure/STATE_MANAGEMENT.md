# State Management

This document describes the Redux architecture in Personal AI Web.

## Overview

Personal AI Web uses Redux Toolkit with 8 slices and minimal persistence.

```
┌─────────────────────────────────────────────────────────────────┐
│                        REDUX STORE                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   auth   │  │   chat   │  │dashboard │  │  events  │        │
│  │ (persist)│  │          │  │          │  │          │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ circles  │  │  input   │  │quickCreate│ │  toast   │        │
│  │          │  │          │  │          │  │          │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Store Configuration

**File**: `lib/store/index.ts`

```typescript
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Import slices
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import dashboardReducer from './slices/dashboardSlice';
import eventsReducer from './slices/eventsSlice';
import circleReducer from './slices/circleSlice';
import inputReducer from './slices/inputSlice';
import quickCreateReducer from './slices/quickCreateSlice';
import toastReducer from './slices/toastSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  chat: chatReducer,
  dashboard: dashboardReducer,
  events: eventsReducer,
  circles: circleReducer,
  input: inputReducer,
  quickCreate: quickCreateReducer,
  toast: toastReducer,
});

// Only persist auth state
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

## Typed Hooks

**File**: `lib/store/hooks.ts`

```typescript
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

**Usage**:

```typescript
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';

function MyComponent() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);

  const handleClick = () => {
    dispatch(someAction());
  };
}
```

---

## Slice Documentation

### 1. authSlice - Authentication

**File**: `lib/store/slices/authSlice.ts`

**State**:

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
```

**Actions**:

| Action | Type | Description |
|--------|------|-------------|
| `setUser` | sync | Set user object |
| `clearError` | sync | Clear error message |
| `signInWithGoogleThunk` | async | Google OAuth login |
| `signInWithEmailThunk` | async | Email/password login |
| `signUpWithEmailThunk` | async | Email/password registration |
| `signOutThunk` | async | Sign out |
| `updateUserPreferencesThunk` | async | Update preferences |

**Persistence**: This slice IS persisted to localStorage.

### 2. chatSlice - Chat Messages

**File**: `lib/store/slices/chatSlice.ts`

**State**:

```typescript
interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}
```

**Actions**:

| Action | Type | Description |
|--------|------|-------------|
| `clearMessages` | sync | Clear conversation |
| `clearError` | sync | Clear error |
| `addMessage` | sync | Add single message |
| `sendMessage` | async | Send with history (RAG) |
| `sendFreshMessage` | async | Send without history |

**Typing Indicator**:

```typescript
const TYPING_INDICATOR_ID = '__typing__';

// Shows while waiting for AI response
dispatch(addMessage({
  id: TYPING_INDICATOR_ID,
  role: 'system',
  content: 'Thinking...',
  timestamp: new Date().toISOString(),
}));
```

### 3. dashboardSlice - Dashboard Data

**File**: `lib/store/slices/dashboardSlice.ts`

**State**:

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

**Actions**:

| Action | Type | Description |
|--------|------|-------------|
| `clearDashboard` | sync | Reset all data |
| `clearError` | sync | Clear error |
| `fetchDashboardStats` | async | Get counts |
| `fetchRecentHealth` | async | Get last 10 health |
| `fetchRecentLocations` | async | Get last 10 locations |
| `fetchRecentVoiceNotes` | async | Get last 10 voice |
| `fetchRecentPhotos` | async | Get last 10 photos |
| `fetchRecentTextNotes` | async | Get last 10 notes |
| `fetchDashboardData` | async | Fetch all in parallel |

### 4. eventsSlice - Events & Calendar

**File**: `lib/store/slices/eventsSlice.ts`

**State**:

```typescript
interface EventsState {
  events: Event[];
  isLoading: boolean;
  error: string | null;
  selectedEvent: Event | null;
  filters: {
    type: 'all' | EventType;
    status: 'all' | EventStatus;
    startDate?: Date;
    endDate?: Date;
  };
}
```

**Actions**:

| Action | Type | Description |
|--------|------|-------------|
| `setSelectedEvent` | sync | Select event |
| `setTypeFilter` | sync | Filter by type |
| `setStatusFilter` | sync | Filter by status |
| `setDateRangeFilter` | sync | Filter by date range |
| `clearFilters` | sync | Reset filters |
| `clearError` | sync | Clear error |
| `fetchEvents` | async | Get events |
| `createEvent` | async | Create event |
| `updateEvent` | async | Update event |
| `deleteEvent` | async | Delete event |
| `confirmEvent` | async | Mark confirmed |
| `completeEvent` | async | Mark completed |
| `cancelEvent` | async | Cancel event |

### 5. circleSlice - Social Circles

**File**: `lib/store/slices/circleSlice.ts`

**State**:

```typescript
interface CircleState {
  circles: Circle[];
  circleMembers: { [circleId: string]: CircleMember[] };
  circleInvites: CircleInvite[];
  circleMessages: { [circleId: string]: CircleMessage[] };
  circleAnalytics: { [circleId: string]: CircleAnalytics };
  selectedCircleId: string | null;
  isLoading: boolean;
  error: string | null;
  loadingStatus: {
    circles: 'idle' | 'loading' | 'success' | 'error';
    messages: { [circleId: string]: 'idle' | 'loading' | 'success' | 'error' };
    invites: 'idle' | 'loading' | 'success' | 'error';
    analytics: { [circleId: string]: 'idle' | 'loading' | 'success' | 'error' };
  };
}
```

**Actions** (16 total):

| Category | Actions |
|----------|---------|
| Circle CRUD | `fetchCircles`, `createCircle`, `updateCircle`, `deleteCircle`, `leaveCircle` |
| Invitations | `inviteToCircle`, `fetchCircleInvites`, `acceptCircleInvite`, `rejectCircleInvite` |
| Members | `fetchCircleMembers`, `updateMemberRole`, `removeMember` |
| Messages | `sendCircleMessage`, `fetchCircleMessages`, `deleteMessage`, `addReaction` |
| Analytics | `fetchCircleAnalytics` |

### 6. inputSlice - Data Input Forms

**File**: `lib/store/slices/inputSlice.ts`

**State** (complex multi-part):

```typescript
interface InputState {
  voice: {
    isRecording: boolean;
    recordingDuration: number;
    isUploading: boolean;
    uploadProgress: number;
    isTranscribing: boolean;
    audioBlob: Blob | null;
    currentNoteId: string | null;
    error: string | null;
  };
  photo: {
    isProcessing: boolean;
    isUploading: boolean;
    uploadProgress: number;
    isDescribing: boolean;
    selectedFile: File | null;
    previewUrl: string | null;
    currentPhotoId: string | null;
    error: string | null;
  };
  textNote: {
    isSaving: boolean;
    currentDraft: Partial<TextNote> | null;
    lastSaved: string | null;
    error: string | null;
  };
  geolocation: {
    isFetching: boolean;
    currentLocation: {
      latitude: number;
      longitude: number;
      address: string | null;
    } | null;
    error: string | null;
  };
  isOnline: boolean;
}
```

**Actions** (~20 synchronous + 4 async):

| Category | Sync Actions |
|----------|--------------|
| Voice | `setVoiceRecording`, `setVoiceRecordingDuration`, `setVoiceAudioBlob`, `setVoiceUploadProgress`, `setVoiceTranscribing`, `clearVoiceError`, `resetVoiceState` |
| Photo | `setPhotoFile`, `setPhotoProcessing`, `setPhotoUploadProgress`, `setPhotoDescribing`, `clearPhotoError`, `resetPhotoState` |
| Text | `setTextNoteDraft`, `updateTextNoteDraft`, `setTextNoteLastSaved`, `clearTextNoteError`, `resetTextNoteState` |
| Location | `clearGeolocationError` |
| General | `setOnlineStatus` |

| Async Thunks | Description |
|--------------|-------------|
| `fetchCurrentLocation` | Get position + address |
| `uploadVoiceNote` | Upload, transcribe, create |
| `uploadPhoto` | Process, upload, describe, create |
| `saveTextNote` | Save text note |

### 7. quickCreateSlice - Quick Create Modal

**File**: `lib/store/slices/quickCreateSlice.ts`

**State**:

```typescript
interface QuickCreateState {
  isOpen: boolean;
  activeType: 'diary' | 'thought' | 'voice' | 'photo' | null;
  isSubmitting: boolean;
  error: string | null;
  prefillData: {
    diary?: { title?: string; content?: string; tags?: string[] };
  } | null;
}
```

**Actions**:

| Action | Type | Description |
|--------|------|-------------|
| `openQuickCreate` | sync | Open modal for type |
| `closeQuickCreate` | sync | Close and reset |
| `setError` | sync | Set error message |
| `setPrefillData` | sync | Set prefill data |
| `submitQuickDiary` | async | Create diary |
| `submitQuickThought` | async | Create thought |
| `submitQuickVoice` | async | Create voice note |
| `submitQuickPhoto` | async | Create photo |

### 8. toastSlice - Toast Notifications

**File**: `lib/store/slices/toastSlice.ts`

**State**:

```typescript
interface ToastState {
  toasts: Toast[];
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}
```

**Actions**:

| Action | Type | Description |
|--------|------|-------------|
| `addToast` | sync | Add toast (auto-generates ID) |
| `removeToast` | sync | Remove by ID |
| `clearToasts` | sync | Clear all |

**ID Generation**:

```typescript
id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
```

---

## Key Patterns

### 1. Async Thunk Error Handling

All thunks use `rejectWithValue` for consistent error format:

```typescript
export const fetchData = createAsyncThunk(
  'slice/fetchData',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.getData(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// In extraReducers
builder.addCase(fetchData.rejected, (state, action) => {
  state.isLoading = false;
  state.error = action.payload as string;
});
```

### 2. Optimistic Updates

Chat slice adds messages immediately:

```typescript
builder.addCase(sendMessage.pending, (state, action) => {
  // Add user message immediately
  state.messages.push({
    role: 'user',
    content: action.meta.arg.message,
    timestamp: new Date().toISOString(),
  });

  // Add typing indicator
  state.messages.push({
    id: TYPING_INDICATOR_ID,
    role: 'system',
    content: 'Thinking...',
    timestamp: new Date().toISOString(),
  });
});
```

### 3. Per-Resource Loading Status

Circle slice tracks loading per circle:

```typescript
loadingStatus: {
  circles: 'idle',
  messages: {
    'circle-1': 'loading',
    'circle-2': 'success',
  },
  // ...
}
```

### 4. State Normalization

Related data organized by parent ID:

```typescript
circleMembers: {
  'circle-1': [member1, member2],
  'circle-2': [member3, member4],
};

circleMessages: {
  'circle-1': [message1, message2],
};
```

### 5. Minimal Persistence

Only auth is persisted to localStorage:

```typescript
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth'],  // Only auth persisted
};
```

Benefits:
- Data freshness on each session
- Reduced storage usage
- Simpler cache invalidation

---

## Usage Examples

### Fetching Data on Mount

```typescript
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchDashboardData } from '@/lib/store/slices/dashboardSlice';

function Dashboard() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { stats, isLoading } = useAppSelector(state => state.dashboard);

  useEffect(() => {
    if (user) {
      dispatch(fetchDashboardData(user.uid));
    }
  }, [dispatch, user]);

  if (isLoading) return <Loading />;

  return <DashboardContent stats={stats} />;
}
```

### Handling Form Submission

```typescript
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { submitQuickThought, closeQuickCreate } from '@/lib/store/slices/quickCreateSlice';
import { addToast } from '@/lib/store/slices/toastSlice';

function QuickThoughtForm() {
  const dispatch = useAppDispatch();
  const { isSubmitting, error } = useAppSelector(state => state.quickCreate);

  const handleSubmit = async (content: string) => {
    try {
      await dispatch(submitQuickThought({ content })).unwrap();
      dispatch(addToast({ message: 'Thought saved!', type: 'success' }));
      dispatch(closeQuickCreate());
    } catch (error) {
      dispatch(addToast({ message: error, type: 'error' }));
    }
  };

  return <Form onSubmit={handleSubmit} isLoading={isSubmitting} />;
}
```

### Filtered Selectors

```typescript
import { useAppSelector } from '@/lib/store/hooks';

function EventList() {
  const { events, filters } = useAppSelector(state => state.events);

  // Filter events based on current filters
  const filteredEvents = events.filter(event => {
    if (filters.type !== 'all' && event.type !== filters.type) return false;
    if (filters.status !== 'all' && event.status !== filters.status) return false;
    if (filters.startDate && new Date(event.datetime) < filters.startDate) return false;
    if (filters.endDate && new Date(event.datetime) > filters.endDate) return false;
    return true;
  });

  return <EventGrid events={filteredEvents} />;
}
```

---

## Related Documentation

- [Architecture](../ARCHITECTURE.md) - System overview
- [Authentication](./AUTHENTICATION.md) - Auth slice details
- [Components](../COMPONENTS.md) - Component usage
