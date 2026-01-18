'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api/client';

/**
 * Admin Usage Test Page
 * Debug page to test if usage tracking is working
 */
export default function UsageTestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runTest();
  }, []);

  const runTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet('/api/admin/usage/test');
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Test failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usage Tracking Test</h1>
          <p className="mt-2 text-gray-600">Debug page to verify usage tracking is working</p>
        </div>
        <button
          onClick={runTest}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Running...' : 'Run Test Again'}
        </button>
      </div>

      {loading && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Running usage tracking test...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800">Error</h2>
          <p className="text-red-600 mt-2">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Overall Status */}
          <div className={`rounded-lg shadow-md p-6 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h2 className="text-lg font-semibold">
              {result.success ? '✅ Test Completed' : '❌ Test Failed'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Firebase Project: {result.firebaseProjectId}
            </p>
          </div>

          {/* Step 1: Check Collection */}
          {result.results?.step1_checkCollection && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Step 1: Existing Documents in usageEvents
              </h2>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {result.results.step1_checkCollection.documentCount} documents found
              </p>
              {result.results.step1_checkCollection.documentCount === 0 && (
                <p className="text-amber-600 mt-2">
                  ⚠️ Collection is empty - no usage events have been logged yet
                </p>
              )}
              {result.results.step1_checkCollection.sampleDocs?.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-700">Sample Documents:</h3>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-48">
                    {JSON.stringify(result.results.step1_checkCollection.sampleDocs, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Write Test */}
          {result.results?.step2_writeTest && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Step 2: Write Test Event
              </h2>
              {result.results.step2_writeTest.success ? (
                <p className="text-green-600 mt-2">
                  ✅ Successfully wrote test event (ID: {result.results.step2_writeTest.documentId})
                </p>
              ) : (
                <div className="text-red-600 mt-2">
                  <p>❌ Write failed</p>
                  <p className="text-sm mt-1">Error: {result.results.step2_writeTest.error}</p>
                  <p className="text-sm">Code: {result.results.step2_writeTest.code}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Read Back */}
          {result.results?.step3_readBack && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Step 3: Read Back Test Event
              </h2>
              {result.results.step3_readBack.success ? (
                <p className="text-green-600 mt-2">✅ Successfully read back test event</p>
              ) : (
                <p className="text-red-600 mt-2">❌ Read back failed</p>
              )}
            </div>
          )}

          {/* Step 4: Recent Events */}
          {result.results?.step4_allEvents && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Step 4: Recent Events (Last 24 Hours)
              </h2>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {result.results.step4_allEvents.count} events
              </p>
              {result.results.step4_allEvents.events?.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-700">Events:</h3>
                  <div className="mt-2 space-y-2 max-h-96 overflow-auto">
                    {result.results.step4_allEvents.events.map((event: any, i: number) => (
                      <div key={i} className="p-3 bg-gray-50 rounded text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">{event.operation}</span>
                          <span className="text-gray-500">{event.timestamp}</span>
                        </div>
                        <div className="text-gray-600 text-xs mt-1">
                          User: {event.userId} | Endpoint: {event.endpoint} | Cost: ${event.estimatedCostUSD?.toFixed(6)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Raw Response */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900">Raw Response</h2>
            <pre className="mt-4 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
