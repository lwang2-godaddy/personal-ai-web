import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import textNoteService from '@/lib/services/textNoteService';
import voiceRecorderService from '@/lib/services/voiceRecorder';
import imageProcessorService from '@/lib/services/imageProcessor';
import { addToast } from './toastSlice';
import type { RootState } from '../index';
import FirebaseStorage from '@/lib/api/firebase/storage';
import FirestoreService from '@/lib/api/firebase/firestore';
import type { PhotoMemory } from '@/lib/models/PhotoMemory';

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

      await textNoteService.createTextNote({
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

      await textNoteService.createTextNote({
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
      const timestamp = Date.now();
      const audioFile = new File([data.audioBlob], `voice-${timestamp}.webm`, {
        type: data.audioBlob.type,
      });
      const path = `voice-notes/${userId}/${timestamp}.webm`;
      const audioUrl = await FirebaseStorage.uploadFile(path, audioFile);

      // Transcribe audio using API route (keeps API key server-side)
      const formData = new FormData();
      formData.append('audioFile', audioFile);

      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeResponse.ok) {
        const error = await transcribeResponse.json();
        throw new Error(error.error || 'Failed to transcribe audio');
      }

      const { transcription } = await transcribeResponse.json();

      // Save voice note to Firestore
      const voiceNoteId = `voice_${timestamp}`;
      await FirestoreService.createVoiceNote(voiceNoteId, {
        userId,
        audioUrl,
        transcription,
        duration: data.duration,
        title: data.title || 'Voice Note',
        createdAt: new Date().toISOString(),
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
      const timestamp = Date.now();
      const [thumbnailUrl, mediumUrl, originalUrl] = await Promise.all([
        FirebaseStorage.uploadFile(`photos/${userId}/thumbnails/${timestamp}.jpg`, thumbnail),
        FirebaseStorage.uploadFile(`photos/${userId}/medium/${timestamp}.jpg`, medium),
        FirebaseStorage.uploadFile(`photos/${userId}/original/${timestamp}.jpg`, original),
      ]);

      // Use caption or default description
      // TODO: Implement AI description generation using OpenAI Vision API
      const description = data.caption || 'Photo uploaded via SirCharge';

      // Save photo metadata to Firestore
      const photoId = `photo_${timestamp}`;
      const photoData: Partial<PhotoMemory> = {
        userId,
        imageUrl: originalUrl,
        thumbnailUrl,
        mediumUrl,
        autoDescription: description,
        userDescription: data.caption || null,
        latitude: null,
        longitude: null,
        locationId: null,
        activity: null,
        address: null,
        takenAt: new Date(),
        uploadedAt: new Date(),
        fileSize: data.file.size,
        dimensions: { width: 0, height: 0 }, // Will be populated by imageProcessor
        textEmbeddingId: null,
        visualEmbeddingId: null,
        tags: [],
        isFavorite: false,
      };

      await FirestoreService.createPhotoMemory(photoId, photoData);

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
