export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id?: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  voiceInput?: boolean;
  contextUsed?: ContextReference[];
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
}
