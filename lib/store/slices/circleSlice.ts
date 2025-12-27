import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CircleService } from '../../services/social/CircleService';
import {
  Circle,
  CircleMember,
  CircleInvite,
  CircleMessage,
  CircleAnalytics,
} from '../../models/Circle';

// ==================== State Interface ====================

interface CircleState {
  circles: Circle[];
  circleMembers: { [circleId: string]: CircleMember[] };
  circleInvites: CircleInvite[];
  circleMessages: { [circleId: string]: CircleMessage[] };
  circleAnalytics: { [circleId: string]: CircleAnalytics };
  selectedCircleId: string | null;
  isLoading: boolean;
  error: string | null;
  loadingStatus: {
    circles: 'idle' | 'loading' | 'success' | 'error';
    messages: { [circleId: string]: 'idle' | 'loading' | 'success' | 'error' };
    invites: 'idle' | 'loading' | 'success' | 'error';
    analytics: { [circleId: string]: 'idle' | 'loading' | 'success' | 'error' };
  };
}

const initialState: CircleState = {
  circles: [],
  circleMembers: {},
  circleInvites: [],
  circleMessages: {},
  circleAnalytics: {},
  selectedCircleId: null,
  isLoading: false,
  error: null,
  loadingStatus: {
    circles: 'idle',
    messages: {},
    invites: 'idle',
    analytics: {},
  },
};

// ==================== Async Thunks ====================

/**
 * Fetch all circles for a user
 */
export const fetchCircles = createAsyncThunk(
  'circles/fetchCircles',
  async (userId: string, { rejectWithValue }) => {
    try {
      const circles = await CircleService.getInstance().getCircles(userId);
      return circles;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch circles');
    }
  },
);

/**
 * Create a new circle
 */
export const createCircle = createAsyncThunk(
  'circles/createCircle',
  async (
    circleData: Omit<Circle, 'id' | 'createdAt' | 'updatedAt'>,
    { rejectWithValue },
  ) => {
    try {
      const circle = await CircleService.getInstance().createCircle(circleData);
      return circle;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create circle');
    }
  },
);

/**
 * Update circle details
 */
export const updateCircle = createAsyncThunk(
  'circles/updateCircle',
  async (
    { circleId, updates }: { circleId: string; updates: Partial<Circle> },
    { rejectWithValue },
  ) => {
    try {
      await CircleService.getInstance().updateCircle(circleId, updates);
      return { circleId, updates };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update circle');
    }
  },
);

/**
 * Delete a circle
 */
export const deleteCircle = createAsyncThunk(
  'circles/deleteCircle',
  async (circleId: string, { rejectWithValue }) => {
    try {
      await CircleService.getInstance().deleteCircle(circleId);
      return circleId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete circle');
    }
  },
);

/**
 * Invite a friend to a circle
 */
export const inviteToCircle = createAsyncThunk(
  'circles/inviteToCircle',
  async (
    { circleId, friendId, message }: { circleId: string; friendId: string; message?: string },
    { rejectWithValue },
  ) => {
    try {
      const invite = await CircleService.getInstance().inviteToCircle(circleId, friendId, message);
      return invite;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send invite');
    }
  },
);

/**
 * Fetch circle invites for a user
 */
export const fetchCircleInvites = createAsyncThunk(
  'circles/fetchCircleInvites',
  async (userId: string, { rejectWithValue }) => {
    try {
      const invites = await CircleService.getInstance().getCircleInvites(userId);
      return invites;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch invites');
    }
  },
);

/**
 * Accept a circle invitation
 */
export const acceptCircleInvite = createAsyncThunk(
  'circles/acceptCircleInvite',
  async (inviteId: string, { rejectWithValue }) => {
    try {
      await CircleService.getInstance().acceptInvite(inviteId);
      return inviteId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to accept invite');
    }
  },
);

/**
 * Reject a circle invitation
 */
export const rejectCircleInvite = createAsyncThunk(
  'circles/rejectCircleInvite',
  async (inviteId: string, { rejectWithValue }) => {
    try {
      await CircleService.getInstance().rejectInvite(inviteId);
      return inviteId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to reject invite');
    }
  },
);

/**
 * Fetch members of a circle
 */
export const fetchCircleMembers = createAsyncThunk(
  'circles/fetchCircleMembers',
  async (circleId: string, { rejectWithValue }) => {
    try {
      const members = await CircleService.getInstance().getCircleMembers(circleId);
      return { circleId, members };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch members');
    }
  },
);

/**
 * Update member role
 */
