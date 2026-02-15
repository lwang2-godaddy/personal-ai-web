/**
 * Admin Memory Builder Entity Types API
 *
 * GET /api/admin/memory-builder/entity-types - Get entity type configurations
 * PUT /api/admin/memory-builder/entity-types - Update entity type configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { memoryBuilderConfigService } from '@/lib/services/config/MemoryBuilderConfigService';
import { ExtractedEntityType, ENTITY_TYPE_METADATA } from '@/lib/models/MemoryBuilderConfig';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/memory-builder/entity-types
 * Returns all entity type configurations with metadata
 */
export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const entityTypes = await memoryBuilderConfigService.getEntityTypesConfig();

    // Merge config with metadata for rich response
    const enrichedEntityTypes = Object.entries(entityTypes).map(([type, config]) => ({
      type: type as ExtractedEntityType,
      ...config,
      metadata: ENTITY_TYPE_METADATA[type as ExtractedEntityType],
    }));

    return NextResponse.json({
      entityTypes: enrichedEntityTypes,
      metadata: ENTITY_TYPE_METADATA,
    });
  } catch (error: any) {
    console.error('[Admin Entity Types API] Error getting config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get entity types configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/memory-builder/entity-types
 * Update entity type configurations
 *
 * Body options:
 * - Toggle entity type: { entityType: string, enabled: boolean }
 * - Update entity type: { entityType: string, updates: Partial<EntityTypeConfig> }
 * - Bulk update: { updates: Record<ExtractedEntityType, Partial<EntityTypeConfig>> }
 */
export async function PUT(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const adminId = user.uid;

    // Handle toggle
    if (body.entityType && body.enabled !== undefined && !body.updates) {
      await memoryBuilderConfigService.updateEntityType(
        body.entityType as ExtractedEntityType,
        { enabled: body.enabled },
        adminId
      );
      const entityTypes = await memoryBuilderConfigService.getEntityTypesConfig();
      return NextResponse.json({ success: true, entityTypes });
    }

    // Handle single entity type update
    if (body.entityType && body.updates) {
      await memoryBuilderConfigService.updateEntityType(
        body.entityType as ExtractedEntityType,
        body.updates,
        adminId
      );
      const entityTypes = await memoryBuilderConfigService.getEntityTypesConfig();
      return NextResponse.json({ success: true, entityTypes });
    }

    // Handle bulk update
    if (body.updates && typeof body.updates === 'object' && !body.entityType) {
      await memoryBuilderConfigService.updateEntityTypes(body.updates, adminId);
      const entityTypes = await memoryBuilderConfigService.getEntityTypesConfig();
      return NextResponse.json({ success: true, entityTypes });
    }

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Admin Entity Types API] Error updating config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update entity types configuration' },
      { status: 500 }
    );
  }
}
