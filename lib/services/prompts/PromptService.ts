/**
 * PromptService.ts
 *
 * Service for managing AI prompts in Firestore
 * Used by admin API routes for CRUD operations
 */

import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import {
  FirestorePromptConfig,
  PromptDefinition,
  PromptVersion,
  SUPPORTED_LANGUAGES,
  PROMPT_SERVICES,
} from '@/lib/models/Prompt';

// Raw Firestore format with Timestamps
interface FirestorePromptConfigRaw {
  version: string;
  language: string;
  service: string;
  lastUpdated: Timestamp;
  updatedBy: string;
  updateNotes?: string;
  createdAt: Timestamp;
  createdBy: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Timestamp;
  enabled: boolean;
  prompts: Record<string, PromptDefinition>;
}

/**
 * Convert Firestore Timestamp to ISO string
 */
function serializeConfig(raw: FirestorePromptConfigRaw): FirestorePromptConfig {
  return {
    ...raw,
    lastUpdated: raw.lastUpdated.toDate().toISOString(),
    createdAt: raw.createdAt.toDate().toISOString(),
    publishedAt: raw.publishedAt?.toDate().toISOString(),
  };
}

/**
 * PromptService handles all Firestore operations for prompt management
 */
export class PromptService {
  private db = getAdminFirestore();

  /**
   * List all prompt configs
   */
  async listConfigs(language?: string, service?: string): Promise<FirestorePromptConfig[]> {
    const configs: FirestorePromptConfig[] = [];

    try {
      if (language && service) {
        // Get specific config
        const docRef = this.db
          .collection('promptConfigs')
          .doc(language)
          .collection('services')
          .doc(service);

        const docSnap = await docRef.get();
        if (docSnap.exists) {
          const raw = docSnap.data() as FirestorePromptConfigRaw;
          configs.push(serializeConfig(raw));
        }
      } else if (language) {
        // Get all services for a language
        const servicesRef = this.db
          .collection('promptConfigs')
          .doc(language)
          .collection('services');

        const snapshot = await servicesRef.get();
        for (const doc of snapshot.docs) {
          const raw = doc.data() as FirestorePromptConfigRaw;
          configs.push(serializeConfig(raw));
        }
      } else {
        // Get all configs
        for (const lang of SUPPORTED_LANGUAGES) {
          const servicesRef = this.db
            .collection('promptConfigs')
            .doc(lang.code)
            .collection('services');

          const snapshot = await servicesRef.get();
          for (const doc of snapshot.docs) {
            const raw = doc.data() as FirestorePromptConfigRaw;
            configs.push(serializeConfig(raw));
          }
        }
      }
    } catch (error) {
      console.error('Error listing prompt configs:', error);
      throw error;
    }

    return configs;
  }

  /**
   * Get a specific prompt config
   */
  async getConfig(language: string, service: string): Promise<FirestorePromptConfig | null> {
    const docRef = this.db
      .collection('promptConfigs')
      .doc(language)
      .collection('services')
      .doc(service);

    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return null;
    }

