import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import FirestoreService from '@/lib/api/firebase/firestore';
import {
  HealthData,
  LocationData,
  VoiceNote,
  PhotoMemory,
} from '@/lib/models';

export interface DashboardState {
  stats: {
    healthCount: number;
    locationCount: number;
    voiceCount: number;
    photoCount: number;
  };
  recentHealth: HealthData[];
  recentLocations: LocationData[];
  recentVoiceNotes: VoiceNote[];
  recentPhotos: PhotoMemory[];
  isLoading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  stats: {
    healthCount: 0,
    locationCount: 0,
    voiceCount: 0,
    photoCount: 0,
  },
  recentHealth: [],
  recentLocations: [],
  recentVoiceNotes: [],
  recentPhotos: [],
  isLoading: false,
  error: null,
};

/**
 * Fetch dashboard statistics
 */
export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (userId: string, { rejectWithValue }) => {
    try {
      const stats = await FirestoreService.getDataStats(userId);
      return stats;
    } catch (error: any) {
      console.error('Dashboard stats error:', error);
      return rejectWithValue(error.message || 'Failed to fetch stats');
    }
  }
);

/**
 * Fetch recent health data
 */
export const fetchRecentHealth = createAsyncThunk(
  'dashboard/fetchRecentHealth',
  async (userId: string, { rejectWithValue }) => {
    try {
      const health = await FirestoreService.getHealthData(userId, 10);
      return health as HealthData[];
    } catch (error: any) {
      console.error('Fetch health error:', error);
      return rejectWithValue(error.message || 'Failed to fetch health data');
    }
  }
);

/**
 * Fetch recent locations
 */
export const fetchRecentLocations = createAsyncThunk(
  'dashboard/fetchRecentLocations',
  async (userId: string, { rejectWithValue }) => {
    try {
      const locations = await FirestoreService.getLocationData(userId, 10);
      return locations as LocationData[];
    } catch (error: any) {
      console.error('Fetch locations error:', error);
      return rejectWithValue(error.message || 'Failed to fetch locations');
    }
  }
);

/**
 * Fetch recent voice notes
 */
export const fetchRecentVoiceNotes = createAsyncThunk(
  'dashboard/fetchRecentVoiceNotes',
  async (userId: string, { rejectWithValue }) => {
    try {
      const voiceNotes = await FirestoreService.getVoiceNotes(userId, 10);
      return voiceNotes as VoiceNote[];
    } catch (error: any) {
      console.error('Fetch voice notes error:', error);
      return rejectWithValue(error.message || 'Failed to fetch voice notes');
    }
  }
);

/**
 * Fetch recent photos
 */
export const fetchRecentPhotos = createAsyncThunk(
  'dashboard/fetchRecentPhotos',
  async (userId: string, { rejectWithValue }) => {
    try {
      const photos = await FirestoreService.getPhotoMemories(userId, 10);
      return photos as PhotoMemory[];
    } catch (error: any) {
      console.error('Fetch photos error:', error);
      return rejectWithValue(error.message || 'Failed to fetch photos');
    }
  }
);

/**
 * Fetch all dashboard data at once
 */
export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchAll',
  async (userId: string, { dispatch }) => {
    await Promise.all([
      dispatch(fetchDashboardStats(userId)),
      dispatch(fetchRecentHealth(userId)),
      dispatch(fetchRecentLocations(userId)),
      dispatch(fetchRecentVoiceNotes(userId)),
      dispatch(fetchRecentPhotos(userId)),
    ]);
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearDashboard: (state) => {
      state.stats = initialState.stats;
      state.recentHealth = [];
      state.recentLocations = [];
      state.recentVoiceNotes = [];
      state.recentPhotos = [];
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all data
    builder.addCase(fetchDashboardData.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchDashboardData.fulfilled, (state) => {
      state.isLoading = false;
    });
    builder.addCase(fetchDashboardData.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch stats
    builder.addCase(fetchDashboardStats.fulfilled, (state, action) => {
      state.stats = action.payload;
    });

    // Fetch health
    builder.addCase(fetchRecentHealth.fulfilled, (state, action) => {
      state.recentHealth = action.payload;
    });

    // Fetch locations
    builder.addCase(fetchRecentLocations.fulfilled, (state, action) => {
      state.recentLocations = action.payload;
    });

    // Fetch voice notes
    builder.addCase(fetchRecentVoiceNotes.fulfilled, (state, action) => {
      state.recentVoiceNotes = action.payload;
    });

    // Fetch photos
    builder.addCase(fetchRecentPhotos.fulfilled, (state, action) => {
      state.recentPhotos = action.payload;
    });
  },
});

export const { clearDashboard, clearError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
