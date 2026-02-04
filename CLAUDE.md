# CLAUDE.md

---
**Created By:** Claude Code
**Created Date:** December 26, 2025
**Last Updated:** December 26, 2025
**Last Updated By:** Claude Sonnet 4.5
**Purpose:** Main guide for Claude Code (claude.ai/code) when working with code in this repository
**Related Docs:** `README.md`, `package.json`, `.env.example`
---

## Project Overview

**Personal AI Web Dashboard** is a Next.js 16 web application that provides a personal data collection and AI chatbot interface. Users can:
- Create text notes (diary entries and quick thoughts like Twitter)
- Record and transcribe voice notes
- Upload and describe photos with location tagging
- Chat with an AI assistant that has access to their personal data via RAG (Retrieval-Augmented Generation)
- View dashboard with recent activity and data statistics

**Technology Stack:**
- **Frontend:** Next.js 16.1.1 (App Router), React 19.2.3, TypeScript, Tailwind CSS 4
- **State Management:** Redux Toolkit 2.11.2 with Redux Persist (auth state only)
- **Backend:** Next.js API Routes with Firebase Admin SDK
- **Database:** Firebase Firestore (NoSQL)
- **Storage:** Firebase Storage (photos, audio files)
- **Authentication:** Firebase Auth (Google Sign-In)
- **AI Services:** OpenAI (GPT-4o, text-embedding-3-small, Whisper)
- **Vector Database:** Pinecone (1536D serverless)
- **Cloud Functions:** Firebase Cloud Functions (Node.js 20, separate repository)

**Companion Repository:**
- Mobile app: `/Users/lwang2/Documents/GitHub/ios/personal/PersonalAIApp` (React Native + Expo)
- Cloud Functions: `PersonalAIApp/firebase/functions/` (handles embedding generation)

## Key Architectural Concepts

### 1. Hybrid Client-Server Architecture

This is a **web application**, not a mobile app. Critical differences:
- Uses Next.js App Router with Server Components and Client Components
- API routes (`app/api/`) use Firebase Admin SDK (elevated privileges)
- Client-side code uses Firebase Web SDK (user-scoped)
- No WatermelonDB or Redux Persist for data (only auth state is persisted)
- Server-side rendering for public pages, client-side for authenticated pages

### 2. Data Flow: Collection → Firestore → Cloud Function → Pinecone → RAG

```
1. User creates data (text note, voice note, photo)
   ↓
2. Web app uploads to Firebase Storage (if file) + Firestore
   ↓
3. Cloud Function triggered (onTextNoteCreated, onVoiceNoteCreated, etc.)
   ↓
4. Cloud Function generates embedding via OpenAI API
   ↓
5. Cloud Function stores vector in Pinecone + updates Firestore document
   ↓
6. User asks question in chat
   ↓
7. RAGEngine.ts generates question embedding
   ↓
8. Query Pinecone for top K relevant vectors (filtered by userId)
   ↓
9. Build context from retrieved data
   ↓
10. Send to GPT-4o with context → return AI response
```

### 3. Authentication Flow

**Client-Side (Browser):**
```
1. User clicks "Sign in with Google" button
   ↓
2. Firebase Auth Web SDK handles OAuth flow
   ↓
3. Returns Firebase user object with ID token
   ↓
4. Redux authSlice stores user object in Redux state
   ↓
5. Redux Persist saves auth state to localStorage
   ↓
6. AuthGuard component protects routes (redirects to /login if not authenticated)
```

**Server-Side (API Routes):**
```
1. Client makes request to API route (e.g., POST /api/chat)
   ↓
2. ApiClient class adds Authorization header: "Bearer <idToken>"
   ↓
3. API route calls requireAuth(request) middleware
   ↓
4. Middleware verifies ID token with Firebase Admin SDK
   ↓
5. If valid: returns user object (uid, email, role, accountStatus)
   ↓
6. If invalid: returns 401 error response
   ↓
7. API route proceeds with authenticated user.uid
```

**Important:** ID tokens expire after 1 hour. Firebase SDK auto-refreshes, but if user sees 401 errors, they should sign out and sign back in.

### 4. Redux State Management

Only **auth state** is persisted to localStorage. All other data is fetched on-demand from Firestore.

**Redux Slices:**
- `authSlice` - User authentication (uid, email, role, isAuthenticated, isLoading)
- `inputSlice` - Input forms state (voice recording, photo upload, text notes, location)
- `dashboardSlice` - Dashboard data (stats, recent notes/photos/voice)
- `quickCreateSlice` - Quick thought creation (isSubmitting, error)
- `chatSlice` - Chat messages and conversation history

**Redux Persist Config:**
```typescript
// Only persist auth state
persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth'] // Only auth is persisted
}
```

### 5. Firestore Data Isolation

**CRITICAL:** Every document has a `userId` field. Firestore security rules enforce that users can only R/W their own data.

**Security Rules Pattern:**
```javascript
match /textNotes/{noteId} {
  // Users can only read their own notes
  allow read: if resource.data.userId == request.auth.uid;

  // Users can only create notes with their own userId
  allow create: if request.resource.data.userId == request.auth.uid;

  // Cloud Functions can update embedding fields
  allow update: if resource.data.userId == request.auth.uid ||
    request.resource.data.diff(resource.data).affectedKeys().hasOnly([
      'embeddingId', 'embeddingCreatedAt', 'embeddingError', 'embeddingErrorAt'
    ]);
}
```

**Important:** Never skip `userId` filters in queries. This prevents data leakage between users.