export const updateMemberRole = createAsyncThunk(
  'circles/updateMemberRole',
  async (
    { circleId, userId, role }: { circleId: string; userId: string; role: 'admin' | 'member' },
    { rejectWithValue },
  ) => {
    try {
      await CircleService.getInstance().updateMemberRole(circleId, userId, role);
      return { circleId, userId, role };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update member role');
    }
  },
);

/**
 * Remove a member from circle
 */
export const removeMember = createAsyncThunk(
  'circles/removeMember',
  async (
    { circleId, userId, reason }: { circleId: string; userId: string; reason?: string },
    { rejectWithValue },
  ) => {
    try {
      await CircleService.getInstance().removeMember(circleId, userId, reason);
      return { circleId, userId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to remove member');
    }
  },
);

/**
 * Leave a circle
 */
export const leaveCircle = createAsyncThunk(
  'circles/leaveCircle',
  async ({ circleId, userId }: { circleId: string; userId: string }, { rejectWithValue }) => {
    try {
      await CircleService.getInstance().leaveCircle(circleId, userId);
      return circleId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to leave circle');
    }
  },
);

/**
 * Send a message to circle chat
 */
export const sendCircleMessage = createAsyncThunk(
  'circles/sendCircleMessage',
  async (
    { circleId, content, type }: { circleId: string; content: string; type?: 'text' | 'voice' | 'system' },
    { rejectWithValue },
  ) => {
    try {
      const message = await CircleService.getInstance().sendMessage(circleId, content, type);
      return { circleId, message };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send message');
    }
  },
);

/**
 * Fetch messages from circle chat
 */
export const fetchCircleMessages = createAsyncThunk(
  'circles/fetchCircleMessages',
  async (
    { circleId, limit, startAfter }: { circleId: string; limit?: number; startAfter?: string },
    { rejectWithValue },
  ) => {
    try {
      const messages = await CircleService.getInstance().getMessages(circleId, limit, startAfter);
      return { circleId, messages };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch messages');
    }
  },
);

/**
 * Delete a message
 */
export const deleteCircleMessage = createAsyncThunk(
  'circles/deleteCircleMessage',
  async (
    { circleId, messageId }: { circleId: string; messageId: string },
    { rejectWithValue },
  ) => {
    try {
      await CircleService.getInstance().deleteMessage(circleId, messageId);
      return { circleId, messageId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete message');
    }
  },
);

/**
 * Add reaction to a message
 */
export const addMessageReaction = createAsyncThunk(
  'circles/addMessageReaction',
  async (
    { circleId, messageId, emoji }: { circleId: string; messageId: string; emoji: string },
    { rejectWithValue },
  ) => {
    try {
      await CircleService.getInstance().addReaction(circleId, messageId, emoji);
      return { circleId, messageId, emoji };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add reaction');
    }
  },
);

/**
 * Fetch analytics for a circle
 */
export const fetchCircleAnalytics = createAsyncThunk(
  'circles/fetchCircleAnalytics',
  async (circleId: string, { rejectWithValue }) => {
    try {
      const analytics = await CircleService.getInstance().getAnalytics(circleId);
      return { circleId, analytics };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch analytics');
    }
  },
);

// ==================== Slice ====================

const circleSlice = createSlice({
  name: 'circles',
  initialState,
  reducers: {
    /**
     * Select a circle
     */
    selectCircle: (state, action: PayloadAction<string | null>) => {
      state.selectedCircleId = action.payload;
    },

    /**
     * Clear error
     */
    clearCircleError: (state) => {
      state.error = null;
    },

    /**
     * Reset circle state
     */
    resetCircleState: () => initialState,
  },
  extraReducers: (builder) => {
    // Fetch Circles
    builder
      .addCase(fetchCircles.pending, (state) => {
        state.loadingStatus.circles = 'loading';
        state.isLoading = true;
      })
      .addCase(fetchCircles.fulfilled, (state, action) => {
        state.loadingStatus.circles = 'success';
        state.isLoading = false;
        state.circles = action.payload;
      })
      .addCase(fetchCircles.rejected, (state, action) => {
        state.loadingStatus.circles = 'error';
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create Circle
    builder
      .addCase(createCircle.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createCircle.fulfilled, (state, action) => {
        state.isLoading = false;
        state.circles.unshift(action.payload);
      })
      .addCase(createCircle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Circle
    builder
      .addCase(updateCircle.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateCircle.fulfilled, (state, action) => {
        state.isLoading = false;
        const { circleId, updates } = action.payload;
        const index = state.circles.findIndex((c) => c.id === circleId);
        if (index !== -1) {
          state.circles[index] = { ...state.circles[index], ...updates };
        }
      })
      .addCase(updateCircle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete Circle
    builder
      .addCase(deleteCircle.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteCircle.fulfilled, (state, action) => {
        state.isLoading = false;
        state.circles = state.circles.filter((c) => c.id !== action.payload);
        delete state.circleMembers[action.payload];
        delete state.circleMessages[action.payload];
        delete state.circleAnalytics[action.payload];
      })
      .addCase(deleteCircle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Circle Invites
    builder
      .addCase(fetchCircleInvites.pending, (state) => {
        state.loadingStatus.invites = 'loading';
      })
      .addCase(fetchCircleInvites.fulfilled, (state, action) => {
        state.loadingStatus.invites = 'success';
        state.circleInvites = action.payload;
      })
      .addCase(fetchCircleInvites.rejected, (state, action) => {
        state.loadingStatus.invites = 'error';
        state.error = action.payload as string;
      });

    // Accept Circle Invite
    builder
      .addCase(acceptCircleInvite.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(acceptCircleInvite.fulfilled, (state, action) => {
        state.isLoading = false;
        state.circleInvites = state.circleInvites.filter((i) => i.id !== action.payload);
      })
      .addCase(acceptCircleInvite.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Reject Circle Invite
    builder
      .addCase(rejectCircleInvite.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(rejectCircleInvite.fulfilled, (state, action) => {
        state.isLoading = false;
        state.circleInvites = state.circleInvites.filter((i) => i.id !== action.payload);
      })
      .addCase(rejectCircleInvite.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Circle Members
    builder
      .addCase(fetchCircleMembers.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCircleMembers.fulfilled, (state, action) => {
        state.isLoading = false;
        const { circleId, members } = action.payload;
        state.circleMembers[circleId] = members;
      })
      .addCase(fetchCircleMembers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Leave Circle
    builder
      .addCase(leaveCircle.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(leaveCircle.fulfilled, (state, action) => {
        state.isLoading = false;
        state.circles = state.circles.filter((c) => c.id !== action.payload);
        delete state.circleMembers[action.payload];
        delete state.circleMessages[action.payload];
      })
      .addCase(leaveCircle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Send Circle Message
    builder
      .addCase(sendCircleMessage.pending, (state, action) => {
        const circleId = action.meta.arg.circleId;
        if (!state.loadingStatus.messages[circleId]) {
          state.loadingStatus.messages[circleId] = 'loading';
        }
      })
      .addCase(sendCircleMessage.fulfilled, (state, action) => {
        const { circleId, message } = action.payload;
        state.loadingStatus.messages[circleId] = 'success';
        if (!state.circleMessages[circleId]) {
          state.circleMessages[circleId] = [];
        }
        state.circleMessages[circleId].unshift(message);
      })
      .addCase(sendCircleMessage.rejected, (state, action) => {
        const circleId = action.meta.arg.circleId;
        state.loadingStatus.messages[circleId] = 'error';
        state.error = action.payload as string;
      });

    // Fetch Circle Messages
    builder
      .addCase(fetchCircleMessages.pending, (state, action) => {
        const circleId = action.meta.arg.circleId;
        state.loadingStatus.messages[circleId] = 'loading';
      })
      .addCase(fetchCircleMessages.fulfilled, (state, action) => {
        const { circleId, messages } = action.payload;
        state.loadingStatus.messages[circleId] = 'success';
        state.circleMessages[circleId] = messages;
      })
      .addCase(fetchCircleMessages.rejected, (state, action) => {
        const circleId = action.meta.arg.circleId;
        state.loadingStatus.messages[circleId] = 'error';
        state.error = action.payload as string;
      });

    // Delete Circle Message
    builder
      .addCase(deleteCircleMessage.fulfilled, (state, action) => {
        const { circleId, messageId } = action.payload;
        if (state.circleMessages[circleId]) {
          const message = state.circleMessages[circleId].find((m) => m.id === messageId);
          if (message) {
            message.deletedAt = new Date().toISOString();
          }
        }
      });

    // Fetch Circle Analytics
    builder
      .addCase(fetchCircleAnalytics.pending, (state, action) => {
        const circleId = action.meta.arg;
        state.loadingStatus.analytics[circleId] = 'loading';
      })
      .addCase(fetchCircleAnalytics.fulfilled, (state, action) => {
        const { circleId, analytics } = action.payload;
        state.loadingStatus.analytics[circleId] = 'success';
        if (analytics) {
          state.circleAnalytics[circleId] = analytics;
        }
      })
      .addCase(fetchCircleAnalytics.rejected, (state, action) => {
        const circleId = action.meta.arg;
        state.loadingStatus.analytics[circleId] = 'error';
        state.error = action.payload as string;
      });
  },
});

export const { selectCircle, clearCircleError, resetCircleState } = circleSlice.actions;

export default circleSlice.reducer;
