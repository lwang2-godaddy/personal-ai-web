/**
 * Migration Registry
 *
 * @description Central registry of all available migrations.
 * To add a new migration:
 * 1. Deploy the Cloud Function
 * 2. Add an entry to MIGRATION_REGISTRY below
 * 3. The migration will automatically appear in the admin UI
 */

import { MigrationDefinition } from '@/lib/models/Migration';

/**
 * Registry of all available migrations
 * Add new migrations here to make them available in the admin UI
 */
export const MIGRATION_REGISTRY: MigrationDefinition[] = [
  {
    id: 'createPredefinedCircles',
    name: 'Create Predefined Privacy Circles',
    description:
      'Creates the 4-tier privacy circles (Private, Close, Social, Public) for existing users who do not have them yet. This migration is safe to run multiple times as it skips users who already have circles.',
    category: 'privacy',
    type: 'callable',
    endpoint: 'migrateCreatePredefinedCircles',
    options: [
      {
        key: 'dryRun',
        type: 'boolean',
        label: 'Dry Run',
        description: 'Simulate the migration without making changes',
        default: true,
      },
      {
        key: 'batchSize',
        type: 'number',
        label: 'Batch Size',
        description: 'Number of users to process per batch',
        default: 100,
        min: 10,
        max: 500,
      },
      {
        key: 'startAfterUserId',
        type: 'string',
        label: 'Resume From User ID',
        description: 'Start processing after this user ID (for resuming partial migrations)',
      },
    ],
    supportsDryRun: true,
    supportsResume: true,
    destructive: false,
  },
  {
    id: 'migrateNotificationPreferences',
    name: 'Migrate Notification Preferences',
    description:
      'Migrates user notification preferences from V1 schema to V2 schema. This includes updating push notification settings, email preferences, and in-app notification configurations.',
    category: 'notifications',
    type: 'callable',
    endpoint: 'migrateNotificationPrefs',
    options: [
      {
        key: 'dryRun',
        type: 'boolean',
        label: 'Dry Run',
        description: 'Simulate the migration without making changes',
        default: true,
      },
      {
        key: 'batchSize',
        type: 'number',
        label: 'Batch Size',
        description: 'Number of users to process per batch',
        default: 100,
        min: 10,
        max: 500,
      },
    ],
    supportsDryRun: true,
    supportsResume: false,
    destructive: false,
  },
  {
    id: 'cleanupOrphanedData',
    name: 'Cleanup Orphaned Data',
    description:
      'Removes orphaned data entries that no longer have associated user accounts. This includes stale health data, location records, and voice notes. WARNING: This is a destructive operation.',
    category: 'cleanup',
    type: 'callable',
    endpoint: 'cleanupOrphanedData',
    options: [
      {
        key: 'dryRun',
        type: 'boolean',
        label: 'Dry Run',
        description: 'Simulate the cleanup without deleting data',
        default: true,
      },
      {
        key: 'batchSize',
        type: 'number',
        label: 'Batch Size',
        description: 'Number of records to process per batch',
        default: 50,
        min: 10,
        max: 200,
      },
      {
        key: 'dataType',
        type: 'select',
        label: 'Data Type',
        description: 'Type of data to clean up',
        default: 'all',
        options: [
          { value: 'all', label: 'All Data Types' },
          { value: 'healthData', label: 'Health Data Only' },
          { value: 'locationData', label: 'Location Data Only' },
          { value: 'voiceNotes', label: 'Voice Notes Only' },
        ],
      },
    ],
    supportsDryRun: true,
    supportsResume: true,
    destructive: true,
  },
  {
    id: 'initializeUserDefaults',
    name: 'Initialize User Defaults',
    description:
      'Sets default values for users missing required fields. This includes default privacy settings, notification preferences, and feature flags.',
    category: 'user_data',
    type: 'callable',
    endpoint: 'initializeUserDefaults',
    options: [
      {
        key: 'dryRun',
        type: 'boolean',
        label: 'Dry Run',
        description: 'Simulate without making changes',
        default: true,
      },
      {
        key: 'batchSize',
        type: 'number',
        label: 'Batch Size',
        description: 'Number of users to process per batch',
        default: 100,
        min: 10,
        max: 500,
      },
      {
        key: 'fieldsToInitialize',
        type: 'select',
        label: 'Fields to Initialize',
        description: 'Which fields to set defaults for',
        default: 'all',
        options: [
          { value: 'all', label: 'All Fields' },
          { value: 'privacy', label: 'Privacy Settings Only' },
          { value: 'notifications', label: 'Notification Prefs Only' },
          { value: 'features', label: 'Feature Flags Only' },
        ],
      },
    ],
    supportsDryRun: true,
    supportsResume: true,
    destructive: false,
  },
];

/**
 * Get a migration definition by ID
 */
export function getMigrationById(id: string): MigrationDefinition | undefined {
  return MIGRATION_REGISTRY.find((m) => m.id === id);
}

/**
 * Get migrations filtered by category
 */
export function getMigrationsByCategory(
  category: MigrationDefinition['category']
): MigrationDefinition[] {
  return MIGRATION_REGISTRY.filter((m) => m.category === category);
}

/**
 * Get all unique categories from the registry
 */
export function getAvailableCategories(): MigrationDefinition['category'][] {
  const categories = new Set(MIGRATION_REGISTRY.map((m) => m.category));
  return Array.from(categories);
}
