import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

// Cache for user count (refreshed every 5 minutes)
let cachedUserCount: { count: number; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/admin/users
 * List all users with pagination and search
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 100)
 * - search: string (search by email)
 *
 * Returns:
 * - users: User[]
 * - total: number
 * - page: number
 * - limit: number
 * - totalPages: number
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const search = searchParams.get('search') || '';

    const db = getAdminFirestore();
    const usersCollection = db.collection('users');

    // Apply search filter if provided
    if (search && search.trim().length > 0) {
      // Use Firestore prefix search for email (more efficient than fetching all)
      const searchLower = search.toLowerCase();

      // Try email prefix search first (works for exact prefix matches)
      let usersSnapshot = await usersCollection
        .where('email', '>=', searchLower)
        .where('email', '<=', searchLower + '\uf8ff')
        .orderBy('email')
        .limit(limit)
        .get();

      let users = usersSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          subscription: typeof data.subscription === 'object' && data.subscription?.tier
            ? data.subscription.tier
            : data.subscription || 'free',
          currentMonthCost: 0, // Skip cost calculation for search results (too slow)
        };
      });

      // If no results from email prefix, try displayName prefix
      if (users.length === 0) {
        usersSnapshot = await usersCollection
          .where('displayName', '>=', search)
          .where('displayName', '<=', search + '\uf8ff')
          .orderBy('displayName')
          .limit(limit)
          .get();

        users = usersSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            subscription: typeof data.subscription === 'object' && data.subscription?.tier
              ? data.subscription.tier
              : data.subscription || 'free',
            currentMonthCost: 0,
          };
        });
      }

      return NextResponse.json({
        users,
        total: users.length,
        page: 1,
        limit,
        totalPages: 1,
      });
    }

    // No search - use efficient pagination
    // Get cached total count or refresh if stale
    let total: number;
    const now = Date.now();
    if (cachedUserCount && (now - cachedUserCount.timestamp) < CACHE_TTL_MS) {
      total = cachedUserCount.count;
    } else {
      // Use count() aggregation (much faster than fetching all docs)
      const countSnapshot = await usersCollection.count().get();
      total = countSnapshot.data().count;
      cachedUserCount = { count: total, timestamp: now };
    }

    const totalPages = Math.ceil(total / limit);

    // Get paginated results
    const offset = (page - 1) * limit;
    const usersSnapshot = await usersCollection
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();

    const users = usersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        subscription: typeof data.subscription === 'object' && data.subscription?.tier
          ? data.subscription.tier
          : data.subscription || 'free',
        // Get cost from pre-aggregated field if available, otherwise 0
        currentMonthCost: data.currentMonthCost || 0,
      };
    });

    return NextResponse.json({
      users,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error: any) {
    console.error('[Admin Users API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
