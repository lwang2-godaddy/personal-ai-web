# Authentication

This document describes the authentication system in Personal AI Web.

## Overview

Personal AI Web uses Firebase Authentication with two SDK modes:

| Mode | SDK | Usage |
|------|-----|-------|
| Client-side | Firebase Web SDK | Login UI, auth state, token refresh |
| Server-side | Firebase Admin SDK | Token verification, user management |

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                   │
├─────────────────────────────────────────────────────────────────┤
│  1. User clicks "Sign in with Google"                           │
│  2. Firebase Web SDK initiates OAuth flow                       │
│  3. User authenticates with Google                              │
│  4. Firebase returns ID token (JWT)                              │
│  5. AuthProvider syncs state to Redux                           │
│  6. All API requests include: Authorization: Bearer <token>     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API ROUTE                                   │
├─────────────────────────────────────────────────────────────────┤
│  1. Extract token from Authorization header                      │
│  2. Verify token with Firebase Admin SDK                        │
│  3. Decode user info (uid, email, etc.)                         │
│  4. Fetch full user profile from Firestore                      │
│  5. Process request with user context                           │
└─────────────────────────────────────────────────────────────────┘
```

## Supported Auth Methods

### Google Sign-In

Primary authentication method using Firebase's Google provider.

```typescript
// Client-side (components/auth/AuthProvider.tsx)
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const googleProvider = new GoogleAuthProvider();
const result = await signInWithPopup(auth, googleProvider);
const user = result.user;
```

### Email/Password

Secondary method for users without Google accounts.

```typescript
// Sign up
import { createUserWithEmailAndPassword } from 'firebase/auth';
await createUserWithEmailAndPassword(auth, email, password);

// Sign in
import { signInWithEmailAndPassword } from 'firebase/auth';
await signInWithEmailAndPassword(auth, email, password);
```

## Client-Side Components

### AuthProvider

**File**: `components/AuthProvider.tsx`

Wraps the application and syncs Firebase auth state with Redux.

```typescript
'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/api/firebase/client';
import { useAppDispatch } from '@/lib/store/hooks';
import { setUser, clearUser } from '@/lib/store/slices/authSlice';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch full user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const userData = userDoc.exists() ? userDoc.data() : null;

        dispatch(setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          role: userData?.role || 'user',
          accountStatus: userData?.accountStatus || 'active',
          // ... other fields
        }));
      } else {
        dispatch(clearUser());
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  return children;
}
```

### AuthGuard

**File**: `components/auth/AuthGuard.tsx`

Protects routes that require authentication.

```typescript
'use client';

import { useAppSelector } from '@/lib/store/hooks';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAppSelector(state => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  return children;
}
```

### AdminGuard

**File**: `components/auth/AdminGuard.tsx`

Restricts routes to admin users only.

```typescript
'use client';

import { useAppSelector } from '@/lib/store/hooks';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAppSelector(state => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== 'admin') {
    return <LoadingSpinner />;
  }

  return children;
}
```

## Server-Side Middleware

### requireAuth

**File**: `lib/middleware/auth.ts`

Validates Firebase ID tokens and returns decoded user info.

```typescript
import { adminAuth } from '@/lib/api/firebase/admin';

interface AuthenticatedUser {
  uid: string;
  email: string | undefined;
  emailVerified: boolean;
}

export async function requireAuth(request: Request): Promise<AuthenticatedUser> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified || false,
    };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
```

### requireAdmin

**File**: `lib/middleware/auth.ts`

Extends requireAuth to check for admin role.

```typescript
import { adminDb } from '@/lib/api/firebase/admin';

export async function requireAdmin(request: Request): Promise<AuthenticatedUser> {
  const user = await requireAuth(request);

  const userDoc = await adminDb.collection('users').doc(user.uid).get();
  const userData = userDoc.data();

  if (!userData || userData.role !== 'admin') {
    throw new Error('Admin access required');
  }

  if (userData.accountStatus === 'suspended') {
    throw new Error('Account suspended');
  }

  return user;
}
```

## API Route Usage

### Protected User Route

```typescript
// app/api/text-notes/route.ts
import { requireAuth } from '@/lib/middleware/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    // Use user.uid for data access
    const notes = await getUserTextNotes(user.uid);

    return NextResponse.json({ notes });
  } catch (error) {
    if (error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Admin-Only Route

```typescript
// app/api/admin/users/route.ts
import { requireAdmin } from '@/lib/middleware/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);

    // Admin-only operation
    const users = await getAllUsers();

    return NextResponse.json({ users });
  } catch (error) {
    if (error.message.includes('Admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

## Token Management

### Client-Side Token Retrieval

Firebase automatically refreshes tokens. Get the current token for API calls:

```typescript
import { auth } from '@/lib/api/firebase/client';

async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }
  return user.getIdToken();
}

// Usage in API calls
const token = await getAuthToken();
const response = await fetch('/api/text-notes', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

### Token Expiration

- Firebase ID tokens expire after 1 hour
- Firebase SDK automatically refreshes tokens
- `getIdToken(true)` forces a refresh
- Server-side verification handles expired tokens gracefully

## Redux Auth State

### State Shape

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
```

### Persistence

Only the auth slice is persisted to localStorage:

```typescript
// lib/store/index.ts
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth'],  // Only persist auth
};
```

This means:
- User stays logged in across browser sessions
- Other data is fetched fresh on each session
- Logout clears persisted state

## Security Best Practices

### 1. Never Trust Client Data

Always verify tokens server-side:

```typescript
// WRONG - trusting client-provided userId
const { userId } = await request.json();
const notes = await getUserNotes(userId);

// CORRECT - using verified token
const user = await requireAuth(request);
const notes = await getUserNotes(user.uid);
```

### 2. Always Filter by userId

```typescript
// Firestore
const docs = await adminDb
  .collection('textNotes')
  .where('userId', '==', user.uid)  // ALWAYS filter
  .get();

// Pinecone
const results = await pinecone.query({
  filter: { userId: user.uid },      // ALWAYS filter
  // ...
});
```

### 3. Validate Ownership

For update/delete operations, verify the user owns the resource:

```typescript
const doc = await adminDb.collection('textNotes').doc(noteId).get();
if (doc.data()?.userId !== user.uid) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### 4. Admin Operations Audit Trail

Log admin actions:

```typescript
await adminDb.collection('adminLogs').add({
  adminUid: admin.uid,
  action: 'UPDATE_USER',
  targetUserId: userId,
  changes: updates,
  timestamp: new Date().toISOString(),
});
```

## Firebase Configuration

### Client SDK

**File**: `lib/api/firebase/client.ts`

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
```

### Admin SDK

**File**: `lib/api/firebase/admin.ts`

```typescript
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
);

const app = getApps().length === 0
  ? initializeApp({ credential: cert(serviceAccount) })
  : getApps()[0];

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
```

## Related Documentation

- [Architecture](../ARCHITECTURE.md) - System overview
- [API Reference](../API_REFERENCE.md) - Endpoint documentation
- [State Management](./STATE_MANAGEMENT.md) - Redux auth slice
