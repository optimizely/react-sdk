'use client';

import type { OptimizelyDecision } from '@optimizely/react-sdk';
import { DecisionDisplay } from './DecisionDisplay';

interface DecisionTableProps {
  decisions: Record<string, OptimizelyDecision>;
  isLoading: boolean;
  error: Error | null;
}

export function DecisionTable({ decisions, isLoading, error }: DecisionTableProps) {
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
