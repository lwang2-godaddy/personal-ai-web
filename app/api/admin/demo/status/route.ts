import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore, getAdminAuth } from '@/lib/api/firebase/admin';
import { getDemoStatus } from '@/lib/services/demo/demoOperations';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const db = getAdminFirestore();
    const auth = getAdminAuth();
    const status = await getDemoStatus(db, auth);
    return NextResponse.json(status);
  } catch (error: any) {
    console.error('[Demo Status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get demo status' },
      { status: 500 }
    );
  }
}
