# Admin Dashboard

The Admin Dashboard provides comprehensive management tools for the SirCharge platform. This document describes all admin features and their implementation.

## Navigation Structure

The admin sidebar is organized into 5 collapsible groups:

| Group | Pages |
|-------|-------|
| **Users & Accounts** | Users, Subscriptions, App Settings |
| **Analytics** | Usage Analytics, Behavior |
| **AI Configuration** | AI Models, Prompts, Insights, Notifications, Voice Categories |
| **Content** | Explore Questions, Pricing |
| **Operations** | Migrations, Docs |

---

## Access Control

All admin pages require:
1. **Authentication** - Valid Firebase ID token
2. **Admin Role** - User document must have `role: 'admin'`

```typescript
// User document structure
{
  role: 'admin',          // 'user' | 'admin'
  accountStatus: 'active' // 'active' | 'suspended'
}
```

**Middleware**: `requireAdmin()` in `lib/middleware/auth.ts`

---

## Admin Pages Reference

### Overview Dashboard

**Route**: `/admin`

**Purpose**: System overview with key metrics and quick actions

**Stats Cards**:
| Metric | Description |
|--------|-------------|
| Total Users | All registered users |
| Active Users | Users active in last 30 days |
| Premium Users | Paid subscription users |
| API Calls Today | Today's total API calls |
| Monthly Cost | Current month estimated costs |

**API**: `GET /api/admin/stats`

---

## Users & Accounts

### Users

**Route**: `/admin/users`

Paginated list of all users with search and filtering.

**Features**:
- Search by email/name
- Filter by role, status, subscription tier
- Sort by registration date, last active
- Bulk actions (suspend, activate)

**User Detail** (`/admin/users/[userId]`):
- Profile information
- Account status controls
- Subscription management
- Usage statistics
- Activity timeline

**API**:
- `GET /api/admin/users`
- `GET /api/admin/users/[userId]`
- `PATCH /api/admin/users/[userId]`

### Subscriptions

**Route**: `/admin/subscriptions`

Configure subscription tiers and quotas.

