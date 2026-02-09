/**
 * MemoryBuilderConfigService - Firestore CRUD operations for Memory Builder configuration
 *
 * Manages the admin-configurable Memory Builder settings stored in Firestore:
 * - config/memoryBuilderSettings - Main configuration
 *
 * Features:
 * - Entity type configuration (9 types)
 * - Extraction settings (model, temperature, etc.)
 * - Vocabulary integration settings
 * - Analytics tracking
 */

import { getAdminFirestore } from '@/lib/api/firebase/admin';
import {
  MemoryBuilderConfig,
  EntityTypeConfig,
  ExtractionConfig,
  VocabularyIntegrationConfig,
  AnalyticsConfig,
  ExtractedEntityType,
  ExtractionAnalytics,
  VocabularyIntegrationAnalytics,
  DEFAULT_MEMORY_BUILDER_CONFIG,
  DEFAULT_ENTITY_TYPE_CONFIG,
  ENTITY_TYPES,
} from '@/lib/models/MemoryBuilderConfig';

const CONFIG_COLLECTION = 'config';
const DOC_MEMORY_BUILDER = 'memoryBuilderSettings';

/**
 * Get the admin Firestore instance
 */
function getFirestore() {
  return getAdminFirestore();
}

/**
 * MemoryBuilderConfigService - Singleton for managing Memory Builder configuration
 */
class MemoryBuilderConfigService {
  private static instance: MemoryBuilderConfigService;

  private constructor() {}

  static getInstance(): MemoryBuilderConfigService {
    if (!MemoryBuilderConfigService.instance) {
      MemoryBuilderConfigService.instance = new MemoryBuilderConfigService();
    }
    return MemoryBuilderConfigService.instance;
  }

  // ==========================================================================
  // Main Configuration
  // ==========================================================================

