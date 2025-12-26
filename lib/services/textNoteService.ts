/**
 * Text Note Service
 * Handles CRUD operations for diary/journal entries
 */

import { TextNote, TextNoteDraft } from '@/lib/models/TextNote';
import { validateTextNote, sanitizeText } from '@/lib/utils/validation';

const DRAFT_STORAGE_KEY = 'personalai_diary_draft';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export class TextNoteService {
  private static instance: TextNoteService;
  private autoSaveTimer: NodeJS.Timeout | null = null;

  static getInstance(): TextNoteService {
    if (!TextNoteService.instance) {
      TextNoteService.instance = new TextNoteService();
    }
    return TextNoteService.instance;
  }

  /**
   * Create a new text note
   * @param note Text note data (without id, timestamps, embeddingId)
   * @param userId User ID
   * @returns Promise with created note ID
   */
  async createTextNote(
    note: Omit<TextNote, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'embeddingId'>,
    userId: string
  ): Promise<{ noteId: string; textNote: TextNote }> {
    // Sanitize text inputs
    const sanitizedNote = {
      ...note,
      title: sanitizeText(note.title),
      content: sanitizeText(note.content),
      tags: note.tags.map((tag) => sanitizeText(tag)),
    };

    // Validate
    const validation = validateTextNote(sanitizedNote);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Generate note ID
    const noteId = `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create full text note object
    const fullTextNote: TextNote = {
      id: noteId,
      ...sanitizedNote,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      embeddingId: null,
    };

    // Store in Firestore via API route
    const response = await fetch('/api/text-notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        noteId,
        textNote: fullTextNote,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create text note');
    }

    return { noteId, textNote: fullTextNote };
  }

  /**
   * Update an existing text note
   * @param noteId Note ID
   * @param updates Partial updates
   * @returns Promise with updated note
   */
  async updateTextNote(
    noteId: string,
    updates: Partial<Omit<TextNote, 'id' | 'userId' | 'createdAt' | 'embeddingId'>>
  ): Promise<TextNote> {
    // Sanitize text inputs if present
    const sanitizedUpdates: any = { ...updates };
    if (updates.title) {
      sanitizedUpdates.title = sanitizeText(updates.title);
    }
    if (updates.content) {
      sanitizedUpdates.content = sanitizeText(updates.content);
    }
    if (updates.tags) {
      sanitizedUpdates.tags = updates.tags.map((tag) => sanitizeText(tag));
    }

    // Add updatedAt timestamp
    sanitizedUpdates.updatedAt = new Date().toISOString();

    // Update in Firestore via API route
    const response = await fetch(`/api/text-notes/${noteId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ updates: sanitizedUpdates }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update text note');
    }

    const { textNote } = await response.json();
    return textNote;
  }

  /**
   * Delete a text note
   * @param noteId Note ID
   */
  async deleteTextNote(noteId: string): Promise<void> {
    const response = await fetch(`/api/text-notes/${noteId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete text note');
    }
  }

  /**
   * Get user's text notes
   * @param userId User ID
   * @param limit Number of notes to fetch (default: 50)
   * @returns Promise with array of text notes
   */
  async getUserTextNotes(userId: string, limit: number = 50): Promise<TextNote[]> {
    const response = await fetch(`/api/text-notes?userId=${userId}&limit=${limit}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch text notes');
    }

    const { textNotes } = await response.json();
    return textNotes;
  }

  /**
   * Get a single text note by ID
   * @param noteId Note ID
   * @returns Promise with text note
   */
  async getTextNoteById(noteId: string): Promise<TextNote> {
    const response = await fetch(`/api/text-notes/${noteId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch text note');
    }

    const { textNote } = await response.json();
    return textNote;
  }

  /**
   * Save draft to localStorage
   * @param draft Draft data
   */
  saveDraftToLocalStorage(draft: TextNoteDraft): void {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error('Failed to save draft to localStorage:', error);
    }
  }

  /**
   * Load draft from localStorage
   * @returns Draft data or null if not found
   */
  loadDraftFromLocalStorage(): TextNoteDraft | null {
    try {
      const draftJson = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!draftJson) return null;

      const draft = JSON.parse(draftJson) as TextNoteDraft;

      // Check if draft is not too old (older than 7 days)
      const lastSaved = new Date(draft.lastSaved);
      const now = new Date();
      const daysDiff = (now.getTime() - lastSaved.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff > 7) {
        // Draft is too old, delete it
        this.clearDraftFromLocalStorage();
        return null;
      }

      return draft;
    } catch (error) {
      console.error('Failed to load draft from localStorage:', error);
      return null;
    }
  }

  /**
   * Clear draft from localStorage
   */
  clearDraftFromLocalStorage(): void {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear draft from localStorage:', error);
    }
  }

  /**
   * Start auto-save timer
   * @param getDraftData Function to get current draft data
   * @param interval Auto-save interval in milliseconds (default: 30s)
   */
  startAutoSave(getDraftData: () => TextNoteDraft, interval: number = AUTO_SAVE_INTERVAL): void {
    // Clear existing timer
    this.stopAutoSave();

    // Start new timer
    this.autoSaveTimer = setInterval(() => {
      const draft = getDraftData();

      // Only save if there's meaningful content
      if (draft.title.trim().length > 0 || draft.content.trim().length > 0) {
        this.saveDraftToLocalStorage(draft);
        console.log('[TextNoteService] Auto-saved draft at', new Date().toISOString());
      }
    }, interval);

    console.log('[TextNoteService] Started auto-save with interval:', interval);
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      console.log('[TextNoteService] Stopped auto-save');
    }
  }
}

// Export singleton instance
export default TextNoteService.getInstance();