**Tier Configuration**:
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
}
```

**Default Tiers**:
| Tier | Messages/Day | Photos/Month | Voice Min/Month | Price |
|------|--------------|--------------|-----------------|-------|
| Free | 15 | 5 | 5 | $0 |
| Premium | Unlimited | Unlimited | Unlimited | $2.99/mo |
| Pro | Unlimited | Unlimited | Unlimited | $5.99/mo |

**API**:
- `GET /api/admin/subscriptions`
- `PATCH /api/admin/subscriptions`

### App Settings

**Route**: `/admin/app-settings`

Global application settings and feature flags.

**Settings**:
- Maintenance mode toggle
- Feature flags
- Default user preferences
- Rate limits

---

## Analytics

### Usage Analytics

**Route**: `/admin/usage`

Comprehensive API usage and cost tracking.

**Charts**:
- API calls over time (line chart)
- Cost breakdown by service (pie chart)
- Model usage distribution
- Endpoint breakdown

**Filters**:
| Filter | Options |
|--------|---------|
| Date Range | Custom date picker |
| Group By | Day / Week / Month |
| Service | All / OpenAI / Pinecone / Firebase |

**Top Users Table**:
- User info
- Total API calls
- Estimated cost
- Primary operations

**API**: `GET /api/admin/usage?startDate=...&endDate=...&groupBy=day`

### Behavior Analytics

**Route**: `/admin/behavior`

User behavior tracking and engagement metrics.

**Metrics**:
- Screen view counts
- Feature adoption rates
- User journeys
- Conversion funnels
- Retention metrics

**API**: `GET /api/admin/behavior`

---

## AI Configuration

### AI Models

**Route**: `/admin/ai-models`

Configure AI model settings and defaults.

**Configuration**:
| Setting | Description |
|---------|-------------|
| Default Chat Model | GPT-4o, GPT-4o-mini |
| Embedding Model | text-embedding-3-small |
| Temperature | 0-2 (default: 0.7) |
| Max Tokens | Response length limit |
| Rate Limits | Per-user request limits |

### Prompts

**Route**: `/admin/prompts`

Manage AI prompts for all services.

**Services**:
| Service | Description |
|---------|-------------|
| `RAGEngine` | Chat context and response generation |
| `LifeFeedGenerator` | Life feed post generation |
| `FunFactGenerator` | Fun fact generation |
| `SentimentAnalysisService` | Mood detection |
| `EntityExtractionService` | People/places extraction |
| `EventExtractionService` | Event detection |
| `MemoryGeneratorService` | Memory summaries |
| `SuggestionEngine` | Smart suggestions |
| `DailySummaryService` | Daily/weekly summaries |

**Prompt Editor Features**:
- Multiline content editor
- Variable definitions (Handlebars syntax)
- Model settings (temperature, max tokens)
- Language localization
- Version history with diff view

**API**:
- `GET /api/admin/prompts`
- `GET /api/admin/prompts/[service]`
- `PATCH /api/admin/prompts/[service]`

### Insights

**Route**: `/admin/insights`

Configure the AI-powered Insights system.

**Tabs**:

#### Overview Tab
- Global Insights enable/disable
- Statistics (total posts, by type, by category)
- Quick links to related settings

#### AI Features Tab
Configure the 5 AI content generators:
| Feature | Service | Default |
|---------|---------|---------|
| Life Feed | `LifeFeedGenerator` | Enabled |
| Fun Facts | `FunFactGenerator` | Enabled |
| Mood Compass | `MoodCorrelationService` | Enabled |
| Memory Companion | `MemoryGeneratorService` | Enabled |
| Life Forecaster | `PredictionService` | Enabled |

#### Life Feed Tab
Configure the 8 post types:
| Post Type | Cooldown | Priority | Description |
|-----------|----------|----------|-------------|
| `life_summary` | 1 day | 8 | Daily/weekly summaries |
| `milestone` | 7 days | 9 | Achievement milestones |
| `streak_achievement` | 3 days | 7 | Streak achievements |
| `pattern_prediction` | 1 day | 6 | Future predictions |
| `reflective_insight` | 3 days | 5 | Behavioral insights |
| `memory_highlight` | 7 days | 4 | Photo/voice memories |
| `comparison` | 14 days | 3 | Time period comparisons |
| `seasonal_reflection` | 30 days | 2 | Seasonal summaries |

**API**:
- `GET /api/admin/insights/config`
- `PUT /api/admin/insights/config`
- `GET /api/admin/insights/ai-features`
- `PUT /api/admin/insights/ai-features`
- `GET /api/admin/insights/post-types`
- `PUT /api/admin/insights/post-types`

### Notifications

**Route**: `/admin/notifications`

Documentation and configuration for push notifications.

**Notification Types** (9 total):
| Type | Trigger | Description |
|------|---------|-------------|
| `fun_fact` | Scheduled | Daily fun facts at user's preferred time |
| `daily_summary` | Scheduled | Daily activity summaries (8 PM) |
| `weekly_insights` | Scheduled | Weekly insights (Monday 9 AM) |
| `achievement` | Firestore | Real-time milestone notifications |
| `event_reminder` | Scheduled | Upcoming event reminders |
| `pattern_reminder` | Scheduled | Pattern-based activity reminders |
| `escalated_reminder` | Scheduled | Follow-up for missed events |
| `event_conflict` | Real-time | Scheduling conflict alerts |
| `social` | Real-time | Circle invites and activity |

**Android Channels** (11 total):
| Channel ID | Description |
|------------|-------------|
| `reminders` | Event and task reminders |
| `important_events` | Urgent notifications |
| `daily_summaries` | Daily summaries |
| `insights` | Weekly insights |
| `fun_facts` | Fun facts |
| `pattern_reminders` | Behavior-based reminders |
| `event_reminders` | Calendar reminders |
| `social` | Circle activity |
| `location` | Location alerts |
| `health` | Health notifications |
| `general` | General notifications |

**Cloud Functions**:
- `sendDailySummary` - Daily summary sender
- `sendWeeklyInsights` - Weekly insights sender
- `sendDailyFunFact` - Hourly fun fact checker
- `eventNotificationScheduler` - Event reminders
- `testFunFactNotification` - Testing endpoint

### Voice Categories

**Route**: `/admin/voice-categories`

Configure auto-categorization for voice notes.

**Categories**:
| Category | Icon | Keywords |
|----------|------|----------|
| work | 💼 | meeting, project, deadline |
| personal | 🏠 | family, home, weekend |
| ideas | 💡 | idea, thought, concept |
| todo | ✅ | remember, need to, don't forget |
| health | 🏃 | workout, exercise, doctor |

---

## Content

### Explore Questions

**Route**: `/admin/explore-questions`

Configure suggested questions shown in the mobile app.

**Question Fields**:
| Field | Description |
|-------|-------------|
| Icon | Emoji icon |
| Label Key | Display text with template vars |
| Query Template | RAG query template |
| Category | activity / health / location / voice / photo |
| Priority | Sort order (0-100) |
| Enabled | Active/inactive |
| Data Requirements | Required data types |

**Data States**:
| State | Description |
|-------|-------------|
| `NO_DATA` | User has no data |
| `MINIMAL_DATA` | < 10 entries |
| `PARTIAL_DATA` | 10-50 entries |
| `RICH_DATA` | 50+ entries |

**API**:
- `GET /api/admin/explore-questions`
- `POST /api/admin/explore-questions`
- `PATCH /api/admin/explore-questions/[id]`

### Pricing

**Route**: `/admin/pricing`

Configure public pricing page content.

**Sections**:
- Tier comparison table
- Feature lists
- FAQ items
- Call-to-action buttons

---

## Operations

### Migrations

**Route**: `/admin/migrations`

Database migration tools for schema updates.

**Features**:
- Dry run mode (preview changes)
- Batch processing with configurable size
- Progress tracking
- Rollback support
- Run history

**Migration Status**:
```typescript
type MigrationStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled' | 'partial';
```

**API**:
- `GET /api/admin/migrations`
- `POST /api/admin/migrations/[id]/run`
- `GET /api/admin/migrations/[id]/status`

### Documentation

**Route**: `/admin/docs`

In-app documentation viewer.

**Features**:
- Tabbed navigation (Web / Mobile)
- Markdown rendering
- Syntax highlighting
- Search functionality

**Documentation Categories**:
- Overview & Architecture
- Technical Reference
- Infrastructure
- Features

---

## Security

### Audit Logging

Admin actions are logged to Firestore:

```typescript
// Collection: adminLogs
{
  adminUid: string;
  adminEmail: string;
  action: string;        // e.g., 'UPDATE_USER', 'CHANGE_TIER'
  targetUserId?: string;
  changes: object;
  timestamp: string;
  ip?: string;
}
```

### Data Access Restrictions

Admins have limited access to protect user privacy:
- ✅ Can view aggregated statistics
- ✅ Can manage account status
- ✅ Can view subscription info
- ❌ Cannot read user messages
- ❌ Cannot view raw health data
- ❌ Cannot access voice recordings

---

## Components

Admin components are located in `components/admin/`:

| Component | Purpose |
|-----------|---------|
| `AdminSidebar` | Navigation sidebar with collapsible groups |
| `AdminHeader` | Top header with mobile menu toggle |
| `StatsCard` | Metric display card |
| `DataTable` | Sortable, filterable table |
| `BillingComparisonCard` | Cost comparison display |
| `MigrationCard` | Migration status and controls |
| `PromptEditor` | AI prompt editing interface |

### Insights Components

Located in `components/admin/insights/`:

| Component | Purpose |
|-----------|---------|
| `OverviewTab` | Global settings and stats |
| `AIFeaturesTab` | AI feature configuration |
| `LifeFeedTab` | Post type configuration |

### Migration Components

Located in `components/admin/migrations/`:

| Component | Purpose |
|-----------|---------|
| `MigrationCard` | Migration overview card |
| `MigrationRunHistory` | Historical runs table |
| `ActiveMigrationBanner` | Running migration status |
| `MigrationProgressTracker` | Progress visualization |
| `ConfirmMigrationModal` | Confirmation dialog |

---

## API Reference

For complete endpoint documentation, see [API Reference - Admin](../API_REFERENCE.md#admin).

---

## Related Documentation

- [Insights System](./INSIGHTS_SYSTEM.md) - AI content generation details
- [Database Schema](../DATABASE_SCHEMA.md) - Firestore collections
- [Authentication](../infrastructure/AUTHENTICATION.md) - Auth middleware
- [Services](../SERVICES.md) - Business logic implementation
