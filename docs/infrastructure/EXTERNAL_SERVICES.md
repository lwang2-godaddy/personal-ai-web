# External Services

This document describes the external service integrations in Personal AI Web.

## Overview

Personal AI Web integrates with several external services:

| Service | Purpose | SDK/API |
|---------|---------|---------|
| Firebase Auth | Authentication | Firebase Web SDK, Admin SDK |
| Firebase Firestore | Document database | Firebase Web SDK, Admin SDK |
| Firebase Storage | File storage | Firebase Web SDK |
| OpenAI | AI capabilities | OpenAI Node.js SDK |
| Pinecone | Vector database | Pinecone Node.js SDK |
| Google Maps | Distance calculations | REST API |

---

## Firebase

### Configuration Files

**Client SDK**: `lib/api/firebase/client.ts`

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

**Admin SDK**: `lib/api/firebase/admin.ts`

```typescript
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let app: App;

if (getApps().length === 0) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
  );
  app = initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
} else {
  app = getApps()[0];
}

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminStorage = getStorage(app);
```

### Firebase Auth

**Usage**: User authentication (Google, Email/Password)

**Client-side**:
```typescript
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/api/firebase/client';

const provider = new GoogleAuthProvider();
const result = await signInWithPopup(auth, provider);
```

**Server-side (token verification)**:
```typescript
import { adminAuth } from '@/lib/api/firebase/admin';

const decodedToken = await adminAuth.verifyIdToken(token);
const userId = decodedToken.uid;
```

### Firebase Firestore

**Usage**: Primary document database

**Client-side** (limited to auth state):
```typescript
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/api/firebase/client';

const userDoc = await getDoc(doc(db, 'users', userId));
```

**Server-side** (all data operations):
```typescript
import { adminDb } from '@/lib/api/firebase/admin';

// Query with userId filter
const snapshot = await adminDb
  .collection('textNotes')
  .where('userId', '==', userId)
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get();

// Create document
const docRef = await adminDb.collection('textNotes').add({
  userId,
  content,
  createdAt: new Date().toISOString(),
});
```

### Firebase Storage

**Usage**: Audio files (voice notes), images (photos)

**Upload flow**:
```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/api/firebase/client';

// Upload file
const storageRef = ref(storage, `voice-notes/${userId}/${Date.now()}.mp4`);
await uploadBytes(storageRef, audioBlob);

// Get download URL
const url = await getDownloadURL(storageRef);
```

**File organization**:
```
voice-notes/
  {userId}/
    {timestamp}.mp4
photos/
  {userId}/
    original/{timestamp}.jpg
    medium/{timestamp}.jpg
    thumbnail/{timestamp}.jpg
```

---

## OpenAI

### Configuration

**File**: `lib/api/openai/client.ts`

```typescript
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});
```

### Services & Models

| Service | Model | Purpose |
|---------|-------|---------|
| Chat Completions | gpt-4o | RAG responses, event extraction |
| Embeddings | text-embedding-3-small | Vector generation (1536D) |
| Transcription | whisper-1 | Audio transcription |
| Vision | gpt-4o | Image description |
| TTS | tts-1 | Text-to-speech (mobile) |

### Usage Examples

**Chat Completion**:
```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ],
  temperature: 0.7,
  max_tokens: 1000,
});

const answer = response.choices[0].message.content;
```

**Embeddings**:
```typescript
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: text,
});

const vector = response.data[0].embedding; // number[1536]
```

**Transcription**:
```typescript
const response = await openai.audio.transcriptions.create({
  model: 'whisper-1',
  file: audioFile,
  language: 'en',
});

const transcription = response.text;
```

**Vision (Image Description)**:
```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Describe this image in 2-3 sentences.' },
        { type: 'image_url', image_url: { url: imageUrl } },
      ],
    },
  ],
  max_tokens: 300,
});

const description = response.choices[0].message.content;
```

### Pricing (Jan 2025)

| Model | Price |
|-------|-------|
| GPT-4o (input) | $2.50 / 1M tokens |
| GPT-4o (output) | $10.00 / 1M tokens |
| text-embedding-3-small | $0.02 / 1M tokens |
| Whisper | $0.006 / minute |

### Billing API

For admin billing dashboard:

```typescript
// Requires organization API key (not project key)
const OPENAI_ORG_API_KEY = process.env.OPENAI_ORG_API_KEY;

// Costs API (preferred)
const response = await fetch(
  `https://api.openai.com/v1/organization/costs?start_time=${startTime}&end_time=${endTime}`,
  {
    headers: {
      Authorization: `Bearer ${OPENAI_ORG_API_KEY}`,
    },
  }
);

// Usage API (fallback)
const response = await fetch(
  `https://api.openai.com/v1/organization/usage/completions?start_time=${startTime}&end_time=${endTime}`,
  {
    headers: {
      Authorization: `Bearer ${OPENAI_ORG_API_KEY}`,
    },
  }
);
```

---

## Pinecone

### Configuration

**File**: `lib/api/pinecone/client.ts`

```typescript
import { Pinecone } from '@pinecone-database/pinecone';

export const pinecone = new Pinecone({
  apiKey: process.env.NEXT_PUBLIC_PINECONE_API_KEY!,
});

export const index = pinecone.index(
  process.env.NEXT_PUBLIC_PINECONE_INDEX || 'personal-ai-data'
);
```

### Index Configuration

| Setting | Value |
|---------|-------|
| Index Name | personal-ai-data |
| Dimensions | 1536 |
| Metric | cosine |
| Spec | serverless |
| Region | us-east-1-aws |

### Operations

**Query (Vector Search)**:
```typescript
const results = await index.query({
  vector: queryVector,
  topK: 10,
  filter: { userId: userId }, // CRITICAL: Always filter by userId
  includeMetadata: true,
});

