/**
 * Copyright 2026, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useEffect, useState } from 'react';
import type { OptimizelyDecision } from '@optimizely/optimizely-sdk';

import { useOptimizelyContext } from './useOptimizelyContext';
import { useProviderState } from './useProviderState';
import { useStableArray } from './useStableArray';
import type { UseDecideConfig } from './useDecide';

export type UseDecideAsyncResult =
  | { isLoading: true; error: null; decision: null }
  | { isLoading: false; error: Error; decision: null }
  | { isLoading: false; error: null; decision: OptimizelyDecision };

/**
 * Returns a feature flag decision for the given flag key using the async
 * `decideAsync` API. Required for CMAB (Contextual Multi-Armed Bandit) support.
 *
 * Client-side only — `decideAsync` returns a Promise which cannot resolve
 * during server render.
 *
 * @param flagKey - The feature flag key to evaluate
 * @param config - Optional configuration (decideOptions)
 */
export function useDecideAsync(flagKey: string, config?: UseDecideConfig): UseDecideAsyncResult {
  const { store, client } = useOptimizelyContext();
  const decideOptions = useStableArray(config?.decideOptions);
  const state = useProviderState(store);

  // --- Forced decision subscription ---
  const [fdVersion, setFdVersion] = useState(0);
  useEffect(() => {
    return store.subscribeForcedDecision(flagKey, () => {
      setFdVersion((v) => v + 1);
    });
  }, [store, flagKey]);

  // --- Async decision state ---
  const [asyncState, setAsyncState] = useState<{
    decision: OptimizelyDecision | null;
    error: Error | null;
    isLoading: boolean;
  }>({ decision: null, error: null, isLoading: true });

  // --- Async decision effect ---
  useEffect(() => {
    const { userContext, error } = state;
    const hasConfig = client.getOptimizelyConfig() !== null;

    // Store-level error — no async call needed
    if (error) {
      setAsyncState({ decision: null, error, isLoading: false });
      return;
    }

    // Store not ready — stay in loading
    if (!hasConfig || userContext === null) {
      setAsyncState({ decision: null, error: null, isLoading: true });
      return;
    }

    // Store is ready — fire async decision
    let cancelled = false;
    setAsyncState((prev) => {
      if (prev.isLoading && prev.error === null && prev.decision === null) return prev;
      return { decision: null, error: null, isLoading: true };
    });

    userContext.decideAsync(flagKey, decideOptions).then(
      (decision) => {
        if (!cancelled) {
          setAsyncState({ decision, error: null, isLoading: false });
        }
      },
      (err) => {
        if (!cancelled) {
          setAsyncState({
            decision: null,
            error: err instanceof Error ? err : new Error(String(err)),
            isLoading: false,
          });
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [state, fdVersion, client, flagKey, decideOptions]);

  return asyncState as UseDecideAsyncResult;
}
