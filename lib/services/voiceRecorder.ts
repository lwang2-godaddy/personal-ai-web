/**
 * Voice Recorder Service
 * Browser-based audio recording using MediaRecorder API
 */

export interface VoiceRecorderState {
  isRecording: boolean;
  duration: number;
  audioBlob: Blob | null;
  error: string | null;
}

export class VoiceRecorderService {
  private static instance: VoiceRecorderService;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: number = 0;
  private durationInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(state: Partial<VoiceRecorderState>) => void> = [];

  static getInstance(): VoiceRecorderService {
    if (!VoiceRecorderService.instance) {
      VoiceRecorderService.instance = new VoiceRecorderService();
    }
    return VoiceRecorderService.instance;
  }

  /**
   * Check if microphone is available
   */
  isAvailable(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Request microphone permission and start recording
   */
  async startRecording(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('MediaRecorder is not supported in this browser');
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      throw new Error('Already recording');
    }

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Determine MIME type
      const mimeType = this.getSupportedMimeType();

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
      });

      this.audioChunks = [];

      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Handle recording stop
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.notifyListeners({ audioBlob, isRecording: false });
        this.stopDurationTimer();
      };

      // Handle errors
      this.mediaRecorder.onerror = (event: Event) => {
        console.error('MediaRecorder error:', event);
        this.notifyListeners({ error: 'Recording error occurred', isRecording: false });
        this.stopRecording();
      };

      // Start recording
      this.mediaRecorder.start();
      this.startTime = Date.now();
      this.startDurationTimer();

      this.notifyListeners({ isRecording: true, error: null, duration: 0 });

      console.log('[VoiceRecorder] Recording started');
    } catch (error: any) {
      console.error('[VoiceRecorder] Failed to start recording:', error);

      if (error.name === 'NotAllowedError') {
        throw new Error('Microphone permission denied');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No microphone found');
      } else {
        throw new Error('Failed to start recording');
      }
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<Blob> {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
      throw new Error('Not currently recording');
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      // Listen for stop event
      const handleStop = () => {
        const audioBlob = new Blob(this.audioChunks, {
          type: this.mediaRecorder!.mimeType,
        });

        // Stop all tracks
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }

        this.stopDurationTimer();

        console.log('[VoiceRecorder] Recording stopped');
        resolve(audioBlob);
      };

      this.mediaRecorder.addEventListener('stop', handleStop, { once: true });
      this.mediaRecorder.stop();
    });
  }

  /**
   * Cancel recording without saving
   */
  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.audioChunks = [];
    this.stopDurationTimer();
    this.notifyListeners({ isRecording: false, audioBlob: null, duration: 0 });

    console.log('[VoiceRecorder] Recording cancelled');
  }

  /**
   * Get supported MIME type
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return ''; // Browser will use default
  }

  /**
   * Start duration timer
   */
  private startDurationTimer(): void {
    this.durationInterval = setInterval(() => {
      const duration = Math.floor((Date.now() - this.startTime) / 1000);
      this.notifyListeners({ duration });
    }, 1000);
  }

  /**
   * Stop duration timer
   */
  private stopDurationTimer(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  /**
   * Add listener for state changes
   */
  addListener(callback: (state: Partial<VoiceRecorderState>) => void): () => void {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(state: Partial<VoiceRecorderState>): void {
    this.listeners.forEach((listener) => listener(state));
  }

  /**
   * Get current state
   */
  getState(): VoiceRecorderState {
    return {
      isRecording: this.mediaRecorder?.state === 'recording',
      duration: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
      audioBlob: this.audioChunks.length > 0
        ? new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' })
        : null,
      error: null,
    };
  }
}

export default VoiceRecorderService.getInstance();
