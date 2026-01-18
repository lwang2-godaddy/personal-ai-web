import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import {
  ExploreQuestion,
  validateExploreQuestion,
  isValidExploreLanguage,
  ExploreLanguageCode,
} from '@/lib/models/ExploreQuestion';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/explore-questions/[id]
 * Get a single explore question
 *
 * Query params:
 * - language: string (required)
 *
 * Returns:
 * - question: ExploreQuestion
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') as ExploreLanguageCode;

    if (!language || !isValidExploreLanguage(language)) {
      return NextResponse.json(
        { error: 'Valid language is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const questionDoc = await db
      .collection('exploreQuestions')
      .doc(language)
      .collection('questions')
      .doc(id)
      .get();

    if (!questionDoc.exists) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    const data = questionDoc.data();
    const question: ExploreQuestion = {
      id: questionDoc.id,
      icon: data?.icon || '❓',
      labelKey: data?.labelKey || '',
      queryTemplate: data?.queryTemplate || '',
      category: data?.category || 'general',
      priority: data?.priority ?? 50,
      enabled: data?.enabled ?? true,
      userDataStates: data?.userDataStates || ['RICH_DATA'],
      requiresData: data?.requiresData,
      variables: data?.variables || [],
      order: data?.order ?? 0,
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || data?.createdAt,
      createdBy: data?.createdBy,
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || data?.updatedAt,
      updatedBy: data?.updatedBy,
    };

    return NextResponse.json({ question });
  } catch (error: unknown) {
    console.error('[Admin Explore Questions API] GET [id] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch question';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/explore-questions/[id]
 * Update an explore question
 *
 * Body:
 * - language: string (required)
 * - updates: Partial<ExploreQuestion> (required)
 *
 * Returns:
 * - question: ExploreQuestion
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { id } = await params;
    const body = await request.json();
    const { language, updates } = body;

    if (!language || !isValidExploreLanguage(language)) {
      return NextResponse.json(
        { error: 'Valid language is required' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Updates object is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const questionRef = db
      .collection('exploreQuestions')
      .doc(language)
      .collection('questions')
      .doc(id);

    const questionDoc = await questionRef.get();

    if (!questionDoc.exists) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    const existingData = questionDoc.data();
    const now = new Date().toISOString();

    // Merge updates with existing data for validation
    const mergedQuestion = {
      ...existingData,
      ...updates,
      id,
      updatedAt: now,
      updatedBy: user.uid,
    };

    // Validate merged question
    const validation = validateExploreQuestion(mergedQuestion);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid updates', details: validation.errors },
        { status: 400 }
      );
    }

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.createdAt;
    delete updates.createdBy;

    // Update question
    await questionRef.update({
      ...updates,
      updatedAt: now,
      updatedBy: user.uid,
    });

    // Update config timestamp
    const configRef = db
      .collection('exploreQuestions')
      .doc(language)
      .collection('config')
      .doc('settings');

    await configRef.update({
      lastUpdated: now,
      updatedBy: user.uid,
    });

    // Fetch updated question
    const updatedDoc = await questionRef.get();
    const updatedData = updatedDoc.data();

    const question: ExploreQuestion = {
      id: updatedDoc.id,
      icon: updatedData?.icon || '❓',
      labelKey: updatedData?.labelKey || '',
      queryTemplate: updatedData?.queryTemplate || '',
      category: updatedData?.category || 'general',
      priority: updatedData?.priority ?? 50,
      enabled: updatedData?.enabled ?? true,
      userDataStates: updatedData?.userDataStates || ['RICH_DATA'],
      requiresData: updatedData?.requiresData,
      variables: updatedData?.variables || [],
      order: updatedData?.order ?? 0,
      createdAt: updatedData?.createdAt?.toDate?.()?.toISOString() || updatedData?.createdAt,
      createdBy: updatedData?.createdBy,
      updatedAt: updatedData?.updatedAt?.toDate?.()?.toISOString() || updatedData?.updatedAt,
      updatedBy: updatedData?.updatedBy,
    };

    return NextResponse.json({ question });
  } catch (error: unknown) {
    console.error('[Admin Explore Questions API] PUT Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update question';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/explore-questions/[id]
 * Delete an explore question
 *
 * Query params:
 * - language: string (required)
 *
 * Returns:
 * - success: boolean
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') as ExploreLanguageCode;

    if (!language || !isValidExploreLanguage(language)) {
      return NextResponse.json(
        { error: 'Valid language is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const questionRef = db
      .collection('exploreQuestions')
      .doc(language)
      .collection('questions')
      .doc(id);

    const questionDoc = await questionRef.get();

    if (!questionDoc.exists) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Delete question
    await questionRef.delete();

    // Update config timestamp
    const now = new Date().toISOString();
    const configRef = db
      .collection('exploreQuestions')
      .doc(language)
      .collection('config')
      .doc('settings');

    const configDoc = await configRef.get();
    if (configDoc.exists) {
      await configRef.update({
        lastUpdated: now,
        updatedBy: user.uid,
      });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: unknown) {
    console.error('[Admin Explore Questions API] DELETE Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete question';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
