# Component Reference

This document catalogs all React components in Personal AI Web.

## Overview

Personal AI Web contains 60+ components organized into categories:

| Category | Count | Directory |
|----------|-------|-----------|
| Auth | 3 | `components/auth/` |
| Chat | 4 | `components/chat/` |
| Dashboard | 10 | `components/dashboard/` |
| Circles | 6 | `components/circles/` |
| Events | 8 | `components/events/` |
| Admin | 12 | `components/admin/` |
| Common | 3 | `components/common/` |
| Create | 8 | `components/create/` |
| Settings | 2 | `components/settings/` |
| Public | 3 | `components/public/` |
| Providers | 3 | Root |

---

## Authentication Components

### AuthProvider

**File**: `components/AuthProvider.tsx`

Firebase auth state sync with Redux.

```typescript
interface Props {
  children: React.ReactNode;
}
```

**Purpose**:
- Listens to Firebase auth state changes
- Fetches full user profile from Firestore
- Syncs with Redux auth slice
- Handles token refresh

### AuthGuard

**File**: `components/auth/AuthGuard.tsx`

Route protection for authenticated users.

```typescript
interface Props {
  children: React.ReactNode;
}
```

**Behavior**:
- Redirects to `/login` if not authenticated
- Shows loading spinner while checking
- Renders children when authenticated

### AdminGuard

**File**: `components/auth/AdminGuard.tsx`

Route protection for admin users.

```typescript
interface Props {
  children: React.ReactNode;
}
```

**Behavior**:
- Extends AuthGuard functionality
- Checks `user.role === 'admin'`
- Redirects to `/dashboard` if not admin

---

## Chat Components

### ChatInput

**File**: `components/chat/ChatInput.tsx`

Message input textarea with send functionality.

```typescript
interface Props {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}
```

**Features**:
- Multiline textarea
- Enter to send, Shift+Enter for newline
- Disabled while loading
- Submit button with loading state

### MessageBubble

**File**: `components/chat/MessageBubble.tsx`

Individual chat message display.

```typescript
interface Props {
  message: ChatMessage;
  isUser: boolean;
}
```

**Features**:
- Role-based styling (user/assistant)
- Avatar display
- Data type badges for sources
- Expandable sources section
- Relevance scores

### TypingIndicator

**File**: `components/chat/TypingIndicator.tsx`

Animated typing dots.

```typescript
// No props required
```

**Animation**: Three bouncing dots with staggered delay.

### EmptyState

**File**: `components/chat/EmptyState.tsx`

Initial chat screen with suggestions.

```typescript
interface Props {
  onQuickAction: (query: string) => void;
}
```

**Displays**:
- SirCharge avatar
- Welcome message
- Quick action buttons
- Example queries
- Data requirements note

---

## Dashboard Components

### QuickThoughtInput

**File**: `components/dashboard/QuickThoughtInput.tsx`

Twitter-style quick thought composer.

```typescript
interface Props {
  userId: string;
  onSuccess: () => void;
}
```

**Features**:
- 280 character limit
- Character counter
- Immediate save
- Auto-refresh for embedding status

### QuickVoiceRecorder

**File**: `components/dashboard/QuickVoiceRecorder.tsx`

Voice recording button.

```typescript
interface Props {
  userId: string;
  onSuccess: () => void;
}
```

### ClickableStatCard

**File**: `components/dashboard/ClickableStatCard.tsx`

Interactive statistics card.

```typescript
interface Props {
  title: string;
  value: number;
  icon: React.ReactNode;
  onClick: () => void;
  hint?: string;
}
```

### HealthDataCard

**File**: `components/dashboard/HealthDataCard.tsx`

Recent health data display.

```typescript
interface Props {
  data: HealthData[];
  onInfoClick: () => void;
}
```

### LocationDataCard

**File**: `components/dashboard/LocationDataCard.tsx`

Recent locations display.

```typescript
interface Props {
  data: LocationData[];
  onInfoClick: () => void;
}
```

### PhotoCard

**File**: `components/dashboard/PhotoCard.tsx`

Photo gallery grid.

```typescript
interface Props {
  photos: PhotoMemory[];
  onUploadClick: () => void;
}
```

### VoiceNoteCard

**File**: `components/dashboard/VoiceNoteCard.tsx`

Voice notes list.

```typescript
interface Props {
  notes: VoiceNote[];
  onConvertToDiary: (note: VoiceNote) => void;
  onCreateClick: () => void;
}
```

### TextNoteCard

**File**: `components/dashboard/TextNoteCard.tsx`

Diary entries list.

```typescript
interface Props {
  notes: TextNote[];
  onCreateClick: () => void;
}
```

### PanelHeader

