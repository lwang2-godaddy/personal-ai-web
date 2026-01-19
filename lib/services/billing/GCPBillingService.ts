/**
 * GCP Billing Service
 * Fetches real billing data from Google Cloud Platform
 *
 * This service supports two modes:
 * 1. BigQuery Billing Export (recommended) - requires setup in GCP Console
 * 2. Estimation from Infrastructure Tracking (fallback)
 *
 * BigQuery Billing Export Setup:
 * 1. Enable billing export to BigQuery in GCP Console
 * 2. Set GOOGLE_CLOUD_BILLING_PROJECT_ID and GOOGLE_CLOUD_BILLING_DATASET
 * 3. Grant BigQuery Data Viewer role to your service account
 *
 * Documentation: https://cloud.google.com/billing/docs/how-to/export-data-bigquery
 */

import {
  GCPBillingData,
  createEmptyGCPBilling,
} from '@/lib/models/BillingData';
import { getBillingCacheService } from './BillingCacheService';

/**
 * Firebase service names in GCP billing
 */
const FIREBASE_SERVICE_MAPPING: Record<string, keyof GCPBillingData['byService']> = {
  'Cloud Firestore': 'firestore',
  'Firestore': 'firestore',
  'Cloud Storage': 'storage',
  'Firebase Storage': 'storage',
  'Cloud Functions': 'functions',
  'Cloud Run': 'functions',
  'Firebase Hosting': 'hosting',
  'Hosting': 'hosting',
};

/**
 * GCPBillingService Singleton
 */
