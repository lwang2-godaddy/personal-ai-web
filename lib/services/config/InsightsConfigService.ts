/**
 * InsightsConfigService - Firestore CRUD operations for Insights admin configuration
 *
 * Manages the admin-configurable Insights settings stored in Firestore
 */

import { getAdminFirestore } from '@/lib/api/firebase/admin';
import {
  InsightsAdminConfig,
  InsightsCategory,
  InsightsAdminCategoryConfig,
  InsightsHomeFeedConfig,
  DEFAULT_INSIGHTS_ADMIN_CONFIG,
} from '@/lib/models/InsightsConfig';

const CONFIG_COLLECTION = 'config';
const INSIGHTS_SETTINGS_DOC = 'insightsSettings';

/**
 * Get the admin Firestore instance
 */
function getFirestore() {
  return getAdminFirestore();
}

/**
 * InsightsConfigService - Singleton for managing Insights admin configuration
 */
class InsightsConfigService {
  private static instance: InsightsConfigService;

  private constructor() {}

  static getInstance(): InsightsConfigService {
    if (!InsightsConfigService.instance) {
      InsightsConfigService.instance = new InsightsConfigService();
    }
    return InsightsConfigService.instance;
  }

  /**
   * Get the current Insights admin configuration
   */
  async getConfig(): Promise<InsightsAdminConfig> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(INSIGHTS_SETTINGS_DOC);
    const doc = await docRef.get();

    if (!doc.exists) {
      // Create default config if it doesn't exist
      await this.saveConfig(DEFAULT_INSIGHTS_ADMIN_CONFIG);
      return DEFAULT_INSIGHTS_ADMIN_CONFIG;
    }

    return doc.data() as InsightsAdminConfig;
  }

  /**
   * Save the entire Insights admin configuration
   */
  async saveConfig(config: InsightsAdminConfig, updatedBy: string = 'admin'): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(INSIGHTS_SETTINGS_DOC);

    const updatedConfig: InsightsAdminConfig = {
      ...config,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    };

    await docRef.set(updatedConfig);
  }

  /**
   * Update specific fields of the config
   */
  async updateConfig(updates: Partial<InsightsAdminConfig>, updatedBy: string = 'admin'): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(INSIGHTS_SETTINGS_DOC);

    await docRef.update({
      ...updates,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    });
  }

  /**
   * Toggle the global enabled state
   */
  async setEnabled(enabled: boolean, updatedBy: string = 'admin'): Promise<void> {
    await this.updateConfig({ enabled }, updatedBy);
  }

  /**
   * Update a specific category configuration
   */
  async updateCategory(
    category: InsightsCategory,
    updates: Partial<InsightsAdminCategoryConfig>,
    updatedBy: string = 'admin'
  ): Promise<void> {
    const config = await this.getConfig();
    const currentCategoryConfig = config.categories[category];

    const updatedCategories = {
      ...config.categories,
      [category]: {
        ...currentCategoryConfig,
        ...updates,
      },
    };

    await this.updateConfig({ categories: updatedCategories }, updatedBy);
  }

  /**
   * Toggle a category's enabled state
   */
  async toggleCategory(category: InsightsCategory, enabled: boolean, updatedBy: string = 'admin'): Promise<void> {
    await this.updateCategory(category, { enabled }, updatedBy);
  }

  /**
   * Update the home feed configuration
   */
  async updateHomeFeed(updates: Partial<InsightsHomeFeedConfig>, updatedBy: string = 'admin'): Promise<void> {
    const config = await this.getConfig();
    const updatedHomeFeed = {
      ...config.homeFeed,
      ...updates,
    };

    await this.updateConfig({ homeFeed: updatedHomeFeed }, updatedBy);
  }

  /**
   * Update global rate limits
   */
  async updateRateLimits(
    maxPostsPerUserPerDay: number,
    globalCooldownHours: number,
    updatedBy: string = 'admin'
  ): Promise<void> {
    await this.updateConfig({ maxPostsPerUserPerDay, globalCooldownHours }, updatedBy);
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(updatedBy: string = 'admin'): Promise<void> {
    await this.saveConfig(DEFAULT_INSIGHTS_ADMIN_CONFIG, updatedBy);
  }

  /**
   * Get analytics data for insights
   * Note: This queries actual data from lifeFeedPosts collection
   */
  async getAnalytics(): Promise<{
    totalPosts: number;
    postsByCategory: Record<InsightsCategory, number>;
    postsLast24h: number;
    postsLast7d: number;
  }> {
    const db = getFirestore();

    // Get total posts count
    const postsCollection = db.collection('lifeFeedPosts');
    const allPostsSnapshot = await postsCollection.count().get();
    const totalPosts = allPostsSnapshot.data().count;

    // Get posts from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const last24hSnapshot = await postsCollection
      .where('publishedAt', '>=', oneDayAgo)
      .count()
      .get();
    const postsLast24h = last24hSnapshot.data().count;

    // Get posts from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const last7dSnapshot = await postsCollection
      .where('publishedAt', '>=', sevenDaysAgo)
      .count()
      .get();
    const postsLast7d = last7dSnapshot.data().count;

    // Initialize category counts (12 categories)
    const postsByCategory: Record<InsightsCategory, number> = {
      health: 0,
      activity: 0,
      social: 0,
      work: 0,
      travel: 0,
      learning: 0,
      creativity: 0,
      routine: 0,
      milestone: 0,
      memory: 0,
      location: 0,
      general: 0,
    };

    // Get counts by category (limited sample for performance)
    const categories: InsightsCategory[] = [
      'health', 'activity', 'social', 'work', 'travel', 'learning',
      'creativity', 'routine', 'milestone', 'memory', 'location', 'general'
    ];

    for (const category of categories) {
      const categorySnapshot = await postsCollection
        .where('category', '==', category)
        .count()
        .get();
      postsByCategory[category] = categorySnapshot.data().count;
    }

    return {
      totalPosts,
      postsByCategory,
      postsLast24h,
      postsLast7d,
    };
  }
}

export default InsightsConfigService;
