import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage, ChatState } from '@/lib/models';
import { apiPost } from '@/lib/api/client';

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  error: null,
};

// Constant ID for typing indicator (easy to find and remove)
const TYPING_INDICATOR_ID = '__typing__';

/**
 * Send a message and get AI response using RAG (via API route)
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

      // Call API route with authentication
      const result = await apiPost('/api/chat', {
        message,
        userId,
        conversationHistory,
      });

      // Only return AI response (user message already added in pending state)
      return {
        assistantMessage: {
          role: 'assistant' as const,
          content: result.response,
          timestamp: new Date().toISOString(),
          contextUsed: result.contextUsed,
        },
      };
    } catch (error: any) {
      console.error('Chat error:', error);
      return rejectWithValue(error.message || 'Failed to get response');
    }
  }
);

/**
 * Send a message without conversation history (fresh query)
 */
export const sendFreshMessage = createAsyncThunk(
  'chat/sendFreshMessage',
  async (
    { message, userId }: { message: string; userId: string },
    { rejectWithValue }
  ) => {
    try {
      // Call API route with authentication
      const result = await apiPost('/api/chat', {
        message,
        userId,
        conversationHistory: [],
      });

      return {
        userMessage: {
          role: 'user' as const,
          content: message,
          timestamp: new Date().toISOString(),
          voiceInput: false,
        },
        assistantMessage: {
          role: 'assistant' as const,
          content: result.response,
          timestamp: new Date().toISOString(),
          contextUsed: result.contextUsed,
        },
      };
    } catch (error: any) {
      console.error('Chat error:', error);
      return rejectWithValue(error.message || 'Failed to get response');
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
    },
    clearError: (state) => {
      state.error = null;
    },
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
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
    });
    builder.addCase(sendFreshMessage.fulfilled, (state, action) => {
      state.messages.push(action.payload.userMessage);
      state.messages.push(action.payload.assistantMessage);
      state.isLoading = false;
    });
    builder.addCase(sendFreshMessage.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearMessages, clearError, addMessage } = chatSlice.actions;
export default chatSlice.reducer;
