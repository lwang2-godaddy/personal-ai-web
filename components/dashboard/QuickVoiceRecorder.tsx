'use client';

import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { uploadVoiceNote } from '@/lib/store/slices/inputSlice';
import VoiceRecorderService from '@/lib/services/voiceRecorder';
import { fetchDashboardData } from '@/lib/store/slices/dashboardSlice';

/**
 * QuickVoiceRecorder Component
 * Compact voice recording button for the dashboard
 */
export function QuickVoiceRecorder() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { voice, isOnline } = useAppSelector((state) => state.input);

  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const voiceRecorder = VoiceRecorderService;

  // Subscribe to recorder state changes
  useEffect(() => {
    const unsubscribe = voiceRecorder.addListener((state) => {
      if (state.isRecording !== undefined) setIsRecording(state.isRecording);
      if (state.duration !== undefined) setDuration(state.duration);
      if (state.audioBlob) {
        setAudioBlob(state.audioBlob);
        setAudioUrl(URL.createObjectURL(state.audioBlob));
        setShowPreview(true);
      }
    });

    return unsubscribe;
  }, []);

  // Cleanup audio URL
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleStartRecording = async () => {
    if (!isOnline) {
      alert('You are offline. Please connect to the internet to record voice notes.');
      return;
    }

    if (!user) {
      alert('Please sign in to record voice notes.');
      return;
    }

    try {
      await voiceRecorder.startRecording();
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      alert(error.message || 'Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      await voiceRecorder.stopRecording();
      // Auto-save immediately after stopping
      if (audioBlob && user) {
        await handleSave();
      }
    } catch (error: any) {
      console.error('Failed to stop recording:', error);
      alert(error.message || 'Failed to stop recording');
    }
  };

  const handleCancel = () => {
    voiceRecorder.cancelRecording();
    setAudioBlob(null);
    setShowPreview(false);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setDuration(0);
  };

  const handleSave = async () => {
    if (!user || !audioBlob) return;

    try {
      await dispatch(uploadVoiceNote({
        audioBlob,
        userId: user.uid,
        tags: []
      })).unwrap();

      // Reset state
      handleCancel();

      // Refresh dashboard
      dispatch(fetchDashboardData(user.uid));

      alert('Voice note saved successfully!');
    } catch (error: any) {
      console.error('Failed to upload voice note:', error);
      alert(`Failed to upload: ${error.message || 'Unknown error'}`);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Recording indicator - show recording timer
  if (isRecording) {
    return (
      <button
        onClick={handleStopRecording}
        className="w-10 h-10 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all animate-pulse"
        title={`Recording: ${formatDuration(duration)}`}
      >
        <span className="text-xl">⏹</span>
      </button>
    );
  }

  // Uploading/transcribing indicator
  if (voice.isUploading) {
    return (
      <button
        disabled
        className="w-10 h-10 flex items-center justify-center bg-gray-400 text-white rounded-full shadow"
        title={voice.isTranscribing ? 'Transcribing...' : 'Uploading...'}
      >
        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </button>
    );
  }

  // Record button
  return (
    <button
      onClick={async () => {
        await handleStartRecording();
      }}
      disabled={!isOnline}
      className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-full shadow transition-all disabled:cursor-not-allowed"
      title="Record voice note"
    >
      <span className="text-xl">🎤</span>
    </button>
  );
}
