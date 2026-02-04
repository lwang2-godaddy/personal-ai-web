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
  LifeKeywordsConfig,
  DailyInsightConfig,
  ThisDayConfig,
  PostTypeAnalytics,
  DEFAULT_POST_TYPES_CONFIG,
  DEFAULT_FUN_FACTS_CONFIG,
  DEFAULT_MOOD_COMPASS_CONFIG,
  DEFAULT_MEMORY_COMPANION_CONFIG,
  DEFAULT_LIFE_FORECASTER_CONFIG,
  DEFAULT_LIFE_KEYWORDS_CONFIG,
  DEFAULT_DAILY_INSIGHT_CONFIG,
  DEFAULT_THIS_DAY_CONFIG,
  INSIGHTS_POST_TYPES,
} from '@/lib/models/InsightsFeatureConfig';

const CONFIG_COLLECTION = 'config';

// Document names for each feature config
const DOC_POST_TYPES = 'insightsPostTypes';
const DOC_FUN_FACTS = 'funFactsSettings';
const DOC_MOOD_COMPASS = 'moodCompassSettings';
const DOC_MEMORY_COMPANION = 'memoryCompanionSettings';
const DOC_LIFE_FORECASTER = 'lifeForecasterSettings';
const DOC_LIFE_KEYWORDS = 'lifeKeywordsSettings';
const DOC_DAILY_INSIGHT = 'dailyInsightSettings';
const DOC_THIS_DAY = 'thisDaySettings';

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
  // Life Keywords Configuration
  // ==========================================================================

  /**
   * Get the current Life Keywords configuration
   */
  async getLifeKeywordsConfig(): Promise<LifeKeywordsConfig> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_LIFE_KEYWORDS);
    const doc = await docRef.get();

    if (!doc.exists) {
      await this.saveLifeKeywordsConfig(DEFAULT_LIFE_KEYWORDS_CONFIG);
      return DEFAULT_LIFE_KEYWORDS_CONFIG;
    }

    return doc.data() as LifeKeywordsConfig;
  }

  /**
   * Save the entire Life Keywords configuration
   */
  async saveLifeKeywordsConfig(config: LifeKeywordsConfig, updatedBy: string = 'admin'): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_LIFE_KEYWORDS);

    const updatedConfig: LifeKeywordsConfig = {
      ...config,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    };

    await docRef.set(updatedConfig);
  }

  /**
   * Update Life Keywords configuration
   */
  async updateLifeKeywordsConfig(updates: Partial<LifeKeywordsConfig>, updatedBy: string = 'admin'): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_LIFE_KEYWORDS);

    await docRef.update({
      ...updates,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    });
  }

  /**
   * Reset Life Keywords to defaults
   */
  async resetLifeKeywordsToDefaults(updatedBy: string = 'admin'): Promise<void> {
    await this.saveLifeKeywordsConfig(DEFAULT_LIFE_KEYWORDS_CONFIG, updatedBy);
  }

  /**
   * Get Life Keywords analytics
   */
  async getLifeKeywordsAnalytics(): Promise<{
    totalGenerated: number;
    last24h: number;
    last7d: number;
    byPeriodType: Record<string, number>;
    byCategory: Record<string, number>;
    avgConfidence: number;
    viewRate: number;
    expandRate: number;
  }> {
    const db = getFirestore();
    const keywordsCollection = db.collection('lifeKeywords');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Total count
    const totalSnapshot = await keywordsCollection.count().get();
    const totalGenerated = totalSnapshot.data().count;

    // Last 24 hours
    const last24hSnapshot = await keywordsCollection
      .where('publishedAt', '>=', oneDayAgo)
      .count()
      .get();
    const last24h = last24hSnapshot.data().count;

    // Last 7 days
    const last7dSnapshot = await keywordsCollection
      .where('publishedAt', '>=', sevenDaysAgo)
      .count()
      .get();
    const last7d = last7dSnapshot.data().count;

    // By period type
    const periodTypes = ['weekly', 'monthly', 'quarterly', 'yearly'];
    const byPeriodType: Record<string, number> = {};
    for (const type of periodTypes) {
      const snapshot = await keywordsCollection.where('periodType', '==', type).count().get();
      byPeriodType[type] = snapshot.data().count;
    }

    // By category
    const categories = ['health', 'activity', 'social', 'work', 'travel', 'learning', 'creativity', 'routine', 'milestone', 'general'];
    const byCategory: Record<string, number> = {};
    for (const category of categories) {
      const snapshot = await keywordsCollection.where('category', '==', category).count().get();
      byCategory[category] = snapshot.data().count;
    }

    // Calculate average confidence and engagement rates
    let totalConfidence = 0;
    let viewedCount = 0;
    let expandedCount = 0;

    const recentSnapshot = await keywordsCollection
      .orderBy('publishedAt', 'desc')
      .limit(1000)
      .get();

    recentSnapshot.docs.forEach(doc => {
      const data = doc.data();
      totalConfidence += data.confidence || 0;
      if (data.viewed) viewedCount++;
      if (data.expanded) expandedCount++;
    });

    const avgConfidence = recentSnapshot.size > 0 ? totalConfidence / recentSnapshot.size : 0;
    const viewRate = recentSnapshot.size > 0 ? viewedCount / recentSnapshot.size : 0;
    const expandRate = recentSnapshot.size > 0 ? expandedCount / recentSnapshot.size : 0;

    return {
      totalGenerated,
      last24h,
      last7d,
      byPeriodType,
      byCategory,
      avgConfidence,
      viewRate,
      expandRate,
    };
  }

  // ==========================================================================
  // Daily Insight Configuration
  // ==========================================================================

  /**
   * Get the current Daily Insight configuration
   */
  async getDailyInsightConfig(): Promise<DailyInsightConfig> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_DAILY_INSIGHT);
    const doc = await docRef.get();

    if (!doc.exists) {
      await this.saveDailyInsightConfig(DEFAULT_DAILY_INSIGHT_CONFIG);
      return DEFAULT_DAILY_INSIGHT_CONFIG;
    }

    return doc.data() as DailyInsightConfig;
  }

  /**
   * Save the entire Daily Insight configuration
   */
  async saveDailyInsightConfig(config: DailyInsightConfig, updatedBy: string = 'admin'): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_DAILY_INSIGHT);

    const updatedConfig: DailyInsightConfig = {
      ...config,
      lastUpdatedAt: new Date().toISOString(),
    };

    await docRef.set(updatedConfig);
  }

  /**
   * Update Daily Insight configuration
   */
  async updateDailyInsightConfig(updates: Partial<DailyInsightConfig>, updatedBy: string = 'admin'): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_DAILY_INSIGHT);

    await docRef.update({
      ...updates,
      lastUpdatedAt: new Date().toISOString(),
    });
  }

  /**
   * Reset Daily Insight to defaults
   */
  async resetDailyInsightToDefaults(updatedBy: string = 'admin'): Promise<void> {
    await this.saveDailyInsightConfig(DEFAULT_DAILY_INSIGHT_CONFIG, updatedBy);
  }

  // ==========================================================================
  // This Day Configuration
  // ==========================================================================

  /**
   * Get the current This Day configuration
   */
  async getThisDayConfig(): Promise<ThisDayConfig> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_THIS_DAY);
    const doc = await docRef.get();

    if (!doc.exists) {
      await this.saveThisDayConfig(DEFAULT_THIS_DAY_CONFIG);
      return DEFAULT_THIS_DAY_CONFIG;
    }

    return doc.data() as ThisDayConfig;
  }

  /**
   * Save the entire This Day configuration
   */
  async saveThisDayConfig(config: ThisDayConfig, updatedBy: string = 'admin'): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_THIS_DAY);

    const updatedConfig: ThisDayConfig = {
      ...config,
      lastUpdatedAt: new Date().toISOString(),
    };

    await docRef.set(updatedConfig);
  }

  /**
   * Update This Day configuration
   */
  async updateThisDayConfig(updates: Partial<ThisDayConfig>, updatedBy: string = 'admin'): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(DOC_THIS_DAY);

    await docRef.update({
      ...updates,
      lastUpdatedAt: new Date().toISOString(),
    });
  }

  /**
   * Reset This Day to defaults
   */
  async resetThisDayToDefaults(updatedBy: string = 'admin'): Promise<void> {
    await this.saveThisDayConfig(DEFAULT_THIS_DAY_CONFIG, updatedBy);
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
    lifeKeywords: LifeKeywordsConfig;
    dailyInsight: DailyInsightConfig;
    thisDay: ThisDayConfig;
  }> {
    const [postTypes, funFacts, moodCompass, memoryCompanion, lifeForecaster, lifeKeywords, dailyInsight, thisDay] = await Promise.all([
      this.getPostTypesConfig(),
      this.getFunFactsConfig(),
      this.getMoodCompassConfig(),
      this.getMemoryCompanionConfig(),
      this.getLifeForecasterConfig(),
      this.getLifeKeywordsConfig(),
      this.getDailyInsightConfig(),
      this.getThisDayConfig(),
    ]);

    return {
      postTypes,
      funFacts,
      moodCompass,
      memoryCompanion,
      lifeForecaster,
      lifeKeywords,
      dailyInsight,
      thisDay,
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
      this.resetLifeKeywordsToDefaults(updatedBy),
      this.resetDailyInsightToDefaults(updatedBy),
      this.resetThisDayToDefaults(updatedBy),
    ]);
  }
}

export default InsightsFeatureService;
