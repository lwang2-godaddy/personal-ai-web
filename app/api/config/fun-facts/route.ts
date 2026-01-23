import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import InsightsFeatureService from '@/lib/services/config/InsightsFeatureService';
import { DEFAULT_FUN_FACTS_CONFIG } from '@/lib/models/InsightsFeatureConfig';

/**
 * GET /api/config/fun-facts
 * Public endpoint for mobile app to fetch fun facts configuration
 * Returns only the settings needed by the mobile app (not admin-only fields)
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication (but not admin)
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    const service = InsightsFeatureService.getInstance();
    const config = await service.getFunFactsConfig();

    // Return only the mobile-relevant settings
    return NextResponse.json({
      cache: {
        carouselTTLHours: config.cache?.carouselTTLHours ?? DEFAULT_FUN_FACTS_CONFIG.cache.carouselTTLHours,
        promptTTLMinutes: config.cache?.promptTTLMinutes ?? DEFAULT_FUN_FACTS_CONFIG.cache.promptTTLMinutes,
      },
      lookbackDays: {
        healthData: config.lookbackDays?.healthData ?? DEFAULT_FUN_FACTS_CONFIG.lookbackDays.healthData,
        activityData: config.lookbackDays?.activityData ?? DEFAULT_FUN_FACTS_CONFIG.lookbackDays.activityData,
        recentWindow: config.lookbackDays?.recentWindow ?? DEFAULT_FUN_FACTS_CONFIG.lookbackDays.recentWindow,
      },
      enabled: config.enabled ?? true,
      maxFactsPerDay: config.maxFactsPerDay ?? DEFAULT_FUN_FACTS_CONFIG.maxFactsPerDay,
    });
  } catch (error) {
    console.error('[API] Error fetching fun facts config:', error);

    // Return defaults on error
    return NextResponse.json({
      cache: {
        carouselTTLHours: DEFAULT_FUN_FACTS_CONFIG.cache.carouselTTLHours,
        promptTTLMinutes: DEFAULT_FUN_FACTS_CONFIG.cache.promptTTLMinutes,
      },
      lookbackDays: DEFAULT_FUN_FACTS_CONFIG.lookbackDays,
      enabled: true,
      maxFactsPerDay: DEFAULT_FUN_FACTS_CONFIG.maxFactsPerDay,
    });
  }
}
