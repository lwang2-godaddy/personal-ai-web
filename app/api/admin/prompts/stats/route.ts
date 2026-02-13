import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { getSamplingRate } from '@/lib/config/samplingRates';

interface ServiceStats {
  service: string;
  totalCost: number;
  executionCount: number;
  avgCostPerExecution: number;
}

interface StatsResponse {
  services: ServiceStats[];
  period: {
    startDate: string;
    endDate: string;
  };
  totals: {
    totalCost: number;
    totalExecutions: number;
  };
}

/**
 * GET /api/admin/prompts/stats
 * Get aggregated cost data for all services
 *
 * Query params:
 * - days: number (optional, default 30)
 *
 * Returns:
 * - services: ServiceStats[]
 * - period: { startDate, endDate }
 * - totals: { totalCost, totalExecutions }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const db = getAdminFirestore();

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Query all executions in the date range
    const snapshot = await db
      .collection('promptExecutions')
      .where('executedAt', '>=', startDate.toISOString())
      .where('executedAt', '<=', endDate.toISOString())
      .get();

    // Aggregate by service (with sampling rate adjustment)
    const serviceMap = new Map<string, { totalCost: number; executionCount: number }>();

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const service = data.service as string;
      const rawCost = (data.estimatedCostUSD as number) || 0;
      const docSamplingRate = data.samplingRate as number | undefined;

      // Get sampling rate and apply multiplier
      const samplingRate = getSamplingRate(service, docSamplingRate);
      const cost = rawCost * samplingRate;
      const callCount = samplingRate;

      if (!serviceMap.has(service)) {
        serviceMap.set(service, { totalCost: 0, executionCount: 0 });
      }

      const stats = serviceMap.get(service)!;
      stats.totalCost += cost;
      stats.executionCount += callCount;
    });

    // Convert to array and calculate averages
    const services: ServiceStats[] = Array.from(serviceMap.entries()).map(
      ([service, stats]) => ({
        service,
        totalCost: parseFloat(stats.totalCost.toFixed(6)),
        executionCount: stats.executionCount,
        avgCostPerExecution:
          stats.executionCount > 0
            ? parseFloat((stats.totalCost / stats.executionCount).toFixed(6))
            : 0,
      })
    );

    // Sort by total cost (highest first)
    services.sort((a, b) => b.totalCost - a.totalCost);

    // Calculate totals
    const totalCost = services.reduce((sum, s) => sum + s.totalCost, 0);
    const totalExecutions = services.reduce((sum, s) => sum + s.executionCount, 0);

    const response: StatsResponse = {
      services,
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      totals: {
        totalCost: parseFloat(totalCost.toFixed(6)),
        totalExecutions,
      },
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('[Admin Prompts Stats API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
