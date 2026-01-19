# Voice Features

Documentation for voice recording, text-to-speech, and wake word detection in the PersonalAI mobile app.

## Overview

PersonalAI provides comprehensive voice features:

- **Voice Recording:** High-quality audio capture
- **Transcription:** Whisper API for speech-to-text
- **Text-to-Speech:** Dual provider system (native + premium)
- **Wake Word Detection:** "Hey SirCharge" activation (optional)

---

## Voice Recording

### VoiceRecorder Service

**Location:** `src/services/dataCollection/VoiceRecorder.ts`

```typescript
import { Audio } from 'expo-av';

class VoiceRecorder {
  private static instance: VoiceRecorder;
  private recording: Audio.Recording | null = null;
  private isRecording: boolean = false;

  static getInstance(): VoiceRecorder {
    if (!VoiceRecorder.instance) {
      VoiceRecorder.instance = new VoiceRecorder();
    }
    return VoiceRecorder.instance;
  }

  async initialize(): Promise<void> {
    // Request permissions
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Audio recording permission denied');
    }

    // Configure audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }

  async startRecording(): Promise<void> {
    if (this.isRecording) return;

    try {
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        this.onRecordingStatusUpdate.bind(this)
      );

      this.recording = recording;
      this.isRecording = true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<RecordingResult> {
    if (!this.recording || !this.isRecording) {
      throw new Error('No active recording');
    }

    try {
      await this.recording.stopAndUnloadAsync();

      const uri = this.recording.getURI();
      const status = await this.recording.getStatusAsync();

      this.recording = null;
      this.isRecording = false;

      return {
        uri: uri!,
        duration: status.durationMillis,
        mimeType: 'audio/m4a',
      };
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  async cancelRecording(): Promise<void> {
    if (!this.recording) return;

    try {
      await this.recording.stopAndUnloadAsync();
    } catch (error) {
      // Ignore errors during cancel
    }

    this.recording = null;
    this.isRecording = false;
  }

  private onRecordingStatusUpdate(status: Audio.RecordingStatus): void {
    // Handle recording status changes
    if (status.isDoneRecording) {
      // Recording complete
    }

    // Update UI with metering data
    if (status.metering) {
      // status.metering is in dB
      // Can be used for audio level visualization
    }
  }
}
```

### Recording Quality Settings

```typescript
const RECORDING_PRESETS = {
  // High quality for voice notes
  highQuality: {
    android: {
      extension: '.m4a',
      outputFormat: Audio.AndroidOutputFormat.MPEG_4,
      audioEncoder: Audio.AndroidAudioEncoder.AAC,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
    ios: {
      extension: '.m4a',
      audioQuality: Audio.IOSAudioQuality.HIGH,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: 'audio/webm',
      bitsPerSecond: 128000,
    },
  },

  // Lower quality for longer recordings
  standard: {
    android: {
      extension: '.m4a',
      outputFormat: Audio.AndroidOutputFormat.MPEG_4,
      audioEncoder: Audio.AndroidAudioEncoder.AAC,
      sampleRate: 22050,
      numberOfChannels: 1,
      bitRate: 64000,
    },
    ios: {
      extension: '.m4a',
      audioQuality: Audio.IOSAudioQuality.MEDIUM,
      sampleRate: 22050,
      numberOfChannels: 1,
      bitRate: 64000,
    },
  },
};
```

---

## Transcription

### OpenAI Whisper Integration

```typescript
class TranscriptionService {
  private static instance: TranscriptionService;

  static getInstance(): TranscriptionService {
    if (!TranscriptionService.instance) {
      TranscriptionService.instance = new TranscriptionService();
    }
    return TranscriptionService.instance;
  }

  async transcribe(audioUri: string, userId: string): Promise<TranscriptionResult> {
    try {
      // Read audio file
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        throw new Error('Audio file not found');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }

      const result = await response.json();

      // Track usage
      await UsageTracker.getInstance().recordEvent({
        userId,
        service: 'openai',
        endpoint: 'whisper',
        audioSeconds: await this.getAudioDuration(audioUri),
      });

      return {
        text: result.text,
        confidence: 1.0, // Whisper doesn't return confidence
        language: result.language || 'en',
      };
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  private async getAudioDuration(uri: string): Promise<number> {
    const sound = new Audio.Sound();
    await sound.loadAsync({ uri });
    const status = await sound.getStatusAsync();
    await sound.unloadAsync();
    return (status as any).durationMillis / 1000;
  }
}
```

### Transcription Flow

```
Audio File
    │
    ▼
┌─────────────────────────────┐
│   TranscriptionService      │
│   - Read audio file         │
│   - Create FormData         │
└───────────┬─────────────────┘
            │
            ▼
┌─────────────────────────────┐
│      OpenAI Whisper API     │
│   - Model: whisper-1        │
│   - Language: auto-detect   │
└───────────┬─────────────────┘
            │
            ▼
┌─────────────────────────────┐
│    Transcription Result     │
│   - text: string            │
│   - language: string        │
└─────────────────────────────┘
```

