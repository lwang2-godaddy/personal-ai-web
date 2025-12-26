import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

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
    let usersQuery = db.collection('users');

    // Apply search filter if provided
    if (search && search.trim().length > 0) {
      // Firestore doesn't support case-insensitive search or LIKE queries
      // So we'll fetch all and filter in memory (not ideal for large datasets)
      // Alternative: Use Algolia or similar search service
      const allUsersSnapshot = await usersQuery.get();
      const searchLower = search.toLowerCase();

      const filteredUsers = allUsersSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((userData: any) => {
          const email = (userData.email || '').toLowerCase();
          const displayName = (userData.displayName || '').toLowerCase();
          return email.includes(searchLower) || displayName.includes(searchLower);
        });

      const total = filteredUsers.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const paginatedUsers = filteredUsers.slice(startIndex, startIndex + limit);

      return NextResponse.json({
        users: paginatedUsers,
        total,
        page,
        limit,
        totalPages,
      });
    }

    // No search - use pagination
    const totalSnapshot = await usersQuery.get();
    const total = totalSnapshot.size;
    const totalPages = Math.ceil(total / limit);

    // Get paginated results
    const offset = (page - 1) * limit;
    const usersSnapshot = await usersQuery
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();

    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

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
