/**
 * Circle Slice
 *
 * Redux slice for Close Friend Circles feature (Web version).
 * Uses API routes instead of direct service calls (Next.js architecture).
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/client';
import type {
  Circle,
  CircleMember,
  CircleInvite,
  CircleMessage,
  CircleAnalytics,
} from '@/lib/models/Circle';

// ============================================================================
// STATE INTERFACE
// ============================================================================

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

// ============================================================================
// ASYNC THUNKS (Call API routes)
// ============================================================================

/**
 * Fetch all circles for current user
 */
export const fetchCircles = createAsyncThunk(
  'circles/fetchCircles',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiGet<Circle[]>('/api/circles');
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch circles');
    }
  }
);

/**
 * Create a new circle
 */
export const createCircle = createAsyncThunk(
  'circles/createCircle',
  async (circleData: Partial<Circle>, { rejectWithValue }) => {
    try {
      const response = await apiPost<Circle>('/api/circles', circleData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create circle');
    }
  }
);

/**
 * Update circle details
 */
export const updateCircle = createAsyncThunk(
  'circles/updateCircle',
  async (
    { circleId, updates }: { circleId: string; updates: Partial<Circle> },
    { rejectWithValue }
  ) => {
    try {
      await apiPatch(`/api/circles/${circleId}`, updates);
      return { circleId, updates };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update circle');
    }
  }
);

/**
 * Delete a circle
 */
export const deleteCircle = createAsyncThunk(
  'circles/deleteCircle',
  async (circleId: string, { rejectWithValue }) => {
    try {
      await apiDelete(`/api/circles/${circleId}`);
      return circleId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete circle');
    }
  }
);

/**
 * Invite friend to circle
 */
export const inviteToCircle = createAsyncThunk(
  'circles/inviteToCircle',
  async (
    { circleId, friendId, message }: { circleId: string; friendId: string; message?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiPost<CircleInvite>(`/api/circles/${circleId}/invite`, {
        friendId,
        message,
      });
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send invite');
    }
  }
);

/**
 * Fetch pending invites
 */
export const fetchCircleInvites = createAsyncThunk(
  'circles/fetchCircleInvites',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiGet<CircleInvite[]>('/api/circles/invites');
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch invites');
    }
  }
);

/**
 * Accept circle invite
 */
export const acceptCircleInvite = createAsyncThunk(
  'circles/acceptInvite',
  async (inviteId: string, { rejectWithValue }) => {
    try {
      await apiPost(`/api/circles/invites/${inviteId}/accept`, {});
      return inviteId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to accept invite');
    }
  }
);

/**
 * Reject circle invite
 */
export const rejectCircleInvite = createAsyncThunk(
  'circles/rejectInvite',
  async (inviteId: string, { rejectWithValue }) => {
    try {
      await apiPost(`/api/circles/invites/${inviteId}/reject`, {});
      return inviteId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to reject invite');
    }
  }
);

/**
 * Fetch circle members
 */
export const fetchCircleMembers = createAsyncThunk(
  'circles/fetchCircleMembers',
  async (circleId: string, { rejectWithValue }) => {
    try {
      const response = await apiGet<CircleMember[]>(`/api/circles/${circleId}/members`);
      return { circleId, members: response };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch members');
    }
  }
);

/**
 * Update member role
 */
export const updateMemberRole = createAsyncThunk(
  'circles/updateMemberRole',
  async (
    { circleId, userId, role }: { circleId: string; userId: string; role: 'admin' | 'member' },
    { rejectWithValue }
  ) => {
    try {
      await apiPatch(`/api/circles/${circleId}/members/${userId}/role`, { role });
      return { circleId, userId, role };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update member role');
    }
  }
);

/**
 * Remove member from circle
 */
export const removeMember = createAsyncThunk(
  'circles/removeMember',
  async (
    { circleId, userId, reason }: { circleId: string; userId: string; reason?: string },
    { rejectWithValue }
  ) => {
    try {
      await apiDelete(`/api/circles/${circleId}/members/${userId}`);
      return { circleId, userId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to remove member');
    }
  }
);

/**
 * Leave circle
 */
export const leaveCircle = createAsyncThunk(
  'circles/leaveCircle',
  async (circleId: string, { rejectWithValue }) => {
    try {
      await apiPost(`/api/circles/${circleId}/leave`, {});
      return circleId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to leave circle');
    }
  }
);

/**
 * Send message in circle
 */
export const sendCircleMessage = createAsyncThunk(
  'circles/sendMessage',
  async (
    { circleId, content, type }: { circleId: string; content: string; type?: 'text' | 'voice' },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiPost<CircleMessage>(`/api/circles/${circleId}/messages`, {
        content,
        type,
      });
      return { circleId, message: response };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send message');
    }
  }
);

/**
 * Fetch circle messages
 */
