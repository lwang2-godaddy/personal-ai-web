# API Reference

Complete documentation for all 51+ API endpoints in Personal AI Web.

## Table of Contents

- [Authentication](#authentication)
- [Chat & RAG](#chat--rag)
- [Data Collection - Text Notes](#data-collection---text-notes)
- [Data Collection - Voice Notes](#data-collection---voice-notes)
- [Data Collection - Photos](#data-collection---photos)
- [AI Processing Services](#ai-processing-services)
- [User & Account](#user--account)
- [Circles (Social Groups)](#circles-social-groups)
- [Admin - Dashboard](#admin---dashboard)
- [Admin - Users](#admin---users)
- [Admin - Usage & Billing](#admin---usage--billing)
- [Admin - Prompts](#admin---prompts)
- [Admin - Migrations](#admin---migrations)
- [Admin - Subscriptions](#admin---subscriptions)
- [Admin - Explore Questions](#admin---explore-questions)

---

## Authentication

All protected endpoints require an `Authorization` header:

```
Authorization: Bearer <firebase_id_token>
```

### Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable - Business logic error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Chat & RAG

### Send Chat Message

Send a message to the RAG-powered AI chatbot with conversation history.

```
POST /api/chat
```

**Authentication**: Required

**Request Body**:

```typescript
{
  message: string;           // User's question
  userId: string;            // User ID
  conversationHistory?: {    // Previous messages for context
    role: 'user' | 'assistant';
    content: string;
  }[];
}
```

**Response** (200):

```typescript
{
  response: string;          // AI response text
  contextUsed: {             // RAG sources used
    id: string;              // Document ID
    score: number;           // Relevance (0-1)
    type: 'health' | 'location' | 'voice' | 'photo' | 'text';
    snippet: string;         // Preview text
  }[];
}
```

**Example**:

```bash
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How many times did I play badminton this month?",
    "userId": "abc123"
  }'
```

---

## Data Collection - Text Notes

### List Text Notes

```
GET /api/text-notes
```

**Authentication**: Required

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | Max notes to return |
| type | string | - | Filter by 'diary' or 'thought' |

**Response** (200):

```typescript
{
  notes: TextNote[];
  count: number;
}
```

### Create Text Note

```
POST /api/text-notes
```

**Authentication**: Required

**Request Body**:

```typescript
{
  userId: string;
  title: string;             // Required, 1-100 chars
  content: string;           // Required, 10+ chars (except thoughts)
  tags?: string[];           // Max 10 tags, each 1-30 chars
  type?: 'diary' | 'thought'; // Default: 'diary'
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    locationId?: string;
  };
}
```

**Response** (201):

```typescript
{
  id: string;
  message: string;
}
```

### Get Single Text Note

```
GET /api/text-notes/[noteId]
```

**Authentication**: Required (must own note)

**Response** (200): `TextNote`

### Update Text Note

```
PATCH /api/text-notes/[noteId]
```

**Authentication**: Required (must own note)

**Request Body** (all fields optional):

```typescript
{
  title?: string;
  content?: string;
  tags?: string[];
}
```

**Response** (200):

```typescript
{
  message: string;
}
```

### Delete Text Note

```
DELETE /api/text-notes/[noteId]
```

**Authentication**: Required (must own note)

**Response** (200):

```typescript
{
  message: string;
}
```

---

## Data Collection - Voice Notes

### List Voice Notes

```
GET /api/voice-notes
```

**Authentication**: Required

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | Max notes to return (max 100) |

**Response** (200):

```typescript
{
  voiceNotes: VoiceNote[];
  count: number;
}
```

### Create Voice Note

```
POST /api/voice-notes
```

**Authentication**: Required

**Request Body**:

```typescript
{
  userId: string;
  audioUrl: string;          // Firebase Storage URL
  transcription: string;     // Whisper transcription
  duration: number;          // Duration in seconds
  tags?: string[];
}
```

**Response** (201):

```typescript
{
  id: string;
  message: string;
}
```

---

## Data Collection - Photos

### List Photos

```
GET /api/photos
```

**Authentication**: Required

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | Max photos to return (max 100) |

**Response** (200):

```typescript
{
  photos: PhotoMemory[];
  count: number;
}
```

### Create Photo

```
POST /api/photos
```

**Authentication**: Required

**Request Body**:

```typescript
{
  userId: string;
  imageUrl: string;          // Original image URL
  thumbnailUrl: string;      // 256x256 thumbnail
  mediumUrl: string;         // 1024x1024 for display
  takenAt: string;           // ISO timestamp
  autoDescription?: string;  // AI-generated description
  userDescription?: string;  // User-provided caption
  latitude?: number;
  longitude?: number;
  address?: string;
  activity?: string;
  fileSize?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  tags?: string[];
}
```

**Response** (201):

```typescript
{
  id: string;
  message: string;
}
```

---

## AI Processing Services

### Transcribe Audio

Transcribe audio file using OpenAI Whisper.

```
POST /api/transcribe
```

**Authentication**: Required

**Request Body** (JSON):

```typescript
{
  audioUrl: string;          // Firebase Storage URL
}
```

**OR** multipart/form-data with `audio` file field.

**Response** (200):

```typescript
{
  transcription: string;
  duration: number;          // Detected duration
  language: string;          // Detected language
}
```

### Describe Image

Generate AI description for an image.

```
POST /api/describe-image
```

**Authentication**: Required

**Request Body**:

```typescript
{
  imageUrl: string;          // Image URL
}
```

**Response** (200):

```typescript
{
  description: string;       // 2-3 sentence description
}
```

---

## User & Account

### Get User Profile

```
GET /api/users/[userId]
```

**Authentication**: Required (own user or admin)

**Response** (200): `User`

### Update User Profile

```
PATCH /api/users/[userId]
```

**Authentication**: Required (own user or admin)

**Request Body** (all fields optional):

```typescript
{
  displayName?: string;
  timezone?: string;         // IANA timezone
  locale?: string;           // Language code (en, es, fr, etc.)
  notificationPreferences?: NotificationPreferences;
  lifeFeedPreferences?: LifeFeedPreferences;
  // Admin only:
  role?: 'user' | 'admin';
  accountStatus?: 'active' | 'suspended';
}
```

**Response** (200):

```typescript
{
  message: string;
}
```

### Get Friends

```
GET /api/friends
```

**Authentication**: Required

**Response** (200):

```typescript
{
  friends: FriendWithProfile[];
}
```

### Get Notifications

```
GET /api/notifications
```

**Authentication**: Required

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by notification type |
| status | string | Filter by status |
| startDate | string | ISO date |
| endDate | string | ISO date |
| limit | number | Max 500, default 100 |

**Response** (200):

```typescript
{
  notifications: NotificationRecord[];
  count: number;
}
```

### Get Storage Usage

```
GET /api/storage-usage
```

**Authentication**: Required

**Response** (200):

```typescript
{
  total: { count: number; sizeBytes: number; sizeFormatted: string };
  photos: { count: number; sizeBytes: number; sizeFormatted: string };
  voiceNotes: { count: number; sizeBytes: number; sizeFormatted: string };
  quotaBytes: number;
  quotaPercentage: number;
  calculatedAt: string;
}
```

---

## Circles (Social Groups)

### List User's Circles

```
GET /api/circles
```

**Authentication**: Required

**Response** (200):

```typescript
{
  circles: Circle[];
}
```

### Create Circle

```
POST /api/circles
```

**Authentication**: Required

**Request Body**:

```typescript
{
  name: string;              // Circle name
  description?: string;
  emoji?: string;
  type?: 'open' | 'private';
  dataSharing?: {
    shareHealth: boolean;
    shareLocation: boolean;
    shareActivities: boolean;
    shareVoiceNotes: boolean;
    sharePhotos: boolean;
  };
  settings?: CircleSettings;
}
```

**Response** (201):

```typescript
{
  id: string;
  message: string;
}
```

### Get Circle

```
GET /api/circles/[circleId]
```

**Authentication**: Required (must be member)

**Response** (200): `Circle`

### Update Circle

```
PATCH /api/circles/[circleId]
```

**Authentication**: Required (creator or admin)

**Response** (200):

```typescript
{
  message: string;
}
```

### Delete Circle

```
DELETE /api/circles/[circleId]
```

**Authentication**: Required (creator only)

**Response** (200):

```typescript
{
  message: string;
}
```

### Get Circle Members

```
GET /api/circles/[circleId]/members
```

**Authentication**: Required (must be member)

**Response** (200):

```typescript
{
  members: CircleMember[];
}
```

### Remove Member

```
DELETE /api/circles/[circleId]/members/[userId]
```

**Authentication**: Required (creator/admin only)

**Response** (200):

```typescript
{
  message: string;
}
```

### Invite to Circle

```
POST /api/circles/[circleId]/invite
```

**Authentication**: Required (member with invite permission)

**Request Body**:

```typescript
{
  friendId: string;
  message?: string;
}
```

**Response** (201):

```typescript
{
  inviteId: string;
  message: string;
}
```

### Leave Circle

```
POST /api/circles/[circleId]/leave
```

**Authentication**: Required (must be member, not creator)

**Response** (200):

```typescript
{
  message: string;
}
```

### Get Circle Messages

```
GET /api/circles/[circleId]/messages
```

**Authentication**: Required (must be member)

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | Max messages |
| startAfter | string | - | Cursor for pagination |

**Response** (200):

```typescript
{
  messages: CircleMessage[];
  hasMore: boolean;
  lastId?: string;
}
```

### Send Circle Message

```
POST /api/circles/[circleId]/messages
```

**Authentication**: Required (must be member)

**Request Body**:

```typescript
{
  content: string;
  type?: 'text' | 'voice' | 'system';
  voiceNoteUrl?: string;
  voiceNoteDuration?: number;
}
```

**Response** (201):

```typescript
{
  messageId: string;
  message: string;
}
```

### Get Circle Analytics

```
GET /api/circles/[circleId]/analytics
```

**Authentication**: Required (must be member)

**Response** (200): `CircleAnalytics`

### List Pending Invites

```
GET /api/circles/invites
```

**Authentication**: Required

**Response** (200):

```typescript
{
  invites: CircleInvite[];
}
```

### Accept Invite

```
POST /api/circles/invites/[inviteId]/accept
```

**Authentication**: Required (invite recipient)

**Response** (200):

```typescript
{
  circleId: string;
  message: string;
}
```

### Reject Invite

```
POST /api/circles/invites/[inviteId]/reject
```

**Authentication**: Required (invite recipient)

**Response** (200):

```typescript
{
  message: string;
}
```

---

## Admin - Dashboard

All admin endpoints require admin role.

### Get Admin Stats

```
GET /api/admin/stats
```

**Response** (200):

```typescript
{
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  currentMonthCost: number;
  currentMonthApiCalls: number;
}
```

---

## Admin - Users

### List All Users

```
GET /api/admin/users
```

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Per page (max 100) |
| search | string | - | Search by email/name |

**Response** (200):

```typescript
{
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}
```

### Get User Details

```
GET /api/admin/users/[userId]
```

**Response** (200):

```typescript
{
  user: User;
  usage: {
    monthly: MonthlyUsageStats;
    daily: DailyUsageStats;
  };
}
```

### Update User (Admin)

```
PATCH /api/admin/users/[userId]
```

**Request Body**:

```typescript
{
  accountStatus?: 'active' | 'suspended';
  subscription?: {
    tier: 'free' | 'premium' | 'pro';
  };
  customLimits?: {
    maxTokensPerDay?: number;
    maxApiCallsPerDay?: number;
    maxCostPerMonth?: number;
  };
}
```

**Response** (200):

```typescript
{
  message: string;
}
```

---

## Admin - Usage & Billing

### Get Aggregated Usage

```
GET /api/admin/usage
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | string | ISO date (required) |
| endDate | string | ISO date (required) |
| groupBy | string | 'day' or 'month' |
| service | string | Filter by service |

**Response** (200):

```typescript
{
  usageByPeriod: { period: string; calls: number; cost: number }[];
  topUsers: { userId: string; cost: number }[];
  modelBreakdown: { model: string; calls: number; cost: number }[];
  endpointBreakdown: { endpoint: string; calls: number }[];
}
```

### Get Billing Data

```
GET /api/admin/billing
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | string | ISO date |
| endDate | string | ISO date |
| refresh | boolean | Force refresh from APIs |

**Response** (200): `CombinedBillingData`

---

## Admin - Prompts

### List Prompt Configs

```
GET /api/admin/prompts
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| language | string | Filter by language |
| service | string | Filter by service |

**Response** (200):

```typescript
{
  configs: FirestorePromptConfig[];
  services: string[];
  languages: string[];
}
```

### Create Prompt Config

```
POST /api/admin/prompts
```

**Request Body**: `FirestorePromptConfig`

**Response** (201):

```typescript
{
  message: string;
}
```

---

## Admin - Migrations

### List Migrations

```
GET /api/admin/migrations
```

**Response** (200):

```typescript
{
  migrations: MigrationWithStats[];
}
```

### Get Migration Details

```
GET /api/admin/migrations/[migrationId]
```

**Response** (200): `MigrationWithStats`

### Get Migration Runs

```
GET /api/admin/migrations/[migrationId]/runs
```

**Response** (200):

```typescript
{
  runs: MigrationRun[];
}
```

---

## Admin - Subscriptions

### Get Subscription Config

```
GET /api/admin/subscriptions
```

**Response** (200): `SubscriptionTierConfig`

### Initialize Subscription Config

```
POST /api/admin/subscriptions
```

Creates default subscription configuration.

**Response** (201):

```typescript
{
  message: string;
}
```

### Update Subscription Config

```
PATCH /api/admin/subscriptions
```

**Request Body**:

```typescript
{
  tiers?: {
    free?: TierQuotas;
    premium?: TierQuotas;
    pro?: TierQuotas;
  };
  enableDynamicConfig?: boolean;
  changeNotes?: string;
}
```

**Response** (200):

```typescript
{
  message: string;
  version: number;
}
```

---

## Admin - Explore Questions

### List Explore Questions

```
GET /api/admin/explore-questions
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| language | string | Language code (default: en) |

**Response** (200):

```typescript
{
  questions: ExploreQuestion[];
  config: ExploreQuestionsConfig;
}
```

### Create Explore Question

```
POST /api/admin/explore-questions
```

**Request Body**: `ExploreQuestion`

**Response** (201):

```typescript
{
  id: string;
  message: string;
}
```

### Update Explore Question

```
PATCH /api/admin/explore-questions/[id]
```

**Request Body**: Partial `ExploreQuestion`

**Response** (200):

```typescript
{
  message: string;
}
```

---

## Rate Limiting

The following endpoints check usage limits before processing:

| Endpoint | Limit Type |
|----------|------------|
| `/api/chat` | Messages per day |
| `/api/transcribe` | Voice minutes per month |
| `/api/describe-image` | API calls per day |

When limits are exceeded, the API returns `429 Too Many Requests`:

```typescript
{
  error: "Usage limit exceeded",
  limit: "messagesPerDay",
  current: 15,
  max: 15,
  resetAt: "2025-01-20T00:00:00.000Z"
}
```

---

## Pagination Patterns

### Limit-Based (Most Endpoints)

```
GET /api/text-notes?limit=50
```

### Page-Based (Admin Users)

```
GET /api/admin/users?page=2&limit=50
```

### Cursor-Based (Circle Messages)

```
GET /api/circles/{circleId}/messages?limit=50&startAfter=lastMessageId
```

---

## Error Response Format

All errors follow this format:

```typescript
{
  error: string;             // Human-readable error message
  code?: string;             // Error code (optional)
  details?: any;             // Additional details (optional)
}
```

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System overview
- [Database Schema](./DATABASE_SCHEMA.md) - Data models
- [Authentication](./infrastructure/AUTHENTICATION.md) - Auth details