// Results
results.matches.forEach(match => {
  console.log(match.id, match.score, match.metadata);
});
```

**Upsert (Store Vector)**:
```typescript
await index.upsert([
  {
    id: documentId,
    values: vector, // number[1536]
    metadata: {
      userId, // CRITICAL: Required for filtering
      type: 'text',
      date: '2025-01-15',
      content: text.substring(0, 1000),
    },
  },
]);
```

**Delete**:
```typescript
// Delete by ID
await index.deleteOne(documentId);

// Delete by filter
await index.deleteMany({
  filter: { userId: userId },
});
```

### Metadata Constraints

**CRITICAL**: Pinecone metadata cannot contain null values.

```typescript
// Filter null values before upserting
const cleanMetadata: Record<string, any> = {};
for (const [key, value] of Object.entries(metadata)) {
  if (value !== null && value !== undefined) {
    cleanMetadata[key] = value;
  }
}

await index.upsert([{
  id,
  values: vector,
  metadata: cleanMetadata,
}]);
```

### Pricing (Serverless)

| Operation | Price |
|-----------|-------|
| Read units | $0.10 / 1M |
| Write units | $1.00 / 1M |
| Storage | $0.10 / GB / month |

### Billing API

```typescript
// Get index stats
const response = await fetch(
  `https://api.pinecone.io/indexes/${indexName}`,
  {
    headers: {
      'Api-Key': PINECONE_API_KEY,
    },
  }
);

// Describe index stats
const stats = await index.describeIndexStats();
// { namespaces: {}, dimension: 1536, indexFullness: 0, totalRecordCount: 5000 }
```

---

## Google Maps

### Configuration

```typescript
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
```

### Distance Matrix API

**Usage**: Calculate travel time between events for conflict detection.

```typescript
const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
url.searchParams.set('origins', origin);
url.searchParams.set('destinations', destination);
url.searchParams.set('mode', mode); // driving, walking, transit, bicycling
url.searchParams.set('departure_time', departureTime.getTime().toString());
url.searchParams.set('key', GOOGLE_MAPS_API_KEY);

const response = await fetch(url);
const data = await response.json();

const duration = data.rows[0].elements[0].duration.value; // seconds
const distance = data.rows[0].elements[0].distance.value; // meters
```

### Caching Strategy

```typescript
// Cache key includes hour for traffic awareness
const cacheKey = `${origin}|${destination}|${mode}|${departureHour}`;

// 7-day cache TTL
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

// Max 1000 cached entries (LRU eviction)
const MAX_CACHE_SIZE = 1000;
```

### Fallback

When API key is missing or request fails:
```typescript
const DEFAULT_TRAVEL_BUFFER = 30 * 60; // 30 minutes in seconds
return { duration: DEFAULT_TRAVEL_BUFFER, distance: 0 };
```

---

## OpenStreetMap (Nominatim)

### Usage

Free reverse geocoding for location services.

```typescript
const url = `https://nominatim.openstreetmap.org/reverse?` +
  `lat=${latitude}&lon=${longitude}&format=json`;

const response = await fetch(url, {
  headers: {
    'User-Agent': 'PersonalAI/1.0',
  },
});

const data = await response.json();
const address = data.display_name;
// "123 Main St, San Francisco, CA 94102, USA"
```

### Rate Limits

- 1 request per second
- No API key required
- Must include User-Agent header

---

## Environment Variables

### Required (All Features)

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin (server-side)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# OpenAI
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-...

# Pinecone
NEXT_PUBLIC_PINECONE_API_KEY=...
NEXT_PUBLIC_PINECONE_INDEX=personal-ai-data
NEXT_PUBLIC_PINECONE_ENVIRONMENT=us-east-1-aws
```

### Optional

```bash
# OpenAI Billing API (admin dashboard)
OPENAI_ORG_API_KEY=sk-admin-...

# Google Maps (conflict detection)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

---

## Error Handling

### Firebase Errors

```typescript
try {
  await adminAuth.verifyIdToken(token);
} catch (error) {
  if (error.code === 'auth/id-token-expired') {
    // Token expired, client should refresh
  } else if (error.code === 'auth/id-token-revoked') {
    // Token revoked, user should re-authenticate
  }
}
```

### OpenAI Errors

```typescript
try {
  await openai.chat.completions.create({ ... });
} catch (error) {
  if (error.status === 429) {
    // Rate limited, implement backoff
  } else if (error.status === 401) {
    // Invalid API key
  } else if (error.status === 500) {
    // OpenAI server error, retry
  }
}
```

### Pinecone Errors

```typescript
try {
  await index.query({ ... });
} catch (error) {
  if (error.message.includes('metadata')) {
    // Invalid metadata (likely null values)
  } else if (error.message.includes('dimension')) {
    // Wrong vector dimensions
  }
}
```

---

## Cost Tracking

All API operations are tracked in Firestore `promptExecutions` collection:

```typescript
interface UsageEvent {
  userId: string;
  timestamp: string;
  operation: 'embedding' | 'chat_completion' | 'transcription' | ...;
  provider: 'openai' | 'pinecone';
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  audioDurationSeconds?: number;
  vectorCount?: number;
  estimatedCostUSD: number;
  endpoint: string;
}
```

See [Services - UsageTracker](../SERVICES.md#usagetracker) for implementation details.

---

## Related Documentation

- [Architecture](../ARCHITECTURE.md) - System overview
- [Services](../SERVICES.md) - Business logic
- [API Reference](../API_REFERENCE.md) - Endpoint documentation
