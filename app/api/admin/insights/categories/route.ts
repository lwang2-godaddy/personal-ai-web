/**
 * Category Management API Route
 *
 * Endpoints for managing Life Feed category configuration
 * All endpoints require admin authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import CategoryConfigService from '@/lib/services/config/CategoryConfigService';
import { CategoryConfig } from '@/lib/models/CategoryConfig';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/insights/categories
 * Get all categories configuration
 */
export async function GET(request: NextRequest) {
  // Verify admin authentication
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const config = await CategoryConfigService.getCategoriesConfig();

    // Sort categories by priority for consistent display
    const sortedCategories = Object.values(config.categories).sort(
      (a, b) => b.priority - a.priority
    );

    return NextResponse.json({
      success: true,
      data: {
        version: config.version,
        lastUpdatedAt: config.lastUpdatedAt,
        lastUpdatedBy: config.lastUpdatedBy,
        categories: sortedCategories,
        totalCount: sortedCategories.length,
        enabledCount: sortedCategories.filter((c) => c.enabled).length,
      },
    });
  } catch (error: any) {
    console.error('[Categories API] GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/insights/categories
 * Create a new category
 */
export async function POST(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const { category } = body as { category: Partial<CategoryConfig> };

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category data is required' },
        { status: 400 }
      );
    }

    const result = await CategoryConfigService.createCategory(
      category,
      user.email || user.uid
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.category,
    });
  } catch (error: any) {
    console.error('[Categories API] POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create category' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/insights/categories
 * Update an existing category
 */
export async function PUT(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const { categoryId, updates } = body as {
      categoryId: string;
      updates: Partial<CategoryConfig>;
    };

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      );
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Updates are required' },
        { status: 400 }
      );
    }

    const result = await CategoryConfigService.updateCategory(
      categoryId,
      updates,
      user.email || user.uid
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.errors },
        { status: 400 }
      );
    }

    // Fetch updated category to return
    const updatedCategory = await CategoryConfigService.getCategory(categoryId);

    return NextResponse.json({
      success: true,
      data: updatedCategory,
    });
  } catch (error: any) {
    console.error('[Categories API] PUT error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update category' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/insights/categories
 * Delete a custom category (preset categories cannot be deleted)
 */
export async function DELETE(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      );
    }

    const result = await CategoryConfigService.deleteCategory(
      categoryId,
      user.email || user.uid
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Categories API] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete category' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/insights/categories
 * Special operations: toggle, reset, seed
 */
export async function PATCH(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const { action, categoryId, enabled, priority } = body as {
      action: 'toggle' | 'reset' | 'seed' | 'updatePriority';
      categoryId?: string;
      enabled?: boolean;
      priority?: number;
    };

    const userIdentifier = user.email || user.uid;

    switch (action) {
      case 'toggle': {
        if (!categoryId || enabled === undefined) {
          return NextResponse.json(
            { success: false, error: 'categoryId and enabled are required for toggle' },
            { status: 400 }
          );
        }
        const result = await CategoryConfigService.toggleCategoryEnabled(
          categoryId,
          enabled,
          userIdentifier
        );
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 }
          );
        }
        return NextResponse.json({ success: true });
      }

      case 'reset': {
        if (!categoryId) {
          return NextResponse.json(
            { success: false, error: 'categoryId is required for reset' },
            { status: 400 }
          );
        }
        const result = await CategoryConfigService.resetCategoryToDefault(
          categoryId,
          userIdentifier
        );
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 }
          );
        }
        return NextResponse.json({ success: true });
      }

      case 'seed': {
        const result = await CategoryConfigService.seedDefaultCategories(userIdentifier);
        return NextResponse.json({
          success: true,
          created: result.created,
          message: result.created ? 'Default categories seeded' : 'Categories already exist',
        });
      }

      case 'updatePriority': {
        if (!categoryId || priority === undefined) {
          return NextResponse.json(
            { success: false, error: 'categoryId and priority are required' },
            { status: 400 }
          );
        }
        const result = await CategoryConfigService.updateCategoryPriority(
          categoryId,
          priority,
          userIdentifier
        );
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 }
          );
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[Categories API] PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to perform action' },
      { status: 500 }
    );
  }
}
