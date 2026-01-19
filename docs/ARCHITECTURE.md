# System Architecture

This document describes the high-level architecture of Personal AI Web.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Next.js App (React)                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Pages      │  │  Components  │  │ Redux Store  │  │  Services    │    │
│  │  (App Router)│  │  (60+ UI)    │  │  (8 slices)  │  │  (client)    │    │
│  └──────┬───────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    API Routes (/app/api/*)                            │   │
│  │   51+ endpoints: chat, data, circles, events, admin, users           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVER (API Routes)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Middleware  │  │  Services    │  │  Firebase    │  │  External    │    │
│  │  (Auth)      │  │  (server)    │  │  Admin SDK   │  │  APIs        │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
          ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
          │    Firebase     │ │     OpenAI      │ │    Pinecone     │
          │  (Firestore,    │ │  (GPT-4o,       │ │  (Vector DB,    │
          │   Auth, Storage)│ │   Embeddings,   │ │   1536D cosine) │
          │                 │ │   Whisper)      │ │                 │
          └─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16 | React framework with App Router |
| React | 19 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4 | Utility-first styling |
| Redux Toolkit | Latest | State management |
| Redux Persist | Latest | Auth state persistence |

### Backend (API Routes)

| Technology | Purpose |
|------------|---------|
| Next.js API Routes | Serverless functions |
| Firebase Admin SDK | Server-side Firestore/Auth |
| OpenAI SDK | Chat, embeddings, transcription |
| Pinecone Client | Vector database operations |

### External Services

| Service | Purpose |
|---------|---------|
| Firebase Auth | User authentication |
| Firebase Firestore | Document database |
| Firebase Storage | File storage (audio, images) |
| Firebase Cloud Functions | Embedding generation triggers |
| OpenAI GPT-4o | Chat completions |
| OpenAI Embeddings | Text-to-vector (1536D) |
| OpenAI Whisper | Audio transcription |
| OpenAI Vision | Image description |
| Pinecone | Vector similarity search |
| Google Maps | Distance Matrix API |
| Vercel | Hosting and deployment |

---

## Data Flow

### 1. User Authentication

```
Browser                    Firebase Auth              Firestore
   │                            │                        │
   │──── Google Sign-In ───────>│                        │
   │<─── ID Token ─────────────│                        │
   │                            │                        │
   │──── Fetch User Data ───────────────────────────────>│
   │<─── User Profile ──────────────────────────────────│
   │                            │                        │
   │──── Store in Redux ──────>│                        │
```

### 2. RAG Chat Query

```
Browser              API Route              OpenAI              Pinecone           Firestore
   │                    │                     │                    │                   │
   │── Send Message ───>│                     │                    │                   │
   │                    │── Generate ────────>│                    │                   │
   │                    │   Embedding         │                    │                   │
   │                    │<── Vector ─────────│                    │                   │
   │                    │                     │                    │                   │
   │                    │── Query ───────────────────────────────>│                   │
   │                    │   (filter: userId)  │                    │                   │
   │                    │<── Top 10 Vectors ────────────────────│                   │
   │                    │                     │                    │                   │
   │                    │── Fetch Full Docs ────────────────────────────────────────>│
   │                    │<── Documents ─────────────────────────────────────────────│
   │                    │                     │                    │                   │
   │                    │── Build Context ───>│                    │                   │
   │                    │   + GPT-4o Chat     │                    │                   │
   │                    │<── Response ───────│                    │                   │
   │                    │                     │                    │                   │
   │<── AI Response ────│                     │                    │                   │
   │    + Sources       │                     │                    │                   │
```

### 3. Data Creation (Voice Note Example)

```
Browser              API Route              Firebase Storage       Firestore        Cloud Function
   │                    │                        │                    │                   │
   │── Upload Audio ───>│                        │                    │                   │
   │                    │── Upload File ────────>│                    │                   │
   │                    │<── Storage URL ───────│                    │                   │
   │                    │                        │                    │                   │
   │                    │── Transcribe ─────────────────────────────────────────────────>│
   │                    │   (OpenAI Whisper)     │                    │                   │
   │                    │<── Transcription ──────────────────────────────────────────────│
   │                    │                        │                    │                   │
   │                    │── Create Document ─────────────────────────>│                   │
   │                    │<── Document ID ────────────────────────────│                   │
   │                    │                        │                    │                   │
   │<── Success ────────│                        │                    │                   │
   │                    │                        │                    │                   │
   │                    │                        │                    │── Trigger ───────>│
   │                    │                        │                    │   (onVoiceNoteCreated)
   │                    │                        │                    │                   │
   │                    │                        │                    │   Generate Embedding
   │                    │                        │                    │   Store in Pinecone
   │                    │                        │                    │   Update embeddingId
```

---

## Next.js Execution Model

### Server Components vs Client Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER COMPONENTS                          │
│  (Default in App Router)                                        │
├─────────────────────────────────────────────────────────────────┤
│  • Page layouts and routes                                      │
│  • Data fetching from Firestore                                 │
│  • API route handlers                                           │
│  • Server actions                                               │
│  • Access to server-only code (Firebase Admin SDK)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT COMPONENTS                          │
│  (Marked with 'use client')                                     │
├─────────────────────────────────────────────────────────────────┤
│  • Interactive UI components                                    │
│  • React hooks (useState, useEffect, etc.)                      │
│  • Redux hooks (useAppDispatch, useAppSelector)                 │
│  • Browser APIs (MediaRecorder, Geolocation)                    │
│  • Event handlers (onClick, onChange, etc.)                     │
└─────────────────────────────────────────────────────────────────┘
```

### API Routes

API routes in Next.js 16 use the App Router convention:

```
app/api/
├── chat/
│   └── route.ts          # POST /api/chat
├── text-notes/
│   ├── route.ts          # GET, POST /api/text-notes
│   └── [noteId]/
│       └── route.ts      # GET, PATCH, DELETE /api/text-notes/[noteId]
└── admin/
    └── users/
        └── route.ts      # GET /api/admin/users (admin only)
```

Each route exports handlers:

```typescript
// Server-side only, runs in Node.js
export async function GET(request: Request) { ... }
export async function POST(request: Request) { ... }
export async function PATCH(request: Request) { ... }
export async function DELETE(request: Request) { ... }
```

---

## Security Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT                                    │
├─────────────────────────────────────────────────────────────────┤
│  1. User signs in via Firebase Auth (Google or Email)           │
│  2. Firebase returns ID token (JWT)                              │
│  3. Token stored in Firebase SDK (auto-refreshed)               │
│  4. All API requests include Authorization: Bearer <token>      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API MIDDLEWARE                               │
├─────────────────────────────────────────────────────────────────┤
│  requireAuth():                                                  │
│    1. Extract token from Authorization header                    │
│    2. Verify token with Firebase Admin SDK                       │
│    3. Return decoded user (uid, email, etc.)                     │
│    4. Reject with 401 if invalid/expired                        │
│                                                                  │
│  requireAdmin():                                                 │
│    1. Call requireAuth() first                                   │
│    2. Fetch user document from Firestore                         │
│    3. Check role === 'admin'                                     │
│    4. Reject with 403 if not admin                              │
└─────────────────────────────────────────────────────────────────┘
```

### Data Isolation

**Critical Security Pattern**: All user data is isolated by `userId`

```typescript
// Firestore Query - ALWAYS filter by userId
const docs = await firestore
  .collection('textNotes')
  .where('userId', '==', userId)  // MANDATORY
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get();

// Pinecone Query - ALWAYS filter by userId in metadata
const results = await pinecone.query({
  vector: embedding,
  filter: { userId: userId },  // MANDATORY
  topK: 10,
});
```

**Firestore Security Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /textNotes/{noteId} {
      allow read, write: if request.auth != null
        && resource.data.userId == request.auth.uid;
    }
    // Similar rules for all collections...
  }
}
```

---

## Redux Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        REDUX STORE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   auth   │  │   chat   │  │dashboard │  │  events  │        │
│  │ (persist)│  │          │  │          │  │          │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ circles  │  │  input   │  │quickCreate│ │  toast   │        │
│  │          │  │          │  │          │  │          │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Persistence Strategy**:
- Only `auth` slice is persisted to localStorage
- All other data is fetched from Firestore on demand
- This ensures data freshness and reduces storage

---

## Embedding Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA CREATION SOURCES                         │
├─────────────────────────────────────────────────────────────────┤
│  Mobile App          Web Dashboard           External Import     │
│  (HealthKit,         (Text Notes,            (Future)           │
│   Location,           Voice Notes,                              │
│   Voice)              Photos)                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FIRESTORE                                   │
│            (textNotes, voiceNotes, photoMemories, etc.)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Trigger (onDocumentCreated)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CLOUD FUNCTIONS                                │
├─────────────────────────────────────────────────────────────────┤
│  1. Receive document data                                        │
│  2. Generate text representation                                 │
│     - Voice: Use transcription                                   │
│     - Photo: Use auto/user description + metadata               │
│     - Health: "On [date], I had [value] [unit] of [type]"       │
│  3. Call OpenAI text-embedding-3-small                          │
│  4. Store vector in Pinecone with metadata:                     │
│     { userId, type, date, activity, ... }                       │
│  5. Update Firestore document with embeddingId                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PINECONE                                    │
│           (1536 dimensions, cosine similarity)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Scalability Considerations

### Current Architecture Limits

| Component | Current Limit | Notes |
|-----------|---------------|-------|
| Pinecone | 100K vectors (free tier) | ~10K entries per user for 10 users |
| Firestore | 1M reads/day (free tier) | Sufficient for development |
| OpenAI | $100/month (typical) | Rate limits apply |
| Vercel | 100GB bandwidth | Sufficient for small user base |

### Future Scaling Options

1. **Pinecone**: Upgrade to paid tier for unlimited vectors
2. **Firestore**: Enable Firestore caching, optimize queries
3. **OpenAI**: Implement caching for frequent queries
4. **CDN**: Use Vercel Edge for static assets
5. **Database**: Consider read replicas for high traffic

---

## Key Architectural Decisions

### 1. Next.js App Router

**Decision**: Use App Router instead of Pages Router

**Rationale**:
- Server Components reduce client bundle size
- Built-in layouts and nested routes
- Streaming and Suspense support
- Future-proof with React 19

### 2. Redux for State Management

**Decision**: Use Redux Toolkit with minimal persistence

**Rationale**:
- Familiar pattern, great DevTools
- Only persist auth state
- Fetch data on demand for freshness
- TypeScript support via typed hooks

### 3. Firebase Admin SDK in API Routes

**Decision**: Use Firebase Admin SDK server-side only

**Rationale**:
- No client-side credentials exposed
- Server-side security rule enforcement
- Centralized token validation
- Access to admin operations (user management)

### 4. Pinecone for Vector Search

**Decision**: Use Pinecone serverless instead of pgvector

**Rationale**:
- No database management overhead
- Built-in metadata filtering
- Cosine similarity optimized
- Pay-per-query pricing

### 5. Cloud Functions for Embedding Generation

**Decision**: Generate embeddings asynchronously via triggers

**Rationale**:
- User doesn't wait for embedding generation
- Automatic retry on failure
- Consistent processing across mobile and web
- Can batch process large uploads

---

## Related Documentation

- [API Reference](./API_REFERENCE.md) - Detailed endpoint documentation
- [Database Schema](./DATABASE_SCHEMA.md) - Firestore collections
- [Services](./SERVICES.md) - Business logic implementation
- [Authentication](./infrastructure/AUTHENTICATION.md) - Auth details
- [State Management](./infrastructure/STATE_MANAGEMENT.md) - Redux details