---

## Text-to-Speech

### Dual Provider System

PersonalAI supports two TTS providers:

1. **Native TTS:** Built-in device voices (free, instant)
2. **Premium TTS:** OpenAI TTS (higher quality, costs money)

```typescript
class TTSService {
  private static instance: TTSService;
  private currentProvider: 'native' | 'openai' = 'native';
  private isSpeaking: boolean = false;

  static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService();
    }
    return TTSService.instance;
  }

  async speak(text: string, options?: TTSOptions): Promise<void> {
    if (this.isSpeaking) {
      await this.stop();
    }

    this.isSpeaking = true;

    try {
      if (this.currentProvider === 'native') {
        await this.speakNative(text, options);
      } else {
        await this.speakOpenAI(text, options);
      }
    } finally {
      this.isSpeaking = false;
    }
  }

  async stop(): Promise<void> {
    if (this.currentProvider === 'native') {
      await Speech.stop();
    }
    this.isSpeaking = false;
  }

  setProvider(provider: 'native' | 'openai'): void {
    this.currentProvider = provider;
  }
}
```

### Native TTS (expo-speech)

```typescript
import * as Speech from 'expo-speech';

class NativeTTS {
  async speak(text: string, options?: NativeTTSOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      Speech.speak(text, {
        language: options?.language || 'en-US',
        pitch: options?.pitch || 1.0,
        rate: options?.rate || 1.0,
        voice: options?.voice,
        onDone: resolve,
        onError: reject,
        onStopped: resolve,
      });
    });
  }

  async getVoices(): Promise<Speech.Voice[]> {
    return Speech.getAvailableVoicesAsync();
  }

  async stop(): Promise<void> {
    await Speech.stop();
  }
}
```

### Premium TTS (OpenAI)

```typescript
class OpenAITTS {
  private audioPlayer: Audio.Sound | null = null;

  async speak(text: string, options?: OpenAITTSOptions): Promise<void> {
    try {
      // Generate speech
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: options?.voice || 'alloy',
          response_format: 'mp3',
          speed: options?.speed || 1.0,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.status}`);
      }

      // Save audio to temporary file
      const audioBlob = await response.blob();
      const audioUri = await this.saveToTempFile(audioBlob);

      // Play audio
      await this.playAudio(audioUri);

      // Track usage
      await UsageTracker.getInstance().recordEvent({
        userId: options?.userId || 'unknown',
        service: 'openai',
        endpoint: 'tts',
        inputCharacters: text.length,
      });
    } catch (error) {
      console.error('OpenAI TTS error:', error);
      throw error;
    }
  }

  private async playAudio(uri: string): Promise<void> {
    this.audioPlayer = new Audio.Sound();
    await this.audioPlayer.loadAsync({ uri });
    await this.audioPlayer.playAsync();

    // Wait for playback to complete
    return new Promise((resolve) => {
      this.audioPlayer!.setOnPlaybackStatusUpdate((status) => {
        if ((status as any).didJustFinish) {
          this.audioPlayer?.unloadAsync();
          this.audioPlayer = null;
          resolve();
        }
      });
    });
  }
}
```

### Voice Options

```typescript
// Native voices (varies by device)
type NativeVoice =
  | 'com.apple.ttsbundle.Samantha-compact'  // iOS
  | 'en-us-x-sfg#female_1-local'           // Android
  | string;

// OpenAI voices
type OpenAIVoice =
  | 'alloy'    // Neutral
  | 'echo'     // Male
  | 'fable'    // Male (British)
  | 'onyx'     // Male (deep)
  | 'nova'     // Female
  | 'shimmer'; // Female (warm)
```

---

## Wake Word Detection

### Overview

PersonalAI supports "Hey SirCharge" wake word detection for hands-free activation.

**Note:** This feature requires the `@react-native-voice/voice` package, which needs additional setup.

### WakeWordDetector Service

```typescript
import Voice from '@react-native-voice/voice';

class WakeWordDetector {
  private static instance: WakeWordDetector;
  private isListening: boolean = false;
  private onWakeWordDetected: (() => void) | null = null;

  private readonly WAKE_PHRASES = [
    'hey sir charge',
    'hey siri charge',
    'hey search',
    'hey sir',
  ];

  static getInstance(): WakeWordDetector {
    if (!WakeWordDetector.instance) {
      WakeWordDetector.instance = new WakeWordDetector();
    }
    return WakeWordDetector.instance;
  }

  async initialize(): Promise<void> {
    Voice.onSpeechResults = this.handleSpeechResults.bind(this);
    Voice.onSpeechError = this.handleSpeechError.bind(this);
  }

