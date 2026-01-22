'use client';

import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { uploadVoiceNote } from '@/lib/store/slices/inputSlice';
import VoiceRecorderService from '@/lib/services/voiceRecorder';
import { fetchDashboardData } from '@/lib/store/slices/dashboardSlice';
import { useTrackFeature } from '@/lib/hooks/useTrackPage';
import { TRACKED_FEATURES } from '@/lib/models/BehaviorEvent';

/**
 * QuickVoiceRecorder Component
 * Compact voice recording button for the dashboard
 */
export function QuickVoiceRecorder() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { voice, isOnline } = useAppSelector((state) => state.input);
  const { trackFeature } = useTrackFeature();

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
      trackFeature(TRACKED_FEATURES.startVoiceRecording, { category: 'data_input' });
      await voiceRecorder.startRecording();
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      alert(error.message || 'Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      trackFeature(TRACKED_FEATURES.stopVoiceRecording, { category: 'data_input' });
      await voiceRecorder.stopRecording();
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

      // Refresh dashboard immediately (will show "Processing...")
      dispatch(fetchDashboardData(user.uid));

      // Refresh again after 3 seconds to show "Indexed" status
      setTimeout(() => {
        dispatch(fetchDashboardData(user.uid));
      }, 3000);

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

  // Preview modal
  if (showPreview && audioBlob && audioUrl) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Voice Note Preview
          </h3>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Duration: {formatDuration(duration)}
                </span>
              </div>
              <audio src={audioUrl} controls className="w-full" />
            </div>

            {/* Upload Status */}
            {voice.isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>
                    {voice.isTranscribing ? 'Transcribing...' : 'Uploading...'}
                  </span>
                  <span>{voice.uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${voice.uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={voice.isUploading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={voice.isUploading || !isOnline}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {voice.isUploading ? 'Uploading...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Recording indicator
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

  // Record button
  return (
    <button
      onClick={handleStartRecording}
      disabled={!isOnline || voice.isUploading}
      className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-full shadow transition-all disabled:cursor-not-allowed"
      title="Record voice note"
    >
      <span className="text-xl">🎤</span>
    </button>
  );
}