### 6. Pinecone Metadata Constraints

**CRITICAL:** Pinecone rejects `null` values in metadata. You must filter them out before upserting.

**Problem:**
```typescript
// ❌ This will fail if address is null
await pinecone.upsert([{
  id: 'note_123',
  values: embedding,
  metadata: {
    userId: 'user_1',
    address: null,  // ERROR: Metadata value must be string, number, boolean, or list of strings
    text: 'Content here'
  }
}]);
```

**Solution:**
```typescript
// ✅ Filter out null/undefined before upserting
const cleanMetadata: Record<string, any> = {};
for (const [key, value] of Object.entries(metadata)) {
  if (value !== null && value !== undefined) {
    cleanMetadata[key] = value;
  }
}
await pinecone.upsert([{ id, values, metadata: cleanMetadata }]);
```

**Locations where null filtering is required:**
- `lib/services/textNoteService.ts` - Lines 76-90 (location fields)
- `lib/store/slices/inputSlice.ts` - Photo upload location fields
- Cloud Functions `PersonalAIApp/firebase/functions/src/index.ts` - upsertToPinecone helper

### 7. Firestore Timestamp Serialization

**CRITICAL:** Firestore returns `Timestamp` objects which are non-serializable for Redux. You must convert them to ISO strings.

**Problem:**
```typescript
// ❌ Redux error: non-serializable value in state
const note = docSnap.data(); // Returns { createdAt: Timestamp {...} }
dispatch(setNote(note)); // ERROR: can't serialize Timestamp
```

**Solution:**
```typescript
// ✅ Use duck-typing to detect and convert Timestamps
function serializeFirestoreData(data: any): any {
  if (!data) return data;

  // Check for Firestore Timestamp (has toDate method)
  if (data && typeof data === 'object' && typeof data.toDate === 'function') {
    return data.toDate().toISOString();
  }

  // Recursively handle objects and arrays
  if (Array.isArray(data)) return data.map(serializeFirestoreData);
  if (typeof data === 'object') {
    const serialized: any = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializeFirestoreData(value);
    }
    return serialized;
  }

  return data;
}
```

**Why duck-typing:** `instanceof Timestamp` fails across module boundaries. Using `.toDate()` method check is more reliable.

**Location:** `lib/api/firebase/firestore.ts` - Lines 21-47, applied in `getDocument()` and `getDocuments()`

### 8. Auto-Refresh UX Pattern

When creating data that requires backend processing (embeddings), use a delayed refresh pattern:

```typescript
// 1. Create data (returns immediately)
await dispatch(createTextNote(data));

// 2. Refresh immediately (shows "Processing..." badge)
dispatch(fetchDashboardData(userId));

// 3. Refresh after 3 seconds (shows "Indexed" badge after embedding completes)
setTimeout(() => {
  dispatch(fetchDashboardData(userId));
}, 3000);
```

**Why:** Cloud Functions need 2-3 seconds to generate embeddings. Without delayed refresh, UI always shows "Processing" until manual page refresh.

**Locations:**
- `components/dashboard/QuickThoughtInput.tsx` - Lines 38-47
- `components/dashboard/QuickVoiceRecorder.tsx` - Lines 103-108

## Development Commands

### Running the App

```bash
# Start development server (default: http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

### Environment Setup

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Fill in environment variables (see **Environment Variables** section below)

3. Install dependencies:
```bash
npm install
```

### Firebase Deployment

**Firestore Rules:**
```bash
firebase deploy --only firestore:rules
```

**Firestore Indexes:**
```bash
firebase deploy --only firestore:indexes
```

**Storage Rules:**
```bash
firebase deploy --only storage
```

**All Firebase:**
```bash
firebase deploy
```

**Note:** Cloud Functions are deployed from the mobile app repository: `PersonalAIApp/firebase/functions/`

### Admin Scripts

**Migrate users from PersonalAIApp to personal-ai-web:**
```bash
npm run migrate:users
# Requires: FIREBASE_PROJECT_ID_WEB, FIREBASE_PROJECT_ID_APP, GOOGLE_APPLICATION_CREDENTIALS
```

**Set admin role for a user:**
```bash
npm run set-admin -- --uid=<user_id>
# Example: npm run set-admin -- --uid=abc123xyz
```

### Vercel Deployment

This app is configured for Vercel deployment with automatic version display:

```bash
# Deploy to Vercel (manual)
vercel

# Deploy to production
vercel --prod
```

**Version Display:**
- Uses Vercel's `VERCEL_GIT_COMMIT_SHA` environment variable
- Shows in footer as "v0.1.0 (b3b7435)"
- Automatically updates on every deployment

## Environment Variables

All environment variables must be in `.env.local` file (never commit this file).

### Firebase (Client-Side - NEXT_PUBLIC_ prefix required)

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here
```

Get these from: Firebase Console → Project Settings → General

### Firebase Admin (Server-Side - no NEXT_PUBLIC_ prefix)

```bash
# EITHER: Service Account JSON (local development)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

# OR: Set GOOGLE_APPLICATION_CREDENTIALS path
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
```

Get service account: Firebase Console → Project Settings → Service Accounts → Generate New Private Key

### OpenAI API (Both Client and Server)

```bash
NEXT_PUBLIC_OPENAI_API_KEY=sk-your_openai_key_here
```

Get from: https://platform.openai.com/api-keys

**Security Note:** While this has `NEXT_PUBLIC_` prefix (client-accessible), API calls are made from server-side API routes in production. The prefix is for development convenience.

