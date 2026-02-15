/**
 * Admin Memory Builder Analytics API
 *
 * GET /api/admin/memory-builder/analytics - Get extraction and vocabulary analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { memoryBuilderConfigService } from '@/lib/services/config/MemoryBuilderConfigService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/memory-builder/analytics
 * Returns extraction analytics and vocabulary integration stats
 */
export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const [extractionAnalytics, vocabularyAnalytics] = await Promise.all([
      memoryBuilderConfigService.getExtractionAnalytics(),
      memoryBuilderConfigService.getVocabularyIntegrationAnalytics(),
    ]);

    return NextResponse.json({
      extraction: extractionAnalytics,
      vocabulary: vocabularyAnalytics,
    });
  } catch (error: any) {
    console.error('[Admin Memory Builder Analytics API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get analytics' },
      { status: 500 }
    );
  }
}
