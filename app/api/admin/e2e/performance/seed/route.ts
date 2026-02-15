import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { seedPerformanceData } from '@/lib/services/e2e/perfOperations';
import type { DemoProgressEvent } from '@/lib/services/demo/types';
import type { PerfSeedConfig } from '@/lib/services/e2e/perfData';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const { response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  // Parse optional config from body
  let config: Partial<PerfSeedConfig> = {};
  try {
    const body = await request.json();
    if (body.days) config.days = body.days;
    if (body.metricsPerUserPerDay) config.metricsPerUserPerDay = body.metricsPerUserPerDay;
  } catch {
    // No body or invalid JSON — use defaults
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: DemoProgressEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const db = getAdminFirestore();

        send({ phase: 0, phaseName: 'Starting', level: 'info', message: 'Starting performance data seed...' });
        await seedPerformanceData(db, send, config.days || config.metricsPerUserPerDay ? { days: config.days ?? 7, metricsPerUserPerDay: config.metricsPerUserPerDay ?? 30 } : undefined);
      } catch (error: any) {
        send({
          phase: -1,
          phaseName: 'Error',
          level: 'error',
          message: `Performance seed failed: ${error.message}`,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
