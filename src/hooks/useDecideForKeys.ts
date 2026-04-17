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
import type { OptimizelyDecision } from '@optimizely/optimizely-sdk';

import { useOptimizelyContext } from './useOptimizelyContext';
import { useProviderState } from './useProviderState';
import { useStableArray } from './useStableArray';
import type { UseDecideConfig, UseDecideMultiResult } from './types';

/**
 * Returns feature flag decisions for the given flag keys.
 *
 * Subscribes to `ProviderStateStore` via `useSyncExternalStore` and
 * re-evaluates decisions whenever the store state changes
 * (client ready, user context set, error) or a forced decision
 * changes for any of the watched keys.
 *
 * @param flagKeys - The feature flag keys to evaluate
 * @param config - Optional configuration (decideOptions)
 */
export function useDecideForKeys(flagKeys: string[], config?: UseDecideConfig): UseDecideMultiResult {
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

  // --- Derive decisions ---
  return useMemo(() => {
    void fdVersion; // referenced to satisfy exhaustive-deps; triggers recomputation on forced decision changes
    const { userContext, error } = state;
    const hasConfig = client.getOptimizelyConfig() !== null;

    if (hasConfig && userContext !== null) {
      const decisions = userContext.decideForKeys(stableKeys, decideOptions);
      return { decisions, isLoading: false as const, error };
    }

    if (error) {
      return { decisions: {} as Record<string, OptimizelyDecision>, isLoading: false as const, error };
    }

    return { decisions: {} as Record<string, never>, isLoading: true as const, error: null };
  }, [fdVersion, state, client, stableKeys, decideOptions]);
}
