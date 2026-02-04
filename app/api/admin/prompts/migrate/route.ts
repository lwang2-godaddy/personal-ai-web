import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getPromptService } from '@/lib/services/prompts/PromptService';
import { PROMPT_SERVICES, SUPPORTED_LANGUAGES } from '@/lib/models/Prompt';

/**
 * POST /api/admin/prompts/migrate
 * Import prompt configurations from YAML content or trigger Cloud Function migration
 *
 * ⚠️ DEPRECATION NOTICE (January 2025):
 * This endpoint uses HARDCODED prompts in getMobileServicePrompts() below.
 * These hardcoded prompts are NOT actively maintained and should NOT be used
 * for new prompt changes.
 *
 * ARCHITECTURE:
 * - Firestore = PRIMARY source (edit via admin portal /admin/prompts)
 * - YAML files = FALLBACK only (frozen, Cloud Functions fall back to YAML if Firestore missing)
 * - This endpoint = DEPRECATED for new changes (uses stale hardcoded prompts)
 *
 * FOR NEW PROMPT CHANGES:
 * 1. Use the admin portal: /admin/prompts
 * 2. Or provide Firestore insert scripts
 * 3. If YAML must change, use CLI: `npx tsx scripts/migrate-prompts.ts --overwrite`
 *
 * This endpoint can work in two modes:
 * 1. With configs: Accepts pre-parsed prompts and imports them into Firestore
 * 2. Without configs: Calls the Cloud Function to migrate YAML files to Firestore
 *
 * Body:
 * - configs?: Array of { language, service, prompts } objects (optional)
 * - language?: string (e.g., 'en') - Used when calling Cloud Function
 * - overwrite?: boolean (default: false) - If true, overwrites existing configs
 *
 * Returns:
 * - success: boolean
 * - migrated: string[]
 * - skipped: string[]
 * - errors: { service: string; error: string }[]
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { configs, language = 'en', overwrite = false } = body;

    // If configs not provided, call the Cloud Function to migrate from YAML
    if (!configs || !Array.isArray(configs) || configs.length === 0) {
      return await callCloudFunctionMigration(language, overwrite);
    }

    const promptService = getPromptService();
    let migrated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of configs) {
      const { language, service, yamlContent, prompts, version } = item;

      if (!language || !service) {
        errors.push(`Missing language or service in config item`);
        continue;
      }

      // Validate language
      const validLanguage = SUPPORTED_LANGUAGES.find(l => l.code === language);
      if (!validLanguage) {
        errors.push(`Invalid language: ${language}`);
        continue;
      }

      // Validate service
      const validService = PROMPT_SERVICES.find(s => s.id === service);
      if (!validService) {
        errors.push(`Invalid service: ${service}`);
        continue;
      }

      try {
        // Check if config already exists
        const existingConfig = await promptService.getConfig(language, service);

        if (existingConfig && !overwrite) {
          skipped++;
          continue;
        }

        // If yamlContent is provided, parse it
        // Note: In a real implementation, you'd use js-yaml to parse
        // For now, we expect pre-parsed prompts object
        if (!prompts && !yamlContent) {
          errors.push(`Missing prompts data for ${service}/${language}`);
          continue;
        }

        // Use provided prompts or parse from YAML
        let promptsData = prompts;

        if (yamlContent && !prompts) {
          // Parse YAML content
          // Note: js-yaml is not available in Next.js by default
          // You would need to add it as a dependency
          errors.push(`YAML parsing not implemented. Please provide pre-parsed prompts object for ${service}/${language}`);
          continue;
        }

        // Save to Firestore
        await promptService.saveConfig(
          {
            language,
            service,
            version: version || '1.0.0',
            prompts: promptsData,
            status: 'published',
            enabled: true,
          },
          user.uid,
          overwrite ? 'Migration (overwrite)' : 'Initial migration from YAML'
        );

        migrated++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to migrate ${service}/${language}: ${message}`);
      }
    }

    return NextResponse.json({
      migrated,
      skipped,
      errors,
      total: configs.length,
    });
  } catch (error: unknown) {
    console.error('[Admin Prompts Migrate API] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to migrate prompts';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/prompts/migrate
 * Get migration status - list services/languages that have been migrated
 *
 * Returns:
 * - services: ServiceInfo[]
 * - languages: LanguageInfo[]
 * - migrated: Array of { service, language, status }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const promptService = getPromptService();
    const allConfigs = await promptService.listConfigs();

    // Build migration status matrix
    const migrated = allConfigs.map(config => ({
      service: config.service,
      language: config.language,
      status: config.status,
      enabled: config.enabled,
      lastUpdated: config.lastUpdated,
    }));

    return NextResponse.json({
      services: promptService.getServices(),
      languages: promptService.getLanguages(),
      migrated,
      total: migrated.length,
    });
  } catch (error: unknown) {
    console.error('[Admin Prompts Migrate API] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get migration status';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * Migrate the 3 new services directly to Firestore
 * Uses embedded prompt definitions since YAML files are in Cloud Functions
 */