class GCPBillingService {
  private static instance: GCPBillingService;
  private billingExportEnabled: boolean | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('GCPBillingService cannot be instantiated in the browser!');
    }
  }

  static getInstance(): GCPBillingService {
    if (!GCPBillingService.instance) {
      GCPBillingService.instance = new GCPBillingService();
    }
    return GCPBillingService.instance;
  }

  /**
   * Check if BigQuery billing export is configured
   */
  private isBillingExportConfigured(): boolean {
    return !!(
      process.env.GOOGLE_CLOUD_BILLING_PROJECT_ID &&
      process.env.GOOGLE_CLOUD_BILLING_DATASET
    );
  }

  /**
   * Fetch GCP billing data
   */
  async fetchBilling(
    startDate: string,
    endDate: string,
    useCache: boolean = true
  ): Promise<GCPBillingData> {
    const cacheService = getBillingCacheService();

    // Check cache first
    if (useCache) {
      const cached = await cacheService.get<GCPBillingData>('gcp', startDate, endDate);
      if (cached) {
        return {
          ...cached.data,
          dataSource: 'cached',
        };
      }
    }

    // Check if BigQuery billing export is configured
    if (this.isBillingExportConfigured()) {
      try {
        const result = await this.fetchFromBigQuery(startDate, endDate);
        await cacheService.set('gcp', startDate, endDate, result);
        return result;
      } catch (error) {
        console.error('[GCPBilling] BigQuery error:', error);
        // Fall back to estimation
      }
    }

    // Fall back to estimation from infrastructure tracking
    console.log('[GCPBilling] Using estimation from infrastructure tracking');
    return await this.estimateFromInfrastructure(startDate, endDate);
  }

  /**
   * Fetch billing data from BigQuery billing export
   */
  private async fetchFromBigQuery(startDate: string, endDate: string): Promise<GCPBillingData> {
    const projectId = process.env.GOOGLE_CLOUD_BILLING_PROJECT_ID;
    const dataset = process.env.GOOGLE_CLOUD_BILLING_DATASET;
    const table = process.env.GOOGLE_CLOUD_BILLING_TABLE || 'gcp_billing_export_v1_*';

    if (!projectId || !dataset) {
      throw new Error('BigQuery billing export not configured');
    }

    // Import BigQuery client dynamically (optional dependency)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let BigQuery: any;
    try {
      // Use dynamic import with variable to prevent static analysis
      const moduleName = '@google-cloud/bigquery';
      const bigqueryModule = await import(/* webpackIgnore: true */ moduleName);
      BigQuery = bigqueryModule.BigQuery;
    } catch {
      throw new Error(
        'BigQuery client not installed. Install @google-cloud/bigquery or use infrastructure estimates.'
      );
    }

    const bigquery = new BigQuery({ projectId });

    // Query billing data for Firebase-related services
    const query = `
      SELECT
        service.description AS service_name,
        DATE(usage_start_time) AS usage_date,
        SUM(cost) AS total_cost
      FROM \`${projectId}.${dataset}.${table}\`
      WHERE
        DATE(usage_start_time) >= DATE('${startDate}')
        AND DATE(usage_start_time) <= DATE('${endDate}')
        AND project.id = '${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}'
      GROUP BY service_name, usage_date
      ORDER BY usage_date, service_name
    `;

    console.log('[GCPBilling] Running BigQuery:', query);

    const [rows] = await bigquery.query({ query });

    // Process results
    const byService: GCPBillingData['byService'] = {
      firestore: 0,
      storage: 0,
      functions: 0,
      hosting: 0,
      other: 0,
    };
    const byDateMap: Map<string, number> = new Map();
    let totalCost = 0;

    for (const row of rows) {
      const serviceName = row.service_name as string;
      const cost = parseFloat(row.total_cost) || 0;
      const date = row.usage_date?.value || row.usage_date;

      totalCost += cost;

      // Map to service category
      const category = FIREBASE_SERVICE_MAPPING[serviceName] || 'other';
      byService[category] += cost;

      // Aggregate by date
      if (date) {
        const dateStr = typeof date === 'string' ? date : date.toString();
        byDateMap.set(dateStr, (byDateMap.get(dateStr) || 0) + cost);
      }
    }

    const byDate = Array.from(byDateMap.entries())
      .map(([date, costUSD]) => ({ date, costUSD }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalCostUSD: totalCost,
      byService,
      byDate,
      dataSource: 'api',
      fetchedAt: new Date().toISOString(),
      billingExportEnabled: true,
    };
  }

  /**
   * Estimate GCP costs from our infrastructure tracking
   * This is a fallback when BigQuery billing export is not available
   */
  private async estimateFromInfrastructure(
    startDate: string,
    endDate: string
  ): Promise<GCPBillingData> {
    try {
      const { getAdminFirestore } = await import('@/lib/api/firebase/admin');
      const db = getAdminFirestore();

      // Query infrastructureCosts collection
      const startTimestamp = new Date(startDate + 'T00:00:00.000Z').toISOString();
      const endTimestamp = new Date(endDate + 'T23:59:59.999Z').toISOString();

      const snapshot = await db
        .collection('infrastructureCosts')
        .where('timestamp', '>=', startTimestamp)
        .where('timestamp', '<=', endTimestamp)
        .get();

      const byService: GCPBillingData['byService'] = {
        firestore: 0,
        storage: 0,
        functions: 0,
        hosting: 0,
        other: 0,
      };
      const byDateMap: Map<string, number> = new Map();
      let totalCost = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const service = data.service as string;
        const cost = (data.estimatedCostUSD as number) || 0;
        const timestamp = data.timestamp as string;

        totalCost += cost;

        // Map service to category
        switch (service) {
          case 'firestore':
            byService.firestore += cost;
            break;
          case 'storage':
            byService.storage += cost;
            break;
          case 'functions':
            byService.functions += cost;
            break;
          default:
            byService.other += cost;
        }

        // Aggregate by date
        const date = timestamp.split('T')[0];
        byDateMap.set(date, (byDateMap.get(date) || 0) + cost);
      });

      const byDate = Array.from(byDateMap.entries())
        .map(([date, costUSD]) => ({ date, costUSD }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalCostUSD: totalCost,
        byService,
        byDate,
        dataSource: 'unavailable',
        fetchedAt: new Date().toISOString(),
        billingExportEnabled: false,
        error: 'BigQuery billing export not configured. Showing estimates from infrastructure tracking.',
      };
    } catch (error) {
      console.error('[GCPBilling] Error estimating from infrastructure:', error);
      return {
        ...createEmptyGCPBilling(),
        error: error instanceof Error ? error.message : 'Failed to estimate GCP costs',
      };
    }
  }

  /**
   * Check if billing export is enabled
   */
  async checkBillingExportEnabled(): Promise<boolean> {
    if (this.billingExportEnabled !== null) {
      return this.billingExportEnabled;
    }

    if (!this.isBillingExportConfigured()) {
      this.billingExportEnabled = false;
      return false;
    }

    try {
      // Import BigQuery client dynamically (optional dependency)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let BigQuery: any;
      try {
        // Use dynamic import with variable to prevent static analysis
        const moduleName = '@google-cloud/bigquery';
        const bigqueryModule = await import(/* webpackIgnore: true */ moduleName);
        BigQuery = bigqueryModule.BigQuery;
      } catch {
        console.warn('[GCPBilling] BigQuery client not installed');
        this.billingExportEnabled = false;
        return false;
      }

      const projectId = process.env.GOOGLE_CLOUD_BILLING_PROJECT_ID;
      const dataset = process.env.GOOGLE_CLOUD_BILLING_DATASET;

      const bigquery = new BigQuery({ projectId });
      const [tables] = await bigquery.dataset(dataset!).getTables();

      this.billingExportEnabled = tables.length > 0;
      return this.billingExportEnabled;
    } catch (err) {
      console.warn('[GCPBilling] Error checking billing export:', err);
      this.billingExportEnabled = false;
      return false;
    }
  }
}

// Export singleton getter
export function getGCPBillingService(): GCPBillingService {
  return GCPBillingService.getInstance();
}

export { GCPBillingService };
