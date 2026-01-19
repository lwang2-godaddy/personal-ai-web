# Admin

This document describes the Admin Dashboard and management tools in Personal AI Web.

## Overview

The Admin section provides:

- Dashboard with system overview
- User management
- Usage analytics
- Billing overview
- Prompt management
- Migration tools
- Subscription configuration

## Access Control

All admin pages require:
1. Authentication (`AuthGuard`)
2. Admin role (`AdminGuard`)

Admin role is set in the user document:
```typescript
{
  role: 'admin',          // 'user' | 'admin'
  accountStatus: 'active' // 'active' | 'suspended'
}
```

---

## Admin Pages

| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard overview |
| `/admin/users` | User management |
| `/admin/users/[id]` | User detail |
| `/admin/usage` | Usage analytics |
| `/admin/billing` | Billing overview |
| `/admin/prompts` | Prompt management |
| `/admin/migrations` | Migration tools |
| `/admin/subscriptions` | Subscription config |
| `/admin/explore-questions` | Explore questions |

---

## Dashboard

**Route**: `/admin`

**Purpose**: System overview with key metrics

### Stats Cards

| Metric | Description |
|--------|-------------|
| Total Users | All registered users |
| Active Users | Users active in last 30 days |
| Suspended Users | Accounts suspended |
| Monthly Cost | Current month API costs |
| API Calls | Current month total calls |

**API**: `GET /api/admin/stats`

---

## User Management

**Route**: `/admin/users`

### User List

Paginated table of all users.

**Columns**:
- Avatar
- Display Name
- Email
- Role (badge)
- Status (badge)
- Subscription Tier
- Last Active
- Actions (view/edit)

**Features**:
- Search by email/name
- Pagination (50 per page)
- Sort by columns

**API**: `GET /api/admin/users?page=1&limit=50&search=...`

### User Detail

**Route**: `/admin/users/[userId]`

**Displays**:
- Profile information
- Account status controls
- Subscription tier
- Custom limits
- Usage statistics (monthly/daily)
- Activity timeline

**Actions**:

| Action | Description |
|--------|-------------|
| Suspend | Disable account |
| Activate | Re-enable account |
| Change Tier | Update subscription |
| Set Limits | Custom quota overrides |

**API**:
- `GET /api/admin/users/[userId]`
- `PATCH /api/admin/users/[userId]`

---

## Usage Analytics

**Route**: `/admin/usage`

### Overview Charts

- API calls over time
- Cost trends
- Model breakdown
- Endpoint breakdown

### Filters

| Filter | Options |
|--------|---------|
| Date Range | Start/End date picker |
| Group By | Day / Month |
| Service | All / Specific service |

### Top Users

Table of highest usage users:
- User info
- Total cost
- API calls
- Primary operations

**API**: `GET /api/admin/usage?startDate=...&endDate=...&groupBy=day`

---

## Billing Overview

**Route**: `/admin/billing`

### BillingComparisonCard

**Component**: `components/admin/BillingComparisonCard.tsx`

**Features**:
- Actual vs Estimated costs
- Variance indicators
- Provider breakdowns
- Refresh button
- Data source badges

### Provider Sections

#### OpenAI Billing

| Metric | Description |
|--------|-------------|
| Total Cost | Sum of all OpenAI charges |
| By Model | GPT-4o, Embeddings, Whisper |
| By Date | Daily cost breakdown |

**Data Source**: OpenAI Costs API (requires org key)

#### Pinecone Billing

| Metric | Description |
|--------|-------------|
| Total Cost | Sum of all Pinecone charges |
| Read Units | Query operations |
| Write Units | Upsert operations |
| Storage GB | Vector storage |

**Data Source**: Pinecone API + usageEvents

#### GCP/Firebase Billing

| Metric | Description |
|--------|-------------|
| Total Cost | Firestore + Storage + Functions |
| Firestore | Read/write operations |
| Storage | File storage bytes |
| Functions | Invocations and compute |

**Data Source**: Internal tracking

### Cost Variance

Shows difference between estimated (from tracking) and actual (from APIs):

```typescript
interface CostVariance {
  openai: number;         // Actual - Estimated
  pinecone: number;
  infrastructure: number;
  grandTotal: number;
  openaiPercent: number;  // Variance percentage
  // ...
}
```

**API**: `GET /api/admin/billing?startDate=...&endDate=...&refresh=true`

---

## Prompt Management

**Route**: `/admin/prompts`

### Prompt List

Table of prompt configurations:
- Service name
- Language
- Status (draft/published/archived)
- Version
- Last updated
- Actions

### Prompt Editor

Edit individual prompts with:
- Content editor (multiline)
- Variable definitions
- Model settings (temperature, max tokens)
- Cultural notes
- Variants (conditional)

### Supported Services

| Service | Description |
|---------|-------------|
| rag_engine | RAG system prompt |
| event_extraction | Event parsing |
| prompt_expansion | Query expansion |
| memory_generator | Memory synthesis |
| sentiment_analysis | Sentiment detection |
| entity_extraction | Entity recognition |
| suggestion_engine | Suggestion generation |
| daily_summary | Daily summaries |
| life_feed | Life feed posts |

