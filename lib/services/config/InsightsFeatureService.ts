/**
 * InsightsFeatureService - Firestore CRUD operations for AI Feature configurations
 *
 * Manages the admin-configurable AI feature settings stored in Firestore:
 * - config/insightsPostTypes - Post type configuration
 * - config/funFactsSettings - Fun Facts feature settings
 * - config/moodCompassSettings - Mood Compass feature settings
 * - config/memoryCompanionSettings - Memory Companion feature settings
 * - config/lifeForecasterSettings - Life Forecaster feature settings
 */

import { getAdminFirestore } from '@/lib/api/firebase/admin';
import {
  InsightsPostTypesConfig,
  InsightsPostType,
  PostTypeConfig,
  FunFactsConfig,
  MoodCompassConfig,
  MemoryCompanionConfig,
  LifeForecasterConfig,
  PostTypeAnalytics,
  DEFAULT_POST_TYPES_CONFIG,
  DEFAULT_FUN_FACTS_CONFIG,
  DEFAULT_MOOD_COMPASS_CONFIG,
  DEFAULT_MEMORY_COMPANION_CONFIG,
  DEFAULT_LIFE_FORECASTER_CONFIG,
  INSIGHTS_POST_TYPES,
} from '@/lib/models/InsightsFeatureConfig';

const CONFIG_COLLECTION = 'config';

// Document names for each feature config
const DOC_POST_TYPES = 'insightsPostTypes';
const DOC_FUN_FACTS = 'funFactsSettings';
const DOC_MOOD_COMPASS = 'moodCompassSettings';
const DOC_MEMORY_COMPANION = 'memoryCompanionSettings';
const DOC_LIFE_FORECASTER = 'lifeForecasterSettings';

/**
 * Get the admin Firestore instance
 */
function getFirestore() {
  return getAdminFirestore();
}

/**
 * InsightsFeatureService - Singleton for managing AI Feature configurations
 */
class InsightsFeatureService {
  private static instance: InsightsFeatureService;

  private constructor() {}

  static getInstance(): InsightsFeatureService {
    if (!InsightsFeatureService.instance) {
      InsightsFeatureService.instance = new InsightsFeatureService();
    }
    return InsightsFeatureService.instance;
  }

  // ==========================================================================
  // Post Types Configuration
  // ==========================================================================

