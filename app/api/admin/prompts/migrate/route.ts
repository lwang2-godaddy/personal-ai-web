import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getPromptService } from '@/lib/services/prompts/PromptService';
import { PROMPT_SERVICES, SUPPORTED_LANGUAGES } from '@/lib/models/Prompt';

/**
 * POST /api/admin/prompts/migrate
 * Import prompt configurations from YAML content or trigger Cloud Function migration
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

  return [
    { service: 'OpenAIService', version: '1.0.0', prompts: openAIServicePrompts },
    { service: 'RAGEngine', version: '1.0.0', prompts: ragEnginePrompts },
    { service: 'QueryRAGServer', version: '1.0.0', prompts: queryRAGServerPrompts },
    { service: 'LifeFeedGenerator', version: '1.0.0', prompts: lifeFeedGeneratorPrompts },
  ];
}