  /**
   * Get the current Memory Builder configuration
   */
  async getConfig(): Promise<MemoryBuilderConfig> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_MEMORY_BUILDER);
    const doc = await docRef.get();

    if (!doc.exists) {
      // Create default config if it doesn't exist
      await this.saveConfig(DEFAULT_MEMORY_BUILDER_CONFIG);
      return DEFAULT_MEMORY_BUILDER_CONFIG;
    }

    const storedConfig = doc.data() as MemoryBuilderConfig;

    // Merge stored config with defaults to include any new entity types
    const mergedEntityTypes: Record<ExtractedEntityType, EntityTypeConfig> = {
      ...DEFAULT_MEMORY_BUILDER_CONFIG.entityTypes,
    };

    // Overlay stored entity type configs
    ENTITY_TYPES.forEach((entityType) => {
      if (storedConfig.entityTypes?.[entityType]) {
        mergedEntityTypes[entityType] = {
          ...DEFAULT_ENTITY_TYPE_CONFIG,
          ...storedConfig.entityTypes[entityType],
        };
      }
    });

    return {
      ...DEFAULT_MEMORY_BUILDER_CONFIG,
      ...storedConfig,
      entityTypes: mergedEntityTypes,
    };
  }

  /**
   * Save the entire Memory Builder configuration
   */
  async saveConfig(config: MemoryBuilderConfig, updatedBy: string = 'admin'): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_MEMORY_BUILDER);

    const updatedConfig: MemoryBuilderConfig = {
      ...config,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    };

    await docRef.set(updatedConfig);
  }

  /**
   * Toggle the global enabled state
   */
  async toggleEnabled(enabled: boolean, updatedBy: string = 'admin'): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_MEMORY_BUILDER);

    await docRef.update({
      enabled,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    });
  }

  // ==========================================================================
  // Entity Type Configuration
  // ==========================================================================

  /**
   * Get all entity type configurations
   */
  async getEntityTypesConfig(): Promise<Record<ExtractedEntityType, EntityTypeConfig>> {
    const config = await this.getConfig();
    return config.entityTypes;
  }

  /**
   * Update a specific entity type configuration
   */
  async updateEntityType(
    entityType: ExtractedEntityType,
    updates: Partial<EntityTypeConfig>,
    updatedBy: string = 'admin'
  ): Promise<void> {
    const config = await this.getConfig();
    const currentTypeConfig = config.entityTypes[entityType] || DEFAULT_ENTITY_TYPE_CONFIG;

    const updatedEntityTypes = {
      ...config.entityTypes,
      [entityType]: {
        ...currentTypeConfig,
        ...updates,
      },
    };

    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_MEMORY_BUILDER);

    await docRef.update({
      entityTypes: updatedEntityTypes,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    });
  }

  /**
   * Toggle an entity type's enabled state
   */
  async toggleEntityType(entityType: ExtractedEntityType, updatedBy: string = 'admin'): Promise<boolean> {
    const config = await this.getConfig();
    const currentTypeConfig = config.entityTypes[entityType] || DEFAULT_ENTITY_TYPE_CONFIG;
    const newEnabled = !currentTypeConfig.enabled;

    await this.updateEntityType(entityType, { enabled: newEnabled }, updatedBy);
    return newEnabled;
  }

  /**
   * Bulk update entity type configurations
   */
  async updateEntityTypes(
    updates: Record<ExtractedEntityType, Partial<EntityTypeConfig>>,
    updatedBy: string = 'admin'
  ): Promise<void> {
    const config = await this.getConfig();
    const updatedEntityTypes = { ...config.entityTypes };

    Object.entries(updates).forEach(([entityType, typeUpdates]) => {
      const type = entityType as ExtractedEntityType;
      updatedEntityTypes[type] = {
        ...config.entityTypes[type],
        ...typeUpdates,
      };
    });

    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_MEMORY_BUILDER);

    await docRef.update({
      entityTypes: updatedEntityTypes,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    });
  }

  // ==========================================================================
  // Extraction Settings
  // ==========================================================================

  /**
   * Get extraction configuration
   */
  async getExtractionConfig(): Promise<ExtractionConfig> {
    const config = await this.getConfig();
    return config.extraction;
  }

  /**
   * Update extraction configuration
   */
  async updateExtractionConfig(
    updates: Partial<ExtractionConfig>,
    updatedBy: string = 'admin'
  ): Promise<void> {
    const config = await this.getConfig();

    const updatedExtraction = {
      ...config.extraction,
      ...updates,
    };

    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_MEMORY_BUILDER);

    await docRef.update({
      extraction: updatedExtraction,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    });
  }

  // ==========================================================================
  // Vocabulary Integration Settings
  // ==========================================================================

  /**
   * Get vocabulary integration configuration
   */
  async getVocabularyIntegrationConfig(): Promise<VocabularyIntegrationConfig> {
    const config = await this.getConfig();
    return config.vocabularyIntegration;
  }

  /**
   * Update vocabulary integration configuration
   */
  async updateVocabularyIntegrationConfig(
    updates: Partial<VocabularyIntegrationConfig>,
    updatedBy: string = 'admin'
  ): Promise<void> {
    const config = await this.getConfig();

    const updatedVocabIntegration = {
      ...config.vocabularyIntegration,
      ...updates,
    };

    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_MEMORY_BUILDER);

    await docRef.update({
      vocabularyIntegration: updatedVocabIntegration,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    });
  }

  /**
   * Toggle auto-learn vocabulary
   */
  async toggleAutoLearn(updatedBy: string = 'admin'): Promise<boolean> {
    const config = await this.getConfig();
    const newEnabled = !config.vocabularyIntegration.autoLearnEnabled;

    await this.updateVocabularyIntegrationConfig({ autoLearnEnabled: newEnabled }, updatedBy);
    return newEnabled;
  }

  // ==========================================================================
  // Analytics
  // ==========================================================================

  /**
   * Get extraction analytics
   */
  async getExtractionAnalytics(): Promise<ExtractionAnalytics> {
    const db = getFirestore();

    // Get total extraction count from memories collection
    const memoriesRef = db.collection('memories');
    const totalSnapshot = await memoriesRef.count().get();
    const totalExtractions = totalSnapshot.data().count;

    // Get recent extractions (last 24h and 7d)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const last24hSnapshot = await memoriesRef
      .where('extractedAt', '>=', oneDayAgo)
      .count()
      .get();

    const last7dSnapshot = await memoriesRef
      .where('extractedAt', '>=', sevenDaysAgo)
      .count()
      .get();

    // Initialize entity type stats
    const byEntityType: Record<ExtractedEntityType, { count: number; avgConfidence: number }> = {} as any;
    ENTITY_TYPES.forEach((type) => {
      byEntityType[type] = { count: 0, avgConfidence: 0 };
    });

    return {
      totalExtractions,
      successRate: 0.95, // TODO: Calculate from actual data
      avgEntitiesPerMemory: 4.2, // TODO: Calculate from actual data
      avgConfidence: 0.78, // TODO: Calculate from actual data
      byEntityType,
      byModel: {
        'gpt-4o-mini': { count: totalExtractions, avgLatencyMs: 450, successRate: 0.95 },
        'gpt-4o': { count: 0, avgLatencyMs: 0, successRate: 0 },
        'claude-3-haiku': { count: 0, avgLatencyMs: 0, successRate: 0 },
      },
      last24h: {
        extractions: last24hSnapshot.data().count,
        entities: last24hSnapshot.data().count * 4, // Estimate
        vocabLearned: 0, // TODO: Calculate
      },
      last7d: {
        extractions: last7dSnapshot.data().count,
        entities: last7dSnapshot.data().count * 4, // Estimate
        vocabLearned: 0, // TODO: Calculate
      },
    };
  }

  /**
   * Get vocabulary integration analytics
   */
  async getVocabularyIntegrationAnalytics(userId?: string): Promise<VocabularyIntegrationAnalytics> {
    const db = getFirestore();

    // Build query based on whether userId is provided
    const getVocabQuery = () => {
      if (userId) {
        return db.collection('users').doc(userId).collection('learnedVocabulary');
      }
      return db.collectionGroup('learnedVocabulary');
    };

    // Count by source
    const autoLearnedSnapshot = await getVocabQuery()
      .where('source', '==', 'memory_extraction')
      .count()
      .get();

    const manualSnapshot = await getVocabQuery()
      .where('source', '==', 'manual_edit')
      .count()
      .get();

    // Get recent suggestions (last 10)
    const recentVocabSnapshot = await getVocabQuery()
      .where('source', '==', 'memory_extraction')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const recentSuggestions = recentVocabSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        term: data.correctedPhrase || data.originalPhrase,
        category: data.category,
        confidence: data.confidence || 0,
        timestamp: data.createdAt,
      };
    });

    return {
      totalAutoLearned: autoLearnedSnapshot.data().count,
      totalManual: manualSnapshot.data().count,
      matchRate: 0.35, // TODO: Calculate from actual matches
      avgBoostApplied: 0.12, // TODO: Calculate
      byCategory: {}, // TODO: Calculate
      recentSuggestions,
    };
  }

  // ==========================================================================
  // Test Extraction
  // ==========================================================================

  /**
   * Test extraction on sample text (for admin debugging)
   * This is a stub - actual extraction happens in Cloud Functions
   */
  async testExtraction(text: string): Promise<{
    success: boolean;
    entities: Array<{ type: string; value: string; confidence: number }>;
    sentiment?: { score: number; label: string };
    latencyMs: number;
    model: string;
  }> {
    // This would normally call the Cloud Function
    // For now, return a mock response
    const startTime = Date.now();

    return {
      success: true,
      entities: [
        { type: 'person', value: 'Sample Person', confidence: 0.85 },
        { type: 'activity', value: 'meeting', confidence: 0.78 },
      ],
      sentiment: { score: 0.2, label: 'positive' },
      latencyMs: Date.now() - startTime,
      model: 'gpt-4o-mini',
    };
  }
}

// Export singleton instance and class
export const memoryBuilderConfigService = MemoryBuilderConfigService.getInstance();
export { MemoryBuilderConfigService };
