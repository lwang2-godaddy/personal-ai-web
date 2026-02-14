/**
 * E2E Test Data Definitions
 *
 * Constants and seed data generators for Maestro E2E testing.
 * Uses deterministic document IDs so operations are idempotent.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const E2E_PRIMARY_EMAIL = 'e2e-test@personalai.app';
export const E2E_PRIMARY_PASSWORD = 'TestPassword123!';
export const E2E_PRIMARY_DISPLAY_NAME = 'E2E Test User';

export const E2E_FRIEND_EMAIL = 'e2e-friend@personalai.app';
export const E2E_FRIEND_PASSWORD = 'TestPassword123!';
export const E2E_FRIEND_DISPLAY_NAME = 'E2E Friend';

/** All deterministic document IDs used by E2E seed data */
export const E2E_DOC_IDS = {
  diaryEntries: ['e2e-diary-1', 'e2e-diary-2', 'e2e-diary-3'],
  lifeFeedPosts: ['e2e-lifefeed-1', 'e2e-lifefeed-2', 'e2e-lifefeed-3', 'e2e-lifefeed-4', 'e2e-lifefeed-5'],
  locations: ['e2e-location-1', 'e2e-location-2', 'e2e-location-3'],
  healthData: ['e2e-health-1', 'e2e-health-2', 'e2e-health-3'],
  circles: ['e2e-circle-1'],
  challenges: ['e2e-challenge-1'],
};

/** Firestore collections that contain E2E test data */
export const E2E_COLLECTIONS: Record<string, string[]> = {
  textNotes: E2E_DOC_IDS.diaryEntries,
  lifeFeedPosts: E2E_DOC_IDS.lifeFeedPosts,
  locationData: E2E_DOC_IDS.locations,
  healthData: E2E_DOC_IDS.healthData,
  circles: E2E_DOC_IDS.circles,
  challenges: E2E_DOC_IDS.challenges,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

// ---------------------------------------------------------------------------
// Seed data generators
// ---------------------------------------------------------------------------

export function getDiaryEntries(uid: string) {
  return [
    {
      id: 'e2e-diary-1',
      userId: uid,
      title: 'Morning Reflection',
      content: 'Starting the day with a clear mind and a fresh cup of coffee. I want to focus on being more present today and making progress on my personal goals. The morning sunlight through the window always sets the right tone.',
      tags: ['morning', 'reflection'],
      type: 'diary',
      createdAt: daysAgo(2).toISOString(),
      updatedAt: daysAgo(2).toISOString(),
    },
    {
      id: 'e2e-diary-2',
      userId: uid,
      title: 'Badminton Session',
      content: 'Had an amazing badminton session at the club today. Played three sets of doubles and my backhand smashes are really improving. The footwork drills from last week are paying off. Need to work on my net play next time.',
      tags: ['badminton', 'exercise'],
      type: 'diary',
      createdAt: daysAgo(1).toISOString(),
      updatedAt: daysAgo(1).toISOString(),
    },
    {
      id: 'e2e-diary-3',
      userId: uid,
      title: 'Quick thought',
      content: 'Need to remember to pick up groceries on the way home tomorrow.',
      tags: [],
      type: 'thought',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export function getLifeFeedPosts(uid: string) {
  return [
    {
      id: 'e2e-lifefeed-1',
      userId: uid,
      type: 'daily_summary',
      title: 'Your Day at a Glance',
      content: 'You had a productive day with 8,500 steps and a visit to the badminton club. You also spent time at the office working on your latest project. A well-balanced day overall!',
      status: 'active',
      dismissed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'e2e-lifefeed-2',
      userId: uid,
      type: 'health_milestone',
      title: '10,000 Steps Achievement',
      content: 'Congratulations! You hit 12,000 steps yesterday, surpassing your 10,000-step goal. Keep up the great momentum.',
      status: 'active',
      dismissed: false,
      createdAt: daysAgo(1).toISOString(),
    },
    {
      id: 'e2e-lifefeed-3',
      userId: uid,
      type: 'weekly_insights',
      title: 'Weekly Reflection',
      content: 'This week you averaged 8,833 steps per day, visited the badminton club twice, and wrote three diary entries. Your activity level is trending upward compared to last week.',
      status: 'active',
      dismissed: false,
      createdAt: daysAgo(2).toISOString(),
    },
    {
      id: 'e2e-lifefeed-4',
      userId: uid,
      type: 'location_highlight',
      title: 'Exploring New Places',
      content: 'You visited 3 distinct locations this week. Your most frequent stop was the office with 30 visits, followed by the badminton club.',
      status: 'active',
      dismissed: false,
      createdAt: daysAgo(3).toISOString(),
    },
    {
      id: 'e2e-lifefeed-5',
      userId: uid,
      type: 'mood_check',
      title: 'How Are You Feeling?',
      content: 'Based on your recent activity and journaling, it looks like you have been in a positive and active mood.',
      status: 'active',
      dismissed: false,
      createdAt: daysAgo(4).toISOString(),
    },
  ];
}

export function getLocations(uid: string) {
  return [
    {
      id: 'e2e-location-1',
      userId: uid,
      name: 'Home',
      latitude: 37.7749,
      longitude: -122.4194,
      activityTag: 'home',
      visitCount: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'e2e-location-2',
      userId: uid,
      name: 'SF Badminton Club',
      latitude: 37.7849,
      longitude: -122.4094,
      activityTag: 'badminton',
      visitCount: 15,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'e2e-location-3',
      userId: uid,
      name: 'Office',
      latitude: 37.7949,
      longitude: -122.3994,
      activityTag: 'work',
      visitCount: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export function getHealthData(uid: string) {
  return [
    {
      id: 'e2e-health-1',
      userId: uid,
      type: 'steps',
      steps: 8500,
      date: new Date().toISOString(),
      source: 'healthkit',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'e2e-health-2',
      userId: uid,
      type: 'steps',
      steps: 12000,
      date: daysAgo(1).toISOString(),
      source: 'healthkit',
      createdAt: daysAgo(1).toISOString(),
    },
    {
      id: 'e2e-health-3',
      userId: uid,
      type: 'steps',
      steps: 6000,
      date: daysAgo(2).toISOString(),
      source: 'healthkit',
      createdAt: daysAgo(2).toISOString(),
    },
  ];
}

export function getCircle(primaryUid: string, friendUid: string) {
  return {
    id: 'e2e-circle-1',
    name: 'Fitness Buddies',
    description: 'A circle for fitness enthusiasts',
    members: [primaryUid, friendUid],
    createdBy: primaryUid,
    createdAt: new Date().toISOString(),
  };
}

export function getChallenge(primaryUid: string, friendUid: string) {
  return {
    id: 'e2e-challenge-1',
    title: '10K Steps Daily',
    description: 'Walk 10,000 steps every day for a week',
    type: 'steps',
    target: 10000,
    duration: 7,
    participants: [primaryUid, friendUid],
    status: 'active',
    createdBy: primaryUid,
    createdAt: new Date().toISOString(),
    endDate: daysFromNow(7).toISOString(),
  };
}