  async startListening(onWakeWord: () => void): Promise<void> {
    if (this.isListening) return;

    this.onWakeWordDetected = onWakeWord;

    try {
      await Voice.start('en-US');
      this.isListening = true;
    } catch (error) {
      console.error('Wake word start error:', error);
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    if (!this.isListening) return;

    try {
      await Voice.stop();
      this.isListening = false;
    } catch (error) {
      console.error('Wake word stop error:', error);
    }
  }

  private handleSpeechResults(event: any): void {
    const results = event.value || [];

    for (const result of results) {
      const normalized = result.toLowerCase().trim();

      for (const phrase of this.WAKE_PHRASES) {
        if (normalized.includes(phrase)) {
          // Wake word detected!
          this.onWakeWordDetected?.();

          // Restart listening for next wake word
          this.restartListening();
          return;
        }
      }
    }

    // No wake word - continue listening
    this.restartListening();
  }

  private handleSpeechError(error: any): void {
    console.error('Wake word error:', error);
    // Restart after error
    this.restartListening();
  }

  private async restartListening(): Promise<void> {
    if (!this.isListening) return;

    try {
      await Voice.stop();
      await Voice.start('en-US');
    } catch (error) {
      console.error('Wake word restart error:', error);
    }
  }
}
```

### Battery Considerations

Wake word detection continuously uses the microphone, which impacts battery life:

```typescript
class WakeWordManager {
  private isEnabled: boolean = false;

  async setEnabled(enabled: boolean): Promise<void> {
    this.isEnabled = enabled;

    if (enabled) {
      // Only enable in certain conditions
      const batteryLevel = await Battery.getBatteryLevelAsync();
      const isCharging = await Battery.getBatteryStateAsync();

      if (batteryLevel < 0.2 && isCharging !== Battery.BatteryState.CHARGING) {
        console.warn('Battery too low for wake word detection');
        return;
      }

      await WakeWordDetector.getInstance().startListening(() => {
        this.handleWakeWord();
      });
    } else {
      await WakeWordDetector.getInstance().stopListening();
    }
  }

  private async handleWakeWord(): Promise<void> {
    // Play activation sound
    await this.playActivationSound();

    // Show voice input UI
    // Navigate to voice recording screen
  }
}
```

---

## Voice Note Model

### VoiceNote Interface

```typescript
interface VoiceNote {
  id: string;
  userId: string;

  // Audio file
  audioUri: string;
  audioUrl?: string;         // Cloud storage URL after sync
  duration: number;          // milliseconds
  mimeType: string;

  // Transcription
  transcription?: string;
  transcriptionStatus: 'pending' | 'completed' | 'failed';
  transcriptionError?: string;

  // Metadata
  title?: string;
  tags?: string[];

  // Timestamps
  recordedAt: string;
  createdAt: string;
  updatedAt: string;

  // Sync status
  syncStatus: 'pending' | 'synced' | 'error';
  syncedAt?: string;

  // Embedding status
  embeddingId?: string;
  embeddingCreatedAt?: string;
}
```

### Embedding Pipeline

```typescript
class VoiceNoteTextGenerator {
  static generateText(note: VoiceNote): string {
    const date = new Date(note.recordedAt);
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const duration = Math.round(note.duration / 1000);

    let text = `Voice note from ${dateStr} (${duration} seconds)`;

    if (note.title) {
      text += `: "${note.title}"`;
    }

    if (note.transcription) {
      text += `. Transcription: ${note.transcription}`;
    }

    if (note.tags && note.tags.length > 0) {
      text += `. Tags: ${note.tags.join(', ')}`;
    }

    return text;
  }
}
```

---

## Audio Settings

### User Preferences

```typescript
interface AudioSettings {
  // Recording
  recordingQuality: 'high' | 'standard';
  maxRecordingDuration: number;  // seconds, default 300 (5 min)

  // Transcription
  autoTranscribe: boolean;
  transcriptionLanguage: string;

  // TTS
  ttsProvider: 'native' | 'openai';
  ttsVoice: string;
  ttsSpeed: number;  // 0.5 - 2.0
  ttsPitch: number;  // 0.5 - 2.0

  // Wake word
  wakeWordEnabled: boolean;
  wakeWordPhrase: string;  // default: 'hey sir charge'
}
```

---

## Troubleshooting

### Recording Issues

**"Microphone permission denied"**
- Check Settings → Privacy → Microphone → PersonalAI
- Request permission again with explanation dialog

**"Recording starts but no audio"**
- Check audio mode configuration
- Verify device microphone is not in use by another app

**"Recording file too large"**
- Switch to standard quality preset
- Implement automatic chunking for long recordings

### Transcription Issues

**"Transcription timeout"**
- Large files may take longer
- Implement progress indicator
- Consider chunking long recordings

**"Poor transcription accuracy"**
- Check audio quality
- Ensure clear speech with minimal background noise
- Try specifying language explicitly

### TTS Issues

**"No sound from TTS"**
- Check device volume
- Verify audio mode allows playback
- Check if silent mode is enabled

**"OpenAI TTS fails"**
- Verify API key
- Check internet connection
- Fall back to native TTS

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - Overall system design
- [Services](./SERVICES.md) - Service reference
- [Firebase Functions](./FIREBASE_FUNCTIONS.md) - Cloud processing
