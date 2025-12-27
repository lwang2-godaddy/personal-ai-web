# Feature Roadmap - Personal AI Web Dashboard

---
**Created By:** Claude Sonnet 4.5
**Created Date:** December 26, 2025
**Last Updated:** December 26, 2025
**Status:** Draft - Awaiting Prioritization
**Purpose:** Comprehensive feature roadmap with priority recommendations
**Related Docs:** `CLAUDE.md`, `README.md`
---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Priority Framework](#priority-framework)
3. [Top 5 Recommended Features](#top-5-recommended-features)
4. [All Features by Category](#all-features-by-category)
5. [Implementation Tracking](#implementation-tracking)
6. [Decision Framework](#decision-framework)

---

## Executive Summary

This document outlines 37 potential features for the Personal AI Web Dashboard, categorized by type and prioritized by impact, effort, and strategic value.

**Current State (v0.1.0):**
- ✅ Text notes (diary + quick thoughts)
- ✅ Voice notes with transcription
- ✅ Photo upload with location
- ✅ RAG-powered AI chatbot
- ✅ Dashboard with stats
- ✅ Google Sign-In authentication

**Key Differentiators:**
1. Multi-modal personal data collection (text, voice, photo, location)
2. RAG chatbot with access to personal context
3. Embeddings-based semantic search via Pinecone

**Strategic Direction Choices:**

| Focus Area | Features to Prioritize |
|------------|----------------------|
| **User Acquisition** | Sharing, public profiles, viral features |
| **Retention** | Insights, notifications, gamification, daily summaries |
| **Monetization** | Premium features, API access, enterprise |
| **Differentiation** | AI insights, predictive features, multi-modal analytics |

---

## Priority Framework

Each feature is rated on three dimensions:

### Impact (1-5 stars)
- ⭐ Minimal impact
- ⭐⭐ Nice to have
- ⭐⭐⭐ Useful for subset of users
- ⭐⭐⭐⭐ High value for most users
- ⭐⭐⭐⭐⭐ Game-changer, core value proposition

### Effort (T-shirt sizing)
- **XS** - Few hours (1-4 hours)
- **S** - 1-2 days
- **M** - 3-5 days
- **L** - 1-2 weeks
- **XL** - 2-4 weeks
- **XXL** - 1+ months

### Strategic Value
- 🎯 **Core** - Essential to product vision
- 💰 **Revenue** - Direct monetization potential
- 📈 **Growth** - Helps user acquisition
- 🔒 **Retention** - Increases engagement/stickiness
- 🏆 **Differentiation** - Unique competitive advantage

---

## Top 5 Recommended Features

### 🥇 #1: Smart Search with Filters
**Impact:** ⭐⭐⭐⭐⭐ | **Effort:** M (3-5 days) | **Value:** 🎯 Core + 🔒 Retention

**Why it's #1:**
- Users will accumulate hundreds of notes/photos - need findability
- Low technical complexity (Firestore queries + UI)
- High perceived value (users notice immediately)
- Foundation for future features (saved searches, search analytics)

**Implementation:**
```typescript
// New component: SearchBar with filters
- Text search (Firestore full-text or Algolia)
- Filter by: date range, data type, tags, location
- Sort by: relevance, date, location
- Save common searches (store in user preferences)
```

**Success Metrics:**
- 40%+ of active users use search weekly
- Average time to find content reduces by 60%

**Status:** ⬜ Not Started

---

### 🥈 #2: Daily/Weekly AI Summaries
**Impact:** ⭐⭐⭐⭐⭐ | **Effort:** M (4-5 days) | **Value:** 🏆 Differentiation + 🔒 Retention + 💰 Revenue

**Why it's #2:**
- Showcases AI capabilities (justifies "AI" in product name)
- Passive engagement (users see value without effort)
- Natural premium feature (limit free tier to weekly, paid gets daily)
- Email delivery = re-engagement channel

**Implementation:**
```typescript
// Cloud Function: generateDailySummary (scheduled)
1. Fetch user's data from past 24 hours
2. Build context from all activities
3. GPT-4o prompt: "Summarize this user's day in 3-4 sentences"
4. Store in summaries collection
5. Send email notification (optional)
6. Display on dashboard
```

**Example Output:**
> "Today you wrote 2 diary entries reflecting on your morning run. You visited Whole Foods and your favorite coffee shop (visit #23). You recorded a voice note about weekend plans and uploaded 3 photos from the park. Overall, an active day with good energy!"

**Success Metrics:**
- 30%+ users read summaries within 24 hours
- 15%+ users enable email summaries
- Premium conversion: highlight as premium feature

**Status:** ⬜ Not Started

---

### 🥉 #3: Personal Analytics Dashboard
**Impact:** ⭐⭐⭐⭐ | **Effort:** L (1-2 weeks) | **Value:** 🏆 Differentiation + 📈 Growth

**Why it's #3:**
- Visual appeal (shareable screenshots = marketing)
- Gamification (encourages data collection)
- Demonstrates value of accumulated data
- Justifies premium tier (advanced analytics)

**Implementation:**
```typescript
// New page: /analytics with visualizations
- Activity heatmap (contributions-style calendar)
- Location map with pins (Google Maps API)
- Word cloud from diary entries (wordcloud library)
- Charts: voice notes over time, photos per month
- Mood trend analysis (sentiment from text)
- Tag usage chart
```

**Charts to Include:**
1. **Activity Heatmap** - Daily contributions (like GitHub)
2. **Location Heatmap** - Most visited places
3. **Word Cloud** - Most used words in diary
4. **Time Series** - Notes/photos/voice over time
5. **Tag Analysis** - Most used tags, tag correlations
6. **Mood Trends** - Sentiment analysis over time

**Premium Features:**
- Export charts as images
- Custom date ranges
- Compare periods (this month vs last)
- Predictive trends

**Success Metrics:**
- 25%+ users visit analytics page
- 10%+ users share analytics screenshots
- Social media mentions increase

**Status:** ⬜ Not Started

---

### 4️⃣ #4: Progressive Web App (PWA)
**Impact:** ⭐⭐⭐⭐ | **Effort:** S (1-2 days) | **Value:** 🔒 Retention + 📈 Growth

**Why it's #4:**
- Mobile users = 60%+ of web traffic
- Native-like experience without app store
- Offline support increases reliability
- Push notifications = re-engagement

**Implementation:**
```typescript
// Already using Next.js - just need manifest.json + service worker
1. Create public/manifest.json
2. Add service worker for offline caching
3. Add "Add to Home Screen" prompt
4. Configure push notifications (Firebase Cloud Messaging)
```

**PWA Features:**
- Install as app on mobile/desktop
- Offline mode (cache dashboard, recent notes)
- Push notifications (daily summaries, reminders)
- Badge count (unread summaries)

**Success Metrics:**
- 20%+ mobile users install PWA
- Session length increases 40% for PWA users
- Daily active users increase 25%

**Status:** ⬜ Not Started

---

### 5️⃣ #5: Tiered Pricing with Predictive Insights
**Impact:** ⭐⭐⭐⭐⭐ | **Effort:** L (1-2 weeks) | **Value:** 💰 Revenue + 🏆 Differentiation

**Why it's #5:**
- Monetization = sustainability
- Predictive insights leverage your AI moat
- Already have subscription infrastructure in code
- Premium features justify conversion

**Pricing Tiers:**

| Feature | Free | Premium ($9/mo) | Pro ($19/mo) |
|---------|------|-----------------|--------------|
| Text notes | 100 | Unlimited | Unlimited |
| Photos | 25 | Unlimited | Unlimited |
| Voice notes (min) | 30 | Unlimited | Unlimited |
| Chat questions/day | 10 | 100 | Unlimited |
| Daily summaries | ❌ | ✅ | ✅ |
| Predictive insights | ❌ | ✅ | ✅ |
| Advanced analytics | ❌ | ✅ | ✅ |
| Data export | JSON | JSON, CSV, PDF | All + API |
| API access | ❌ | ❌ | ✅ |
| Priority support | ❌ | ✅ | ✅ |
| Custom integrations | ❌ | ❌ | ✅ |

**Predictive Insights (Premium Feature):**
```typescript
// Cloud Function: generatePredictiveInsights (daily)
Examples:
- "You usually work out on Tuesdays, but skipped this week"
- "Based on patterns, you might enjoy Thai food on Friday"
- "Your productivity peaks between 9-11am - schedule important tasks then"
- "You haven't visited [favorite coffee shop] in 2 weeks"
```

**Implementation:**
- Use existing subscription management (RevenueCat webhooks)
- Add usage limits checks in middleware
- Paywall UI components
- Stripe integration for payments

**Success Metrics:**
- 5% free-to-premium conversion in first 3 months
- 10% free-to-premium conversion at 6 months
- $15 average revenue per paying user (ARPU)

**Status:** ⬜ Not Started

---

## All Features by Category

### 🎯 Quick Wins (High Impact, Low Effort)

#### ✅ Feature 1: Smart Search with Filters
**Impact:** ⭐⭐⭐⭐⭐ | **Effort:** M | **Value:** 🎯 Core + 🔒 Retention

**Description:** Full-text search across all data types with filters for date, location, tags, and data type.

**User Story:** "As a user with 200+ notes, I want to quickly find entries about 'Paris vacation' from last summer."

**Technical Details:**
- Firestore `where()` + `orderBy()` queries
- OR: Integrate Algolia for better full-text search
- UI: Search bar in nav, filters sidebar
- Save searches in user preferences collection

**Dependencies:** None

**Status:** ⬜ Not Started

**Notes:** See "Top 5 Recommended" section for full details.

---

#### ✅ Feature 2: Dark Mode
**Impact:** ⭐⭐⭐ | **Effort:** XS (2-4 hours) | **Value:** 🔒 Retention

**Description:** Dark theme option with auto-switch based on system preference or time of day.

**User Story:** "As a user who journals at night, I want dark mode to reduce eye strain."

**Technical Details:**
- Already using Tailwind CSS (has dark mode support)
- Add `dark:` variants to all components
- Toggle in settings page
- Store preference in Redux auth state
- Auto-detect system preference with `prefers-color-scheme`

**Implementation:**
```typescript
// tailwind.config.ts
module.exports = {
  darkMode: 'class', // or 'media' for system preference
  // ...
}

// Toggle component
const [isDark, setIsDark] = useState(false);
useEffect(() => {
  if (isDark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
}, [isDark]);
```

**Dependencies:** None

**Status:** ⬜ Not Started

---

#### ✅ Feature 3: Keyboard Shortcuts
**Impact:** ⭐⭐⭐ | **Effort:** S (1 day) | **Value:** 🔒 Retention

**Description:** Keyboard shortcuts for common actions (create note, search, voice record).

**User Story:** "As a power user, I want to press Ctrl+N to quickly create a note without clicking."

**Shortcuts:**
- `Ctrl/Cmd + N` - New diary entry
- `Ctrl/Cmd + K` - Focus search
- `Ctrl/Cmd + R` - Start voice recording
- `Ctrl/Cmd + U` - Upload photo
- `Ctrl/Cmd + /` - Show shortcuts help
- `Esc` - Close modals

**Technical Details:**
- Use `react-hotkeys-hook` library
- Add help modal (`?` key shows all shortcuts)
- Visual indicators (show shortcut in button tooltips)

**Dependencies:** None

**Status:** ⬜ Not Started

---

#### ✅ Feature 4: Drag & Drop Photo Upload
**Impact:** ⭐⭐⭐ | **Effort:** S (1 day) | **Value:** 🔒 Retention

**Description:** Drag photos directly onto dashboard to upload. Support batch upload.

**User Story:** "As a user returning from vacation with 50 photos, I want to drag them all at once."

**Technical Details:**
- Use `react-dropzone` library
- Extract EXIF data (location, date) from photos
- Show upload progress for batch
- Auto-generate descriptions via GPT-4 Vision

**Implementation:**
```typescript
import { useDropzone } from 'react-dropzone';

const { getRootProps, getInputProps } = useDropzone({
  accept: { 'image/*': ['.jpg', '.jpeg', '.png'] },
  multiple: true,
  onDrop: async (files) => {
    // Batch upload with progress tracking
    for (const file of files) {
      await dispatch(uploadPhoto(file));
    }
  }
});
```

**Dependencies:** None

**Status:** ⬜ Not Started

---

### 🤖 AI-Powered Features

#### ✅ Feature 5: Daily/Weekly AI Summaries
**Impact:** ⭐⭐⭐⭐⭐ | **Effort:** M | **Value:** 🏆 Differentiation + 💰 Revenue + 🔒 Retention

**Status:** ⬜ Not Started

**Notes:** See "Top 5 Recommended" section for full details.

---

#### ✅ Feature 6: Memory Reminders ("On This Day")
**Impact:** ⭐⭐⭐⭐ | **Effort:** M (3-5 days) | **Value:** 🔒 Retention

**Description:** Show memories from 1 year ago, 2 years ago, etc. on dashboard and via notifications.

**User Story:** "As a user, I want to be reminded of what I was doing exactly 1 year ago today."

**Technical Details:**
- Cloud Function (scheduled daily)
- Query Firestore for notes created 1/2/5 years ago on this date
- Show on dashboard "On This Day" widget
- Optional: Push notification with memory preview
- Group memories by year

**Implementation:**
```typescript
// Cloud Function
const today = new Date();
const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

const memories = await firestore
  .collection('textNotes')
  .where('userId', '==', userId)
  .where('createdAt', '>=', oneYearAgo.toISOString())
  .where('createdAt', '<', new Date(oneYearAgo.getTime() + 86400000).toISOString())
  .get();
```

**Dependencies:** Push notifications (Feature 4: PWA)

**Status:** ⬜ Not Started

---

#### ✅ Feature 7: Smart Auto-Tagging
**Impact:** ⭐⭐⭐⭐ | **Effort:** M (4-5 days) | **Value:** 🏆 Differentiation + 🔒 Retention

**Description:** AI suggests tags based on content. Auto-tag photos and voice notes.

**User Story:** "As a user who writes 'went to the gym', I want the app to suggest #fitness #workout tags."

**Technical Details:**
- Use GPT-4o to extract topics/entities from text
- For photos: Use GPT-4 Vision to detect objects/scenes
- Show suggested tags in UI (click to add)
- Learn from user's accepted suggestions

**Implementation:**
```typescript
// Extract tags from text
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{
    role: 'user',
    content: `Extract 3-5 relevant tags from this text. Return as comma-separated list:\n\n${text}`
  }]
});

const suggestedTags = response.choices[0].message.content.split(',').map(t => t.trim());
```

**Cost Considerations:**
- ~$0.003 per note (100 tokens)
- Limit to premium users, or process async

**Dependencies:** None

**Status:** ⬜ Not Started

---

#### ✅ Feature 8: Mood Tracking & Sentiment Analysis
**Impact:** ⭐⭐⭐⭐ | **Effort:** M (3-5 days) | **Value:** 🏆 Differentiation + 💰 Revenue

**Description:** Analyze sentiment from diary entries. Show mood trends over time.

**User Story:** "As a user journaling about my mental health, I want to see if my mood is improving."

**Technical Details:**
- Run sentiment analysis on text notes (positive/neutral/negative)
- Use GPT-4o or specialized sentiment API (cheaper)
- Store mood score (-1 to +1) with each note
- Visualize on analytics dashboard (line chart)
- Correlate mood with activities/locations

**Sentiment Scale:**
- -1.0 to -0.5: Very negative 😢
- -0.5 to -0.2: Somewhat negative 😕
- -0.2 to +0.2: Neutral 😐
- +0.2 to +0.5: Somewhat positive 🙂
- +0.5 to +1.0: Very positive 😄

**Privacy Considerations:**
- Make opt-in (some users may not want this)
- Never share mood data
- Allow users to delete mood history

**Dependencies:** Feature 3 (Analytics Dashboard) for visualization

**Status:** ⬜ Not Started

---

#### ✅ Feature 9: Question Suggestions
**Impact:** ⭐⭐⭐⭐ | **Effort:** M (3-4 days) | **Value:** 🔒 Retention + 🏆 Differentiation

**Description:** Based on user's data, suggest interesting questions they can ask the RAG chatbot.

**User Story:** "As a new user, I don't know what to ask. Suggestions would help me discover features."

**Examples:**
- "How many times did I visit Starbucks this month?"
- "What were my most productive days?"
- "Show me photos from my last vacation"
- "What activities do I do most on weekends?"
- "When do I usually work out?"

**Technical Details:**
- Analyze user's data to detect patterns
- Generate personalized suggestions (not generic)
- Show 3-5 questions on chat page
- Rotate daily
- Track which suggestions users click (learn preferences)

**Implementation:**
```typescript
// Cloud Function: generateQuestionSuggestions (daily)
1. Analyze user's data types (has photos? locations? health data?)
2. Detect patterns (frequent locations, regular activities)
3. Generate 10 questions via GPT-4o
4. Store in suggestions collection
5. Display 3-5 randomly on chat page
```

**Dependencies:** None

**Status:** ⬜ Not Started

---

#### ✅ Feature 10: Predictive Insights
**Impact:** ⭐⭐⭐⭐⭐ | **Effort:** L (1-2 weeks) | **Value:** 🏆 Differentiation + 💰 Revenue

**Status:** ⬜ Not Started

**Notes:** See "Top 5 Recommended" section (Feature #5) for full details. This is a PREMIUM feature.

---

### 📊 Analytics & Visualization

#### ✅ Feature 11: Personal Analytics Dashboard
**Impact:** ⭐⭐⭐⭐ | **Effort:** L | **Value:** 🏆 Differentiation + 📈 Growth

**Status:** ⬜ Not Started

**Notes:** See "Top 5 Recommended" section for full details.

---

#### ✅ Feature 12: Goal Tracking
**Impact:** ⭐⭐⭐⭐ | **Effort:** L (1-2 weeks) | **Value:** 🔒 Retention + 💰 Revenue

**Description:** Set goals (e.g., "Exercise 3x/week"). AI verifies completion from data.

**User Story:** "As a user, I want to set a goal to write daily and track my progress."

**Goal Types:**
- **Frequency:** "Write 5 diary entries per week"
- **Activity:** "Go to gym 3x per week"
- **Consistency:** "Record voice note daily for 30 days"
- **Volume:** "Upload 50 photos this month"

**Technical Details:**
- Goals stored in Firestore `goals` collection
- Cloud Function checks progress daily
- AI verifies from data (e.g., check textNotes for "gym" mentions)
- Show progress bar on dashboard
- Celebrate milestones (confetti animation!)

**Premium Feature:**
- Free: 3 active goals max
- Premium: Unlimited goals + AI suggestions

**Dependencies:** None

**Status:** ⬜ Not Started

---

#### ✅ Feature 13: Health Data Visualization
**Impact:** ⭐⭐⭐ | **Effort:** M (3-5 days) | **Value:** 🔒 Retention

**Description:** Charts for health data (steps, workouts, sleep, heart rate).

**User Story:** "As a fitness enthusiast, I want to see my step count trend over the past month."

**Charts:**
- Steps over time (line chart)
- Workouts per week (bar chart)
- Sleep duration trend (area chart)
- Heart rate zones (stacked chart)

**Technical Details:**
- Use Chart.js or Recharts library
- Fetch from healthData collection
- Allow date range selection
- Compare periods (this month vs last)

**Note:** Currently health data is collected in mobile app only. Need to add web collection or import from mobile.

**Dependencies:** Health data collection (not yet in web app)

**Status:** 🔒 Blocked (requires health data in web app)

---

#### ✅ Feature 14: Timeline View
**Impact:** ⭐⭐⭐⭐ | **Effort:** M (4-5 days) | **Value:** 🏆 Differentiation + 🔒 Retention

**Description:** Visual timeline of all activities, like Facebook Timeline or Apple Photos.

**User Story:** "As a user, I want to scroll through my life chronologically and see all my memories."

**Design:**
- Vertical timeline with date markers
- Group by day/week/month (toggle)
- Mix all data types: photos, notes, voice notes
- Infinite scroll (paginated)
- Click item to expand/edit

**Technical Details:**
- Fetch from all collections, merge by date
- Use react-infinite-scroll-component
- Show thumbnails for photos, snippets for text
- Lazy load content (performance)

**Implementation:**
```typescript
// Fetch timeline data
const [notes, photos, voice] = await Promise.all([
  getTextNotes(userId, 50),
  getPhotoMemories(userId, 50),
  getVoiceNotes(userId, 50),
]);

// Merge and sort by date
const timeline = [...notes, ...photos, ...voice]
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
```

**Dependencies:** None

**Status:** ⬜ Not Started

---

### 🌐 Social & Sharing

#### ✅ Feature 15: Selective Sharing
**Impact:** ⭐⭐⭐ | **Effort:** M (4-5 days) | **Value:** 📈 Growth

**Description:** Share specific memories with friends/family via public link.

**User Story:** "As a user, I want to share my Paris vacation photos with my family without giving them full account access."

**Features:**
- Generate public link for specific note/photo
- Set expiration (24h, 7d, 30d, never)
- Password protection (optional)
- View count tracking
- Revoke link anytime

**Technical Details:**
- Create `sharedLinks` collection in Firestore
- Public route: `/shared/:linkId`
- No authentication required for public links
- Increment view count on access

**Privacy:**
- Default: sharing disabled (user must opt-in)
- Watermark with username (optional)
- Don't share location/metadata unless explicitly enabled

**Dependencies:** None

**Status:** ⬜ Not Started

---

#### ✅ Feature 16: Collaborative Memories
**Impact:** ⭐⭐⭐ | **Effort:** L (1-2 weeks) | **Value:** 📈 Growth + 🔒 Retention

**Description:** Invite others to contribute to shared events (e.g., "Trip to Paris").

**User Story:** "As a user who traveled with friends, I want everyone to add their photos to our shared 'Paris Trip' album."

**Features:**
- Create shared event/album
- Invite collaborators via email
- All contributors can add photos/notes
- Timeline view of contributions
- Comment/react on entries

**Technical Details:**
- New collection: `sharedEvents`
- Track participants array (userIds)
- Firestore rules allow read/write for participants
- Real-time updates (Firestore listeners)

**Monetization:**
- Free: 1 active shared event
- Premium: Unlimited shared events

**Dependencies:** None

**Status:** ⬜ Not Started

---

#### ✅ Feature 17: Public Profile (Blog Mode)
**Impact:** ⭐⭐ | **Effort:** L (1-2 weeks) | **Value:** 📈 Growth

**Description:** Public blog view of selected diary entries with custom domain support.

**User Story:** "As a writer, I want to publish select diary entries as blog posts on my personal domain."

**Features:**
- Mark diary entries as "public"
- Custom subdomain: `username.personal-ai.com`
- OR custom domain: `blog.yourdomain.com`
- RSS feed for readers
- SEO optimization (meta tags)

**Monetization:**
- Free: username.personal-ai.com subdomain
- Premium: Custom domain support

**Dependencies:** DNS management, subdomain routing

**Status:** ⬜ Not Started

---

### 📱 Mobile & Platform

#### ✅ Feature 18: Progressive Web App (PWA)
**Impact:** ⭐⭐⭐⭐ | **Effort:** S | **Value:** 🔒 Retention + 📈 Growth

**Status:** ⬜ Not Started

**Notes:** See "Top 5 Recommended" section for full details.

---

#### ✅ Feature 19: Browser Extension
**Impact:** ⭐⭐⭐ | **Effort:** L (1-2 weeks) | **Value:** 🔒 Retention

**Description:** Quick capture from any webpage. Save quotes, articles, screenshots to diary.

**User Story:** "As a user reading an article, I want to save an interesting quote to my diary without leaving the page."

**Features:**
- Highlight text → right-click → "Save to Personal AI"
- Screenshot current page → save to photos
- Clip entire article → save as note
- Add tags before saving

**Technical Details:**
- Chrome extension (manifest v3)
- Firefox extension (same codebase)
- Use Chrome Storage API for temp storage
- Authenticate with Firebase ID token
- Background script posts to API

**Browser Support:**
- Chrome/Edge (Chromium)
- Firefox
- Safari (requires separate build)

**Dependencies:** API routes for quick capture

**Status:** ⬜ Not Started

---

#### ✅ Feature 20: Email-to-Diary
**Impact:** ⭐⭐⭐ | **Effort:** M (4-5 days) | **Value:** 🔒 Retention

**Description:** Forward emails to special address (e.g., `user123@diary.personal-ai.com`) to save as diary entry.

**User Story:** "As a user, I want to forward interesting emails (receipts, confirmations) to my diary."

**Technical Details:**
- Use SendGrid Inbound Parse or Mailgun
- Cloud Function processes incoming emails
- Extract: subject → title, body → content, attachments → photos
- Authenticate via unique email address per user

**Implementation:**
```typescript
// Cloud Function: processInboundEmail
1. Verify sender email matches user's registered email
2. Parse email (subject, body, attachments)
3. Create text note from body
4. Upload attachments as photos
5. Send confirmation email
```

**Security:**
- Rate limit (max 10 emails/day to prevent spam)
- Only accept from verified sender email
- Reject if attachment too large (>10MB)

**Dependencies:** Email service (SendGrid/Mailgun)

**Status:** ⬜ Not Started

---

### 🎨 UX Enhancements

#### ✅ Feature 21: Rich Text Editor
**Impact:** ⭐⭐⭐⭐ | **Effort:** M (3-5 days) | **Value:** 🔒 Retention

**Description:** Markdown support for diary entries. Inline photos, code blocks, lists.

**User Story:** "As a user writing long diary entries, I want formatting options (bold, lists, headings)."

**Features:**
- Markdown syntax (headings, bold, italic, lists, links)
- Code syntax highlighting (for technical users)
- Embed photos inline
- Tables
- Preview mode (side-by-side or toggle)

**Technical Details:**
- Use Lexical (by Meta) or TipTap editor
- Store as markdown in Firestore
- Render with react-markdown
- Syntax highlighting with prismjs

**Dependencies:** None

**Status:** ⬜ Not Started

---

#### ✅ Feature 22: Voice-to-Diary
**Impact:** ⭐⭐⭐⭐ | **Effort:** S (1-2 days) | **Value:** 🔒 Retention

**Description:** Convert voice notes to diary entries automatically.

**User Story:** "As a user who records voice notes while driving, I want them automatically transcribed to diary entries."

**Technical Details:**
- Already have voice recording + Whisper transcription
- Add option: "Convert to diary entry" on voice note preview
- Pre-fill diary form with transcription
- User can edit before saving
- Link voice note to diary entry (reference)

**Implementation:**
```typescript
// In QuickVoiceRecorder component
<button onClick={convertToDiary}>
  Convert to Diary Entry
</button>

function convertToDiary() {
  router.push({
    pathname: '/diary/new',
    query: { prefill: transcription }
  });
}
```

**Dependencies:** None (already have voice recording)

**Status:** ⬜ Not Started

---

#### ✅ Feature 23: Diary Entry Templates
**Impact:** ⭐⭐⭐ | **Effort:** S (1-2 days) | **Value:** 🔒 Retention

**Description:** Pre-built templates for common entry types (daily reflection, gratitude, dream journal).

**User Story:** "As a new user, I don't know what to write. A template would help me start."

**Templates:**
1. **Daily Reflection**
   - What went well today?
   - What could have gone better?
   - What am I grateful for?
   - Tomorrow's priorities

2. **Gratitude Journal**
   - 3 things I'm grateful for today:
   - Why each matters to me:
   - How did this make me feel?

3. **Dream Journal**
   - Last night I dreamed about:
   - Emotions I felt:
   - Interpretation/meaning:

4. **Weekly Review**
   - Wins this week:
   - Challenges:
   - Lessons learned:
   - Next week's goals:

5. **Custom** (users can create own templates)

**Technical Details:**
- Store templates in Firestore `templates` collection
- User can edit/delete default templates
- Create custom templates (premium feature)
- Template picker on diary entry page

**Dependencies:** None

**Status:** ⬜ Not Started

---

### 🔗 Integrations

#### ✅ Feature 24: Calendar Integration
**Impact:** ⭐⭐⭐⭐ | **Effort:** L (1-2 weeks) | **Value:** 🏆 Differentiation

**Description:** Sync with Google/Apple Calendar. Show events on timeline. RAG can answer calendar questions.

**User Story:** "As a user, I want to ask 'What meetings did I have last week?' and get accurate answers."

**Features:**
- OAuth with Google Calendar API
- Import events to Firestore
- Show on timeline view
- RAG can query calendar data
- Two-way sync (optional)

**Technical Details:**
```typescript
// Google Calendar API
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
const events = await calendar.events.list({
  calendarId: 'primary',
  timeMin: (new Date()).toISOString(),
  maxResults: 100,
  singleEvents: true,
  orderBy: 'startTime',
});

// Store in calendarEvents collection
// Generate embedding for each event (for RAG)
```

**Privacy:**
- Explicit permission required
- User can disconnect anytime
- Show which calendar data is being used

**Dependencies:** OAuth setup

**Status:** ⬜ Not Started

---

#### ✅ Feature 25: Fitness App Integration
**Impact:** ⭐⭐⭐ | **Effort:** XL (3-4 weeks) | **Value:** 🏆 Differentiation

**Description:** Import from Apple Health, Google Fit, Strava, Fitbit.

**User Story:** "As a runner using Strava, I want my runs automatically imported to Personal AI."

**Data to Import:**
- Workouts (type, duration, distance, calories)
- Steps, heart rate, sleep
- Routes (GPS data)

**Technical Details:**
- Already partially implemented in mobile app
- Need web OAuth flows for each service
- Scheduled import (Cloud Function runs daily)
- Deduplication logic

**APIs Required:**
- Apple HealthKit (iOS only, need mobile app)
- Google Fit API
- Strava API
- Fitbit API

**Effort Breakdown:**
- Google Fit: 3-4 days
- Strava: 3-4 days
- Fitbit: 3-4 days
- Testing/debugging: 1 week

**Dependencies:** OAuth setup for each service

**Status:** ⬜ Not Started

---

#### ✅ Feature 26: Note-Taking App Import
**Impact:** ⭐⭐⭐ | **Effort:** L (1-2 weeks) | **Value:** 📈 Growth

**Description:** One-time import from Notion, Evernote, OneNote, Roam Research.

**User Story:** "As a Notion user, I want to migrate my 500 notes to Personal AI without manual copying."

**Supported Formats:**
- Notion export (ZIP with markdown files)
- Evernote export (.enex files)
- OneNote notebooks (via API)
- Roam Research (JSON export)
- Plain markdown files

**Technical Details:**
- File upload page: `/import`
- Parse each format (different libraries)
- Show preview before import
- Map tags, dates, attachments
- Background job (Cloud Function) for large imports

**Implementation:**
```typescript
// Parse Notion export (markdown files)
const files = await extractZip(zipFile);
for (const file of files) {
  if (file.endsWith('.md')) {
    const content = await readFile(file);
    const metadata = extractFrontmatter(content); // YAML frontmatter
    await createTextNote({
      title: metadata.title,
      content: stripFrontmatter(content),
      tags: metadata.tags,
      createdAt: metadata.date,
    });
  }
}
```

**Dependencies:** None

**Status:** ⬜ Not Started

---

#### ✅ Feature 27: Zapier/IFTTT Integration
**Impact:** ⭐⭐ | **Effort:** L (1-2 weeks) | **Value:** 📈 Growth

**Description:** Connect to 1000+ apps via Zapier/IFTTT. Automate data collection.

**User Story:** "As a Twitter power user, I want my liked tweets saved to my diary automatically."

**Example Automations:**
- Save liked tweets to diary
- Screenshot Instagram story → upload to photos
- Goodreads finished book → diary entry
- GitHub commits → daily summary
- Spotify top songs → weekly playlist note

**Technical Details:**
- Create Zapier integration (requires Zapier Developer account)
- Provide API endpoints for triggers/actions
- Authenticate with API key (generate per user)

**Zapier Actions:**
- Create diary entry
- Upload photo
- Add voice note
- Create tag

**Zapier Triggers:**
- New diary entry created
- New photo uploaded
- Daily summary generated

**Dependencies:** API key authentication

**Status:** ⬜ Not Started

---

### 💰 Monetization

#### ✅ Feature 28: Tiered Pricing
**Impact:** ⭐⭐⭐⭐⭐ | **Effort:** L | **Value:** 💰 Revenue

**Status:** ⬜ Not Started

**Notes:** See "Top 5 Recommended" section (Feature #5) for full details.

---

#### ✅ Feature 29: API Access (Pro Tier)
**Impact:** ⭐⭐⭐ | **Effort:** L (1-2 weeks) | **Value:** 💰 Revenue

**Description:** RESTful API for power users, developers, and third-party apps.

**User Story:** "As a data scientist, I want API access to analyze my personal data in Jupyter notebooks."

**API Endpoints:**
```
GET /api/v1/notes           - List text notes
GET /api/v1/notes/:id       - Get specific note
POST /api/v1/notes          - Create note
PUT /api/v1/notes/:id       - Update note
DELETE /api/v1/notes/:id    - Delete note

GET /api/v1/photos          - List photos
GET /api/v1/voice           - List voice notes
GET /api/v1/chat            - Chat with RAG (already exists)
GET /api/v1/analytics       - Get analytics data

POST /api/v1/webhooks       - Register webhook for events
```

**Authentication:**
- API key (generate in settings)
- Rate limits: 100 req/min (Pro), 10 req/min (Premium)
- Usage tracking and billing

**Documentation:**
- OpenAPI/Swagger spec
- Interactive API docs (Swagger UI)
- Code examples (Python, JS, curl)

**Monetization:**
- Pro tier only ($19/mo)
- Additional charge for >10K requests/month

**Dependencies:** API key management

**Status:** ⬜ Not Started

---

#### ✅ Feature 30: White-Label (Enterprise)
**Impact:** ⭐⭐⭐ | **Effort:** XXL (2+ months) | **Value:** 💰 Revenue

**Description:** Companies can deploy for employees with custom branding.

**User Story:** "As an HR manager at a healthcare company, I want to provide this tool to 500 employees with our company branding."

**Features:**
- Custom domain (e.g., `journal.acme.com`)
- Custom logo, colors, branding
- SSO/SAML authentication
- Admin dashboard for company
- HIPAA compliance (for healthcare)
- On-premise deployment option

**Pricing:**
- $5,000/month for up to 100 users
- $10,000/month for up to 500 users
- Enterprise: Custom pricing

**Technical Requirements:**
- Multi-tenancy architecture
- Isolated databases per company
- Custom theming system
- SSO integration (Okta, Azure AD)
- Compliance certifications (HIPAA, SOC2)

**Dependencies:** Enterprise sales team, legal review

**Status:** ⬜ Not Started (Future consideration)

---

### 🔒 Privacy & Security

#### ✅ Feature 31: End-to-End Encryption (E2EE)
**Impact:** ⭐⭐⭐ | **Effort:** XL (3-4 weeks) | **Value:** 🏆 Differentiation

**Description:** Client-side encryption before upload. Zero-knowledge architecture.

**User Story:** "As a privacy-conscious user, I want my data encrypted so even the company can't read it."

**Technical Details:**
- Encrypt on client before upload to Firestore
- User's master key derived from password (not stored on server)
- Public/private key pair per user
- Encryption: AES-256

**Major Trade-off:**
- **Pro:** Maximum privacy
- **Con:** Can't do server-side RAG (no access to plaintext)
- **Solution:** Decrypt on client, do RAG queries locally (slower, less powerful)

**Alternative:**
- Hybrid: Encrypt sensitive fields only (location, names)
- Keep content plaintext for RAG

**Monetization:**
- Premium feature ($14/mo)

**Dependencies:** Significant architecture changes

**Status:** ⬜ Not Started (Requires strategic decision)

---

#### ✅ Feature 32: Two-Factor Authentication (2FA)
**Impact:** ⭐⭐⭐ | **Effort:** M (3-5 days) | **Value:** 🔒 Retention

**Description:** TOTP, SMS, or authenticator app for additional security.

**User Story:** "As a user storing sensitive personal data, I want 2FA to protect my account."

**Technical Details:**
- Firebase Auth supports phone auth (SMS)
- For TOTP: use `otplib` library
- QR code generation for authenticator apps
- Backup codes (10 one-time codes)

**Implementation:**
```typescript
// Enable 2FA
import { generateSecret, generateQRCode } from 'otplib';

const secret = generateSecret();
const qrCode = await generateQRCode(secret);
// User scans QR code with Google Authenticator

// Verify
import { verify } from 'otplib';
const isValid = verify(userToken, secret);
```

**Dependencies:** None

**Status:** ⬜ Not Started

---

#### ✅ Feature 33: Activity Log
**Impact:** ⭐⭐ | **Effort:** M (3-4 days) | **Value:** 🔒 Retention

**Description:** Show all account activity (logins, API access, data exports, settings changes).

**User Story:** "As a security-conscious user, I want to see all logins to my account and detect suspicious activity."

**Log Events:**
- Login/logout (with IP, device, location)
- Password changes
- 2FA enabled/disabled
- Data exports
- API key created/revoked
- Shared links created
- Settings changes

**Technical Details:**
- Store in `activityLog` collection
- Show on settings page: `/settings/activity`
- Filter by event type, date
- Alert on suspicious activity (new device, new location)

**Implementation:**
```typescript
// Log activity
await firestore.collection('activityLog').add({
  userId,
  event: 'login',
  ip: request.ip,
  userAgent: request.headers['user-agent'],
  location: await getLocationFromIP(request.ip),
  timestamp: new Date(),
});
```

**Dependencies:** IP geolocation service (optional)

**Status:** ⬜ Not Started

---

### 🎓 Learning & Engagement

#### ✅ Feature 34: Spaced Repetition for Memories
**Impact:** ⭐⭐ | **Effort:** L (1-2 weeks) | **Value:** 🔒 Retention

**Description:** Quiz users on past memories to improve retention (like flashcards).

**User Story:** "As a user, I want to be quizzed on important memories so I don't forget them."

**Features:**
- Mark memories as "important" (to remember)
- AI generates questions from memories
- Spaced repetition algorithm (show again in 1 day, 3 days, 7 days, 30 days)
- Score user's recall
- Show retention stats

**Example Questions:**
- "What restaurant did you go to on April 15th?"
- "Who did you meet at the conference last month?"
- "What book did you finish reading in March?"

**Technical Details:**
- Use SM-2 algorithm (SuperMemo)
- Store card state (interval, ease factor, due date)
- Show 5 cards/day on dashboard
- Gamification: streak counter

**Dependencies:** None

**Status:** ⬜ Not Started

---

#### ✅ Feature 35: Writing Prompts
**Impact:** ⭐⭐⭐ | **Effort:** S (1-2 days) | **Value:** 🔒 Retention

**Description:** Daily/weekly prompts to encourage journaling.

**User Story:** "As a user struggling with writer's block, I want writing prompts to inspire me."

**Prompt Categories:**
- Reflection: "What made you smile today?"
- Gratitude: "Who are you thankful for and why?"
- Goals: "What's one thing you want to accomplish this week?"
- Creativity: "If you could have dinner with anyone, who would it be?"
- Memory: "What's your favorite childhood memory?"

**Technical Details:**
- 365 pre-written prompts (one per day)
- OR: AI-generated prompts personalized to user
- Show on dashboard
- Click prompt → opens diary entry with prompt pre-filled

**Implementation:**
```typescript
// Prompt of the day
const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
const prompt = prompts[dayOfYear % prompts.length];
```

**Dependencies:** None

**Status:** ⬜ Not Started

---

#### ✅ Feature 36: Reading Stats
**Impact:** ⭐⭐ | **Effort:** S (1-2 days) | **Value:** 🔒 Retention

**Description:** Track time spent reading past entries. Show most re-read entries.

**User Story:** "As a reflective user, I want to know which memories I revisit most often."

**Metrics:**
- Total reading time
- Most re-read entries
- Reading streak (days in a row)
- Reading heatmap (like GitHub contributions)

**Technical Details:**
- Track page views with timestamps
- Calculate dwell time (time on page)
- Store in `readingStats` collection
- Show on analytics dashboard

**Implementation:**
```typescript
// Track reading time
useEffect(() => {
  const startTime = Date.now();
  return () => {
    const duration = Date.now() - startTime;
    if (duration > 5000) { // Only count if read for 5+ seconds
      logReadingTime(noteId, duration);
    }
  };
}, [noteId]);
```

**Dependencies:** Feature 11 (Analytics Dashboard)

**Status:** ⬜ Not Started

---

### 📦 Data Management

#### ✅ Feature 37: Data Export
**Impact:** ⭐⭐⭐⭐ | **Effort:** M (3-5 days) | **Value:** 🎯 Core (GDPR compliance)

**Description:** Export all data as JSON, CSV, or PDF. GDPR compliance.

**User Story:** "As a user, I want to download all my data in case I switch services."

**Export Formats:**
- **JSON** - Full data with metadata (free tier)
- **CSV** - Spreadsheet format for text notes (free tier)
- **PDF** - Printable diary format (premium tier)
- **HTML** - Standalone website of all data (premium tier)

**Technical Details:**
- Settings page: `/settings/export`
- Click "Export Data" → Cloud Function generates ZIP file
- Email download link when ready
- Link expires after 7 days

**GDPR Compliance:**
- Must provide within 30 days of request
- Include all personal data
- Machine-readable format

**Implementation:**
```typescript
// Cloud Function: generateExport
1. Fetch all user data (notes, photos, voice, locations)
2. Generate JSON file
3. Optional: Convert to CSV/PDF
4. Upload to Cloud Storage (temporary bucket)
5. Generate signed URL (expires in 7 days)
6. Email user with download link
```

**Dependencies:** Cloud Storage for temporary files

**Status:** ⬜ Not Started

---

## Implementation Tracking

### Quick Reference Matrix

| # | Feature | Impact | Effort | Value | Status |
|---|---------|--------|--------|-------|--------|
| 1 | Smart Search | ⭐⭐⭐⭐⭐ | M | 🎯🔒 | ⬜ |
| 2 | Daily AI Summaries | ⭐⭐⭐⭐⭐ | M | 🏆💰🔒 | ⬜ |
| 3 | Analytics Dashboard | ⭐⭐⭐⭐ | L | 🏆📈 | ⬜ |
| 4 | PWA | ⭐⭐⭐⭐ | S | 🔒📈 | ⬜ |
| 5 | Tiered Pricing | ⭐⭐⭐⭐⭐ | L | 💰🏆 | ⬜ |
| 6 | Dark Mode | ⭐⭐⭐ | XS | 🔒 | ⬜ |
| 7 | Keyboard Shortcuts | ⭐⭐⭐ | S | 🔒 | ⬜ |
| 8 | Drag & Drop Upload | ⭐⭐⭐ | S | 🔒 | ⬜ |
| 9 | Memory Reminders | ⭐⭐⭐⭐ | M | 🔒 | ⬜ |
| 10 | Smart Tagging | ⭐⭐⭐⭐ | M | 🏆🔒 | ⬜ |
| 11 | Mood Tracking | ⭐⭐⭐⭐ | M | 🏆💰 | ⬜ |
| 12 | Question Suggestions | ⭐⭐⭐⭐ | M | 🔒🏆 | ⬜ |
| 13 | Goal Tracking | ⭐⭐⭐⭐ | L | 🔒💰 | ⬜ |
| 14 | Timeline View | ⭐⭐⭐⭐ | M | 🏆🔒 | ⬜ |
| 15 | Selective Sharing | ⭐⭐⭐ | M | 📈 | ⬜ |
| 16 | Collaborative Memories | ⭐⭐⭐ | L | 📈🔒 | ⬜ |
| 17 | Rich Text Editor | ⭐⭐⭐⭐ | M | 🔒 | ⬜ |
| 18 | Voice-to-Diary | ⭐⭐⭐⭐ | S | 🔒 | ⬜ |
| 19 | Entry Templates | ⭐⭐⭐ | S | 🔒 | ⬜ |
| 20 | Calendar Integration | ⭐⭐⭐⭐ | L | 🏆 | ⬜ |
| 21 | Note Import | ⭐⭐⭐ | L | 📈 | ⬜ |
| 22 | 2FA | ⭐⭐⭐ | M | 🔒 | ⬜ |
| 23 | Activity Log | ⭐⭐ | M | 🔒 | ⬜ |
| 24 | Data Export | ⭐⭐⭐⭐ | M | 🎯 | ⬜ |
| 25 | API Access | ⭐⭐⭐ | L | 💰 | ⬜ |
| 26 | Writing Prompts | ⭐⭐⭐ | S | 🔒 | ⬜ |

**Status Legend:**
- ⬜ Not Started
- 🟡 In Progress
- ✅ Completed
- 🔒 Blocked
- ❌ Cancelled

---

### Sprint Planning Template

**Sprint 1 (Week 1-2) - Foundation**
- [ ] Feature 1: Smart Search with Filters
- [ ] Feature 6: Dark Mode
- [ ] Feature 7: Keyboard Shortcuts

**Sprint 2 (Week 3-4) - AI Features**
- [ ] Feature 2: Daily AI Summaries
- [ ] Feature 12: Question Suggestions

**Sprint 3 (Week 5-6) - Analytics**
- [ ] Feature 3: Personal Analytics Dashboard
- [ ] Feature 14: Timeline View

**Sprint 4 (Week 7-8) - Mobile & UX**
- [ ] Feature 4: PWA
- [ ] Feature 8: Drag & Drop Upload
- [ ] Feature 17: Rich Text Editor

**Sprint 5 (Week 9-10) - Monetization**
- [ ] Feature 5: Tiered Pricing with Predictive Insights
- [ ] Feature 10: Smart Tagging (premium)

---

## Decision Framework

### How to Choose What to Build Next

Use this scoring system to prioritize features:

**Score = (Impact × 2) + Strategic Value - (Effort × 0.5)**

| Feature | Impact | Effort | Strategic | Score |
|---------|--------|--------|-----------|-------|
| Smart Search | 5 | 3 | Core+Retention | 9.5 |
| Daily Summaries | 5 | 3 | Diff+Rev+Ret | 11.5 |
| Analytics | 4 | 4 | Diff+Growth | 9 |
| PWA | 4 | 1 | Ret+Growth | 9.5 |
| Tiered Pricing | 5 | 4 | Revenue+Diff | 10 |

**Top 5 by Score:**
1. Daily AI Summaries (11.5)
2. Tiered Pricing (10)
3. Analytics Dashboard (9)
4. Smart Search (9.5)
5. PWA (9.5)

### Questions to Ask Before Building

1. **Does this align with our product vision?**
   - Vision: AI-powered personal data collection & intelligent assistant
   - If it doesn't use AI or personal data, reconsider

2. **Will users pay for this?**
   - If premium feature: survey 20 users first
   - If free feature: does it increase retention/acquisition?

3. **Can we build an MVP in 1 week?**
   - If no: break into smaller pieces
   - Ship iteratively, get feedback early

4. **Does this require ongoing maintenance?**
   - External APIs = dependency risk
   - Complex features = tech debt
   - Consider maintenance cost

5. **What's the opportunity cost?**
   - Building this means NOT building something else
   - Is this the highest leverage feature right now?

### User Research Questions

Before committing to a major feature:

**Survey Questions:**
1. "What's the #1 thing preventing you from using this app daily?"
2. "If you could only add ONE feature, what would it be?"
3. "Would you pay $9/mo for [feature X]? Why or why not?"
4. "What other apps do you use for personal data/journaling?"
5. "How do you currently find old notes/memories?"

**User Interviews:**
- Talk to 10 users before building major features
- Focus on problems, not solutions
- Look for patterns across interviews

---

## Next Steps

### Immediate Actions (This Week)

1. **Review this roadmap** - Decide on strategic direction (acquisition? retention? monetization?)
2. **Validate top 5** - Show to 5-10 users, get feedback
3. **Pick Sprint 1 features** - Commit to 2-3 features for next 2 weeks
4. **Set up tracking** - Update status column as work progresses

### Month 1 Goals

- Ship top 5 recommended features
- Get to 100 active users (if early stage)
- Validate pricing with user surveys
- Set up analytics to measure feature adoption

### Month 3 Goals

- Launch premium tier
- 10% conversion rate (free → premium)
- 500 active users
- NPS score > 40

---

## Changelog

| Date | Changes | Updated By |
|------|---------|------------|
| 2025-12-26 | Initial roadmap created with 37 features | Claude Sonnet 4.5 |

---

## Feedback & Collaboration

**Have feedback on this roadmap?**
- Add comments directly in this doc
- Create GitHub issues for specific features
- Schedule roadmap review meeting

**Want to contribute?**
- Pick a feature from "Not Started"
- Create implementation plan
- Submit PR with feature implementation

---

**Remember:** Ship fast, iterate, listen to users. A good feature shipped today is better than a perfect feature shipped never. 🚀
