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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim';

import { useOptimizelyContext } from './useOptimizelyContext';
import { useStableArray } from './useStableArray';
import type { UseDecideConfig } from './useDecide';
import type { UseDecideMultiResult } from './useDecideForKeys';

/**
 * Returns feature flag decisions for all flags.
 *
 * Subscribes to `ProviderStateStore` via `useSyncExternalStore` and
 * re-evaluates decisions whenever the store state changes
 * (client ready, user context set, error) or any forced decision changes.
 *
 * @param config - Optional configuration (decideOptions)
 */
export function useDecideAll(config?: UseDecideConfig): UseDecideMultiResult {
  const { store, client } = useOptimizelyContext();
  const decideOptions = useStableArray(config?.decideOptions);

  // --- General state subscription ---
  const subscribeState = useCallback((onStoreChange: () => void) => store.subscribe(onStoreChange), [store]);
  const getStateSnapshot = useCallback(() => store.getState(), [store]);
  const state = useSyncExternalStore(subscribeState, getStateSnapshot, getStateSnapshot);

  // --- Forced decision subscription — any flag key ---
  const [fdVersion, setFdVersion] = useState(0);
  useEffect(() => {
    return store.subscribeAllForcedDecisions(() => setFdVersion((v) => v + 1));
  }, [store]);

  // --- Derive decisions ---
  return useMemo(() => {
    void fdVersion; // referenced to satisfy exhaustive-deps; triggers recomputation on forced decision changes
    const { userContext, error } = state;
    const hasConfig = client.getOptimizelyConfig() !== null;

    if (error) {
      return { decisions: {} as Record<string, never>, isLoading: false as const, error };
    }

    if (!hasConfig || userContext === null) {
      return { decisions: {} as Record<string, never>, isLoading: true as const, error: null };
    }

    const decisions = userContext.decideAll(decideOptions);
    return { decisions, isLoading: false as const, error: null };
  }, [fdVersion, state, client, decideOptions]);
}
