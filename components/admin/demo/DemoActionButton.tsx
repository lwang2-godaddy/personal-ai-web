'use client';

import { useState, useCallback } from 'react';
import { ApiClient } from '@/lib/api/client';
import type { DemoProgressEvent } from '@/lib/services/demo/types';

interface DemoActionButtonProps {
  title: string;
  description: string;
  icon: string;
  apiEndpoint: string;
  method?: 'POST' | 'GET';
  body?: any;
  variant?: 'primary' | 'danger' | 'secondary';
  isSSE?: boolean;
  disabled?: boolean;
  onProgress?: (event: DemoProgressEvent) => void;
  onComplete?: () => void;
  confirmMessage?: string;
}

const VARIANT_STYLES = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  danger: 'bg-orange-600 hover:bg-orange-700 text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300',
};

export default function DemoActionButton({
  title,
  description,
  icon,
  apiEndpoint,
  method = 'POST',
  body,
  variant = 'secondary',
  isSSE = true,
  disabled = false,
  onProgress,
  onComplete,
  confirmMessage,
}: DemoActionButtonProps) {
  const [running, setRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (confirmMessage && !confirm(confirmMessage)) return;

    setRunning(true);
    setCurrentPhase('Starting...');

    try {
      if (isSSE) {
        // SSE streaming request
        const response = await ApiClient.post(apiEndpoint, body);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
          onProgress?.({
            phase: -1,
            phaseName: 'Error',
            level: 'error',
            message: errorData.error || `HTTP ${response.status}`,
          });
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event: DemoProgressEvent = JSON.parse(line.slice(6));
                setCurrentPhase(`Phase ${event.phase}: ${event.phaseName}`);
                onProgress?.(event);
              } catch {
                // Skip malformed SSE lines
              }
            }
          }
        }
      } else {
        // Regular JSON request
        const response = await ApiClient.get(apiEndpoint);
        const data = await ApiClient.handleResponse(response);
        onProgress?.({
          phase: 0,
          phaseName: 'Result',
          level: 'success',
          message: JSON.stringify(data, null, 2),
        });
      }
    } catch (error: any) {
      onProgress?.({
        phase: -1,
        phaseName: 'Error',
        level: 'error',
        message: error.message || 'Unknown error',
      });
    } finally {
      setRunning(false);
      setCurrentPhase(null);
      onComplete?.();
    }
  }, [apiEndpoint, method, body, isSSE, onProgress, onComplete, confirmMessage]);

  return (
    <button
      onClick={handleClick}
      disabled={disabled || running}
      className={`
        w-full text-left rounded-lg p-4 transition-all
        ${running ? 'opacity-75 cursor-wait' : 'cursor-pointer'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${VARIANT_STYLES[variant]}
      `}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{title}</p>
          <p className={`text-sm ${variant === 'secondary' ? 'text-gray-500' : 'opacity-80'}`}>
            {running ? currentPhase : description}
          </p>
        </div>
        {running && (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
        )}
      </div>
    </button>
  );
}