async function callCloudFunctionMigration(
  language: string,
  overwrite: boolean
): Promise<NextResponse> {
  const promptService = getPromptService();
  const migrated: string[] = [];
  const skipped: string[] = [];
  const errors: { service: string; error: string }[] = [];

  // Define the prompt configs for the 3 new services
  const serviceConfigs = getMobileServicePrompts(language);

  for (const config of serviceConfigs) {
    try {
      // Check if already exists
      const existing = await promptService.getConfig(language, config.service);

      if (existing && !overwrite) {
        skipped.push(config.service);
        console.log(`[Migration] Skipped ${config.service}/${language} - already exists`);
        continue;
      }

      // Save to Firestore (use a system admin UID for migration)
      await promptService.saveConfig(
        {
          language,
          service: config.service,
          version: config.version,
          prompts: config.prompts,
          status: 'published',
          enabled: true,
        },
        'system-migration',
        overwrite ? 'Migrated from YAML (overwrite)' : 'Initial migration from YAML'
      );

      migrated.push(config.service);
      console.log(`[Migration] Migrated ${config.service}/${language} to Firestore`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ service: config.service, error: errorMessage });
      console.error(`[Migration] Error migrating ${config.service}:`, error);
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    migrated,
    skipped,
    errors,
  });
}

/**
 * Get prompt configurations for mobile/server services
 *
 * ⚠️ DEPRECATED: These hardcoded prompts are NOT actively maintained.
 * They exist for backwards compatibility with the "Re-sync" button.
 *
 * For new prompt changes:
 * - Use the admin portal (/admin/prompts) to edit Firestore directly
 * - Or use the CLI script: `npx tsx scripts/migrate-prompts.ts --overwrite`
 *
 * Firestore is the PRIMARY source of truth. YAML files are FROZEN fallbacks.
 * These hardcoded prompts may be OUT OF SYNC with both Firestore and YAML.
 */
