# Adding New Life Feed Post Types

This guide documents all files that must be updated when adding a new Life Feed post type.

## Overview

Life Feed posts are AI-generated social media-style posts about the user's activities, patterns, and milestones. Each post type has:
- A unique identifier (e.g., `activity_pattern`, `health_alert`)
- Display metadata (label, icon, description)
- Generation logic (prompts, cooldowns, eligibility rules)
- UI integration (filters, preferences)

## Checklist

When adding a new post type, update **ALL** of the following files:

### 1. Cloud Functions (Firebase)

#### `firebase/functions/src/services/LifeFeedGenerator.ts`
- [ ] Add to `LifeFeedPostType` union type
- [ ] Add to `ALL_POST_TYPES` array
- [ ] Add to `PROMPT_VARIANTS` mapping (if multiple prompt styles)
- [ ] Add to `LifeFeedCooldowns` object (days between posts)
- [ ] Add to `LifeFeedEnabledTypes` default object
- [ ] Update `isPostTypeEligible()` method (eligibility conditions)
- [ ] Update `getPostTypeContext()` method (data context for AI)

#### `firebase/functions/src/services/config/InsightsConfigLoader.ts`
- [ ] Add to `InsightsPostType` union type
- [ ] Add default config in `DEFAULT_POST_TYPES_CONFIG.postTypes`:
```typescript
your_new_type: {
  enabled: true,
  displayName: 'Display Name',
  icon: '🎯',
  description: 'Description of this post type',
  cooldownDays: 7,
  priority: 5,       // Higher = more important (1-10)
  defaultCategory: 'general', // or 'activity', 'health', 'achievement', 'memory'
  minConfidence: 0.7,
  maxPerDay: 1,
},
```

#### `firebase/functions/src/services/integration/InsightsIntegrationService.ts`
- [ ] Add to `cooldowns` object in `getPostTypeCooldowns()` method:
```typescript
your_new_type: postTypesConfig.postTypes.your_new_type?.cooldownDays ?? 7,
```

#### `firebase/functions/src/config/prompts/locales/en/lifeFeed.yaml`
- [ ] Add prompt template(s) for the new type:
```yaml
your_new_type:
  id: "your-new-type-post"
  service: "LifeFeedGenerator"
  type: "user"
  description: "Prompt description"
  content: |
    Write a tweet about...

    My recent data:
    {{context}}

    Write the post:
  variables:
    - name: "context"
      type: "string"
      required: true
      description: "User's relevant data"
```

### 2. Mobile App (PersonalAIApp)

#### `src/models/LifeFeedPost.ts`
- [ ] Add to `LifeFeedPostType` union type
- [ ] Update `getPostTypeLabel()` function
- [ ] Update `getPostTypeIcon()` function
- [ ] Add to `LifeFeedPreferences.enabledTypes` default

#### `src/screens/lifeFeed/LifeFeedScreen.tsx`
- [ ] Add to `getPostTypeLabel()` mapping:
```typescript
your_new_type: 'common:life_feed_type_your_new_type',
```
- [ ] Add to `typeCounts` useMemo initial values:
```typescript
your_new_type: 0,
```

#### `src/locales/en/common.json`
- [ ] Add translation keys:
```json
"post_type_your_new_type": "Your Type Label",
"life_feed_type_your_new_type": "Your Type"
```

#### `src/locales/zh/common.json`
- [ ] Add Chinese translations:
```json
"post_type_your_new_type": "中文标签",
"life_feed_type_your_new_type": "中文"
```

### 3. Web Admin (personal-ai-web)

#### `scripts/migrate-all-prompts-i18n.ts`
- [ ] Add translations to `Translations` interface
- [ ] Add translations for all 9 languages (en, zh, ja, ko, es, fr, de, it, pt)
- [ ] Add prompts to `buildLifeFeedGeneratorDoc()` function

---

## Example: Adding `activity_pattern` and `health_alert`

Here's the complete diff for adding two new post types:

### LifeFeedGenerator.ts changes:

```typescript
// 1. Type definition
type LifeFeedPostType =
  | 'life_summary'
  // ... existing types ...
  | 'activity_pattern'   // NEW
  | 'health_alert';      // NEW

// 2. All post types array
const ALL_POST_TYPES: LifeFeedPostType[] = [
  // ... existing types ...
  'activity_pattern',
  'health_alert',
];

// 3. Prompt variants (if needed)
const PROMPT_VARIANTS: Record<LifeFeedPostType, string[]> = {
  // ... existing types ...
  activity_pattern: ['activity_pattern'],
  health_alert: ['health_alert'],
};

// 4. Cooldowns
const LifeFeedCooldowns: Record<LifeFeedPostType, number> = {
  // ... existing types ...
  activity_pattern: 7,  // 7 days between pattern posts
  health_alert: 1,      // 1 day between health alerts
};

// 5. Default enabled types
const LifeFeedEnabledTypes: Record<LifeFeedPostType, boolean> = {
  // ... existing types ...
  activity_pattern: true,
  health_alert: true,
};
```

### InsightsConfigLoader.ts changes:

```typescript
// 1. Type definition
export type InsightsPostType =
  | 'life_summary'
  // ... existing types ...
  | 'activity_pattern'
  | 'health_alert';

// 2. Default config
const DEFAULT_POST_TYPES_CONFIG: InsightsPostTypesConfig = {
  // ...
  postTypes: {
    // ... existing types ...
    activity_pattern: {
      enabled: true,
      displayName: 'Pattern',
      icon: '📊',
      description: 'Discovered activity patterns',
      cooldownDays: 7,
      priority: 6,
      defaultCategory: 'activity',
      minConfidence: 0.7,
      maxPerDay: 1,
    },
    health_alert: {
      enabled: true,
      displayName: 'Alert',
      icon: '⚠️',
      description: 'Health metric anomaly alerts',
      cooldownDays: 1,
      priority: 9,
      defaultCategory: 'health',
      minConfidence: 0.8,
      maxPerDay: 2,
    },
  },
};
```

---

## Testing

After making all changes:

1. **Build Cloud Functions:**
   ```bash
   cd PersonalAIApp/firebase/functions
   npm run build
   ```
   Fix any TypeScript errors before deploying.

2. **Deploy Functions:**
   ```bash
   firebase deploy --only functions
   ```

3. **Run Prompt Migration (if prompts added):**
   ```bash
   cd personal-ai-web
   npx tsx scripts/migrate-all-prompts-i18n.ts
   ```

4. **Rebuild Mobile App:**
   The user builds manually - verify filter bar shows new types.

---

## Common Mistakes

1. **Forgetting `InsightsConfigLoader.ts`** - This will cause TypeScript build errors because `InsightsPostType` is used for cooldown configuration.

2. **Forgetting `LifeFeedScreen.tsx`** - New types won't appear in the filter bar.

3. **Forgetting translations** - Labels will show raw keys like `common:life_feed_type_your_new_type`.

4. **Mismatched type names** - Ensure the string literal is identical across all files (e.g., `activity_pattern` not `activityPattern`).

---

## File Reference Summary

| Location | File | What to Update |
|----------|------|----------------|
| Functions | `LifeFeedGenerator.ts` | Type, arrays, cooldowns, eligibility, context |
| Functions | `InsightsConfigLoader.ts` | Type, default config |
| Functions | `InsightsIntegrationService.ts` | Cooldowns object |
| Functions | `lifeFeed.yaml` | AI prompts |
| Mobile | `LifeFeedPost.ts` | Type, label/icon functions, preferences |
| Mobile | `LifeFeedScreen.tsx` | Filter labels, type counts |
| Mobile | `en/common.json` | English translations |
| Mobile | `zh/common.json` | Chinese translations |
| Web | `migrate-all-prompts-i18n.ts` | All language prompts |