### Pinecone Vector Database (Both Client and Server)

```bash
NEXT_PUBLIC_PINECONE_API_KEY=your_pinecone_key_here
NEXT_PUBLIC_PINECONE_INDEX=personal-ai-data
NEXT_PUBLIC_PINECONE_ENVIRONMENT=us-east-1-aws
```

Get from: https://app.pinecone.io/

**Pinecone Index Requirements:**
- Dimensions: 1536 (for text-embedding-3-small)
- Metric: cosine
- Spec: serverless

### Google Maps API (Optional - for location features)

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key_here
```

Get from: Google Cloud Console → APIs & Services → Credentials

### App Configuration

```bash
NEXT_PUBLIC_APP_NAME=Personal AI
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Admin Configuration (Optional)

```bash
NEXT_PUBLIC_ADMIN_UIDS=uid1,uid2,uid3
```

Comma-separated list of Firebase UIDs that should have admin access.

## Project Structure

```
personal-ai-web/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group (no layout)
│   │   └── login/               # Login page
│   ├── (dashboard)/             # Dashboard route group (with nav)
│   │   ├── layout.tsx           # Dashboard layout with nav + footer
│   │   ├── dashboard/           # Main dashboard page
│   │   ├── chat/                # Chat interface page
│   │   ├── diary/               # Diary page
│   │   ├── search/              # Search page
│   │   └── settings/            # Settings page
│   ├── (admin)/                 # Admin route group
│   │   └── admin/               # Admin dashboard
│   │       ├── users/           # User management
│   │       └── usage/           # Usage analytics
│   ├── api/                     # API routes (server-side)
│   │   ├── admin/               # Admin API endpoints
│   │   │   ├── users/route.ts  # User list/management
│   │   │   └── usage/route.ts  # Usage statistics
│   │   ├── chat/route.ts        # RAG chat endpoint
│   │   ├── dashboard/route.ts   # Dashboard data endpoint
│   │   ├── diary/               # Diary CRUD endpoints
│   │   ├── photos/              # Photo upload endpoints
│   │   └── voice/               # Voice note endpoints
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page (redirects to /dashboard)
├── components/                   # React components
│   ├── auth/                    # AuthGuard, GoogleSignInButton
│   ├── common/                  # Footer, Header, etc.
│   ├── dashboard/               # Dashboard-specific components
│   │   ├── QuickThoughtInput.tsx     # Quick thought composer
│   │   ├── QuickVoiceRecorder.tsx    # Voice recording button
│   │   ├── RecentActivity.tsx        # Recent notes/photos
│   │   └── DataStatsCard.tsx         # Data statistics
│   └── chat/                    # Chat interface components
├── lib/                         # Business logic layer
│   ├── api/                     # External API clients
│   │   ├── firebase/            # Firebase services
│   │   │   ├── config.ts        # Firebase Web SDK init
│   │   │   ├── admin.ts         # Firebase Admin SDK init
│   │   │   ├── auth.ts          # Auth helper functions
│   │   │   ├── firestore.ts     # Firestore CRUD service
│   │   │   └── storage.ts       # Storage upload service
│   │   ├── openai/              # OpenAI API client
│   │   │   └── client.ts        # Chat, Embeddings, Whisper
│   │   ├── pinecone/            # Pinecone API client
│   │   │   └── client.ts        # Vector upsert/query
│   │   └── client.ts            # Base API client with auth
│   ├── services/                # Business logic services
│   │   ├── rag/                 # RAG engine
│   │   │   └── RAGEngine.server.ts  # Core RAG logic
│   │   ├── textNoteService.ts   # Text note CRUD + validation
│   │   ├── voiceRecorder.ts     # Voice recording service
│   │   ├── imageProcessor.ts    # Image resizing/optimization
│   │   ├── geolocation.ts       # Location services
│   │   └── usage/               # Usage tracking
│   ├── store/                   # Redux state management
│   │   ├── index.ts             # Store configuration + persist
│   │   ├── hooks.ts             # Typed useDispatch/useSelector
│   │   └── slices/              # Redux slices
│   │       ├── authSlice.ts     # Authentication state
│   │       ├── inputSlice.ts    # Input forms state
│   │       ├── dashboardSlice.ts # Dashboard data
│   │       ├── quickCreateSlice.ts # Quick thought creation
│   │       └── chatSlice.ts     # Chat messages
│   ├── middleware/              # API middleware
│   │   └── auth.ts              # requireAuth(), requireAdmin()
│   ├── models/                  # TypeScript interfaces
│   │   ├── User.ts              # User model
│   │   ├── TextNote.ts          # Text note model
│   │   ├── VoiceNote.ts         # Voice note model
│   │   ├── PhotoMemory.ts       # Photo model
│   │   └── ChatMessage.ts       # Chat message model
│   └── utils/                   # Utility functions
│       ├── validation.ts        # Input validation + sanitization
│       ├── version.ts           # Version utility
│       └── index.ts             # Utility exports
├── public/                      # Static assets
├── scripts/                     # Build/admin scripts
│   ├── generate-version.js      # Build-time version extraction
│   ├── migrate-users.ts         # User migration script
│   └── set-admin.ts             # Admin role assignment
├── firebase.json                # Firebase configuration
├── firestore.rules              # Firestore security rules
├── firestore.indexes.json       # Firestore indexes
├── storage.rules                # Storage security rules
├── next.config.ts               # Next.js configuration
├── tailwind.config.ts           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies + scripts
├── .env.example                 # Environment variables template
├── .env.local                   # Environment variables (git ignored)
└── CLAUDE.md                    # This file
```

