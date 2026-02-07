import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, UserPreferences } from '../../models';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOut as firebaseSignOut,
  getCurrentUser,
} from '../../api/firebase/auth';
import firestoreService from '../../api/firebase/firestore';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

/**
 * Sign in with Google
 */
export const signInWithGoogleThunk = createAsyncThunk(
  'auth/signInWithGoogle',
  async (_, { rejectWithValue }) => {
    try {
      const firebaseUser = await signInWithGoogle();

      // Get or create user data in Firestore
      let userData = await firestoreService.getUserData(firebaseUser.uid);

      if (!userData) {
        // Create new user document
        userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          createdAt: new Date().toISOString(),
          lastSync: null,
          preferences: getDefaultPreferences(),
          role: 'user',
          accountStatus: 'active',
        };
        await firestoreService.updateUserData(firebaseUser.uid, userData);
      }

      return userData as User;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to sign in with Google');
    }
  }
);

/**
 * Sign in with email/password
 */
export const signInWithEmailThunk = createAsyncThunk(
  'auth/signInWithEmail',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const firebaseUser = await signInWithEmail(email, password);

      // Get user data from Firestore
      const userData = await firestoreService.getUserData(firebaseUser.uid);

      if (!userData) {
        throw new Error('User data not found');
      }

      return userData as User;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to sign in');
    }
  }
);

/**
 * Sign up with email/password
 */
export const signUpWithEmailThunk = createAsyncThunk(
  'auth/signUpWithEmail',
  async (
    { email, password, displayName }: { email: string; password: string; displayName?: string },
    { rejectWithValue }
  ) => {
    try {
      const firebaseUser = await signUpWithEmail(email, password, displayName);

      // Create user document in Firestore
      const userData: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || displayName || null,
        photoURL: firebaseUser.photoURL,
        createdAt: new Date().toISOString(),
        lastSync: null,
        preferences: getDefaultPreferences(),
        role: 'user',
        accountStatus: 'active',
      };

      await firestoreService.updateUserData(firebaseUser.uid, userData);

      return userData;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create account');
    }
  }
);

/**
 * Sign out
 */
export const signOutThunk = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      await firebaseSignOut();

      // Clear localStorage caches on sign out
      if (typeof window !== 'undefined') {
        // Clear subscription config cache
        localStorage.removeItem('subscription_config_cache');
        // Clear redux persist (will be done by reducer, but also clear here for safety)
        localStorage.removeItem('persist:root');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to sign out');
    }
  }
);

/**
 * Update user preferences
 */
export const updateUserPreferencesThunk = createAsyncThunk(
  'auth/updatePreferences',
  async (
    { userId, preferences }: { userId: string; preferences: Partial<UserPreferences> },
    { rejectWithValue }
  ) => {
    try {
      await firestoreService.updateUserData(userId, { preferences });
      return preferences;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update preferences');
    }
  }
);

/**
 * Refresh user data from Firestore
 * Used to sync subscription changes made by admin
 */
export const refreshUserDataThunk = createAsyncThunk(
  'auth/refreshUserData',
  async (userId: string, { rejectWithValue }) => {
    try {
      const userData = await firestoreService.getUserData(userId);
      if (!userData) {
        throw new Error('User data not found');
      }
      return userData as User;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to refresh user data');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Sign in with Google
    builder.addCase(signInWithGoogleThunk.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(signInWithGoogleThunk.fulfilled, (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
    });
    builder.addCase(signInWithGoogleThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Sign in with email
    builder.addCase(signInWithEmailThunk.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(signInWithEmailThunk.fulfilled, (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
    });
    builder.addCase(signInWithEmailThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Sign up with email
    builder.addCase(signUpWithEmailThunk.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(signUpWithEmailThunk.fulfilled, (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
    });
    builder.addCase(signUpWithEmailThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Sign out
    builder.addCase(signOutThunk.fulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    });

    // Update preferences
    builder.addCase(updateUserPreferencesThunk.fulfilled, (state, action) => {
      if (state.user) {
        state.user.preferences = {
          ...state.user.preferences,
          ...action.payload,
        };
      }
    });

    // Refresh user data
    builder.addCase(refreshUserDataThunk.fulfilled, (state, action) => {
      state.user = action.payload;
    });
  },
});

export const { setUser, clearError } = authSlice.actions;
export default authSlice.reducer;

/**
 * Get default user preferences
 */
function getDefaultPreferences(): UserPreferences {
  return {
    dataCollection: {
      health: false, // Web doesn't collect data
      location: false,
      voice: false,
    },
    syncFrequency: 'manual',
    notifications: {
      activityTagging: false,
      syncComplete: false,
    },
    privacy: {
      encryptLocal: false,
      includeExactLocations: true,
    },
    language: {
      appLanguage: 'en',
      autoDetect: true,
    },
  };
}
