import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/api/firebase/firestore';

const firestoreService = FirestoreService.getInstance();

/**
 * POST /api/voice-notes
 * Create a new voice note in Firestore
 *
 * Body:
 * - noteId: string - Unique ID for the voice note
 * - voiceNote: VoiceNote - Voice note data
 *
 * Returns:
 * - success: boolean
 * - noteId: string
 */
export async function POST(request: NextRequest) {
  try {
    const { noteId, voiceNote } = await request.json();

    // Validate required fields
    if (!noteId || typeof noteId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid noteId' },
        { status: 400 }
      );
    }

    if (!voiceNote || typeof voiceNote !== 'object') {
      return NextResponse.json(
        { error: 'Missing or invalid voiceNote' },
        { status: 400 }
      );
    }

    // Validate voice note fields
    const requiredFields = ['userId', 'audioUrl', 'transcription', 'duration', 'createdAt'];
    for (const field of requiredFields) {
      if (!(field in voiceNote)) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    if (typeof voiceNote.userId !== 'string' || voiceNote.userId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid userId' },
        { status: 400 }
      );
    }

    if (typeof voiceNote.audioUrl !== 'string' || voiceNote.audioUrl.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid audioUrl' },
        { status: 400 }
      );
    }

    if (typeof voiceNote.transcription !== 'string') {
      return NextResponse.json(
        { error: 'Invalid transcription' },
        { status: 400 }
      );
    }

    if (typeof voiceNote.duration !== 'number' || voiceNote.duration < 0) {
      return NextResponse.json(
        { error: 'Invalid duration' },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (voiceNote.tags !== undefined) {
      if (!Array.isArray(voiceNote.tags)) {
        return NextResponse.json(
          { error: 'tags must be an array' },
          { status: 400 }
        );
      }

      if (voiceNote.tags.length > 10) {
        return NextResponse.json(
          { error: 'Maximum 10 tags allowed' },
          { status: 400 }
        );
      }

      if (voiceNote.tags.some((tag: any) => typeof tag !== 'string' || tag.length > 30)) {
        return NextResponse.json(
          { error: 'Each tag must be a string with max 30 characters' },
          { status: 400 }
        );
      }
    }

    if (voiceNote.location !== undefined && voiceNote.location !== null) {
      if (typeof voiceNote.location !== 'object') {
        return NextResponse.json(
          { error: 'location must be an object' },
          { status: 400 }
        );
      }

      if (
        typeof voiceNote.location.latitude !== 'number' ||
        typeof voiceNote.location.longitude !== 'number'
      ) {
        return NextResponse.json(
          { error: 'location must have latitude and longitude numbers' },
          { status: 400 }
        );
      }
    }

    console.log('[VoiceNotes] Creating voice note:', {
      noteId,
      userId: voiceNote.userId,
      duration: voiceNote.duration,
      transcriptionLength: voiceNote.transcription.length,
      tags: voiceNote.tags?.length || 0,
    });

    // Store in Firestore
    await firestoreService.createVoiceNote(noteId, voiceNote);

    console.log('[VoiceNotes] Voice note created successfully:', noteId);

    return NextResponse.json(
      {
        success: true,
        noteId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[VoiceNotes] Error creating voice note:', error);

    return NextResponse.json(
      { error: `Failed to create voice note: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/voice-notes?userId={userId}&limit={limit}
 * Get voice notes for a user
 *
 * Query params:
 * - userId: string - User ID (required)
 * - limit: number - Max number of notes to return (default: 50)
 *
 * Returns:
 * - voiceNotes: VoiceNote[]
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid userId' },
        { status: 400 }
      );
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    console.log('[VoiceNotes] Getting voice notes for user:', userId, 'limit:', limit);

    const voiceNotes = await firestoreService.getVoiceNotes(userId, limit);

    console.log('[VoiceNotes] Retrieved', voiceNotes.length, 'voice notes');

    return NextResponse.json(
      {
        voiceNotes,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[VoiceNotes] Error getting voice notes:', error);

    return NextResponse.json(
      { error: `Failed to get voice notes: ${error.message}` },
      { status: 500 }
    );
  }
}