## Critical Services and Files

### 1. Authentication Middleware (`lib/middleware/auth.ts`)

**Purpose:** Verify Firebase ID tokens in API routes

**Key Functions:**
- `verifyAuth(request)` - Extracts and verifies ID token, returns user object or error
- `requireAuth(request)` - Middleware for authenticated routes, returns `{ user, response }`
- `requireAdmin(request)` - Middleware for admin routes, checks for admin role

**Usage Pattern:**
```typescript
// API route example
export async function POST(request: NextRequest) {
  // Verify authentication
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse; // Return 401 if auth failed

  // Continue with authenticated user.uid
  const userId = user.uid;
  // ... your logic here
}
```

**Important:** API routes use Firebase Admin SDK (server-side), not Web SDK (client-side).

### 2. RAG Engine (`lib/services/rag/RAGEngine.server.ts`)

**Purpose:** Core RAG implementation for intelligent chatbot

**Query Flow:**
1. `generateEmbedding(userMessage)` → OpenAI API
2. `queryVectors(embedding, userId, topK=10)` → Pinecone (filtered by userId)
3. `buildContext(vectors)` → Format retrieved data for GPT
4. `chatCompletion(message, context)` → OpenAI GPT-4o
5. Return AI response + context references

**Key Methods:**
- `query(message, userId)` - Basic RAG query
- `queryWithHistory(message, userId, history)` - RAG with conversation context
- `queryByDataType(message, userId, dataType)` - Filter by health/location/voice/photo
- `queryByActivity(message, userId, activity)` - Filter by activity (e.g., "badminton")
- `analyzeQuery(message)` - Detect intent (count, average, comparison)

**Constants:**
- `RAG_TOP_K_RESULTS = 10` - Number of vectors to retrieve from Pinecone
- `RAG_CONTEXT_MAX_LENGTH = 8000` - Max context length for GPT-4o

**User Data Isolation:** All Pinecone queries include `userId` filter in metadata. This is CRITICAL for security.

### 3. Firestore Service (`lib/api/firebase/firestore.ts`)

**Purpose:** Abstraction layer for Firestore CRUD operations with Timestamp serialization

**Key Methods:**
- `getDocument(collection, docId)` - Get single document (serializes Timestamps)
- `getDocuments(collection, constraints)` - Query documents (serializes Timestamps)
- `setDocument(collection, docId, data)` - Create/update document
- `updateDocument(collection, docId, updates)` - Update document
- `deleteDocument(collection, docId)` - Delete document

**Specialized Methods:**
- `getUserData(userId)` - Get user profile
- `getTextNotes(userId, limit)` - Get text notes
- `getVoiceNotes(userId, limit)` - Get voice notes
- `getPhotoMemories(userId, limit)` - Get photos
- `getDataStats(userId)` - Get data counts for dashboard

**Timestamp Serialization:** Uses `serializeFirestoreData()` helper to convert Firestore Timestamps to ISO strings (lines 21-47).

### 4. Text Note Service (`lib/services/textNoteService.ts`)

**Purpose:** Business logic for text note (diary/thought) creation, validation, and auto-save

**Key Methods:**
- `createTextNote(note, userId)` - Create text note with validation + null filtering
- `updateTextNote(noteId, updates)` - Update text note
- `deleteTextNote(noteId)` - Delete text note
- `getUserTextNotes(userId, limit)` - Get user's text notes
- `saveDraftToLocalStorage(draft)` - Save draft (browser localStorage)
- `loadDraftFromLocalStorage()` - Load draft (expires after 7 days)
- `startAutoSave(getDraftData, interval)` - Start auto-save timer (default: 30s)
- `stopAutoSave()` - Stop auto-save timer

**Critical:** Filters out null location fields before saving to Firestore (lines 76-90) to prevent Pinecone errors.

### 5. OpenAI Client (`lib/api/openai/client.ts`)

**Purpose:** OpenAI API integration with usage tracking

**Key Methods:**
- `generateEmbedding(text, userId, endpoint)` - Generate text embedding (1536D)
- `chatCompletion(messages, context, options)` - GPT-4o chat completion
- `transcribeAudio(audioBlob, userId, endpoint)` - Whisper transcription

**Usage Tracking:** All methods track API usage in Firestore `usageEvents` collection for billing/analytics.

**Models:**
- Embeddings: `text-embedding-3-small` (1536 dimensions)
- Chat: `gpt-4o` (multimodal, fast)
- Transcription: `whisper-1`

### 6. Pinecone Client (`lib/api/pinecone/client.ts`)

**Purpose:** Pinecone vector database integration

**Key Methods:**
- `upsertVector(id, vector, metadata, userId, endpoint)` - Store vector
- `queryVectors(vector, userId, topK, filter, endpoint)` - Query similar vectors
- `queryVectorsByType(vector, userId, dataType, topK, endpoint)` - Filter by data type
- `queryLocationsByActivity(vector, userId, activity, topK, endpoint)` - Filter by activity
- `deleteVector(id)` - Delete vector

**Important:** All queries include `userId` filter in metadata. This prevents users from accessing other users' data.

### 7. Input Validation (`lib/utils/validation.ts`)

**Purpose:** Validate and sanitize user input to prevent XSS/injection attacks

**Key Functions:**
- `sanitizeText(text)` - Trim whitespace + prevent XSS
- `validateTextNote(note)` - Validate text note before saving
- `validateEmail(email)` - Email format validation
- `validatePhoneNumber(phone)` - Phone format validation