### Version History

View change history:
- Timestamp
- Changed by
- Change notes
- Previous content
- Diff view

**API**:
- `GET /api/admin/prompts`
- `POST /api/admin/prompts`
- `GET /api/admin/prompts/[service]`
- `PATCH /api/admin/prompts/[service]`

---

## Migration Tools

**Route**: `/admin/migrations`

### Available Migrations

| Migration | Category | Description |
|-----------|----------|-------------|
| createPredefinedCircles | user_data | Create default circles |
| migrateNotificationPrefs | privacy | Update notification schema |
| cleanupOrphanedData | cleanup | Remove orphaned records |

### Migration Components

**Files**: `components/admin/migrations/`

| Component | Purpose |
|-----------|---------|
| MigrationCard | Migration overview card |
| MigrationRunHistory | Historical runs table |
| ActiveMigrationBanner | Running migration status |
| MigrationStatusBadge | Status indicator |
| MigrationProgressTracker | Progress visualization |
| MigrationOptionsForm | Configuration form |
| ConfirmMigrationModal | Confirmation dialog |

### Running a Migration

1. Select migration from list
2. Configure options:
   - Dry run (preview only)
   - Batch size
   - Start after user ID (resume)
3. Confirm (destructive warning if applicable)
4. Monitor progress
5. View results

### Migration Status

```typescript
type MigrationStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled' | 'partial';
```

**API**:
- `GET /api/admin/migrations`
- `POST /api/admin/migrations/[id]/run`
- `GET /api/admin/migrations/[id]/runs`

---

## Subscription Configuration

**Route**: `/admin/subscriptions`

### Tier Configuration

Configure quotas for each tier:

```typescript
interface TierQuotas {
  messagesPerDay: number;        // -1 = unlimited
  photosPerMonth: number;
  voiceMinutesPerMonth: number;
  customActivityTypes: number;
  insightsEnabled: boolean;
  prioritySupport: boolean;
  advancedAnalytics: boolean;
  dataExport: boolean;
  offlineMode: boolean;
}
```

### Default Tiers

| Tier | Messages/Day | Photos/Month | Voice Min/Month |
|------|--------------|--------------|-----------------|
| Free | 15 | 5 | 5 |
| Premium | Unlimited | Unlimited | Unlimited |
| Pro | Unlimited | Unlimited | Unlimited |

### Configuration Options

| Option | Description |
|--------|-------------|
| enableDynamicConfig | Use Firestore vs defaults |
| changeNotes | Audit trail notes |

### Version History

Track configuration changes:
- Version number
- Changed by (admin email)
- Timestamp
- Change notes

**API**:
- `GET /api/admin/subscriptions`
- `PATCH /api/admin/subscriptions`
- `GET /api/admin/subscriptions/versions`

---

## Explore Questions

**Route**: `/admin/explore-questions`

### Question Editor

**Component**: `components/admin/ExploreQuestionEditor.tsx`

Configure explore questions shown on mobile app.

**Fields**:

| Field | Description |
|-------|-------------|
| Icon | Emoji icon |
| Label Key | Display label with template vars |
| Query Template | RAG query template |
| Category | Question category |
| Priority | Sort priority (0-100) |
| Enabled | Active/inactive |
| User Data States | When to show |
| Variables | Template variables |
| Data Requirements | Required data types |

### Categories

| Category | Description |
|----------|-------------|
| activity | Activity-related questions |
| health | Health metrics questions |
| location | Location history questions |
| voice | Voice note questions |
| photo | Photo memory questions |
| general | General questions |
| onboarding | First-time user questions |

### Data States

Questions shown based on user's data:

| State | Description |
|-------|-------------|
| NO_DATA | User has no data |
| MINIMAL_DATA | < 10 entries |
| PARTIAL_DATA | 10-50 entries |
| RICH_DATA | 50+ entries |

### Language Support

Questions can be localized:
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Japanese (ja)
- Chinese (zh)

**API**:
- `GET /api/admin/explore-questions`
- `POST /api/admin/explore-questions`
- `PATCH /api/admin/explore-questions/[id]`
- `POST /api/admin/explore-questions/migrate`
- `POST /api/admin/explore-questions/copy-to-languages`

---

## Security

### Audit Logging

Admin actions are logged:

```typescript
await adminDb.collection('adminLogs').add({
  adminUid: admin.uid,
  adminEmail: admin.email,
  action: 'UPDATE_USER',
  targetUserId: userId,
  changes: updates,
  timestamp: new Date().toISOString(),
});
```

### Rate Limiting

Admin endpoints have rate limits to prevent abuse.

### Data Access

Admins can view but respect privacy:
- Cannot read user messages
- Cannot view raw health data
- Can view aggregated statistics

---

## API Reference

See [API Reference - Admin](../API_REFERENCE.md#admin---dashboard) for complete endpoint documentation.

---

## Related Documentation

- [Database Schema - Admin](../DATABASE_SCHEMA.md#admin--configuration)
- [Services - Billing](../SERVICES.md#billing--usage)
- [Services - Prompts](../SERVICES.md#promptservice)
- [Authentication - Admin](../infrastructure/AUTHENTICATION.md#requireadmin)
