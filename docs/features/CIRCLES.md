# Circles

This document describes the Social Circles feature in Personal AI Web.

## Overview

Circles are social groups for sharing personal data with close friends and family. Each circle has:

- Group chat with AI assistance
- Shared data visibility
- Member roles and permissions
- Analytics and insights

## Page Locations

| Route | File | Purpose |
|-------|------|---------|
| `/circles` | `app/(dashboard)/circles/page.tsx` | Circle list |
| `/circles/[id]` | `app/(dashboard)/circles/[id]/page.tsx` | Circle detail |
| `/circles/create` | `app/(dashboard)/circles/create/page.tsx` | Create circle |

---

## Circle Concepts

### Circle Types

| Type | Description |
|------|-------------|
| Open | Members can invite others |
| Private | Only creator/admins can invite |

### Member Roles

| Role | Permissions |
|------|-------------|
| Creator | Full control, cannot leave |
| Admin | Invite, remove members, edit settings |
| Member | View shared data, send messages |

### Data Sharing

Each circle has granular data sharing controls:

```typescript
interface CircleDataSharing {
  shareHealth: boolean;      // Steps, workouts, sleep
  shareLocation: boolean;    // Location visits
  shareActivities: boolean;  // Activity tags
  shareVoiceNotes: boolean;  // Voice transcriptions
  sharePhotos: boolean;      // Photo memories
}
```

Members can override circle defaults with personal settings.

---

## Components

### CircleCard

**File**: `components/circles/CircleCard.tsx`

Circle preview in list view.

**Displays**:
- Circle emoji
- Circle name
- Member count
- Last activity timestamp
- Private badge (if private)

### CircleMemberListItem

**File**: `components/circles/CircleMemberListItem.tsx`

Member row in member list.

**Displays**:
- Member avatar
- Display name
- Role badge (Creator/Admin/Member)
- "(You)" indicator for current user
- Actions menu:
  - Promote to Admin
  - Demote to Member
  - Remove from Circle

### CircleInsightCard

**File**: `components/circles/CircleInsightCard.tsx`

AI-generated insights about the circle.

**Insight Types**:

| Type | Color | Icon | Description |
|------|-------|------|-------------|
| pattern | Blue | 📊 | Behavior patterns |
| achievement | Green | 🏆 | Group milestones |
| suggestion | Yellow | 💡 | Activity suggestions |

**Displays**:
- Insight type badge
- Title
- Description
- Confidence meter (0-100%)

### CircleChallengeCard

**File**: `components/circles/CircleChallengeCard.tsx`

Group challenge progress card.

**Challenge Types**:
- Steps (daily/weekly)
- Distance (walking/running)
- Duration (activity time)
- Frequency (workout count)

**Displays**:
- Challenge name
- Goal amount
- Your progress bar
- Status badge (active/completed/upcoming)
- Days remaining
- Leaderboard rank

### CircleMessageBubble

**File**: `components/circles/CircleMessageBubble.tsx`

Message in circle group chat.

**Message Types**:
- Text: Regular messages
- Voice: Audio messages with transcription
- System: Join/leave notifications

### DataSharingToggles

**File**: `components/circles/DataSharingToggles.tsx`

Toggle controls for data sharing settings.

---

## Features

### Circle Creation

**Route**: `/circles/create`

**Steps**:
1. Enter circle name
2. Select emoji
3. Choose circle type (open/private)
4. Configure data sharing defaults
5. Invite initial members
6. Create circle

**API**: `POST /api/circles`

### Group Chat

Circle members can chat with AI assistance.

**Features**:
- Text messages
- Voice messages (with transcription)
- AI responses using shared context
- Message reactions (emoji)
- System notifications

**AI Context**:
The RAG engine queries shared data from all members:

```typescript
// RAGEngine.server.ts
async queryCircleContext(
  userMessage: string,
  circleId: string,
  userId: string
): Promise<RAGResponse> {
  // Get all member IDs
  const members = await getCircleMembers(circleId);
  const memberIds = members.map(m => m.userId);

  // Query Pinecone with multi-user filter
  const results = await pinecone.query({
    vector: embedding,
    filter: { userId: { $in: memberIds } },
    topK: 10,
  });

  // Build context from shared data
  // Respect data sharing settings
  // ...
}
```

