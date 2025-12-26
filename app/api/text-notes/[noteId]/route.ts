/**
 * Text Note by ID API Route
 * Handles operations on individual text notes
 */

import { NextRequest, NextResponse } from 'next/server';
import FirestoreService from '@/lib/api/firebase/firestore';

/**
 * GET /api/text-notes/[noteId]
 * Get a single text note by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { noteId } = await params;

    const textNote = await FirestoreService.getTextNoteById(noteId);

    if (!textNote) {
      return NextResponse.json({ error: 'Text note not found' }, { status: 404 });
    }

    return NextResponse.json({ textNote }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching text note:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch text note' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/text-notes/[noteId]
 * Update a text note
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { noteId } = await params;
    const { updates } = await request.json();

    if (!updates) {
      return NextResponse.json({ error: 'Missing updates' }, { status: 400 });
    }

    await FirestoreService.updateTextNote(noteId, updates);

    // Fetch updated note
    const textNote = await FirestoreService.getTextNoteById(noteId);

    return NextResponse.json(
      {
        success: true,
        textNote,
        message: 'Text note updated successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating text note:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update text note' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/text-notes/[noteId]
 * Delete a text note
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { noteId } = await params;

    await FirestoreService.deleteTextNote(noteId);

    return NextResponse.json(
      {
        success: true,
        message: 'Text note deleted successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting text note:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete text note' },
      { status: 500 }
    );
  }
}
