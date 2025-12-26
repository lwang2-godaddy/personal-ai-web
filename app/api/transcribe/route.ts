import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/transcribe
 * Transcribe audio file using OpenAI Whisper API
 *
 * Body:
 * - audioUrl: string - Firebase Storage URL of the audio file
 * OR
 * - audioFile: File - Direct file upload (multipart/form-data)
 *
 * Returns:
 * - transcription: string - Transcribed text
 * - duration: number - Audio duration in seconds (estimated)
 * - language: string | null - Detected language code
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let audioBlob: Blob;
    let fileName = 'audio.webm';

    // Handle both JSON (with URL) and FormData (with file)
    if (contentType.includes('application/json')) {
      const { audioUrl } = await request.json();

      if (!audioUrl || typeof audioUrl !== 'string') {
        return NextResponse.json(
          { error: 'Missing or invalid audioUrl' },
          { status: 400 }
        );
      }

      // Download audio from Firebase Storage URL
      console.log('[Transcribe] Downloading audio from:', audioUrl);
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.statusText}`);
      }

      audioBlob = await response.blob();
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('audioFile') as File;

      if (!file) {
        return NextResponse.json(
          { error: 'Missing audioFile in form data' },
          { status: 400 }
        );
      }

      audioBlob = file;
      fileName = file.name;
    } else {
      return NextResponse.json(
        { error: 'Content-Type must be application/json or multipart/form-data' },
        { status: 400 }
      );
    }

    // Validate audio blob
    if (!audioBlob || audioBlob.size === 0) {
      return NextResponse.json(
        { error: 'Audio file is empty' },
        { status: 400 }
      );
    }

    if (audioBlob.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Audio file too large (max 25MB)' },
        { status: 400 }
      );
    }

    console.log('[Transcribe] Audio blob size:', audioBlob.size, 'bytes');

    // Create File object for OpenAI API (requires File, not Blob)
    const audioFile = new File([audioBlob], fileName, { type: audioBlob.type });

    // Call OpenAI Whisper API
    console.log('[Transcribe] Calling Whisper API...');
    const startTime = Date.now();

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json', // Returns language, duration, segments
    });

    const elapsedTime = Date.now() - startTime;
    console.log('[Transcribe] Whisper API completed in', elapsedTime, 'ms');

    // Extract data
    const text = transcription.text || '';
    const duration = transcription.duration || 0;
    const language = transcription.language || null;

    console.log('[Transcribe] Transcription:', {
      textLength: text.length,
      duration,
      language,
    });

    if (text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Transcription is empty - audio may be too quiet or unintelligible' },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        transcription: text,
        duration: Math.round(duration),
        language,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Transcribe] Error:', error);

    // Handle specific OpenAI errors
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;

      if (status === 401) {
        return NextResponse.json(
          { error: 'Invalid OpenAI API key' },
          { status: 500 }
        );
      }

      if (status === 429) {
        return NextResponse.json(
          { error: 'OpenAI API rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: `OpenAI API error: ${message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: `Failed to transcribe audio: ${error.message}` },
      { status: 500 }
    );
  }
}
