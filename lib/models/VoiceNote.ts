export interface VoiceNote {
  id?: string;
  userId: string;
  audioUrl: string;
  localAudioPath?: string;
  transcription: string;
  duration: number;
  createdAt: string;
  tags: string[];
  embeddingId: string | null;
  embeddingCreatedAt?: string;
  embeddingError?: string;
  embeddingErrorAt?: string;
  updatedAt?: string;
}

export interface VoiceRecordingState {
  isRecording: boolean;
  recordingDuration: number;
  audioPath: string | null;
}