  /**
   * Get the current post types configuration
   */
  async getPostTypesConfig(): Promise<InsightsPostTypesConfig> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_POST_TYPES);
    const doc = await docRef.get();

    if (!doc.exists) {
      // Create default config if it doesn't exist
      await this.savePostTypesConfig(DEFAULT_POST_TYPES_CONFIG);
      return DEFAULT_POST_TYPES_CONFIG;
    }

    return doc.data() as InsightsPostTypesConfig;
  }

  /**
   * Save the entire post types configuration
   */
  async savePostTypesConfig(config: InsightsPostTypesConfig, updatedBy: string = 'admin'): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_POST_TYPES);

    const updatedConfig: InsightsPostTypesConfig = {
      ...config,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    };

    await docRef.set(updatedConfig);
  }

  /**
   * Update a specific post type configuration
   */
  async updatePostType(
    postType: InsightsPostType,
    updates: Partial<PostTypeConfig>,
    updatedBy: string = 'admin'
  ): Promise<void> {
    const config = await this.getPostTypesConfig();
    const currentTypeConfig = config.postTypes[postType];

    const updatedPostTypes = {
      ...config.postTypes,
      [postType]: {
        ...currentTypeConfig,
        ...updates,
      },
    };

    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_POST_TYPES);

    await docRef.update({
      postTypes: updatedPostTypes,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    });
  }

  /**
   * Toggle a post type's enabled state
   */
  async togglePostType(postType: InsightsPostType, enabled: boolean, updatedBy: string = 'admin'): Promise<void> {
    await this.updatePostType(postType, { enabled }, updatedBy);
  }

  /**
   * Reset post types to defaults
   */
  async resetPostTypesToDefaults(updatedBy: string = 'admin'): Promise<void> {
    await this.savePostTypesConfig(DEFAULT_POST_TYPES_CONFIG, updatedBy);
  }

  /**
   * Get analytics for post types
   */
  async getPostTypeAnalytics(): Promise<PostTypeAnalytics> {
    const db = getFirestore();
    const postsCollection = db.collection('lifeFeedPosts');

    const totalByType: Record<InsightsPostType, number> = {} as Record<InsightsPostType, number>;
    const last24hByType: Record<InsightsPostType, number> = {} as Record<InsightsPostType, number>;
    const last7dByType: Record<InsightsPostType, number> = {} as Record<InsightsPostType, number>;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    for (const postType of INSIGHTS_POST_TYPES) {
      // Total count
      const totalSnapshot = await postsCollection
        .where('type', '==', postType)
        .count()
        .get();
      totalByType[postType] = totalSnapshot.data().count;

      // Last 24 hours
      const last24hSnapshot = await postsCollection
        .where('type', '==', postType)
        .where('publishedAt', '>=', oneDayAgo)
        .count()
        .get();
      last24hByType[postType] = last24hSnapshot.data().count;

      // Last 7 days
      const last7dSnapshot = await postsCollection
        .where('type', '==', postType)
        .where('publishedAt', '>=', sevenDaysAgo)
        .count()
        .get();
      last7dByType[postType] = last7dSnapshot.data().count;
    }

    return {
      totalByType,
      last24hByType,
      last7dByType,
    };
  }

  // ==========================================================================
  // Fun Facts Configuration
  // ==========================================================================

  /**
   * Get the current Fun Facts configuration
   */
  async getFunFactsConfig(): Promise<FunFactsConfig> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_FUN_FACTS);
    const doc = await docRef.get();

    if (!doc.exists) {
      await this.saveFunFactsConfig(DEFAULT_FUN_FACTS_CONFIG);
      return DEFAULT_FUN_FACTS_CONFIG;
    }

    return doc.data() as FunFactsConfig;
  }

  /**
   * Save the entire Fun Facts configuration
   */
  async saveFunFactsConfig(config: FunFactsConfig, updatedBy: string = 'admin'): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_FUN_FACTS);

    const updatedConfig: FunFactsConfig = {
      ...config,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    };

    await docRef.set(updatedConfig);
  }

  /**
   * Update Fun Facts configuration
   */
  async updateFunFactsConfig(updates: Partial<FunFactsConfig>, updatedBy: string = 'admin'): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_FUN_FACTS);

    await docRef.update({
      ...updates,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    });
  }

  /**
   * Reset Fun Facts to defaults
   */
  async resetFunFactsToDefaults(updatedBy: string = 'admin'): Promise<void> {
    await this.saveFunFactsConfig(DEFAULT_FUN_FACTS_CONFIG, updatedBy);
  }

  // ==========================================================================
  // Mood Compass Configuration
  // ==========================================================================

  /**
   * Get the current Mood Compass configuration
   */
  async getMoodCompassConfig(): Promise<MoodCompassConfig> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_MOOD_COMPASS);
    const doc = await docRef.get();

    if (!doc.exists) {
      await this.saveMoodCompassConfig(DEFAULT_MOOD_COMPASS_CONFIG);
      return DEFAULT_MOOD_COMPASS_CONFIG;
    }

    return doc.data() as MoodCompassConfig;
  }

  /**
   * Save the entire Mood Compass configuration
   */
  async saveMoodCompassConfig(config: MoodCompassConfig, updatedBy: string = 'admin'): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_MOOD_COMPASS);

    const updatedConfig: MoodCompassConfig = {
      ...config,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    };

    await docRef.set(updatedConfig);
  }

  /**
   * Update Mood Compass configuration
   */
  async updateMoodCompassConfig(updates: Partial<MoodCompassConfig>, updatedBy: string = 'admin'): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_MOOD_COMPASS);

    await docRef.update({
      ...updates,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    });
  }

  /**
   * Reset Mood Compass to defaults
   */
  async resetMoodCompassToDefaults(updatedBy: string = 'admin'): Promise<void> {
    await this.saveMoodCompassConfig(DEFAULT_MOOD_COMPASS_CONFIG, updatedBy);
  }

  // ==========================================================================
  // Memory Companion Configuration
  // ==========================================================================

  /**
   * Get the current Memory Companion configuration
   */
  async getMemoryCompanionConfig(): Promise<MemoryCompanionConfig> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_MEMORY_COMPANION);
    const doc = await docRef.get();

    if (!doc.exists) {
      await this.saveMemoryCompanionConfig(DEFAULT_MEMORY_COMPANION_CONFIG);
      return DEFAULT_MEMORY_COMPANION_CONFIG;
    }

    return doc.data() as MemoryCompanionConfig;
  }

  /**
   * Save the entire Memory Companion configuration
   */
  async saveMemoryCompanionConfig(config: MemoryCompanionConfig, updatedBy: string = 'admin'): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_MEMORY_COMPANION);

    const updatedConfig: MemoryCompanionConfig = {
      ...config,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    };

    await docRef.set(updatedConfig);
  }

  /**
   * Update Memory Companion configuration
   */
  async updateMemoryCompanionConfig(updates: Partial<MemoryCompanionConfig>, updatedBy: string = 'admin'): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_MEMORY_COMPANION);

    await docRef.update({
      ...updates,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    });
  }

  /**
   * Reset Memory Companion to defaults
   */
  async resetMemoryCompanionToDefaults(updatedBy: string = 'admin'): Promise<void> {
    await this.saveMemoryCompanionConfig(DEFAULT_MEMORY_COMPANION_CONFIG, updatedBy);
  }

  // ==========================================================================
  // Life Forecaster Configuration
  // ==========================================================================

  /**
   * Get the current Life Forecaster configuration
   */
  async getLifeForecasterConfig(): Promise<LifeForecasterConfig> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_LIFE_FORECASTER);
    const doc = await docRef.get();

    if (!doc.exists) {
      await this.saveLifeForecasterConfig(DEFAULT_LIFE_FORECASTER_CONFIG);
      return DEFAULT_LIFE_FORECASTER_CONFIG;
    }

    return doc.data() as LifeForecasterConfig;
  }

  /**
   * Save the entire Life Forecaster configuration
   */
  async saveLifeForecasterConfig(config: LifeForecasterConfig, updatedBy: string = 'admin'): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_LIFE_FORECASTER);

    const updatedConfig: LifeForecasterConfig = {
      ...config,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    };

    await docRef.set(updatedConfig);
  }

  /**
   * Update Life Forecaster configuration
   */
  async updateLifeForecasterConfig(updates: Partial<LifeForecasterConfig>, updatedBy: string = 'admin'): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_LIFE_FORECASTER);

    await docRef.update({
      ...updates,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    });
  }

  /**
   * Reset Life Forecaster to defaults
   */
  async resetLifeForecasterToDefaults(updatedBy: string = 'admin'): Promise<void> {
    await this.saveLifeForecasterConfig(DEFAULT_LIFE_FORECASTER_CONFIG, updatedBy);
  }

  // ==========================================================================
  // Unified Methods
  // ==========================================================================

  /**
   * Get all feature configurations at once
   */
  async getAllFeatureConfigs(): Promise<{
    postTypes: InsightsPostTypesConfig;
    funFacts: FunFactsConfig;
    moodCompass: MoodCompassConfig;
    memoryCompanion: MemoryCompanionConfig;
    lifeForecaster: LifeForecasterConfig;
  }> {
    const [postTypes, funFacts, moodCompass, memoryCompanion, lifeForecaster] = await Promise.all([
      this.getPostTypesConfig(),
      this.getFunFactsConfig(),
      this.getMoodCompassConfig(),
      this.getMemoryCompanionConfig(),
      this.getLifeForecasterConfig(),
    ]);

    return {
      postTypes,
      funFacts,
      moodCompass,
      memoryCompanion,
      lifeForecaster,
    };
  }

  /**
   * Reset all feature configs to defaults
   */
  async resetAllToDefaults(updatedBy: string = 'admin'): Promise<void> {
    await Promise.all([
      this.resetPostTypesToDefaults(updatedBy),
      this.resetFunFactsToDefaults(updatedBy),
      this.resetMoodCompassToDefaults(updatedBy),
      this.resetMemoryCompanionToDefaults(updatedBy),
      this.resetLifeForecasterToDefaults(updatedBy),
    ]);
  }
}

export default InsightsFeatureService;
