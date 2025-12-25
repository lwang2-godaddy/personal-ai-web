import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage, ChatState } from '@/lib/models';

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  error: null,
};

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
      const conversationHistory = state.chat.messages;

      // Call API route instead of direct RAGEngine
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          userId,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      const result = await response.json();

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
      // Call API route
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          userId,
          conversationHistory: [],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      const result = await response.json();

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
    // Send message with history
    builder.addCase(sendMessage.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(sendMessage.fulfilled, (state, action) => {
      state.messages.push(action.payload.userMessage);
      state.messages.push(action.payload.assistantMessage);
      state.isLoading = false;
    });
    builder.addCase(sendMessage.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
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
