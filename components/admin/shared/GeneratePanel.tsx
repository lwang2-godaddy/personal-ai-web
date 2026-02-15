'use client';

import { useState, useCallback, useRef, type ReactNode } from 'react';
import { apiPost } from '@/lib/api/client';

interface GeneratePanelProps {
  /** API endpoint to POST to (e.g. '/api/admin/fun-facts') */
  endpoint: string;
  /** Button label (e.g. 'Generate Fun Facts') */
  buttonLabel: string;
  /** The selected user ID — button is disabled when empty */
  userId: string;
  /** Extra fields to include in the POST body alongside userId */
  extraParams?: Record<string, any>;
  /** Called after successful generation (with 1s delay for Firestore propagation) */
  onSuccess?: () => void;
  /** Optional config controls rendered above the button */
  children?: ReactNode;
}

interface GenerateResult {
  type: 'success' | 'error';
  message: string;
}

export default function GeneratePanel({
  endpoint,
  buttonLabel,
  userId,
  extraParams,
  onSuccess,
  children,
}: GeneratePanelProps) {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!userId || generating) return;

    // Clear previous result
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    setResult(null);
    setGenerating(true);

    try {
      const body = { userId, ...extraParams };
      const data = await apiPost<{ success: boolean; data?: any; error?: string }>(endpoint, body);

      if (data.success) {
        setResult({ type: 'success', message: 'Generation completed successfully' });
        // Delay callback for Firestore write propagation
        setTimeout(() => onSuccess?.(), 1000);
      } else {
        setResult({ type: 'error', message: data.error || 'Generation failed' });
      }
    } catch (err: any) {
      setResult({ type: 'error', message: err.message || 'Request failed' });
    } finally {
      setGenerating(false);
      // Auto-clear result after 8 seconds
      clearTimerRef.current = setTimeout(() => setResult(null), 8000);
    }
  }, [userId, generating, endpoint, extraParams, onSuccess]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        {/* Optional config controls */}
        {children && <div className="flex-1">{children}</div>}

        {/* Generate button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={!userId || generating}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap"
          >
            {generating && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {generating ? 'Generating...' : buttonLabel}
          </button>

          {/* Result feedback */}
          {result && (
            <span
              className={`text-sm inline-flex items-center gap-1 ${
                result.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {result.type === 'success' ? '\u2713' : '\u2717'} {result.message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
