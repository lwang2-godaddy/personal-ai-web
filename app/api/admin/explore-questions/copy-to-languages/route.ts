import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { EXPLORE_SUPPORTED_LANGUAGES, ExploreLanguageCode } from '@/lib/models/ExploreQuestion';

export const dynamic = 'force-dynamic';

interface CopyRequest {
  sourceLanguage: ExploreLanguageCode;
  questionId: string;
  targetLanguages: ExploreLanguageCode[];
  overwrite: boolean;
}

interface CopyResult {
  language: ExploreLanguageCode;
  status: 'copied' | 'skipped' | 'error';
  error?: string;
}

/**
 * POST /api/admin/explore-questions/copy-to-languages
 *
 * Copies a question from one language to multiple other languages.
 * Useful for syncing questions across all supported languages.
 */
export async function POST(request: NextRequest) {
  // Verify admin authentication
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const body: CopyRequest = await request.json();
    const { sourceLanguage, questionId, targetLanguages, overwrite } = body;

    // Validate required fields
    if (!sourceLanguage || !questionId || !targetLanguages?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: sourceLanguage, questionId, targetLanguages' },
        { status: 400 }
      );
    }

    // Validate source language
    const validSourceLang = EXPLORE_SUPPORTED_LANGUAGES.find(l => l.code === sourceLanguage);
    if (!validSourceLang) {
      return NextResponse.json(
        { error: `Invalid source language: ${sourceLanguage}` },
        { status: 400 }
      );
    }

    // Validate target languages
    const invalidTargets = targetLanguages.filter(
      lang => !EXPLORE_SUPPORTED_LANGUAGES.find(l => l.code === lang)
    );
    if (invalidTargets.length > 0) {
      return NextResponse.json(
        { error: `Invalid target languages: ${invalidTargets.join(', ')}` },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const now = new Date().toISOString();

    // Fetch source question
    const sourceRef = db
      .collection('exploreQuestions')
      .doc(sourceLanguage)
      .collection('questions')
      .doc(questionId);

    const sourceDoc = await sourceRef.get();

    if (!sourceDoc.exists) {
      return NextResponse.json(
        { error: `Source question not found: ${questionId} in ${sourceLanguage}` },
        { status: 404 }
      );
    }

    const sourceData = sourceDoc.data();

    // Copy to each target language
    const results: CopyResult[] = [];

    for (const targetLang of targetLanguages) {
      // Skip if trying to copy to same language
      if (targetLang === sourceLanguage) {
        results.push({
          language: targetLang,
          status: 'skipped',
          error: 'Cannot copy to same language',
        });
        continue;
      }

      try {
        const targetRef = db
          .collection('exploreQuestions')
          .doc(targetLang)
          .collection('questions')
          .doc(questionId);

        const targetDoc = await targetRef.get();
        const exists = targetDoc.exists;

        if (exists && !overwrite) {
          results.push({
            language: targetLang,
            status: 'skipped',
            error: 'Question already exists (overwrite=false)',
          });
          continue;
        }

        // Prepare data for target language
        const targetData = {
          ...sourceData,
          // Keep the same ID
          id: questionId,
          // Update metadata
          updatedAt: now,
          updatedBy: user.uid,
          // If creating new, add created metadata
          ...(exists
            ? {}
            : {
                createdAt: now,
                createdBy: user.uid,
              }),
        };

        // Save to target language
        await targetRef.set(targetData, { merge: false });

        results.push({
          language: targetLang,
          status: 'copied',
        });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results.push({
          language: targetLang,
          status: 'error',
          error: errorMessage,
        });
      }
    }

    // Calculate summary
    const copied = results.filter(r => r.status === 'copied').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: errors === 0,
      copied,
      skipped,
      errors,
      results,
    });
  } catch (error: unknown) {
    console.error('Error copying question to languages:', error);
    const message = error instanceof Error ? error.message : 'Failed to copy question';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
