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
  updatedAt?: string;
}

export interface VoiceRecordingState {
  isRecording: boolean;
  recordingDuration: number;
  audioPath: string | null;
}