**File**: `components/dashboard/PanelHeader.tsx`

Reusable panel header.

```typescript
interface Props {
  emoji: string;
  title: string;
  onAction?: () => void;
  onInfo?: () => void;
}
```

### InfoModal

**File**: `components/dashboard/InfoModal.tsx`

Feature information modal.

```typescript
interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
}
```

---

## Circles Components

### CircleCard

**File**: `components/circles/CircleCard.tsx`

Circle preview card.

```typescript
interface Props {
  circle: Circle;
  onClick: () => void;
}
```

### CircleMemberListItem

**File**: `components/circles/CircleMemberListItem.tsx`

Member row with actions.

```typescript
interface Props {
  member: CircleMember;
  isCurrentUser: boolean;
  canManage: boolean;
  onPromote: () => void;
  onDemote: () => void;
  onRemove: () => void;
}
```

### CircleInsightCard

**File**: `components/circles/CircleInsightCard.tsx`

AI-generated insight display.

```typescript
interface Props {
  insight: CircleInsight;
}
```

### CircleChallengeCard

**File**: `components/circles/CircleChallengeCard.tsx`

Challenge progress card.

```typescript
interface Props {
  challenge: CircleChallenge;
  userProgress: number;
}
```

### CircleMessageBubble

**File**: `components/circles/CircleMessageBubble.tsx`

Circle chat message.

```typescript
interface Props {
  message: CircleMessage;
  isCurrentUser: boolean;
}
```

### DataSharingToggles

**File**: `components/circles/DataSharingToggles.tsx`

Data sharing controls.

```typescript
interface Props {
  settings: CircleDataSharing;
  onChange: (settings: CircleDataSharing) => void;
  disabled?: boolean;
}
```

---

## Event Components

### EventCalendar

**File**: `components/events/EventCalendar.tsx`

Full calendar view using react-big-calendar.

```typescript
interface Props {
  events: Event[];
  onSelectEvent: (event: Event) => void;
  onSelectSlot: (slotInfo: SlotInfo) => void;
  view: 'month' | 'week' | 'day' | 'agenda';
  onViewChange: (view: string) => void;
}
```

### EventModal

**File**: `components/events/EventModal.tsx`

Event view/edit/create modal.

```typescript
interface Props {
  event?: Event;
  mode: 'view' | 'edit' | 'create';
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Partial<Event>) => void;
  onDelete?: () => void;
}
```

### EventTooltip

**File**: `components/events/EventTooltip.tsx`

Event quick view tooltip.

```typescript
interface Props {
  event: Event;
  position: { x: number; y: number };
  onClose: () => void;
}
```

### EventSearchBar

**File**: `components/events/EventSearchBar.tsx`

Search and filter controls.

```typescript
interface Props {
  onSearch: (query: string) => void;
  onFilterChange: (filters: EventFilters) => void;
  filters: EventFilters;
}
```

### MiniCalendar

**File**: `components/events/MiniCalendar.tsx`

Compact calendar widget.

```typescript
interface Props {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}
```

### ReminderManager

**File**: `components/events/ReminderManager.tsx`

Reminder configuration UI.

```typescript
interface Props {
  reminders: EventReminder[];
  onAdd: (reminder: EventReminder) => void;
  onRemove: (reminderId: string) => void;
  eventDatetime: Date;
}
```

### TimezoneSelector

**File**: `components/events/TimezoneSelector.tsx`

Timezone dropdown.

```typescript
interface Props {
  value: string;
  onChange: (timezone: string) => void;
}
```

### ConflictWarning

**File**: `components/events/ConflictWarning.tsx`

Conflict indicator.

```typescript
interface Props {
  conflicts: Conflict[];
}
```

---

## Admin Components

### BillingComparisonCard

**File**: `components/admin/BillingComparisonCard.tsx`

Actual vs estimated costs.

```typescript
interface Props {
  data: CombinedBillingData;
  isLoading: boolean;
  onRefresh: () => void;
}
```

### EmojiPicker

**File**: `components/admin/EmojiPicker.tsx`

Searchable emoji selector.

```typescript
interface Props {
  value: string;
  onChange: (emoji: string) => void;
}
```

### ExploreQuestionEditor

**File**: `components/admin/ExploreQuestionEditor.tsx`

Question configuration form.

```typescript
interface Props {
  question?: ExploreQuestion;
  onSave: (question: ExploreQuestion) => void;
  onCancel: () => void;
}
```

### Migration Components

Located in `components/admin/migrations/`:

