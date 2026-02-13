'use client';

import React from 'react';
import Link from 'next/link';

interface PostProvenance {
  service: string;
  promptId?: string;
  promptVersion?: string;
  promptSource?: 'firestore' | 'yaml' | 'mobile' | 'inline';
  promptExecutionId?: string;
  upstreamService?: string;
  upstreamSourceType?: string;
  model?: string;
  generatedAt?: string;
}

interface PromptExecution {
  id: string;
  userId: string;
  service: string;
  promptId: string;
  language: string;
  promptVersion: string;
  promptSource: string;
  model: string;
  temperature: number;
  maxTokens: number;
  inputSummary: string;
  inputTokens: number;
  outputSummary: string;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  executedAt: string;
  sourceType?: string;
  sourceId?: string;
}

interface ProvenanceCardProps {
  provenance: PostProvenance | null;
  execution?: PromptExecution | null;
  loadingExecution?: boolean;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

/**
 * Shows whether a post is AI-generated or template-based
 */
export function GenerationTypeBadge({
  provenance,
}: {
  provenance: PostProvenance | null;
}) {
  if (!provenance) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        Unknown
      </span>
    );
  }

  const isAi = !!provenance.promptExecutionId;
  const isTemplate = !!provenance.upstreamService;

  if (isAi) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
        <span>🤖</span>
        AI: {provenance.promptId || 'unknown'}
      </span>
    );
  }

  if (isTemplate) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <span>📋</span>
        Template: {provenance.upstreamService}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      {provenance.service}
    </span>
  );
}

/**
 * Full provenance card with execution details
 */