    const raw = docSnap.data() as FirestorePromptConfigRaw;
    return serializeConfig(raw);
  }

  /**
   * Create or update a prompt config
   */
  async saveConfig(
    config: Omit<FirestorePromptConfig, 'createdAt' | 'lastUpdated' | 'createdBy' | 'updatedBy'>,
    adminUid: string,
    notes?: string
  ): Promise<FirestorePromptConfig> {
    const now = Timestamp.now();
    const docRef = this.db
      .collection('promptConfigs')
      .doc(config.language)
      .collection('services')
      .doc(config.service);

    const existingDoc = await docRef.get();
    const isNew = !existingDoc.exists;

    const firestoreData: FirestorePromptConfigRaw = {
      version: config.version,
      language: config.language,
      service: config.service,
      lastUpdated: now,
      updatedBy: adminUid,
      updateNotes: notes || (isNew ? 'Initial creation' : 'Updated'),
      createdAt: isNew ? now : (existingDoc.data()?.createdAt || now),
      createdBy: isNew ? adminUid : (existingDoc.data()?.createdBy || adminUid),
      status: config.status,
      publishedAt: config.status === 'published' ? now : (existingDoc.data()?.publishedAt),
      enabled: config.enabled,
      prompts: config.prompts,
    };

    await docRef.set(firestoreData);

    return serializeConfig(firestoreData);
  }

  /**
   * Update a specific prompt within a config
   */
  async updatePrompt(
    language: string,
    service: string,
    promptId: string,
    updates: Partial<PromptDefinition>,
    adminUid: string,
    notes?: string
  ): Promise<{ config: FirestorePromptConfig; version: PromptVersion }> {
    const docRef = this.db
      .collection('promptConfigs')
      .doc(language)
      .collection('services')
      .doc(service);

    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error(`Prompt config not found: ${service}/${language}`);
    }

    const raw = docSnap.data() as FirestorePromptConfigRaw;
    const existingPrompt = raw.prompts[promptId];

    if (!existingPrompt) {
      throw new Error(`Prompt not found: ${promptId} in ${service}/${language}`);
    }

    // Create version record
    const versionId = `${service}_${language}_${promptId}_${Date.now()}`;
    const versionRef = this.db.collection('promptVersions').doc(versionId);

    const now = Timestamp.now();

    const versionData = {
      id: versionId,
      language,
      service,
      promptId,
      previousContent: existingPrompt.content,
      newContent: updates.content || existingPrompt.content,
      changedAt: now,
      changedBy: adminUid,
      changeNotes: notes,
      changeType: 'update' as const,
    };

    // Update the prompt
    const updatedPrompt: PromptDefinition = {
      ...existingPrompt,
      ...updates,
    };

    const updatedPrompts = {
      ...raw.prompts,
      [promptId]: updatedPrompt,
    };

    // Update config
    const updateData = {
      prompts: updatedPrompts,
      lastUpdated: now,
      updatedBy: adminUid,
      updateNotes: notes,
    };

    // Batch write
    const batch = this.db.batch();
    batch.update(docRef, updateData);
    batch.set(versionRef, versionData);
    await batch.commit();

    // Get updated config
    const updatedDoc = await docRef.get();
    const updatedRaw = updatedDoc.data() as FirestorePromptConfigRaw;

    return {
      config: serializeConfig(updatedRaw),
      version: {
        ...versionData,
        changedAt: now.toDate().toISOString(),
      },
    };
  }

  /**
   * Toggle enabled status
   */
  async setEnabled(
    language: string,
    service: string,
    enabled: boolean,
    adminUid: string
  ): Promise<FirestorePromptConfig> {
    const docRef = this.db
      .collection('promptConfigs')
      .doc(language)
      .collection('services')
      .doc(service);

    const now = Timestamp.now();

    await docRef.update({
      enabled,
      lastUpdated: now,
      updatedBy: adminUid,
      updateNotes: enabled ? 'Enabled Firestore prompts' : 'Disabled (fallback to YAML)',
    });

    const updatedDoc = await docRef.get();
    const raw = updatedDoc.data() as FirestorePromptConfigRaw;
    return serializeConfig(raw);
  }

  /**
   * Update status (draft/published/archived)
   */
  async setStatus(
    language: string,
    service: string,
    status: 'draft' | 'published' | 'archived',
    adminUid: string
  ): Promise<FirestorePromptConfig> {
    const docRef = this.db
      .collection('promptConfigs')
      .doc(language)
      .collection('services')
      .doc(service);

    const now = Timestamp.now();
    const updateData: Record<string, unknown> = {
      status,
      lastUpdated: now,
      updatedBy: adminUid,
      updateNotes: `Changed status to ${status}`,
    };

    if (status === 'published') {
      updateData.publishedAt = now;
    }

    await docRef.update(updateData);

    // Create version record
    const versionId = `${service}_${language}_status_${Date.now()}`;
    await this.db.collection('promptVersions').doc(versionId).set({
      id: versionId,
      language,
      service,
      promptId: '_status',
      previousContent: '',
      newContent: status,
      changedAt: now,
      changedBy: adminUid,
      changeType: status === 'published' ? 'publish' : 'unpublish',
    });

    const updatedDoc = await docRef.get();
    const raw = updatedDoc.data() as FirestorePromptConfigRaw;
    return serializeConfig(raw);
  }

  /**
   * Get version history
   */
  async getVersionHistory(
    service: string,
    language: string,
    promptId?: string,
    limit = 20
  ): Promise<PromptVersion[]> {
    let query = this.db
      .collection('promptVersions')
      .where('service', '==', service)
      .where('language', '==', language)
      .orderBy('changedAt', 'desc')
      .limit(limit);

    if (promptId) {
      query = query.where('promptId', '==', promptId);
    }

    const snapshot = await query.get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        changedAt: data.changedAt.toDate().toISOString(),
      } as PromptVersion;
    });
  }

  /**
   * Delete a prompt config
   */
  async deleteConfig(language: string, service: string): Promise<void> {
    const docRef = this.db
      .collection('promptConfigs')
      .doc(language)
      .collection('services')
      .doc(service);

    await docRef.delete();
  }

  /**
   * Get available services
   */
  getServices() {
    return PROMPT_SERVICES;
  }

  /**
   * Get supported languages
   */
  getLanguages() {
    return SUPPORTED_LANGUAGES;
  }
}

// Singleton instance
let promptServiceInstance: PromptService | null = null;

export function getPromptService(): PromptService {
  if (!promptServiceInstance) {
    promptServiceInstance = new PromptService();
  }
  return promptServiceInstance;
}
