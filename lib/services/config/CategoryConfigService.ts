/**
 * CategoryConfigService.ts
 *
 * Admin service for managing Life Feed category configuration
 * Provides CRUD operations for the config/lifeFeedCategories Firestore document
 */

import { getAdminFirestore } from '@/lib/api/firebase/admin';
import {
  CategoryConfig,
  LifeFeedCategoriesConfig,
  DEFAULT_CATEGORIES_CONFIG,
  validateCategoryConfig,
  createEmptyCategoryConfig,
} from '@/lib/models/CategoryConfig';

// ============================================================================
// CategoryConfigService Class
// ============================================================================

class CategoryConfigService {
  private static instance: CategoryConfigService;
  private readonly collectionPath = 'config';
  private readonly docId = 'lifeFeedCategories';

  private constructor() {}

  static getInstance(): CategoryConfigService {
    if (!CategoryConfigService.instance) {
      CategoryConfigService.instance = new CategoryConfigService();
    }
    return CategoryConfigService.instance;
  }

  /**
   * Get the full categories configuration
   */
  async getCategoriesConfig(): Promise<LifeFeedCategoriesConfig> {
    try {
      const db = getAdminFirestore();
      const docRef = db.collection(this.collectionPath).doc(this.docId);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        return docSnap.data() as LifeFeedCategoriesConfig;
      }
    } catch (error) {
      console.error('[CategoryConfigService] Error loading config:', error);
    }

