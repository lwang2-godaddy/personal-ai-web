import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore, getAdminAuth } from '@/lib/api/firebase/admin';
import { getDemoStatus, checkEmbeddings } from '@/lib/services/demo/demoOperations';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const db = getAdminFirestore();
    const auth = getAdminAuth();
    const status = await getDemoStatus(db, auth);

    if (!status.exists || !status.uid) {
      return NextResponse.json(
        { error: 'No demo account found.' },
        { status: 404 }
      );
    }

    const result = await checkEmbeddings(db, status.uid);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Demo Embeddings] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check embeddings' },
      { status: 500 }
    );
  }
}
