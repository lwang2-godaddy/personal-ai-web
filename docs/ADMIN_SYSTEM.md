# Admin System Documentation

## Overview

The Personal AI Web application includes a comprehensive role-based admin system that allows administrators to monitor system usage, manage users, track API costs, and configure user limits.

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Setup & Installation](#setup--installation)
4. [User Migration](#user-migration)
5. [Admin Routes](#admin-routes)
6. [API Endpoints](#api-endpoints)
7. [Security Model](#security-model)
8. [Usage Tracking](#usage-tracking)
9. [Cost Calculation](#cost-calculation)
10. [Troubleshooting](#troubleshooting)

---

## Features

### Admin Dashboard
- **System Statistics**: View total users, active users, suspended accounts, and monthly costs
- **Quick Actions**: Navigate to user management and usage analytics
- **Real-time Data**: Statistics update automatically from Firestore

### User Management
- **User List**: Searchable, paginated table of all users
- **User Search**: Filter users by email or display name
- **Account Control**: Suspend/activate user accounts inline
- **Subscription Management**: Change user subscription tiers (Free/Premium/Pro)
- **Custom Limits**: Set per-user usage limits that override tier defaults
- **User Details**: View comprehensive user profiles with usage history

### Usage Analytics
- **Cost Tracking**: Monitor API costs across OpenAI and Pinecone
- **Usage Metrics**: Track tokens, API calls, and vector operations
- **Time-Series Data**: Daily and monthly usage trends
- **Operation Breakdown**: See which operations cost the most
- **Top Users Report**: Identify highest-cost users
- **Data Export**: Export usage data to CSV

### Visual Analytics
- **Pie Charts**: Cost distribution by operation type
- **Line Charts**: Daily/monthly usage trends
- **Bar Charts**: Top users by cost comparison
- **Dual-Axis Charts**: Compare cost and API calls simultaneously

---

## Architecture

### Tech Stack
- **Frontend**: React 19, Next.js 16 (App Router), TypeScript
- **Backend**: Next.js API Routes, Firebase Admin SDK
- **Database**: Cloud Firestore
- **Authentication**: Firebase Auth
- **Charts**: Recharts library
- **Styling**: Tailwind CSS

### Key Components

#### Client-Side
```
app/(admin)/
├── layout.tsx                    # Admin layout with navigation
├── admin/
│   ├── page.tsx                  # Dashboard overview
│   ├── users/
│   │   ├── page.tsx              # User list
│   │   └── [userId]/page.tsx    # User detail
│   └── usage/
│       └── page.tsx              # Usage analytics
components/admin/
└── AdminGuard.tsx                # Route protection component
```

#### Server-Side
```
app/api/admin/
├── stats/route.ts                # Dashboard statistics
├── users/
│   ├── route.ts                  # List users
│   └── [userId]/route.ts        # User detail/update
└── usage/
    ├── route.ts                  # System usage
    └── [userId]/route.ts        # Per-user usage
```

#### Services & Middleware
```
lib/
├── middleware/auth.ts            # Authentication middleware
├── services/usage/
│   └── UsageTracker.ts          # Usage tracking service
├── api/firebase/admin.ts         # Firebase Admin SDK
├── hooks/useAuth.ts              # Auth hook with admin check
└── api/client.ts                 # API client with auth headers
```

---

## Setup & Installation

### Prerequisites
- Node.js 18+ and npm
- Firebase project with Firestore and Authentication enabled
- Firebase Admin SDK service account (for production)
- OpenAI API key
- Pinecone API key

### Environment Variables

Create or update `.env.local`:

```bash
# Firebase Client (existing)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Firebase Admin SDK (NEW - production only)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# API Keys (existing)
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX=personal-ai-data
```

### Development Setup

For local development, you can use Application Default Credentials instead of a service account:

```bash
# Install Google Cloud SDK
brew install google-cloud-sdk

# Authenticate
gcloud auth application-default login

# Set project
gcloud config set project YOUR_PROJECT_ID
```

### Production Setup (Vercel)

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add `FIREBASE_SERVICE_ACCOUNT_KEY` with your service account JSON as the value
4. Redeploy your application

### Install Dependencies

```bash
npm install
```

New dependencies added:
- `firebase-admin@12.7.0` - Firebase Admin SDK for server-side operations
- `recharts@3.6.0` - Data visualization library
- `dotenv` - Environment variable loading for scripts
- `tsx@4.19.2` - TypeScript execution for scripts

### Deploy Firestore Rules and Indexes

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

---

## User Migration

### Initial Setup

After deploying the admin system, you must migrate existing users and set up your first admin.

### Migration Commands

All commands are run via npm:

```bash
# 1. Migrate all existing users (adds role and accountStatus fields)
npm run migrate:users migrate

# 2. Set yourself as admin (use your email)
npm run migrate:users set-admin your-email@example.com

# 3. List all admins (verify)
npm run migrate:users list-admins

# 4. Remove admin role (if needed)
npm run migrate:users remove-admin user@example.com

# 5. Show help
npm run migrate:users help
```

### Migration Script Details

**Location**: `scripts/migrate-users.ts`

**What `migrate` does**:
- Scans all documents in the `users` collection
- Adds `role: 'user'` to users without a role field
- Adds `accountStatus: 'active'` to users without status
- Uses batch writes for efficiency (500 users per batch)
- Does not modify users that already have these fields

**What `set-admin` does**:
- Finds user by email
- Updates `role` field to `'admin'`
- Displays user information for verification

**Authentication**:
- Uses `FIREBASE_SERVICE_ACCOUNT_KEY` if available (production)
- Falls back to Application Default Credentials (development)

### Example Migration Flow

```bash
# Step 1: Run migration on all users
$ npm run migrate:users migrate

=== Personal AI Web - User Migration Script ===

Starting user migration...

Fetching all users...
Found 42 users

Found 42 users that need migration

✓ Migrated 42/42 users

✓ Migration completed successfully!
  Total users migrated: 42
  Default role: user
  Default account status: active

# Step 2: Set your email as admin
$ npm run migrate:users set-admin john@example.com

=== Personal AI Web - User Migration Script ===

Setting admin role for user: john@example.com

Searching for user...
Found user: John Doe (john@example.com)
Current role: user

✓ User successfully promoted to admin!
  User ID: abc123xyz
  Email: john@example.com
  Display Name: John Doe
  New Role: admin

# Step 3: Verify admin list
$ npm run migrate:users list-admins

=== Personal AI Web - User Migration Script ===

Fetching all admin users...

Found 1 admin user(s):

1. John Doe
   Email: john@example.com
   User ID: abc123xyz
   Account Status: active
   Created: 12/15/2024
```

---

## Admin Routes

### Accessing the Admin Panel

1. Navigate to `/admin` in your browser
2. If not logged in, you'll be redirected to `/login`
3. If logged in but not an admin, you'll be redirected to `/dashboard`
4. If you're an admin, you'll see the admin dashboard

### Route Structure

#### `/admin` - Dashboard Overview
- **Statistics Cards**: Total users, active users, suspended users, monthly cost
- **Quick Action Cards**: Links to user management and usage analytics
- **Features**:
  - Real-time statistics from Firestore
  - Visual indicators with emojis
  - Color-coded metrics (blue, green, red, purple)

#### `/admin/users` - User Management
- **Features**:
  - Search bar (filter by email or display name)
  - Paginated user table (50 users per page)
  - Role badges (admin/user)
  - Status badges (active/suspended)
  - Subscription tier badges (free/premium/pro)
  - Inline actions (View, Suspend/Activate)
- **Actions**:
  - Click "View" to see user details
  - Click "Suspend" to deactivate account
  - Click "Activate" to reactivate suspended account
  - Use search to filter users
  - Navigate pages with Previous/Next buttons

#### `/admin/users/[userId]` - User Detail
- **User Information**:
  - User ID, email, display name
  - Role badge
  - Created date, last login date
- **Account Status Control**:
  - Current status indicator
  - Suspend/Activate button with confirmation
- **Subscription Management**:
  - Dropdown selector (Free/Premium/Pro)
  - Update button to change tier
- **Custom Limits**:
  - Max tokens per day
  - Max API calls per day
  - Max cost per month ($)
  - Update button to save limits
  - Clear button to remove custom limits
- **Current Month Usage**:
  - Total cost, API calls, tokens
  - Color-coded cards
- **Usage Breakdown**:
  - Pie chart of cost distribution
  - Table with operation counts and costs
- **Daily Usage Chart** (Last 30 Days):
  - Line chart with dual Y-axes
  - Cost and API calls over time
- **Monthly Usage Chart** (Last 12 Months):
  - Bar chart showing cost and API calls
  - Historical trend analysis

#### `/admin/usage` - Usage Analytics
- **Date Range Controls**:
  - Quick presets (Last 7/30/90 Days)
  - Custom start/end date pickers
  - Group by day or month
  - Export to CSV button
- **Summary Cards**:
  - Total cost, total API calls, total tokens
  - Date range indicator
- **Cost Breakdown**:
  - Pie chart by operation type
  - Table with percentages
- **Usage Trend Chart**:
  - Line chart over selected date range
  - Dual Y-axes for cost and API calls
- **Top 10 Users**:
  - Horizontal bar chart
  - Users sorted by total cost

### Navigation

The admin layout includes a red-themed navigation bar with:
- **Logo**: ⚙️ Admin Panel
- **Nav Links**: Overview, Users, Usage Analytics
- **Back to Dashboard**: Return to main app
- **User Info**: Current user's name and "Admin" label
- **Sign Out**: Log out button

---

## API Endpoints

### Authentication

All admin API endpoints require:
1. Valid Firebase ID token in Authorization header
2. User must have `role: 'admin'` in Firestore

### Endpoints

#### `GET /api/admin/stats`

Get dashboard overview statistics.

**Response**:
```json
{
  "totalUsers": 42,
  "activeUsers": 38,
  "suspendedUsers": 4,
  "currentMonthCost": 123.45,
  "currentMonthApiCalls": 5678
}
```

#### `GET /api/admin/users`

List all users with pagination and search.

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50, max: 100)
- `search` (string): Search by email or displayName

**Response**:
```json
{
  "users": [
    {
      "id": "abc123",
      "email": "user@example.com",
      "displayName": "John Doe",
      "role": "user",
      "accountStatus": "active",
      "subscription": "premium",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "lastLoginAt": "2024-12-26T15:30:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 50,
  "totalPages": 1
}
```

#### `GET /api/admin/users/[userId]`

Get detailed user information.

**Response**:
```json
{
  "user": {
    "id": "abc123",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "user",
    "accountStatus": "active",
    "subscription": "premium",
    "customLimits": {
      "maxTokensPerDay": 150000,
      "maxApiCallsPerDay": 2000,
      "maxCostPerMonth": 75.00
    },
    "createdAt": "2024-01-15T10:00:00.000Z"
  },
  "currentMonthUsage": {
    "totalCost": 23.45,
    "totalApiCalls": 456,
    "totalTokens": 123456
  }
}
```

#### `PATCH /api/admin/users/[userId]`

Update user information.

**Request Body**:
```json
{
  "accountStatus": "suspended",
  "subscription": "pro",
  "customLimits": {
    "maxTokensPerDay": 200000,
    "maxApiCallsPerDay": 3000,
    "maxCostPerMonth": 100.00
  }
}
```

**Response**:
```json
{
  "success": true,
  "user": { /* updated user object */ }
}
```

#### `GET /api/admin/usage`

Get aggregated usage across all users.

**Query Parameters**:
- `startDate` (string): YYYY-MM-DD format
- `endDate` (string): YYYY-MM-DD format
- `groupBy` (string): 'day' or 'month'

**Response**:
```json
{
  "usage": [
    {
      "date": "2024-12-26",
      "totalCostUSD": 12.34,
      "totalApiCalls": 234,
      "totalTokens": 56789,
      "operationCounts": {
        "chat_completion": 150,
        "embedding": 80,
        "pinecone_query": 200
      },
      "operationCosts": {
        "chat_completion": 8.50,
        "embedding": 1.60,
        "pinecone_query": 0.08
      }
    }
  ],
  "totals": {
    "totalCost": 123.45,
    "totalApiCalls": 5678,
    "totalTokens": 1234567
  },
  "startDate": "2024-12-01",
  "endDate": "2024-12-26",
  "groupBy": "day"
}
```

#### `GET /api/admin/usage/[userId]`

Get detailed usage for a specific user.

**Query Parameters**:
- `period` (string): 'day' (last 7 days), 'week' (last 4 weeks), or 'month' (last 12 months)

**Response**:
```json
{
  "usage": [
    {
      "date": "2024-12-26",
      "totalCostUSD": 1.23,
      "totalApiCalls": 45,
      "totalTokens": 6789,
      "operationCounts": { /* ... */ },
      "operationCosts": { /* ... */ }
    }
  ],
  "totals": {
    "totalCost": 12.34,
    "totalApiCalls": 567,
    "totalTokens": 123456
  },
  "breakdown": {
    "operationCounts": { /* ... */ },
    "operationCosts": { /* ... */ }
  },
  "period": "day",
  "startDate": "2024-12-19",
  "endDate": "2024-12-26"
}
```

---

## Security Model

### Role-Based Access Control (RBAC)

#### Roles
- **`user`**: Regular user (default)
- **`admin`**: Administrator with full access

#### Account Status
- **`active`**: User can access the application
- **`suspended`**: User is locked out of the application

### Client-Side Security

#### AdminGuard Component
```typescript
// Protects admin routes
<AdminGuard>
  {children}
</AdminGuard>
```

**Functionality**:
- Checks if user is authenticated
- Checks if user has `role: 'admin'`
- Redirects to `/login` if not authenticated
- Redirects to `/dashboard` if not admin
- Shows loading state during verification

#### useAuth Hook
```typescript
const { user, isAuthenticated, isAdmin, getIdToken } = useAuth();
```

**Returns**:
- `user`: Current user object with role
- `isAuthenticated`: Boolean
- `isAdmin`: Boolean (user.role === 'admin')
- `isSuspended`: Boolean (user.accountStatus === 'suspended')
- `isLoading`: Boolean
- `getIdToken()`: Async function to get Firebase ID token

### Server-Side Security

#### Middleware Functions

**verifyAuth(request)**:
- Extracts Firebase ID token from Authorization header
- Verifies token with Firebase Admin SDK
- Fetches user data from Firestore
- Checks account status (rejects suspended users)
- Returns authenticated user object

**requireAuth(request)**:
- Calls verifyAuth()
- Returns 401 Unauthorized if not authenticated
- Returns user object if authenticated

**requireAdmin(request)**:
- Calls requireAuth()
- Checks if user.role === 'admin'
- Returns 403 Forbidden if not admin
- Returns user object if admin

#### Example Usage
```typescript
export async function GET(request: NextRequest) {
  // Verify admin access
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  // User is authenticated and is admin
  // Proceed with admin operation
}
```

### Firestore Security Rules

#### Admin Helper Function
```javascript
function isAdmin() {
  return isSignedIn() &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

#### User Collection Rules
```javascript
match /users/{userId} {
  // Users can read their own profile, admins can read all
  allow read: if isOwner(userId) || isAdmin();

  // Users can update their own profile (excluding role/accountStatus)
  allow update: if isOwner(userId) &&
    !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'accountStatus']);

  // Admins can update any user (including role/accountStatus)
  allow update: if isAdmin();
}
```

#### Usage Collection Rules
```javascript
// Usage Events - admins only read, server only write
match /usageEvents/{eventId} {
  allow read: if isAdmin();
  allow write: if false;
}

// Daily/Monthly Usage - users read own, admins read all, server only write
match /usageDaily/{docId} {
  allow read: if isSignedIn() && (
    resource.data.userId == request.auth.uid || isAdmin()
  );
  allow write: if false;
}
```

### API Route Protection

All admin API routes use `requireAdmin()`:
```typescript
// ✅ Protected
const { user, response } = await requireAdmin(request);
if (response) return response;

// ✅ Suspended users are rejected at auth level
// ✅ Non-admin users receive 403 Forbidden
// ✅ Unauthenticated users receive 401 Unauthorized
```

### Security Best Practices

1. **Never expose admin credentials**: Service account keys should only be in environment variables
2. **Always verify on server**: Never trust client-side role checks alone
3. **Log admin actions**: All admin operations should be logged for audit trail
4. **Rotate service account keys**: Regularly rotate Firebase service account keys
5. **Monitor admin access**: Set up alerts for admin login attempts
6. **Limit admin accounts**: Only promote trusted users to admin role
7. **Use custom limits carefully**: Setting very high limits could lead to unexpected costs

---

## Usage Tracking

### Architecture

Usage tracking is implemented as a three-tier system:

1. **Usage Events** (`usageEvents` collection): Individual API call logs
2. **Daily Stats** (`usageDaily` collection): Aggregated by user and day
3. **Monthly Stats** (`usageMonthly` collection): Aggregated by user and month

### Tracked Operations

#### OpenAI Operations
- **`embedding`**: Text embedding generation (text-embedding-3-small, 1024D)
- **`chat_completion`**: GPT-4o chat completions
- **`transcription`**: Whisper audio transcription
- **`image_description`**: GPT-4 Vision image analysis
- **`tts`**: Text-to-speech (defined but unused currently)

#### Pinecone Operations
- **`pinecone_query`**: Vector similarity search
- **`pinecone_upsert`**: Vector insertion
- **`pinecone_delete`**: Vector deletion

### Usage Tracking Flow

```
User Request
    ↓
API Route (requireAuth + checkLimits)
    ↓
Service Call (OpenAI/Pinecone)
    ↓
UsageTracker.track*() ← Async, non-blocking
    ↓
Firestore usageEvents ← Write event log
    ↓
[Cloud Function - Future] ← Aggregate hourly
    ↓
usageDaily / usageMonthly ← Update aggregations
```

### UsageTracker Service

**Location**: `lib/services/usage/UsageTracker.ts`

#### Key Methods

**trackEmbedding(userId, tokens, endpoint)**:
```typescript
await UsageTracker.trackEmbedding(
  userId,
  1234,  // total tokens
  'rag_query_embedding'
);
```

**trackChatCompletion(userId, promptTokens, completionTokens, endpoint)**:
```typescript
await UsageTracker.trackChatCompletion(
  userId,
  500,   // prompt tokens
  1500,  // completion tokens
  'rag_chat_completion'
);
```

**trackTranscription(userId, durationSeconds, endpoint)**:
```typescript
await UsageTracker.trackTranscription(
  userId,
  120,   // 2 minutes
  'api_transcribe'
);
```

**trackPineconeQuery(userId, vectorCount, endpoint)**:
```typescript
await UsageTracker.trackPineconeQuery(
  userId,
  10,    // topK
  'rag_query_vector'
);
```

**checkLimits(userId)**:
```typescript
const canProceed = await UsageTracker.checkLimits(userId);
if (!canProceed) {
  return NextResponse.json(
    { error: 'Usage limit exceeded' },
    { status: 429 }
  );
}
```

### Usage Event Schema

```typescript
interface UsageEvent {
  id?: string;
  userId: string;
  timestamp: string;
  operation: UsageOperation;
  provider: 'openai' | 'pinecone';
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  audioDurationSeconds?: number;
  vectorCount?: number;
  estimatedCostUSD: number;
  endpoint: string;
  metadata?: Record<string, any>;
}
```

### Aggregation Strategy

**Current Implementation**:
- Usage events are logged immediately (async, non-blocking)
- Admin APIs aggregate on-the-fly from daily/monthly collections

**Planned Implementation** (Cloud Function):
```javascript
// Run every hour
exports.aggregateUsage = functions.pubsub
  .schedule('0 * * * *')
  .onRun(async () => {
    // Aggregate last hour's events into daily stats
    // Aggregate yesterday's daily stats into monthly stats
    // Delete events older than 30 days
  });
```

### Performance Considerations

- **Non-blocking writes**: Usage tracking doesn't slow down API responses
- **Firestore cost**: ~$0.18 per 1M API calls (Firestore writes)
- **Query optimization**: Composite indexes enable efficient queries
- **Data retention**: Raw events kept for 30 days, aggregations forever

---

## Cost Calculation

### Pricing Configuration

**Location**: `lib/config/pricing.ts`

#### OpenAI Pricing (as of December 2024)

```typescript
export const OPENAI_PRICING = {
  'text-embedding-3-small': {
    inputTokensPer1M: 0.02,  // $0.02 per 1M tokens
  },
  'gpt-4o': {
    inputTokensPer1M: 5.00,   // $5.00 per 1M input tokens
    outputTokensPer1M: 15.00, // $15.00 per 1M output tokens
  },
  'whisper-1': {
    perMinute: 0.006,         // $0.006 per minute
  },
  'gpt-4-vision-preview': {
    inputTokensPer1M: 10.00,  // $10.00 per 1M tokens (base + image)
    outputTokensPer1M: 30.00, // $30.00 per 1M tokens
  },
};
```

#### Pinecone Pricing (Serverless)

```typescript
export const PINECONE_PRICING = {
  query: {
    per1MOperations: 0.40,    // $0.40 per 1M queries
  },
  upsert: {
    per1MOperations: 2.00,    // $2.00 per 1M upserts
  },
  delete: {
    per1MOperations: 2.00,    // $2.00 per 1M deletes
  },
};
```

### Cost Calculation Functions

#### Embedding Cost
```typescript
export function calculateEmbeddingCost(tokens: number): number {
  return (tokens / 1_000_000) * OPENAI_PRICING['text-embedding-3-small'].inputTokensPer1M;
}

// Example: 1,000 tokens
// (1,000 / 1,000,000) * 0.02 = $0.00002
```

#### Chat Completion Cost
```typescript
export function calculateChatCompletionCost(
  promptTokens: number,
  completionTokens: number
): number {
  const inputCost = (promptTokens / 1_000_000) * OPENAI_PRICING['gpt-4o'].inputTokensPer1M;
  const outputCost = (completionTokens / 1_000_000) * OPENAI_PRICING['gpt-4o'].outputTokensPer1M;
  return inputCost + outputCost;
}

// Example: 500 prompt tokens + 1,500 completion tokens
// Input:  (500 / 1,000,000) * 5.00   = $0.0025
// Output: (1,500 / 1,000,000) * 15.00 = $0.0225
// Total: $0.025
```

#### Transcription Cost
```typescript
export function calculateTranscriptionCost(durationSeconds: number): number {
  const durationMinutes = durationSeconds / 60;
  return durationMinutes * OPENAI_PRICING['whisper-1'].perMinute;
}

// Example: 120 seconds (2 minutes)
// (120 / 60) * 0.006 = $0.012
```

#### Pinecone Cost
```typescript
export function calculatePineconeQueryCost(queryCount: number): number {
  return (queryCount / 1_000_000) * PINECONE_PRICING.query.per1MOperations;
}

// Example: 10 queries
// (10 / 1,000,000) * 0.40 = $0.000004
```

### Usage Limits

#### Default Limits (by Tier)

```typescript
export const TIER_LIMITS = {
  free: {
    maxTokensPerDay: 50_000,
    maxApiCallsPerDay: 500,
    maxCostPerMonth: 10.00,
  },
  premium: {
    maxTokensPerDay: 200_000,
    maxApiCallsPerDay: 2_000,
    maxCostPerMonth: 50.00,
  },
  pro: {
    maxTokensPerDay: 1_000_000,
    maxApiCallsPerDay: 10_000,
    maxCostPerMonth: 200.00,
  },
};
```

#### Custom Limits

Admins can set custom limits per user that override tier defaults:

```typescript
interface UserLimits {
  maxTokensPerDay?: number;      // Override daily token limit
  maxApiCallsPerDay?: number;    // Override daily API call limit
  maxCostPerMonth?: number;      // Override monthly cost limit
}
```

#### Limit Checking

```typescript
// In API route
const canProceed = await UsageTracker.checkLimits(userId);
if (!canProceed) {
  return NextResponse.json(
    { error: 'Usage limit exceeded. Please upgrade your plan or contact support.' },
    { status: 429 }
  );
}
```

### Cost Monitoring Best Practices

1. **Set alerts**: Monitor when users approach 80% of their limits
2. **Review monthly**: Compare calculated costs with actual OpenAI/Pinecone invoices
3. **Adjust pricing**: Update pricing constants when API prices change
4. **Optimize usage**: Identify and optimize high-cost operations
5. **Cache results**: Reduce redundant API calls with caching strategies

---

## Troubleshooting

### Common Issues

#### 1. "User not authenticated" when accessing admin routes

**Symptoms**: Redirected to login page even when logged in

**Causes**:
- Firebase ID token expired
- User not found in Firestore `users` collection
- Token verification failing

**Solutions**:
```typescript
// Force token refresh
const { getIdToken } = useAuth();
await getIdToken(true);  // forceRefresh = true

// Check Firestore user document exists
// Navigate to Firebase Console > Firestore > users/{uid}
```

#### 2. "Forbidden: Admin access required"

**Symptoms**: 403 error when accessing admin APIs or routes

**Causes**:
- User doesn't have `role: 'admin'` in Firestore
- Migration script not run
- Admin role not set after migration

**Solutions**:
```bash
# Set admin role
npm run migrate:users set-admin your-email@example.com

# Verify admin role
npm run migrate:users list-admins

# Check Firestore document directly
# users/{uid}.role should be 'admin'
```

#### 3. Suspended users can still access application

**Symptoms**: User with `accountStatus: 'suspended'` can still log in

**Causes**:
- Auth middleware not checking account status
- Firestore rules not enforcing suspension
- Client-side only suspension check

**Solutions**:
- Verify `verifyAuth()` checks account status
- Ensure suspended users receive 401 from API routes
- Check Firestore rules prevent data access for suspended users

#### 4. Usage data not appearing in admin dashboard

**Symptoms**: Charts show no data, totals are zero

**Causes**:
- Usage events not being logged
- userId not passed to tracking functions
- Firestore indexes not deployed
- No API calls made yet

**Solutions**:
```bash
# Check if indexes are deployed
firebase deploy --only firestore:indexes

# Verify usage events in Firestore Console
# Check collections: usageEvents, usageDaily, usageMonthly

# Confirm tracking is called in API routes
# Add console.log in UsageTracker methods temporarily
```

#### 5. Firestore permission denied errors

**Symptoms**: "Missing or insufficient permissions" in console

**Causes**:
- Firestore rules not deployed
- Rules syntax error
- User doesn't have required role/permissions

**Solutions**:
```bash
# Validate rules syntax
firebase deploy --only firestore:rules

# Test rules in Firebase Console
# Firestore > Rules > Playground

# Check browser console for detailed error messages
```

#### 6. Migration script fails with authentication error

**Symptoms**: "Error initializing Firebase Admin" or "Permission denied"

**Causes**:
- `FIREBASE_SERVICE_ACCOUNT_KEY` not set
- Application Default Credentials not configured
- Invalid service account JSON

**Solutions**:
```bash
# For local development, use ADC
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID

# For production, verify environment variable
echo $FIREBASE_SERVICE_ACCOUNT_KEY | jq .  # Should output valid JSON

# Check .env.local file
cat .env.local | grep FIREBASE_SERVICE_ACCOUNT_KEY
```

#### 7. Charts not rendering in admin UI

**Symptoms**: Blank space where charts should appear

**Causes**:
- Recharts not installed
- Data format incorrect
- CSS/styling issue

**Solutions**:
```bash
# Reinstall recharts
npm install recharts

# Check browser console for errors
# Verify data structure matches chart expectations

# Test with sample data
const sampleData = [
  { date: '2024-12-26', cost: 12.34, apiCalls: 100 }
];
```

#### 8. High API costs

**Symptoms**: Monthly costs exceed expectations

**Causes**:
- Users exceeding their limits
- Expensive operations (GPT-4, Vision)
- No limit enforcement
- Redundant API calls

**Solutions**:
1. Review top users in `/admin/usage`
2. Check operation breakdown (which operations cost most)
3. Verify `checkLimits()` is called before API operations
4. Implement caching for repeated queries
5. Consider rate limiting per user
6. Set lower custom limits for high-usage users

---

## Next Steps

### Immediate Actions

1. **Run Migration**:
   ```bash
   npm run migrate:users migrate
   npm run migrate:users set-admin your-email@example.com
   ```

2. **Deploy Firestore Configuration**:
   ```bash
   firebase deploy --only firestore:rules
   firebase deploy --only firestore:indexes
   ```

3. **Test Admin Access**:
   - Navigate to `/admin`
   - Verify you can see dashboard
   - Check user list loads
   - Confirm usage analytics work

4. **Set Up Production Environment**:
   - Add `FIREBASE_SERVICE_ACCOUNT_KEY` to Vercel
   - Redeploy application
   - Test in production environment

### Future Enhancements

#### Cloud Function for Aggregation
Create a scheduled Cloud Function to aggregate usage events:
- Run hourly to process recent events
- Aggregate into daily/monthly collections
- Delete old events (30-day retention)
- Send alerts for users approaching limits

#### Admin Audit Log
Track all admin actions for security and compliance:
- Log user suspensions/activations
- Log subscription tier changes
- Log custom limit modifications
- Display audit log in admin UI

#### Advanced Analytics
- Cost forecasting based on trends
- Anomaly detection for unusual usage
- User cohort analysis
- Operation efficiency metrics

#### Email Notifications
- Alert users when approaching limits
- Notify admins of suspended accounts
- Send monthly usage reports
- Warn about cost overages

#### Bulk Operations
- Bulk suspend/activate users
- Bulk subscription tier changes
- Export user data to CSV
- Import user limits from CSV

---

## Support

### Documentation
- Main README: `README.md`
- API Documentation: `docs/API.md`
- Deployment Guide: `docs/DEPLOYMENT.md`

### Contact
For issues or questions:
1. Check this documentation first
2. Review error messages in browser console
3. Check Firebase Console for Firestore errors
4. Review API route logs in Vercel dashboard

### Resources
- [Firebase Admin SDK Docs](https://firebase.google.com/docs/admin/setup)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Recharts Documentation](https://recharts.org/)
- [OpenAI API Pricing](https://openai.com/pricing)
- [Pinecone Pricing](https://www.pinecone.io/pricing/)

---

## Changelog

### Version 1.0.0 (December 2024)
- Initial admin system implementation
- User role-based access control
- Usage tracking and cost calculation
- Admin dashboard with analytics
- User management interface
- Migration tooling
- Comprehensive documentation

---

**Last Updated**: December 26, 2024
**Author**: Claude Sonnet 4.5 via Claude Code
**Version**: 1.0.0
