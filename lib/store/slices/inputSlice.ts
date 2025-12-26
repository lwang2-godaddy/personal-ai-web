/**
 * Input Slice
 * Manages voice notes, photo uploads, and text note (diary) creation
 * Handles upload progress, transcription, descriptions, and geolocation
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { VoiceNote } from '@/lib/models/VoiceNote';
import { PhotoMemory } from '@/lib/models/PhotoMemory';
import { TextNote } from '@/lib/models/TextNote';
import { validateTextNote, validateVoiceNote, validatePhotoMemory } from '@/lib/utils/validation';
import StorageService from '@/lib/api/firebase/storage';
import GeolocationService from '@/lib/services/geolocation';

/**
 * Input State Interface
 */
export interface InputState {
  // Voice Note State
  voice: {
    isRecording: boolean;
    recordingDuration: number;
    isUploading: boolean;
    uploadProgress: number;
    isTranscribing: boolean;
    audioBlob: Blob | null;
    currentNoteId: string | null;
    error: string | null;
  };

  // Photo Upload State
  photo: {
    isProcessing: boolean;
    isUploading: boolean;
    uploadProgress: number;
    isDescribing: boolean;
    selectedFile: File | null;
    previewUrl: string | null;
    currentPhotoId: string | null;
    error: string | null;
  };

  // Text Note (Diary) State
  textNote: {
    isSaving: boolean;
    currentDraft: Partial<TextNote> | null;
    lastSaved: string | null;
    error: string | null;
  };

  // Geolocation State
  geolocation: {
    isFetching: boolean;
    currentLocation: {
      latitude: number;
      longitude: number;
      address: string | null;
    } | null;
    error: string | null;
  };

  // General State
  isOnline: boolean;
}

const initialState: InputState = {
  voice: {
    isRecording: false,
    recordingDuration: 0,
    isUploading: false,
    uploadProgress: 0,
    isTranscribing: false,
    audioBlob: null,
    currentNoteId: null,
    error: null,
  },
  photo: {
    isProcessing: false,
    isUploading: false,
    uploadProgress: 0,
    isDescribing: false,
    selectedFile: null,
    previewUrl: null,
    currentPhotoId: null,
    error: null,
  },
  textNote: {
    isSaving: false,
    currentDraft: null,
    lastSaved: null,
    error: null,
  },
  geolocation: {
    isFetching: false,
    currentLocation: null,
    error: null,
  },
  isOnline: true,
};

/**
 * Fetch Current Geolocation
 * Uses GeolocationService to get position + address
 */
export const fetchCurrentLocation = createAsyncThunk(
  'input/fetchCurrentLocation',
  async (_, { rejectWithValue }) => {
    try {
      const result = await GeolocationService.getCurrentPositionWithAddress();
      return {
        latitude: result.latitude,
        longitude: result.longitude,
        address: result.address,
      };
    } catch (error: any) {
      console.error('Geolocation error:', error);
      return rejectWithValue(error.message || 'Failed to get location');
    }
  }
);

/**
 * Upload Voice Note
 * Steps: Upload audio → Transcribe with Whisper → Store in Firestore
 */
export const uploadVoiceNote = createAsyncThunk(
  'input/uploadVoiceNote',
  async (
    {
      audioBlob,
      userId,
      tags,
    }: {
      audioBlob: Blob;
      userId: string;
      tags?: string[];
    },
    { rejectWithValue, dispatch }
  ) => {
    try {
      // Generate note ID
      const noteId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const storagePath = `users/${userId}/voice-notes/${noteId}.webm`;

      // Upload audio file with progress tracking
      const audioUrl = await StorageService.uploadFile(
        storagePath,
        audioBlob,
        (progress) => {
          dispatch(setVoiceUploadProgress(progress));
        }
      );

      // Transcribe with OpenAI Whisper (via API route)
      dispatch(setVoiceTranscribing(true));
      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioUrl,
          userId,
        }),
      });

      if (!transcribeResponse.ok) {
        const error = await transcribeResponse.json();
        throw new Error(error.error || 'Transcription failed');
      }

      const { transcription, duration } = await transcribeResponse.json();

      // Create voice note object
      const voiceNote: Omit<VoiceNote, 'id'> = {
        userId,
        audioUrl,
        transcription,
        duration,
        tags: tags || [],
        createdAt: new Date().toISOString(),
        embeddingId: null,
      };

      // Validate
      const validation = validateVoiceNote(voiceNote);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Store in Firestore (via API route - triggers Cloud Function for embedding)
      const storeResponse = await fetch('/api/voice-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          noteId,
          voiceNote,
        }),
      });

      if (!storeResponse.ok) {
        const error = await storeResponse.json();
        throw new Error(error.error || 'Failed to store voice note');
      }

      return { noteId, voiceNote };
    } catch (error: any) {
      console.error('Voice note upload error:', error);
      return rejectWithValue(error.message || 'Failed to upload voice note');
    }
  }
);

/**
 * Upload Photo Memory
 * Steps: Process images (3 versions) → Upload → Describe with Vision API → Store in Firestore
 */
