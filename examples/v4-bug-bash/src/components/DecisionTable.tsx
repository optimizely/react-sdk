'use client';

import { useRef } from 'react';
import type { OptimizelyDecision } from '@optimizely/react-sdk';
import { DecisionDisplay } from './DecisionDisplay';

interface DecisionTableProps {
  decisions: Record<string, OptimizelyDecision>;
  isLoading: boolean;
  error: Error | null;
}

const isStrictMode = process.env.NEXT_PUBLIC_STRICT_MODE === 'true';

export function DecisionTable({ decisions, isLoading, error }: DecisionTableProps) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  if (isLoading) {
    return <div data-testid="decisions-loading">Loading decisions...</div>;
  }

  if (error) {
    return <div data-testid="decisions-error">Error: {error.message}</div>;
  }

  const keys = Object.keys(decisions);

  if (keys.length === 0) {
    return <div data-testid="decisions-empty">No decisions available</div>;
  }

  return (
    <div className="decision-table">
      {isStrictMode ? (
        <div data-testid="decisions-render-count" suppressHydrationWarning>
          <strong>Render Count:</strong> {renderCount.current} (StrictMode — counts doubled)
        </div>
      ) : (
        <div data-testid="decisions-render-count">
          <strong>Render Count:</strong> {renderCount.current}
        </div>
      )}
      <div data-testid="decisions-count">
        <strong>Total decisions:</strong> {keys.length}
      </div>
      {keys.map((flagKey) => (
        <div key={flagKey} className="decision-entry">
          <h3>{flagKey}</h3>
          <DecisionDisplay
            prefix={`decision-${flagKey}`}
            decision={decisions[flagKey]}
            isLoading={false}
            error={null}
          />
        </div>
      ))}
    </div>
  );
}
