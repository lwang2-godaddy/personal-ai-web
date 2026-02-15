import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import type {
  AggregatedInfrastructureCosts,
  InfrastructureCostTotals,
  InfrastructureCostResponse,
} from '@/lib/models/InfrastructureCost';

/**
 * GET /api/admin/infrastructure
 * Get aggregated infrastructure costs across all services
 *
 * Queries infrastructureCosts collection and aggregates by service
 *
 * Query params:
 * - startDate: string (ISO date, default: 30 days ago)
 * - endDate: string (ISO date, default: today)
 *
 * Returns:
 * - infrastructure: AggregatedInfrastructureCosts (by service)
 * - totals: InfrastructureCostTotals (grand totals)
 * - startDate, endDate
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);

    // Default date range: last 30 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const startDateStr = searchParams.get('startDate') || startDate.toISOString().split('T')[0];
    const endDateStr = searchParams.get('endDate') || endDate.toISOString().split('T')[0];

    // Create ISO timestamps for Firestore query
    const startTimestamp = new Date(startDateStr + 'T00:00:00.000Z').toISOString();
    const endTimestamp = new Date(endDateStr + 'T23:59:59.999Z').toISOString();

    const db = getAdminFirestore();

    console.log('[Admin Infrastructure API] Querying infrastructureCosts collection...');
    console.log('[Admin Infrastructure API] Date range:', { startTimestamp, endTimestamp });

    // Query infrastructureCosts collection
    const costsSnapshot = await db
      .collection('infrastructureCosts')
      .where('timestamp', '>=', startTimestamp)
      .where('timestamp', '<=', endTimestamp)
      .orderBy('timestamp', 'asc')
      .get();

    console.log(`[Admin Infrastructure API] Found ${costsSnapshot.size} cost events`);

    // Initialize aggregated costs
    const aggregated: AggregatedInfrastructureCosts = {
      firestore: { reads: 0, writes: 0, deletes: 0, cost: 0 },
      storage: { uploadBytes: 0, downloadBytes: 0, storageGB: 0, cost: 0 },
      functions: { invocations: 0, gbSeconds: 0, cost: 0 },
      pinecone: { storageGB: 0, vectors: 0, cost: 0 },
    };

    // Track latest Pinecone snapshot for storage metrics
    let latestPineconeTimestamp: string | null = null;
    let latestPineconeStorageGB = 0;
    let latestPineconeVectors = 0;
    let latestPineconeQuantity = 0;

    for (const doc of costsSnapshot.docs) {
      const data = doc.data();
      const service = data.service as string;
      const operation = data.operation as string;
      const quantity = (data.quantity as number) || 0;
      const cost = (data.estimatedCostUSD as number) || 0;
      const metadata = data.metadata || {};

      switch (service) {
        case 'firestore':
          aggregated.firestore.cost += cost;
          if (operation === 'read') {
            aggregated.firestore.reads += quantity;
          } else if (operation === 'write') {
            aggregated.firestore.writes += quantity;
          } else if (operation === 'delete') {
            aggregated.firestore.deletes += quantity;
          }
          break;

        case 'storage':
          aggregated.storage.cost += cost;
          if (operation === 'upload') {
            aggregated.storage.uploadBytes += quantity;
          } else if (operation === 'download') {
            aggregated.storage.downloadBytes += quantity;
          } else if (operation === 'storage_snapshot') {
            aggregated.storage.storageGB = quantity; // Use latest snapshot value
          }
          break;

        case 'functions':
          aggregated.functions.cost += cost;
          aggregated.functions.invocations += quantity;
          if (metadata.gbSeconds) {
            aggregated.functions.gbSeconds += metadata.gbSeconds;
          }
          break;

        case 'pinecone_storage':
          // Use the latest snapshot for storage metrics
          if (!latestPineconeTimestamp || data.timestamp > latestPineconeTimestamp) {
            latestPineconeTimestamp = data.timestamp;
            latestPineconeStorageGB = metadata.totalStorageGB || quantity || 0;
            latestPineconeVectors = metadata.totalVectorCount || 0;
            latestPineconeQuantity = quantity;
          }
          // Accumulate daily costs
          aggregated.pinecone.cost += cost;
          break;
      }
    }

    // Apply latest Pinecone snapshot values
    if (latestPineconeTimestamp) {
      aggregated.pinecone.storageGB = latestPineconeStorageGB || latestPineconeQuantity;
      aggregated.pinecone.vectors = latestPineconeVectors;
    }

    // Calculate totals
    const totals: InfrastructureCostTotals = {
      firestore: Number(aggregated.firestore.cost.toFixed(6)),
      storage: Number(aggregated.storage.cost.toFixed(6)),
      functions: Number(aggregated.functions.cost.toFixed(6)),
      pinecone: Number(aggregated.pinecone.cost.toFixed(6)),
      grandTotal: Number(
        (
          aggregated.firestore.cost +
          aggregated.storage.cost +
          aggregated.functions.cost +
          aggregated.pinecone.cost
        ).toFixed(6)
      ),
    };

    // Round all cost values in aggregated
    const roundedAggregated: AggregatedInfrastructureCosts = {
      firestore: {
        ...aggregated.firestore,
        cost: Number(aggregated.firestore.cost.toFixed(6)),
      },
      storage: {
        ...aggregated.storage,
        storageGB: Number(aggregated.storage.storageGB.toFixed(4)),
        cost: Number(aggregated.storage.cost.toFixed(6)),
      },
      functions: {
        ...aggregated.functions,
        gbSeconds: Number(aggregated.functions.gbSeconds.toFixed(4)),
        cost: Number(aggregated.functions.cost.toFixed(6)),
      },
      pinecone: {
        storageGB: Number(aggregated.pinecone.storageGB.toFixed(4)),
        vectors: aggregated.pinecone.vectors,
        cost: Number(aggregated.pinecone.cost.toFixed(6)),
      },
    };

    const response: InfrastructureCostResponse = {
      infrastructure: roundedAggregated,
      totals,
      startDate: startDateStr,
      endDate: endDateStr,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Admin Infrastructure API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch infrastructure costs' },
      { status: 500 }
    );
  }
}
