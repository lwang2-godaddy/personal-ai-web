import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/engagement
 * Read engagement config (XP values, level thresholds, achievements) from Firestore.
 * Falls back to empty object if no config exists yet.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const db = getAdminFirestore();

    // Read config/engagement and config/dailyPrompts
    const [engagementDoc, promptsDoc] = await Promise.all([
      db.collection('config').doc('engagement').get(),
      db.collection('config').doc('dailyPrompts').get(),
    ]);

    const engagementConfig = engagementDoc.exists ? engagementDoc.data() : null;
    const dailyPromptsConfig = promptsDoc.exists ? promptsDoc.data() : null;

    return NextResponse.json({
      engagement: engagementConfig,
      dailyPrompts: dailyPromptsConfig,
      hasConfig: engagementDoc.exists,
      hasDailyPrompts: promptsDoc.exists,
    });
  } catch (error: any) {
    console.error('GET /api/admin/engagement error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch engagement config' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/engagement
 * Write updated engagement config to Firestore.
 * Accepts { engagement, dailyPrompts } payload.
 */
export async function PUT(request: NextRequest) {
  try {
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { engagement, dailyPrompts } = body;

    if (!engagement && !dailyPrompts) {
      return NextResponse.json(
        { error: 'No config data provided. Expected { engagement } and/or { dailyPrompts }.' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const batch = db.batch();
    const now = new Date().toISOString();

    if (engagement) {
      // Validate XP values are positive
      if (engagement.xpValues) {
        const invalidXP = Object.entries(engagement.xpValues).find(
          ([, val]) => typeof val !== 'number' || (val as number) <= 0
        );
        if (invalidXP) {
          return NextResponse.json(
            { error: `Invalid XP value for ${invalidXP[0]}: must be a positive number` },
            { status: 400 }
          );
        }
      }

      // Validate level thresholds are ascending
      if (engagement.levelThresholds) {
        for (let i = 1; i < engagement.levelThresholds.length; i++) {
          if (engagement.levelThresholds[i] <= engagement.levelThresholds[i - 1]) {
            return NextResponse.json(
              { error: `Level thresholds must be in ascending order (index ${i})` },
              { status: 400 }
            );
          }
        }
      }

      const engagementRef = db.collection('config').doc('engagement');
      batch.set(engagementRef, {
        ...engagement,
        updatedAt: now,
        updatedBy: user.uid,
      }, { merge: true });
    }

    if (dailyPrompts) {
      const validCategories = ['reflection', 'memory', 'gratitude', 'discovery', 'fun'];
      const validTypes = ['diary', 'voice', 'photo', 'any'];

      // Validate journey prompts
      if (dailyPrompts.prompts) {
        for (const [day, prompt] of Object.entries(dailyPrompts.prompts) as [string, any][]) {
          if (!prompt.text || typeof prompt.text !== 'string' || prompt.text.trim() === '') {
            return NextResponse.json(
              { error: `Day ${day}: text is required and must be non-empty` },
              { status: 400 }
            );
          }
          if (!validCategories.includes(prompt.category)) {
            return NextResponse.json(
              { error: `Day ${day}: invalid category "${prompt.category}". Must be one of: ${validCategories.join(', ')}` },
              { status: 400 }
            );
          }
          if (!validTypes.includes(prompt.suggestedType)) {
            return NextResponse.json(
              { error: `Day ${day}: invalid suggestedType "${prompt.suggestedType}". Must be one of: ${validTypes.join(', ')}` },
              { status: 400 }
            );
          }
          if (typeof prompt.xpBonus !== 'number' || prompt.xpBonus < 1) {
            return NextResponse.json(
              { error: `Day ${day}: xpBonus must be a positive number` },
              { status: 400 }
            );
          }
        }
      }

      // Validate rotating prompts
      if (dailyPrompts.rotatingPrompts && Array.isArray(dailyPrompts.rotatingPrompts)) {
        for (let i = 0; i < dailyPrompts.rotatingPrompts.length; i++) {
          const prompt = dailyPrompts.rotatingPrompts[i];
          if (!prompt.text || typeof prompt.text !== 'string' || prompt.text.trim() === '') {
            return NextResponse.json(
              { error: `Rotating prompt ${i + 1}: text is required and must be non-empty` },
              { status: 400 }
            );
          }
          if (!validCategories.includes(prompt.category)) {
            return NextResponse.json(
              { error: `Rotating prompt ${i + 1}: invalid category "${prompt.category}"` },
              { status: 400 }
            );
          }
          if (!validTypes.includes(prompt.suggestedType)) {
            return NextResponse.json(
              { error: `Rotating prompt ${i + 1}: invalid suggestedType "${prompt.suggestedType}"` },
              { status: 400 }
            );
          }
          if (typeof prompt.xpBonus !== 'number' || prompt.xpBonus < 1) {
            return NextResponse.json(
              { error: `Rotating prompt ${i + 1}: xpBonus must be a positive number` },
              { status: 400 }
            );
          }
        }
      }

      const promptsRef = db.collection('config').doc('dailyPrompts');
      batch.set(promptsRef, {
        ...dailyPrompts,
        updatedAt: now,
        updatedBy: user.uid,
      }, { merge: true });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      updatedAt: now,
      updatedBy: user.uid,
    });
  } catch (error: any) {
    console.error('PUT /api/admin/engagement error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update engagement config' },
      { status: 500 }
    );
  }
}
