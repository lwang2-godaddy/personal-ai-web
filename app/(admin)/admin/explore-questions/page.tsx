'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/client';
import {
  ExploreQuestion,
  EXPLORE_SUPPORTED_LANGUAGES,
  EXPLORE_CATEGORIES,
  ExploreLanguageCode,
  ExploreQuestionsConfig,
  ExploreCategory,
  UserDataState,
} from '@/lib/models/ExploreQuestion';
import ExploreQuestionEditor from '@/components/admin/ExploreQuestionEditor';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

/**
 * Category display rules - defines when each category appears
 * and what data requirements are needed
 */
const CATEGORY_DISPLAY_RULES: Record<
  ExploreCategory,
  {
    dataStates: UserDataState[];
    requirements: string;
    variableInfo?: string;
    description: string;
  }
> = {
  onboarding: {
    dataStates: ['NO_DATA'],
    requirements: 'None - action triggers for new users',
    description: 'These are action prompts, not AI queries. They help new users get started.',
  },
  activity: {
    dataStates: ['PARTIAL_DATA', 'RICH_DATA'],
    requirements: 'Location data with activities tagged',
    variableInfo: '{{activity}} → replaced with user\'s top 2 activities',
    description: 'Questions about user\'s activities from location visits.',
  },
  health: {
    dataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'],
    requirements: 'Health data (HealthKit/Google Fit)',
    variableInfo: '{{healthType}} → replaced with available health metrics',
    description: 'Questions about health data like steps, sleep, heart rate.',
  },
  location: {
    dataStates: ['PARTIAL_DATA', 'RICH_DATA'],
    requirements: 'Location tracking data',
    variableInfo: '{{place}} → replaced with frequent locations',
    description: 'Questions about places visited and location history.',
  },
  voice: {
    dataStates: ['PARTIAL_DATA', 'RICH_DATA'],
    requirements: 'Voice notes recorded',
    description: 'Questions about transcribed voice note content.',
  },
  photo: {
    dataStates: ['PARTIAL_DATA', 'RICH_DATA'],
    requirements: 'Photo memories saved',
    description: 'Questions about photo descriptions and memories.',
  },
  general: {
    dataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'],
    requirements: 'None - works with any data',
    description: 'General questions that work across all data types.',
  },
};

interface QuestionsResponse {
  questions: ExploreQuestion[];
  config: ExploreQuestionsConfig | null;
  total: number;
  languages: typeof EXPLORE_SUPPORTED_LANGUAGES;
  categories: typeof EXPLORE_CATEGORIES;
}

interface MigrationResponse {
  success: boolean;
  migrated: number;
  skipped: number;
  errors: { id: string; error: string }[];
}

interface AllLanguagesMigrationResult {
  totalMigrated: number;
  totalSkipped: number;
  totalErrors: number;
  byLanguage: { language: string; migrated: number; skipped: number; errors: number }[];
}