export const uploadPhoto = createAsyncThunk(
  'input/uploadPhoto',
  async (
    {
      file,
      userId,
      userDescription,
      location,
    }: {
      file: File;
      userId: string;
      userDescription?: string;
      location?: { latitude: number; longitude: number; address: string | null };
    },
    { rejectWithValue, dispatch }
  ) => {
    try {
      // Generate photo ID
      const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Process images via API route (resize to 3 versions)
      dispatch(setPhotoProcessing(true));
      const processResponse = await fetch('/api/process-image', {
        method: 'POST',
        body: (() => {
          const formData = new FormData();
          formData.append('file', file);
          return formData;
        })(),
      });

      if (!processResponse.ok) {
        const error = await processResponse.json();
        throw new Error(error.error || 'Image processing failed');
      }

      const { originalBlob, thumbnailBlob, mediumBlob, dimensions, fileSize } =
        await processResponse.json();

      dispatch(setPhotoProcessing(false));

      // Upload 3 versions to Storage
      const uploads = [
        { path: `users/${userId}/photos/${photoId}_original.jpg`, file: originalBlob },
        { path: `users/${userId}/photos/${photoId}_thumbnail.jpg`, file: thumbnailBlob },
        { path: `users/${userId}/photos/${photoId}_medium.jpg`, file: mediumBlob },
      ];

      const [imageUrl, thumbnailUrl, mediumUrl] = await StorageService.uploadFiles(
        uploads,
        (progress) => {
          dispatch(setPhotoUploadProgress(progress));
        }
      );

      // Generate description with OpenAI Vision API
      dispatch(setPhotoDescribing(true));
      const describeResponse = await fetch('/api/describe-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          userId,
        }),
      });

      if (!describeResponse.ok) {
        const error = await describeResponse.json();
        throw new Error(error.error || 'Image description failed');
      }

      const { description: autoDescription } = await describeResponse.json();
      dispatch(setPhotoDescribing(false));

      // Create photo memory object
      const photoMemory: Omit<PhotoMemory, 'id'> = {
        userId,
        imageUrl,
        thumbnailUrl,
        mediumUrl,
        autoDescription,
        userDescription: userDescription || null,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        locationId: null, // Will be correlated by Cloud Function
        activity: null, // Will be auto-tagged by Cloud Function
        address: location?.address || null,
        takenAt: new Date(),
        uploadedAt: new Date(),
        fileSize,
        dimensions,
        textEmbeddingId: null,
        visualEmbeddingId: null,
        tags: [],
        isFavorite: false,
      };

      // Validate
      const validation = validatePhotoMemory(photoMemory);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Store in Firestore (via API route - triggers Cloud Function for dual embeddings)
      const storeResponse = await fetch('/api/photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoId,
          photoMemory,
        }),
      });

      if (!storeResponse.ok) {
        const error = await storeResponse.json();
        throw new Error(error.error || 'Failed to store photo');
      }

      return { photoId, photoMemory };
    } catch (error: any) {
      console.error('Photo upload error:', error);
      return rejectWithValue(error.message || 'Failed to upload photo');
    }
  }
);

/**
 * Save Text Note (Diary Entry)
 * Steps: Validate → Store in Firestore (triggers Cloud Function for embedding)
 */
