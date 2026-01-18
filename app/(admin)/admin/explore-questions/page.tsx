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
} from '@/lib/models/ExploreQuestion';
import ExploreQuestionEditor from '@/components/admin/ExploreQuestionEditor';

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

export default function AdminExploreQuestionsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ExploreQuestion[]>([]);
  const [config, setConfig] = useState<ExploreQuestionsConfig | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<ExploreLanguageCode>('en');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResponse | null>(null);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editingQuestion, setEditingQuestion] = useState<ExploreQuestion | null>(null);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

          {/* Migrate Button */}
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {migrating ? 'Migrating...' : 'Migrate Default Questions'}
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

      {/* Migration Result */}
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
                  {/* Category Header */}
                  <div className="border-b border-gray-200 pb-2">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <span className="text-xl">{category.icon}</span>
                      {category.name}
                      <span className="text-sm font-normal text-gray-500">
                        ({category.questions.length})
                      </span>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">{category.description}</p>
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
                              className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 rounded-full"
                            >
                              {state}
                            </span>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                          <button
                            onClick={() => handleEditQuestion(question)}
                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                          >
                            Edit
                          </button>
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

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-blue-800 font-medium mb-2">How Explore Questions Work</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>1. Mobile app fetches questions from Firestore on app launch (cached for 24h)</li>
          <li>2. Questions are filtered by user&apos;s data state (NO_DATA, MINIMAL_DATA, etc.)</li>
          <li>3. Template variables like {'{{activity}}'} are replaced with user&apos;s actual data</li>
          <li>4. If Firestore is unavailable, app falls back to hardcoded JSON questions</li>
          <li>5. Changes made here will reflect in mobile app within 24 hours (or on cache refresh)</li>
        </ul>
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
    </div>
  );
}