export default function ProvenanceCard({
  provenance,
  execution,
  loadingExecution,
}: ProvenanceCardProps) {
  if (!provenance) {
    return (
      <div className="bg-gray-50 rounded-md p-4">
        <p className="text-sm text-gray-400 italic">No provenance data available</p>
      </div>
    );
  }

  const isAi = !!provenance.promptExecutionId;
  const isTemplate = !!provenance.upstreamService;

  return (
    <div className="space-y-4">
      {/* Generation Type Header */}
      <div
        className={`rounded-lg p-4 ${
          isAi ? 'bg-purple-50 border border-purple-200' : 'bg-blue-50 border border-blue-200'
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{isAi ? '🤖' : '📋'}</span>
          <span className={`text-sm font-semibold ${isAi ? 'text-purple-700' : 'text-blue-700'}`}>
            {isAi ? 'AI-Generated' : 'Template-Based'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Service:</span>
            <span className="ml-1 font-mono text-gray-900">{provenance.service}</span>
          </div>

          {provenance.promptId && (
            <div>
              <span className="text-gray-500">Prompt:</span>
              <span className="ml-1 font-mono text-gray-900">{provenance.promptId}</span>
            </div>
          )}

          {provenance.model && (
            <div>
              <span className="text-gray-500">Model:</span>
              <span className="ml-1 font-mono text-gray-900">{provenance.model}</span>
            </div>
          )}

          {provenance.promptVersion && (
            <div>
              <span className="text-gray-500">Version:</span>
              <span className="ml-1 text-gray-900">{provenance.promptVersion}</span>
            </div>
          )}

          {provenance.promptSource && (
            <div>
              <span className="text-gray-500">Source:</span>
              <span className="ml-1 text-gray-900">{provenance.promptSource}</span>
            </div>
          )}

          {provenance.upstreamService && (
            <div>
              <span className="text-gray-500">Upstream:</span>
              <span className="ml-1 font-mono text-gray-900">{provenance.upstreamService}</span>
            </div>
          )}

          {provenance.upstreamSourceType && (
            <div>
              <span className="text-gray-500">Source Type:</span>
              <span className="ml-1 text-gray-900">{provenance.upstreamSourceType}</span>
            </div>
          )}

          {provenance.generatedAt && (
            <div className="col-span-2">
              <span className="text-gray-500">Generated:</span>
              <span className="ml-1 text-gray-900">{formatDate(provenance.generatedAt)}</span>
            </div>
          )}
        </div>

        {/* Link to prompt config */}
        {isAi && provenance.promptId && (
          <div className="mt-3">
            <Link
              href={`/admin/prompts/LifeFeedGenerator?prompt=${provenance.promptId}`}
              className="text-sm text-purple-600 hover:text-purple-800 hover:underline"
            >
              View Prompt Config →
            </Link>
          </div>
        )}
      </div>

      {/* Execution Details (for AI posts) */}
      {isAi && provenance.promptExecutionId && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Prompt Execution</h4>

          {loadingExecution ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              Loading execution data...
            </div>
          ) : execution ? (
            <div className="bg-white rounded-md border border-gray-200 p-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {/* Tokens */}
                <div className="bg-blue-50 rounded-md p-2 text-center">
                  <p className="text-xs text-blue-600 font-medium">Total Tokens</p>
                  <p className="text-lg font-bold text-blue-900">
                    {execution.totalTokens.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-500">
                    {execution.inputTokens.toLocaleString()} in /{' '}
                    {execution.outputTokens.toLocaleString()} out
                  </p>
                </div>

                {/* Cost */}
                <div className="bg-green-50 rounded-md p-2 text-center">
                  <p className="text-xs text-green-600 font-medium">Cost</p>
                  <p className="text-lg font-bold text-green-900">
                    ${execution.estimatedCostUSD.toFixed(6)}
                  </p>
                </div>

                {/* Latency */}
                <div className="bg-amber-50 rounded-md p-2 text-center">
                  <p className="text-xs text-amber-600 font-medium">Latency</p>
                  <p className="text-lg font-bold text-amber-900">
                    {execution.latencyMs.toLocaleString()}ms
                  </p>
                </div>

                {/* Status */}
                <div
                  className={`rounded-md p-2 text-center ${
                    execution.success ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <p
                    className={`text-xs font-medium ${
                      execution.success ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    Status
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      execution.success ? 'text-green-900' : 'text-red-900'
                    }`}
                  >
                    {execution.success ? 'Success' : 'Failed'}
                  </p>
                  {execution.errorMessage && (
                    <p className="text-xs text-red-500 mt-1">{execution.errorMessage}</p>
                  )}
                </div>
              </div>

              {/* Execution Metadata */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 text-sm border-t border-gray-100 pt-3">
                <div>
                  <span className="text-gray-500">Model:</span>
                  <span className="ml-1 font-mono text-gray-900">{execution.model}</span>
                </div>
                <div>
                  <span className="text-gray-500">Temperature:</span>
                  <span className="ml-1 text-gray-900">{execution.temperature}</span>
                </div>
                <div>
                  <span className="text-gray-500">Max Tokens:</span>
                  <span className="ml-1 text-gray-900">{execution.maxTokens}</span>
                </div>
                <div>
                  <span className="text-gray-500">Language:</span>
                  <span className="ml-1 text-gray-900">{execution.language}</span>
                </div>
                <div>
                  <span className="text-gray-500">Prompt Source:</span>
                  <span className="ml-1 text-gray-900">{execution.promptSource}</span>
                </div>
                <div>
                  <span className="text-gray-500">Executed:</span>
                  <span className="ml-1 text-gray-900">{formatDate(execution.executedAt)}</span>
                </div>
              </div>

              {/* Input/Output Summaries */}
              {(execution.inputSummary || execution.outputSummary) && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  {execution.inputSummary && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Input Summary:</p>
                      <p className="text-xs text-gray-700 font-mono bg-gray-50 p-2 rounded whitespace-pre-wrap">
                        {execution.inputSummary}
                      </p>
                    </div>
                  )}
                  {execution.outputSummary && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Output Summary:</p>
                      <p className="text-xs text-gray-700 font-mono bg-gray-50 p-2 rounded whitespace-pre-wrap">
                        {execution.outputSummary}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-md border border-gray-200 p-3">
              <p className="text-sm text-gray-400 italic">
                Execution record not found (ID: {provenance.promptExecutionId})
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
