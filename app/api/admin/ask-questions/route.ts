import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import {
  AskQuestion,
  AskQuestionsConfig,
  ASK_SUPPORTED_LANGUAGES,
  ASK_CATEGORIES,
  validateAskQuestion,
  isValidAskLanguage,
  AskLanguageCode,
} from '@/lib/models/AskQuestion';

/**
 * GET /api/admin/ask-questions
 * List all ask questions for a language
 *
 * Query params:
 * - language: string (required, e.g., 'en', 'es')
 * - category: string (optional, filter by category)
 * - enabled: boolean (optional, filter by enabled status)
 *
 * Returns:
 * - questions: AskQuestion[]
 * - config: AskQuestionsConfig | null
 * - total: number
 * - languages: LanguageInfo[]
 * - categories: CategoryInfo[]
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const language = (searchParams.get('language') || 'en') as AskLanguageCode;
    const category = searchParams.get('category') || undefined;
    const enabledParam = searchParams.get('enabled');
    const enabled = enabledParam !== null ? enabledParam === 'true' : undefined;

    // Validate language
    if (!isValidAskLanguage(language)) {
      return NextResponse.json(
        { error: `Invalid language: ${language}` },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // Get config document
    const configDoc = await db
      .collection('exploreQuestions')
      .doc(language)
      .collection('config')
      .doc('settings')
      .get();

    const config = configDoc.exists
      ? (configDoc.data() as AskQuestionsConfig)
      : null;

    // Build query for questions
    let questionsQuery = db
      .collection('exploreQuestions')
      .doc(language)
      .collection('questions')
      .orderBy('order', 'asc');

    // Note: Firestore doesn't support multiple where clauses efficiently,
    // so we filter in memory for now

    const questionsSnapshot = await questionsQuery.get();

    let questions: AskQuestion[] = questionsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        icon: data.icon || '❓',
        labelKey: data.labelKey || '',
        queryTemplate: data.queryTemplate || '',
        category: data.category || 'general',
        priority: data.priority ?? 50,
        enabled: data.enabled ?? true,
        userDataStates: data.userDataStates || ['RICH_DATA'],
        requiresData: data.requiresData,
        variables: data.variables || [],
        order: data.order ?? 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        createdBy: data.createdBy,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        updatedBy: data.updatedBy,
      } as AskQuestion;
    });

    // Apply filters
    if (category) {
      questions = questions.filter((q) => q.category === category);
    }
    if (enabled !== undefined) {
      questions = questions.filter((q) => q.enabled === enabled);
    }

    return NextResponse.json({
      questions,
      config,
      total: questions.length,
      languages: ASK_SUPPORTED_LANGUAGES,
      categories: ASK_CATEGORIES,
    });
  } catch (error: unknown) {
    console.error('[Admin Ask Questions API] GET Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch ask questions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/ask-questions
 * Create a new ask question
 *
 * Body:
 * - language: string (required)
 * - question: AskQuestion (required, without id/timestamps)
 *
 * Returns:
 * - question: AskQuestion
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { language, question } = body;

    // Validate language
    if (!language || !isValidAskLanguage(language)) {
      return NextResponse.json(
        { error: 'Valid language is required' },
        { status: 400 }
      );
    }

    // Validate question
    const validation = validateAskQuestion(question);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid question', details: validation.errors },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const now = new Date().toISOString();

    // Generate ID if not provided
    const questionId = question.id || `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Get current max order for this language
    const maxOrderSnapshot = await db
      .collection('exploreQuestions')
      .doc(language)
      .collection('questions')
      .orderBy('order', 'desc')
      .limit(1)
      .get();

    const maxOrder = maxOrderSnapshot.empty
      ? 0
      : (maxOrderSnapshot.docs[0].data().order || 0) + 1;

    // Build question object, excluding undefined fields
    // Firestore doesn't accept undefined values
    const newQuestion: Record<string, unknown> = {
      id: questionId,
      icon: question.icon,
      labelKey: question.labelKey,
      queryTemplate: question.queryTemplate,
      category: question.category,
      priority: question.priority ?? 50,
      enabled: question.enabled ?? true,
      userDataStates: question.userDataStates,
      order: question.order ?? maxOrder,
      createdAt: now,
      createdBy: user.uid,
      updatedAt: now,
      updatedBy: user.uid,
    };

    // Only add optional fields if they have values
    if (question.requiresData && Object.keys(question.requiresData).length > 0) {
      newQuestion.requiresData = question.requiresData;
    }
    if (question.variables && question.variables.length > 0) {
      newQuestion.variables = question.variables;
    }

    // Save question
    await db
      .collection('exploreQuestions')
      .doc(language)
      .collection('questions')
      .doc(questionId)
      .set(newQuestion);

    // Ensure config exists
    const configRef = db
      .collection('exploreQuestions')
      .doc(language)
      .collection('config')
      .doc('settings');

    const configDoc = await configRef.get();
    if (!configDoc.exists) {
      await configRef.set({
        version: '1.0.0',
        language,
        lastUpdated: now,
        updatedBy: user.uid,
        enabled: true,
      });
    } else {
      await configRef.update({
        lastUpdated: now,
        updatedBy: user.uid,
      });
    }

    return NextResponse.json({ question: newQuestion }, { status: 201 });
  } catch (error: unknown) {
    console.error('[Admin Ask Questions API] POST Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create ask question';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