export const fetchCircleMessages = createAsyncThunk(
  'circles/fetchMessages',
  async (
    { circleId, limit, startAfter }: { circleId: string; limit?: number; startAfter?: string },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (startAfter) params.append('startAfter', startAfter);

      const response = await apiGet<CircleMessage[]>(
        `/api/circles/${circleId}/messages?${params.toString()}`
      );
      return { circleId, messages: response };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch messages');
    }
  }
);

/**
 * Delete message
 */
export const deleteMessage = createAsyncThunk(
  'circles/deleteMessage',
  async (
    { circleId, messageId }: { circleId: string; messageId: string },
    { rejectWithValue }
  ) => {
    try {
      await apiDelete(`/api/circles/${circleId}/messages/${messageId}`);
      return { circleId, messageId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete message');
    }
  }
);

/**
 * Add reaction to message
 */
export const addReaction = createAsyncThunk(
  'circles/addReaction',
  async (
    { circleId, messageId, emoji }: { circleId: string; messageId: string; emoji: string },
    { rejectWithValue }
  ) => {
    try {
      await apiPost(`/api/circles/${circleId}/messages/${messageId}/reaction`, { emoji });
      return { circleId, messageId, emoji };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add reaction');
    }
  }
);

/**
 * Fetch circle analytics
 */
export const fetchCircleAnalytics = createAsyncThunk(
  'circles/fetchAnalytics',
  async (circleId: string, { rejectWithValue }) => {
    try {
      const response = await apiGet<CircleAnalytics>(
        `/api/circles/${circleId}/analytics`
      );
      return { circleId, analytics: response };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch analytics');
    }
  }
);

// ============================================================================
// SLICE
// ============================================================================

const circleSlice = createSlice({
  name: 'circles',
  initialState,
  reducers: {
    setSelectedCircle: (state, action: PayloadAction<string | null>) => {
      state.selectedCircleId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch circles
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

    // Create circle
    builder
      .addCase(createCircle.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createCircle.fulfilled, (state, action) => {
        state.isLoading = false;
        state.circles.push(action.payload);
      })
      .addCase(createCircle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update circle
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

    // Delete circle
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

    // Fetch invites
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

    // Accept invite
    builder
      .addCase(acceptCircleInvite.fulfilled, (state, action) => {
        state.circleInvites = state.circleInvites.filter((i) => i.id !== action.payload);
      })
      .addCase(acceptCircleInvite.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Reject invite
    builder
      .addCase(rejectCircleInvite.fulfilled, (state, action) => {
        state.circleInvites = state.circleInvites.filter((i) => i.id !== action.payload);
      })
      .addCase(rejectCircleInvite.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Fetch members
    builder
      .addCase(fetchCircleMembers.pending, (state, action) => {
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

    // Update member role
    builder
      .addCase(updateMemberRole.fulfilled, (state, action) => {
        const { circleId, userId, role } = action.payload;
        const members = state.circleMembers[circleId];
        if (members) {
          const member = members.find((m) => m.userId === userId);
          if (member) {
            member.role = role;
          }
        }
      })
      .addCase(updateMemberRole.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Remove member
    builder
      .addCase(removeMember.fulfilled, (state, action) => {
        const { circleId, userId } = action.payload;
        const members = state.circleMembers[circleId];
        if (members) {
          state.circleMembers[circleId] = members.filter((m) => m.userId !== userId);
        }
      })
      .addCase(removeMember.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Leave circle
    builder
      .addCase(leaveCircle.fulfilled, (state, action) => {
        state.circles = state.circles.filter((c) => c.id !== action.payload);
        delete state.circleMembers[action.payload];
        delete state.circleMessages[action.payload];
        delete state.circleAnalytics[action.payload];
      })
      .addCase(leaveCircle.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Fetch messages
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

    // Send message
    builder
      .addCase(sendCircleMessage.fulfilled, (state, action) => {
        const { circleId, message } = action.payload;
        if (!state.circleMessages[circleId]) {
          state.circleMessages[circleId] = [];
        }
        state.circleMessages[circleId].push(message);
      })
      .addCase(sendCircleMessage.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Delete message
    builder
      .addCase(deleteMessage.fulfilled, (state, action) => {
        const { circleId, messageId } = action.payload;
        const messages = state.circleMessages[circleId];
        if (messages) {
          state.circleMessages[circleId] = messages.filter((m) => m.id !== messageId);
        }
      })
      .addCase(deleteMessage.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Fetch analytics
    builder
      .addCase(fetchCircleAnalytics.pending, (state, action) => {
        const circleId = action.meta.arg;
        state.loadingStatus.analytics[circleId] = 'loading';
      })
      .addCase(fetchCircleAnalytics.fulfilled, (state, action) => {
        const { circleId, analytics } = action.payload;
        state.loadingStatus.analytics[circleId] = 'success';
        state.circleAnalytics[circleId] = analytics;
      })
      .addCase(fetchCircleAnalytics.rejected, (state, action) => {
        const circleId = action.meta.arg;
        state.loadingStatus.analytics[circleId] = 'error';
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedCircle, clearError } = circleSlice.actions;
export default circleSlice.reducer;
