export type MessageRole = 'user' | 'assistant' | 'system';

export type FeedbackRating = 'thumbs_up' | 'thumbs_down';

export interface MessageFeedback {
  rating: FeedbackRating;
  timestamp: string;  // ISO 8601
  comment?: string;   // Optional text (max 500 chars)
}

export interface ChatMessage {
  id?: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  voiceInput?: boolean;
  contextUsed?: ContextReference[];
  conversationId?: string;

  // Provider/Model tracking (only on assistant messages)
  provider?: string;           // 'openai' | 'google' | 'anthropic' | 'ollama'
  model?: string;              // 'gpt-4o' | 'gpt-4o-mini' | 'gemini-2.5-flash'
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  estimatedCostUSD?: number;
  promptExecutionId?: string;  // Link to promptExecutions for full audit

  // Feedback (only on assistant messages)
  feedback?: MessageFeedback;
}

export interface ContextReference {
  id: string;
  score: number;
  type: 'health' | 'location' | 'voice' | 'photo';
  snippet?: string;
}

export interface ChatHistory {
  id?: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
}
