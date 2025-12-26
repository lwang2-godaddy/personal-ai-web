/**
 * Text Notes API Route
 * Handles CRUD operations for diary/journal entries
 */

import { NextRequest, NextResponse } from 'next/server';
import FirestoreService from '@/lib/api/firebase/firestore';
import { TextNote } from '@/lib/models/TextNote';
import { validateTextNote } from '@/lib/utils/validation';

/**
 * POST /api/text-notes
 * Create a new text note
 */
export async function POST(request: NextRequest) {
  try {
    const { noteId, textNote } = await request.json();

    if (!noteId || !textNote) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate text note
    const validation = validateTextNote(textNote);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: `Validation failed: ${validation.errors.join(', ')}` },
        { status: 400 }
      );
    }

    // Store in Firestore (triggers Cloud Function for embedding)
    await FirestoreService.createTextNote(noteId, textNote);

    return NextResponse.json(
      {
        success: true,
        noteId,
        message: 'Text note created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating text note:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create text note' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/text-notes?userId={userId}&limit={limit}
 * Get text notes for a user
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const textNotes = await FirestoreService.getTextNotes(userId, limit);

    return NextResponse.json({ textNotes }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching text notes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch text notes' },
      { status: 500 }
    );
  }
}
