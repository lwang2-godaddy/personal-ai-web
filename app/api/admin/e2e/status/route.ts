import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore, getAdminAuth } from '@/lib/api/firebase/admin';
import { getE2EStatus } from '@/lib/services/e2e/e2eOperations';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const db = getAdminFirestore();
    const auth = getAdminAuth();
    const status = await getE2EStatus(db, auth);
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to get E2E status: ${error.message}` },
      { status: 500 },
    );
  }
}