### Invitations

**Sending**:
1. Click "Invite" button
2. Select friend from list
3. Add optional message
4. Send invitation

**Receiving**:
- Invites appear on circles page
- Accept to join circle
- Reject to decline
- Expires after 30 days

**API Endpoints**:
- `POST /api/circles/[id]/invite`
- `GET /api/circles/invites`
- `POST /api/circles/invites/[id]/accept`
- `POST /api/circles/invites/[id]/reject`

### Member Management

**Actions** (Creator/Admin only):

| Action | Description |
|--------|-------------|
| Promote | Member → Admin |
| Demote | Admin → Member |
| Remove | Remove from circle with reason |

**API Endpoints**:
- `GET /api/circles/[id]/members`
- `PATCH /api/circles/[id]/members/[userId]/role`
- `DELETE /api/circles/[id]/members/[userId]`

### Circle Analytics

**Route**: `/circles/[id]/analytics`

**Displays**:
- Total activities
- Total messages
- Active member count
- Active/completed challenges
- Top contributors
- AI-generated insights
- Peak activity times

**API**: `GET /api/circles/[id]/analytics`

---

## State Management

### circleSlice

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
    messages: { [circleId: string]: LoadingStatus };
    invites: LoadingStatus;
    analytics: { [circleId: string]: LoadingStatus };
  };
}
```

### Key Actions

| Category | Actions |
|----------|---------|
| Circles | `fetchCircles`, `createCircle`, `updateCircle`, `deleteCircle`, `leaveCircle` |
| Invites | `inviteToCircle`, `fetchCircleInvites`, `acceptCircleInvite`, `rejectCircleInvite` |
| Members | `fetchCircleMembers`, `updateMemberRole`, `removeMember` |
| Messages | `sendCircleMessage`, `fetchCircleMessages`, `deleteMessage`, `addReaction` |
| Analytics | `fetchCircleAnalytics` |

---

## Data Models

### Circle

```typescript
interface Circle {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  createdBy: string;
  memberIds: string[];
  type: 'open' | 'private';
  dataSharing: CircleDataSharing;
  settings: CircleSettings;
  createdAt: string;
  updatedAt: string;
}
```

### CircleMember

```typescript
interface CircleMember {
  id: string;                    // {circleId}_{userId}
  circleId: string;
  userId: string;
  role: 'creator' | 'admin' | 'member';
  joinedAt: string;
  invitedBy: string;
  personalDataSharing?: CircleDataSharing;
  status: 'active' | 'left' | 'removed';
}
```

### CircleMessage

```typescript
interface CircleMessage {
  id: string;
  circleId: string;
  userId: string;
  content: string;
  type: 'text' | 'voice' | 'system';
  voiceNoteUrl?: string;
  voiceNoteDuration?: number;
  contextUsed?: ContextReference[];
  isAIResponse?: boolean;
  createdAt: string;
  reactions: Reaction[];
}
```

---

## Security

### Access Control

All circle operations verify membership:

```typescript
// Verify user is member
const member = await getCircleMember(circleId, userId);
if (!member || member.status !== 'active') {
  throw new Error('Not a member of this circle');
}

// Verify admin role for admin actions
if (member.role !== 'creator' && member.role !== 'admin') {
  throw new Error('Admin access required');
}
```

### Data Isolation

Shared data respects individual privacy settings:

```typescript
// Filter data based on sharing settings
function filterSharedData(data: any[], member: CircleMember) {
  const sharing = member.personalDataSharing || circle.dataSharing;

  return data.filter(item => {
    switch (item.type) {
      case 'health': return sharing.shareHealth;
      case 'location': return sharing.shareLocation;
      case 'voice': return sharing.shareVoiceNotes;
      case 'photo': return sharing.sharePhotos;
      default: return sharing.shareActivities;
    }
  });
}
```

---

## API Reference

See [API Reference - Circles](../API_REFERENCE.md#circles-social-groups) for complete endpoint documentation.

---

## Related Documentation

- [Database Schema - Circles](../DATABASE_SCHEMA.md#social-features)
- [Services - CircleService](../SERVICES.md#circleservice)
- [Chat & RAG](./CHAT_RAG.md) - AI chat in circles
