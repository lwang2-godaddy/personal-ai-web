/**
 * Pre-built prompt templates for the admin portal
 * Makes it easy to create common prompt patterns
 */

import { PromptVariable } from '@/lib/models/Prompt';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'chat' | 'rag' | 'summarization' | 'extraction' | 'generation';
  data: {
    systemPrompt: string;
    userPromptTemplate: string;
    model: string;
    maxTokens: number;
    temperature: number;
    variables: PromptVariable[];
  };
}

export interface TemplateCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'chat',
    name: 'Chat',
    icon: '💬',
    description: 'Conversational prompts for chat interfaces',
  },
  {
    id: 'rag',
    name: 'RAG',
    icon: '🔍',
    description: 'Retrieval-augmented generation prompts',
  },
  {
    id: 'summarization',
    name: 'Summarization',
    icon: '📝',
    description: 'Text summarization and condensation',
  },
  {
    id: 'extraction',
    name: 'Extraction',
    icon: '🔬',
    description: 'Data and entity extraction',
  },
  {
    id: 'generation',
    name: 'Generation',
    icon: '✨',
    description: 'Content generation and creative writing',
  },
];

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // Chat Templates
  {
    id: 'chat-basic',
    name: 'Basic Chat',
    description: 'Simple conversational AI response',
    category: 'chat',
    data: {
      systemPrompt: 'You are a helpful assistant. Respond concisely and accurately.',
      userPromptTemplate: '{{userMessage}}',
      model: 'gpt-4o-mini',
      maxTokens: 1000,
      temperature: 0.7,
      variables: [
        { name: 'userMessage', type: 'string', description: 'The user message', required: true },
      ],
    },
  },
  {
    id: 'chat-personal',
    name: 'Personal Assistant',
    description: 'Personalized assistant with user context',
    category: 'chat',
    data: {
      systemPrompt: `You are a personal AI assistant with access to the user's data.
Be helpful, friendly, and personalized in your responses.
Use the user's name when appropriate and reference their past activities.`,
      userPromptTemplate: `User: {{userName}}
Context: {{userContext}}

Question: {{userMessage}}`,
      model: 'gpt-4o',
      maxTokens: 1500,
      temperature: 0.7,
      variables: [
        { name: 'userName', type: 'string', description: "User's name", required: false },
        { name: 'userContext', type: 'string', description: 'Relevant user context', required: false },
        { name: 'userMessage', type: 'string', description: 'The user message', required: true },
      ],
    },
  },
  {
    id: 'chat-multilingual',
    name: 'Multilingual Chat',
    description: 'Responds in the user\'s language',
    category: 'chat',
    data: {
      systemPrompt: `You are a multilingual assistant. Always respond in the same language as the user's message.
Be culturally aware and appropriate for the detected language.`,
      userPromptTemplate: '{{userMessage}}',
      model: 'gpt-4o',
      maxTokens: 1000,
      temperature: 0.7,
      variables: [
        { name: 'userMessage', type: 'string', description: 'The user message in any language', required: true },
      ],
    },
  },

  // RAG Templates
  {
    id: 'rag-query',
    name: 'RAG Query',
    description: 'Answer questions using retrieved context',
    category: 'rag',
    data: {
      systemPrompt: `You are a knowledgeable assistant. Answer the user's question based ONLY on the provided context.
If the context doesn't contain enough information to answer fully, say so clearly.
Never make up information not present in the context.`,
      userPromptTemplate: `Context:
{{context}}

Question: {{question}}`,
      model: 'gpt-4o',
      maxTokens: 2000,
      temperature: 0.3,
      variables: [
        { name: 'context', type: 'string', description: 'Retrieved context documents', required: true },
        { name: 'question', type: 'string', description: 'User question', required: true },
      ],
    },
  },
  {
    id: 'rag-personal-data',
    name: 'Personal Data Query',
    description: 'Answer questions about user\'s personal data',
    category: 'rag',
    data: {
      systemPrompt: `You are analyzing the user's personal data to answer their question.
Be specific with dates, times, and locations when mentioned in the data.
If calculating counts or statistics, show your reasoning.
Reference specific data points to support your answer.`,
      userPromptTemplate: `User's Data:
{{userData}}

Today's Date: {{currentDate}}

Question: {{question}}`,
      model: 'gpt-4o',
      maxTokens: 2000,
      temperature: 0.2,
      variables: [
        { name: 'userData', type: 'string', description: 'Retrieved user data', required: true },
        { name: 'currentDate', type: 'string', description: 'Current date for temporal context', required: true },
        { name: 'question', type: 'string', description: 'User question', required: true },
      ],
    },
  },
  {
    id: 'rag-cite-sources',
    name: 'RAG with Citations',
    description: 'Answer with source citations',
    category: 'rag',
    data: {
      systemPrompt: `You are a research assistant. Answer questions using the provided sources.
Always cite your sources using [1], [2], etc. format.
If multiple sources support a claim, cite all of them.
If sources conflict, acknowledge the discrepancy.`,
      userPromptTemplate: `Sources:
{{sources}}

Question: {{question}}

Provide your answer with citations.`,
      model: 'gpt-4o',
      maxTokens: 2500,
      temperature: 0.2,
      variables: [
        { name: 'sources', type: 'string', description: 'Numbered source documents', required: true },
        { name: 'question', type: 'string', description: 'User question', required: true },
      ],
    },
  },

  // Summarization Templates
  {
    id: 'summarization-basic',
    name: 'Text Summarization',
    description: 'Summarize long text into key points',
    category: 'summarization',
    data: {
      systemPrompt: 'You are a summarization expert. Create concise, accurate summaries that capture the key points without losing important details.',
      userPromptTemplate: `Please summarize the following text in {{length}} format:

{{text}}`,
      model: 'gpt-4o-mini',
      maxTokens: 500,
      temperature: 0.3,
      variables: [
        { name: 'text', type: 'string', description: 'Text to summarize', required: true },
        { name: 'length', type: 'string', description: 'Desired length (brief, moderate, detailed)', required: false },
      ],
    },
  },
  {
    id: 'summarization-daily',
    name: 'Daily Summary',
    description: 'Summarize a day\'s activities',
    category: 'summarization',
    data: {
      systemPrompt: `You are creating a daily summary for a personal AI assistant.
Highlight key activities, achievements, and notable moments.
Use a friendly, encouraging tone.
Keep it concise but informative.`,
      userPromptTemplate: `Activities for {{date}}:
{{activities}}

Create a personalized daily summary.`,
      model: 'gpt-4o-mini',
      maxTokens: 400,
      temperature: 0.7,
      variables: [
        { name: 'date', type: 'string', description: 'Date being summarized', required: true },
        { name: 'activities', type: 'string', description: 'List of activities', required: true },
      ],
    },
  },
  {
    id: 'summarization-weekly',
    name: 'Weekly Recap',
    description: 'Create a weekly activity recap',
    category: 'summarization',
    data: {
      systemPrompt: `You are creating a weekly recap for a personal AI assistant.
Identify trends, patterns, and highlights from the week.
Compare to typical patterns if available.
End with an encouraging insight or suggestion.`,
      userPromptTemplate: `Week of {{weekStart}} to {{weekEnd}}

Activities:
{{activities}}

Health Data:
{{healthData}}

Create an engaging weekly recap.`,
      model: 'gpt-4o-mini',
      maxTokens: 600,
      temperature: 0.7,
      variables: [
        { name: 'weekStart', type: 'string', description: 'Start date', required: true },
        { name: 'weekEnd', type: 'string', description: 'End date', required: true },
        { name: 'activities', type: 'string', description: 'Weekly activities', required: true },
        { name: 'healthData', type: 'string', description: 'Health metrics', required: false },
      ],
    },
  },

  // Extraction Templates
  {
    id: 'extraction-entities',
    name: 'Entity Extraction',
    description: 'Extract people, places, and things',
    category: 'extraction',
    data: {
      systemPrompt: `You are an entity extraction specialist.
Extract all mentioned entities and categorize them.
Be precise and don't infer entities not explicitly mentioned.
Return results in valid JSON format.`,
      userPromptTemplate: `Extract entities from this text:

{{text}}

Return as JSON with categories: people, places, organizations, dates, events.`,
      model: 'gpt-4o-mini',
      maxTokens: 1000,
      temperature: 0.1,
      variables: [
        { name: 'text', type: 'string', description: 'Text to extract from', required: true },
      ],
    },
  },
  {
    id: 'extraction-sentiment',
    name: 'Sentiment Analysis',
    description: 'Analyze emotional tone of text',
    category: 'extraction',
    data: {
      systemPrompt: `You are a sentiment analysis expert.
Analyze the emotional tone and provide:
1. Overall sentiment (positive, negative, neutral, mixed)
2. Confidence score (0-1)
3. Key emotional indicators
Return as JSON.`,
      userPromptTemplate: `Analyze the sentiment of this text:

{{text}}`,
      model: 'gpt-4o-mini',
      maxTokens: 300,
      temperature: 0.1,
      variables: [
        { name: 'text', type: 'string', description: 'Text to analyze', required: true },
      ],
    },
  },
  {
    id: 'extraction-json',
    name: 'JSON Extraction',
    description: 'Extract structured data as JSON',
    category: 'extraction',
    data: {
      systemPrompt: `You are a data extraction specialist.
Extract the requested information and return it in valid JSON format.
Only include fields that have values in the text.
Use null for missing optional fields.`,
      userPromptTemplate: `Extract {{dataType}} from the following text and return as JSON:

{{text}}

Schema: {{schema}}`,
      model: 'gpt-4o-mini',
      maxTokens: 1000,
      temperature: 0.1,
      variables: [
        { name: 'dataType', type: 'string', description: 'Type of data to extract', required: true },
        { name: 'text', type: 'string', description: 'Source text', required: true },
        { name: 'schema', type: 'string', description: 'Expected JSON schema', required: false },
      ],
    },
  },
  {
    id: 'extraction-events',
    name: 'Event Extraction',
    description: 'Extract events with dates and times',
    category: 'extraction',
    data: {
      systemPrompt: `You are an event extraction specialist.
Extract all events mentioned with their dates, times, and participants.
Normalize dates to ISO 8601 format when possible.
Flag uncertain dates.
Return as JSON array of events.`,
      userPromptTemplate: `Today's date: {{currentDate}}

Extract events from:
{{text}}`,
      model: 'gpt-4o-mini',
      maxTokens: 800,
      temperature: 0.1,
      variables: [
        { name: 'currentDate', type: 'string', description: 'Current date for context', required: true },
        { name: 'text', type: 'string', description: 'Text containing events', required: true },
      ],
    },
  },

  // Generation Templates
  {
    id: 'generation-insight',
    name: 'Life Feed Insight',
    description: 'Generate personal insights from user data',
    category: 'generation',
    data: {
      systemPrompt: `You are a personal AI generating insights for a "Life Feed" feature.
Create brief, engaging, personalized insights.
Be encouraging and positive.
Use emojis sparingly but effectively.
Keep insights to 1-2 sentences.`,
      userPromptTemplate: `Based on the user's {{dataType}} data:
{{data}}

Generate a brief, personalized insight.`,
      model: 'gpt-4o-mini',
      maxTokens: 150,
      temperature: 0.8,
      variables: [
        { name: 'dataType', type: 'string', description: 'Type of data being analyzed', required: true },
        { name: 'data', type: 'string', description: 'User data to analyze', required: true },
      ],
    },
  },
  {
    id: 'generation-suggestion',
    name: 'Smart Suggestion',
    description: 'Generate proactive suggestions',
    category: 'generation',
    data: {
      systemPrompt: `You are generating smart suggestions for a personal AI assistant.
Suggestions should be:
- Actionable and specific
- Based on user's patterns and data
- Timely and relevant
- Encouraging but not pushy
Keep suggestions brief (1-2 sentences).`,
      userPromptTemplate: `User patterns:
{{patterns}}

Current context:
{{context}}

Generate a helpful suggestion.`,
      model: 'gpt-4o-mini',
      maxTokens: 150,
      temperature: 0.7,
      variables: [
        { name: 'patterns', type: 'string', description: 'User behavior patterns', required: true },
        { name: 'context', type: 'string', description: 'Current context (time, location, etc.)', required: false },
      ],
    },
  },
  {
    id: 'generation-title',
    name: 'Memory Title',
    description: 'Generate a title for a memory/note',
    category: 'generation',
    data: {
      systemPrompt: `You are generating titles for personal memories and notes.
Titles should be:
- Concise (3-8 words)
- Descriptive and meaningful
- Capture the essence of the content
- Not clickbaity or sensational`,
      userPromptTemplate: `Generate a title for this {{contentType}}:

{{content}}`,
      model: 'gpt-4o-mini',
      maxTokens: 50,
      temperature: 0.6,
      variables: [
        { name: 'contentType', type: 'string', description: 'Type of content (note, voice memo, etc.)', required: true },
        { name: 'content', type: 'string', description: 'Content to title', required: true },
      ],
    },
  },
  {
    id: 'generation-achievement',
    name: 'Achievement Message',
    description: 'Generate achievement/milestone messages',
    category: 'generation',
    data: {
      systemPrompt: `You are generating achievement messages for a personal AI assistant.
Messages should be:
- Celebratory and encouraging
- Specific to the achievement
- Include relevant emoji
- Brief (1-2 sentences)`,
      userPromptTemplate: `The user achieved: {{achievement}}

Details: {{details}}

Generate a celebratory message.`,
      model: 'gpt-4o-mini',
      maxTokens: 100,
      temperature: 0.8,
      variables: [
        { name: 'achievement', type: 'string', description: 'What was achieved', required: true },
        { name: 'details', type: 'string', description: 'Additional context', required: false },
      ],
    },
  },
];

/**
 * Get templates by category
 * @param categoryId Category ID
 * @returns Prompt templates in that category
 */
export function getTemplatesByCategory(categoryId: string): PromptTemplate[] {
  return PROMPT_TEMPLATES.filter((t) => t.category === categoryId);
}

/**
 * Get a single template by ID
 * @param templateId Template ID
 * @returns The template or undefined
 */
export function getTemplateById(templateId: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find((t) => t.id === templateId);
}