export default function AdminExploreQuestionsPage() {
  // Track page view
  useTrackPage(TRACKED_SCREENS.adminExploreQuestions);

  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ExploreQuestion[]>([]);
  const [config, setConfig] = useState<ExploreQuestionsConfig | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<ExploreLanguageCode>('en');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResponse | null>(null);
  const [migratingAll, setMigratingAll] = useState(false);
  const [allMigrationResult, setAllMigrationResult] = useState<AllLanguagesMigrationResult | null>(null);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editingQuestion, setEditingQuestion] = useState<ExploreQuestion | null>(null);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Copy to languages
  const [copyModalQuestion, setCopyModalQuestion] = useState<ExploreQuestion | null>(null);
  const [copying, setCopying] = useState(false);
  const [copyResult, setCopyResult] = useState<{
    success: boolean;
    copied: number;
    skipped: number;
    errors: number;
    results: { language: string; status: string; error?: string }[];
  } | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, [selectedLanguage, selectedCategory]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `/api/admin/explore-questions?language=${selectedLanguage}`;
      if (selectedCategory) {
        url += `&category=${selectedCategory}`;
      }

      const response = await apiGet<QuestionsResponse>(url);
      setQuestions(response.questions || []);
      setConfig(response.config || null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch questions';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    if (
      !confirm(
        'This will migrate default question templates to Firestore. Existing questions will be skipped. Continue?'
      )
    ) {
      return;
    }

    setMigrating(true);
    setMigrationResult(null);
    setError(null);

    try {
      const response = await apiPost<MigrationResponse>('/api/admin/explore-questions/migrate', {
        language: selectedLanguage,
        overwrite: false,
      });

      setMigrationResult(response);
      await fetchQuestions();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Migration failed';
      setError(message);
    } finally {
      setMigrating(false);
    }
  };

  const handleMigrateAll = async () => {
    if (
      !confirm(
        'This will migrate default question templates to Firestore for ALL 6 languages. Existing questions will be skipped. Continue?'
      )
    ) {
      return;
    }

    setMigratingAll(true);
    setAllMigrationResult(null);
    setMigrationResult(null);
    setError(null);

    const results: AllLanguagesMigrationResult = {
      totalMigrated: 0,
      totalSkipped: 0,
      totalErrors: 0,
      byLanguage: [],
    };

    try {
      for (const lang of EXPLORE_SUPPORTED_LANGUAGES) {
        try {
          const response = await apiPost<MigrationResponse>('/api/admin/explore-questions/migrate', {
            language: lang.code,
            overwrite: false,
          });

          results.totalMigrated += response.migrated;
          results.totalSkipped += response.skipped;
          results.totalErrors += response.errors.length;
          results.byLanguage.push({
            language: lang.code,
            migrated: response.migrated,
            skipped: response.skipped,
            errors: response.errors.length,
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          results.byLanguage.push({
            language: lang.code,
            migrated: 0,
            skipped: 0,
            errors: 1,
          });
          results.totalErrors += 1;
          console.error(`Migration failed for ${lang.code}:`, message);
        }
      }

      setAllMigrationResult(results);
      await fetchQuestions();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Migration failed';
      setError(message);
    } finally {
      setMigratingAll(false);
    }
  };

  const handleCreateQuestion = () => {
    setEditingQuestion(null);
    setEditorMode('create');
    setEditorOpen(true);
  };

  const handleEditQuestion = (question: ExploreQuestion) => {
    setEditingQuestion(question);
    setEditorMode('edit');
    setEditorOpen(true);
  };

  const handleSaveQuestion = async (questionData: Partial<ExploreQuestion>) => {
    if (editorMode === 'create') {
      await apiPost('/api/admin/explore-questions', {
        language: selectedLanguage,
        question: questionData,
      });
    } else if (editingQuestion) {
      await apiPut(`/api/admin/explore-questions/${editingQuestion.id}`, {
        language: selectedLanguage,
        updates: questionData,
      });
    }
    await fetchQuestions();
  };

  const handleDeleteQuestion = async (questionId: string) => {
    setDeleting(true);
    try {
      await apiDelete(`/api/admin/explore-questions/${questionId}?language=${selectedLanguage}`);
      setDeleteConfirmId(null);
      await fetchQuestions();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete question';
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleEnabled = async (question: ExploreQuestion) => {
    try {
      await apiPut(`/api/admin/explore-questions/${question.id}`, {
        language: selectedLanguage,
        updates: { enabled: !question.enabled },
      });
      await fetchQuestions();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update question';
      setError(message);
    }
  };

  const handleDuplicateQuestion = (question: ExploreQuestion) => {
    const duplicatedData: Partial<ExploreQuestion> = {
      ...question,
      id: undefined,
      labelKey: `${question.labelKey} (Copy)`,
      createdAt: undefined,
      createdBy: undefined,
      updatedAt: undefined,
      updatedBy: undefined,
    };
    setEditingQuestion(duplicatedData as ExploreQuestion);
    setEditorMode('create');
    setEditorOpen(true);
  };

  const handleCopyToAllLanguages = async (overwrite: boolean = false) => {
    if (!copyModalQuestion) return;

    const targetLanguages = EXPLORE_SUPPORTED_LANGUAGES.filter(
      (lang) => lang.code !== selectedLanguage
    ).map((lang) => lang.code);

    setCopying(true);
    setCopyResult(null);

    try {
      const response = await apiPost<{
        success: boolean;
        copied: number;
        skipped: number;
        errors: number;
        results: { language: string; status: string; error?: string }[];
      }>('/api/admin/explore-questions/copy-to-languages', {
        sourceLanguage: selectedLanguage,
        questionId: copyModalQuestion.id,
        targetLanguages,
        overwrite,
      });

      setCopyResult(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to copy question';
      setError(message);
    } finally {
      setCopying(false);
    }
  };

  // Group questions by category for display
  const questionsByCategory = EXPLORE_CATEGORIES.map((category) => ({
    ...category,
    questions: questions.filter((q) => q.category === category.id),
  })).filter((cat) => !selectedCategory || cat.id === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Explore Questions</h1>
          <p className="text-gray-600 mt-1">
            Manage suggested questions shown on mobile app&apos;s Explore/Chat screen
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Language Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Language:</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as ExploreLanguageCode)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-red-500 focus:border-red-500"
            >
              {EXPLORE_SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.code})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-red-500 focus:border-red-500"
            >
              <option value="">All Categories</option>
              {EXPLORE_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Migrate All Languages Button */}
          <button
            onClick={handleMigrateAll}
            disabled={migratingAll || migrating}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {migratingAll ? 'Migrating All...' : 'Migrate All Languages'}
          </button>

          {/* Migrate Current Language Button */}
          <button
            onClick={handleMigrate}
            disabled={migrating || migratingAll}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {migrating ? 'Migrating...' : `Migrate ${selectedLanguage.toUpperCase()}`}
          </button>

          {/* Create Button */}
          <button
            onClick={handleCreateQuestion}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
          >
            + Add Question
          </button>
        </div>
      </div>

      {/* All Languages Migration Result */}
      {allMigrationResult && (
        <div
          className={`p-4 rounded-lg border ${allMigrationResult.totalErrors === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}
        >
          <h3
            className={`font-medium mb-2 ${allMigrationResult.totalErrors === 0 ? 'text-green-800' : 'text-yellow-800'}`}
          >
            All Languages Migration {allMigrationResult.totalErrors === 0 ? 'Complete' : 'Completed with Issues'}
          </h3>
          <div className="text-sm space-y-2">
            <div className="flex gap-4">
              <span className="text-green-700">Migrated: {allMigrationResult.totalMigrated}</span>
              <span className="text-gray-600">Skipped: {allMigrationResult.totalSkipped}</span>
              {allMigrationResult.totalErrors > 0 && (
                <span className="text-red-700">Errors: {allMigrationResult.totalErrors}</span>
              )}
            </div>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {allMigrationResult.byLanguage.map((lang) => (
                <div
                  key={lang.language}
                  className={`p-2 rounded text-center text-xs ${
                    lang.errors > 0
                      ? 'bg-red-100 text-red-800'
                      : lang.migrated > 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="font-bold">{lang.language.toUpperCase()}</div>
                  <div>{lang.migrated} new</div>
                  <div>{lang.skipped} skip</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Single Language Migration Result */}
      {migrationResult && (
        <div
          className={`p-4 rounded-lg border ${migrationResult.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}
        >
          <h3
            className={`font-medium mb-2 ${migrationResult.success ? 'text-green-800' : 'text-yellow-800'}`}
          >
            Migration {migrationResult.success ? 'Complete' : 'Completed with Issues'}
          </h3>
          <div className="text-sm space-y-1">
            {migrationResult.migrated > 0 && (
              <p className="text-green-700">Migrated: {migrationResult.migrated} questions</p>
            )}
            {migrationResult.skipped > 0 && (
              <p className="text-gray-600">Skipped (already exist): {migrationResult.skipped}</p>
            )}
            {migrationResult.errors.length > 0 && (
              <div className="text-red-700">
                Errors:
                <ul className="list-disc list-inside ml-2">
                  {migrationResult.errors.map((err, i) => (
                    <li key={i}>
                      {err.id}: {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Config Info */}
      {config && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
          <div className="text-sm">
            <span className="text-gray-500">Version:</span>{' '}
            <span className="font-medium">{config.version}</span>
            <span className="mx-4 text-gray-300">|</span>
            <span className="text-gray-500">Last Updated:</span>{' '}
            <span className="font-medium">
              {config.lastUpdated
                ? new Date(config.lastUpdated).toLocaleString()
                : 'Never'}
            </span>
          </div>
          <div className="text-sm">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                config.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {config.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{questions.length}</div>
          <div className="text-sm text-gray-500">Total Questions</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {questions.filter((q) => q.enabled).length}
          </div>
          <div className="text-sm text-gray-500">Enabled</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-600">
            {questions.filter((q) => !q.enabled).length}
          </div>
          <div className="text-sm text-gray-500">Disabled</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {new Set(questions.map((q) => q.category)).size}
          </div>
          <div className="text-sm text-gray-500">Categories Used</div>
        </div>
      </div>

      {/* Display Logic Reference Section */}
      <div className="space-y-4">
        {/* Where Questions Appear */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span>📱</span> Where Questions Appear
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">📍</div>
                <div>
                  <div className="font-medium text-gray-900">Screen Location</div>
                  <div className="text-sm text-gray-600">
                    Mobile App → Explore/Chat Tab (empty state)
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-2xl">4️⃣</div>
                <div>
                  <div className="font-medium text-gray-900">Display Count</div>
                  <div className="text-sm text-gray-600">
                    Top 4 questions shown based on user&apos;s data
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-2xl">⏱️</div>
                <div>
                  <div className="font-medium text-gray-900">Cache / Refresh</div>
                  <div className="text-sm text-gray-600">
                    24h TTL • Pull-to-refresh or app restart
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Data States Reference */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span>👤</span> User Data States
              <span className="text-xs font-normal text-gray-500 ml-2">
                (determines which questions appear)
              </span>
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="border border-gray-200 rounded-lg p-3 text-center bg-gray-50">
                <div className="text-2xl mb-1">🆕</div>
                <div className="font-bold text-gray-900">NO_DATA</div>
                <div className="text-sm text-gray-600">0 points</div>
                <div className="text-xs text-gray-500 mt-1">New user</div>
              </div>
              <div className="border border-blue-200 rounded-lg p-3 text-center bg-blue-50">
                <div className="text-2xl mb-1">📊</div>
                <div className="font-bold text-blue-900">MINIMAL_DATA</div>
                <div className="text-sm text-blue-700">1-2 points</div>
                <div className="text-xs text-blue-600 mt-1">Just started</div>
              </div>
              <div className="border border-indigo-200 rounded-lg p-3 text-center bg-indigo-50">
                <div className="text-2xl mb-1">📈</div>
                <div className="font-bold text-indigo-900">PARTIAL_DATA</div>
                <div className="text-sm text-indigo-700">3-9 pts OR 1 cat</div>
                <div className="text-xs text-indigo-600 mt-1">Growing data</div>
              </div>
              <div className="border border-green-200 rounded-lg p-3 text-center bg-green-50">
                <div className="text-2xl mb-1">🌟</div>
                <div className="font-bold text-green-900">RICH_DATA</div>
                <div className="text-sm text-green-700">10+ pts AND 2+ cats</div>
                <div className="text-xs text-green-600 mt-1">Substantial data</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500 text-center">
              Data points = location + health + voice + photo + text notes
            </div>
          </div>
        </div>

        {/* Category Display Rules */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span>📂</span> Category Display Rules
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Category</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Shows For</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Requirements</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Variables</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {EXPLORE_CATEGORIES.map((cat) => {
                  const rules = CATEGORY_DISPLAY_RULES[cat.id];
                  return (
                    <tr key={cat.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <span className="font-medium">{cat.icon} {cat.name}</span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {rules.dataStates.map((state) => (
                            <span
                              key={state}
                              className={`px-1.5 py-0.5 text-xs rounded ${
                                state === 'NO_DATA'
                                  ? 'bg-gray-100 text-gray-700'
                                  : state === 'MINIMAL_DATA'
                                    ? 'bg-blue-100 text-blue-700'
                                    : state === 'PARTIAL_DATA'
                                      ? 'bg-indigo-100 text-indigo-700'
                                      : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {state.replace('_DATA', '')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{rules.requirements}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs font-mono">
                        {rules.variableInfo || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
          <p className="text-gray-500 mb-4">
            Get started by migrating default questions or creating new ones.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={handleMigrate}
              disabled={migrating}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Migrate Defaults
            </button>
            <button
              onClick={handleCreateQuestion}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
            >
              Create Question
            </button>
          </div>
        </div>
      ) : (
        /* Questions List by Category */
        <div className="space-y-6">
          {questionsByCategory.map(
            (category) =>
              category.questions.length > 0 && (
                <div key={category.id} className="space-y-4">
                  {/* Category Header with Display Rules */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <span className="text-xl">{category.icon}</span>
                        {category.name}
                        <span className="text-sm font-normal text-gray-500">
                          ({category.questions.length})
                        </span>
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                    </div>
                    {/* Display Rules Summary */}
                    <div className="px-4 py-2 bg-gray-50 flex flex-wrap items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-500">Shows for:</span>
                        <div className="flex gap-1">
                          {CATEGORY_DISPLAY_RULES[category.id].dataStates.map((state) => (
                            <span
                              key={state}
                              className={`px-1.5 py-0.5 rounded ${
                                state === 'NO_DATA'
                                  ? 'bg-gray-200 text-gray-700'
                                  : state === 'MINIMAL_DATA'
                                    ? 'bg-blue-100 text-blue-700'
                                    : state === 'PARTIAL_DATA'
                                      ? 'bg-indigo-100 text-indigo-700'
                                      : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {state.replace('_DATA', '')}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-500">Requires:</span>
                        <span className="text-gray-700">{CATEGORY_DISPLAY_RULES[category.id].requirements}</span>
                      </div>
                      {CATEGORY_DISPLAY_RULES[category.id].variableInfo && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500">Variables:</span>
                          <code className="text-gray-700 bg-gray-100 px-1 py-0.5 rounded">
                            {CATEGORY_DISPLAY_RULES[category.id].variableInfo}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Questions Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.questions.map((question) => (
                      <div
                        key={question.id}
                        className={`bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow ${
                          question.enabled ? 'border-gray-200' : 'border-orange-200 bg-orange-50'
                        }`}
                      >
                        {/* Question Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{question.icon}</span>
                            <div>
                              <div className="font-medium text-gray-900">{question.labelKey}</div>
                              <code className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                                {question.id}
                              </code>
                            </div>
                          </div>
                          <button
                            onClick={() => handleToggleEnabled(question)}
                            className={`px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                              question.enabled
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                            }`}
                          >
                            {question.enabled ? 'Enabled' : 'Disabled'}
                          </button>
                        </div>

                        {/* Query Template */}
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {question.queryTemplate}
                        </p>

                        {/* Metadata */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                            Priority: {question.priority}
                          </span>
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                            Order: {question.order}
                          </span>
                          {question.variables && question.variables.length > 0 && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                              Vars: {question.variables.join(', ')}
                            </span>
                          )}
                        </div>

                        {/* User Data States */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {question.userDataStates?.map((state) => (
                            <span
                              key={state}
                              className={`px-2 py-0.5 text-xs rounded-full ${
                                state === 'NO_DATA'
                                  ? 'bg-gray-100 text-gray-700'
                                  : state === 'MINIMAL_DATA'
                                    ? 'bg-blue-50 text-blue-700'
                                    : state === 'PARTIAL_DATA'
                                      ? 'bg-indigo-50 text-indigo-700'
                                      : 'bg-green-50 text-green-700'
                              }`}
                            >
                              {state}
                            </span>
                          ))}
                        </div>

                        {/* Data Requirements Badge */}
                        {question.requiresData && (
                          <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
                            <div className="text-xs font-medium text-amber-800 mb-1">
                              Data Requirements:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {question.requiresData.hasLocationData && (
                                <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                                  📍 Location
                                </span>
                              )}
                              {question.requiresData.hasHealthData && (
                                <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                                  ❤️ Health
                                </span>
                              )}
                              {question.requiresData.hasVoiceNotes && (
                                <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                                  🎙️ Voice
                                </span>
                              )}
                              {question.requiresData.hasPhotoMemories && (
                                <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                                  📸 Photo
                                </span>
                              )}
                              {question.requiresData.minActivityCount && (
                                <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                                  🏃 {question.requiresData.minActivityCount}+ activities
                                </span>
                              )}
                              {question.requiresData.healthTypes && question.requiresData.healthTypes.length > 0 && (
                                <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                                  Health: {question.requiresData.healthTypes.join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Variable Preview */}
                        {question.variables && question.variables.length > 0 && (
                          <div className="mb-3 p-2 bg-slate-50 border border-slate-200 rounded-md">
                            <div className="text-xs font-medium text-slate-700 mb-1">
                              Variable Substitution:
                            </div>
                            <div className="text-xs text-slate-600 font-mono">
                              {question.variables.map((v) => (
                                <div key={v} className="flex items-center gap-1">
                                  <span className="text-slate-400">{`{{${v}}}`}</span>
                                  <span className="text-slate-400">→</span>
                                  <span className="text-slate-600 italic">
                                    {v === 'activity' && 'e.g., "badminton", "gym"'}
                                    {v === 'healthType' && 'e.g., "steps", "sleep"'}
                                    {v === 'place' && 'e.g., "home", "office"'}
                                    {v === 'date' && 'e.g., "today", "last week"'}
                                    {!['activity', 'healthType', 'place', 'date'].includes(v) && `user's ${v}`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleEditQuestion(question)}
                              className="text-sm text-red-600 hover:text-red-700 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDuplicateQuestion(question)}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Duplicate
                            </button>
                            <button
                              onClick={() => {
                                setCopyModalQuestion(question);
                                setCopyResult(null);
                              }}
                              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                            >
                              Copy to All
                            </button>
                          </div>
                          {deleteConfirmId === question.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">Delete?</span>
                              <button
                                onClick={() => handleDeleteQuestion(question.id)}
                                disabled={deleting}
                                className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                              >
                                {deleting ? '...' : 'Yes'}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-sm text-gray-500 hover:text-gray-700"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(question.id)}
                              className="text-sm text-gray-500 hover:text-red-600"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
          )}
        </div>
      )}

      {/* Language Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Language Status</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {EXPLORE_SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelectedLanguage(lang.code)}
              className={`p-3 rounded-lg border text-center transition-colors ${
                selectedLanguage === lang.code
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">{lang.code.toUpperCase()}</div>
              <div className="text-xs text-gray-500">{lang.nativeName}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Info Panel - Question Flow Diagram */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
          <h3 className="font-semibold text-blue-900 flex items-center gap-2">
            <span>ℹ️</span> How Explore Questions Work
          </h3>
        </div>
        <div className="p-4">
          {/* Flow Diagram */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg overflow-x-auto">
            <div className="flex items-center justify-between min-w-[600px] text-xs">
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg mb-1">
                  📱
                </div>
                <div className="font-medium text-gray-900">App Launch</div>
                <div className="text-gray-500">User opens app</div>
              </div>
              <div className="flex-1 border-t-2 border-dashed border-gray-300 mx-2"></div>
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-lg mb-1">
                  🔥
                </div>
                <div className="font-medium text-gray-900">Firestore</div>
                <div className="text-gray-500">Fetch questions</div>
              </div>
              <div className="flex-1 border-t-2 border-dashed border-gray-300 mx-2"></div>
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-lg mb-1">
                  🔍
                </div>
                <div className="font-medium text-gray-900">Filter</div>
                <div className="text-gray-500">By data state</div>
              </div>
              <div className="flex-1 border-t-2 border-dashed border-gray-300 mx-2"></div>
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-lg mb-1">
                  🔄
                </div>
                <div className="font-medium text-gray-900">Substitute</div>
                <div className="text-gray-500">Variables → data</div>
              </div>
              <div className="flex-1 border-t-2 border-dashed border-gray-300 mx-2"></div>
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-lg mb-1">
                  ✨
                </div>
                <div className="font-medium text-gray-900">Display</div>
                <div className="text-gray-500">Top 4 shown</div>
              </div>
            </div>
          </div>

          {/* Key Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Data Flow</h4>
              <ul className="space-y-1 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Questions fetched from Firestore on app launch</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Cached locally for 24 hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Fallback to hardcoded JSON if Firestore unavailable</span>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Variable Substitution</h4>
              <ul className="space-y-1 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span><code className="bg-gray-100 px-1 rounded">{'{{activity}}'}</code> → user&apos;s top activities</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span><code className="bg-gray-100 px-1 rounded">{'{{healthType}}'}</code> → available health metrics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>Substitution happens client-side at display time</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Admin Note */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-start gap-2">
              <span className="text-amber-600">⚠️</span>
              <div className="text-sm text-amber-800">
                <strong>Admin Note:</strong> Changes made here will reflect in the mobile app within 24 hours (or immediately on pull-to-refresh / app restart).
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      <ExploreQuestionEditor
        question={editingQuestion}
        isOpen={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingQuestion(null);
        }}
        onSave={handleSaveQuestion}
        mode={editorMode}
      />

      {/* Copy to All Languages Modal */}
      {copyModalQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Copy to All Languages
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Copy "{copyModalQuestion.labelKey}" from {selectedLanguage.toUpperCase()} to all other languages
              </p>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              {/* Question Preview */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{copyModalQuestion.icon}</span>
                  <span className="font-medium">{copyModalQuestion.labelKey}</span>
                </div>
                <p className="text-sm text-gray-600">{copyModalQuestion.queryTemplate}</p>
              </div>

              {/* Target Languages */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Target Languages:</h3>
                <div className="flex flex-wrap gap-2">
                  {EXPLORE_SUPPORTED_LANGUAGES.filter(lang => lang.code !== selectedLanguage).map((lang) => (
                    <span
                      key={lang.code}
                      className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full"
                    >
                      {lang.code.toUpperCase()} - {lang.nativeName}
                    </span>
                  ))}
                </div>
              </div>

              {/* Copy Result */}
              {copyResult && (
                <div className={`p-4 rounded-lg mb-4 ${
                  copyResult.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <h4 className={`font-medium mb-2 ${
                    copyResult.success ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {copyResult.success ? 'Copy Complete!' : 'Copy Completed with Issues'}
                  </h4>
                  <div className="text-sm space-y-1">
                    <p className="text-green-700">Copied: {copyResult.copied}</p>
                    {copyResult.skipped > 0 && (
                      <p className="text-gray-600">Skipped: {copyResult.skipped}</p>
                    )}
                    {copyResult.errors > 0 && (
                      <p className="text-red-700">Errors: {copyResult.errors}</p>
                    )}
                  </div>
                  {/* Individual results */}
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {copyResult.results.map((result) => (
                      <div
                        key={result.language}
                        className={`p-2 rounded text-center text-xs ${
                          result.status === 'copied'
                            ? 'bg-green-100 text-green-800'
                            : result.status === 'skipped'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                        title={result.error || ''}
                      >
                        <div className="font-bold">{result.language.toUpperCase()}</div>
                        <div>{result.status === 'copied' ? '✓' : result.status === 'skipped' ? '—' : '✗'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning */}
              {!copyResult && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600">⚠️</span>
                    <div className="text-sm text-amber-800">
                      <strong>Note:</strong> This will copy the question text exactly.
                      Existing questions in other languages will be skipped unless you choose to overwrite.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setCopyModalQuestion(null);
                  setCopyResult(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {copyResult ? 'Close' : 'Cancel'}
              </button>
              {!copyResult && (
                <>
                  <button
                    type="button"
                    onClick={() => handleCopyToAllLanguages(false)}
                    disabled={copying}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {copying ? 'Copying...' : 'Copy (Skip Existing)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyToAllLanguages(true)}
                    disabled={copying}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {copying ? 'Copying...' : 'Overwrite All'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
