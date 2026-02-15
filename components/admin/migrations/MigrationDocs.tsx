'use client';

import { useState } from 'react';

/**
 * In-app documentation for the Migrations Admin Page
 */
export default function MigrationDocs() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('overview');

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'running', label: 'Running Migrations' },
    { id: 'adding', label: 'Adding New Migrations' },
    { id: 'api', label: 'API Reference' },
    { id: 'troubleshooting', label: 'Troubleshooting' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">📚</span>
          <h2 className="text-lg font-semibold text-gray-900">Documentation</h2>
        </div>
        <span className="text-gray-500">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {/* Content - Expandable */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Section Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeSection === section.id
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>

          {/* Section Content */}
          <div className="p-6">
            {activeSection === 'overview' && <OverviewSection />}
            {activeSection === 'running' && <RunningSection />}
            {activeSection === 'adding' && <AddingSection />}
            {activeSection === 'api' && <ApiSection />}
            {activeSection === 'troubleshooting' && <TroubleshootingSection />}
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewSection() {
  return (
    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Overview</h3>
      <p className="text-gray-600 mb-4">
        The Migrations Admin Page allows you to manage data migrations across your user base.
        Migrations are used to update user data schemas, initialize default values, clean up
        orphaned data, and more.
      </p>

      <h4 className="font-medium text-gray-900 mt-4 mb-2">Key Features</h4>
      <ul className="list-disc pl-5 space-y-1 text-gray-600">
        <li><strong>Registry Pattern</strong> - New migrations auto-appear by adding to config</li>
        <li><strong>Dry Run Mode</strong> - Test migrations without making changes</li>
        <li><strong>Real-time Progress</strong> - Track progress with 2-second polling</li>
        <li><strong>Run History</strong> - View all past runs with error details</li>
        <li><strong>Resume Support</strong> - Continue partial migrations from last user</li>
        <li><strong>Cancellation</strong> - Stop running migrations safely</li>
      </ul>

      <h4 className="font-medium text-gray-900 mt-4 mb-2">Migration Categories</h4>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span>👤</span> <strong>User Data</strong> - User profile updates
        </div>
        <div className="flex items-center gap-2">
          <span>🔒</span> <strong>Privacy</strong> - Privacy settings migrations
        </div>
        <div className="flex items-center gap-2">
          <span>🔔</span> <strong>Notifications</strong> - Notification preferences
        </div>
        <div className="flex items-center gap-2">
          <span>🧹</span> <strong>Cleanup</strong> - Data cleanup operations
        </div>
      </div>

      <h4 className="font-medium text-gray-900 mt-4 mb-2">Data Flow</h4>
      <div className="bg-gray-50 p-3 rounded-md text-xs font-mono">
        <p>1. Admin triggers migration with options</p>
        <p>2. API creates MigrationRun document in Firestore</p>
        <p>3. Cloud Function is invoked asynchronously</p>
        <p>4. Function processes users in batches, updating progress</p>
        <p>5. UI polls progress endpoint every 2 seconds</p>
        <p>6. On completion, result is stored in MigrationRun</p>
      </div>
    </div>
  );
}

function RunningSection() {
  return (
    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Running Migrations</h3>

      <h4 className="font-medium text-gray-900 mt-4 mb-2">Step 1: Check Status</h4>
      <p className="text-gray-600 mb-2">
        Before running a migration, click &quot;Check Status&quot; to see:
      </p>
      <ul className="list-disc pl-5 space-y-1 text-gray-600">
        <li>Total users in the system</li>
        <li>Users already processed by this migration</li>
        <li>Users remaining to be processed</li>
        <li>Estimated completion time</li>
      </ul>

      <h4 className="font-medium text-gray-900 mt-4 mb-2">Step 2: Configure Options</h4>
      <p className="text-gray-600 mb-2">
        Each migration has configurable options:
      </p>
      <ul className="list-disc pl-5 space-y-1 text-gray-600">
        <li><strong>Dry Run</strong> - Simulate without making changes (recommended first)</li>
        <li><strong>Batch Size</strong> - Users per batch (10-500, default 100)</li>
        <li><strong>Resume From</strong> - Start after a specific user ID (for resuming)</li>
      </ul>

      <h4 className="font-medium text-gray-900 mt-4 mb-2">Step 3: Start Migration</h4>
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
        <p className="text-sm text-blue-800">
          <strong>Best Practice:</strong> Always run a dry run first to verify what will be affected,
          then run the actual migration with dry run disabled.
        </p>
      </div>

      <h4 className="font-medium text-gray-900 mt-4 mb-2">Step 4: Monitor Progress</h4>
      <p className="text-gray-600 mb-2">
        While running, you&apos;ll see:
      </p>
      <ul className="list-disc pl-5 space-y-1 text-gray-600">
        <li>Progress bar with percentage complete</li>
        <li>Current phase (e.g., &quot;Processing users...&quot;)</li>
        <li>Users processed / total</li>
        <li>Elapsed time</li>
      </ul>

      <h4 className="font-medium text-gray-900 mt-4 mb-2">Cancelling a Migration</h4>
      <p className="text-gray-600">
        Click &quot;Cancel&quot; to stop a running migration. The run will be marked as &quot;cancelled&quot;
        and you can resume from the last processed user later.
      </p>
    </div>
  );
}

function AddingSection() {
  return (
    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Adding New Migrations</h3>

      <p className="text-gray-600 mb-4">
        To add a new migration, you need to do two things:
      </p>

      <h4 className="font-medium text-gray-900 mt-4 mb-2">1. Deploy the Cloud Function</h4>
      <p className="text-gray-600 mb-2">
        Create a Firebase Cloud Function that handles the migration:
      </p>
      <pre className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs overflow-x-auto">
{`// firebase/functions/src/migrations/yourMigration.ts
import { onCall } from 'firebase-functions/v2/https';

export const migrateYourFeature = onCall(async (request) => {
  const { runId, options, triggeredBy } = request.data;
  const db = getFirestore();

  // Update progress in Firestore
  await db.collection('migrationRuns').doc(runId).update({
    progress: { current: 0, total: 100, phase: 'Starting...' }
  });

  // Process users in batches
  // ... your migration logic

  // Update completion status
  await db.collection('migrationRuns').doc(runId).update({
    status: 'completed',
    completedAt: new Date().toISOString(),
    result: {
      success: true,
      usersProcessed: 100,
      usersCreated: 50,
      usersSkipped: 50,
      errors: []
    }
  });
});`}
      </pre>

      <h4 className="font-medium text-gray-900 mt-4 mb-2">2. Add to Registry</h4>
      <p className="text-gray-600 mb-2">
        Edit <code className="bg-gray-100 px-1 rounded">lib/registry/migrations.ts</code>:
      </p>
      <pre className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs overflow-x-auto">
{`// lib/registry/migrations.ts
export const MIGRATION_REGISTRY: MigrationDefinition[] = [
  // ... existing migrations
  {
    id: 'yourMigration',
    name: 'Your Migration Name',
    description: 'What this migration does...',
    category: 'user_data', // or: privacy, notifications, cleanup, other
    type: 'callable',
    endpoint: 'migrateYourFeature', // Cloud Function name
    options: [
      {
        key: 'dryRun',
        type: 'boolean',
        label: 'Dry Run',
        description: 'Simulate without changes',
        default: true,
      },
      {
        key: 'batchSize',
        type: 'number',
        label: 'Batch Size',
        default: 100,
        min: 10,
        max: 500,
      },
    ],
    supportsDryRun: true,
    supportsResume: true,
    destructive: false, // Set true for deletion operations
  },
];`}
      </pre>

      <h4 className="font-medium text-gray-900 mt-4 mb-2">Option Types</h4>
      <ul className="list-disc pl-5 space-y-1 text-gray-600 text-sm">
        <li><strong>boolean</strong> - Checkbox (e.g., dry run toggle)</li>
        <li><strong>number</strong> - Number input with min/max (e.g., batch size)</li>
        <li><strong>string</strong> - Text input (e.g., resume cursor)</li>
        <li><strong>select</strong> - Dropdown with predefined options</li>
      </ul>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-4">
        <p className="text-sm text-yellow-800">
          <strong>Important:</strong> The Cloud Function must update the <code>migrationRuns</code> document
          with progress and result for the UI to display correctly.
        </p>
      </div>
    </div>
  );
}

function ApiSection() {
  return (
    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">API Reference</h3>

      <h4 className="font-medium text-gray-900 mt-4 mb-2">Endpoints</h4>
      <div className="space-y-4">
        <ApiEndpoint
          method="GET"
          path="/api/admin/migrations"
          description="List all migrations with stats and recent runs"
          response="{ migrations, activeMigrations, totalRuns }"
        />
        <ApiEndpoint
          method="GET"
          path="/api/admin/migrations/[id]"
          description="Get migration details with recent runs"
          response="{ migration, stats, recentRuns }"
        />
        <ApiEndpoint
          method="POST"
          path="/api/admin/migrations/[id]"
          description="Trigger migration with options"
          body="{ options: { dryRun, batchSize, startAfterUserId } }"
          response="{ success, runId, message }"
        />
        <ApiEndpoint
          method="GET"
          path="/api/admin/migrations/[id]/status"
          description="Get pre-migration status check"
          response="{ totalUsers, usersProcessed, usersRemaining, percentComplete }"
        />
        <ApiEndpoint
          method="GET"
          path="/api/admin/migrations/[id]/runs"
          description="Get run history for migration"
          response="{ runs, total, hasMore }"
        />
        <ApiEndpoint
          method="GET"
          path="/api/admin/migrations/[id]/runs/[runId]/progress"
          description="Get progress for polling"
          response="{ status, progress, result, durationMs }"
        />
        <ApiEndpoint
          method="DELETE"
          path="/api/admin/migrations/[id]/runs/[runId]"
          description="Cancel running migration"
          response="{ success, message }"
        />
      </div>

      <h4 className="font-medium text-gray-900 mt-6 mb-2">Firestore Collections</h4>
      <div className="bg-gray-50 p-3 rounded-md text-sm">
        <p className="font-mono text-gray-700 mb-2">
          <strong>migrationRuns</strong> - Stores all migration run history
        </p>
        <pre className="text-xs text-gray-600">
{`{
  id: string,
  migrationId: string,
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled' | 'partial',
  startedAt: string (ISO),
  completedAt?: string (ISO),
  durationMs?: number,
  options: { dryRun, batchSize, startAfterUserId },
  progress?: { current, total, phase },
  result?: {
    success: boolean,
    usersProcessed: number,
    usersCreated: number,
    usersSkipped: number,
    errors: [{ userId?, message, timestamp }],
    lastProcessedUserId?: string
  },
  triggeredBy: string (uid),
  triggeredByEmail?: string
}`}
        </pre>
      </div>
    </div>
  );
}

function ApiEndpoint({
  method,
  path,
  description,
  body,
  response,
}: {
  method: string;
  path: string;
  description: string;
  body?: string;
  response: string;
}) {
  const methodColor =
    method === 'GET'
      ? 'bg-green-100 text-green-800'
      : method === 'POST'
        ? 'bg-blue-100 text-blue-800'
        : method === 'DELETE'
          ? 'bg-red-100 text-red-800'
          : 'bg-gray-100 text-gray-800';

  return (
    <div className="bg-gray-50 rounded-md p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${methodColor}`}>
          {method}
        </span>
        <code className="text-sm font-mono text-gray-700">{path}</code>
      </div>
      <p className="text-sm text-gray-600 mb-2">{description}</p>
      {body && (
        <p className="text-xs text-gray-500">
          <strong>Body:</strong> <code>{body}</code>
        </p>
      )}
      <p className="text-xs text-gray-500">
        <strong>Response:</strong> <code>{response}</code>
      </p>
    </div>
  );
}

function TroubleshootingSection() {
  return (
    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Troubleshooting</h3>

      <h4 className="font-medium text-gray-900 mt-4 mb-2">Migration stuck at &quot;Running&quot;</h4>
      <ul className="list-disc pl-5 space-y-1 text-gray-600">
        <li>Check Cloud Function logs: <code>firebase functions:log --only functionName</code></li>
        <li>Verify the function is updating progress in Firestore</li>
        <li>Cancel the run and check for errors in the run details</li>
      </ul>

      <h4 className="font-medium text-gray-900 mt-4 mb-2">Migration not appearing in UI</h4>
      <ul className="list-disc pl-5 space-y-1 text-gray-600">
        <li>Ensure the migration is added to <code>MIGRATION_REGISTRY</code></li>
        <li>Check for TypeScript errors in the registry file</li>
        <li>Refresh the page or restart the dev server</li>
      </ul>

      <h4 className="font-medium text-gray-900 mt-4 mb-2">Cloud Function not triggering</h4>
      <ul className="list-disc pl-5 space-y-1 text-gray-600">
        <li>Verify the <code>endpoint</code> name matches the deployed function</li>
        <li>Check Firebase Functions are deployed: <code>firebase deploy --only functions</code></li>
        <li>Ensure the function is exported in <code>index.ts</code></li>
      </ul>

      <h4 className="font-medium text-gray-900 mt-4 mb-2">Progress not updating</h4>
      <ul className="list-disc pl-5 space-y-1 text-gray-600">
        <li>Ensure Cloud Function is updating the <code>progress</code> field in Firestore</li>
        <li>Check browser console for API errors</li>
        <li>Verify admin authentication is valid</li>
      </ul>

      <h4 className="font-medium text-gray-900 mt-4 mb-2">&quot;Migration already running&quot; error</h4>
      <ul className="list-disc pl-5 space-y-1 text-gray-600">
        <li>Only one instance of a migration can run at a time</li>
        <li>Wait for the current run to complete, or cancel it</li>
        <li>If stuck, manually update the run status in Firestore to &quot;cancelled&quot;</li>
      </ul>

      <h4 className="font-medium text-gray-900 mt-4 mb-2">Resuming a failed migration</h4>
      <ol className="list-decimal pl-5 space-y-1 text-gray-600">
        <li>Find the failed run in Run History</li>
        <li>Click &quot;Resume&quot; to auto-fill the resume cursor</li>
        <li>Or manually copy <code>lastProcessedUserId</code> to &quot;Resume From&quot; field</li>
        <li>Start the migration - it will skip already processed users</li>
      </ol>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mt-4">
        <h4 className="font-medium text-gray-900 mb-2">Useful Commands</h4>
        <pre className="text-xs text-gray-600">
{`# View Cloud Function logs
firebase functions:log --only migrateCreatePredefinedCircles

# Check Firestore migration runs
firebase firestore:get migrationRuns/{runId}

# Deploy specific function
firebase deploy --only functions:migrateCreatePredefinedCircles`}
        </pre>
      </div>
    </div>
  );
}