**Validation Rules:**
- Text notes: 10+ chars (except quick thoughts)
- Quick thoughts: no minimum length (Twitter-style)
- Title: 1-100 chars
- Tags: max 10 tags, each 1-30 chars

**Location:** Lines 32-45 show quick thought validation logic:
```typescript
if (note.type !== 'thought' && note.content.trim().length < APP_CONSTANTS.TEXT_NOTE_MIN_CONTENT_LENGTH) {
  errors.push(`Content must be at least ${APP_CONSTANTS.TEXT_NOTE_MIN_CONTENT_LENGTH} characters`);
}
```

## Common Workflows

### Adding a New Data Type

1. **Create TypeScript model** in `lib/models/YourDataType.ts`:
```typescript
export interface YourData {
  id: string;
  userId: string;
  content: string;
  createdAt: string; // ISO 8601
  embeddingId: string | null;
}
```

2. **Add Firestore methods** in `lib/api/firebase/firestore.ts`:
```typescript
async getYourData(userId: string, limit: number = 50): Promise<YourData[]> {
  return this.getDocuments('yourData', [
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    firestoreLimit(limit),
  ]);
}
```

3. **Add security rules** in `firestore.rules`:
```javascript
match /yourData/{dataId} {
  allow read: if resource.data.userId == request.auth.uid;
  allow create: if request.resource.data.userId == request.auth.uid;
  allow update: if resource.data.userId == request.auth.uid;
}
```

4. **Add Cloud Function trigger** in `PersonalAIApp/firebase/functions/src/index.ts`:
```typescript
export const onYourDataCreated = onDocumentCreated('yourData/{dataId}', async (event) => {
  // Generate embedding
  // Store in Pinecone
  // Update Firestore with embeddingId
});
```

5. **Update RAG context builder** in `lib/services/rag/RAGEngine.server.ts`:
```typescript
// Add handling for your data type in buildContext()
if (metadata.type === 'yourData') {
  return `[${index + 1}] Your Data: ${metadata.text}`;
}
```

### Debugging Embedding Generation

**Problem:** Text note created but `embeddingId` is null

**Steps:**
1. Check Cloud Function logs (mobile app repository):
```bash
cd PersonalAIApp/firebase/functions
firebase functions:log --only onTextNoteCreated
```

2. Look for errors in `embeddingError` field:
```typescript
const note = await FirestoreService.getTextNoteById(noteId);
console.log('Embedding error:', note.embeddingError);
```

3. Common errors:
   - **"Metadata value must be a string..."** → Null values in metadata (see section 6)
   - **"Invalid API key"** → Check Cloud Function environment variables
   - **"Quota exceeded"** → OpenAI rate limits or billing issue
   - **"Pinecone index not found"** → Wrong index name in Cloud Function config

4. Test embedding locally:
```typescript
// In browser console or Node.js script
const embedding = await OpenAIService.generateEmbedding('test text', userId, 'debug');
console.log('Embedding dimension:', embedding.length); // Should be 1536
```

5. Manually trigger Cloud Function (requires Firebase Admin):
```bash
cd PersonalAIApp/firebase/functions
npm run serve # Start emulator
# Then create a test document in Firestore
```

### Modifying RAG Context Format

The `buildContext()` method in `lib/services/rag/RAGEngine.server.ts` formats retrieved data for GPT-4o.

**Current format (lines 281-311):**
```
Relevant information from the user's personal data (10 items):

[1] (92.5% relevant) 📸 Photo: Beautiful sunset at Golden Gate Bridge on Jan 15, 2025
[2] (87.3% relevant) I played badminton at SF Badminton Club for 2 hours. Visit #15.
[3] (82.1% relevant) Voice Note: Reminder to buy groceries tomorrow.
...
```

**To modify:**
1. Edit `buildContext()` method
2. Change formatting for specific data types (photo, voice, location, health)
3. Adjust relevance score display (currently `(score * 100).toFixed(1)`)
4. Modify context length limit (currently 8000 chars)

**Example: Add timestamps to context:**
```typescript
const contextParts = sortedVectors.map((vector, index) => {
  const metadata = vector.metadata;
  const relevancePercent = (vector.score * 100).toFixed(1);
  const timestamp = new Date(metadata.createdAt).toLocaleString();

  return `[${index + 1}] (${relevancePercent}% relevant) [${timestamp}] ${metadata.text}`;
});
```

### Adding New API Route

1. **Create route file** in `app/api/yourEndpoint/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';

export const dynamic = 'force-dynamic'; // Disable static generation

export async function POST(request: NextRequest) {
  // Verify authentication
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;

  // Parse request body
  const body = await request.json();
  const { data } = body;

  // Your logic here
  const result = await yourService.process(data, user.uid);

  // Return response
  return NextResponse.json({ result });
}
```

2. **Add client-side API call** in `lib/store/slices/yourSlice.ts`:
```typescript
export const yourAction = createAsyncThunk(
  'your/action',
  async (params: YourParams, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/yourEndpoint', params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Request failed');
    }
  }
);
```

3. **Use in component**:
```typescript
import { useAppDispatch } from '@/lib/store/hooks';
import { yourAction } from '@/lib/store/slices/yourSlice';

function YourComponent() {
  const dispatch = useAppDispatch();

  const handleAction = async () => {
    await dispatch(yourAction({ data: 'test' }));
  };

  return <button onClick={handleAction}>Action</button>;
}
```

## Security Best Practices

### 1. Never Commit Secrets

