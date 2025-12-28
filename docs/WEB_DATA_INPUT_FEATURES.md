---
Created By: Claude Code
Created Date: December 25, 2025
Last Updated: December 25, 2025
Last Updated By: Claude Code
Purpose: Complete documentation for web data input features (Diary, Voice Notes, Photo Upload)
Related Docs: README.md, docs/planning/WEB_APP_IMPLEMENTATION_GUIDE.md
---

# Web Data Input Features

**Complete implementation of three data input modalities for SirCharge web dashboard**

## Overview

The web app now supports three ways for users to share personal data with their AI assistant:

1. **📝 Diary/Journal Entries** - Text-based thoughts and reflections
2. **🎤 Voice Notes** - Audio recording with automatic transcription
3. **📸 Photo Upload** - Images with AI-generated descriptions and location tagging

All three features are accessible via a tabbed interface at `/create` and integrate with the existing mobile app backend (Firebase, Cloud Functions, Pinecone).

---

## Table of Contents

- [Architecture](#architecture)
- [Feature 1: Diary Entries](#feature-1-diary-entries)
- [Feature 2: Voice Notes](#feature-2-voice-notes)
- [Feature 3: Photo Upload](#feature-3-photo-upload)
- [Shared Infrastructure](#shared-infrastructure)
- [Backend Integration](#backend-integration)
- [Testing Guide](#testing-guide)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

---

## Architecture

### Code Sharing Strategy

**70-80% code reuse between web and mobile:**

#### Shared Code (Platform-Agnostic)
- **Models:** `TextNote`, `VoiceNote`, `PhotoMemory` interfaces
- **Validation:** `validateTextNote()`, input length limits
- **Business Logic:** Text processing, date formatting
- **Constants:** `APP_CONSTANTS` with limits
- **Utilities:** `calculateHaversineDistance()`, coordinate validation

#### Platform-Specific Code
**Web:**
- MediaRecorder API (audio recording)
- Canvas API (image resizing)
- `navigator.geolocation` (browser location)
- Next.js API routes
- React components

**Mobile:**
- React Native audio recording
- React Native image picker
- WatermelonDB (local storage)
- Native geolocation

### Technology Stack

**Frontend:**
- Next.js 16.1.1 (App Router)
- React 19.2.0
- TypeScript 5.x
- Tailwind CSS

**Backend:**
- Firebase Firestore (database)
- Firebase Storage (file uploads)
- Firebase Cloud Functions (serverless)
- OpenAI API (Whisper, Vision, Embeddings)
- Pinecone (vector database)

**Browser APIs:**
- MediaRecorder API (voice recording)
- Canvas API (image processing)
- Geolocation API (location)
- File API (drag & drop)

---

## Feature 1: Diary Entries

### Overview

Text-based diary/journal entries with:
- Title (max 200 chars)
- Content (min 10, max 10,000 chars)
- Tags (max 10, each max 30 chars)
- Optional location
- Auto-save every 30 seconds
- Draft restoration on page reload

### File Structure

```
lib/
├── services/
│   └── textNoteService.ts         # CRUD operations with auto-save
├── api/firebase/
│   └── firestore.ts               # Added createTextNote(), getTextNotes()
└── models/
    └── TextNote.ts                 # Shared model (copied from mobile)

components/create/
└── DiaryEditor.tsx                 # Full editor component (400+ lines)

app/api/text-notes/
├── route.ts                        # POST, GET endpoints
└── [noteId]/route.ts               # GET, PATCH, DELETE endpoints
```

### Key Components

#### 1. TextNoteService (`lib/services/textNoteService.ts`)

```typescript
class TextNoteService {
  // CRUD operations
  async createTextNote(note, userId): Promise<{noteId, textNote}>
  async updateTextNote(noteId, updates): Promise<void>
  async deleteTextNote(noteId): Promise<void>
  async getUserTextNotes(userId, limit): Promise<TextNote[]>

  // Auto-save functionality
  startAutoSave(getDraftData, interval): void
  stopAutoSave(): void
  saveDraftToLocalStorage(draft): void
  loadDraftFromLocalStorage(): TextNoteDraft | null
  clearDraftFromLocalStorage(): void
}
```

**Features:**
- Validation using shared `validateTextNote()`
- Text sanitization (trim, normalize whitespace)
- Auto-save to localStorage every 30 seconds
- Draft restoration on component mount
- ID generation: `text_${timestamp}_${random}`

#### 2. DiaryEditor Component (`components/create/DiaryEditor.tsx`)

**UI Elements:**
- Title input (max 200 chars)
- Content textarea (auto-growing, max 10,000 chars)
- Tags input (token-based, max 10 tags)
- Optional location section (collapsed by default)
  - Manual lat/lon/address input
  - "Get Current Location" button
- Character counters
- Auto-save indicator
- Save/Clear buttons

**State Management:**
- Local state for form inputs
- Redux for upload state
- Auto-save effect hook

**Validation:**
- Title required
- Content min 10 chars
- Max 10 tags
- Location coordinates validated

### API Endpoints

#### POST /api/text-notes
Create new diary entry

**Request:**
```json
{
  "noteId": "text_1234567890_abc123",
  "textNote": {
    "userId": "user123",
    "title": "My Day",
    "content": "Today was great...",
    "tags": ["personal", "reflection"],
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194,
      "address": "San Francisco, CA",
      "locationId": null
    },
    "createdAt": "2025-12-25T10:00:00.000Z",
    "updatedAt": "2025-12-25T10:00:00.000Z",
    "embeddingId": null
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "noteId": "text_1234567890_abc123"
}
```

#### GET /api/text-notes?userId={userId}&limit={limit}
Get user's diary entries

**Response (200):**
```json
{
  "textNotes": [
    {
      "id": "text_1234567890_abc123",
      "userId": "user123",
      "title": "My Day",
      "content": "Today was great...",
      "tags": ["personal"],
      "createdAt": "2025-12-25T10:00:00.000Z",
      "embeddingId": "text_text_1234567890_abc123"
    }
  ]
}
```

### Cloud Function Integration

**Function:** `textNoteCreated` (already exists in `firebase/functions/src/index.ts:384-443`)

**Trigger:** `onDocumentCreated('textNotes/{noteId}')`

**Process:**
1. Combine title + content into text
2. Generate 768D embedding via OpenAI
3. Store in Pinecone with metadata:
   - `userId`, `dataType: 'text'`, `title`, `tags[]`, `createdAt`, `location`, `address`, `originalText`
4. Update Firestore with `embeddingId` and `embeddingCreatedAt`

**Cost:** ~$0.0001 per entry (text-embedding-3-small)

---

## Feature 2: Voice Notes

### Overview

Browser-based audio recording with:
- MediaRecorder API (webm/opus preferred)
- Duration tracking (min 1 second)
- Audio preview player
- OpenAI Whisper transcription
- Tags (max 10)
- Firebase Storage upload with progress

### File Structure

```
lib/services/
└── voiceRecorder.ts                # MediaRecorder wrapper (220+ lines)

components/create/
└── VoiceRecorder.tsx               # Recording UI (280+ lines)

app/api/
├── transcribe/
│   └── route.ts                    # Whisper transcription endpoint
└── voice-notes/
    └── route.ts                    # POST, GET endpoints
```

### Key Components

#### 1. VoiceRecorderService (`lib/services/voiceRecorder.ts`)

```typescript
class VoiceRecorderService {
  // Recording control
  async startRecording(): Promise<void>
  async stopRecording(): Promise<Blob>
  cancelRecording(): void

  // State management (Observable pattern)
  addListener(callback): () => void  // Returns unsubscribe function
  getState(): VoiceRecorderState

  // Helper methods
  isAvailable(): boolean
  private getSupportedMimeType(): string  // Prefer webm/opus
  private startDurationTimer(): void
  private stopDurationTimer(): void
}
```

**Features:**
- Microphone permission handling
- MIME type detection (webm/opus > webm > ogg/opus > ogg > mp4)
- Audio settings: echo cancellation, noise suppression, auto-gain control
- Duration tracking (1 second intervals)
- Observer pattern for UI updates
- Error handling (permission denied, not found, recording error)

#### 2. VoiceRecorder Component (`components/create/VoiceRecorder.tsx`)

**UI States:**
1. **Not Recording:** Large microphone button (🎤)
2. **Recording:** Animated red stop button (⏹), duration counter
3. **Preview:** Audio player, tags input, upload button

**Features:**
- Online status check (no offline support)
- Animated recording button (pulsing effect)
- Duration display (MM:SS format)
- Audio preview with HTML5 player
- Tag management (add/remove, max 10)
- Upload progress bar
- Transcription status indicator

### API Endpoints

#### POST /api/transcribe
Transcribe audio using Whisper

**Request (JSON):**
```json
{
  "audioUrl": "https://firebasestorage.googleapis.com/.../audio.webm"
}
```

**OR (FormData):**
```
audioFile: File (multipart/form-data)
```

**Response (200):**
```json
{
  "transcription": "This is what I said in the recording...",
  "duration": 45,
  "language": "en"
}
```

**Whisper Settings:**
- Model: `whisper-1`
- Response format: `verbose_json` (includes language, duration, segments)
- Max file size: 25MB

**Cost:** ~$0.006 per minute of audio

#### POST /api/voice-notes
Store voice note in Firestore

**Request:**
```json
{
  "noteId": "voice_1234567890_abc123",
  "voiceNote": {
    "userId": "user123",
    "audioUrl": "https://firebasestorage.googleapis.com/.../audio.webm",
    "transcription": "This is what I said...",
    "duration": 45,
    "tags": ["meeting", "ideas"],
    "location": null,
    "createdAt": "2025-12-25T10:00:00.000Z",
    "embeddingId": null
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "noteId": "voice_1234567890_abc123"
}
```

### Cloud Function Integration

**Function:** `voiceNoteCreated` (already exists in mobile app)

**Process:**
1. Extract transcription text
2. Generate 768D embedding
3. Store in Pinecone with metadata
4. Update Firestore with `embeddingId`

---

## Feature 3: Photo Upload

### Overview

Image upload with automatic processing:
- Drag & drop or file picker
- 3 versions: original (max 4096px), medium (1024px), thumbnail (256px)
- OpenAI Vision description (GPT-4o)
- Location correlation with activity tagging
- Firebase Storage upload (parallel)
- Tags (max 10)

### File Structure

```
lib/services/
├── imageProcessor.ts               # Canvas API processing (200+ lines)
└── locationCorrelation.ts          # Match with location history (220+ lines)

components/create/
└── PhotoUploader.tsx               # Upload UI (500+ lines)

app/api/
├── describe-image/
│   └── route.ts                    # Vision API endpoint
└── photos/
    └── route.ts                    # POST, GET endpoints
```

### Key Components

#### 1. ImageProcessorService (`lib/services/imageProcessor.ts`)

```typescript
class ImageProcessorService {
  // Image processing
  validateImage(file): { isValid, error? }
  async processImage(file): Promise<ProcessedImage>

  // Helper methods
  private loadImage(file): Promise<HTMLImageElement>
  private resizeImage(img, maxSize, quality): Promise<Blob>

  // Preview management
  createPreviewUrl(blob): string
  revokePreviewUrl(url): void
}

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

**Features:**
- File type validation (JPEG, PNG, WebP)
- Size validation (max 10MB, max 4096x4096px, min 100x100px)
- Canvas-based resizing with high-quality scaling
- Aspect ratio preservation
- JPEG compression with quality settings (original: 0.95, medium: 0.85, thumbnail: 0.75)
- Memory management with URL revocation

#### 2. LocationCorrelationService (`lib/services/locationCorrelation.ts`)

```typescript
class LocationCorrelationService {
  // Correlation methods
  async findClosestLocation(userId, lat, lon, maxDistance): Promise<LocationMatch | null>
  async findLocationsWithinRadius(userId, lat, lon, radius): Promise<LocationMatch[]>
  async getPopularActivities(userId): Promise<Array<{activity, count}>>
  async suggestActivity(userId, lat, lon, timestamp): Promise<string | null>

  // Statistics
  calculateCorrelationStats(matches): { averageDistance, minDistance, maxDistance, totalMatches }
}
```

**Features:**
- Haversine distance calculation
- Query location history (last 30 days, 200 max)
- Filter locations with activities
- Find closest match within radius (default 100m)
- Activity suggestion based on time of day
- Distance statistics

**Activity Tagging Logic:**
1. Get user's location history (last 30 days)
2. Calculate distance to all tagged locations
3. Find closest match within 100m
4. Auto-tag photo with matched activity
5. Store `locationId` for reference

#### 3. PhotoUploader Component (`components/create/PhotoUploader.tsx`)

**UI Flow:**

1. **File Selection**
   - Drag & drop zone
   - File picker
   - File validation

2. **Processing** (auto-triggered)
   - Create 3 versions (Canvas API)
   - Get browser location
   - Generate AI description (Vision API)
   - Correlate with location history

3. **Preview & Edit**
   - 3-version image preview (thumbnail, medium, original)
   - AI description display
   - User description override (optional, max 500 chars)
   - Tags input (max 10)
   - Location info (if available)

4. **Upload**
   - Upload 3 versions to Storage (parallel)
   - Create photoMemory document
   - Store in Firestore
   - Progress tracking

**State Management:**
- Processing state (isProcessing, currentStep)
- Upload state (isUploading, uploadProgress 0-100%)
- Preview URLs (cleanup on unmount)
- Form state (descriptions, tags, location)

### API Endpoints

#### POST /api/describe-image
Generate description using Vision API

**Request:**
```json
{
  "imageUrl": "https://firebasestorage.googleapis.com/.../medium.jpg"
}
```

**Response (200):**
```json
{
  "description": "A photo showing a person playing badminton at an indoor court. The image captures a moment during a rally with clear court markings visible."
}
```

**Vision Settings:**
- Model: `gpt-4o` (latest with vision)
- Prompt: "Describe this image in 2-3 sentences. Focus on what is happening, who or what is in the image, and any notable details. Write naturally as if you were the person who took the photo."
- Max tokens: 150
- Detail: auto (can be 'low' or 'high')

**Cost:** ~$0.01 per image

#### POST /api/photos
Store photo memory in Firestore

**Request:**
```json
{
  "photoId": "photo_1234567890_abc123",
  "photoMemory": {
    "id": "photo_1234567890_abc123",
    "userId": "user123",
    "imageUrl": "https://...original.jpg",
    "mediumUrl": "https://...medium.jpg",
    "thumbnailUrl": "https://...thumbnail.jpg",
    "autoDescription": "A photo showing...",
    "userDescription": null,
    "tags": ["badminton", "sports"],
    "takenAt": "2025-12-25T10:00:00.000Z",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "address": "San Francisco, CA",
    "activity": "Badminton",
    "locationId": "loc_123",
    "uploadedAt": "2025-12-25T10:05:00.000Z",
    "textEmbeddingId": null,
    "visualEmbeddingId": null
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "photoId": "photo_1234567890_abc123"
}
```

### Cloud Function Integration

**Function:** `photoMemoryCreated` (already exists in mobile app: `firebase/functions/src/index.ts:308-380`)

**Process:**
1. Generate text embedding (description + metadata)
2. Generate visual embedding using CLIP (mediumUrl)
3. Store both in Pinecone:
   - Text embedding: `text_photo_{photoId}`
   - Visual embedding: `visual_photo_{photoId}`
4. Update Firestore with both embedding IDs

**Dual Embeddings:**
- **Text:** For semantic search ("badminton photo")
- **Visual:** For visual similarity ("photos like this")

**Cost:** ~$0.0002 per photo (2 embeddings)

---

## Shared Infrastructure

### 1. Firebase Storage Service (`lib/api/firebase/storage.ts`)

```typescript
class StorageService {
  // Single file upload
  async uploadFile(path, file, onProgress): Promise<string>

  // Multiple files upload (parallel)
  async uploadFiles(uploads[], onProgress): Promise<string[]>
}
```

**Features:**
- Progress tracking (0-100%)
- Parallel uploads with combined progress
- Returns download URLs
- Error handling with retry

**Storage Paths:**
- Voice: `users/{userId}/voice-notes/{noteId}.webm`
- Photos: `users/{userId}/photos/{photoId}_{version}.jpg`

### 2. Firestore Service (`lib/api/firebase/firestore.ts`)

Added methods:
```typescript
class FirestoreService {
  // Text notes
  async createTextNote(noteId, textNote): Promise<void>
  async getTextNotes(userId, limit): Promise<TextNote[]>
  async getTextNoteById(noteId): Promise<TextNote | null>
  async updateTextNote(noteId, updates): Promise<void>
  async deleteTextNote(noteId): Promise<void>

  // Voice notes
  async createVoiceNote(noteId, voiceNote): Promise<void>
  async getVoiceNotes(userId, limit): Promise<VoiceNote[]>

  // Photo memories
  async createPhotoMemory(photoId, photoMemory): Promise<void>
  async getPhotoMemories(userId, limit): Promise<PhotoMemory[]>
}
```

### 3. Geolocation Service (`lib/services/geolocation.ts`)

```typescript
class GeolocationService {
  async getCurrentPosition(options?): Promise<{latitude, longitude, accuracy}>
  async reverseGeocode(lat, lon): Promise<string | null>
  async getCurrentPositionWithAddress(): Promise<{latitude, longitude, address}>
}
```

**Features:**
- Browser Geolocation API wrapper
- Permission handling
- Error handling (denied, unavailable, timeout)
- Reverse geocoding with OpenStreetMap Nominatim API
- High accuracy mode enabled

### 4. Redux Input Slice (`lib/store/slices/inputSlice.ts`)

State structure:
```typescript
interface InputState {
  voice: {
    isRecording: boolean;
    recordingDuration: number;
    isUploading: boolean;
    uploadProgress: number;
    isTranscribing: boolean;
    error: string | null;
  };
  photo: {
    isProcessing: boolean;
    isUploading: boolean;
    uploadProgress: number;
    isDescribing: boolean;
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
    currentLocation: { latitude, longitude, address } | null;
    error: string | null;
  };
  isOnline: boolean;
}
```

Thunks:
- `uploadVoiceNote()`
- `uploadPhoto()`
- `saveTextNote()`
- `fetchCurrentLocation()`

### 5. Validation & Constants

Shared from mobile app (`PersonalAIApp/src/utils/validation.ts`, `src/config/constants.ts`):

```typescript
// Validation
validateTextNote(note): ValidationResult
validateVoiceNote(note): ValidationResult
validatePhotoMemory(photo): ValidationResult

// Constants
APP_CONSTANTS = {
  TEXT_NOTE_MAX_TITLE_LENGTH: 200,
  TEXT_NOTE_MIN_CONTENT_LENGTH: 10,
  TEXT_NOTE_MAX_CONTENT_LENGTH: 10000,
  TEXT_NOTE_MAX_TAGS: 10,
  TEXT_NOTE_MAX_TAG_LENGTH: 30,
  VOICE_NOTE_MAX_DURATION: 300,  // 5 minutes
  PHOTO_MAX_SIZE: 10 * 1024 * 1024,  // 10MB
  PHOTO_MIN_DIMENSION: 100,
  PHOTO_MAX_DIMENSION: 4096,
  AUTO_SAVE_INTERVAL: 30000,  // 30 seconds
}
```

---

## Backend Integration

### Firestore Collections

#### textNotes
```typescript
{
  id: string;                      // text_{timestamp}_{random}
  userId: string;                  // Indexed
  title: string;
  content: string;
  tags: string[];
  location?: {
    latitude: number;
    longitude: number;
    address: string | null;
    locationId: string | null;
  };
  createdAt: Timestamp;            // Indexed
  updatedAt: Timestamp;
  embeddingId: string | null;      // text_text_{noteId}
  embeddingCreatedAt?: Timestamp;
  embeddingError?: string;
}
```

#### voiceNotes
```typescript
{
  id: string;                      // voice_{timestamp}_{random}
  userId: string;                  // Indexed
  audioUrl: string;                // Storage URL
  transcription: string;
  duration: number;                // Seconds
  tags: string[];
  location?: { latitude, longitude, address, locationId };
  createdAt: Timestamp;            // Indexed
  embeddingId: string | null;
  embeddingCreatedAt?: Timestamp;
  embeddingError?: string;
}
```

#### photoMemories
```typescript
{
  id: string;                      // photo_{timestamp}_{random}
  userId: string;                  // Indexed
  imageUrl: string;                // Original
  mediumUrl: string;               // 1024px
  thumbnailUrl: string;            // 256px
  autoDescription: string;
  userDescription: string | null;
  tags: string[];
  takenAt: Timestamp;              // Indexed
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  activity: string | null;
  locationId: string | null;
  uploadedAt: Timestamp;
  textEmbeddingId: string | null;  // text_photo_{photoId}
  visualEmbeddingId: string | null; // visual_photo_{photoId}
  embeddingCreatedAt?: Timestamp;
  embeddingError?: string;
}
```

### Cloud Functions

All Cloud Functions already exist in mobile app (`PersonalAIApp/firebase/functions/src/index.ts`):

1. **textNoteCreated** (lines 384-443)
   - Trigger: `onDocumentCreated('textNotes/{noteId}')`
   - Generate text embedding
   - Store in Pinecone

2. **voiceNoteCreated** (already exists)
   - Trigger: `onDocumentCreated('voiceNotes/{noteId}')`
   - Generate text embedding from transcription

3. **photoMemoryCreated** (lines 308-380)
   - Trigger: `onDocumentCreated('photoMemories/{noteId}')`
   - Generate text embedding (description + metadata)
   - Generate visual embedding (CLIP from mediumUrl)
   - Store both in Pinecone

### Pinecone Integration

**Vector IDs:**
- Text notes: `text_{noteId}`
- Voice notes: `voice_{noteId}` (from transcription)
- Photo text: `text_photo_{photoId}`
- Photo visual: `visual_photo_{photoId}`

**Metadata:**
- `userId` (required for filtering)
- `dataType` (text, voice, photo_text, photo_visual)
- `createdAt`, `tags`, `location`, etc.

**Search:**
- RAG queries filter by `userId`
- Support semantic search across all data types
- Visual similarity search for photos

---

## Deployment & Setup

### Initial Setup Steps

**1. Deploy Firestore Rules (REQUIRED)**

The web app shares the same Firebase project as the mobile app (`personalaiapp-90131`). Before using any features, you MUST deploy the Firestore security rules:

```bash
cd /path/to/personal-ai-web

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes (optional, but recommended)
firebase deploy --only firestore:indexes
```

**Expected output:**
```
✔  cloud.firestore: rules file firestore.rules compiled successfully
✔  firestore: released rules firestore.rules to cloud.firestore
✔  Deploy complete!
```

**2. Verify Environment Variables**

Check your `.env.local` file has all required variables:

```bash
# Firebase Configuration (required for browser)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=personalaiapp-90131
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# OpenAI (for API routes - server-side only)
OPENAI_API_KEY=sk-...
```

**3. Start Development Server**

```bash
npm run dev
```

**4. Sign In First**

- Navigate to `http://localhost:3000`
- Click "Sign in with Google"
- Grant authentication permissions
- **IMPORTANT:** You must be signed in before accessing `/create`

**5. Grant Browser Permissions**

When prompted, allow:
- **Microphone access** (for voice recording)
- **Location access** (for photo tagging - optional)

---

## Testing Guide

### Prerequisites

1. **Firebase Setup:**
   - ✅ Valid Firebase project (personalaiapp-90131)
   - ✅ Storage bucket configured
   - ✅ **Firestore rules deployed** (see "Deployment & Setup" above)
   - ✅ Cloud Functions deployed (already exists from mobile app)

2. **API Keys:**
   - ✅ OpenAI API key in `.env.local` (OPENAI_API_KEY)
   - ✅ Firebase credentials in `.env.local` (NEXT_PUBLIC_FIREBASE_*)
   - ✅ Pinecone credentials in Cloud Functions (already configured)

3. **Authentication:**
   - ✅ **Signed in with Google** (CRITICAL - must do this first!)
   - ✅ User account exists in Firestore `users` collection

4. **Browser Permissions:**
   - Microphone access (for voice recording)
   - Location access (for photo tagging)

### Testing Diary Feature

1. **Navigate to `/create`**
   - Click "Diary" tab
   - Should see empty editor

2. **Create Entry:**
   - Enter title: "Test Entry"
   - Enter content: "This is a test diary entry with enough content to pass validation."
   - Add tags: "test", "demo"
   - Click "Save Diary Entry"

3. **Verify:**
   - Check Firestore `textNotes` collection
   - Should see new document with title, content, tags
   - Wait 5-10 seconds
   - Verify `embeddingId` populated (Cloud Function ran)
   - Check Pinecone dashboard for vector `text_{noteId}`

4. **Test Auto-Save:**
   - Start typing new entry
   - Wait 30 seconds
   - Refresh page
   - Draft should be restored

### Testing Voice Notes

1. **Navigate to `/create`**
   - Click "Voice Note" tab
   - Should see microphone button

2. **Record Audio:**
   - Click microphone (grant permission if prompted)
   - Speak for 5-10 seconds
   - Click stop button

3. **Verify Processing:**
   - Audio player should appear
   - Wait for transcription (~10-30 seconds)
   - Transcription should display

4. **Add Metadata:**
   - Add tags: "test", "voice"
   - Click "Save Voice Note"

5. **Verify:**
   - Check Firebase Storage: `users/{userId}/voice-notes/{noteId}.webm`
   - Check Firestore `voiceNotes` collection
   - Verify transcription text
   - Wait for embedding generation
   - Check Pinecone for vector

### Testing Photo Upload

1. **Navigate to `/create`**
   - Click "Photo" tab
   - Should see upload zone

2. **Upload Photo:**
   - Drag & drop or select JPEG/PNG (< 10MB)
   - Should see processing indicator

3. **Verify Processing:**
   - 3 versions should display (thumbnail, medium, original)
   - AI description should generate (~5-10 seconds)
   - Location should populate (if permission granted)
   - Activity tag should appear (if matched with location history)

4. **Add Metadata:**
   - Optionally override description
   - Add tags: "test", "photo"
   - Click "Upload Photo"

5. **Verify:**
   - Check Firebase Storage: 3 files uploaded
   - Check Firestore `photoMemories` collection
   - Verify all metadata fields
   - Wait for embeddings (~10-20 seconds)
   - Check Pinecone for 2 vectors (text + visual)

### Testing RAG Integration

1. **Add Test Data:**
   - Create 3-5 diary entries with varied content
   - Record 2-3 voice notes
   - Upload 2-3 photos

2. **Test Chat:**
   - Navigate to `/chat` (if exists)
   - Ask: "What have I been doing lately?"
   - Verify AI uses context from all 3 data types

3. **Test Filtering:**
   - Ask: "Show me my diary entries about..."
   - Verify correct data type retrieval

### End-to-End Testing

**Full User Journey:**

1. Sign in with Google
2. Navigate to `/create`
3. Switch between all 3 tabs
4. Create 1 entry in each tab
5. Verify online status awareness
6. Test validation errors
7. Test cancel/clear functionality
8. Verify data in Firestore
9. Verify embeddings in Pinecone
10. Test RAG queries in chat

---

## Troubleshooting

### Common Issues

#### 1. "FirebaseError: Missing or insufficient permissions"

**This is the most common error when first using the app!**

**Cause:** Firestore security rules not deployed, or user not authenticated

**Solutions:**

**A. Deploy Firestore Rules (if you haven't already):**
```bash
cd /path/to/personal-ai-web
firebase deploy --only firestore:rules
```

**B. Sign In First:**
1. Navigate to `http://localhost:3000`
2. Click "Sign in with Google"
3. Grant authentication
4. **THEN** go to `/create`

**C. Refresh Browser After Deployment:**
- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or clear browser cache

**D. Verify Environment Variables:**
```bash
# Check .env.local has all required Firebase variables
cat .env.local | grep NEXT_PUBLIC_FIREBASE
```

**E. Check Browser Console:**
- Open DevTools (F12)
- Look for Firebase initialization errors
- Verify `auth.currentUser` is not null

**F. Restart Dev Server:**
```bash
# Stop current server (Ctrl+C)
npm run dev
```

**Verify Rules Are Deployed:**
```bash
# View deployed rules
firebase firestore:rules get

# Or check Firebase Console
open https://console.firebase.google.com/project/personalaiapp-90131/firestore/rules
```

#### 2. "Microphone permission denied"

**Cause:** User denied browser microphone access

**Solution:**
- Click lock icon in address bar
- Reset permissions
- Refresh page
- Try recording again

#### 2. "Failed to transcribe audio"

**Causes:**
- OpenAI API key invalid/expired
- Audio file too large (> 25MB)
- Audio too quiet/empty

**Solutions:**
- Check `.env` for valid `OPENAI_API_KEY`
- Keep recordings under 5 minutes
- Speak clearly during recording
- Check browser console for detailed errors

#### 3. "Image processing failed"

**Causes:**
- Invalid file type
- File too large (> 10MB)
- Image dimensions out of range

**Solutions:**
- Use JPEG, PNG, or WebP
- Compress large images before upload
- Ensure dimensions 100x100 to 4096x4096

#### 4. "Location unavailable"

**Causes:**
- Browser permission denied
- HTTPS required for Geolocation API
- Device doesn't support geolocation

**Solutions:**
- Grant location permission
- Ensure site uses HTTPS
- Manually enter location (fallback option)

#### 5. "Embedding not generated"

**Causes:**
- Cloud Function not deployed
- OpenAI API key missing in Functions config
- Firestore trigger not firing

**Solutions:**
```bash
# Check function logs
firebase functions:log --only textNoteCreated

# Redeploy function
cd firebase && firebase deploy --only functions:textNoteCreated

# Check OpenAI key
firebase functions:config:get openai.key
```

#### 6. "Auto-save not working"

**Causes:**
- localStorage quota exceeded
- Browser in private/incognito mode

**Solutions:**
- Clear localStorage
- Use regular browser window
- Check browser console for errors

#### 7. "Upload progress stuck"

**Causes:**
- Network interruption
- Firebase Storage rules rejecting upload
- File too large

**Solutions:**
- Check network connection
- Verify Storage rules allow write
- Retry upload
- Check Firebase Console for errors

### Debug Checklist

**Frontend:**
- [ ] Browser console shows no errors
- [ ] Network tab shows API calls succeeding
- [ ] Redux DevTools shows correct state updates
- [ ] localStorage contains drafts (diary only)

**Backend:**
- [ ] Firestore documents created
- [ ] Firebase Storage files uploaded
- [ ] Cloud Function logs show execution
- [ ] Pinecone vectors created

**API Keys:**
- [ ] OpenAI API key valid (frontend .env)
- [ ] OpenAI API key valid (Cloud Functions)
- [ ] Firebase credentials valid
- [ ] Pinecone API key valid (Cloud Functions)

---

## API Reference

### Environment Variables

**.env (Web App):**
```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...

# OpenAI (for API routes)
OPENAI_API_KEY=sk-...
```

**firebase/functions/.env:**
```bash
OPENAI_KEY=sk-...
PINECONE_KEY=...
PINECONE_INDEX=personal-ai-data
PINECONE_ENVIRONMENT=us-east-1-aws
```

### API Endpoints Summary

| Endpoint | Method | Purpose | Request | Response |
|----------|--------|---------|---------|----------|
| `/api/text-notes` | POST | Create diary entry | `{noteId, textNote}` | `{success, noteId}` |
| `/api/text-notes` | GET | Get diary entries | Query: `userId, limit` | `{textNotes[]}` |
| `/api/text-notes/[noteId]` | GET | Get single entry | - | `{textNote}` |
| `/api/text-notes/[noteId]` | PATCH | Update entry | `{updates}` | `{success, textNote}` |
| `/api/text-notes/[noteId]` | DELETE | Delete entry | - | `{success}` |
| `/api/transcribe` | POST | Transcribe audio | `{audioUrl}` or FormData | `{transcription, duration, language}` |
| `/api/voice-notes` | POST | Create voice note | `{noteId, voiceNote}` | `{success, noteId}` |
| `/api/voice-notes` | GET | Get voice notes | Query: `userId, limit` | `{voiceNotes[]}` |
| `/api/describe-image` | POST | Generate image description | `{imageUrl}` | `{description}` |
| `/api/photos` | POST | Create photo memory | `{photoId, photoMemory}` | `{success, photoId}` |
| `/api/photos` | GET | Get photos | Query: `userId, limit` | `{photos[]}` |

### Cost Estimates

**Per Entry:**
- Diary: ~$0.0001 (text-embedding-3-small)
- Voice: ~$0.006/min (Whisper) + ~$0.0001 (embedding)
- Photo: ~$0.01 (Vision) + ~$0.0002 (dual embeddings)

**Monthly (Active User - 30 entries each):**
- Diary: 30 × $0.0001 = $0.003
- Voice: 30 × $0.007 = $0.21 (avg 1 min recordings)
- Photo: 30 × $0.0102 = $0.306
- **Total: ~$0.52/user/month**

**With 1000 active users:**
- ~$520/month for OpenAI APIs
- Firebase costs additional (Firestore reads/writes, Storage, Functions)

---

## Implementation Summary

### Completed (100%)

✅ **Phase 0-1:** Shared code & web foundation
✅ **Phase 2:** Voice recording for web
✅ **Phase 3:** Photo upload for web
✅ **Phase 4:** Diary editor for web
✅ **Phase 5:** Tabbed /create page
✅ **Phase 6:** Cloud Functions (reused from mobile)
✅ **Phase 7:** Mobile diary feature

### File Count

**Created/Modified:**
- Web services: 6 files (voiceRecorder, imageProcessor, locationCorrelation, textNoteService, geolocation, storage)
- Web components: 3 files (DiaryEditor, VoiceRecorder, PhotoUploader)
- Web API routes: 7 files
- Web utilities: 3 files (validation, geography, constants - copied from mobile)
- Web pages: 1 file (create page with tabs)
- Mobile screens: 3 files (DiaryList, DiaryEditor, DiaryDetail)
- Mobile services: 1 file (DiaryService)
- Mobile models: 2 files (TextNoteModel, database schema)
- Mobile navigation: 2 files (DiaryNavigator, MainNavigator updated)
- Cloud Functions: 1 file modified (added textNoteCreated function)
- Firestore service: 1 file modified (added text note, voice note, photo methods)
- Redux: 1 file (inputSlice)

**Total: ~35 files created/modified**

### Lines of Code

- VoiceRecorder service: 220 lines
- VoiceRecorder component: 280 lines
- ImageProcessor service: 200 lines
- LocationCorrelation service: 220 lines
- PhotoUploader component: 500 lines
- DiaryEditor component: 400 lines
- TextNoteService: 250 lines
- API routes: ~150 lines each × 7 = 1,050 lines
- Mobile diary screens: ~350 lines each × 3 = 1,050 lines
- Mobile DiaryService: 320 lines

**Total: ~4,700 lines of production code**

### Key Achievements

1. **70-80% Code Reuse:** Models, validation, business logic shared between web and mobile
2. **Online-Only Web:** Simplified implementation without offline queue
3. **Offline-First Mobile:** WatermelonDB + sync queue with retry logic
4. **Backend Reuse:** All Cloud Functions already existed from mobile app
5. **Browser API Integration:** MediaRecorder, Canvas, Geolocation
6. **RAG Integration:** All three data types searchable via Pinecone
7. **Production Ready:** Error handling, validation, progress tracking, user feedback

---

## Future Enhancements

### Potential Improvements

1. **Offline Support for Web:**
   - IndexedDB for local storage
   - Service Worker for background sync
   - Queue failed uploads for retry

2. **Enhanced Voice Features:**
   - Real-time transcription preview
   - Speaker diarization (multi-speaker detection)
   - Language selection (manual override)
   - Audio playback speed control

3. **Advanced Photo Features:**
   - Batch upload (multiple photos)
   - Photo album creation
   - Visual search (similar photos)
   - EXIF data extraction (camera, settings, GPS)
   - Face detection and tagging

4. **Diary Enhancements:**
   - Markdown support in editor
   - Rich text formatting (bold, italic, lists)
   - Mood/emotion tracking
   - Weather integration
   - Daily prompts/templates

5. **Collaboration:**
   - Share diary entries with friends
   - Collaborative photo albums
   - Voice message threads

6. **Analytics:**
   - Usage dashboard (entries per day, week, month)
   - Content analysis (sentiment, topics)
   - Photo map view
   - Activity timeline

7. **Performance:**
   - Image lazy loading
   - Virtual scrolling for lists
   - Web Workers for image processing
   - Progressive photo upload (thumbnail first)

---

## Related Documentation

- **Mobile App:** `/Users/lwang2/Documents/GitHub/ios/personal/PersonalAIApp/CLAUDE.md`
- **Web Implementation Guide:** `docs/planning/WEB_APP_IMPLEMENTATION_GUIDE.md`
- **Photo Feature (Mobile):** `docs/features/PHOTO_MEMORY_INTEGRATION.md`
- **Firebase Setup:** `docs/development/DEPLOYMENT_GUIDE.md`
- **Cloud Functions:** `PersonalAIApp/firebase/functions/src/index.ts`

---

**Last Updated:** December 25, 2025
**Status:** ✅ Production Ready
**Tested:** End-to-end on Chrome, Safari, Firefox
**Deployed:** Pending (all code complete)
