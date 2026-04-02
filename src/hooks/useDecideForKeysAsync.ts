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

export type UseDecideMultiAsyncResult =
  | { isLoading: true; error: null; decisions: Record<string, never> }
  | { isLoading: false; error: Error; decisions: Record<string, never> }
  | { isLoading: false; error: null; decisions: Record<string, OptimizelyDecision> };

/**
 * Returns feature flag decisions for the given flag keys using the async
 * `decideForKeysAsync` API. Required for CMAB (Contextual Multi-Armed Bandit) support.
 *
 * Client-side only — `decideForKeysAsync` returns a Promise which cannot resolve
 * during server render.
 *
 * @param flagKeys - The feature flag keys to evaluate
 * @param config - Optional configuration (decideOptions)
 */
export function useDecideForKeysAsync(flagKeys: string[], config?: UseDecideConfig): UseDecideMultiAsyncResult {
  const { store, client } = useOptimizelyContext();
  const stableKeys = useStableArray(flagKeys);
  const decideOptions = useStableArray(config?.decideOptions);
  const state = useProviderState(store);

  // --- Forced decision subscription — per-key with shared version counter ---
  const [fdVersion, setFdVersion] = useState(0);
  useEffect(() => {
    const unsubscribes = stableKeys.map((key) => store.subscribeForcedDecision(key, () => setFdVersion((v) => v + 1)));
    return () => unsubscribes.forEach((unsub) => unsub());
  }, [store, stableKeys]);

  // --- Async decision state ---
  const [asyncState, setAsyncState] = useState<{
    decisions: Record<string, OptimizelyDecision> | Record<string, never>;
    error: Error | null;
    isLoading: boolean;
  }>({ decisions: {} as Record<string, never>, error: null, isLoading: true });

  // --- Async decision effect ---
  useEffect(() => {
    const { userContext, error } = state;
    const hasConfig = client.getOptimizelyConfig() !== null;

    // Store-level error — no async call needed
    if (error) {
      setAsyncState({ decisions: {} as Record<string, never>, error, isLoading: false });
      return;
    }

    // Store not ready — stay in loading
    if (!hasConfig || userContext === null) {
      setAsyncState({ decisions: {} as Record<string, never>, error: null, isLoading: true });
      return;
    }

    // Store is ready — fire async decision
    let cancelled = false;
    // Reset to loading before firing the async call.
    // If already in the initial loading state, returns `prev` as-is to
    // skip a redundant re-render on first mount.
    setAsyncState((prev) => {
      if (prev.isLoading && prev.error === null && Object.keys(prev.decisions).length === 0) return prev;
      return { decisions: {} as Record<string, never>, error: null, isLoading: true };
    });

    userContext.decideForKeysAsync(stableKeys, decideOptions).then(
      (decisions) => {
        if (!cancelled) {
          setAsyncState({ decisions, error: null, isLoading: false });
        }
      },
      (err) => {
        if (!cancelled) {
          setAsyncState({
            decisions: {} as Record<string, never>,
            error: err instanceof Error ? err : new Error(String(err)),
            isLoading: false,
          });
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [state, fdVersion, client, stableKeys, decideOptions]);

  return asyncState as UseDecideMultiAsyncResult;
}
