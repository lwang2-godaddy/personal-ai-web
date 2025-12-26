import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { textNoteService } from '@/lib/services/textNoteService';
import { voiceRecorderService } from '@/lib/services/voiceRecorderService';
import { storageService } from '@/lib/services/storageService';
import { imageProcessorService } from '@/lib/services/imageProcessorService';
import { addToast } from './toastSlice';
import type { RootState } from '../index';

export type CreateType = 'diary' | 'thought' | 'voice' | 'photo';

interface QuickCreateState {
  isOpen: boolean;
  activeType: CreateType | null;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: QuickCreateState = {
  isOpen: false,
  activeType: null,
  isSubmitting: false,
  error: null,
};

// Async thunk for submitting diary entry
export const submitQuickDiary = createAsyncThunk(
  'quickCreate/submitDiary',
  async (data: { title: string; content: string; tags?: string[] }, { dispatch, getState }) => {
    try {
      const state = getState() as RootState;
      const userId = state.auth.user?.uid;
      if (!userId) throw new Error('User not authenticated');

      await textNoteService.getInstance().createTextNote({
        title: data.title,
        content: data.content,
        tags: data.tags || [],
        type: 'diary',
      }, userId);

      dispatch(addToast({ message: 'Diary entry created!', type: 'success' }));
      return { success: true };
    } catch (error: any) {
      dispatch(addToast({ message: error.message || 'Failed to create diary entry', type: 'error' }));
      throw error;
    }
  }
);

// Async thunk for submitting quick thought
export const submitQuickThought = createAsyncThunk(
  'quickCreate/submitThought',
  async (data: { content: string; tags?: string[] }, { dispatch, getState }) => {
    try {
      const state = getState() as RootState;
      const userId = state.auth.user?.uid;
      if (!userId) throw new Error('User not authenticated');

      await textNoteService.getInstance().createTextNote({
        title: 'Quick Thought',
        content: data.content,
        tags: data.tags || [],
        type: 'thought',
      }, userId);

      dispatch(addToast({ message: 'Quick thought saved!', type: 'success' }));
      return { success: true };
    } catch (error: any) {
      dispatch(addToast({ message: error.message || 'Failed to save thought', type: 'error' }));
      throw error;
    }
  }
);

// Async thunk for submitting voice note
export const submitQuickVoice = createAsyncThunk(
  'quickCreate/submitVoice',
  async (data: { audioBlob: Blob; duration: number; title?: string }, { dispatch, getState }) => {
    try {
      const state = getState() as RootState;
      const userId = state.auth.user?.uid;
      if (!userId) throw new Error('User not authenticated');

      // Upload audio file
      const audioFile = new File([data.audioBlob], `voice-${Date.now()}.webm`, {
        type: data.audioBlob.type,
      });
      const audioUrl = await storageService.uploadFile(audioFile, `voice-notes/${userId}`);

      // Transcribe audio
      const transcription = await voiceRecorderService.transcribeAudio(data.audioBlob);

      // Save voice note
      await voiceRecorderService.saveVoiceNote({
        userId,
        audioUrl,
        transcription,
        duration: data.duration,
        title: data.title,
      });

      dispatch(addToast({ message: 'Voice note recorded!', type: 'success' }));
      return { success: true };
    } catch (error: any) {
      dispatch(addToast({ message: error.message || 'Failed to save voice note', type: 'error' }));
      throw error;
    }
  }
);

// Async thunk for submitting photo
export const submitQuickPhoto = createAsyncThunk(
  'quickCreate/submitPhoto',
  async (data: { file: File; caption?: string }, { dispatch, getState }) => {
    try {
      const state = getState() as RootState;
      const userId = state.auth.user?.uid;
      if (!userId) throw new Error('User not authenticated');

      // Process image (create thumbnail, medium, keep original)
      const { thumbnail, medium, original } = await imageProcessorService.processImage(data.file);

      // Upload all versions
      const [thumbnailUrl, mediumUrl, originalUrl] = await Promise.all([
        storageService.uploadFile(thumbnail, `photos/${userId}/thumbnails`),
        storageService.uploadFile(medium, `photos/${userId}/medium`),
        storageService.uploadFile(original, `photos/${userId}/original`),
      ]);

      // Generate AI description if no caption provided
      let description = data.caption || '';
      if (!description) {
        description = await imageProcessorService.generateDescription(data.file);
      }

      // Save photo metadata
      await storageService.savePhotoMetadata({
        userId,
        thumbnailUrl,
        mediumUrl,
        originalUrl,
        description,
        takenAt: new Date(),
      });

      dispatch(addToast({ message: 'Photo uploaded!', type: 'success' }));
      return { success: true };
    } catch (error: any) {
      dispatch(addToast({ message: error.message || 'Failed to upload photo', type: 'error' }));
      throw error;
    }
  }
);

const quickCreateSlice = createSlice({
  name: 'quickCreate',
  initialState,
  reducers: {
    openQuickCreate: (state, action: PayloadAction<CreateType>) => {
      state.isOpen = true;
      state.activeType = action.payload;
      state.error = null;
    },
    closeQuickCreate: (state) => {
      state.isOpen = false;
      state.activeType = null;
      state.error = null;
      state.isSubmitting = false;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Handle diary submission
    builder.addCase(submitQuickDiary.pending, (state) => {
      state.isSubmitting = true;
      state.error = null;
    });
    builder.addCase(submitQuickDiary.fulfilled, (state) => {
      state.isSubmitting = false;
      state.isOpen = false;
      state.activeType = null;
    });
    builder.addCase(submitQuickDiary.rejected, (state, action) => {
      state.isSubmitting = false;
      state.error = action.error.message || 'Failed to create diary entry';
    });

    // Handle thought submission
    builder.addCase(submitQuickThought.pending, (state) => {
      state.isSubmitting = true;
      state.error = null;
    });
    builder.addCase(submitQuickThought.fulfilled, (state) => {
      state.isSubmitting = false;
      state.isOpen = false;
      state.activeType = null;
    });
    builder.addCase(submitQuickThought.rejected, (state, action) => {
      state.isSubmitting = false;
      state.error = action.error.message || 'Failed to save thought';
    });

    // Handle voice submission
    builder.addCase(submitQuickVoice.pending, (state) => {
      state.isSubmitting = true;
      state.error = null;
    });
    builder.addCase(submitQuickVoice.fulfilled, (state) => {
      state.isSubmitting = false;
      state.isOpen = false;
      state.activeType = null;
    });
    builder.addCase(submitQuickVoice.rejected, (state, action) => {
      state.isSubmitting = false;
      state.error = action.error.message || 'Failed to save voice note';
    });

    // Handle photo submission
    builder.addCase(submitQuickPhoto.pending, (state) => {
      state.isSubmitting = true;
      state.error = null;
    });
    builder.addCase(submitQuickPhoto.fulfilled, (state) => {
      state.isSubmitting = false;
      state.isOpen = false;
      state.activeType = null;
    });
    builder.addCase(submitQuickPhoto.rejected, (state, action) => {
      state.isSubmitting = false;
      state.error = action.error.message || 'Failed to upload photo';
    });
  },
});

export const { openQuickCreate, closeQuickCreate, setError } = quickCreateSlice.actions;
export default quickCreateSlice.reducer;
