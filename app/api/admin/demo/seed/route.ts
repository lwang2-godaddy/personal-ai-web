import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore, getAdminAuth } from '@/lib/api/firebase/admin';
import {
  cleanupDemoData,
  createDemoUser,
  seedHealthData,
  seedLocationData,
  seedVoiceNotes,
  seedTextNotes,
  seedPhotos,
  waitForEmbeddings,
  triggerLifeFeed,
} from '@/lib/services/demo/demoOperations';
import type { DemoProgressEvent } from '@/lib/services/demo/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for full pipeline

export async function POST(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  let body: { skipPhotos?: boolean; skipLifeFeed?: boolean; skipWait?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // Use defaults
  }

  const { skipPhotos = true, skipLifeFeed = false, skipWait = false } = body;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: DemoProgressEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const db = getAdminFirestore();
        const auth = getAdminAuth();

        // Phase 0: Cleanup
        send({ phase: 0, phaseName: 'Cleanup', level: 'info', message: 'Starting full seed pipeline...' });
        await cleanupDemoData(db, send, auth);

        // Phase 1: Create user
        const uid = await createDemoUser(db, send, auth);

        // Phase 2-5: Seed data
        const healthCount = await seedHealthData(db, uid, send);
        const locationCount = await seedLocationData(db, uid, send);
        const voiceCount = await seedVoiceNotes(db, uid, send);
        const textCount = await seedTextNotes(db, uid, send);

        // Phase 6: Photos (skipped by default from web — no photos dir)
        let photoCount = 0;
        if (!skipPhotos) {
          send({ phase: 6, phaseName: 'Photos', level: 'info', message: 'Photo upload not available from web admin.' });
        } else {
          send({ phase: 6, phaseName: 'Photos', level: 'info', message: 'Photos skipped (no photos dir on server).' });
        }

        // Phase 7: Wait for embeddings
        if (!skipWait) {
          await waitForEmbeddings(db, uid, send);
        } else {
          send({ phase: 7, phaseName: 'Embeddings', level: 'info', message: 'Embedding wait skipped.' });
        }

        // Phase 8: Life feed
        if (!skipLifeFeed) {
          await triggerLifeFeed(uid, send, auth);
        } else {
          send({ phase: 8, phaseName: 'Life Feed', level: 'info', message: 'Life feed generation skipped.' });
        }

        // Phase 9: Done
        send({
          phase: 9,
          phaseName: 'Complete',
          level: 'success',
          message: `Seed complete! Health: ${healthCount}, Location: ${locationCount}, Voice: ${voiceCount}, Text: ${textCount}, Photos: ${photoCount}`,
        });
      } catch (error: any) {
        send({
          phase: -1,
          phaseName: 'Error',
          level: 'error',
          message: `Seed pipeline failed: ${error.message}`,
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
