/**
 * Demo Data Definitions
 *
 * All seed data arrays for the demo account (Alex Chen persona).
 * Extracted from scripts/diagnostics/seed-demo-data.ts for reuse
 * by both the CLI script and admin API routes.
 *
 * Coverage: ~60 days of recent data + ~7 days from 1 year ago
 * (so "This Day Memories" can find historical content).
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEMO_EMAIL = 'demo-appstore@personalai.app';
export const DEMO_PASSWORD = 'DemoScreenshot2026!';
export const DEMO_DISPLAY_NAME = 'Alex Chen';

export const DEMO_FRIEND_EMAIL = 'demo-friend@personalai.app';
export const DEMO_FRIEND_PASSWORD = 'DemoFriend2026!';
export const DEMO_FRIEND_DISPLAY_NAME = 'Sarah Johnson';

export const USER_COLLECTIONS = [
  'healthData',
  'locationData',
  'voiceNotes',
  'textNotes',
  'photoMemories',
  'lifeFeedPosts',
  'events',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return a Date object for `daysAgo` days before now, optionally at a specific hour. */
export function daysAgo(days: number, hour = 12, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** ISO string for daysAgo helper */
export function daysAgoISO(days: number, hour = 12, minute = 0): string {
  return daysAgo(days, hour, minute).toISOString();
}

// ---------------------------------------------------------------------------
// Health Data
// ---------------------------------------------------------------------------

export function getDemoHealthData(uid: string): Record<string, any>[] {
  const docs: Record<string, any>[] = [];

  // --- Steps (61 records, today + daily for ~2 months) ---
  // Start from day 0 (today) so smart frequency freshness check sees recent data
  for (let day = 0; day <= 60; day++) {
    const date = daysAgo(day, 23, 59);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isWorkoutDay = (dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 6);

    let steps: number;
    if (isWeekend) {
      steps = isWorkoutDay
        ? 9000 + Math.floor(Math.random() * 4000)
        : 5000 + Math.floor(Math.random() * 3000);
    } else {
      steps = isWorkoutDay
        ? 9000 + Math.floor(Math.random() * 2000)
        : 7000 + Math.floor(Math.random() * 2000);
    }

    docs.push({
      userId: uid,
      type: 'steps',
      value: steps,
      unit: 'count',
      startDate: daysAgoISO(day, 0, 0),
      endDate: daysAgoISO(day, 23, 59),
      source: 'healthkit',
      metadata: {},
      syncedAt: new Date().toISOString(),
      embeddingId: '',
      createdAt: daysAgoISO(day, 23, 59),
    });
  }

  // --- Steps from 1 year ago (7 records) ---
  for (let offset = 0; offset < 7; offset++) {
    const day = 365 + offset;
    const date = daysAgo(day, 23, 59);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const steps = isWeekend
      ? 4000 + Math.floor(Math.random() * 3000)
      : 6000 + Math.floor(Math.random() * 2000);

    docs.push({
      userId: uid,
      type: 'steps',
      value: steps,
      unit: 'count',
      startDate: daysAgoISO(day, 0, 0),
      endDate: daysAgoISO(day, 23, 59),
      source: 'healthkit',
      metadata: {},
      syncedAt: new Date().toISOString(),
      embeddingId: '',
      createdAt: daysAgoISO(day, 23, 59),
    });
  }

  // --- Workouts (~24 records, ~3/week for 2 months) ---
  const workoutSchedule = [
    // Week 1-4 (days 1-28)
    { day: 26, type: 'Badminton', durationMin: 90, hour: 19 },
    { day: 24, type: 'Gym', durationMin: 60, hour: 7 },
    { day: 19, type: 'Badminton', durationMin: 90, hour: 19 },
    { day: 17, type: 'Gym', durationMin: 55, hour: 7 },
    { day: 15, type: 'Running', durationMin: 35, hour: 8 },
    { day: 12, type: 'Badminton', durationMin: 85, hour: 19 },
    { day: 10, type: 'Gym', durationMin: 65, hour: 7 },
    { day: 8, type: 'Running', durationMin: 40, hour: 9 },
    { day: 5, type: 'Badminton', durationMin: 95, hour: 19 },
    { day: 4, type: 'Gym', durationMin: 70, hour: 7 },
    { day: 2, type: 'Running', durationMin: 30, hour: 8 },
    { day: 1, type: 'Yoga', durationMin: 60, hour: 10 },
    // Week 5-8 (days 29-60)
    { day: 54, type: 'Badminton', durationMin: 80, hour: 19 },
    { day: 52, type: 'Gym', durationMin: 55, hour: 7 },
    { day: 50, type: 'Running', durationMin: 45, hour: 8 },
    { day: 47, type: 'Badminton', durationMin: 90, hour: 19 },
    { day: 45, type: 'Gym', durationMin: 60, hour: 7 },
    { day: 43, type: 'Yoga', durationMin: 55, hour: 10 },
    { day: 40, type: 'Badminton', durationMin: 85, hour: 19 },
    { day: 38, type: 'Gym', durationMin: 65, hour: 7 },
    { day: 36, type: 'Running', durationMin: 38, hour: 9 },
    { day: 33, type: 'Badminton', durationMin: 90, hour: 19 },
    { day: 31, type: 'Gym', durationMin: 60, hour: 7 },
    { day: 29, type: 'Running', durationMin: 35, hour: 8 },
    // 1 year ago (3 workouts)
    { day: 365, type: 'Running', durationMin: 25, hour: 9 },
    { day: 363, type: 'Gym', durationMin: 45, hour: 7 },
    { day: 361, type: 'Badminton', durationMin: 75, hour: 19 },
  ];

  for (const w of workoutSchedule) {
    docs.push({
      userId: uid,
      type: 'workout',
      value: w.durationMin,
      unit: 'minutes',
      startDate: daysAgoISO(w.day, w.hour, 0),
      endDate: daysAgoISO(w.day, w.hour, w.durationMin),
      source: 'healthkit',
      metadata: {
        workoutType: w.type,
        workoutDuration: w.durationMin * 60,
        calories: Math.floor(w.durationMin * (w.type === 'Yoga' ? 4 : w.type === 'Running' ? 10 : 7)),
      },
      syncedAt: new Date().toISOString(),
      embeddingId: '',
      createdAt: daysAgoISO(w.day, w.hour, w.durationMin),
    });
  }

  // --- Sleep (16 records, every ~3-4 days for 2 months) ---
  const sleepDays = [1, 4, 7, 10, 14, 17, 21, 25, 29, 33, 37, 41, 45, 49, 53, 57];
  for (const day of sleepDays) {
    const totalHours = (6.5 + Math.random() * 1.6).toFixed(1);
    docs.push({
      userId: uid,
      type: 'sleep',
      value: parseFloat(totalHours) * 60,
      unit: 'minutes',
      startDate: daysAgoISO(day, 23, 0),
      endDate: daysAgoISO(day - 1, 7, 0),
      source: 'healthkit',
      metadata: {
        isDailySummary: true,
        totalHours: parseFloat(totalHours),
      },
      syncedAt: new Date().toISOString(),
      embeddingId: '',
      createdAt: daysAgoISO(day - 1, 7, 30),
    });
  }

  // --- Heart Rate (16 records, every ~3-4 days for 2 months) ---
  const hrDays = [1, 4, 7, 10, 14, 17, 21, 25, 29, 33, 37, 41, 45, 49, 53, 57];
  for (const day of hrDays) {
    const avg = 68 + Math.floor(Math.random() * 8);
    docs.push({
      userId: uid,
      type: 'heartRate',
      value: avg,
      unit: 'bpm',
      startDate: daysAgoISO(day, 0, 0),
      endDate: daysAgoISO(day, 23, 59),
      source: 'healthkit',
      metadata: {
        isDailySummary: true,
        average: avg,
        min: avg - 10 - Math.floor(Math.random() * 5),
        max: avg + 30 + Math.floor(Math.random() * 20),
      },
      syncedAt: new Date().toISOString(),
      embeddingId: '',
      createdAt: daysAgoISO(day, 23, 59),
    });
  }

  return docs;
}

// ---------------------------------------------------------------------------
// Location Data
// ---------------------------------------------------------------------------

const PLACES = {
  office: { lat: 37.7897, lng: -122.3972, address: '101 Market St, San Francisco, CA', name: 'Tech Co Office', activity: 'work' },
  badminton: { lat: 37.7614, lng: -122.4344, address: '355 Divisadero St, San Francisco, CA', name: 'SF Badminton Club', activity: 'badminton' },
  gym: { lat: 37.7749, lng: -122.4194, address: '150 Van Ness Ave, San Francisco, CA', name: 'FitLife Gym', activity: 'gym' },
  ggPark: { lat: 37.7694, lng: -122.4862, address: 'Golden Gate Park, San Francisco, CA', name: 'Golden Gate Park', activity: 'running' },
  blueBottle: { lat: 37.7820, lng: -122.4078, address: '66 Mint St, San Francisco, CA', name: 'Blue Bottle Coffee', activity: 'coffee' },
  tartine: { lat: 37.7614, lng: -122.4241, address: '600 Guerrero St, San Francisco, CA', name: 'Tartine Bakery', activity: 'dining' },
  burma: { lat: 37.7837, lng: -122.4375, address: '309 Clement St, San Francisco, CA', name: 'Burma Superstar', activity: 'dining' },
  ferry: { lat: 37.7955, lng: -122.3937, address: 'Ferry Building, San Francisco, CA', name: 'Ferry Building Marketplace', activity: 'shopping' },
  yoga: { lat: 37.7599, lng: -122.4148, address: '2140 Mission St, San Francisco, CA', name: 'Inner Sunset Yoga', activity: 'yoga' },
  dolores: { lat: 37.7596, lng: -122.4269, address: 'Dolores Park, San Francisco, CA', name: 'Dolores Park', activity: 'relaxing' },
  muirWoods: { lat: 37.8970, lng: -122.5811, address: 'Muir Woods, Mill Valley, CA', name: 'Muir Woods National Monument', activity: 'hiking' },
} as const;

type PlaceKey = keyof typeof PLACES;

const VISIT_SCHEDULE: { day: number; place: PlaceKey; hour: number; duration: number; visitCount: number }[] = [
  // Today (day 0) — ensures smart frequency freshness check sees recent location data
  { day: 0, place: 'office', hour: 9, duration: 240, visitCount: 13 },
  // Week 1-4 (days 1-28)
  { day: 27, place: 'office', hour: 9, duration: 480, visitCount: 1 },
  { day: 26, place: 'badminton', hour: 19, duration: 120, visitCount: 1 },
  { day: 20, place: 'office', hour: 9, duration: 480, visitCount: 2 },
  { day: 19, place: 'office', hour: 9, duration: 480, visitCount: 3 },
  { day: 17, place: 'gym', hour: 7, duration: 75, visitCount: 1 },
  { day: 16, place: 'blueBottle', hour: 8, duration: 30, visitCount: 1 },
  { day: 13, place: 'office', hour: 9, duration: 480, visitCount: 4 },
  { day: 12, place: 'badminton', hour: 19, duration: 120, visitCount: 2 },
  { day: 11, place: 'office', hour: 9, duration: 480, visitCount: 5 },
  { day: 9, place: 'burma', hour: 18, duration: 90, visitCount: 1 },
  { day: 8, place: 'ggPark', hour: 9, duration: 60, visitCount: 1 },
  { day: 7, place: 'office', hour: 9, duration: 480, visitCount: 6 },
  { day: 6, place: 'office', hour: 9, duration: 480, visitCount: 7 },
  { day: 5, place: 'badminton', hour: 19, duration: 120, visitCount: 3 },
  { day: 4, place: 'gym', hour: 7, duration: 75, visitCount: 2 },
  { day: 3, place: 'office', hour: 9, duration: 480, visitCount: 8 },
  { day: 3, place: 'blueBottle', hour: 17, duration: 25, visitCount: 2 },
  { day: 2, place: 'tartine', hour: 12, duration: 45, visitCount: 1 },
  { day: 1, place: 'yoga', hour: 10, duration: 75, visitCount: 1 },
  { day: 1, place: 'dolores', hour: 14, duration: 90, visitCount: 1 },
  // Week 5-8 (days 29-60)
  { day: 55, place: 'office', hour: 9, duration: 480, visitCount: 9 },
  { day: 54, place: 'badminton', hour: 19, duration: 120, visitCount: 4 },
  { day: 52, place: 'gym', hour: 7, duration: 75, visitCount: 3 },
  { day: 50, place: 'muirWoods', hour: 10, duration: 180, visitCount: 1 },
  { day: 48, place: 'office', hour: 9, duration: 480, visitCount: 10 },
  { day: 47, place: 'badminton', hour: 19, duration: 120, visitCount: 5 },
  { day: 45, place: 'gym', hour: 7, duration: 75, visitCount: 4 },
  { day: 43, place: 'blueBottle', hour: 8, duration: 30, visitCount: 3 },
  { day: 41, place: 'office', hour: 9, duration: 480, visitCount: 11 },
  { day: 40, place: 'badminton', hour: 19, duration: 120, visitCount: 6 },
  { day: 38, place: 'gym', hour: 7, duration: 75, visitCount: 5 },
  { day: 36, place: 'ggPark', hour: 9, duration: 60, visitCount: 2 },
  { day: 34, place: 'office', hour: 9, duration: 480, visitCount: 12 },
  { day: 33, place: 'badminton', hour: 19, duration: 120, visitCount: 7 },
  { day: 31, place: 'gym', hour: 7, duration: 75, visitCount: 6 },
  { day: 30, place: 'ferry', hour: 11, duration: 60, visitCount: 1 },
  // 1 year ago (4 visits)
  { day: 365, place: 'office', hour: 9, duration: 480, visitCount: 1 },
  { day: 364, place: 'blueBottle', hour: 8, duration: 25, visitCount: 1 },
  { day: 363, place: 'gym', hour: 7, duration: 60, visitCount: 1 },
  { day: 361, place: 'badminton', hour: 19, duration: 90, visitCount: 1 },
];

export function getDemoLocationData(uid: string): Record<string, any>[] {
  return VISIT_SCHEDULE.map(v => {
    const p = PLACES[v.place];
    return {
      userId: uid,
      latitude: p.lat,
      longitude: p.lng,
      accuracy: 10 + Math.random() * 20,
      timestamp: daysAgoISO(v.day, v.hour, 0),
      activity: p.activity,
      activityTaggedAt: daysAgoISO(v.day, v.hour, 5),
      address: p.address,
      duration: v.duration * 60,
      visitCount: v.visitCount,
      placeName: p.name,
      isManualCheckIn: false,
      embeddingId: '',
      createdAt: daysAgoISO(v.day, v.hour, 0),
    };
  });
}

// ---------------------------------------------------------------------------
// Voice Notes
// ---------------------------------------------------------------------------

const VOICE_NOTES_DATA = [
  // Today (day 0) — ensures smart frequency freshness check sees recent voice data
  {
    day: 0, hour: 8, duration: 20,
    transcription: 'Quick morning note. Had a great morning run in Dolores Park, about 3 miles. The weather is perfect today. Meeting with the product team at 10 to discuss the Q2 roadmap. Need to remember to pick up groceries after work.',
    category: 'routine', icon: 'sunny-outline',
  },
  // Recent (days 1-28)
  {
    day: 27, hour: 18, duration: 45,
    transcription: 'Had a really productive day at work. Finished the API integration ahead of schedule. The team was impressed with the clean architecture. Feeling good about the project direction.',
    category: 'work', icon: 'briefcase-outline',
  },
  {
    day: 19, hour: 21, duration: 30,
    transcription: 'Great badminton session tonight. Won two out of three games against Mike. My backhand smash is getting much better. Need to work on my net play though.',
    category: 'sports', icon: 'tennisball-outline',
  },
  {
    day: 16, hour: 12, duration: 25,
    transcription: 'Tried a new pho place near the office for lunch. The broth was incredible, slow-cooked for hours. Reminded me of the pho my mom used to make. Should bring Sarah here next time.',
    category: 'food', icon: 'restaurant-outline',
  },
  {
    day: 13, hour: 7, duration: 35,
    transcription: 'Morning run in Golden Gate Park was beautiful today. Saw two deer near the botanical garden. Ran 5K in 24 minutes, a new personal best. The cool morning air felt amazing.',
    category: 'health', icon: 'fitness-outline',
  },
  {
    day: 10, hour: 20, duration: 55,
    transcription: 'Brainstorming ideas for the side project. Thinking about building a recipe app that uses AI to suggest meals based on what ingredients you have. Could integrate with grocery delivery APIs.',
    category: 'ideas', icon: 'bulb-outline',
  },
  {
    day: 9, hour: 17, duration: 20,
    transcription: 'Called Mom and Dad after dinner. They are doing well. Dad finally retired and they are planning a trip to Taiwan in March. Should plan to visit them next month.',
    category: 'family', icon: 'people-outline',
  },
  {
    day: 6, hour: 7, duration: 15,
    transcription: 'Morning routine note: woke up at 6 AM, did 10 minutes of stretching, had green tea and overnight oats. Feeling energized for the day. This new morning routine is really working.',
    category: 'routine', icon: 'sunny-outline',
  },
  {
    day: 4, hour: 21, duration: 40,
    transcription: 'Finished reading "Atomic Habits" by James Clear. Key takeaway: small improvements compound over time. Already seeing this with my badminton skills. Going to apply the 1% better concept to my coding too.',
    category: 'learning', icon: 'book-outline',
  },
  {
    day: 2, hour: 18, duration: 20,
    transcription: 'Hit a new PR at the gym today. Deadlift 225 pounds for 5 reps. My trainer says my form is really solid now. Goal is to hit 250 by end of next month.',
    category: 'health', icon: 'barbell-outline',
  },
  {
    day: 1, hour: 15, duration: 30,
    transcription: 'Weekend plans: Saturday morning yoga, then brunch with Sarah and Mike at Tartine. Afternoon at Dolores Park if the weather holds. Sunday maybe try the new climbing gym in SOMA.',
    category: 'social', icon: 'calendar-outline',
  },
  // Extended (days 29-60)
  {
    day: 55, hour: 18, duration: 50,
    transcription: 'Team offsite was amazing. We did a mini hackathon and my group built a prototype for the internal analytics dashboard in just 6 hours. Won the best demo award. The whole team was really energized, felt like the early startup days again.',
    category: 'work', icon: 'briefcase-outline',
  },
  {
    day: 50, hour: 16, duration: 35,
    transcription: 'Weekend hike at Muir Woods with Sarah. The redwoods are absolutely stunning in the morning light. We took the Bootjack Trail loop, about 6 miles total. Saw a banana slug the size of my hand. Need to come back here more often.',
    category: 'travel', icon: 'leaf-outline',
  },
  {
    day: 45, hour: 20, duration: 25,
    transcription: 'Just listened to an incredible podcast episode of Lex Fridman interviewing a neuroscientist about habit formation. Ties in perfectly with what I read in Atomic Habits. The idea of dopamine reward prediction errors is fascinating.',
    category: 'learning', icon: 'headset-outline',
  },
  {
    day: 40, hour: 19, duration: 20,
    transcription: 'Tried making mapo tofu tonight from scratch. Used the doubanjiang paste I got from the Chinese grocery store on Clement Street. Turned out pretty good, though not as spicy as the restaurant version. Sarah loved it.',
    category: 'food', icon: 'restaurant-outline',
  },
  {
    day: 37, hour: 17, duration: 30,
    transcription: 'Big milestone at work today. We shipped the v2 API to production. Zero downtime deployment, all tests passing. Three months of work and it is finally live. The team went out for celebratory drinks at Zeitgeist.',
    category: 'work', icon: 'trophy-outline',
  },
  {
    day: 32, hour: 21, duration: 25,
    transcription: 'Rainy Sunday, perfect for reading. Started "Deep Work" by Cal Newport. Already love the concept of time blocking for focused work. Going to try implementing a two-hour deep work block every morning starting Monday.',
    category: 'learning', icon: 'book-outline',
  },
  // 1 year ago
  {
    day: 365, hour: 20, duration: 40,
    transcription: 'Just moved to San Francisco last week. The city is amazing. Walked across the Golden Gate Bridge today, the fog rolling in was surreal. My apartment in the Mission is tiny but has great light. Still unpacking but already feels like home.',
    category: 'life', icon: 'home-outline',
  },
  {
    day: 360, hour: 19, duration: 35,
    transcription: 'Started my new job at the startup today. The team is small but talented, only twelve engineers. The office is on Market Street with views of the bay. Had my first standup and already got assigned a ticket. Excited but nervous.',
    category: 'work', icon: 'briefcase-outline',
  },
];

export function getDemoVoiceNotes(uid: string): Record<string, any>[] {
  return VOICE_NOTES_DATA.map(n => ({
    userId: uid,
    audioUrl: '',
    transcription: n.transcription,
    duration: n.duration,
    createdAt: daysAgoISO(n.day, n.hour, 0),
    tags: [],
    embeddingId: '',
    topicCategory: n.category,
    topicIcon: n.icon,
  }));
}

// ---------------------------------------------------------------------------
// Text Notes
// ---------------------------------------------------------------------------

const TEXT_NOTES_DATA = [
  // Recent (days 1-28)
  {
    day: 25, hour: 21, title: 'Q1 Goals & Intentions', tags: ['goals', 'planning'],
    category: 'work', icon: 'flag-outline',
    content: `Setting my intentions for Q1 2026:\n\n**Work:**\n- Ship the v2 API by end of February\n- Mentor two junior developers on the team\n- Give a tech talk at the company all-hands\n\n**Health & Fitness:**\n- Maintain 3x/week workout routine (badminton Tue, gym Thu, run Sat)\n- Hit 10K steps daily average\n- Deadlift 250 lbs by March\n\n**Personal:**\n- Read 3 books (currently reading Atomic Habits)\n- Start the recipe app side project\n- Visit parents in Portland\n\nFeeling motivated. Last quarter was great and I want to build on that momentum.`,
  },
  {
    day: 15, hour: 20, title: 'Weekend in Napa', tags: ['travel', 'wine', 'weekend'],
    category: 'travel', icon: 'wine-outline',
    content: `Amazing weekend trip to Napa Valley with Sarah and a few friends.\n\nVisited three wineries:\n1. **Opus One** - The Bordeaux blend was outstanding\n2. **Stag's Leap** - Beautiful grounds, great Cab Sauv\n3. **Domaine Carneros** - Perfect sparkling wine for the sunset\n\nWe stayed at a cute B&B in Yountville. Had dinner at The French Laundry — still can't believe we got a reservation. The tasting menu was 9 courses of pure art.\n\nDriving through the vineyards with the windows down, golden hour light hitting the vines... these are the moments I want to remember.`,
  },
  {
    day: 11, hour: 22, title: 'Side Project Brainstorm: AI Recipe App', tags: ['project', 'ai', 'cooking'],
    category: 'ideas', icon: 'bulb-outline',
    content: `Spent the evening sketching out the recipe app idea.\n\n**Core concept:** Take a photo of your fridge/pantry → AI identifies ingredients → suggests recipes you can make right now.\n\n**Tech stack ideas:**\n- React Native (leverage my mobile experience)\n- OpenAI Vision API for ingredient identification\n- Claude for recipe generation and nutritional analysis\n- Supabase for backend (want to try something besides Firebase)\n\n**MVP features:**\n- Photo → ingredient list\n- Recipe suggestions (3-5 per scan)\n- Dietary preference filters\n- Save favorite recipes\n\nGoing to start with a prototype this weekend. Already have some ideas for the UI from looking at Paprika and Mela.`,
  },
  {
    day: 5, hour: 22, title: 'Monthly Reflection — January', tags: ['reflection', 'monthly'],
    category: 'reflection', icon: 'journal-outline',
    content: `Reflecting on January 2026:\n\n**Wins:**\n- Shipped two major features at work, both ahead of schedule\n- Hit a 4-week workout streak (haven't missed a single session!)\n- Badminton improved significantly — winning more games against Mike\n- Started and finished "Atomic Habits"\n- Reconnected with college friends at a dinner in the Mission\n\n**Challenges:**\n- Sleep has been inconsistent (averaging 7.2 hours but some nights as low as 6.5)\n- Haven't started the side project yet\n- Spent too much on dining out\n\n**Goals for February:**\n- Start the recipe app MVP\n- Get sleep average to 7.5+ hours\n- Cook at home 4+ nights per week\n- Plan the Portland trip to visit parents\n\nOverall a solid month. The workout routine is feeling automatic now, which is exactly what I wanted.`,
  },
  {
    day: 2, hour: 20, title: "Grandma's Dan Dan Noodles Recipe", tags: ['recipe', 'family', 'cooking'],
    category: 'food', icon: 'restaurant-outline',
    content: `Mom shared grandma's dan dan noodles recipe over the phone today. Writing it down before I forget!\n\n**Ingredients:**\n- Fresh wheat noodles (not dried)\n- Ground pork, 200g\n- Ya cai (preserved mustard greens)\n- Sesame paste, 3 tbsp\n- Chili oil, 2 tbsp (homemade is best)\n- Light soy sauce, 2 tbsp\n- Black vinegar, 1 tbsp\n- Sichuan peppercorn oil, 1 tsp\n- Chopped scallions, peanuts\n\n**Key tips from grandma:**\n- Toast the sesame paste in a dry pan first — brings out the nutty flavor\n- The ya cai is the secret ingredient, don't skip it\n- Cook noodles al dente, they continue cooking in the sauce\n- Always add a splash of noodle cooking water to the sauce\n\nGoing to try making this this weekend. Miss grandma's cooking so much.`,
  },
  // Extended (days 29-60)
  {
    day: 52, hour: 21, title: 'Team Offsite Recap — Hackathon Results', tags: ['work', 'hackathon', 'team'],
    category: 'work', icon: 'trophy-outline',
    content: `Our team offsite was a huge success. Day 1 was strategy sessions, Day 2 was the hackathon.\n\n**Hackathon Projects:**\n1. **Analytics Dashboard** (my team) — Built a real-time internal metrics dashboard. Won best demo!\n2. **AI Code Reviewer** — Used GPT-4 to review PRs automatically\n3. **Customer Feedback Classifier** — NLP pipeline to categorize support tickets\n\n**Key Takeaways:**\n- The team works incredibly well under pressure\n- We should do hackathons quarterly, not just annually\n- The analytics dashboard might actually become a real product feature\n\nAlso had a great team dinner at a rooftop restaurant in SOMA. Good vibes all around.`,
  },
  {
    day: 42, hour: 20, title: 'Muir Woods Trail Notes', tags: ['hiking', 'nature', 'weekend'],
    category: 'travel', icon: 'leaf-outline',
    content: `Hiked the Bootjack Trail loop at Muir Woods today with Sarah.\n\n**Trail Details:**\n- Distance: ~6.2 miles\n- Elevation gain: ~1,200 ft\n- Duration: 3.5 hours (including photo stops)\n\n**Highlights:**\n- The Cathedral Grove section is breathtaking — some trees are over 250 feet tall\n- Spotted a banana slug, a Steller's jay, and what I think was a red-tailed hawk\n- The creek crossings were beautiful with all the recent rain\n- Packed sandwiches from Tartine and ate at a bench overlooking the valley\n\nThis is exactly why I moved to the Bay Area. Nature like this, 30 minutes from the city. Already planning to come back for the Dipsea Trail.`,
  },
  {
    day: 33, hour: 22, title: 'February Goals & Monthly Planning', tags: ['goals', 'planning', 'monthly'],
    category: 'planning', icon: 'calendar-outline',
    content: `February planning session:\n\n**Work:**\n- v2 API launch target: Feb 15th\n- Start mentoring Lisa on backend patterns\n- Prep slides for March all-hands tech talk\n\n**Health:**\n- Continue 3x/week workouts (badminton, gym, running)\n- Target: deadlift 235 lbs (halfway to 250 goal)\n- Try a new yoga class at Inner Sunset Yoga\n\n**Personal:**\n- Start reading "Deep Work" by Cal Newport\n- Cook at home at least 4 nights/week\n- Plan Portland trip for late March\n- Try making mapo tofu from scratch\n\n**Side Project:**\n- Set up React Native project for recipe app\n- Build photo capture + OpenAI Vision integration\n- Design basic UI mockups in Figma`,
  },
  // 1 year ago
  {
    day: 362, hour: 22, title: 'First Week in San Francisco', tags: ['moving', 'sf', 'new-chapter'],
    category: 'life', icon: 'home-outline',
    content: `It's been one week since I moved to San Francisco. Here are my first impressions:\n\n**The Good:**\n- The Mission is vibrant and walkable — taquerias, coffee shops, murals everywhere\n- Golden Gate Park is massive and beautiful, could spend weeks exploring\n- The tech scene is exactly what I hoped for — everyone has a side project\n- The food is incredible. Already found amazing pho, ramen, and dim sum spots\n\n**The Challenging:**\n- My apartment is half the size of my Portland place for twice the rent\n- The fog is real — Karl the Fog, they call it\n- Still don't know many people outside work\n\n**Goals for my first month:**\n- Join a badminton club (found SF Badminton Club on Divisadero)\n- Explore all the neighborhoods\n- Find a good gym near home\n- Try to make at least one friend outside of work\n\nThis is a new chapter and I'm here for it.`,
  },
];

export function getDemoTextNotes(uid: string): Record<string, any>[] {
  return TEXT_NOTES_DATA.map(n => ({
    userId: uid,
    title: n.title,
    content: n.content,
    tags: n.tags,
    createdAt: daysAgoISO(n.day, n.hour, 0),
    updatedAt: daysAgoISO(n.day, n.hour, 0),
    embeddingId: '',
    topicCategory: n.category,
    topicIcon: n.icon,
  }));
}

// ---------------------------------------------------------------------------
// Photo Descriptions (for photos upload)
// ---------------------------------------------------------------------------

export const PHOTO_DESCRIPTIONS = [
  { desc: 'A beautiful morning run through Golden Gate Park with fog lifting over the meadow.', activity: 'running', day: 8, hour: 9 },
  { desc: 'Badminton match at SF Badminton Club. Mid-rally action shot showing a cross-court smash.', activity: 'badminton', day: 5, hour: 20 },
  { desc: "Homemade dan dan noodles with chili oil and crushed peanuts, following grandma's recipe.", activity: 'cooking', day: 2, hour: 19 },
  { desc: 'Sunset over the Bay Bridge from the Ferry Building, golden light reflecting on the water.', activity: 'sightseeing', day: 3, hour: 18 },
  { desc: 'Post-workout selfie at FitLife Gym after hitting a new deadlift PR of 225 lbs.', activity: 'gym', day: 4, hour: 8 },
  { desc: 'Latte art at Blue Bottle Coffee — a perfect rosetta on a flat white.', activity: 'coffee', day: 3, hour: 17 },
  { desc: 'Dolores Park on a sunny afternoon, view of downtown SF skyline in the background.', activity: 'relaxing', day: 1, hour: 15 },
  { desc: 'Tartine morning bun — flakey, caramelized, and still warm from the oven.', activity: 'dining', day: 2, hour: 12 },
  // Extended
  { desc: 'Towering redwoods along the Bootjack Trail at Muir Woods, sunlight filtering through the canopy.', activity: 'hiking', day: 50, hour: 11 },
  { desc: 'Team hackathon whiteboard covered in architecture diagrams and sticky notes.', activity: 'work', day: 52, hour: 15 },
  { desc: 'Homemade mapo tofu in a cast iron skillet, bright red with chili oil and Sichuan peppercorns.', activity: 'cooking', day: 40, hour: 19 },
  // 1 year ago
  { desc: 'View from my new apartment window on the first day in San Francisco, rooftops and palm trees.', activity: 'life', day: 365, hour: 10 },
];

// ---------------------------------------------------------------------------
// Friend Life Feed Posts (pre-created for Sarah Johnson)
// ---------------------------------------------------------------------------

export function getDemoFriendLifeFeedPosts(
  friendUid: string,
  alexUid: string,
): Record<string, any>[] {
  const posts = [
    {
      day: 1,
      hour: 7,
      type: 'life_summary',
      category: 'health',
      emoji: '🧘‍♀️',
      title: 'Morning Yoga Victory',
      content: 'Finally nailed crow pose in my morning yoga session today! Been working on this for weeks. The key was engaging my core more and trusting the balance. Held it for a solid 10 seconds — progress! My instructor said my form is really coming together. Starting the day with this kind of win sets the tone for everything else.',
    },
    {
      day: 2,
      hour: 14,
      type: 'life_summary',
      category: 'travel',
      emoji: '🥾',
      title: 'Lands End Trail Magic',
      content: 'Hiked the Lands End Trail this morning and the Golden Gate Bridge views were absolutely stunning through the fog. Found a hidden labyrinth made of rocks overlooking the ocean — someone told me it gets rebuilt by locals every time it gets knocked down. The cypress trees along the coastal path are so dramatic. This city never stops surprising me.',
    },
    {
      day: 3,
      hour: 18,
      type: 'life_summary',
      category: 'food',
      emoji: '🍞',
      title: 'Sourdough Success!',
      content: 'After three failed attempts, my sourdough bread finally came out perfect! Golden crust, beautiful ear, open crumb structure. The secret was a longer autolyse and being more patient with the bulk fermentation. The apartment smells incredible. Already planning to bring a loaf to Alex and the crew this weekend.',
    },
    {
      day: 4,
      hour: 17,
      type: 'life_summary',
      category: 'work',
      emoji: '🎨',
      title: 'App Redesign Ships!',
      content: 'Our design team finally shipped the app redesign we\'ve been working on for the past two months! The new onboarding flow increased completion rates by 40% in early testing. Really proud of how the team collaborated on this — lots of late nights but the result speaks for itself. Celebrated with champagne at the office.',
    },
    {
      day: 0,
      hour: 10,
      type: 'life_summary',
      category: 'social',
      emoji: '🏖️',
      title: 'Beach Day Planning',
      content: 'Planning a beach day at Baker Beach this weekend! The weather forecast looks perfect — sunny and 72°F. Going to pack a picnic with that sourdough I made, some cheese from the Ferry Building, and a bottle of rosé. Already texted the group chat. Need to remember sunscreen this time.',
    },
  ];

  return posts.map((p) => ({
    userId: friendUid,
    type: p.type,
    category: p.category,
    emoji: p.emoji,
    title: p.title,
    content: p.content,
    publishedAt: daysAgoISO(p.day, p.hour, 0),
    createdAt: daysAgoISO(p.day, p.hour, 0),
    updatedAt: daysAgoISO(p.day, p.hour, 0),
    language: 'en',
    visibility: 'friends',
    hiddenFromFriends: false,
    sharingStatus: {
      isShareable: true,
      sharedToFriendIds: [alexUid],
    },
    likedBy: [],
    likeCount: 0,
    comments: [],
    commentCount: 0,
    viewedBy: [],
    viewCount: 0,
    forwardCount: 0,
    confidence: 0.95,
    metadata: {},
  }));
}

// ---------------------------------------------------------------------------
// Friendship Documents
// ---------------------------------------------------------------------------

export function getDemoFriendshipDocs(
  alexUid: string,
  friendUid: string,
): { docId: string; data: Record<string, any> }[] {
  const thirtyDaysAgo = daysAgoISO(30, 12, 0);

  return [
    {
      docId: `${alexUid}_${friendUid}`,
      data: {
        userId: alexUid,
        friendUid: friendUid,
        friendEmail: DEMO_FRIEND_EMAIL,
        friendDisplayName: DEMO_FRIEND_DISPLAY_NAME,
        friendPhotoURL: '',
        status: 'accepted',
        privacySettings: {
          shareHealth: true,
          shareLocation: true,
          shareActivities: true,
          shareVoiceNotes: true,
          sharePhotos: true,
        },
        createdAt: thirtyDaysAgo,
        updatedAt: thirtyDaysAgo,
      },
    },
    {
      docId: `${friendUid}_${alexUid}`,
      data: {
        userId: friendUid,
        friendUid: alexUid,
        friendEmail: DEMO_EMAIL,
        friendDisplayName: DEMO_DISPLAY_NAME,
        friendPhotoURL: '',
        status: 'accepted',
        privacySettings: {
          shareHealth: true,
          shareLocation: true,
          shareActivities: true,
          shareVoiceNotes: true,
          sharePhotos: true,
        },
        createdAt: thirtyDaysAgo,
        updatedAt: thirtyDaysAgo,
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Predefined Privacy Circles + Members
// ---------------------------------------------------------------------------

interface CircleAndMembers {
  circles: { docId?: string; data: Record<string, any> }[];
  members: { circleIndex: number; docId: string; data: Record<string, any> }[];
}

const PREDEFINED_TIERS: {
  tier: string;
  name: string;
  emoji: string;
  dataSharing: Record<string, boolean>;
}[] = [
  {
    tier: 'acquaintances',
    name: 'Acquaintances',
    emoji: '👋',
    dataSharing: {
      shareHealth: false,
      shareLocation: false,
      shareActivities: true,
      shareDiary: false,
      shareVoiceNotes: false,
      sharePhotos: false,
    },
  },
  {
    tier: 'friends',
    name: 'Friends',
    emoji: '🤝',
    dataSharing: {
      shareHealth: false,
      shareLocation: false,
      shareActivities: true,
      shareDiary: true,
      shareVoiceNotes: false,
      sharePhotos: true,
    },
  },
  {
    tier: 'close_friends',
    name: 'Close Friends',
    emoji: '💫',
    dataSharing: {
      shareHealth: true,
      shareLocation: true,
      shareActivities: true,
      shareDiary: true,
      shareVoiceNotes: true,
      sharePhotos: true,
    },
  },
  {
    tier: 'inner_circle',
    name: 'Inner Circle',
    emoji: '❤️',
    dataSharing: {
      shareHealth: true,
      shareLocation: true,
      shareActivities: true,
      shareDiary: true,
      shareVoiceNotes: true,
      sharePhotos: true,
    },
  },
];

export function getDemoPredefinedCircles(
  ownerUid: string,
  ownerName: string,
  friendUid?: string,
  friendName?: string,
): CircleAndMembers {
  const now = new Date().toISOString();
  const circles: CircleAndMembers['circles'] = [];
  const members: CircleAndMembers['members'] = [];

  PREDEFINED_TIERS.forEach((tier, index) => {
    const memberIds: string[] = [];
    // Add friend to close_friends tier
    if (tier.tier === 'close_friends' && friendUid) {
      memberIds.push(friendUid);
    }

    circles.push({
      data: {
        name: tier.name,
        description: `${tier.name} privacy tier`,
        emoji: tier.emoji,
        createdBy: 'system',
        memberIds,
        type: 'private',
        dataSharing: tier.dataSharing,
        settings: {
          allowMemberInvites: false,
          allowChallenges: tier.tier !== 'acquaintances',
          allowGroupChat: tier.tier !== 'acquaintances',
          notifyOnNewMember: true,
          notifyOnActivity: tier.tier === 'close_friends' || tier.tier === 'inner_circle',
        },
        isPredefined: true,
        privacyTier: tier.tier,
        ownerUserId: ownerUid,
        systemCreatedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    });

    // Owner is always a member of their own circle
    members.push({
      circleIndex: index,
      docId: `PLACEHOLDER_${index}_${ownerUid}`,
      data: {
        userId: ownerUid,
        role: 'creator',
        joinedAt: now,
        invitedBy: 'system',
        status: 'active',
        displayName: ownerName,
        avatarUrl: '',
      },
    });

    // If friend is in this tier, add member doc for them
    if (tier.tier === 'close_friends' && friendUid && friendName) {
      members.push({
        circleIndex: index,
        docId: `PLACEHOLDER_${index}_${friendUid}`,
        data: {
          userId: friendUid,
          role: 'member',
          joinedAt: now,
          invitedBy: ownerUid,
          status: 'active',
          displayName: friendName,
          avatarUrl: '',
        },
      });
    }
  });

  return { circles, members };
}

// ---------------------------------------------------------------------------
// Social Engagement (likes, comments, views between Alex & Sarah)
// ---------------------------------------------------------------------------

export interface SocialEngagementData {
  /** Sarah's engagement on Alex's posts (apply to Alex's lifeFeedPosts) */
  sarahOnAlex: {
    postIndex: number; // index into Alex's posts (0 = most recent)
    like?: { userId: string; displayName: string; likedAt: string };
    comment?: { id: string; userId: string; displayName: string; text: string; createdAt: string };
  }[];
  /** Alex's engagement on Sarah's posts (apply to Sarah's lifeFeedPosts) */
  alexOnSarah: {
    postIndex: number; // index into Sarah's posts (0-4)
    view?: { userId: string; displayName: string; viewedAt: string };
    like?: { userId: string; displayName: string; likedAt: string };
  }[];
}

export function getDemoSocialEngagement(
  alexUid: string,
  friendUid: string,
): SocialEngagementData {
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();

  return {
    sarahOnAlex: [
      {
        postIndex: 0,
        like: {
          userId: friendUid,
          displayName: DEMO_FRIEND_DISPLAY_NAME,
          likedAt: hoursAgo(2),
        },
        comment: {
          id: 'comment_sarah_1',
          userId: friendUid,
          displayName: DEMO_FRIEND_DISPLAY_NAME,
          text: 'This is amazing! So proud of you 🎉',
          createdAt: hoursAgo(1.5),
        },
      },
      {
        postIndex: 1,
        like: {
          userId: friendUid,
          displayName: DEMO_FRIEND_DISPLAY_NAME,
          likedAt: hoursAgo(8),
        },
      },
    ],
    alexOnSarah: [
      {
        postIndex: 0, // Beach day planning
        view: {
          userId: alexUid,
          displayName: DEMO_DISPLAY_NAME,
          viewedAt: hoursAgo(1),
        },
        like: {
          userId: alexUid,
          displayName: DEMO_DISPLAY_NAME,
          likedAt: hoursAgo(0.5),
        },
      },
      {
        postIndex: 2, // Sourdough
        view: {
          userId: alexUid,
          displayName: DEMO_DISPLAY_NAME,
          viewedAt: hoursAgo(4),
        },
        like: {
          userId: alexUid,
          displayName: DEMO_DISPLAY_NAME,
          likedAt: hoursAgo(3.5),
        },
      },
      {
        postIndex: 4, // Yoga
        view: {
          userId: alexUid,
          displayName: DEMO_DISPLAY_NAME,
          viewedAt: hoursAgo(20),
        },
      },
    ],
  };
}