| Component | Purpose |
|-----------|---------|
| MigrationCard | Migration overview |
| MigrationRunHistory | Run history table |
| ActiveMigrationBanner | Running status |
| MigrationStatusBadge | Status indicator |
| MigrationProgressTracker | Progress bar |
| MigrationDocs | Help documentation |
| MigrationOptionsForm | Config form |
| ConfirmMigrationModal | Confirmation dialog |

---

## Common Components

### Footer

**File**: `components/common/Footer.tsx`

Application footer with version.

```typescript
// No props - uses getVersion() utility
```

### FloatingActionButton

**File**: `components/common/FloatingActionButton.tsx`

FAB with expandable menu.

```typescript
interface Props {
  onAction: (type: CreateType) => void;
}
```

**Actions**: diary, thought, voice, photo

### Toast

**File**: `components/common/Toast.tsx`

Toast notification system.

```typescript
// Connects to toastSlice, no props
```

**Types**: success (green), error (red), info (blue)

---

## Create Components

### QuickCreateModal

**File**: `components/create/QuickCreateModal.tsx`

Modal container for quick create forms.

```typescript
interface Props {
  isOpen: boolean;
  type: CreateType;
  onClose: () => void;
}
```

### QuickThoughtForm

**File**: `components/create/QuickThoughtForm.tsx`

Quick thought form (280 char).

```typescript
interface Props {
  onSubmit: (content: string) => void;
  isSubmitting: boolean;
}
```

### QuickDiaryForm

**File**: `components/create/QuickDiaryForm.tsx`

Diary entry form.

```typescript
interface Props {
  onSubmit: (data: DiaryInput) => void;
  isSubmitting: boolean;
  prefillData?: { title?: string; content?: string };
}
```

### QuickVoiceForm

**File**: `components/create/QuickVoiceForm.tsx`

Voice recording form.

```typescript
interface Props {
  onSubmit: (blob: Blob, duration: number) => void;
  isSubmitting: boolean;
}
```

### QuickPhotoForm

**File**: `components/create/QuickPhotoForm.tsx`

Photo upload form.

```typescript
interface Props {
  onSubmit: (file: File, caption?: string) => void;
  isSubmitting: boolean;
}
```

### DiaryEditor

**File**: `components/create/DiaryEditor.tsx`

Full diary editor with title, content, tags.

### PhotoUploader

**File**: `components/create/PhotoUploader.tsx`

Photo upload with preview.

### VoiceRecorder

**File**: `components/create/VoiceRecorder.tsx`

Voice recording interface.

---

## Settings Components

### NotificationSettings

**File**: `components/settings/NotificationSettings.tsx`

Web push notification controls.

```typescript
interface Props {
  preferences: NotificationPreferences;
  onUpdate: (prefs: NotificationPreferences) => void;
}
```

### StorageUsageCard

**File**: `components/settings/StorageUsageCard.tsx`

Storage usage display.

```typescript
interface Props {
  usage: StorageUsage;
  onRefresh: () => void;
}
```

---

## Public Components

### PublicNav

**File**: `components/public/PublicNav.tsx`

Navigation for public pages.

### PublicFooter

**File**: `components/public/PublicFooter.tsx`

Footer for public pages.

### DocsSidebar

**File**: `components/public/DocsSidebar.tsx`

Documentation sidebar navigation.

---

## Provider Components

### providers.tsx

**File**: `components/providers.tsx`

Main provider setup combining Redux, auth, and other providers.

```typescript
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}
```

### LanguageSwitcher

**File**: `components/LanguageSwitcher.tsx`

Language/locale selection.

---

## Component Patterns

### Client Components

Most components are client components with `'use client'` directive:

```typescript
'use client';

import { useState } from 'react';

export function MyComponent() {
  const [state, setState] = useState();
  // ...
}
```

### Redux Integration

Components use typed hooks:

```typescript
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';

export function MyComponent() {
  const dispatch = useAppDispatch();
  const data = useAppSelector(state => state.slice.data);
}
```

### Dark Mode

All components support dark mode via Tailwind:

```typescript
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
```

### Accessibility

Components include proper ARIA attributes:

```typescript
<button
  aria-label="Close modal"
  aria-expanded={isOpen}
  onClick={onClose}
>
```

### Loading States

Components handle loading with skeletons:

```typescript
if (isLoading) {
  return <div className="animate-pulse bg-gray-200 h-4 rounded" />;
}
```

### Error Handling

Components display errors gracefully:

```typescript
if (error) {
  return (
    <div className="text-red-600 p-4">
      Error: {error}
      <button onClick={retry}>Retry</button>
    </div>
  );
}
```

---

## Related Documentation

- [Feature Documentation](./features/) - Feature-specific components
- [State Management](./infrastructure/STATE_MANAGEMENT.md) - Redux integration
- [Architecture](./ARCHITECTURE.md) - Component architecture