**Files to NEVER commit:**
- `.env.local` - Contains API keys
- `serviceAccountKey.json` - Firebase Admin credentials
- Any file with API keys, passwords, tokens

**Check `.gitignore`:**
```
.env.local
.env*.local
serviceAccountKey.json
```

### 2. Environment Variable Naming

**Client-Side (exposed to browser):**
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...  # ✅ Correct
NEXT_PUBLIC_OPENAI_API_KEY=...    # ⚠️ Avoid if possible
```

**Server-Side (API routes only):**
```bash
FIREBASE_SERVICE_ACCOUNT_KEY=...  # ✅ Correct
DATABASE_URL=...                  # ✅ Correct
```

**Important:** Next.js only exposes variables with `NEXT_PUBLIC_` prefix to the browser. All other variables are server-only.

### 3. Firestore Security Rules

**Always enforce user ownership:**
```javascript
// ✅ Good: User can only access own data
allow read: if resource.data.userId == request.auth.uid;

// ❌ Bad: Anyone can read any data
allow read: if true;
```

**Allow Cloud Functions to update embeddings:**
```javascript
allow update: if resource.data.userId == request.auth.uid ||
  // Cloud Functions bypass auth, so this allows embedding updates
  request.resource.data.diff(resource.data).affectedKeys().hasOnly([
    'embeddingId', 'embeddingCreatedAt', 'embeddingError'
  ]);
```

### 4. Input Validation and Sanitization

**Always validate and sanitize user input:**
```typescript
import { sanitizeText, validateTextNote } from '@/lib/utils/validation';

// Sanitize before processing
const sanitized = {
  title: sanitizeText(input.title),
  content: sanitizeText(input.content),
};

// Validate before saving
const validation = validateTextNote(sanitized);
if (!validation.isValid) {
  throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
}
```

### 5. API Rate Limiting

**Currently not implemented.** Consider adding rate limiting for production:
- Use Vercel Edge Config or Upstash Redis
- Limit requests per user per minute/hour
- Return 429 status for exceeded limits

### 6. Usage Tracking

The app tracks OpenAI API usage in Firestore for billing/analytics:
```typescript
// Automatically tracked by OpenAIService
const embedding = await OpenAIService.generateEmbedding(text, userId, 'endpoint_name');
// Stores event in /usageEvents collection
```

**Important:** Set up billing alerts in OpenAI dashboard to avoid unexpected costs.

## Troubleshooting

### "Firebase auth not working"

**Symptoms:**
- Google Sign-In button doesn't work
- Redirects to error page
- Console error: "Firebase: Error (auth/...)"

**Solutions:**
1. Check Firebase config in `.env.local`:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
```

2. Verify authorized domains in Firebase Console:
   - Go to Firebase Console → Authentication → Settings → Authorized domains
   - Add `localhost` (development) and your production domain

3. Check Google OAuth configuration:
   - Firebase Console → Authentication → Sign-in method → Google
   - Enable Google Sign-In
   - Configure OAuth consent screen in Google Cloud Console

### "API returns 401 Unauthorized"

**Symptoms:**
- API routes return 401 even when logged in
- Console error: "ID token has expired"

**Causes:**
1. **Expired ID token** (tokens expire after 1 hour)
2. **Invalid Firebase Admin credentials**

**Solutions:**
1. **Refresh auth token** (user should sign out and sign back in):
```typescript
// In browser console
localStorage.clear();
window.location.reload();
```

2. **Check Firebase Admin SDK setup:**
```typescript
// lib/api/firebase/admin.ts should have valid credentials
const admin = initializeAdmin({
  credential: cert(serviceAccount),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
```

3. **Verify service account key:**
```bash
# Check if FIREBASE_SERVICE_ACCOUNT_KEY is set correctly
echo $FIREBASE_SERVICE_ACCOUNT_KEY | jq .project_id
# Should output your project ID
```

### "Embeddings not generating"

**Symptoms:**
- Text note created but `embeddingId` is null
- Dashboard shows "Processing..." forever

**Debugging steps:**

1. **Check Cloud Function logs** (mobile app repository):
```bash
cd PersonalAIApp/firebase/functions
firebase functions:log --only onTextNoteCreated
```

2. **Check Firestore document for errors:**
```typescript
const note = await FirestoreService.getTextNoteById(noteId);
console.log('Embedding error:', note.embeddingError);
console.log('Embedding error time:', note.embeddingErrorAt);
```

3. **Common errors:**

**Error: "Metadata value must be a string, number, boolean or list of strings, got 'null' for field 'address'"**
- **Cause:** Null values in Pinecone metadata
- **Fix:** Filter out null values (see section 6)
- **Locations:** Cloud Function `upsertToPinecone()` helper, `textNoteService.ts` lines 76-90

**Error: "Invalid API key"**
- **Cause:** Wrong OpenAI API key in Cloud Functions
- **Fix:** Update Cloud Function environment:
```bash
cd PersonalAIApp/firebase/functions
# Edit .env file
OPENAI_KEY=sk-your_actual_key_here
# Redeploy
npm run deploy
```

**Error: "Quota exceeded"**
- **Cause:** OpenAI rate limits or billing issue
- **Fix:** Check OpenAI dashboard for usage/billing

**Error: "Index not found"**
- **Cause:** Wrong Pinecone index name in Cloud Function
- **Fix:** Verify `PINECONE_INDEX` environment variable matches actual index name

### "Redux non-serializable value warning"

**Symptoms:**
```
A non-serializable value was detected in the state, in the path: `dashboard.recentVoiceNotes.0.createdAt`
```

