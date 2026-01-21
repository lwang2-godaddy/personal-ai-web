import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import {
  VoiceCategory,
  DEFAULT_VOICE_CATEGORIES,
} from '@/lib/models/VoiceCategory';

const COLLECTION_PATH = 'voice_categories';

/**
 * GET /api/admin/voice-categories
 * Get all voice note categories
 *
 * Returns:
 * - categories: VoiceCategory[]
 * - isDefault: boolean (true if returning seeded defaults)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const db = getAdminFirestore();
    const snapshot = await db.collection(COLLECTION_PATH).orderBy('displayOrder').get();

    if (snapshot.empty) {
      // Return default categories if not initialized
      const now = new Date().toISOString();
      const defaultCategories: VoiceCategory[] = DEFAULT_VOICE_CATEGORIES.map((cat, index) => ({
        ...cat,
        id: cat.key,
        createdAt: now,
        updatedAt: now,
      }));

      return NextResponse.json({
        categories: defaultCategories,
        isDefault: true,
      });
    }

    const categories: VoiceCategory[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as VoiceCategory[];

    return NextResponse.json({
      categories,
      isDefault: false,
    });
  } catch (error: unknown) {
    console.error('[Admin VoiceCategories API] Error fetching categories:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch voice categories';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/voice-categories
 * Initialize voice categories with defaults or add a new category
 *
 * Body (for initialization):
 * - initialize: true
 *
 * Body (for adding new):
 * - category: Partial<VoiceCategory>
 *
 * Returns:
 * - categories: VoiceCategory[] (if initialize)
 * - category: VoiceCategory (if adding single)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { initialize, category } = body;

    const db = getAdminFirestore();

    if (initialize) {
      // Initialize with default categories
      const snapshot = await db.collection(COLLECTION_PATH).limit(1).get();

      if (!snapshot.empty) {
        return NextResponse.json(
          { error: 'Voice categories already initialized. Use PATCH to update.' },
          { status: 409 }
        );
      }

      const now = new Date().toISOString();
      const batch = db.batch();

      const categories: VoiceCategory[] = DEFAULT_VOICE_CATEGORIES.map((cat) => {
        const docRef = db.collection(COLLECTION_PATH).doc(cat.key);
        const fullCategory: VoiceCategory = {
          ...cat,
          id: cat.key,
          createdAt: now,
          updatedAt: now,
        };
        batch.set(docRef, fullCategory);
        return fullCategory;
      });

      await batch.commit();

      return NextResponse.json({ categories }, { status: 201 });
    }

    if (category) {
      // Add new category
      if (!category.key || !category.iconName) {
        return NextResponse.json(
          { error: 'Category key and iconName are required' },
          { status: 400 }
        );
      }

      // Check if key already exists
      const existingDoc = await db.collection(COLLECTION_PATH).doc(category.key).get();
      if (existingDoc.exists) {
        return NextResponse.json(
          { error: `Category with key "${category.key}" already exists` },
          { status: 409 }
        );
      }

      const now = new Date().toISOString();
      const newCategory: VoiceCategory = {
        id: category.key,
        key: category.key,
        iconName: category.iconName,
        color: category.color || '#6B7280',
        displayOrder: category.displayOrder ?? 50,
        enabled: category.enabled ?? true,
        keywords: category.keywords || [],
        createdAt: now,
        updatedAt: now,
      };

      await db.collection(COLLECTION_PATH).doc(category.key).set(newCategory);

      return NextResponse.json({ category: newCategory }, { status: 201 });
    }

    return NextResponse.json(
      { error: 'Either "initialize: true" or "category" object is required' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('[Admin VoiceCategories API] Error creating:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create voice category';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/voice-categories
 * Update a voice category
 *
 * Body:
 * - key: string (category key to update)
 * - updates: Partial<VoiceCategory>
 *
 * Returns:
 * - category: VoiceCategory (updated)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { key, updates } = body;

    if (!key) {
      return NextResponse.json(
        { error: 'Category key is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const docRef = db.collection(COLLECTION_PATH).doc(key);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: `Category with key "${key}" not found` },
        { status: 404 }
      );
    }

    const currentCategory = doc.data() as VoiceCategory;
    const now = new Date().toISOString();

    // Build updated category
    const updatedCategory: VoiceCategory = {
      ...currentCategory,
      updatedAt: now,
    };

    // Apply updates
    if (typeof updates.iconName === 'string') {
      updatedCategory.iconName = updates.iconName;
    }
    if (typeof updates.color === 'string') {
      updatedCategory.color = updates.color;
    }
    if (typeof updates.displayOrder === 'number') {
      updatedCategory.displayOrder = updates.displayOrder;
    }
    if (typeof updates.enabled === 'boolean') {
      updatedCategory.enabled = updates.enabled;
    }
    if (Array.isArray(updates.keywords)) {
      updatedCategory.keywords = updates.keywords;
    }

    await docRef.set(updatedCategory);

    return NextResponse.json({ category: updatedCategory });
  } catch (error: unknown) {
    console.error('[Admin VoiceCategories API] Error updating:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to update voice category';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/voice-categories
 * Delete a voice category
 *
 * Body:
 * - key: string (category key to delete)
 *
 * Returns:
 * - success: boolean
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { key } = body;

    if (!key) {
      return NextResponse.json(
        { error: 'Category key is required' },
        { status: 400 }
      );
    }

    // Prevent deletion of 'other' category (fallback)
    if (key === 'other') {
      return NextResponse.json(
        { error: 'Cannot delete the "other" category (fallback)' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const docRef = db.collection(COLLECTION_PATH).doc(key);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: `Category with key "${key}" not found` },
        { status: 404 }
      );
    }

    await docRef.delete();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[Admin VoiceCategories API] Error deleting:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to delete voice category';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