export const saveTextNote = createAsyncThunk(
  'input/saveTextNote',
  async (
    {
      textNote,
      userId,
    }: {
      textNote: Omit<TextNote, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'embeddingId'>;
      userId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      // Validate
      const validation = validateTextNote(textNote);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Generate note ID
      const noteId = `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create full text note object
      const fullTextNote: Omit<TextNote, 'id'> = {
        ...textNote,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        embeddingId: null,
      };

      // Store in Firestore (via API route - triggers Cloud Function for embedding)
      const response = await fetch('/api/text-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          noteId,
          textNote: fullTextNote,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save text note');
      }

      return { noteId, textNote: fullTextNote };
    } catch (error: any) {
      console.error('Text note save error:', error);
      return rejectWithValue(error.message || 'Failed to save text note');
    }
  }
);

/**
 * Input Slice
 */
const inputSlice = createSlice({
  name: 'input',
  initialState,
  reducers: {
    // Voice Note Actions
    setVoiceRecording: (state, action: PayloadAction<boolean>) => {
      state.voice.isRecording = action.payload;
      if (!action.payload) {
        state.voice.recordingDuration = 0;
      }
    },
    setVoiceRecordingDuration: (state, action: PayloadAction<number>) => {
      state.voice.recordingDuration = action.payload;
    },
    setVoiceAudioBlob: (state, action: PayloadAction<Blob | null>) => {
      state.voice.audioBlob = action.payload;
    },
    setVoiceUploadProgress: (state, action: PayloadAction<number>) => {
      state.voice.uploadProgress = action.payload;
    },
    setVoiceTranscribing: (state, action: PayloadAction<boolean>) => {
      state.voice.isTranscribing = action.payload;
    },
    clearVoiceError: (state) => {
      state.voice.error = null;
    },
    resetVoiceState: (state) => {
      state.voice = initialState.voice;
    },

    // Photo Actions
    setPhotoFile: (state, action: PayloadAction<{ file: File; previewUrl: string } | null>) => {
      if (action.payload) {
        state.photo.selectedFile = action.payload.file;
        state.photo.previewUrl = action.payload.previewUrl;
      } else {
        state.photo.selectedFile = null;
        state.photo.previewUrl = null;
      }
    },
    setPhotoProcessing: (state, action: PayloadAction<boolean>) => {
      state.photo.isProcessing = action.payload;
    },
    setPhotoUploadProgress: (state, action: PayloadAction<number>) => {
      state.photo.uploadProgress = action.payload;
    },
    setPhotoDescribing: (state, action: PayloadAction<boolean>) => {
      state.photo.isDescribing = action.payload;
    },
    clearPhotoError: (state) => {
      state.photo.error = null;
    },
    resetPhotoState: (state) => {
      state.photo = initialState.photo;
    },

    // Text Note Actions
    setTextNoteDraft: (state, action: PayloadAction<Partial<TextNote> | null>) => {
      state.textNote.currentDraft = action.payload;
    },
    updateTextNoteDraft: (state, action: PayloadAction<Partial<TextNote>>) => {
      state.textNote.currentDraft = {
        ...state.textNote.currentDraft,
        ...action.payload,
      };
    },
    setTextNoteLastSaved: (state, action: PayloadAction<string>) => {
      state.textNote.lastSaved = action.payload;
    },
    clearTextNoteError: (state) => {
      state.textNote.error = null;
    },
    resetTextNoteState: (state) => {
      state.textNote = initialState.textNote;
    },

    // Geolocation Actions
    clearGeolocationError: (state) => {
      state.geolocation.error = null;
    },

    // General Actions
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch Current Location
    builder.addCase(fetchCurrentLocation.pending, (state) => {
      state.geolocation.isFetching = true;
      state.geolocation.error = null;
    });
    builder.addCase(fetchCurrentLocation.fulfilled, (state, action) => {
      state.geolocation.isFetching = false;
      state.geolocation.currentLocation = action.payload;
    });
    builder.addCase(fetchCurrentLocation.rejected, (state, action) => {
      state.geolocation.isFetching = false;
      state.geolocation.error = action.payload as string;
    });

    // Upload Voice Note
    builder.addCase(uploadVoiceNote.pending, (state) => {
      state.voice.isUploading = true;
      state.voice.uploadProgress = 0;
      state.voice.error = null;
    });
    builder.addCase(uploadVoiceNote.fulfilled, (state, action) => {
      state.voice.isUploading = false;
      state.voice.isTranscribing = false;
      state.voice.uploadProgress = 100;
      state.voice.currentNoteId = action.payload.noteId;
      state.voice.audioBlob = null;
    });
    builder.addCase(uploadVoiceNote.rejected, (state, action) => {
      state.voice.isUploading = false;
      state.voice.isTranscribing = false;
      state.voice.uploadProgress = 0;
      state.voice.error = action.payload as string;
    });

    // Upload Photo
    builder.addCase(uploadPhoto.pending, (state) => {
      state.photo.isUploading = true;
      state.photo.uploadProgress = 0;
      state.photo.error = null;
    });
    builder.addCase(uploadPhoto.fulfilled, (state, action) => {
      state.photo.isUploading = false;
      state.photo.isProcessing = false;
      state.photo.isDescribing = false;
      state.photo.uploadProgress = 100;
      state.photo.currentPhotoId = action.payload.photoId;
      state.photo.selectedFile = null;
      state.photo.previewUrl = null;
    });
    builder.addCase(uploadPhoto.rejected, (state, action) => {
      state.photo.isUploading = false;
      state.photo.isProcessing = false;
      state.photo.isDescribing = false;
      state.photo.uploadProgress = 0;
      state.photo.error = action.payload as string;
    });

    // Save Text Note
    builder.addCase(saveTextNote.pending, (state) => {
      state.textNote.isSaving = true;
      state.textNote.error = null;
    });
    builder.addCase(saveTextNote.fulfilled, (state, action) => {
      state.textNote.isSaving = false;
      state.textNote.lastSaved = new Date().toISOString();
      state.textNote.currentDraft = null;
    });
    builder.addCase(saveTextNote.rejected, (state, action) => {
      state.textNote.isSaving = false;
      state.textNote.error = action.payload as string;
    });
  },
});

// Export actions
export const {
  setVoiceRecording,
  setVoiceRecordingDuration,
  setVoiceAudioBlob,
  setVoiceUploadProgress,
  setVoiceTranscribing,
  clearVoiceError,
  resetVoiceState,
  setPhotoFile,
  setPhotoProcessing,
  setPhotoUploadProgress,
  setPhotoDescribing,
  clearPhotoError,
  resetPhotoState,
  setTextNoteDraft,
  updateTextNoteDraft,
  setTextNoteLastSaved,
  clearTextNoteError,
  resetTextNoteState,
  clearGeolocationError,
  setOnlineStatus,
} = inputSlice.actions;

// Export reducer
export default inputSlice.reducer;