**Cause:** Firestore Timestamp objects in Redux state

**Solution:** Already implemented in `lib/api/firebase/firestore.ts` (lines 21-47). If you still see this:

1. **Hard refresh to clear Redux Persist cache:**
```typescript
// In browser console
localStorage.removeItem('persist:root');
window.location.reload();
```

2. **Verify serialization is applied:**
```typescript
// Check that getDocument() and getDocuments() use serializeFirestoreData()
const data = docSnap.data();
return {
  id: docSnap.id,
  ...serializeFirestoreData(data) // ✅ Should be here
} as T;
```

### "Voice note 401 error"

**Symptoms:**
- Voice note recording fails with "Failed to load resource: the server responded with a status of 401"

**Cause:** Expired Firebase ID token (tokens expire after 1 hour)

**Solution:** User should sign out and sign back in to refresh token:
```typescript
// In UI, show a message:
"Your session has expired. Please sign out and sign back in."
```

**Prevention:** Implement token refresh logic (not yet implemented):
```typescript
// lib/api/firebase/auth.ts
export async function refreshAuthToken() {
  const currentUser = auth.currentUser;
  if (currentUser) {
    const newToken = await currentUser.getIdToken(true); // Force refresh
    return newToken;
  }
  return null;
}
```

### "Build fails on Vercel"

**Symptoms:**
- Vercel deployment fails during build
- Error: "Module not found" or "Type error"

**Common causes:**

1. **Missing environment variables:**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add all variables from `.env.example`

2. **TypeScript errors:**
```bash
# Run locally to see full error
npm run build
```

3. **Missing dependencies:**
```bash
# Check package.json and package-lock.json are committed
npm install
git add package-lock.json
git commit -m "Update dependencies"
```

4. **Next.js config issues:**
```typescript
// next.config.ts should export valid config
const nextConfig: NextConfig = {
  // ... your config
};
export default nextConfig;
```

## Performance Optimization

### Database Queries

**Firestore indexes** are required for compound queries (defined in `firestore.indexes.json`):
```json
{
  "indexes": [
    {
      "collectionGroup": "textNotes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**Deploy indexes:**
```bash
firebase deploy --only firestore:indexes
```

### API Cost Optimization

**Current costs per request:**
- Embedding generation: ~$0.0001 per text (text-embedding-3-small)
- Chat completion: ~$0.03 per 1K tokens (GPT-4o)
- Voice transcription: ~$0.006 per minute (Whisper)
- Pinecone: Free tier → $0.10 per 1M reads after limit

**Optimization strategies:**

1. **Cache embeddings** (not yet implemented):
   - Store frequently queried embeddings in Redis/memory
   - Reduce redundant OpenAI API calls

2. **Limit RAG context:**
   - Current: topK = 10 vectors per query
   - Adjust in `lib/services/rag/RAGEngine.server.ts` line 7

3. **Use cheaper models** (if quality acceptable):
   - GPT-4o-mini for simple queries (10x cheaper)
   - text-embedding-3-small instead of -large (already using)

4. **Batch operations:**
   - Batch embed multiple texts in single API call
   - Currently processing one at a time

### Next.js Performance

**Already optimized:**
- Server Components for static content
- Dynamic imports for heavy components
- Image optimization with next/image (not yet used)

**To improve:**
- Add loading skeletons for better perceived performance
- Implement pagination for long lists (currently fetches all)
- Use React.memo() for expensive components

## Development Best Practices

### Working with TypeScript

**Use strict mode** (already enabled in `tsconfig.json`):
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Define interfaces in `lib/models/`:**
```typescript
// lib/models/YourType.ts
export interface YourType {
  id: string;
  userId: string;
  data: string;
  createdAt: string; // ISO 8601
}
```

**Avoid `any` type:**
```typescript
// ❌ Bad
const data: any = { ... };

// ✅ Good
const data: YourType = { ... };
```

### Working with Next.js App Router

**Server vs Client Components:**
```typescript
// Server Component (default - no 'use client')
// - Can access backend directly
// - Cannot use useState, useEffect, event handlers
export default async function ServerComponent() {
  const data = await fetchFromDatabase();
  return <div>{data}</div>;
}

// Client Component (needs 'use client')
'use client';
export default function ClientComponent() {
  const [state, setState] = useState(0);
  return <button onClick={() => setState(s => s + 1)}>{state}</button>;
}
```

**Route Groups:**
- `(auth)` - Auth pages (no layout)
- `(dashboard)` - Dashboard pages (with nav layout)
- `(admin)` - Admin pages (with admin layout)

### Working with Redux

**Use typed hooks** from `lib/store/hooks.ts`:
```typescript
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';

// ✅ Good (typed)
const dispatch = useAppDispatch();
const user = useAppSelector((state) => state.auth.user);

