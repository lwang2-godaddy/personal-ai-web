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

  return [
    { service: 'OpenAIService', version: '1.0.0', prompts: openAIServicePrompts },
    { service: 'RAGEngine', version: '1.0.0', prompts: ragEnginePrompts },
    { service: 'QueryRAGServer', version: '1.0.0', prompts: queryRAGServerPrompts },
  ];
}
