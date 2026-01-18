# Prompt Management System

## Overview

The Prompt Management System enables dynamic AI prompt configuration without requiring app deployments. Prompts are stored as YAML files in the codebase and can be migrated to Firestore for runtime editing via the admin portal.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Prompt Loading Flow                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Cloud Function / Mobile App                                     │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────┐                                            │
│  │  PromptLoader   │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐    Yes    ┌─────────────────┐              │
│  │ Check Firestore ├──────────►│ Return Firestore │              │
│  │ (enabled=true?) │           │     Prompts      │              │
│  └────────┬────────┘           └─────────────────┘              │
│           │ No                                                   │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ Load from YAML  │                                            │
│  │    (fallback)   │                                            │
│  └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Supported Languages

| Code | Language   | Native Name | Status   |
|------|------------|-------------|----------|
| en   | English    | English     | Complete |
| es   | Spanish    | Español     | Complete |
| fr   | French     | Français    | Complete |
| de   | German     | Deutsch     | Complete |
| it   | Italian    | Italiano    | Complete |
| pt   | Portuguese | Português   | Complete |
| zh   | Chinese    | 中文        | Complete |
| ja   | Japanese   | 日本語      | Complete |
| ko   | Korean     | 한국어      | Complete |

## Services and YAML Files

| Service                    | YAML File            | Category           |
|----------------------------|----------------------|-------------------|
| SentimentAnalysisService   | analysis.yaml        | Content Processing |
| EntityExtractionService    | entityExtraction.yaml| Content Processing |
| EventExtractionService     | events.yaml          | Content Processing |
| MemoryGeneratorService     | memory.yaml          | Content Processing |
| SuggestionEngine           | suggestions.yaml     | Proactive Features |
| LifeFeedGenerator          | lifeFeed.yaml        | Proactive Features |
| OpenAIService              | chat.yaml            | Chat & Conversations |
| RAGEngine                  | rag.yaml             | Chat & Conversations |
| QueryRAGServer             | rag.yaml             | Chat & Conversations |

## File Structure

```
PersonalAIApp/firebase/functions/src/config/prompts/
├── loader.ts                    # PromptLoader singleton
├── schemas.ts                   # TypeScript interfaces
└── locales/
    ├── en/                      # English (default)
    │   ├── analysis.yaml
    │   ├── chat.yaml
    │   ├── entityExtraction.yaml
    │   ├── events.yaml
    │   ├── lifeFeed.yaml
    │   ├── memory.yaml
    │   ├── rag.yaml
    │   └── suggestions.yaml
    ├── es/                      # Spanish
    ├── fr/                      # French
    ├── de/                      # German
    ├── it/                      # Italian
    ├── pt/                      # Portuguese
    ├── zh/                      # Chinese
    ├── ja/                      # Japanese
    └── ko/                      # Korean
```

## Firestore Structure

```
promptConfigs/
├── {language}/                  # e.g., "en", "es", "fr"
│   └── services/
│       └── {serviceName}/       # e.g., "SentimentAnalysisService"
│           ├── version: "1.0.0"
│           ├── language: "en"
│           ├── service: "SentimentAnalysisService"
│           ├── lastUpdated: "2025-01-17T..."
│           ├── updatedBy: "admin-uid"
│           ├── status: "published" | "draft" | "archived"
│           ├── enabled: true | false
│           └── prompts: { ... }

promptVersions/
└── {versionId}/                 # Audit trail
    ├── language: "en"
    ├── service: "SentimentAnalysisService"
    ├── promptId: "sentiment_analysis"
    ├── previousContent: "..."
    ├── newContent: "..."
    ├── changedAt: Timestamp
    ├── changedBy: "admin-uid"
    └── changeType: "create" | "update" | "delete"
```

## Migration Methods

### Method 1: Migration Script (Recommended)

The migration script reads YAML files directly and uploads to Firestore:

```bash
cd /path/to/personal-ai-web

# Migrate all languages (skip existing)
npx tsx scripts/migrate-prompts.ts

# Migrate all languages (overwrite existing)
npx tsx scripts/migrate-prompts.ts --overwrite

# Show help
npx tsx scripts/migrate-prompts.ts --help
```

**Prerequisites:**
- Set `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON string) or
- Set `GOOGLE_APPLICATION_CREDENTIALS` (path to service account file)
- Ensure `.env.local` has `NEXT_PUBLIC_FIREBASE_PROJECT_ID`

**What it does:**
1. Reads all YAML files from `PersonalAIApp/firebase/functions/src/config/prompts/locales/`
2. Parses each file and extracts prompts
3. Uploads to Firestore at `promptConfigs/{language}/services/{service}`
4. Creates version history entries in `promptVersions/`

### Method 2: Admin Portal UI

1. Navigate to `https://your-app.com/admin/prompts`
2. Select a language from the dropdown
3. Click on a service card to edit
4. Use "Migrate & Edit" for services not yet in Firestore

**Note:** The "Migrate YAML to Firestore" button in the admin portal currently only migrates 3 services (OpenAIService, RAGEngine, QueryRAGServer) with hardcoded English prompts. Use the migration script for full language support.

### Method 3: API Endpoint

