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

import { useEffect, useMemo, useState } from 'react';
import { useOptimizelyContext } from './useOptimizelyContext';
import { useProviderState } from './useProviderState';
import { useStableArray } from './useStableArray';
import type { UseDecideConfig, UseDecideResult } from './types';

/**
 * Returns a feature flag decision for the given flag key.
 *
 * Subscribes to `ProviderStateStore` via `useSyncExternalStore` and
 * re-evaluates the decision whenever the store state changes
 * (client ready, user context set, error).
 *
 * @param flagKey - The feature flag key to evaluate
 * @param config - Optional configuration (decideOptions)
 */
export function useDecide(flagKey: string, config?: UseDecideConfig): UseDecideResult {
  const { store, client } = useOptimizelyContext();
  const decideOptions = useStableArray(config?.decideOptions);
  const state = useProviderState(store);

  // --- Forced decision subscription ---
  // Forced decisions don't change store state, so we use a version counter
  // to trigger useMemo recomputation. Per-flagKey granularity prevents
  // unrelated hooks from re-evaluating.
  const [fdVersion, setFdVersion] = useState(0);
  useEffect(() => {
    return store.subscribeForcedDecision(flagKey, () => {
      setFdVersion((v) => v + 1);
    });
  }, [store, flagKey]);

  // --- Derive decision ---
  return useMemo(() => {
    void fdVersion; // referenced to satisfy exhaustive-deps; triggers recomputation on forced decision changes
    const { userContext, error } = state;
    const hasConfig = client.getOptimizelyConfig() !== null;

    if (hasConfig && userContext !== null) {
      const decision = userContext.decide(flagKey, decideOptions);
      return { decision, isLoading: false, error };
    }

    if (error) {
      return { decision: null, isLoading: false, error };
    }

    return { decision: null, isLoading: true, error: null };
  }, [fdVersion, state, client, flagKey, decideOptions]);
}
