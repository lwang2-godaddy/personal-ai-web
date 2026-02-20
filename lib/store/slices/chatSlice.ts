import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage, ChatState, FeedbackRating, MessageFeedback } from '@/lib/models';
import { apiPost, apiPatch } from '@/lib/api/client';

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  error: null,
  conversationId: null, // Track current conversation
};

// Constant ID for typing indicator (easy to find and remove)
const TYPING_INDICATOR_ID = '__typing__';

/**
 * Send a message and get AI response using RAG (via API route)
 * Messages are persisted to Firestore:
 * - Conversations: users/{userId}/conversations
 * - Messages: chat_messages collection
 */
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (
    { message, userId }: { message: string; userId: string },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as any;
      // Filter out typing indicator from conversation history
      const conversationHistory = state.chat.messages.filter(
        (m: ChatMessage) => m.id !== TYPING_INDICATOR_ID
      );
      const conversationId = state.chat.conversationId;

      // Call API route with authentication
      const result = await apiPost('/api/chat', {
        message,
        userId,
        conversationHistory,
        conversationId, // Pass existing conversation ID or null for new
      });

      // Only return AI response (user message already added in pending state)
      return {
        assistantMessage: {
          id: result.assistantMessageId, // Firestore document ID for feedback
          role: 'assistant' as const,
          content: result.response,
          timestamp: new Date().toISOString(),
          contextUsed: result.contextUsed,
        },
        conversationId: result.conversationId, // Return conversation ID from server
      };
    } catch (error: any) {
      console.error('Chat error:', error);
      return rejectWithValue(error.message || 'Failed to get response');
    }
  }
);

/**
 * Send a message without conversation history (fresh query)
 * Creates a new conversation
 */
export const sendFreshMessage = createAsyncThunk(
  'chat/sendFreshMessage',
  async (
    { message, userId }: { message: string; userId: string },
    { rejectWithValue }
  ) => {
    try {
      // Call API route with authentication - no conversationId means new conversation
      const result = await apiPost('/api/chat', {
        message,
        userId,
        conversationHistory: [],
        conversationId: null, // Force new conversation
      });

      return {
        userMessage: {
          role: 'user' as const,
          content: message,
          timestamp: new Date().toISOString(),
          voiceInput: false,
        },
        assistantMessage: {
          id: result.assistantMessageId, // Firestore document ID for feedback
          role: 'assistant' as const,
          content: result.response,
          timestamp: new Date().toISOString(),
          contextUsed: result.contextUsed,
        },
        conversationId: result.conversationId,
      };
    } catch (error: any) {
      console.error('Chat error:', error);
      return rejectWithValue(error.message || 'Failed to get response');
    }
  }
);

/**
 * Submit feedback (thumbs up/down) for an assistant message
 * Sends rating to null to remove feedback (toggle off)
 */
export const submitFeedback = createAsyncThunk(
  'chat/submitFeedback',
  async (
    { messageId, rating }: { messageId: string; rating: FeedbackRating | null },
    { rejectWithValue }
  ) => {
    try {
      await apiPatch('/api/chat/feedback', { messageId, rating });
      return { messageId, rating };
    } catch (error: any) {
      console.error('Feedback error:', error);
      return rejectWithValue(error.message || 'Failed to submit feedback');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    clearMessages: (state) => {
      state.messages = [];
      state.error = null;
      state.conversationId = null; // Clear conversation when messages cleared
    },
    clearError: (state) => {
      state.error = null;
    },
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    setConversationId: (state, action: PayloadAction<string | null>) => {
      state.conversationId = action.payload;
    },
    updateMessageFeedback: (state, action: PayloadAction<{ messageId: string; feedback: MessageFeedback | null }>) => {
      const msg = state.messages.find(m => m.id === action.payload.messageId);
      if (msg) {
        msg.feedback = action.payload.feedback ?? undefined;
      }
    },
  },
  extraReducers: (builder) => {
    // Send message with history - optimistic updates pattern
    builder.addCase(sendMessage.pending, (state, action) => {
      state.isLoading = true;
      state.error = null;

      // Immediately add user message (optimistic update)
      state.messages.push({
        role: 'user',
        content: action.meta.arg.message,
        timestamp: new Date().toISOString(),
        voiceInput: false,
      });

      // Add typing indicator
      state.messages.push({
        id: TYPING_INDICATOR_ID,
        role: 'system',
        content: '', // Empty content, will render TypingIndicator component
        timestamp: new Date().toISOString(),
      });
    });
    builder.addCase(sendMessage.fulfilled, (state, action) => {
      state.isLoading = false;

      // Remove typing indicator
      state.messages = state.messages.filter(m => m.id !== TYPING_INDICATOR_ID);

      // Add assistant message
      state.messages.push(action.payload.assistantMessage);

      // Update conversation ID (may be new if first message)
      if (action.payload.conversationId) {
        state.conversationId = action.payload.conversationId;
      }
    });
    builder.addCase(sendMessage.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;

      // Remove typing indicator
      state.messages = state.messages.filter(m => m.id !== TYPING_INDICATOR_ID);

      // Add error message to chat
      state.messages.push({
        id: `error_${Date.now()}`,
        role: 'system',
        content: `Error: ${action.payload || 'Failed to send message'}`,
        timestamp: new Date().toISOString(),
      });
    });

    // Send fresh message
    builder.addCase(sendFreshMessage.pending, (state) => {
      state.isLoading = true;
      state.error = null;
      state.conversationId = null; // Reset conversation ID for fresh start
    });
    builder.addCase(sendFreshMessage.fulfilled, (state, action) => {
      state.messages.push(action.payload.userMessage);
      state.messages.push(action.payload.assistantMessage);
      state.isLoading = false;
      state.conversationId = action.payload.conversationId; // Set new conversation ID
    });
    builder.addCase(sendFreshMessage.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Submit feedback - revert optimistic update on failure
    builder.addCase(submitFeedback.rejected, (state, action) => {
      // On failure, the optimistic update was already applied via updateMessageFeedback.
      // We could revert here but for simplicity we just log it.
      console.error('Feedback submission failed:', action.payload);
    });
  },
});

export const { clearMessages, clearError, addMessage, setConversationId, updateMessageFeedback } = chatSlice.actions;
export default chatSlice.reducer;