    // Return defaults if not found
    return DEFAULT_CATEGORIES_CONFIG;
  }

  /**
   * Save the full categories configuration
   */
  async saveCategoriesConfig(
    config: LifeFeedCategoriesConfig,
    updatedBy: string
  ): Promise<void> {
    const db = getAdminFirestore();
    const docRef = db.collection(this.collectionPath).doc(this.docId);

    const updatedConfig: LifeFeedCategoriesConfig = {
      ...config,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedBy,
    };

    await docRef.set(updatedConfig);
  }

  /**
   * Get a single category by ID
   */
  async getCategory(categoryId: string): Promise<CategoryConfig | null> {
    const config = await this.getCategoriesConfig();
    return config.categories[categoryId] || null;
  }

  /**
   * Update a single category
   */
  async updateCategory(
    categoryId: string,
    updates: Partial<CategoryConfig>,
    updatedBy: string
  ): Promise<{ success: boolean; errors?: string[] }> {
    const config = await this.getCategoriesConfig();

    // Check if category exists
    if (!config.categories[categoryId]) {
      return { success: false, errors: [`Category ${categoryId} not found`] };
    }

    // Merge updates
    const updatedCategory: CategoryConfig = {
      ...config.categories[categoryId],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Validate
    const errors = validateCategoryConfig(updatedCategory);
    if (errors.length > 0) {
      return { success: false, errors };
    }

    // Save
    config.categories[categoryId] = updatedCategory;
    await this.saveCategoriesConfig(config, updatedBy);

    return { success: true };
  }

  /**
   * Create a new category
   */
  async createCategory(
    category: Partial<CategoryConfig>,
    createdBy: string
  ): Promise<{ success: boolean; errors?: string[]; category?: CategoryConfig }> {
    // Generate ID if not provided
    const categoryId = category.id || this.generateCategoryId(category.displayName || 'custom');

    // Check for duplicate ID
    const config = await this.getCategoriesConfig();
    if (config.categories[categoryId]) {
      return { success: false, errors: [`Category with ID ${categoryId} already exists`] };
    }

    // Create full category config
    const now = new Date().toISOString();
    const newCategory: CategoryConfig = {
      ...createEmptyCategoryConfig(categoryId),
      ...category,
      id: categoryId,
      isPreset: false, // Custom categories are never preset
      createdAt: now,
      updatedAt: now,
    };

    // Validate
    const errors = validateCategoryConfig(newCategory);
    if (errors.length > 0) {
      return { success: false, errors };
    }

    // Save
    config.categories[categoryId] = newCategory;
    await this.saveCategoriesConfig(config, createdBy);

    return { success: true, category: newCategory };
  }

  /**
   * Delete a category (only non-preset categories can be deleted)
   */
  async deleteCategory(
    categoryId: string,
    deletedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    const config = await this.getCategoriesConfig();

    const category = config.categories[categoryId];
    if (!category) {
      return { success: false, error: `Category ${categoryId} not found` };
    }

    if (category.isPreset) {
      return { success: false, error: 'Preset categories cannot be deleted. Disable them instead.' };
    }

    // Delete
    delete config.categories[categoryId];
    await this.saveCategoriesConfig(config, deletedBy);

    return { success: true };
  }

  /**
   * Toggle category enabled status
   */
  async toggleCategoryEnabled(
    categoryId: string,
    enabled: boolean,
    updatedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    const result = await this.updateCategory(categoryId, { enabled }, updatedBy);
    if (!result.success) {
      return { success: false, error: result.errors?.join(', ') };
    }
    return { success: true };
  }

  /**
   * Update category priority
   */
  async updateCategoryPriority(
    categoryId: string,
    priority: number,
    updatedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    if (priority < 0 || priority > 100) {
      return { success: false, error: 'Priority must be between 0 and 100' };
    }

    const result = await this.updateCategory(categoryId, { priority }, updatedBy);
    if (!result.success) {
      return { success: false, error: result.errors?.join(', ') };
    }
    return { success: true };
  }

  /**
   * Update category match patterns
   */
  async updateMatchPatterns(
    categoryId: string,
    patterns: string[],
    updatedBy: string
  ): Promise<{ success: boolean; errors?: string[] }> {
    // Validate patterns first
    const invalidPatterns: string[] = [];
    for (const pattern of patterns) {
      try {
        new RegExp(pattern, 'i');
      } catch {
        invalidPatterns.push(pattern);
      }
    }

    if (invalidPatterns.length > 0) {
      return {
        success: false,
        errors: invalidPatterns.map((p) => `Invalid regex pattern: ${p}`),
      };
    }

    return this.updateCategory(categoryId, { matchPatterns: patterns }, updatedBy);
  }

  /**
   * Get all categories sorted by priority
   */
  async getAllCategoriesSorted(): Promise<CategoryConfig[]> {
    const config = await this.getCategoriesConfig();
    return Object.values(config.categories).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get enabled categories sorted by priority
   */
  async getEnabledCategoriesSorted(): Promise<CategoryConfig[]> {
    const config = await this.getCategoriesConfig();
    return Object.values(config.categories)
      .filter((cat) => cat.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Reset category to default (preset categories only)
   */
  async resetCategoryToDefault(
    categoryId: string,
    resetBy: string
  ): Promise<{ success: boolean; error?: string }> {
    const defaultCategory = DEFAULT_CATEGORIES_CONFIG.categories[categoryId];
    if (!defaultCategory) {
      return { success: false, error: `No default configuration for category ${categoryId}` };
    }

    const config = await this.getCategoriesConfig();
    if (!config.categories[categoryId]) {
      return { success: false, error: `Category ${categoryId} not found` };
    }

    // Reset to default but preserve timestamps
    config.categories[categoryId] = {
      ...defaultCategory,
      createdAt: config.categories[categoryId].createdAt,
      updatedAt: new Date().toISOString(),
    };

    await this.saveCategoriesConfig(config, resetBy);
    return { success: true };
  }

  /**
   * Seed default categories (if not exists)
   */
  async seedDefaultCategories(seedBy: string): Promise<{ success: boolean; created: boolean }> {
    const db = getAdminFirestore();
    const docRef = db.collection(this.collectionPath).doc(this.docId);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      return { success: true, created: false };
    }

    await this.saveCategoriesConfig(DEFAULT_CATEGORIES_CONFIG, seedBy);
    return { success: true, created: true };
  }

  /**
   * Generate a valid category ID from display name
   */
  private generateCategoryId(displayName: string): string {
    return displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 30);
  }
}

export default CategoryConfigService.getInstance();
