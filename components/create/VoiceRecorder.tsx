'use client';

/**
 * Voice Recorder Component
 * Browser-based audio recording with Whisper transcription
 */

import { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { uploadVoiceNote, resetVoiceState, clearVoiceError } from '@/lib/store/slices/inputSlice';
import VoiceRecorderService from '@/lib/services/voiceRecorder';

export function VoiceRecorder() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { voice, isOnline } = useAppSelector((state) => state.input);

  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const voiceRecorder = VoiceRecorderService.getInstance();

  // Subscribe to recorder state changes
  useEffect(() => {
    const unsubscribe = voiceRecorder.addListener((state) => {
      if (state.isRecording !== undefined) setIsRecording(state.isRecording);
      if (state.duration !== undefined) setDuration(state.duration);
      if (state.audioBlob) {
        setAudioBlob(state.audioBlob);
        setAudioUrl(URL.createObjectURL(state.audioBlob));
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
    } catch (error: any) {
      console.error('Failed to stop recording:', error);
      alert(error.message || 'Failed to stop recording');
    }
  };

  const handleCancel = () => {
    voiceRecorder.cancelRecording();
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setDuration(0);
    setTags([]);
    setTagInput('');
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!user) {
      alert('Please sign in to save your voice note');
      return;
    }

    if (!audioBlob) {
      alert('No recording available');
      return;
    }

    if (duration < 1) {
      alert('Recording is too short (minimum 1 second)');
      return;
    }

    try {
      await dispatch(uploadVoiceNote({ audioBlob, userId: user.uid, tags })).unwrap();

      // Reset state
      handleCancel();
      dispatch(resetVoiceState());

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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Record a Voice Note
        </h2>

        {/* Offline Warning */}
        {!isOnline && (
          <div className="mb-4 p-4 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-700 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              You are offline. Voice recording requires an internet connection.
            </p>
          </div>
        )}

        {/* Error */}
        {voice.error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded-lg flex justify-between items-center">
            <p className="text-sm text-red-800 dark:text-red-200">{voice.error}</p>
            <button
              onClick={() => dispatch(clearVoiceError())}
              className="text-red-800 dark:text-red-200 hover:text-red-600 dark:hover:text-red-400"
            >
              ✕
            </button>
          </div>
        )}

        {/* Recording Interface */}
        <div className="space-y-6">
          {/* Recording Button */}
          {!audioBlob && (
            <div className="flex flex-col items-center py-8">
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={!isOnline || voice.isUploading}
                className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl transition-all ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                    : 'bg-blue-600 hover:bg-blue-700'
                } disabled:bg-gray-400 disabled:cursor-not-allowed`}
              >
                {isRecording ? '⏹' : '🎤'}
              </button>

              {isRecording && (
                <div className="mt-4 text-center">
                  <p className="text-2xl font-mono text-gray-900 dark:text-white">
                    {formatDuration(duration)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Recording... (tap to stop)
                  </p>
                </div>
              )}

              {!isRecording && !audioBlob && (
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  Tap the microphone to start recording
                </p>
              )}
            </div>
          )}

          {/* Audio Preview */}
          {audioBlob && audioUrl && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Recording Preview
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDuration(duration)}
                  </span>
                </div>
                <audio src={audioUrl} controls className="w-full" />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags (optional)
                </label>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(index)}
                          className="ml-2 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Type a tag and press Enter..."
                    maxLength={30}
                    disabled={tags.length >= 10}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-200 dark:disabled:bg-gray-600"
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={tags.length >= 10}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {tags.length} / 10 tags
                </p>
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
                  className="flex-1 px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={voice.isUploading || !isOnline}
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {voice.isUploading ? 'Uploading...' : 'Save Voice Note'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
