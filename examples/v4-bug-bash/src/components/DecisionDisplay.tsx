'use client';

import type { OptimizelyDecision } from '@optimizely/react-sdk';

interface DecisionDisplayProps {
  prefix: string;
  decision: OptimizelyDecision | null;
  isLoading: boolean;
  error: Error | null;
}

export function DecisionDisplay({ prefix, decision, isLoading, error }: DecisionDisplayProps) {
  return (
    <div className="decision-display">
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

          <div data-testid={`${prefix}-reasons`}>
            <strong>Reasons:</strong>
            <ul>
              {decision.reasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
