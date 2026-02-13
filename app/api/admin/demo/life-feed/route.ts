import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore, getAdminAuth } from '@/lib/api/firebase/admin';
import { triggerLifeFeed, getDemoStatus } from '@/lib/services/demo/demoOperations';
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
        // Get demo user UID
        const db = getAdminFirestore();
        const auth = getAdminAuth();
        const status = await getDemoStatus(db, auth);

        if (!status.exists || !status.uid) {
          send({
            phase: 8,
            phaseName: 'Life Feed',
            level: 'error',
            message: 'No demo account found. Seed data first.',
          });
          controller.close();
          return;
        }

        await triggerLifeFeed(status.uid, send, auth);
      } catch (error: any) {
        send({
          phase: 8,
          phaseName: 'Life Feed',
          level: 'error',
          message: `Life feed trigger failed: ${error.message}`,
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
