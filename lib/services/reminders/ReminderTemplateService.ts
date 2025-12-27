import FirestoreService from '@/lib/api/firebase/firestore';

export interface ReminderTemplate {
  id: string;
  userId: string;
  name: string;
  description?: string;
  timings: number[]; // Array of minutes before event
  eventTypes: string[]; // Event types this template applies to
  isDefault: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ReminderTemplateService - Web version
 * Manages reusable reminder templates
 */
export class ReminderTemplateService {
  private static instance: ReminderTemplateService;

  private constructor() {}

  static getInstance(): ReminderTemplateService {
    if (!ReminderTemplateService.instance) {
      ReminderTemplateService.instance = new ReminderTemplateService();
    }
    return ReminderTemplateService.instance;
  }

  /**
   * Get all templates for current user
   */
  async getUserTemplates(userId: string): Promise<ReminderTemplate[]> {
    try {
      const templates = await FirestoreService.queryCollection<ReminderTemplate>(
        'reminder_templates',
        [
          { field: 'userId', operator: '==', value: userId },
        ],
        { field: 'usageCount', direction: 'desc' }
      );

      return templates;
    } catch (error) {
      console.error('Error getting user templates:', error);
      throw new Error('Failed to get templates');
    }
  }

  /**
   * Get templates for specific event type
   */
  async getApplicableTemplates(userId: string, eventType: string): Promise<ReminderTemplate[]> {
    try {
      const allTemplates = await this.getUserTemplates(userId);

      return allTemplates.filter(
        (template) =>
          template.eventTypes.includes('all') ||
          template.eventTypes.includes(eventType)
      );
    } catch (error) {
      console.error('Error getting applicable templates:', error);
      throw new Error('Failed to get applicable templates');
    }
  }

  /**
   * Create new template
   */
  async createTemplate(
    userId: string,
    template: Omit<ReminderTemplate, 'id' | 'userId' | 'usageCount' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const newTemplate: Omit<ReminderTemplate, 'id'> = {
        ...template,
        userId,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const id = await FirestoreService.addDocument('reminder_templates', newTemplate);
      return id;
    } catch (error) {
      console.error('Error creating template:', error);
      throw new Error('Failed to create template');
    }
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<Omit<ReminderTemplate, 'id' | 'userId' | 'createdAt'>>
  ): Promise<void> {
    try {
      await FirestoreService.updateDocument('reminder_templates', templateId, {
        ...updates,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating template:', error);
      throw new Error('Failed to update template');
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      await FirestoreService.deleteDocument('reminder_templates', templateId);
    } catch (error) {
      console.error('Error deleting template:', error);
      throw new Error('Failed to delete template');
    }
  }

  /**
   * Apply template to generate reminders
   */
  applyTemplate(template: ReminderTemplate): Array<{
    id: string;
    type: 'custom';
    timing: number;
    status: 'pending';
  }> {
    return template.timings.map((timing) => ({
      id: this.generateUUID(),
      type: 'custom' as const,
      timing,
      status: 'pending' as const,
    }));
  }

  /**
   * Increment usage count
   */
  async incrementUsageCount(templateId: string): Promise<void> {
    try {
      const template = await FirestoreService.getDocument<ReminderTemplate>(
        'reminder_templates',
        templateId
      );

      if (template) {
        await FirestoreService.updateDocument('reminder_templates', templateId, {
          usageCount: template.usageCount + 1,
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error incrementing usage count:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Format template for display
   */
  formatTemplate(template: ReminderTemplate): string {
    const timingStrings = template.timings.map((timing) => {
      if (timing < 60) return `${timing}m`;
      if (timing < 1440) return `${Math.floor(timing / 60)}h`;
      if (timing < 10080) return `${Math.floor(timing / 1440)}d`;
      return `${Math.floor(timing / 10080)}w`;
    });

    return timingStrings.join(', ');
  }

  /**
   * Get default templates (predefined)
   */
  getDefaultTemplates(): Array<Omit<ReminderTemplate, 'id' | 'userId' | 'usageCount' | 'createdAt' | 'updatedAt'>> {
    return [
      {
        name: 'Work Meetings',
        description: 'For professional meetings and appointments',
        timings: [1440, 60, 15],
        eventTypes: ['meeting', 'appointment'],
        isDefault: true,
      },
      {
        name: 'Personal Tasks',
        description: 'For todos and personal reminders',
        timings: [1440, 60],
        eventTypes: ['todo', 'reminder'],
        isDefault: true,
      },
      {
        name: 'Important Events',
        description: 'For critical events requiring multiple reminders',
        timings: [10080, 2880, 1440, 60],
        eventTypes: ['all'],
        isDefault: false,
      },
      {
        name: 'Quick Reminder',
        description: 'Single reminder shortly before event',
        timings: [15],
        eventTypes: ['all'],
        isDefault: false,
      },
    ];
  }

  /**
   * Generate UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

export default ReminderTemplateService.getInstance();
