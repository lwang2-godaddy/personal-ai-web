# Prompt Migration Guide

---
**Created By:** Claude Code
**Created Date:** January 2025
**Purpose:** Guide for migrating AI prompts from YAML files to Firestore
**Related Docs:** `PersonalAIApp/firebase/functions/docs/PROMPT_CONFIGURATION.md`
---

## Overview

This guide explains how to migrate AI prompts from YAML configuration files (stored in the Firebase Functions directory) to Firestore for dynamic management via the admin portal.

**Why Migrate?**
- Edit prompts without deploying code
- A/B test different prompt versions
- Track version history and audit changes
- Manage prompts across multiple languages
- Roll back to previous versions if needed

## Prerequisites

Before running the migration, ensure you have:

1. **Firebase Service Account Credentials** - One of:
   - `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env.local` (JSON string)
   - `GOOGLE_APPLICATION_CREDENTIALS` environment variable (path to JSON file)

2. **YAML Files Present** - Prompts should exist in:
   ```
   PersonalAIApp/firebase/functions/src/config/prompts/locales/
   ├── en/
   │   ├── analysis.yaml
   │   ├── chat.yaml
   │   ├── dailySummary.yaml
   │   ├── entityExtraction.yaml
   │   ├── events.yaml
   │   ├── lifeFeed.yaml
   │   ├── memory.yaml
   │   ├── rag.yaml
   │   └── suggestions.yaml
   └── es/
       └── ... (Spanish translations)
   ```

## Running the Migration

### From the personal-ai-web directory:

```bash
cd /path/to/personal-ai-web

# Migrate all YAML prompts to Firestore (skips existing)
node scripts/migrate-prompts.cjs

# Or to overwrite existing prompts
node scripts/migrate-prompts.cjs --overwrite

# Show help
node scripts/migrate-prompts.cjs --help
```

### Alternative (TypeScript version):

```bash
npx tsx scripts/migrate-prompts.ts
npx tsx scripts/migrate-prompts.ts --overwrite
```

## What the Script Does

1. **Reads YAML Files** - Scans all language directories for `.yaml` files
2. **Maps to Services** - Converts filenames to service names:

   | YAML File | Service Name |
   |-----------|--------------|
   | `analysis.yaml` | SentimentAnalysisService |
   | `chat.yaml` | OpenAIService |
   | `dailySummary.yaml` | DailySummaryService |
   | `entityExtraction.yaml` | EntityExtractionService |
   | `events.yaml` | EventExtractionService |
   | `lifeFeed.yaml` | LifeFeedGenerator |
   | `memory.yaml` | MemoryGeneratorService |
   | `rag.yaml` | RAGEngine |
   | `suggestions.yaml` | SuggestionEngine |

3. **Writes to Firestore** - Creates documents at:
   ```
   promptConfigs/{language}/services/{serviceName}
   ```

4. **Creates Version History** - Stores change records in:
   ```
   promptVersions/{versionId}
   ```

## Example Output

```
Starting prompt migration...

✅ Firebase initialized with project: personal-ai-12345

Found languages: en, es

📂 Processing EN...
  analysis.yaml -> SentimentAnalysisService... ✅ 1 prompts
  chat.yaml -> OpenAIService... ✅ 4 prompts
  dailySummary.yaml -> DailySummaryService... ✅ 5 prompts
  entityExtraction.yaml -> EntityExtractionService... ✅ 1 prompts
  events.yaml -> EventExtractionService... ✅ 2 prompts
  lifeFeed.yaml -> LifeFeedGenerator... ✅ 9 prompts
  memory.yaml -> MemoryGeneratorService... ✅ 1 prompts
  rag.yaml -> RAGEngine... ✅ 6 prompts
  suggestions.yaml -> SuggestionEngine... ✅ 2 prompts

📂 Processing ES...
  analysis.yaml -> SentimentAnalysisService... ⏭️  Already exists (use --overwrite)
  ...

========================================
📊 Migration Summary:
  ✅ Migrated: 9
  ⏭️  Skipped:  9
  ❌ Errors:   0

✨ Migration complete!

Next steps:
1. Visit /admin/prompts to see migrated prompts
2. Edit prompts as needed
3. Deploy Cloud Functions if not already done
```

## Firestore Document Structure

After migration, each service config is stored as:

```typescript
// Collection: promptConfigs/{language}/services/{serviceName}
{
  version: "1.0.0",
  language: "en",
  service: "DailySummaryService",
  lastUpdated: Timestamp,
  updatedBy: "migration-script",
  updateNotes: "Initial migration from YAML",
  enabled: true,
  status: "published",  // draft | published | archived
  prompts: {
    system: {
      id: "daily-summary-system",
      service: "DailySummaryService",
      type: "system",
      content: "You are a helpful assistant...",
      metadata: {
        model: "gpt-4o-mini",
        temperature: 0.7,
        maxTokens: 300
      }
    },
    daily_summary: { ... },
    weekly_summary: { ... }
  },
  createdAt: Timestamp,
  createdBy: "migration-script",
  publishedAt: Timestamp
}
```

## Version History

Each migration creates a version history entry:

```typescript
// Collection: promptVersions/{versionId}
{
  id: "abc123",
  language: "en",
  service: "DailySummaryService",
  promptId: "_all",  // "_all" for full config, or specific prompt ID
  previousContent: "",  // Empty for initial migration
  newContent: "{...}",  // JSON stringified prompts
  changedAt: Timestamp,
  changedBy: "migration-script",
  changeType: "create",  // create | update | delete | publish | unpublish
  changeNotes: "Initial migration from YAML"
}
```

## Post-Migration

After running the migration:

1. **Verify in Admin Portal** - Visit https://www.sircharge.ai/admin/prompts
2. **Test Prompts** - Ensure services load prompts correctly
3. **Edit as Needed** - Make changes via the admin UI
4. **Deploy Cloud Functions** - If you haven't already:
   ```bash
   cd PersonalAIApp/firebase/functions
   npm run deploy
   ```

## Troubleshooting

### "Error: No Firebase credentials found"

Ensure one of these is set:
```bash
# Option 1: In .env.local
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Option 2: Environment variable
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
```

### "Prompts directory not found"

Run the script from the `personal-ai-web` directory, and ensure the path to PersonalAIApp is correct:
```
personal-ai-web/
PersonalAIApp/
```

### "Already exists (use --overwrite)"

The prompt config already exists in Firestore. Use `--overwrite` to replace it:
```bash
node scripts/migrate-prompts.cjs --overwrite
```

### "Skipping unknown file"

The YAML file isn't mapped to a service. Add it to `FILE_TO_SERVICE` in:
- `scripts/migrate-prompts.ts`
- `scripts/migrate-prompts.cjs`

## Adding New Services

When adding a new AI service with prompts:

1. **Create YAML file** in `PersonalAIApp/firebase/functions/src/config/prompts/locales/en/`
2. **Register in loader.ts** - Add to `fileMap` in `firebase/functions/src/config/prompts/loader.ts`
3. **Register in admin portal** - Add to `PROMPT_SERVICES` in `personal-ai-web/lib/models/Prompt.ts`
4. **Add to migration scripts** - Update `FILE_TO_SERVICE` in both:
   - `scripts/migrate-prompts.ts`
   - `scripts/migrate-prompts.cjs`
5. **Run migration** - `node scripts/migrate-prompts.cjs`

## Security Notes

- Migration scripts use Firebase Admin SDK with elevated privileges
- Service account keys should never be committed to git
- Only users with `admin` role can access the prompts admin portal
- Firestore security rules protect prompt configs from unauthorized access
