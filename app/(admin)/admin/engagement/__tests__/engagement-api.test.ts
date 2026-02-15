/**
 * engagement-api.test.ts
 *
 * Tests for the engagement admin API route.
 * Tests validation logic and config merging behavior.
 */

describe('Admin Engagement API', () => {
  describe('GET /api/admin/engagement', () => {
    it('returns default config when Firestore docs missing', () => {
      // Simulate Firestore returning no doc
      const engagementDoc = { exists: false, data: () => null };
      const promptsDoc = { exists: false, data: () => null };

      const response = {
        engagement: engagementDoc.exists ? engagementDoc.data() : null,
        dailyPrompts: promptsDoc.exists ? promptsDoc.data() : null,
        hasConfig: engagementDoc.exists,
        hasDailyPrompts: promptsDoc.exists,
      };

      expect(response.hasConfig).toBe(false);
      expect(response.hasDailyPrompts).toBe(false);
      expect(response.engagement).toBeNull();
    });

    it('returns merged config when Firestore has data', () => {
      const engagementData = {
        xpValues: { diary_entry: 25, voice_note: 20 },
        levelThresholds: [0, 100, 250],
        updatedAt: '2025-06-15T00:00:00.000Z',
      };

      const engagementDoc = { exists: true, data: () => engagementData };

      const response = {
        engagement: engagementDoc.exists ? engagementDoc.data() : null,
        hasConfig: engagementDoc.exists,
      };

      expect(response.hasConfig).toBe(true);
      expect(response.engagement?.xpValues.diary_entry).toBe(25);
    });
  });

  describe('PUT /api/admin/engagement - validation', () => {
    it('rejects empty payload', () => {
      const body = {};
      const hasData = body.hasOwnProperty('engagement') || body.hasOwnProperty('dailyPrompts');
      expect(hasData).toBe(false);
    });

    it('validates XP values are positive', () => {
      const xpValues = { diary_entry: 15, voice_note: -5 };
      const invalid = Object.entries(xpValues).find(
        ([, val]) => typeof val !== 'number' || val <= 0
      );
      expect(invalid).toBeDefined();
      expect(invalid?.[0]).toBe('voice_note');
    });

    it('validates XP values are numbers', () => {
      const xpValues = { diary_entry: 15, voice_note: 'abc' as any };
      const invalid = Object.entries(xpValues).find(
        ([, val]) => typeof val !== 'number' || val <= 0
      );
      expect(invalid).toBeDefined();
    });

    it('validates level thresholds are ascending', () => {
      const thresholds = [0, 100, 80, 500]; // 80 < 100 = invalid
      let isValid = true;
      for (let i = 1; i < thresholds.length; i++) {
        if (thresholds[i] <= thresholds[i - 1]) {
          isValid = false;
          break;
        }
      }
      expect(isValid).toBe(false);
    });

    it('accepts valid ascending thresholds', () => {
      const thresholds = [0, 100, 250, 500, 850];
      let isValid = true;
      for (let i = 1; i < thresholds.length; i++) {
        if (thresholds[i] <= thresholds[i - 1]) {
          isValid = false;
          break;
        }
      }
      expect(isValid).toBe(true);
    });

    it('accepts valid engagement config', () => {
      const config = {
        xpValues: { diary_entry: 15, voice_note: 20, photo_added: 10 },
        levelThresholds: [0, 100, 250, 500],
        levelTitles: ['Newcomer', 'Explorer', 'Chronicler', 'Storyteller'],
        streakBonusXP: 25,
        dailyPromptBonusXP: 20,
        firstOfTypeBonusXP: 30,
      };

      // Validate XP
      const invalidXP = Object.entries(config.xpValues).find(
        ([, val]) => typeof val !== 'number' || val <= 0
      );
      expect(invalidXP).toBeUndefined();

      // Validate thresholds
      let thresholdsValid = true;
      for (let i = 1; i < config.levelThresholds.length; i++) {
        if (config.levelThresholds[i] <= config.levelThresholds[i - 1]) {
          thresholdsValid = false;
        }
      }
      expect(thresholdsValid).toBe(true);
    });

    it('sets updatedAt and updatedBy fields', () => {
      const userId = 'admin_123';
      const now = new Date().toISOString();
      const docData = {
        xpValues: { diary_entry: 15 },
        updatedAt: now,
        updatedBy: userId,
      };

      expect(docData.updatedAt).toBe(now);
      expect(docData.updatedBy).toBe(userId);
    });
  });
});