// ❌ Bad (untyped)
import { useDispatch, useSelector } from 'react-redux';
```

**Create async thunks for API calls:**
```typescript
export const yourAction = createAsyncThunk(
  'slice/actionName',
  async (params: YourParams, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/endpoint', params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Request failed');
    }
  }
);
```

### Working with Firebase

**Client-Side (Web SDK):**
```typescript
import { auth, db, storage } from '@/lib/api/firebase/config';
// Use in browser/client components only
```

**Server-Side (Admin SDK):**
```typescript
import { getAdminAuth, getAdminFirestore } from '@/lib/api/firebase/admin';
// Use in API routes only
```

**Never mix Web and Admin SDKs** - they have different authentication contexts.

### Working with RAG

**Test queries before modifying RAGEngine:**
```typescript
// In browser console (after authentication)
const result = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
  },
  body: JSON.stringify({
    message: 'How many times did I play badminton?'
  })
});
const data = await result.json();
console.log('Response:', data.response);
console.log('Context used:', data.contextUsed);
```

**Important:**
- Context length is limited (8000 chars default)
- TopK controls quality vs. cost tradeoff (10 default)
- User data is isolated by `userId` filter in Pinecone queries

## References and Related Documentation

### Internal Documentation

- **Mobile App CLAUDE.md:** `/Users/lwang2/Documents/GitHub/ios/personal/PersonalAIApp/CLAUDE.md`
- **Cloud Functions:** `PersonalAIApp/firebase/functions/src/index.ts`
- **Firestore Rules:** `firestore.rules`
- **Environment Variables:** `.env.example`
- **Temporal Reasoning Feature:** `docs/features/TEMPORAL_REASONING.md` (comprehensive guide to time-based RAG queries)

### External Documentation

- **Next.js 16:** https://nextjs.org/docs
- **React 19:** https://react.dev/
- **Firebase:** https://firebase.google.com/docs
  - Auth: https://firebase.google.com/docs/auth
  - Firestore: https://firebase.google.com/docs/firestore
  - Cloud Functions: https://firebase.google.com/docs/functions
- **OpenAI:** https://platform.openai.com/docs
- **Pinecone:** https://docs.pinecone.io/
- **Redux Toolkit:** https://redux-toolkit.js.org/
- **Tailwind CSS:** https://tailwindcss.com/docs

### Key Differences from Mobile App

This web app has a **completely different architecture** than the React Native mobile app:

| Feature | Mobile App | Web App |
|---------|-----------|---------|
| Framework | React Native + Expo | Next.js 16 App Router |
| State | Redux + WatermelonDB (local SQLite) | Redux (auth only) + Firestore |
| Data Persistence | Local-first with cloud sync | Cloud-first (Firestore) |
| Authentication | Firebase Web SDK (client-side) | Web SDK (client) + Admin SDK (server) |
| API Routes | None (direct Firebase calls) | Next.js API routes with middleware |
| Cloud Functions | Same (shared backend) | Same (shared backend) |
| RAG Engine | Client-side | Server-side (API route) |

**Important:** Don't assume patterns from mobile app work in web app. Always check this CLAUDE.md first.

## Prompt Management Architecture

**IMPORTANT:** This section explains how AI prompts are managed across the system.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  PROMPT SOURCES (Priority Order)                                     │
├─────────────────────────────────────────────────────────────────────┤
│  1. Firestore (PRIMARY) - Edit via admin portal                      │
│  2. YAML Files (FALLBACK) - Frozen, do not modify                   │
│  3. Web Re-sync Button (DEPRECATED) - Uses hardcoded prompts        │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Points

1. **Firestore is the source of truth**
   - All prompt edits should happen via the admin portal: `/admin/prompts`
   - Cloud Functions read from Firestore first, then fall back to YAML

2. **YAML files are frozen fallbacks**
   - Located in: `PersonalAIApp/firebase/functions/src/config/prompts/locales/`
   - Do NOT modify these for new prompt changes
   - Only used if Firestore document doesn't exist

3. **Web "Re-sync" button is deprecated**
   - Located at: `app/api/admin/prompts/migrate/route.ts`
   - Uses hardcoded prompts in `getMobileServicePrompts()` function
   - **DO NOT use for new prompt changes** - hardcoded prompts are not maintained
   - Kept for backwards compatibility only

4. **CLI script for YAML migration**
   - Use when YAML files must be migrated to Firestore (rare)
   - Located: `PersonalAIApp/firebase/functions/scripts/migrate-prompts.ts`
   - Command: `npx tsx scripts/migrate-prompts.ts --overwrite`

### Claude Code Guidance

**When asked to change AI prompts:**

❌ **DO NOT:**
- Modify YAML files in `firebase/functions/src/config/prompts/`
- Update hardcoded prompts in `app/api/admin/prompts/migrate/route.ts`
- Tell users to use the web "Re-sync" button for new changes

✅ **DO:**
- Provide Firestore insert scripts for the admin to run
- Direct users to the admin portal for manual edits
- If YAML must change, also update the CLI migration script

**Example Firestore insert script:**
```typescript
// Run via Firebase Admin SDK or Cloud Shell
const db = admin.firestore();
await db.collection('prompts').doc('en_ServiceName').update({
  'prompts.new_prompt_id': {
    id: 'new-prompt-id',
    service: 'ServiceName',
    type: 'system',
    content: 'Your new prompt content...',
    metadata: { model: 'gpt-4o-mini', temperature: 0.7 }
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'claude-code'
});
```

## Version History

- **v0.2.0** (Dec 27, 2025) - Temporal Reasoning Feature
  - Added intelligent temporal query detection (yesterday, last week, etc.)
  - Integrated Firestore events collection with RAG queries
  - Explicit date display in context for GPT-4
  - Date-filtered Pinecone searches for time-bounded queries
  - Comprehensive documentation: `docs/features/TEMPORAL_REASONING.md`

- **v0.1.0** (Dec 26, 2025) - Initial CLAUDE.md creation
  - Comprehensive documentation of web app architecture
  - Key learnings from debugging session:
    - Pinecone null metadata filtering
    - Firestore Timestamp serialization with duck-typing
    - Auto-refresh UX pattern for async backend processes
    - Quick thought validation (no minimum length)