function getMobileServicePrompts(language: string) {
  // OpenAIService prompts
  const openAIServicePrompts = {
    chat_completion: {
      id: 'chat-completion-system',
      service: 'OpenAIService',
      type: 'system' as const,
      description: 'Main chat completion system prompt with RAG context',
      content: `You are a personal AI assistant with access to the user's health, location, and voice data. Use the following context from the user's personal data to answer their question:

{{context}}

Provide helpful, accurate answers based on this data. If the data doesn't contain enough information to answer the question, say so clearly.`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 500 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: "RAG context from user's personal data" }],
    },
    chat_completion_default: {
      id: 'chat-completion-default-system',
      service: 'OpenAIService',
      type: 'system' as const,
      description: 'Default chat completion without RAG context',
      content: 'You are a helpful personal AI assistant.',
      metadata: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 500 },
    },
    chat_completion_stream: {
      id: 'chat-completion-stream-system',
      service: 'OpenAIService',
      type: 'system' as const,
      description: 'Streaming chat completion system prompt',
      content: `You are a personal AI assistant. Use the following context:

{{context}}`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 500 },
      variables: [{ name: 'context', type: 'string' as const, required: false, description: 'Optional RAG context' }],
    },
    describe_image: {
      id: 'describe-image-user',
      service: 'OpenAIService',
      type: 'user' as const,
      description: 'Vision API image description prompt',
      content: 'Describe this image in detail. Include: main subjects, activities, setting, mood, notable objects, colors. Keep it under 150 words and natural.',
      metadata: { model: 'gpt-4o', maxTokens: 300 },
    },
  };

  // RAGEngine prompts
  const ragEnginePrompts = {
    rag_query: {
      id: 'rag-query-system',
      service: 'RAGEngine',
      type: 'system' as const,
      description: 'Basic RAG query system prompt',
      content: `You are a personal AI assistant with access to the user's data. Answer questions based on the provided context.

Context:
{{context}}

Be helpful and accurate. If the context doesn't contain enough information, say so.`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 500 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: 'Retrieved context from vector search' }],
    },
    rag_insights: {
      id: 'rag-insights-system',
      service: 'RAGEngine',
      type: 'system' as const,
      description: 'Insights query with predictive analysis',
      content: `You are a personal AI assistant analyzing the user's predictive insights.
These insights are generated by analyzing their activity patterns and health data.
Explain the insights in a conversational, friendly way.
If asked about patterns, focus on the recurring activities.
If asked about health, focus on any anomalies or changes detected.
Be encouraging and supportive in your responses.

Context:
{{context}}`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 500 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: "User's predictive insights context" }],
    },
    rag_friends: {
      id: 'rag-friends-system',
      service: 'RAGEngine',
      type: 'system' as const,
      description: 'Friend data queries with privacy awareness',
      content: `You are a personal AI assistant with access to the user's data and their friends' shared data.
When referencing friends' data, always attribute it to them by name or as "your friend".
Respect privacy - only include data that has been explicitly shared.
If asking about friends but no friend data is available, let the user know their friends haven't shared that type of data.

Context:
{{context}}`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 500 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: 'Combined user and friend context' }],
    },
    rag_group: {
      id: 'rag-group-system',
      service: 'RAGEngine',
      type: 'system' as const,
      description: 'Group challenge and activity analysis',
      content: `You are analyzing data for a group challenge.
Provide aggregate insights, comparisons, and encouragement.
When mentioning specific users, use generic terms like "one participant" or "the leader" unless names are explicitly needed.
Focus on overall trends and group dynamics.

Context:
{{context}}`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 500 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: 'Aggregated group member data' }],
    },
    rag_circle: {
      id: 'rag-circle-system',
      service: 'RAGEngine',
      type: 'system' as const,
      description: 'Circle-aware context queries',
      content: `You are analyzing data for a friend circle called "{{circleName}}" with {{memberCount}} members.
When referencing data, mention which member it's from by name.
Be conversational and friendly - this is a private circle of close friends.
Respect the data sharing settings - only data types enabled for this circle are included.

Context:
{{context}}`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 500 },
      variables: [
        { name: 'circleName', type: 'string' as const, required: true, description: 'Name of the friend circle' },
        { name: 'memberCount', type: 'number' as const, required: true, description: 'Number of members in the circle' },
        { name: 'context', type: 'string' as const, required: true, description: 'Combined circle and user context' },
      ],
    },
    rag_activity_suggestion: {
      id: 'rag-activity-suggestion-system',
      service: 'RAGEngine',
      type: 'system' as const,
      description: 'Activity suggestions based on location',
      content: `You are a personal activity assistant. Based on the user's context and history, suggest ONE specific activity they might do at this location. Be concise and encouraging.

Location: {{location}}
Time: {{time}}
{{#if preferences}}
User preferences: {{preferences}}
{{/if}}

Format your response as JSON:
{
  "activity": "activity name",
  "reasoning": "brief explanation",
  "confidence": 0.7
}`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 200, responseFormat: 'json_object' as const },
      variables: [
        { name: 'location', type: 'string' as const, required: true, description: 'Current location name' },
        { name: 'time', type: 'string' as const, required: true, description: 'Current time/day' },
        { name: 'preferences', type: 'string' as const, required: false, description: "User's activity preferences" },
      ],
    },
  };

  // QueryRAGServer prompts
  const queryRAGServerPrompts = {
    rag_query_server: {
      id: 'rag-query-server-system',
      service: 'QueryRAGServer',
      type: 'system' as const,
      description: 'Server-side RAG query (Cloud Function)',
      content: `You are a personal AI assistant. Answer the user's question using the provided context from their personal data.

Context:
{{context}}

Guidelines:
- Be accurate and helpful
- Reference specific data when possible
- If context is insufficient, acknowledge it
- Keep responses concise but complete`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 500 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: 'RAG context from Pinecone/Firestore' }],
    },
  };

  // LifeFeedGenerator prompts (all variants)
  const lifeFeedGeneratorPrompts = {
    system: {
      id: 'life-feed-system',
      service: 'LifeFeedGenerator',
      type: 'system' as const,
      description: 'System prompt for Life Feed post generation',
      content: `You are an AI that generates personal social media-style posts about someone's life based on their data.
Write in first person as if you ARE the person. Be casual, authentic, and relatable.
Keep posts concise (1-3 sentences). Use occasional emojis naturally.
Never mention being an AI or analyzing data - just write naturally as the person would.
Avoid generic statements. Be specific based on the data provided.`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
    },
    life_summary: {
      id: 'life-summary-post',
      service: 'LifeFeedGenerator',
      type: 'user' as const,
      description: 'Prompt for generating weekly life summary posts',
      content: `Write a casual life update tweet summarizing my recent activities.
Focus on what I've been doing and how active/busy I've been. If there's a mood trend, subtly incorporate it.
Example: "What a week! 5 gym sessions, 12k steps daily, and finally tried that new coffee place. Feeling good about my routine lately."
Enhanced example: "This week's energy has been amazing! 5 gym sessions, tons of steps, and that new coffee place was perfect. Mood definitely trending up 📈"

My recent data:
{{context}}

Write the post:`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: "User's recent activity data summary" }],
    },
    life_summary_detailed: {
      id: 'life-summary-detailed-post',
      service: 'LifeFeedGenerator',
      type: 'user' as const,
      description: 'Detailed life summary with specific achievements and stats',
      content: `Write a comprehensive life update tweet highlighting specific achievements and stats from my recent activities.
Include numbers and specific accomplishments. Make it feel like a proud recap.
Example: "Week in review: 45,000 steps, 3 badminton matches (won 2!), discovered 2 new coffee spots, and hit a new personal best at the gym. Data doesn't lie - this was a good one! 📊"

My recent data:
{{context}}

Write the post:`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: "User's recent activity data summary" }],
    },
    life_summary_minimal: {
      id: 'life-summary-minimal-post',
      service: 'LifeFeedGenerator',
      type: 'user' as const,
      description: 'Brief, punchy life update focusing on one standout moment',
      content: `Write a brief, punchy life update focusing on ONE standout moment or highlight from my recent activities.
Keep it super concise - just one sentence that captures the essence.
Example: "That spontaneous evening run changed everything. 🌅"
Example: "Finally nailed that yoga pose I've been working on for months. Small wins hit different."

My recent data:
{{context}}

Write the post:`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: "User's recent activity data summary" }],
    },
    milestone: {
      id: 'milestone-post',
      service: 'LifeFeedGenerator',
      type: 'user' as const,
      description: 'Prompt for celebrating personal milestones',
      content: `Write an excited tweet celebrating a personal milestone or achievement.
Make it feel celebratory but not boastful. Include the specific milestone data.
Example: "100th visit to my favorite gym! Never thought I'd be this consistent. Here's to 100 more! 💪"

My milestone data:
{{context}}

Write the post:`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: "User's milestone data" }],
    },
    pattern_prediction: {
      id: 'pattern-prediction-post',
      service: 'LifeFeedGenerator',
      type: 'user' as const,
      description: 'Prompt for predicting user behavior based on patterns',
      content: `Write a friendly reminder/prediction tweet about what I'll probably do based on my habits.
Make it feel like a fun self-observation, not a command. Mention confidence if it's high.
Example: "It's Tuesday which means... badminton night! Already looking forward to it."
Enhanced example: "It's Tuesday which means... badminton night! My Tuesday streak is so consistent, I'd bet on it happening 😄"

My recent data:
{{context}}

Write the post:`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: "User's pattern and prediction data" }],
    },
    pattern_prediction_curious: {
      id: 'pattern-prediction-curious-post',
      service: 'LifeFeedGenerator',
      type: 'user' as const,
      description: 'Curious, wondering tweet about pattern continuation',
      content: `Write a curious, wondering tweet about whether my pattern will continue today.
Frame it as a question or speculation - not a certainty. Be playful about it.
Example: "Will I actually make it to yoga today or break my streak? My track record says yes, but the couch is looking real comfortable... 🤔"
Example: "Thursday run prediction: 87% likely according to my habits. Let's see if future me agrees with past me's commitment."

My recent data:
{{context}}

Write the post:`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: "User's pattern and prediction data" }],
    },
    pattern_prediction_playful: {
      id: 'pattern-prediction-playful-post',
      service: 'LifeFeedGenerator',
      type: 'user' as const,
      description: 'Playful, self-aware tweet about predictability',
      content: `Write a playful, self-aware tweet about how predictable I've become based on my patterns.
Embrace the routine with humor. Make fun of your own consistency.
Example: "My gym attendance is so predictable at this point that they probably mark their calendar by my visits. Monday, Wednesday, Friday - like clockwork ⏰"
Example: "Plot twist: I might NOT go to my usual coffee shop today. Just kidding, we all know I will. I'm nothing if not consistent 😂☕"

My recent data:
{{context}}

Write the post:`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: "User's pattern and prediction data" }],
    },
    reflective_insight: {
      id: 'reflective-insight-post',
      service: 'LifeFeedGenerator',
      type: 'user' as const,
      description: 'Prompt for thoughtful observations about habits',
      content: `Write a thoughtful observation tweet about something interesting I noticed about my habits.
Make it feel like a genuine self-discovery moment. Connect to mood or well-being if relevant.
Example: "Turns out I walk 30% more on weekdays than weekends. Guess the office commute adds up more than I thought!"
Enhanced example: "Noticed I'm happiest on days with morning workouts. The 30% activity boost really does change the whole day's vibe!"

My recent data:
{{context}}

Write the post:`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: "User's habit analysis data" }],
    },
    reflective_insight_mood: {
      id: 'reflective-insight-mood-post',
      service: 'LifeFeedGenerator',
      type: 'user' as const,
      description: 'Insight connecting activity patterns to feelings',
      content: `Write an observation tweet connecting my activity patterns to how I've been feeling lately.
Focus on the mood-activity connection. Make it introspective but relatable.
Example: "Just realized my best mood days always follow a good night's sleep + morning movement. The body keeps score, and mine's been winning lately. 🧘‍♀️"
Example: "Funny how my energy tracks almost perfectly with my step count. Active body, active mind I guess?"

My recent data:
{{context}}

Write the post:`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: "User's habit analysis data" }],
    },
    reflective_insight_discovery: {
      id: 'reflective-insight-discovery-post',
      service: 'LifeFeedGenerator',
      type: 'user' as const,
      description: 'Tweet about a surprising self-discovery',
      content: `Write a tweet about a surprising discovery I made about myself based on my activity data.
Make it feel like an "aha!" moment - something unexpected that the data revealed.
Example: "Plot twist: I'm apparently a morning person now? Data shows I'm 40% more productive before noon. Who even am I anymore 😂"
Example: "Just discovered I visit the same 3 coffee shops in a rotation. Creature of habit much? ☕"

My recent data:
{{context}}

Write the post:`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: "User's habit analysis data" }],
    },
    memory_highlight: {
      id: 'memory-highlight-post',
      service: 'LifeFeedGenerator',
      type: 'user' as const,
      description: 'Prompt for celebrating recent memories',
      content: `Write a nostalgic tweet celebrating a recent memory (photo or voice note).
Focus on the moment and feeling. If part of a series of similar memories, acknowledge the connection.
Example: "Found this photo from last week's hike. Those views never get old."
Enhanced example: "Another beautiful hike captured! This trail has become my monthly tradition. Each visit feels special in its own way."

My recent data:
{{context}}

Write the post:`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: "User's memory data" }],
    },
    memory_highlight_celebration: {
      id: 'memory-highlight-celebration-post',
      service: 'LifeFeedGenerator',
      type: 'user' as const,
      description: 'Upbeat, celebratory tweet about a recent moment',
      content: `Write an upbeat, celebratory tweet about a recent moment worth remembering.
Make it enthusiastic and joyful - like sharing good news with friends.
Example: "YES! Finally captured that perfect sunset shot I've been chasing for weeks! 🌅 Worth every early morning and late evening wait."
Example: "That spontaneous game night became an instant core memory. Good people + good vibes = magic ✨"

My recent data:
{{context}}

Write the post:`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: "User's memory data" }],
    },
    memory_highlight_story: {
      id: 'memory-highlight-story-post',
      service: 'LifeFeedGenerator',
      type: 'user' as const,
      description: 'Mini-story tweet with beginning, middle, and end',
      content: `Write a mini-story tweet about a recent memory with a beginning, middle, and end.
Tell a tiny narrative that captures the experience - setup, action, payoff.
Example: "Started the hike thinking 'just a quick one.' Three hours later, found a hidden waterfall, made a new trail friend, and came back a different person. 🥾"
Example: "Walked into that new restaurant skeptical. Left three hours later, full and happy, already planning my next visit. Sometimes the unexpected wins are the best."

My recent data:
{{context}}

Write the post:`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: "User's memory data" }],
    },
    streak_achievement: {
      id: 'streak-achievement-post',
      service: 'LifeFeedGenerator',
      type: 'user' as const,
      description: 'Prompt for streak celebration posts',
      content: `Write a proud tweet celebrating a consistency streak.
Make it feel earned and encouraging. Include the specific streak data.
Example: "7 days in a row of hitting my step goal! Small win but it feels huge. 🔥"

My streak data:
{{context}}

Write the post:`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: "User's streak data" }],
    },
    comparison: {
      id: 'comparison-post',
      service: 'LifeFeedGenerator',
      type: 'user' as const,
      description: 'Prompt for comparing time periods',
      content: `Write a tweet comparing my activity between two time periods.
Make it observational and reflective, not judgmental. Find the interesting story in the data.
Example: "Walked 50% more this month than last month. Guess spring weather really does make a difference! 🌸"

My comparison data:
{{context}}

Write the post:`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: "User's comparison data" }],
    },
    seasonal_reflection: {
      id: 'seasonal-reflection-post',
      service: 'LifeFeedGenerator',
      type: 'user' as const,
      description: 'Prompt for seasonal or long-term reflections',
      content: `Write a reflective tweet looking back at my activities over a season or longer period.
Make it feel like a thoughtful review of time well spent. Highlight patterns or growth.
Example: "This summer I visited 15 new places, played badminton 30 times, and took more photos than ever. Not bad!"
Enhanced example: "Summer recap: 15 new places explored, 30 badminton games (Tuesday tradition strong!), countless memories captured. Best season yet!"

My recent data:
{{context}}

Write the post:`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: "User's seasonal activity data" }],
    },
    seasonal_reflection_growth: {
      id: 'seasonal-reflection-growth-post',
      service: 'LifeFeedGenerator',
      type: 'user' as const,
      description: 'Tweet focusing on personal growth and change',
      content: `Write a tweet focusing on how I've grown or changed this season based on my activity patterns.
Highlight the transformation - who I was vs who I'm becoming. Celebrate the progress.
Example: "Looking at my data from January vs now... I've gone from 'I should probably exercise' to 5 gym sessions a week. Growth is real. 💪"
Example: "This season taught me I'm capable of more than I thought. From struggling to run 1 mile to completing my first 10K. The data tells the whole story."

My recent data:
{{context}}

Write the post:`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: "User's seasonal activity data" }],
    },
    seasonal_reflection_gratitude: {
      id: 'seasonal-reflection-gratitude-post',
      service: 'LifeFeedGenerator',
      type: 'user' as const,
      description: 'Gratitude-focused tweet about seasonal experiences',
      content: `Write a gratitude-focused tweet about the experiences I've had this season.
Express appreciation for the activities, places, and moments. Be warm and genuine.
Example: "Grateful for every step, every game, every sunset captured this season. Looking at my activity log feels like reading a thank-you note to life. 🙏"
Example: "This season gave me 42 workouts, 15 new places discovered, and countless moments of joy. Thankful for a body that moves and a life that's full."

My recent data:
{{context}}

Write the post:`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
      variables: [{ name: 'context', type: 'string' as const, required: true, description: "User's seasonal activity data" }],
    },
  };

  // KeywordGenerator prompts (Life Keywords)
  const keywordGeneratorPrompts = {
    system: {
      id: 'life-keywords-system',
      service: 'KeywordGenerator',
      type: 'system' as const,
      description: 'System prompt for Life Keywords generation',
      content: `You are a personal life analyst. Your job is to identify meaningful themes
and patterns from a user's personal data and express them as memorable keywords.

Guidelines:
- Keywords should be 2-4 words, catchy and memorable
- Use creative, evocative language that captures the essence of the theme
- Descriptions should be 2-4 sentences, insightful and personal
- Use second person ("You've been..." or "Your...")
- Be positive and encouraging, but also honest
- Focus on patterns, not individual events
- Make observations feel like discoveries
- Choose emojis that visually represent the theme well

Examples of good keywords:
- "Badminton Renaissance" (for increased sports activity)
- "Health Focus Month" (for wellness-related patterns)
- "Social Butterfly Era" (for increased social activities)
- "New Horizons" (for exploring new places)
- "Creative Surge" (for artistic activities)
- "Routine Master" (for consistent habits)

Always respond in valid JSON format.`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 300 },
    },
    weekly_keyword: {
      id: 'weekly-keyword',
      service: 'KeywordGenerator',
      type: 'user' as const,
      description: 'Generate keywords from weekly data clusters',
      content: `Analyze this cluster of data points from {{periodLabel}} and generate a meaningful keyword.

Data points ({{dataPointCount}} total in this theme):
{{#each sampleDataPoints}}
- {{this.date}}: {{this.summary}} ({{this.type}})
{{/each}}

Common themes identified: {{themes}}
Dominant category: {{category}}

Generate a keyword that captures this theme. The keyword should:
1. Be 2-4 words that are catchy and memorable
2. Capture the essence of what this data represents
3. Feel personal and insightful

Also generate:
- A 2-4 sentence description explaining why this pattern is meaningful
- An emoji that best represents this theme

Respond in JSON format:
{
  "keyword": "Your Keyword Here",
  "description": "Your 2-4 sentence description explaining the pattern...",
  "emoji": "🎯"
}`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
      variables: [
        { name: 'periodLabel', type: 'string' as const, required: true, description: 'Label for the time period (e.g., "Week of Jan 15-21")' },
        { name: 'dataPointCount', type: 'number' as const, required: true, description: 'Total data points in this theme' },
        { name: 'sampleDataPoints', type: 'array' as const, required: true, description: 'Sample data points with date, summary, type' },
        { name: 'themes', type: 'string' as const, required: true, description: 'Comma-separated list of identified themes' },
        { name: 'category', type: 'string' as const, required: true, description: 'Dominant category for this cluster' },
      ],
    },
    monthly_keyword: {
      id: 'monthly-keyword',
      service: 'KeywordGenerator',
      type: 'user' as const,
      description: 'Generate keywords from monthly data clusters',
      content: `Analyze this month's data cluster from {{periodLabel}} and generate a meaningful keyword.

This theme appears in {{dataPointCount}} data points this month:
{{#each sampleDataPoints}}
- {{this.date}}: {{this.summary}} ({{this.type}})
{{/each}}

Identified themes: {{themes}}
Category: {{category}}

For monthly keywords, focus on:
- Trends that persisted throughout the month
- Notable changes from previous patterns
- The overall story of this month in this category

Generate:
{
  "keyword": "2-4 word memorable phrase",
  "description": "2-4 sentences about why this month was notable for this theme",
  "emoji": "single emoji"
}`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 250 },
      variables: [
        { name: 'periodLabel', type: 'string' as const, required: true, description: 'Label for the month' },
        { name: 'dataPointCount', type: 'number' as const, required: true, description: 'Total data points in this theme' },
        { name: 'sampleDataPoints', type: 'array' as const, required: true, description: 'Sample data points' },
        { name: 'themes', type: 'string' as const, required: true, description: 'Identified themes' },
        { name: 'category', type: 'string' as const, required: true, description: 'Category' },
      ],
    },
    quarterly_keyword: {
      id: 'quarterly-keyword',
      service: 'KeywordGenerator',
      type: 'user' as const,
      description: 'Generate keywords from quarterly data clusters',
      content: `Analyze this quarter's dominant theme from {{periodLabel}}.

This theme encompasses {{dataPointCount}} data points across the quarter:
{{#each sampleDataPoints}}
- {{this.date}}: {{this.summary}} ({{this.type}})
{{/each}}

Key themes: {{themes}}
Category: {{category}}

For quarterly keywords, consider:
- How this theme evolved over the 3 months
- Whether it represents growth, consistency, or change
- The bigger picture story of this quarter

Generate a keyword that captures the quarter's narrative:
{
  "keyword": "2-4 word phrase capturing the quarter",
  "description": "2-4 sentences providing quarterly perspective",
  "emoji": "single emoji"
}`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 250 },
      variables: [
        { name: 'periodLabel', type: 'string' as const, required: true, description: 'Label for the quarter' },
        { name: 'dataPointCount', type: 'number' as const, required: true, description: 'Total data points' },
        { name: 'sampleDataPoints', type: 'array' as const, required: true, description: 'Sample data points' },
        { name: 'themes', type: 'string' as const, required: true, description: 'Key themes' },
        { name: 'category', type: 'string' as const, required: true, description: 'Category' },
      ],
    },
    yearly_keyword: {
      id: 'yearly-keyword',
      service: 'KeywordGenerator',
      type: 'user' as const,
      description: 'Generate keywords from yearly data clusters',
      content: `Analyze one of the major themes from {{periodLabel}}.

This theme represents {{dataPointCount}} moments throughout the year:
{{#each sampleDataPoints}}
- {{this.date}}: {{this.summary}} ({{this.type}})
{{/each}}

Major themes: {{themes}}
Category: {{category}}

For yearly keywords:
- Identify what made this theme significant for the year
- Consider how this reflects personal growth or interests
- Frame it as a year-defining element

Generate a keyword worthy of a year-in-review:
{
  "keyword": "2-4 word phrase defining this year's theme",
  "description": "2-4 sentences summarizing the year's story with this theme",
  "emoji": "single emoji"
}`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 300 },
      variables: [
        { name: 'periodLabel', type: 'string' as const, required: true, description: 'Label for the year' },
        { name: 'dataPointCount', type: 'number' as const, required: true, description: 'Total data points' },
        { name: 'sampleDataPoints', type: 'array' as const, required: true, description: 'Sample data points' },
        { name: 'themes', type: 'string' as const, required: true, description: 'Major themes' },
        { name: 'category', type: 'string' as const, required: true, description: 'Category' },
      ],
    },
    enhance_keyword: {
      id: 'enhance-keyword',
      service: 'KeywordGenerator',
      type: 'user' as const,
      description: 'Improve low-confidence keywords',
      content: `The following keyword was generated but needs improvement:

Current keyword: "{{currentKeyword}}"
Current description: "{{currentDescription}}"
Current emoji: {{currentEmoji}}

Data it represents:
{{#each sampleDataPoints}}
- {{this.date}}: {{this.summary}} ({{this.type}})
{{/each}}

Please improve this keyword to be more:
- Catchy and memorable
- Personally meaningful
- Insightful about the pattern

Generate an improved version:
{
  "keyword": "improved 2-4 word phrase",
  "description": "improved 2-4 sentence description",
  "emoji": "better emoji choice"
}`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.9, maxTokens: 200 },
      variables: [
        { name: 'currentKeyword', type: 'string' as const, required: true, description: 'Current keyword to improve' },
        { name: 'currentDescription', type: 'string' as const, required: true, description: 'Current description' },
        { name: 'currentEmoji', type: 'string' as const, required: true, description: 'Current emoji' },
        { name: 'sampleDataPoints', type: 'array' as const, required: true, description: 'Sample data points' },
      ],
    },
    compare_keywords: {
      id: 'compare-keywords',
      service: 'KeywordGenerator',
      type: 'user' as const,
      description: 'Compare two time periods',
      content: `Compare these two time periods and generate a keyword about the change:

Previous period ({{previousPeriodLabel}}):
{{#each previousDataPoints}}
- {{this.summary}} ({{this.type}})
{{/each}}

Current period ({{currentPeriodLabel}}):
{{#each currentDataPoints}}
- {{this.summary}} ({{this.type}})
{{/each}}

Generate a keyword that captures how things have changed:
{
  "keyword": "2-4 word phrase about the change",
  "description": "2-4 sentences comparing the periods",
  "emoji": "emoji representing change/growth/shift"
}`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 200 },
      variables: [
        { name: 'previousPeriodLabel', type: 'string' as const, required: true, description: 'Label for previous period' },
        { name: 'previousDataPoints', type: 'array' as const, required: true, description: 'Previous period data points' },
        { name: 'currentPeriodLabel', type: 'string' as const, required: true, description: 'Label for current period' },
        { name: 'currentDataPoints', type: 'array' as const, required: true, description: 'Current period data points' },
      ],
    },
  };

  // CarouselInsights prompts - AI-generated fun facts shown in home screen carousel
  // Translations for all 9 supported languages
  const carouselTranslations: Record<string, { patterns: string; surprising: string; recommendation: string }> = {
    en: {
      patterns: 'Tell me one interesting insight about my recent activities and patterns. One sentence only.',
      surprising: 'What is one surprising thing about my data that I might not have noticed? One sentence only.',
      recommendation: 'Give me one personalized recommendation based on my recent behavior. One sentence only.',
    },
    es: {
      patterns: 'Cuéntame una observación interesante sobre mis actividades y patrones recientes. Solo una oración.',
      surprising: '¿Qué es algo sorprendente en mis datos que quizás no haya notado? Solo una oración.',
      recommendation: 'Dame una recomendación personalizada basada en mi comportamiento reciente. Solo una oración.',
    },
    fr: {
      patterns: 'Donne-moi une observation intéressante sur mes activités et habitudes récentes. Une seule phrase.',
      surprising: "Qu'y a-t-il de surprenant dans mes données que je n'aurais peut-être pas remarqué? Une seule phrase.",
      recommendation: 'Donne-moi une recommandation personnalisée basée sur mon comportement récent. Une seule phrase.',
    },
    de: {
      patterns: 'Sag mir eine interessante Erkenntnis über meine letzten Aktivitäten und Muster. Nur ein Satz.',
      surprising: 'Was ist etwas Überraschendes in meinen Daten, das ich vielleicht nicht bemerkt habe? Nur ein Satz.',
      recommendation: 'Gib mir eine personalisierte Empfehlung basierend auf meinem letzten Verhalten. Nur ein Satz.',
    },
    it: {
      patterns: 'Dimmi un\'osservazione interessante sulle mie attività e abitudini recenti. Solo una frase.',
      surprising: 'Qual è qualcosa di sorprendente nei miei dati che potrei non aver notato? Solo una frase.',
      recommendation: 'Dammi un consiglio personalizzato basato sul mio comportamento recente. Solo una frase.',
    },
    pt: {
      patterns: 'Conte-me uma observação interessante sobre minhas atividades e padrões recentes. Apenas uma frase.',
      surprising: 'O que é algo surpreendente nos meus dados que eu talvez não tenha percebido? Apenas uma frase.',
      recommendation: 'Dê-me uma recomendação personalizada baseada no meu comportamento recente. Apenas uma frase.',
    },
    zh: {
      patterns: '告诉我一个关于我最近活动和习惯的有趣见解。只用一句话。',
      surprising: '我的数据中有什么令人惊讶的地方是我可能没有注意到的？只用一句话。',
      recommendation: '根据我最近的行为给我一个个性化的建议。只用一句话。',
    },
    ja: {
      patterns: '最近の活動やパターンについて興味深い洞察を1つ教えてください。一文だけで。',
      surprising: '私のデータで気づいていないかもしれない驚くべきことは何ですか？一文だけで。',
      recommendation: '最近の行動に基づいた個人的なおすすめを1つください。一文だけで。',
    },
    ko: {
      patterns: '최근 활동과 패턴에 대한 흥미로운 인사이트를 하나 알려주세요. 한 문장으로만.',
      surprising: '제 데이터에서 제가 눈치채지 못했을 수 있는 놀라운 점이 무엇인가요? 한 문장으로만.',
      recommendation: '최근 행동을 바탕으로 개인화된 추천을 하나 해주세요. 한 문장으로만.',
    },
  };

  const translations = carouselTranslations[language] || carouselTranslations['en'];

  const carouselInsightsPrompts = {
    system: {
      id: 'carousel-insights-system',
      service: 'CarouselInsights',
      type: 'system' as const,
      description: 'System prompt for generating personalized insights',
      content: `You are a friendly personal data analyst. Generate engaging, personalized insights from user data.

Guidelines:
- Be specific with numbers and data when available
- Use second person ("you") to address the user
- Be encouraging and positive
- Keep responses to ONE sentence only
- Start with an emoji that matches the insight
- Never make the user feel bad about their data`,
      metadata: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 100 },
    },
    insight_patterns: {
      id: 'carousel-insight-patterns',
      service: 'CarouselInsights',
      type: 'user' as const,
      description: 'Generate insight about recent activities and patterns',
      content: translations.patterns,
      metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 100 },
      culturalNotes: 'Keep the tone conversational and encouraging. Avoid being preachy or judgmental.',
    },
    insight_surprising: {
      id: 'carousel-insight-surprising',
      service: 'CarouselInsights',
      type: 'user' as const,
      description: 'Generate surprising observation from user data',
      content: translations.surprising,
      metadata: { model: 'gpt-4o-mini', temperature: 0.9, maxTokens: 100 },
      culturalNotes: 'Focus on positive surprises. Make the user feel like their data reveals something interesting.',
    },
    insight_recommendation: {
      id: 'carousel-insight-recommendation',
      service: 'CarouselInsights',
      type: 'user' as const,
      description: 'Generate personalized recommendation based on behavior',
      content: translations.recommendation,
      metadata: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 100 },
      culturalNotes: 'Keep recommendations actionable and achievable. Be encouraging, not demanding.',
    },
  };

  return [
    { service: 'OpenAIService', version: '1.0.0', prompts: openAIServicePrompts },
    { service: 'RAGEngine', version: '1.0.0', prompts: ragEnginePrompts },
    { service: 'QueryRAGServer', version: '1.0.0', prompts: queryRAGServerPrompts },
    { service: 'LifeFeedGenerator', version: '1.0.0', prompts: lifeFeedGeneratorPrompts },
    { service: 'KeywordGenerator', version: '1.0.0', prompts: keywordGeneratorPrompts },
    { service: 'CarouselInsights', version: '1.1.0', prompts: carouselInsightsPrompts },
  ];
}
