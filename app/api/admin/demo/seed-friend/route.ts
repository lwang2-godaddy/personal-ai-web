import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore, getAdminAuth } from '@/lib/api/firebase/admin';
import {
  getDemoStatus,
  createDemoFriend,
  seedFriendship,
  seedFriendPosts,
  seedSocialEngagement,
} from '@/lib/services/demo/demoOperations';
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
        const status = await getDemoStatus(db, auth);

        if (!status.exists || !status.uid) {
          send({
            phase: 13,
            phaseName: 'Create Friend',
            level: 'error',
            message: 'No demo account (Alex) found. Run Full Reset & Seed first.',
          });
          controller.close();
          return;
        }

        if (status.friendExists) {
          send({
            phase: 13,
            phaseName: 'Create Friend',
            level: 'warning',
            message: `Friend already exists (${status.friendDisplayName}). Use Full Reset & Seed to recreate, or clean up first.`,
          });
          controller.close();
          return;
        }

        const alexUid = status.uid;

        // Phase 13: Create friend user
        const friendUid = await createDemoFriend(db, send, auth);

        // Phase 14: Seed friendship + circles
        await seedFriendship(db, alexUid, friendUid, send);

        // Phase 15: Seed friend's life feed posts
        const friendPostCount = await seedFriendPosts(db, alexUid, friendUid, send);

        // Phase 16: Seed social engagement
        await seedSocialEngagement(db, alexUid, friendUid, send);

        send({
          phase: 12,
          phaseName: 'Complete',
          level: 'success',
          message: `Friend seeding complete! Created Sarah Johnson with ${friendPostCount} posts, friendship, circles, and social engagement.`,
        });
      } catch (error: any) {
        send({
          phase: -1,
          phaseName: 'Error',
          level: 'error',
          message: `Friend seeding failed: ${error.message}`,
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
