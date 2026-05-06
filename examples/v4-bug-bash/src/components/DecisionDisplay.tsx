'use client';

import { useRef } from 'react';
import type { OptimizelyDecision } from '@optimizely/react-sdk';

interface DecisionDisplayProps {
  prefix: string;
  decision: OptimizelyDecision | null;
  isLoading: boolean;
  error: Error | null;
}

const isStrictMode = process.env.NEXT_PUBLIC_STRICT_MODE === 'true';

export function DecisionDisplay({ prefix, decision, isLoading, error }: DecisionDisplayProps) {
  const renderCount = useRef(0);
  renderCount.current += 1;

  return (
    <div className="decision-display">
      {isStrictMode ? (
        <div data-testid={`${prefix}-render-count`} suppressHydrationWarning>
          <strong>Render Count:</strong> {renderCount.current} (StrictMode — counts doubled)
        </div>
      ) : (
        <div data-testid={`${prefix}-render-count`}>
          <strong>Render Count:</strong> {renderCount.current}
        </div>
      )}
      <div data-testid={`${prefix}-loading`}>
        <strong>Loading:</strong> {String(isLoading)}
      </div>

      <div data-testid={`${prefix}-error`}>
        <strong>Error:</strong> {error ? error.message : 'null'}
      </div>

      {decision && (
        <>
          <div data-testid={`${prefix}-enabled`}>
            <strong>Enabled:</strong> {String(decision.enabled)}
          </div>

          <div data-testid={`${prefix}-variation-key`}>
            <strong>Variation Key:</strong> {decision.variationKey ?? 'null'}
          </div>

          <div data-testid={`${prefix}-flag-key`}>
            <strong>Flag Key:</strong> {decision.flagKey}
          </div>

          <div data-testid={`${prefix}-rule-key`}>
            <strong>Rule Key:</strong> {decision.ruleKey ?? 'null'}
          </div>

          <div data-testid={`${prefix}-variables`}>
            <strong>Variables:</strong> <pre>{JSON.stringify(decision.variables, null, 2)}</pre>
          </div>

          <details data-testid={`${prefix}-reasons`}>
            <summary><strong>Reasons ({decision.reasons.length})</strong></summary>
            <ul>
              {decision.reasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}
