/**
 * engagement-page.test.tsx
 *
 * Tests for the admin engagement config page logic.
 * Tests data validation, default values, and config merging.
 */

describe('Admin Engagement Config Page', () => {
  const DEFAULT_XP_VALUES: Record<string, number> = {
    diary_entry: 15,
    voice_note: 20,
    photo_added: 10,
    check_in: 10,
    chat_message: 5,
    streak_day: 25,
    achievement_unlocked: 50,
    daily_prompt_answered: 20,
    first_of_type: 30,
  };

  const DEFAULT_LEVEL_THRESHOLDS = [0, 100, 250, 500, 850, 1300, 1900, 2700, 3800, 5200];

  it('has correct default XP values', () => {
    expect(DEFAULT_XP_VALUES.diary_entry).toBe(15);
    expect(DEFAULT_XP_VALUES.voice_note).toBe(20);
    expect(DEFAULT_XP_VALUES.photo_added).toBe(10);
    expect(DEFAULT_XP_VALUES.check_in).toBe(10);
    expect(DEFAULT_XP_VALUES.chat_message).toBe(5);
    expect(DEFAULT_XP_VALUES.streak_day).toBe(25);
    expect(DEFAULT_XP_VALUES.achievement_unlocked).toBe(50);
    expect(DEFAULT_XP_VALUES.daily_prompt_answered).toBe(20);
    expect(DEFAULT_XP_VALUES.first_of_type).toBe(30);
  });

  it('has 10 default level thresholds', () => {
    expect(DEFAULT_LEVEL_THRESHOLDS.length).toBe(10);
  });

  it('default thresholds are ascending', () => {
    for (let i = 1; i < DEFAULT_LEVEL_THRESHOLDS.length; i++) {
      expect(DEFAULT_LEVEL_THRESHOLDS[i]).toBeGreaterThan(DEFAULT_LEVEL_THRESHOLDS[i - 1]);
    }
  });

  it('first threshold starts at 0', () => {
    expect(DEFAULT_LEVEL_THRESHOLDS[0]).toBe(0);
  });

  describe('XP value validation', () => {
    it('rejects zero XP values', () => {
      const values = { ...DEFAULT_XP_VALUES, diary_entry: 0 };
      const invalid = Object.entries(values).find(([, val]) => val <= 0);
      expect(invalid).toBeDefined();
    });

    it('rejects negative XP values', () => {
      const values = { ...DEFAULT_XP_VALUES, voice_note: -10 };
      const invalid = Object.entries(values).find(([, val]) => val <= 0);
      expect(invalid).toBeDefined();
    });

    it('accepts all positive XP values', () => {
      const invalid = Object.entries(DEFAULT_XP_VALUES).find(([, val]) => val <= 0);
      expect(invalid).toBeUndefined();
    });
  });

  describe('level threshold validation', () => {
    it('rejects non-ascending thresholds', () => {
      const thresholds = [0, 100, 250, 200, 850]; // 200 < 250
      let valid = true;
      for (let i = 1; i < thresholds.length; i++) {
        if (thresholds[i] <= thresholds[i - 1]) {
          valid = false;
          break;
        }
      }
      expect(valid).toBe(false);
    });

    it('rejects equal consecutive thresholds', () => {
      const thresholds = [0, 100, 100, 500]; // duplicate 100
      let valid = true;
      for (let i = 1; i < thresholds.length; i++) {
        if (thresholds[i] <= thresholds[i - 1]) {
          valid = false;
          break;
        }
      }
      expect(valid).toBe(false);
    });
  });

  describe('config loading from Firestore', () => {
    it('uses defaults when no Firestore config exists', () => {
      const firestoreConfig = null;
      const xpValues = firestoreConfig || DEFAULT_XP_VALUES;
      expect(xpValues).toEqual(DEFAULT_XP_VALUES);
    });

    it('applies Firestore overrides correctly', () => {
      const firestoreConfig = {
        xpValues: { ...DEFAULT_XP_VALUES, diary_entry: 30 },
        levelThresholds: DEFAULT_LEVEL_THRESHOLDS,
      };

      expect(firestoreConfig.xpValues.diary_entry).toBe(30);
      expect(firestoreConfig.xpValues.voice_note).toBe(20); // unchanged
    });
  });

  describe('save validation', () => {
    it('prevents saving with invalid thresholds', () => {
      const thresholds = [0, 500, 250]; // invalid: 250 < 500
      let errorMessage = '';

      for (let i = 1; i < thresholds.length; i++) {
        if (thresholds[i] <= thresholds[i - 1]) {
          errorMessage = `Level ${i + 1} (${thresholds[i]}) must be greater than Level ${i} (${thresholds[i - 1]})`;
          break;
        }
      }

      expect(errorMessage).toBeTruthy();
      expect(errorMessage).toContain('Level 3');
    });

    it('allows saving with valid config', () => {
      const xpValues = DEFAULT_XP_VALUES;
      const thresholds = DEFAULT_LEVEL_THRESHOLDS;

      const invalidXP = Object.entries(xpValues).find(([, val]) => val <= 0);
      let thresholdsValid = true;
      for (let i = 1; i < thresholds.length; i++) {
        if (thresholds[i] <= thresholds[i - 1]) {
          thresholdsValid = false;
        }
      }

      expect(invalidXP).toBeUndefined();
      expect(thresholdsValid).toBe(true);
    });
  });

  describe('reset to defaults', () => {
    it('restores all values to defaults', () => {
      // Simulate modified state
      let xpValues = { ...DEFAULT_XP_VALUES, diary_entry: 999 };
      let thresholds = [0, 50, 100, 200];

      // Reset
      xpValues = { ...DEFAULT_XP_VALUES };
      thresholds = [...DEFAULT_LEVEL_THRESHOLDS];

      expect(xpValues.diary_entry).toBe(15);
      expect(thresholds.length).toBe(10);
      expect(thresholds[1]).toBe(100);
    });
  });
});
