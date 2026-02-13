import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore, getAdminAuth } from '@/lib/api/firebase/admin';
import { cleanupDemoData } from '@/lib/services/demo/demoOperations';
import type { DemoProgressEvent } from '@/lib/services/demo/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: DemoProgressEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const db = getAdminFirestore();
        const auth = getAdminAuth();
        const result = await cleanupDemoData(db, send, auth);

        send({
          phase: 0,
          phaseName: 'Cleanup',
          level: 'success',
          message: result.deletedUid
            ? `Cleanup complete. Deleted user: ${result.deletedUid}`
            : 'No demo account found to clean up.',
        });
      } catch (error: any) {
        send({
          phase: 0,
          phaseName: 'Cleanup',
          level: 'error',
          message: `Cleanup failed: ${error.message}`,
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