```bash
# POST /api/admin/prompts/migrate
curl -X POST https://your-app.com/api/admin/prompts/migrate \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "configs": [
      {
        "language": "en",
        "service": "SentimentAnalysisService",
        "version": "1.0.0",
        "prompts": { ... }
      }
    ],
    "overwrite": false
  }'
```

## YAML File Format

```yaml
version: "1.0.0"
language: "en"
lastUpdated: "2025-01-17"
prompts:
  prompt_id:
    id: "unique-prompt-id"
    service: "ServiceName"
    type: "system" | "user" | "function"
    description: "What this prompt does"
    content: |
      Your prompt content here.

      Variables use Handlebars syntax: {{variableName}}

      Conditionals:
      {{#if condition}}
      Content when true
      {{/if}}
    metadata:
      model: "gpt-4o-mini"
      temperature: 0.7
      maxTokens: 500
      responseFormat: "json_object"  # Optional
      languageHints:                 # Optional
        - "Use casual language"
    variables:
      - name: "variableName"
        type: "string" | "number" | "boolean" | "object" | "array"
        required: true | false
        description: "What this variable is for"
```

## Admin Portal Features

### Service Management (`/admin/prompts`)

- View all services grouped by category
- See migration status (YAML Only, Draft, Published, Archived)
- View execution statistics (runs, cost)
- Switch between languages
- Quick access to edit prompts

### Prompt Editing (`/admin/prompts/{service}`)

- Edit prompt content with syntax highlighting
- Modify metadata (model, temperature, maxTokens)
- Add/remove variables
- Preview compiled prompts with test variables
- Publish/unpublish prompts
- View version history

### Execution Tracking

- Track API calls per prompt
- Monitor costs (input/output tokens)
- View latency metrics
- See error rates

## Usage in Code

### Cloud Functions

```typescript
import { PromptLoader } from '../../config/prompts';

class MyService {
  private promptLoader = PromptLoader.getInstance();

  async process(data: any, language: string = 'en') {
    // Load prompts for the service
    await this.promptLoader.loadPrompts('MyService', language);

    // Get compiled prompt with variables
    const prompt = this.promptLoader.getPrompt(
      'MyService',
      'my_prompt_id',
      {
        language,
        variables: {
          context: data.context,
          userInput: data.input
        },
      }
    );

    // Use prompt.content and prompt.metadata
    const response = await openai.chat.completions.create({
      model: prompt.metadata?.model || 'gpt-4o-mini',
      temperature: prompt.metadata?.temperature || 0.7,
      max_tokens: prompt.metadata?.maxTokens || 500,
      messages: [
        { role: 'system', content: prompt.content }
      ],
    });

    return response;
  }
}
```

### Mobile App

```typescript
import { PromptConfigService } from '@/services/config/PromptConfigService';

// Get user's preferred language
const language = user.preferences?.language || 'en';

// Load prompts
const promptService = PromptConfigService.getInstance();
const prompt = await promptService.getPrompt('OpenAIService', 'chat_completion', language);
```

## Caching

- **Firestore:** 1-hour TTL cache in Cloud Functions
- **YAML:** Loaded once at cold start, cached in memory
- **Admin changes:** Take effect within 1 hour (or immediately on function cold start)

## Best Practices

### Writing Prompts

1. **Be specific:** Include clear instructions and examples
2. **Use variables:** Don't hardcode user data, use `{{variableName}}`
3. **Set appropriate temperature:** Lower (0.3) for structured output, higher (0.8) for creative
4. **Limit tokens:** Set maxTokens to prevent runaway costs
5. **Add languageHints:** Help the model use appropriate language style

### Translation Guidelines

1. **Preserve variables:** Keep `{{variableName}}` unchanged
2. **Preserve JSON format:** Don't translate JSON keys in responseFormat prompts
3. **Cultural adaptation:** Adjust examples and idioms for the target language
4. **Test thoroughly:** Verify prompts work correctly in each language

### Security

1. **Admin only:** Migration and editing requires admin role
2. **Audit trail:** All changes logged in `promptVersions/`
3. **Kill switch:** Set `enabled: false` to revert to YAML fallback
4. **Version control:** YAML files are in git for rollback

## Troubleshooting

### Migration Script Fails

```bash
# Check Firebase credentials
echo $FIREBASE_SERVICE_ACCOUNT_KEY | head -c 50

# Check project ID
echo $NEXT_PUBLIC_FIREBASE_PROJECT_ID

# Run with verbose output
DEBUG=* npx tsx scripts/migrate-prompts.ts
```

### Prompts Not Loading from Firestore

1. Check `enabled: true` in Firestore document
2. Check `status: 'published'`
3. Verify language code matches exactly
4. Check Cloud Function logs for errors

### Admin Portal Shows "YAML Only"

- Prompts haven't been migrated to Firestore yet
- Run the migration script or click "Migrate & Edit"

## Related Documentation

- [Prompt Configuration (Cloud Functions)](../../PersonalAIApp/firebase/functions/docs/PROMPT_CONFIGURATION.md)
- [Admin Portal Guide](./ADMIN_PORTAL.md)
- [Firestore Security Rules](../../PersonalAIApp/firebase/firestore.rules)
